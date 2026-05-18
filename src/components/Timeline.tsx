"use client";

import { useState } from "react";
import { Clock, MapPin, UtensilsCrossed, Zap, Landmark, Trees, ShoppingBag, Heart, ExternalLink, Wallet, Navigation, Train, Footprints, Bus, Car } from "lucide-react";
import type { MockItinerary, ItineraryItem } from "@/data/mockItinerary";

function transportIcon(mode: string) {
  const m = mode.toLowerCase();
  if (m.includes("도보") || m.includes("걷")) return <Footprints size={11} />;
  if (m.includes("지하철") || m.includes("전철") || m.includes("기차")) return <Train size={11} />;
  if (m.includes("버스")) return <Bus size={11} />;
  if (m.includes("택시") || m.includes("차")) return <Car size={11} />;
  return <Navigation size={11} />;
}

const CATEGORY_CONFIG: Record<
  ItineraryItem["category"],
  { icon: React.ReactNode; color: string; bg: string; label: string }
> = {
  food:     { icon: <UtensilsCrossed size={13} />, color: "#ff6b6b", bg: "rgba(255,107,107,0.15)", label: "맛집" },
  activity: { icon: <Zap size={13} />,             color: "#f0b429", bg: "rgba(240,180,41,0.15)", label: "액티비티" },
  culture:  { icon: <Landmark size={13} />,        color: "#3b82f6", bg: "rgba(59,130,246,0.15)", label: "문화" },
  nature:   { icon: <Trees size={13} />,           color: "#22c55e", bg: "rgba(34,197,94,0.15)",  label: "자연" },
  shopping: { icon: <ShoppingBag size={13} />,     color: "#f472b6", bg: "rgba(244,114,182,0.15)",label: "쇼핑" },
  healing:  { icon: <Heart size={13} />,           color: "#4ecdc4", bg: "rgba(78,205,196,0.15)", label: "힐링" },
};

type Props = { itinerary: MockItinerary };

export default function Timeline({ itinerary }: Props) {
  const [activeDay, setActiveDay] = useState(0);
  const currentDay = itinerary.days[activeDay];

  return (
    <div className="w-full max-w-2xl mx-auto px-0 sm:px-2">
      {/* ── Header ── */}
      <div className="mb-6 sm:mb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full text-xs font-medium border mb-3 sm:mb-4"
          style={{ backgroundColor: "rgba(240,180,41,0.08)", borderColor: "rgba(240,180,41,0.2)", color: "#f0b429" }}>
          <MapPin size={11} />
          {itinerary.destination} · {itinerary.duration}
        </div>
        <h2 className="text-xl sm:text-2xl font-bold mb-1" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          color: "var(--text-primary)"
        }}>
          AI 맞춤 여행 일정
        </h2>
        <p className="text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>
          총 {itinerary.days.length}일 · {itinerary.days.reduce((a, d) => a + d.items.length, 0)}개 장소
        </p>
        {itinerary.totalEstimate && (
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full text-xs font-medium border"
            style={{ backgroundColor: "rgba(78,205,196,0.08)", borderColor: "rgba(78,205,196,0.25)", color: "#4ecdc4" }}>
            <Wallet size={11} />
            예상 경비 {itinerary.totalEstimate}
            <span className="opacity-60 text-[10px] ml-1">/ 1인</span>
          </div>
        )}
      </div>

      {/* ── Day Tabs ── */}
      <div className="flex gap-2 mb-6 sm:mb-8 p-1 rounded-xl border" style={{
        backgroundColor: "var(--bg-mid)",
        borderColor: "var(--border-faint)",
      }}>
        {itinerary.days.map((day, idx) => (
          <button
            key={idx}
            onClick={() => setActiveDay(idx)}
            className="flex-1 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: activeDay === idx ? "var(--bg-card)" : "transparent",
              color: activeDay === idx ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: activeDay === idx ? "0 2px 12px rgba(0,0,0,0.4)" : "none",
              borderBottom: activeDay === idx ? "2px solid var(--accent-gold)" : "2px solid transparent",
            }}
          >
            <span className="block font-bold text-sm">{day.dayLabel}</span>
            <span className="block text-xs mt-0.5" style={{ opacity: 0.7 }}>{day.date}</span>
          </button>
        ))}
      </div>

      {/* ── Timeline ── */}
      <div className="relative">
        <div className="absolute left-[24px] sm:left-[28px] top-3 bottom-3 w-px" style={{ backgroundColor: "var(--border-faint)" }} />

        <div className="space-y-0">
          {currentDay.items.map((item, idx) => {
            const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.activity;
            const isLast = idx === currentDay.items.length - 1;
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.place} ${itinerary.destination}`)}`;

            return (
              <div key={idx}>
                {/* Transport connector (skip for the first item) */}
                {idx > 0 && item.transport && (
                  <div className="relative flex gap-3 sm:gap-4 -my-1">
                    <div className="relative z-10 flex-shrink-0 w-12 sm:w-14 flex justify-center">
                      <div className="w-px h-full" style={{ backgroundColor: "var(--border-faint)" }} />
                    </div>
                    <div className="flex-1 flex items-center gap-2 py-1.5 pl-1 text-[11px]"
                      style={{ color: "var(--text-dim)" }}>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: "var(--bg-mid)", border: "1px solid var(--border-faint)" }}>
                        {transportIcon(item.transport.mode)}
                        {item.transport.mode}
                        <span style={{ color: "var(--text-muted)" }}>· {item.transport.duration}</span>
                        {item.transport.cost && (
                          <span className="opacity-70">· {item.transport.cost}</span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Item row */}
                <div className="relative flex gap-3 sm:gap-4 group">
                  {/* Timeline dot */}
                  <div className="relative z-10 flex-shrink-0 w-12 sm:w-14 flex flex-col items-center">
                    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200"
                      style={{
                        backgroundColor: cat.bg,
                        borderColor: cat.color,
                        color: cat.color,
                        boxShadow: `0 0 12px ${cat.color}30`,
                      }}>
                      {cat.icon}
                    </div>
                    {!isLast && (
                      <div className="w-px flex-1 min-h-[24px] mt-1" style={{ backgroundColor: "var(--border-faint)" }} />
                    )}
                  </div>

                  {/* Card */}
                  <div
                    className="flex-1 mb-3 sm:mb-4 rounded-xl border p-3 sm:p-4 transition-all duration-200 cursor-default"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-faint)" }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = cat.color + "50";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px ${cat.color}18`;
                      (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-faint)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
                    }}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="flex items-center gap-1 text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          <Clock size={10} />
                          {item.time}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                          style={{ backgroundColor: cat.bg, color: cat.color }}>
                          {cat.label}
                        </span>
                        {item.cost && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: "rgba(78,205,196,0.1)",
                              color: "#4ecdc4",
                              border: "1px solid rgba(78,205,196,0.25)",
                            }}>
                            <Wallet size={10} />
                            {item.cost}
                          </span>
                        )}
                      </div>
                      <span className="text-xs shrink-0" style={{ color: "var(--text-dim)" }}>{item.duration}</span>
                    </div>

                    {/* Place name — Google Maps link */}
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group/link inline-flex items-center gap-1 font-semibold text-sm sm:text-base mb-1 transition-colors"
                      style={{ color: "var(--text-primary)" }}
                      onMouseEnter={e => (e.currentTarget.style.color = cat.color)}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-primary)")}
                    >
                      {item.place}
                      <ExternalLink size={11} className="opacity-40 group-hover/link:opacity-100 transition-opacity" />
                    </a>

                    {/* Description */}
                    <p className="text-xs sm:text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
