// Shared LLM response post-processing helpers.
// Used by /api/generate and /api/regenerate-item to normalize times,
// sanity-check coords, and verify coords against Nominatim when needed.

import type { MockItinerary, ItineraryItem } from "@/data/mockItinerary";

// ── Time normalization ────────────────────────────────────────

export function parseTimeHHMM(t: string | undefined | null): number {
  if (!t || typeof t !== "string") return 9 * 60;
  const m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return 9 * 60;
  const h = parseInt(m[1]);
  const mm = parseInt(m[2]);
  if (!isFinite(h) || h < 0 || h > 23) return 9 * 60;
  if (!isFinite(mm) || mm < 0 || mm > 59) return h * 60;
  return h * 60 + mm;
}

export function formatHHMM(mins: number): string {
  const safe = Math.max(0, Math.min(24 * 60 - 1, Math.floor(mins)));
  const h = Math.floor(safe / 60) % 24;
  const m = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseDurationKo(d: string | undefined | null): number {
  if (!d || typeof d !== "string") return 60;
  let total = 0;
  const h = d.match(/(\d+)\s*시간/);
  const m = d.match(/(\d+)\s*분/);
  if (h) total += parseInt(h[1]) * 60;
  if (m) total += parseInt(m[1]);
  if (total <= 0) {
    // Pure-number fallback
    const num = d.match(/(\d+)/);
    return num ? parseInt(num[1]) : 60;
  }
  return total;
}

/**
 * Rewrites all item.time fields so that:
 *   time[0]  = whatever the LLM said for the day's first item (or 09:00 default)
 *   time[i]  = time[i-1] + duration[i-1] + transport[i].duration
 *
 * This eliminates the chronic LLM arithmetic errors and lets the prompt skip
 * the "TIME CONSISTENCY" rule (saves tokens).
 */
export function normalizeItineraryTimes(itinerary: MockItinerary): void {
  if (!itinerary?.days) return;
  for (const day of itinerary.days) {
    if (!Array.isArray(day.items) || day.items.length === 0) continue;
    let cur = parseTimeHHMM(day.items[0].time);
    for (let i = 0; i < day.items.length; i++) {
      const it = day.items[i];
      it.time = formatHHMM(cur);
      cur += parseDurationKo(it.duration);
      if (i < day.items.length - 1) {
        const next = day.items[i + 1];
        const transportMin = next.transport ? parseDurationKo(next.transport.duration) : 15;
        cur += transportMin;
      }
    }
  }
}

// ── Date context (used by user prompt) ─────────────────────────

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

export function parseDurationDays(d: string | undefined | null): number {
  if (!d) return 3;
  const m = d.match(/(\d+)\s*박\s*(\d+)\s*일/);
  if (m) return parseInt(m[2]);
  const days = d.match(/(\d+)\s*일/);
  if (days) return parseInt(days[1]);
  return 3;
}

/**
 * Build a date/weekday/season hint for the user prompt.
 * Returns "" if no valid date given — caller can append safely.
 */
export function buildDateContext(startDate: string | undefined, duration: string): string {
  if (!startDate || typeof startDate !== "string") return "";
  const start = new Date(startDate);
  if (isNaN(start.getTime())) return "";

  const days = parseDurationDays(duration);
  const dayLines: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    dayLines.push(`Day ${i + 1}: ${iso} (${WEEKDAY_KO[d.getDay()]}요일)`);
  }

  const m = start.getMonth() + 1;
  const season =
    m >= 3 && m <= 5 ? "봄"
    : m >= 6 && m <= 8 ? "여름"
    : m >= 9 && m <= 11 ? "가을"
    : "겨울";

  return `
Trip dates:
${dayLines.join("\n")}
Season: ${season}
Note: Avoid attractions known to be closed on the listed weekday (e.g. most museums closed on Monday in many regions). Adjust seasonal activities (outdoor in good weather, indoor focus in winter/monsoon).`;
}

// ── Coordinate sanity / verification ──────────────────────────

