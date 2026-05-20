import Groq from "groq-sdk";
import { NextRequest } from "next/server";

// Vercel Hobby plan allows up to 60s. Worst case timeline:
//   LLM streaming  ~3s
//   Nominatim recovery (up to 6 lookups × 1.1s)  ~7s
//   Buffer for cold starts / dedupe  ~5s
// 30s is comfortable headroom without hitting the Pro plan.
export const maxDuration = 30;
import {
  normalizeItineraryTimes,
  sanitizeItineraryCoords,
  buildDateContext,
  verifyMissingCoordsViaNominatim,
} from "@/lib/llmHelpers";
import type { MockItinerary } from "@/data/mockItinerary";

const STYLE_GUIDE: Record<string, string> = {
  healing:   "조용하고 한적한 힐링 스폿(온천, 카페, 공원 등)",
  food:      "현지인이 추천하는 맛집과 카페",
  activity:  "체험형 액티비티(서핑, 트레킹, 테마파크 등)",
  insta:     "사진이 잘 나오는 인스타 감성 명소(뷰포인트, 감성 카페, 포토스팟)",
  culture:   "박물관, 사찰, 유적지 등 문화/역사 명소",
  nature:    "자연 경관(산, 바다, 해변, 폭포 등)",
  shopping:  "쇼핑 거리, 시장, 백화점, 편집숍",
  nightlife: "야경 명소와 바, 클럽, 야시장",
};

// ── Trimmed system prompt (~30% smaller than before) ──────────
// Time arithmetic is normalized on the server, so the prompt no longer
// needs to teach the LLM how to compute `time[i+1]`. Coords are sanity-
// checked + Nominatim-verified, so we just ask for plausible numbers.
const SYSTEM_PROMPT = `You are an expert travel planner. Respond with ONE valid JSON object only.

JSON shape:
{
  "destination": "string (Korean)",
  "duration": "string (Korean, e.g. '1박 2일')",
  "totalEstimate": "string (Korean per-person estimate, e.g. '약 30만원' or '약 25,000엔')",
  "days": [{
    "dayLabel": "Day N (English)",
    "date": "Korean ordinal (e.g. '첫째 날')",
    "items": [{
      "time": "HH:MM (only the first item's time matters; server normalizes the rest)",
      "place": "specific Korean place name (e.g. '이치란 라멘 도톤보리점', not '라멘집')",
      "description": "1-2 Korean sentences with a useful tip",
      "category": "food | activity | culture | nature | shopping | healing",
      "duration": "Korean (e.g. '1시간 30분')",
      "cost": "per-person, LOCAL currency (e.g. '무료', '약 1,500엔', '약 ₩15,000', '약 €12')",
      "coords": { "lat": number, "lng": number },
      "transport": { "mode": "Korean (지하철|도보|버스|택시|전철)", "duration": "Korean (e.g. '15분')", "cost": "optional, omit if walking or unknown" }
    }]
  }]
}

Rules:
- All text fields in Korean (dayLabel stays English).
- 6-8 items per day. The FIRST item of each day OMITS the transport field; every other item MUST include transport from the previous place.
- transport mode by distance: <800m 도보, <3km 지하철/도보, <10km 지하철/버스, ≥10km 택시/전철. transport.duration must reflect actual geography (vary the numbers; don't use round 15분 everywhere).
- coords MUST be real-world lat/lng for that place in the destination's region. Never 0,0 or random.
- totalEstimate excludes flights and accommodation.

Hard constraints:
1. STYLE MATCH: ≥70% of all places must directly match the user's selected styles. No filler.
2. UNIQUE PLACES: every "place" across ALL days appears exactly once.
3. ROUTE: cluster geographically nearby places within each day.`;

