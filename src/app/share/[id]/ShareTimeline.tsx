"use client";

import Timeline from "@/components/Timeline";
import WeatherWidget from "@/components/WeatherWidget";
import type { MockItinerary } from "@/data/mockItinerary";

export default function ShareTimeline({ itinerary }: { itinerary: MockItinerary }) {
  return (
    <>
      <div className="mb-5">
        <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
          🌤 {itinerary.destination} 현재 날씨
        </p>
        <WeatherWidget destination={itinerary.destination} />
      </div>
      {/* Read-only: no edit, no regenerate, no callbacks. */}
      <Timeline itinerary={itinerary} />
    </>
  );
}
