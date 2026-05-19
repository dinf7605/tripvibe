"use client";

import { useState } from "react";
import { Clock, MapPin, UtensilsCrossed, Zap, Landmark, Trees, ShoppingBag, Heart, ExternalLink, Wallet, Navigation, Train, Footprints, Bus, Car, Map, Route, Plus, RefreshCw } from "lucide-react";
import type { MockItinerary, ItineraryItem } from "@/data/mockItinerary";
import MapView from "./MapView";
import CurrencyWidget from "./CurrencyWidget";
import SortableEditableCard from "./SortableEditableCard";
import { optimizeRoute } from "@/lib/routeOptimizer";
import type { OptimizeResult } from "@/lib/routeOptimizer";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

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

type Props = {
  itinerary: MockItinerary;
  editMode?: boolean;
  onItineraryChange?: (next: MockItinerary) => void;
  onRegenerateItem?: (dayIdx: number, itemIdx: number) => void;
  /** "day-idx" string identifying the currently-regenerating card, if any */
  regeneratingKey?: string | null;
};

export default function Timeline({
  itinerary,
  editMode = false,
  onItineraryChange,
  onRegenerateItem,
  regeneratingKey,
}: Props) {
  const [activeDay, setActiveDay] = useState(0);
  const [showMap, setShowMap] = useState(false);
  const [activeItemIdx, setActiveItemIdx] = useState<number | null>(null);
  const [optimizedDays, setOptimizedDays] = useState<Record<number, OptimizeResult>>({});
  const [activeOptimized, setActiveOptimized] = useState<Set<number>>(new Set());
  const [optimizing, setOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const safeActiveDay = Math.min(Math.max(0, activeDay), Math.max(0, itinerary.days.length - 1));
  const currentDay = itinerary.days[safeActiveDay];
  const currentItems: ItineraryItem[] = Array.isArray(currentDay?.items) ? currentDay.items : [];
  const isCurrentOptimized = activeOptimized.has(safeActiveDay);
  const displayItems: ItineraryItem[] = isCurrentOptimized && optimizedDays[safeActiveDay]
    ? optimizedDays[safeActiveDay].items
    : currentItems;

  const handleItemClick = (idx: number) => {
    if (!showMap) setShowMap(true);
    // Reset then set so clicking the same item twice still re-pans
    setActiveItemIdx(null);
    requestAnimationFrame(() => setActiveItemIdx(idx));
  };

  const switchDay = (idx: number) => {
    setActiveDay(idx);
    setActiveItemIdx(null);
    setOptimizeError(null);
  };

  // ── Edit handlers ─────────────────────────────────────
  const mutateCurrentDay = (mutator: (items: ItineraryItem[]) => ItineraryItem[]) => {
    if (!onItineraryChange) return;
    const nextDays = itinerary.days.map((d, i) => {
      if (i !== safeActiveDay) return d;
      return { ...d, items: mutator(Array.isArray(d.items) ? d.items : []) };
    });
    onItineraryChange({ ...itinerary, days: nextDays });
  };

  // After reorder/delete the predecessor of each item changes,
  // making transport info meaningless. Strip it so the user can re-optimize.
  const stripAllTransport = (items: ItineraryItem[]) =>
    items.map(it => ({ ...it, transport: undefined }));

  const handleItemEdit = (idx: number, patch: Partial<ItineraryItem>) => {
    mutateCurrentDay(items =>
      items.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        // If place name changed substantially, stored coords/transport may be wrong
        if (patch.place !== undefined && patch.place !== it.place) {
          next.coords = undefined;
        }
        return next;
      })
    );
  };

  const handleItemDelete = (idx: number) => {
    if (idx < 0) return;
    mutateCurrentDay(items => {
      if (idx >= items.length) return items;
      return stripAllTransport(items.filter((_, i) => i !== idx));
    });
  };

  const handleAddItem = () => {
    const last = currentItems[currentItems.length - 1];
    const newTime = (() => {
      if (!last || !/^\d{1,2}:\d{2}$/.test(last.time)) return "09:00";
      const [h, m] = last.time.split(":").map(Number);
      if (!Number.isFinite(h) || !Number.isFinite(m)) return "09:00";
      const nextH = Math.min(23, h + 1);
      return `${String(nextH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    })();
    const newItem: ItineraryItem = {
      time: newTime,
      place: "",
      description: "",
      category: "activity",
      duration: "1시간",
    };
    mutateCurrentDay(items => [...items, newItem]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = Number(active.id);
    const newIdx = Number(over.id);
    if (!Number.isFinite(oldIdx) || !Number.isFinite(newIdx)) return;
    if (oldIdx < 0 || newIdx < 0) return;
    mutateCurrentDay(items => {
      if (oldIdx >= items.length || newIdx >= items.length) return items;
      return stripAllTransport(arrayMove(items, oldIdx, newIdx));
    });
  };

  const handleOptimize = async () => {
    if (optimizing) return;
    if (isCurrentOptimized) {
      setActiveOptimized(prev => { const s = new Set(prev); s.delete(safeActiveDay); return s; });
      setActiveItemIdx(null);
      return;
    }
    if (optimizedDays[safeActiveDay]) {
      setActiveOptimized(prev => new Set(prev).add(safeActiveDay));
      setActiveItemIdx(null);
      return;
    }
    const coordCount = currentItems.filter(it => it.coords && isFinite(it.coords.lat) && isFinite(it.coords.lng)).length;
    if (coordCount < 3) {
      setOptimizeError("최적화하려면 좌표가 있는 장소가 3개 이상 필요합니다.");
      setTimeout(() => setOptimizeError(null), 4000);
      return;
    }
    setOptimizing(true);
    setOptimizeError(null);
    try {
      const result = await optimizeRoute(currentItems);
      setOptimizedDays(prev => ({ ...prev, [safeActiveDay]: result }));
      setActiveOptimized(prev => new Set(prev).add(safeActiveDay));
      setActiveItemIdx(null);
    } catch (err) {
      console.error("[optimize] failed:", err);
      const msg = err instanceof Error && err.name === "AbortError"
        ? "최적화 요청이 시간 초과되었습니다. 다시 시도해주세요."
        : "동선 최적화 실패. 잠시 후 다시 시도해주세요.";
      setOptimizeError(msg);
      setTimeout(() => setOptimizeError(null), 4000);
    } finally {
      setOptimizing(false);
    }
  };

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
        <div className="w-full mt-4">
          <CurrencyWidget destination={itinerary.destination} totalEstimate={itinerary.totalEstimate} />
        </div>
      </div>

      {/* ── Day Tabs + Map toggle ── */}
      <div className="flex gap-2 mb-4 p-1 rounded-xl border" style={{
        backgroundColor: "var(--bg-mid)",
        borderColor: "var(--border-faint)",
      }}>
        {itinerary.days.map((day, idx) => (
          <button
            key={idx}
            onClick={() => switchDay(idx)}
            className="flex-1 py-2 sm:py-2.5 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: safeActiveDay === idx ? "var(--bg-card)" : "transparent",
              color: safeActiveDay === idx ? "var(--text-primary)" : "var(--text-muted)",
              boxShadow: safeActiveDay === idx ? "0 2px 12px rgba(0,0,0,0.4)" : "none",
              borderBottom: safeActiveDay === idx ? "2px solid var(--accent-gold)" : "2px solid transparent",
            }}
          >
            <span className="block font-bold text-sm">{day.dayLabel}</span>
            <span className="block text-xs mt-0.5" style={{ opacity: 0.7 }}>{day.date}</span>
          </button>
        ))}
        {!editMode && (
          <>
            <button
              onClick={() => setShowMap(v => !v)}
              className="flex flex-col items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: showMap ? "rgba(240,180,41,0.15)" : "transparent",
                color: showMap ? "var(--accent-gold)" : "var(--text-muted)",
                borderBottom: showMap ? "2px solid var(--accent-gold)" : "2px solid transparent",
                minWidth: 56,
              }}
            >
              <Map size={15} />
              <span className="mt-0.5">지도</span>
            </button>
            <button
              onClick={handleOptimize}
              disabled={optimizing}
              className="flex flex-col items-center justify-center px-3 py-2 rounded-lg text-xs font-medium transition-all"
              style={{
                backgroundColor: isCurrentOptimized ? "rgba(34,197,94,0.15)" : "transparent",
                color: isCurrentOptimized ? "#22c55e" : optimizing ? "var(--accent-gold)" : "var(--text-muted)",
                borderBottom: isCurrentOptimized ? "2px solid #22c55e" : "2px solid transparent",
                minWidth: 56,
                opacity: optimizing ? 0.8 : 1,
              }}
            >
              {optimizing
                ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
                : <Route size={15} />
              }
              <span className="mt-0.5">{isCurrentOptimized ? "원래순서" : "최적화"}</span>
            </button>
          </>
        )}
      </div>

      {/* ── Optimize status / error ── */}
      {optimizeError && (
        <div className="mb-3 px-4 py-2.5 rounded-xl text-xs border"
          style={{ backgroundColor: "rgba(255,107,107,0.08)", borderColor: "rgba(255,107,107,0.25)", color: "#ff6b6b" }}>
          {optimizeError}
        </div>
      )}
      {isCurrentOptimized && optimizedDays[safeActiveDay] && (
        <div className="flex items-center justify-center gap-1.5 mb-4 py-2 px-3 rounded-xl text-xs font-medium"
          style={{ backgroundColor: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#22c55e" }}>
          <Route size={11} />
          {optimizedDays[safeActiveDay].savedMinutes > 0
            ? `동선 최적화 완료 · 이동 시간 약 ${optimizedDays[safeActiveDay].savedMinutes}분 절약`
            : "동선 최적화 완료 · 이미 최적의 순서예요"}
        </div>
      )}

      {/* ── Map view ── */}
      {showMap && !editMode && (
        <div className="mb-6 animate-fade-in">
          <MapView
            key={`${safeActiveDay}-${isCurrentOptimized ? "opt" : "orig"}`}
            items={displayItems}
            destination={itinerary.destination}
            activeItemIdx={activeItemIdx}
          />
        </div>
      )}

      {/* ── Edit mode: sortable cards ── */}
      {editMode ? (
        <div className="animate-fade-in">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={currentItems.map((_, i) => String(i))}
              strategy={verticalListSortingStrategy}
            >
              <div>
                {currentItems.length === 0 ? (
                  <div className="text-center py-10 text-sm" style={{ color: "var(--text-muted)" }}>
                    이 날짜에는 장소가 없습니다. 아래 버튼으로 추가해주세요.
                  </div>
                ) : (
                  currentItems.map((item, idx) => (
                    <SortableEditableCard
                      key={idx}
                      id={String(idx)}
                      index={idx}
                      item={item}
                      onChange={patch => handleItemEdit(idx, patch)}
                      onDelete={() => handleItemDelete(idx)}
                    />
                  ))
                )}
              </div>
            </SortableContext>
          </DndContext>
          <button
            onClick={handleAddItem}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed text-sm font-medium transition-all"
            style={{
              borderColor: "var(--border-faint)",
              color: "var(--text-muted)",
              backgroundColor: "transparent",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = "var(--accent-gold)";
              e.currentTarget.style.color = "var(--accent-gold)";
              e.currentTarget.style.backgroundColor = "rgba(240,180,41,0.04)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = "var(--border-faint)";
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <Plus size={15} />
            장소 추가
          </button>
        </div>
      ) : (
      /* ── Timeline (view mode) ── */
      <div className="relative">
        <div className="absolute left-[24px] sm:left-[28px] top-3 bottom-3 w-px" style={{ backgroundColor: "var(--border-faint)" }} />

        <div className="space-y-0">
          {displayItems.map((item, idx) => {
            const cat = CATEGORY_CONFIG[item.category] ?? CATEGORY_CONFIG.activity;
            const isLast = idx === displayItems.length - 1;
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
                    className="relative flex-1 mb-3 sm:mb-4 rounded-xl border p-3 sm:p-4 transition-all duration-200 cursor-pointer"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: activeItemIdx === idx ? cat.color : "var(--border-faint)",
                      boxShadow: activeItemIdx === idx ? `0 4px 24px ${cat.color}30` : "none",
                      opacity: regeneratingKey === `${safeActiveDay}-${idx}` ? 0.55 : 1,
                      pointerEvents: regeneratingKey === `${safeActiveDay}-${idx}` ? "none" : "auto",
                    }}
                    onClick={() => item.coords && handleItemClick(idx)}
                    title={item.coords ? "지도에서 이 장소 보기" : ""}
                    onMouseEnter={e => {
                      if (regeneratingKey === `${safeActiveDay}-${idx}`) return;
                      (e.currentTarget as HTMLDivElement).style.borderColor = cat.color + "50";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = `0 4px 24px ${cat.color}18`;
                      (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)";
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.borderColor = activeItemIdx === idx ? cat.color : "var(--border-faint)";
                      (e.currentTarget as HTMLDivElement).style.boxShadow = activeItemIdx === idx ? `0 4px 24px ${cat.color}30` : "none";
                      (e.currentTarget as HTMLDivElement).style.transform = "translateX(0)";
                    }}
                  >
                    {/* Regenerating overlay spinner */}
                    {regeneratingKey === `${safeActiveDay}-${idx}` && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl z-10"
                        style={{ backgroundColor: "rgba(0,0,0,0.04)", pointerEvents: "auto" }}>
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
                          style={{
                            backgroundColor: "var(--bg-card)",
                            border: "1px solid var(--border-faint)",
                            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
                          }}>
                          <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin"
                            style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
                          <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                            새로운 장소 찾는 중...
                          </span>
                        </div>
                      </div>
                    )}

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
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-xs" style={{ color: "var(--text-dim)" }}>{item.duration}</span>
                        {onRegenerateItem && (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onRegenerateItem(safeActiveDay, idx);
                            }}
                            className="ml-0.5 p-1.5 rounded-md transition-all"
                            style={{
                              color: "var(--text-dim)",
                              backgroundColor: "transparent",
                            }}
                            onMouseEnter={e => {
                              e.currentTarget.style.color = "var(--accent-gold)";
                              e.currentTarget.style.backgroundColor = "rgba(240,180,41,0.1)";
                            }}
                            onMouseLeave={e => {
                              e.currentTarget.style.color = "var(--text-dim)";
                              e.currentTarget.style.backgroundColor = "transparent";
                            }}
                            title="이 장소만 다른 곳으로 다시 추천받기"
                            aria-label="이 장소 다시 추천"
                          >
                            <RefreshCw size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Place name — Google Maps link */}
                    <a
                      href={mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
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
      )}
    </div>
  );
}
