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
  parseDurationDays,
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
3. ROUTE: cluster geographically nearby places within each day.

DO NOT:
- Use generic placeholders like "유명 맛집", "현지 카페", "이름있는 라멘집". Always use a specific, named place.
- Suggest global chains (Starbucks, McDonald's, Burger King) unless the chain location is itself a tourist landmark.
- Pad with random tourist clichés (e.g. "OO 박물관", "OO 성당") that don't match the user's selected styles.
- Suggest places typically closed on the trip's weekdays — if Trip dates are provided, respect weekly closures (most museums close Monday, some shops close Tuesday in Korea/Japan).
- Repeat the same description pattern across items ("아름다운 ...", "유명한 ..." every time).
- Recommend obviously fake or unverifiable places.`;

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

  // ── B. Length-adaptive max_tokens ────────────────────────────
  // 1박 2일 → ~2,200, 7박 8일 → 4,096 (cap). Shorter trips finish faster
  // and use less of the daily Groq token budget.
  const tripDays = parseDurationDays(duration);
  const dynamicMaxTokens = Math.min(4096, 1500 + tripDays * 350);

  // Validate the shape after parsing. Returns null if OK, or a Korean-readable
  // reason string we can feed into a retry hint.
  function validateItinerary(it: unknown): string | null {
    if (!it || typeof it !== "object") return "응답이 객체가 아닙니다";
    const x = it as Partial<MockItinerary>;
    if (typeof x.destination !== "string" || !x.destination)
      return "destination 필드 누락";
    if (typeof x.duration !== "string" || !x.duration)
      return "duration 필드 누락";
    if (!Array.isArray(x.days) || x.days.length === 0)
      return "days 배열이 비어 있음";
    let anyValidItem = false;
    for (const day of x.days) {
      if (!day || typeof day !== "object" || !Array.isArray(day.items)) continue;
      for (const item of day.items) {
        if (item && typeof item === "object" &&
            typeof (item as { place?: unknown }).place === "string" &&
            (item as { place: string }).place.trim().length > 0) {
          anyValidItem = true;
          break;
        }
      }
      if (anyValidItem) break;
    }
    if (!anyValidItem) return "유효한 장소가 하나도 없음";
    return null;
  }

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

        // ─── First attempt: streaming ────────────────────────────
        const completion = await groq.chat.completions.create(
          {
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: dynamicMaxTokens,
            stream: true,
            response_format: { type: "json_object" },
          },
          { signal: upstreamAbort.signal }
        );

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
              progress: Math.min(0.75, 0.15 + dayCount * 0.15),
            });
          }
        }

        // ── Parse first attempt ──
        let itinerary: MockItinerary | null = null;
        let parseErr: string | null = null;
        try {
          itinerary = JSON.parse(fullText) as MockItinerary;
        } catch {
          parseErr = "JSON parse 실패";
        }

        const shapeIssue = itinerary ? validateItinerary(itinerary) : parseErr;

        // ─── A. Retry once on failure ────────────────────────────
        if (shapeIssue) {
          console.warn("[generate] first attempt invalid:", shapeIssue);
          send({
            type: "progress",
            phase: "retry",
            message: "응답을 보완하는 중...",
            progress: 0.8,
          });

          try {
            const retryCompletion = await groq.chat.completions.create(
              {
                model: "llama-3.3-70b-versatile",
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  { role: "user", content: userPrompt },
                  // Show the model its broken attempt so it doesn't repeat the same error
                  { role: "assistant", content: fullText.slice(0, 2000) },
                  {
                    role: "user",
                    content: `이전 응답에 문제가 있었습니다: "${shapeIssue}". 위 JSON 스키마를 정확히 지켜서 다시 만들어주세요. 모든 day의 items 배열에 유효한 place, category, duration이 포함되어야 합니다. JSON 객체 외에는 아무것도 출력하지 마세요.`,
                  },
                ],
                temperature: 0.5, // less random on retry
                max_tokens: dynamicMaxTokens,
                stream: false,
                response_format: { type: "json_object" },
              },
              { signal: upstreamAbort.signal }
            );

            const retryText = retryCompletion.choices[0]?.message?.content ?? "";
            try {
              itinerary = JSON.parse(retryText) as MockItinerary;
            } catch {
              itinerary = null;
            }

            const retryIssue = itinerary ? validateItinerary(itinerary) : "JSON parse 실패(재시도)";
            if (retryIssue) {
              console.error("[generate] retry also failed:", retryIssue);
              send({
                type: "error",
                error: "AI가 두 번 모두 잘못된 응답을 반환했어요. 잠시 후 다시 시도해주세요.",
              });
              controller.close();
              return;
            }
          } catch (err) {
            if ((err as Error)?.name === "AbortError") {
              try { controller.close(); } catch { /* ignore */ }
              return;
            }
            console.error("[generate] retry threw:", err);
            send({ type: "error", error: "AI 호출 중 오류가 발생했습니다." });
            controller.close();
            return;
          }
        }

        // From here, `itinerary` is guaranteed non-null and shape-valid
        send({ type: "progress", phase: "finalizing", message: "시간과 동선을 정리하는 중...", progress: 0.9 });

        // Drop malformed days
        itinerary!.days = itinerary!.days.filter(
          d => typeof d === "object" && d !== null && Array.isArray(d.items)
        );

        // Cross-day place dedupe (safety net)
        const seen = new Set<string>();
        for (const day of itinerary!.days) {
          day.items = day.items.filter(item => {
            const key = (item?.place ?? "").trim().toLowerCase().replace(/\s+/g, "");
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        }
        itinerary!.days = itinerary!.days.filter(d => d.items.length > 0);

        if (itinerary!.days.length === 0) {
          send({ type: "error", error: "AI가 생성한 일정에 유효한 장소가 없습니다." });
          controller.close();
          return;
        }

        // ── Post-process: drop implausible coords + normalize times ──
        sanitizeItineraryCoords(itinerary!);
        normalizeItineraryTimes(itinerary!);

        // Best-effort coord recovery via Nominatim (capped, throttled)
        send({ type: "progress", phase: "geocoding", message: "장소 좌표를 확인하는 중...", progress: 0.95 });
        try {
          await verifyMissingCoordsViaNominatim(itinerary!, 6);
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