export async function POST(req: NextRequest) {
  // ── Input parsing ──
  let destination: string, duration: string, styles: string[], startDate: string;
  try {
    const body = await req.json();
    destination = String(body.destination ?? "").trim();
    duration = String(body.duration ?? "").trim();
    styles = Array.isArray(body.styles)
      ? body.styles.filter((s: unknown): s is string => typeof s === "string")
      : [];
    startDate = typeof body.startDate === "string" ? body.startDate : "";
    if (!destination || !duration) throw new Error("missing fields");
  } catch {
    return jsonResponse({ error: "Invalid request body" }, 400);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "서버에 GROQ_API_KEY가 설정되지 않았습니다." }, 500);
  }

  const styleDetails = styles.length
    ? styles.map(s => `  • ${s}: ${STYLE_GUIDE[s] ?? "사용자가 선택한 스타일"}`).join("\n")
    : "  • 일반적인 추천";

  const dateContext = buildDateContext(startDate, duration);

  const userPrompt = `Destination: ${destination}
Duration: ${duration}
Travel styles (USER PRIORITY — drive ≥70% of choices):
${styleDetails}${dateContext ? "\n" + dateContext : ""}

Pick a mix of must-see and hidden gems within the chosen styles. Use specific, well-known place names so geocoding is unambiguous. Cluster nearby places per day to minimize transport time.`;

  // ── Streaming response (NDJSON: one JSON event per line) ──
  const encoder = new TextEncoder();

  // Abort controller fed to Groq's request so we can stop token generation
  // if the client disconnects mid-stream (saves quota).
  const upstreamAbort = new AbortController();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        } catch {
          /* controller might already be closed — ignore */
        }
      };

      try {
        send({ type: "progress", phase: "thinking", message: `${destination} 일정을 구상 중...`, progress: 0.05 });

        const groq = new Groq({ apiKey });
        const completion = await groq.chat.completions.create(
          {
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4096,
            stream: true,
            response_format: { type: "json_object" },
          },
          { signal: upstreamAbort.signal }
        );

        // Accumulate streamed text, detect "Day N" markers to emit progress events
        let fullText = "";
        let lastReportedDay = 0;
        for await (const chunk of completion) {
          const delta = chunk.choices[0]?.delta?.content ?? "";
          if (!delta) continue;
          fullText += delta;
          const dayMatches = fullText.match(/"dayLabel"\s*:\s*"Day\s*(\d+)/g);
          const dayCount = dayMatches ? dayMatches.length : 0;
          if (dayCount > lastReportedDay) {
            lastReportedDay = dayCount;
            send({
              type: "progress",
              phase: "day",
              message: `Day ${dayCount} 코스를 채우는 중...`,
              progress: Math.min(0.85, 0.15 + dayCount * 0.18),
            });
          }
        }

        send({ type: "progress", phase: "finalizing", message: "시간과 동선을 정리하는 중...", progress: 0.9 });

        // ── Parse + validate shape ──
        let itinerary: MockItinerary;
        try {
          itinerary = JSON.parse(fullText) as MockItinerary;
        } catch {
          send({ type: "error", error: "AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요." });
          controller.close();
          return;
        }

        if (
          typeof itinerary?.destination !== "string" ||
          typeof itinerary?.duration !== "string" ||
          !Array.isArray(itinerary?.days) ||
          itinerary.days.length === 0
        ) {
          send({ type: "error", error: "AI가 생성한 일정의 구조가 올바르지 않습니다." });
          controller.close();
          return;
        }

        // Drop malformed days
        itinerary.days = itinerary.days.filter(
          d => typeof d === "object" && d !== null && Array.isArray(d.items)
        );

        // Cross-day place dedupe (safety net — prompt already says unique)
        const seen = new Set<string>();
        for (const day of itinerary.days) {
          day.items = day.items.filter(item => {
            const key = (item?.place ?? "").trim().toLowerCase().replace(/\s+/g, "");
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        itinerary.days = itinerary.days.filter(d => d.items.length > 0);

        if (itinerary.days.length === 0) {
          send({ type: "error", error: "AI가 생성한 일정에 유효한 장소가 없습니다." });
          controller.close();
          return;
        }

        // ── Post-process: drop implausible coords + normalize times ──
        sanitizeItineraryCoords(itinerary);
        normalizeItineraryTimes(itinerary);

        // Best-effort coord recovery via Nominatim (capped, throttled)
        send({ type: "progress", phase: "geocoding", message: "장소 좌표를 확인하는 중...", progress: 0.95 });
        try {
          await verifyMissingCoordsViaNominatim(itinerary, 6);
        } catch (err) {
          console.warn("[generate] nominatim recovery failed:", err);
        }

        send({ type: "done", data: itinerary });
        controller.close();
      } catch (err) {
        console.error("[generate] failed:", err);
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        send({ type: "error", error: `일정 생성에 실패했습니다: ${msg}` });
        try { controller.close(); } catch { /* already closed */ }
      }
    },

    cancel() {
      // Client disconnected — abort the upstream Groq request so we stop
      // paying for tokens nobody is reading.
      upstreamAbort.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
