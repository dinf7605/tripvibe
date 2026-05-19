import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";
import { isCoordPlausible, geocodeWithNominatim } from "@/lib/llmHelpers";

const STYLE_GUIDE: Record<string, string> = {
  healing:   "조용한 힐링 스폿(온천, 카페, 공원 등)",
  food:      "현지인이 추천하는 맛집과 카페",
  activity:  "체험형 액티비티(서핑, 트레킹, 테마파크 등)",
  insta:     "사진이 잘 나오는 인스타 감성 명소(뷰포인트, 감성 카페, 포토스팟)",
  culture:   "박물관, 사찰, 유적지 등 문화/역사 명소",
  nature:    "자연 경관(산, 바다, 해변, 폭포 등)",
  shopping:  "쇼핑 거리, 시장, 백화점, 편집숍",
  nightlife: "야경 명소, 바, 클럽, 야시장",
};

const VALID_CATEGORIES = ["food", "activity", "culture", "nature", "shopping", "healing"] as const;
type Category = (typeof VALID_CATEGORIES)[number];

type IncomingItem = {
  time?: string;
  place?: string;
  description?: string;
  category?: string;
  duration?: string;
  cost?: string;
  coords?: { lat?: number; lng?: number };
};

const SYSTEM_PROMPT = `You are an expert travel curator. The user wants ONE specific place in their itinerary replaced with a fresh alternative.

You MUST respond ONLY with a single valid JSON object — no markdown, no code fences, no commentary.

The JSON must match this EXACT shape:
{
  "time": "string (HH:MM, keep the same as original)",
  "place": "string (Korean — NEW alternative place, different from all existing places)",
  "description": "string (Korean, 1-2 sentences describing the place with a useful tip)",
  "category": "one of: food | activity | culture | nature | shopping | healing (keep the same as original)",
  "duration": "string (Korean, similar to original — e.g. '1시간 30분')",
  "cost": "string (cost per person in local currency — e.g. '무료', '약 1,500엔', '약 ₩15,000', '약 €12')",
  "coords": { "lat": number, "lng": number }
}

Hard rules:
- All Korean text fields must be written in Korean.
- The "place" must be REAL, well-known in the destination, and DIFFERENT from every place already in the user's itinerary (do not reuse, do not return the same place).
- Keep the same "time" and "category" as the original — these are constraints from the surrounding schedule.
- "coords" MUST be plausible real-world latitude/longitude for that place in the destination's region (accuracy within ~500m is fine). Never return 0,0 or random numbers.
- The new place must match the user's selected travel styles where possible.
- Description should mention what makes it worth visiting and any practical tip.`;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const b = body as {
    destination?: unknown;
    duration?: unknown;
    styles?: unknown;
    currentItem?: unknown;
    existingPlaces?: unknown;
  };

  // Input validation
  if (typeof b.destination !== "string" || !b.destination.trim()) {
    return NextResponse.json({ error: "destination이 누락되었습니다." }, { status: 400 });
  }
  if (typeof b.currentItem !== "object" || b.currentItem === null) {
    return NextResponse.json({ error: "currentItem이 누락되었습니다." }, { status: 400 });
  }
  const styles: string[] = Array.isArray(b.styles)
    ? (b.styles as unknown[]).filter((s): s is string => typeof s === "string")
    : [];
  const existingPlaces: string[] = Array.isArray(b.existingPlaces)
    ? (b.existingPlaces as unknown[]).filter((s): s is string => typeof s === "string" && s.length > 0)
    : [];
  const duration = typeof b.duration === "string" ? b.duration : "";
  const current = b.currentItem as IncomingItem;

  if (typeof current.place !== "string" || !current.place.trim()) {
    return NextResponse.json({ error: "currentItem.place가 누락되었습니다." }, { status: 400 });
  }
  if (typeof current.category !== "string" || !VALID_CATEGORIES.includes(current.category as Category)) {
    return NextResponse.json({ error: "currentItem.category가 올바르지 않습니다." }, { status: 400 });
  }

  // Env check
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "서버 설정 오류: GROQ_API_KEY가 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const styleHint = styles
    .map(s => STYLE_GUIDE[s])
    .filter(Boolean)
    .join(", ");

  const userPrompt = `Destination: ${b.destination}
Trip duration: ${duration || "(미상)"}
Selected travel styles: ${styles.length ? styles.join(", ") : "(없음)"}${styleHint ? ` — preferences: ${styleHint}` : ""}

The item to REPLACE:
- time: ${current.time ?? "(none)"}
- place: ${current.place}
- category: ${current.category}
- duration: ${current.duration ?? "(none)"}
- existing description: ${current.description ?? "(none)"}

All places in the user's current itinerary (do NOT pick any of these, including the one above):
${existingPlaces.length ? existingPlaces.map(p => `- ${p}`).join("\n") : "(none provided)"}

Generate ONE alternative place. Same time, same category, similar duration. Output JSON only.`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85, // a bit hotter — we want variety vs the original
      max_tokens: 600,
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: "AI 응답이 비어있습니다." }, { status: 502 });
    }

    // Strip stray code fences just in case
    const cleaned = content
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("[regenerate-item] JSON parse failed:", cleaned.slice(0, 200));
      return NextResponse.json({ error: "AI 응답 형식이 올바르지 않습니다." }, { status: 502 });
    }

    // Shape validation
    const it = parsed as IncomingItem;
    if (typeof it.place !== "string" || !it.place.trim()) {
      return NextResponse.json({ error: "AI 응답에 장소명이 없습니다." }, { status: 502 });
    }
    if (typeof it.category !== "string" || !VALID_CATEGORIES.includes(it.category as Category)) {
      return NextResponse.json({ error: "AI 응답의 카테고리가 올바르지 않습니다." }, { status: 502 });
    }

    // Did we just get the same place back?
    if (it.place.trim() === current.place.trim()) {
      return NextResponse.json(
        { error: "AI가 동일한 장소를 다시 추천했습니다. 한 번 더 시도해주세요." },
        { status: 502 }
      );
    }

    // Or one already in the itinerary?
    const lower = it.place.trim().toLowerCase();
    if (existingPlaces.some(p => p.trim().toLowerCase() === lower)) {
      return NextResponse.json(
        { error: "AI가 이미 일정에 있는 장소를 추천했습니다. 한 번 더 시도해주세요." },
        { status: 502 }
      );
    }

    // Normalize coords via shared helper (drops malformed or out-of-region coords)
    let coords: { lat: number; lng: number } | undefined;
    if (isCoordPlausible(it.coords, b.destination)) {
      coords = { lat: it.coords!.lat as number, lng: it.coords!.lng as number };
    } else {
      // Best-effort: ask Nominatim for the new place — single lookup, cheap
      const recovered = await geocodeWithNominatim(it.place.trim(), b.destination);
      if (recovered && isCoordPlausible(recovered, b.destination)) {
        coords = recovered;
      }
    }

    // Compose final response — preserve original time, fall back where AI omitted
    const result = {
      time: typeof it.time === "string" && it.time.trim() ? it.time : current.time,
      place: it.place.trim(),
      description: typeof it.description === "string" ? it.description.trim() : "",
      category: it.category,
      duration: typeof it.duration === "string" && it.duration.trim() ? it.duration : current.duration,
      cost: typeof it.cost === "string" && it.cost.trim() ? it.cost : current.cost,
      coords,
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[regenerate-item] Groq call failed:", err);
    const msg = err instanceof Error ? err.message : "AI 호출 중 알 수 없는 오류";
    return NextResponse.json({ error: `장소 재생성 실패: ${msg}` }, { status: 502 });
  }
}
