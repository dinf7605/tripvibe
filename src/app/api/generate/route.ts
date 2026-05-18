import Groq from "groq-sdk";
import { NextRequest, NextResponse } from "next/server";

const STYLE_GUIDE: Record<string, string> = {
  healing:   "조용하고 한적한 힐링 스폿(온천, 카페, 공원 등) 위주로 추천",
  food:      "현지인이 추천하는 맛집과 카페 위주로 추천",
  activity:  "체험형 액티비티(서핑, 트레킹, 테마파크 등) 위주로 추천",
  insta:     "사진이 잘 나오는 인스타 감성 명소(뷰포인트, 감성 카페, 포토스팟) 위주로 추천",
  culture:   "박물관, 사찰, 유적지 등 문화/역사 명소 위주로 추천",
  nature:    "자연 경관(산, 바다, 해변, 폭포 등) 위주로 추천",
  shopping:  "쇼핑 거리, 시장, 백화점, 편집숍 위주로 추천",
  nightlife: "야경 명소와 바, 클럽, 야시장 등 밤에 즐길 거리 위주로 추천",
};

const SYSTEM_PROMPT = `You are an expert travel planner. You MUST respond ONLY with valid JSON. Do not include any markdown formatting, code blocks, or backticks. No explanations before or after the JSON.

The JSON structure must match this EXACT format:
{
  "destination": "string (Korean)",
  "duration": "string (Korean, e.g. '1박 2일')",
  "totalEstimate": "string (Korean, estimated total cost per person, e.g. '약 30만원' or '약 25,000엔')",
  "days": [
    {
      "dayLabel": "string (e.g. 'Day 1')",
      "date": "string (Korean, e.g. '첫째 날')",
      "items": [
        {
          "time": "string (HH:MM format, e.g. '09:00')",
          "place": "string (Korean place name)",
          "description": "string (Korean, 1-2 sentences describing the place and tips)",
          "category": "one of: food | activity | culture | nature | shopping | healing",
          "duration": "string (Korean, e.g. '1시간 30분')",
          "cost": "string (estimated cost per person in local currency, e.g. '무료', '약 1,500엔', '약 ₩15,000', '약 €12')",
          "transport": {
            "mode": "string (Korean, e.g. '지하철', '도보', '택시', '버스', '도보 + 지하철')",
            "duration": "string (Korean, e.g. '10분', '약 25분')",
            "cost": "string (optional, e.g. '약 200엔', '무료'). Omit field if walking or unknown."
          }
        }
      ]
    }
  ]
}

Rules:
- All place names, descriptions, and date labels MUST be written in Korean.
- Each day must have 6-8 items with realistic times from morning to evening.
- Times must be chronological and realistic (account for travel and meal durations).
- Categories must be one of the exact values: food, activity, culture, nature, shopping, healing.
- Descriptions must be helpful, specific, and written naturally in Korean.
- dayLabel must be in English: "Day 1", "Day 2", etc.
- date must be in Korean ordinal form: "첫째 날", "둘째 날", "셋째 날", etc.
- COST: Always include a realistic "cost" field per item using LOCAL currency of the destination (엔 for Japan, € for Europe, ₩ for Korea, $ for US, ฿ for Thailand, etc.). Use "무료" if free.
- TRANSPORT: The FIRST item of each day must OMIT the "transport" field (it's the starting point). Every other item MUST include "transport" describing how to get from the PREVIOUS place to this place. Use realistic Korean mode names.
- TRANSPORT DURATION ACCURACY (very important):
  • "transport.duration" MUST represent the realistic real-world travel time from the IMMEDIATELY PREVIOUS place to this place — not a guess, but based on actual geographic distance and the chosen mode.
  • Match the mode to the distance: under 800m → "도보" (5-10분), 800m~3km → "도보" or "지하철" (10-20분), 3-10km → "지하철" or "버스" (15-30분), over 10km → "택시" or "전철" with realistic duration.
  • The next item's "time" MUST equal: previous item's "time" + previous item's "duration" + this item's "transport.duration". Verify chronologically.
  • If you place a 13:00 item with 1시간 30분 duration, and the next has a 20분 transport, the next item's time must be roughly 14:50.
  • Do NOT use suspiciously round numbers like always "15분" — vary realistically (예: 8분, 22분, 35분).
- TOTAL ESTIMATE: Sum entry fees + meals + local transport roughly. Exclude flights and accommodation. Format as Korean estimate per person.

CRITICAL CONSTRAINTS (must follow strictly):
1. STYLE MATCHING: At LEAST 70% of all places in the entire itinerary must directly match the user's selected travel styles. Pick places that genuinely fit the chosen vibes. Do NOT pad with random tourist spots from unrelated styles.
2. NO DUPLICATES: Every place name across the ENTIRE itinerary (all days combined) must be UNIQUE. Never repeat the same place, restaurant, cafe, or attraction in different time slots or different days. Each "place" field must appear exactly once.
3. Each day should have a meaningful flow — group geographically nearby places to minimize travel time, alternate active and relaxing items.

Respond with ONLY the JSON object. Nothing else.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "API key not configured" }, { status: 500 });
  }

  let destination: string, duration: string, styles: string[];
  try {
    const body = await req.json();
    destination = body.destination;
    duration = body.duration;
    styles = body.styles ?? [];
    if (!destination || !duration) throw new Error("missing fields");
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const styleDetails = styles.length > 0
    ? styles.map(s => `  • ${s}: ${STYLE_GUIDE[s] ?? "사용자가 선택한 스타일에 맞는 장소"}`).join("\n")
    : "  • 일반적인 추천";

  const userPrompt = `Create a travel itinerary for the following trip:
- Destination: ${destination}
- Duration: ${duration}
- Travel styles (USER PRIORITY — must heavily bias the itinerary toward these):
${styleDetails}

REQUIREMENTS:
1. The majority of recommended places must directly reflect the user's selected styles above. If the user picked "맛집", most places should be restaurants/cafes. If they picked "힐링", focus on calm and restorative spots. Do not include irrelevant tourist clichés unless they fit a chosen style.
2. Every "place" name in the entire itinerary must be UNIQUE — no place may appear twice across any day.
3. Include a mix of must-see and hidden gems, but only within the chosen styles.
4. ROUTE OPTIMIZATION: Within each day, cluster places that are geographically close so that transport durations between consecutive items are minimized. Do not bounce across distant neighborhoods. Use specific, well-known place names (e.g. "이치란 라멘 도톤보리점") not generic names ("라멘집") so locations are unambiguous.
5. TIME CONSISTENCY: For each non-first item, the "time" must be calculated as previous-item.time + previous-item.duration + this-item.transport.duration. Double-check arithmetic before responding.`;

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4096,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    const cleaned = text.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/i, "").trim();

    let itinerary: unknown;
    try {
      itinerary = JSON.parse(cleaned);
    } catch {
      console.error("[generate] JSON parse failed. Raw:", cleaned.slice(0, 500));
      return NextResponse.json(
        { error: "AI 응답 형식이 올바르지 않습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }

    // Validate response shape
    const it = itinerary as {
      destination?: unknown;
      duration?: unknown;
      days?: unknown;
    };
    if (
      typeof it?.destination !== "string" ||
      typeof it?.duration !== "string" ||
      !Array.isArray(it?.days) ||
      it.days.length === 0
    ) {
      console.error("[generate] Invalid itinerary shape:", JSON.stringify(itinerary).slice(0, 300));
      return NextResponse.json(
        { error: "AI가 생성한 일정의 구조가 올바르지 않습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }

    const validDays = it.days.filter(
      (d): d is { items: unknown[] } =>
        typeof d === "object" && d !== null && Array.isArray((d as { items?: unknown }).items)
    );
    if (validDays.length === 0) {
      return NextResponse.json(
        { error: "AI가 생성한 일정에 유효한 항목이 없습니다. 다시 시도해주세요." },
        { status: 502 }
      );
    }

    // Safety net: dedupe identical place names across all days (normalized)
    const seen = new Set<string>();
    for (const day of validDays) {
      day.items = day.items.filter((raw) => {
        const item = raw as { place?: string };
        const key = (item?.place ?? "").trim().toLowerCase().replace(/\s+/g, "");
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    return NextResponse.json(itinerary);
  } catch (err) {
    console.error("[generate] Groq error:", err);
    return NextResponse.json({ error: "일정 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }
}
