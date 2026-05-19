import type { ItineraryItem } from "@/data/mockItinerary";

type Coord = { lat: number; lng: number };

const VERY_LARGE = 999999;

function isValidCoord(c: { lat?: number; lng?: number } | undefined): c is Coord {
  if (!c) return false;
  if (typeof c.lat !== "number" || typeof c.lng !== "number") return false;
  if (!isFinite(c.lat) || !isFinite(c.lng)) return false;
  if (c.lat === 0 && c.lng === 0) return false;
  return true;
}

async function fetchDurationMatrix(coords: Coord[]): Promise<number[][]> {
  const coordStr = coords.map(c => `${c.lng},${c.lat}`).join(";");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(
      `https://router.project-osrm.org/table/v1/driving/${coordStr}?annotations=duration`,
      { signal: controller.signal }
    );
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const data = await res.json();
    if (data.code !== "Ok" || !Array.isArray(data.durations)) throw new Error("OSRM bad response");
    // Null-safe: treat unreachable routes as very large
    return (data.durations as (number | null)[][]).map(row =>
      row.map(v => (v == null || !isFinite(v)) ? VERY_LARGE : v)
    );
  } finally {
    clearTimeout(timeout);
  }
}

// Nearest-neighbor heuristic, always starts from index 0
function nearestNeighborTSP(matrix: number[][]): number[] {
  const n = matrix.length;
  const visited = new Set<number>([0]);
  const order = [0];
  while (order.length < n) {
    const cur = order[order.length - 1];
    let best = -1, bestDist = Infinity;
    for (let i = 0; i < n; i++) {
      if (!visited.has(i) && matrix[cur][i] < bestDist) {
        best = i;
        bestDist = matrix[cur][i];
      }
    }
    if (best === -1) break;
    visited.add(best);
    order.push(best);
  }
  return order;
}

function parseTimeHHMM(t: string | undefined): number {
  if (!t || typeof t !== "string") return 9 * 60; // default 09:00
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (!isFinite(h) || h < 0 || h > 23) return 9 * 60;
  return h * 60 + (isFinite(m) && m >= 0 && m < 60 ? m : 0);
}

function formatHHMM(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseDurationKo(d: string): number {
  let total = 0;
  const h = d.match(/(\d+)\s*시간/);
  const m = d.match(/(\d+)\s*분/);
  if (h) total += parseInt(h[1]) * 60;
  if (m) total += parseInt(m[1]);
  return total || 30;
}

function secToKo(sec: number): string {
  const m = Math.max(1, Math.round(sec / 60));
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60), rem = m % 60;
  return rem > 0 ? `${h}시간 ${rem}분` : `${h}시간`;
}

function guessTransportMode(mins: number): string {
  if (mins <= 12) return "도보";
  if (mins <= 30) return "지하철";
  return "택시";
}

export type OptimizeResult = {
  items: ItineraryItem[];
  savedMinutes: number;
};

export async function optimizeRoute(items: ItineraryItem[]): Promise<OptimizeResult> {
  if (!Array.isArray(items) || items.length === 0) {
    return { items: items ?? [], savedMinutes: 0 };
  }

  // Split items into those with valid coords and those without
  const withCoords: Array<{ orig: ItineraryItem; wIdx: number }> = [];
  items.forEach(item => {
    if (isValidCoord(item.coords)) {
      withCoords.push({ orig: item, wIdx: withCoords.length });
    }
  });

  if (withCoords.length < 3) {
    return { items, savedMinutes: 0 };
  }

  const coords = withCoords.map(w => w.orig.coords as Coord);
  const matrix = await fetchDurationMatrix(coords);

  // Validate matrix shape — defensive against malformed API responses
  if (!Array.isArray(matrix) || matrix.length !== coords.length ||
      matrix.some(row => !Array.isArray(row) || row.length !== coords.length)) {
    throw new Error("OSRM matrix shape mismatch");
  }

  // Original total travel time (sequential order of withCoords)
  let origSec = 0;
  for (let i = 1; i < withCoords.length; i++) {
    origSec += matrix[i - 1][i];
  }

  const tspOrder = nearestNeighborTSP(matrix);

  let optSec = 0;
  for (let i = 1; i < tspOrder.length; i++) {
    optSec += matrix[tspOrder[i - 1]][tspOrder[i]];
  }

  const savedMinutes = Math.max(0, Math.round((origSec - optSec) / 60));

  // Build final order: TSP-ordered coord items, then non-coord items appended
  const withCoordsSet = new Set(withCoords.map(w => w.orig));
  const withoutCoords = items.filter(item => !withCoordsSet.has(item));
  const finalOrder = [
    ...tspOrder.map(i => withCoords[i].orig),
    ...withoutCoords,
  ];

  // Map from original item reference → matrix index (index in withCoords)
  const itemToMatIdx = new Map<ItineraryItem, number>();
  withCoords.forEach((w, i) => itemToMatIdx.set(w.orig, i));

  // Pre-compute travel time between each consecutive pair in finalOrder
  const travelBetween: Array<{ mins: number; mode: string }> = [];
  for (let i = 0; i < finalOrder.length - 1; i++) {
    const fromIdx = itemToMatIdx.get(finalOrder[i]);
    const toIdx = itemToMatIdx.get(finalOrder[i + 1]);
    if (fromIdx !== undefined && toIdx !== undefined) {
      const mins = Math.max(1, Math.round(matrix[fromIdx][toIdx] / 60));
      travelBetween.push({ mins, mode: guessTransportMode(mins) });
    } else {
      // Fallback to original transport duration if available
      const next = finalOrder[i + 1];
      const mins = next.transport ? parseDurationKo(next.transport.duration) : 15;
      travelBetween.push({ mins, mode: next.transport?.mode ?? "이동" });
    }
  }

  // Rebuild items with recalculated times and transports
  let timeMins = parseTimeHHMM(items[0].time);
  const result: ItineraryItem[] = [];

  for (let i = 0; i < finalOrder.length; i++) {
    const item: ItineraryItem = { ...finalOrder[i] };
    item.time = formatHHMM(timeMins);

    if (i === 0) {
      item.transport = undefined;
    } else {
      const t = travelBetween[i - 1];
      item.transport = { mode: t.mode, duration: secToKo(t.mins * 60) };
    }

    result.push(item);

    if (i < finalOrder.length - 1) {
      timeMins += parseDurationKo(item.duration) + travelBetween[i].mins;
    }
  }

  return { items: result, savedMinutes };
}
