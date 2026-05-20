import { NextRequest, NextResponse } from "next/server";

// Server-side proxy for the Frankfurter exchange-rate API.
// We do this because:
//   1. Frankfurter has been intermittently blocking browser CORS calls from
//      Vercel-hosted origins.
//   2. We can cache the response (rates change once a day) — fewer outgoing calls.

const ALLOWED = new Set([
  "USD", "EUR", "JPY", "GBP", "HKD", "SGD", "AUD",
  "THB", "IDR", "CNY", "TWD", "MYR", "PHP", "VND",
  "CHF", "CAD", "NZD", "INR", "MXN", "BRL",
  "KRW", // ← target currency (always the "to" for our calculator)
]);

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const from = (url.searchParams.get("from") ?? "").toUpperCase();
  const to = (url.searchParams.get("to") ?? "KRW").toUpperCase();

  if (!from || !/^[A-Z]{3}$/.test(from)) {
    return NextResponse.json({ error: "invalid_from" }, { status: 400 });
  }
  if (!/^[A-Z]{3}$/.test(to)) {
    return NextResponse.json({ error: "invalid_to" }, { status: 400 });
  }
  if (!ALLOWED.has(from) || !ALLOWED.has(to)) {
    return NextResponse.json({ error: "unsupported_currency" }, { status: 400 });
  }
  if (from === to) {
    return NextResponse.json({ rate: 1, date: new Date().toISOString().slice(0, 10), from, to });
  }

  try {
    const res = await fetch(
      `https://api.frankfurter.app/latest?from=${from}&to=${to}`,
      {
        headers: { "User-Agent": "TripVibe/1.0" },
        // Rates change daily — cache 6 hours
        next: { revalidate: 60 * 60 * 6 },
        // Bail out if Frankfurter is slow — better to fail fast than hang
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `upstream_${res.status}` }, { status: 502 });
    }
    const data = (await res.json()) as { rates?: Record<string, number>; date?: string };
    const rate = data?.rates?.[to];
    if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) {
      return NextResponse.json({ error: "invalid_rate_in_upstream" }, { status: 502 });
    }
    return NextResponse.json(
      {
        rate,
        date: typeof data.date === "string" ? data.date : "",
        from,
        to,
      },
      {
        headers: {
          // Browser cache for 1 hour, CDN-edge for 6 hours
          "Cache-Control": "public, max-age=3600, s-maxage=21600",
        },
      }
    );
  } catch (err) {
    console.error("[exchange-rate] fetch failed:", err);
    return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
  }
}
