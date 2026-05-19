import { ImageResponse } from "next/og";

// OpenGraph image — Next.js auto-generates `/opengraph-image` and wires it into
// the layout's metadata. Twitter Card reuses the same when no twitter-image.tsx.
export const runtime = "edge";
export const alt = "TripVibe — AI 여행 플래너";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ── Font loader ──────────────────────────────────────────────
// ImageResponse / Satori only accepts TTF/OTF (no woff2). Google Fonts serves
// woff2 to modern UAs, so we masquerade as an older browser to get TTF back.
// We pass a `text` subset so each request only ships the glyphs we actually
// render — keeps the image generation fast and small.
async function loadKoreanFont(
  weight: 300 | 700 | 900,
  text: string
): Promise<ArrayBuffer | null> {
  try {
    const url =
      `https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@${weight}` +
      `&text=${encodeURIComponent(text)}&display=swap`;

    const cssRes = await fetch(url, {
      headers: {
        // Pretend to be an older Chrome — Google Fonts then returns TTF format.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36",
      },
      // Edge runtime supports `cache`, helps avoid hammering Google
      cache: "force-cache",
    });
    if (!cssRes.ok) return null;
    const css = await cssRes.text();

    // Extract the first font URL from the @font-face block
    const match = css.match(/src:\s*url\((.+?)\)\s*format/);
    if (!match) return null;

    const fontRes = await fetch(match[1], { cache: "force-cache" });
    if (!fontRes.ok) return null;
    return await fontRes.arrayBuffer();
  } catch (err) {
    console.error(`[og] font load failed (weight=${weight}):`, err);
    return null;
  }
}

export default async function Image() {
  // Copy
  const HEADLINE_1 = "AI가 만드는";
  const HEADLINE_2 = "완벽한 여행 일정";
  const SUBTITLE = "목적지 · 기간 · 스타일만 알려주세요. 단 3초.";
  const CHIPS: Array<{ emoji: string; label: string }> = [
    { emoji: "🗺", label: "지도" },
    { emoji: "🌤", label: "날씨" },
    { emoji: "💱", label: "환율" },
    { emoji: "⚡", label: "동선 최적화" },
  ];
  const BRAND = "TripVibe";

  // Build per-weight glyph subsets — request only what we draw
  const lightText = SUBTITLE;
  const boldText = BRAND + CHIPS.map((c) => c.label).join("");
  const heavyText = HEADLINE_1 + HEADLINE_2;

  // Load in parallel; tolerate partial failures (font falls back to system)
  const [w300, w700, w900] = await Promise.all([
    loadKoreanFont(300, lightText),
    loadKoreanFont(700, boldText),
    loadKoreanFont(900, heavyText),
  ]);

  type FontEntry = {
    name: string;
    data: ArrayBuffer;
    weight: 300 | 700 | 900;
    style: "normal";
  };
  const fonts: FontEntry[] = [];
  if (w300) fonts.push({ name: "NotoKR", data: w300, weight: 300, style: "normal" });
  if (w700) fonts.push({ name: "NotoKR", data: w700, weight: 700, style: "normal" });
  if (w900) fonts.push({ name: "NotoKR", data: w900, weight: 900, style: "normal" });

  const fontFamily = '"NotoKR", "Noto Sans", system-ui, sans-serif';

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(135deg, #0c1426 0%, #1a2238 40%, #2d1f3f 100%)",
          color: "white",
          padding: "80px",
          position: "relative",
          fontFamily,
        }}
      >
        {/* Decorative orbs */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -150,
            width: 600,
            height: 600,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(240,180,41,0.45) 0%, transparent 70%)",
            filter: "blur(60px)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: 9999,
            background:
              "radial-gradient(circle, rgba(78,205,196,0.35) 0%, transparent 70%)",
            filter: "blur(70px)",
            display: "flex",
          }}
        />

        {/* Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 32,
            zIndex: 10,
          }}
        >
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#f0b429" strokeWidth="2" />
            <polygon
              points="16.24,7.76 14.12,14.12 7.76,16.24 9.88,9.88"
              fill="#f0b429"
            />
          </svg>
          <span
            style={{
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#f0b429",
            }}
          >
            {BRAND}
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            zIndex: 10,
            marginTop: "auto",
          }}
        >
          <div
            style={{
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              color: "white",
              display: "flex",
            }}
          >
            {HEADLINE_1}
          </div>
          <div
            style={{
              fontSize: 92,
              fontWeight: 900,
              lineHeight: 1.1,
              letterSpacing: "-0.04em",
              background:
                "linear-gradient(135deg, #f0b429 0%, #ffd166 50%, #ff6b6b 100%)",
              backgroundClip: "text",
              color: "transparent",
              display: "flex",
            }}
          >
            {HEADLINE_2}
          </div>

          <div
            style={{
              fontSize: 28,
              color: "rgba(255,255,255,0.72)",
              marginTop: 24,
              fontWeight: 300,
              display: "flex",
            }}
          >
            {SUBTITLE}
          </div>
        </div>

        {/* Bottom chips */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 36,
            zIndex: 10,
          }}
        >
          {CHIPS.map((chip) => (
            <div
              key={chip.label}
              style={{
                padding: "10px 22px",
                borderRadius: 9999,
                backgroundColor: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "rgba(255,255,255,0.85)",
                fontSize: 22,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span>{chip.emoji}</span>
              <span>{chip.label}</span>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: fonts.length > 0 ? fonts : undefined,
      // Render emojis with Twemoji so they look consistent everywhere
      emoji: "twemoji",
    }
  );
}
