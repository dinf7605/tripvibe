"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import type { ItineraryItem } from "@/data/mockItinerary";

const CATEGORY_COLORS: Record<string, string> = {
  food:     "#ff6b6b",
  activity: "#f0b429",
  culture:  "#3b82f6",
  nature:   "#22c55e",
  shopping: "#f472b6",
  healing:  "#4ecdc4",
};

const DEST_FALLBACK: Record<string, [number, number]> = {
  도쿄: [35.6762, 139.6503],
  오사카: [34.6937, 135.5023],
  교토: [35.0116, 135.7681],
  파리: [48.8566, 2.3522],
  방콕: [13.7563, 100.5018],
  발리: [-8.4095, 115.1889],
  뉴욕: [40.7128, -74.0060],
  런던: [51.5074, -0.1278],
  바르셀로나: [41.3851, 2.1734],
  서울: [37.5665, 126.9780],
};

function fallbackCenter(destination: string): [number, number] {
  for (const key of Object.keys(DEST_FALLBACK)) {
    if (destination.includes(key)) return DEST_FALLBACK[key];
  }
  return [35.6762, 139.6503];
}

function isValidCoord(c: { lat?: number; lng?: number } | undefined): c is { lat: number; lng: number } {
  if (!c) return false;
  if (typeof c.lat !== "number" || typeof c.lng !== "number") return false;
  if (!isFinite(c.lat) || !isFinite(c.lng)) return false;
  if (c.lat === 0 && c.lng === 0) return false;
  if (Math.abs(c.lat) > 90 || Math.abs(c.lng) > 180) return false;
  return true;
}

type Props = {
  items: ItineraryItem[];
  destination: string;
  activeItemIdx?: number | null;
};

export default function MapViewInner({ items, destination, activeItemIdx }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markersRef = useRef<Array<{ marker: LeafletMarker; lat: number; lng: number; idx: number }>>([]);

  // Init map + render markers (runs when items change via key={activeDay})
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    async function init() {
      let L: typeof import("leaflet");
      try {
        L = (await import("leaflet")).default;
      } catch (err) {
        console.error("[map] leaflet load failed:", err);
        return;
      }
      if (cancelled || !containerRef.current) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (containerRef.current as any)._leaflet_id;

      const center = fallbackCenter(destination);
      const map = L.map(containerRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: false,
      });
      mapRef.current = map;
      markersRef.current = [];

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const points: [number, number][] = [];

      items.forEach((item, idx) => {
        if (!isValidCoord(item.coords)) return;
        const color = CATEGORY_COLORS[item.category] ?? "#f0b429";

        const icon = L.divIcon({
          html: `<div style="
            width:30px;height:30px;border-radius:50%;
            background:${color};color:#fff;
            font-size:13px;font-weight:700;line-height:30px;text-align:center;
            border:2.5px solid rgba(255,255,255,0.9);
            box-shadow:0 2px 10px rgba(0,0,0,0.45);
            font-family:sans-serif;
          ">${idx + 1}</div>`,
          className: "",
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -18],
        });

        const marker = L.marker([item.coords.lat, item.coords.lng], { icon })
          .bindPopup(`
            <div style="min-width:150px;font-family:sans-serif;padding:2px">
              <div style="font-weight:700;font-size:13px;margin-bottom:3px;color:#111">${item.place}</div>
              <div style="font-size:11px;color:#777;margin-bottom:3px">${item.time} · ${item.duration}</div>
              ${item.cost ? `<div style="font-size:11px;color:#4ecdc4;font-weight:600">💰 ${item.cost}</div>` : ""}
            </div>
          `)
          .addTo(map);

        markersRef.current.push({ marker, lat: item.coords.lat, lng: item.coords.lng, idx });
        points.push([item.coords.lat, item.coords.lng]);
      });

      // Route line
      if (points.length > 1) {
        L.polyline(points, { color: "#f0b429", weight: 2.5, dashArray: "7 4", opacity: 0.75 }).addTo(map);
      }

      // Fit to all markers
      if (points.length === 1) {
        map.setView(points[0], 14, { animate: false });
      } else if (points.length > 1) {
        map.fitBounds(points, { padding: [45, 45], animate: false });
      }
    }

    init().catch((err) => console.error("[map] init failed:", err));

    return () => {
      cancelled = true;
      markersRef.current = [];
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* ignore */ }
        mapRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pan to active item when activeItemIdx changes
  useEffect(() => {
    if (activeItemIdx == null || activeItemIdx < 0) return;
    const entry = markersRef.current.find(m => m.idx === activeItemIdx);
    if (!entry || !mapRef.current) return;
    try {
      mapRef.current.flyTo([entry.lat, entry.lng], 15, { animate: true, duration: 0.6 });
      entry.marker.openPopup();
    } catch { /* map removed */ }
  }, [activeItemIdx]);

  const validCount = items.filter(it => isValidCoord(it.coords)).length;

  return (
    <div className="rounded-xl overflow-hidden border" style={{ borderColor: "var(--border-faint)" }}>
      {validCount < items.length && (
        <div className="px-4 py-2 text-[11px]"
          style={{ backgroundColor: "var(--bg-mid)", color: "var(--text-muted)", borderBottom: "1px solid var(--border-faint)" }}>
          {validCount === 0
            ? "이 일정에는 좌표 정보가 없습니다. 새로 일정을 생성하면 지도에 표시됩니다."
            : `${validCount}/${items.length}개 장소만 지도에 표시됩니다 (좌표 누락)`}
        </div>
      )}
      <div ref={containerRef} style={{ height: 320 }} />
    </div>
  );
}
