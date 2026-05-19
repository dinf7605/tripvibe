"use client";

import dynamic from "next/dynamic";
import type { ItineraryItem } from "@/data/mockItinerary";

const MapViewInner = dynamic(() => import("./MapViewInner"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-12 rounded-xl border"
      style={{ backgroundColor: "var(--bg-mid)", borderColor: "var(--border-faint)", height: 340 }}>
      <div className="w-7 h-7 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
    </div>
  ),
});

type Props = { items: ItineraryItem[]; destination: string; activeItemIdx?: number | null };

export default function MapView({ items, destination, activeItemIdx }: Props) {
  return <MapViewInner items={items} destination={destination} activeItemIdx={activeItemIdx} />;
}