const DEST_CENTERS: Record<string, { center: [number, number]; radius: number }> = {
  도쿄:     { center: [35.6762, 139.6503], radius: 60 },
  오사카:   { center: [34.6937, 135.5023], radius: 60 },
  교토:     { center: [35.0116, 135.7681], radius: 50 },
  삿포로:   { center: [43.0618, 141.3545], radius: 60 },
  후쿠오카: { center: [33.5904, 130.4017], radius: 50 },
  나라:     { center: [34.6851, 135.8048], radius: 30 },
  파리:     { center: [48.8566, 2.3522],   radius: 60 },
  로마:     { center: [41.9028, 12.4964],  radius: 60 },
  바르셀로나: { center: [41.3851, 2.1734], radius: 50 },
  암스테르담: { center: [52.3676, 4.9041], radius: 50 },
  베를린:   { center: [52.5200, 13.4050],  radius: 60 },
  런던:     { center: [51.5074, -0.1278],  radius: 60 },
  방콕:     { center: [13.7563, 100.5018], radius: 60 },
  치앙마이: { center: [18.7883, 98.9853],  radius: 50 },
  푸켓:     { center: [7.8804, 98.3923],   radius: 60 },
  발리:     { center: [-8.4095, 115.1889], radius: 100 },
  뉴욕:     { center: [40.7128, -74.0060], radius: 60 },
  로스앤젤레스: { center: [34.0522, -118.2437], radius: 80 },
  샌프란시스코: { center: [37.7749, -122.4194], radius: 60 },
  홍콩:     { center: [22.3193, 114.1694], radius: 40 },
  싱가포르: { center: [1.3521, 103.8198],  radius: 40 },
  시드니:   { center: [-33.8688, 151.2093], radius: 60 },
  멜버른:   { center: [-37.8136, 144.9631], radius: 60 },
  서울:     { center: [37.5665, 126.9780], radius: 50 },
  부산:     { center: [35.1796, 129.0756], radius: 40 },
  제주:     { center: [33.4996, 126.5312], radius: 50 },
};

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLon = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function getDestBounds(destination: string) {
  const lower = destination.toLowerCase();
  for (const key of Object.keys(DEST_CENTERS)) {
    if (destination.includes(key) || lower.includes(key.toLowerCase())) {
      return DEST_CENTERS[key];
    }
  }
  return null;
}

export function isCoordPlausible(
  coord: { lat?: number; lng?: number } | undefined,
  destination: string
): coord is { lat: number; lng: number } {
  if (!coord || typeof coord.lat !== "number" || typeof coord.lng !== "number") return false;
  if (!isFinite(coord.lat) || !isFinite(coord.lng)) return false;
  if (coord.lat === 0 && coord.lng === 0) return false;
  if (Math.abs(coord.lat) > 90 || Math.abs(coord.lng) > 180) return false;
  const bounds = getDestBounds(destination);
  if (!bounds) return true; // unknown destination — trust the LLM
  return haversineKm([coord.lat, coord.lng], bounds.center) <= bounds.radius;
}

/**
 * Try to fetch coords from OpenStreetMap Nominatim for "place, destination".
 * Returns null on any failure. Caller controls timing (Nominatim asks ≥1s
 * between calls, but we keep it best-effort).
 */
export async function geocodeWithNominatim(
  place: string,
  destination: string,
  signal?: AbortSignal
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${place}, ${destination}`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "TripVibe/1.0 (https://tripvibe.app)",
        "Accept-Language": "ko,en",
      },
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const first = data[0];
    if (!first?.lat || !first?.lon) return null;
    const lat = parseFloat(first.lat);
    const lng = parseFloat(first.lon);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return { lat, lng };
  } catch {
    return null;
  }
}

/**
 * Walk every item in the itinerary:
 *  - if its coord is plausible, keep it
 *  - if implausible, drop to undefined (Timeline / Map handle this gracefully)
 *
 * For implausible coords we DON'T block on Nominatim — too slow. We just drop.
 * (Optional separate verify pass can run client-side in the background later.)
 */
export function sanitizeItineraryCoords(itinerary: MockItinerary): void {
  if (!itinerary?.days) return;
  for (const day of itinerary.days) {
    if (!Array.isArray(day.items)) continue;
    for (const item of day.items as ItineraryItem[]) {
      if (!isCoordPlausible(item.coords, itinerary.destination)) {
        item.coords = undefined;
      }
    }
  }
}

/**
 * Async coord verification using Nominatim. Verifies up to `maxLookups` items
 * (those whose coords were dropped by sanitizeItineraryCoords), spacing
 * requests to respect Nominatim's 1 req/sec rule. Mutates itinerary in place.
 *
 * Total wall-clock cost: ~maxLookups seconds. Caller decides whether to await
 * this or let it run in the background.
 */
export async function verifyMissingCoordsViaNominatim(
  itinerary: MockItinerary,
  maxLookups: number = 6
): Promise<number> {
  if (!itinerary?.days) return 0;
  let lookups = 0;
  for (const day of itinerary.days) {
    if (!Array.isArray(day.items)) continue;
    for (const item of day.items as ItineraryItem[]) {
      if (item.coords) continue;
      if (lookups >= maxLookups) return lookups;
      if (!item.place) continue;
      const coords = await geocodeWithNominatim(item.place, itinerary.destination);
      if (coords && isCoordPlausible(coords, itinerary.destination)) {
        item.coords = coords;
      }
      lookups++;
      // Throttle: Nominatim ToS asks for ≥1 req/sec
      await new Promise(r => setTimeout(r, 1100));
    }
  }
  return lookups;
}
