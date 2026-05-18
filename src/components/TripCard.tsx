"use client";

import { MapPin, Clock, ChevronRight, Trash2 } from "lucide-react";
import type { ItineraryRow } from "@/lib/supabase";

type Props = {
  trip: Omit<ItineraryRow, "content">;
  onClick: () => void;
  onDelete: () => void;
  deleting?: boolean;
};

const STYLE_LABELS: Record<string, string> = {
  healing: "힐링", food: "맛집", activity: "액티비티",
  insta: "인스타감성", culture: "문화탐방", nature: "자연경관",
  shopping: "쇼핑", nightlife: "나이트라이프",
};

export default function TripCard({ trip, onClick, onDelete, deleting }: Props) {
  const date = new Date(trip.created_at).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric",
  });

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (deleting) return;
    if (confirm(`'${trip.destination}' 일정을 삭제할까요? 되돌릴 수 없습니다.`)) {
      onDelete();
    }
  };

  return (
    <div
      onClick={onClick}
      className="relative w-full text-left rounded-2xl border p-4 sm:p-5 transition-all duration-200 group cursor-pointer"
      style={{
        backgroundColor: "var(--bg-card)",
        borderColor: "var(--border-faint)",
        opacity: deleting ? 0.5 : 1,
        pointerEvents: deleting ? "none" : "auto",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(240,180,41,0.35)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 24px rgba(240,180,41,0.08)";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-faint)";
        (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
        (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <MapPin size={13} style={{ color: "var(--accent-gold)", flexShrink: 0 }} />
            <span className="font-bold text-base truncate" style={{ color: "var(--text-primary)" }}>
              {trip.destination}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{
              backgroundColor: "rgba(240,180,41,0.1)",
              color: "var(--accent-gold)",
            }}>
              {trip.duration}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mb-3 flex-wrap">
            {trip.styles?.slice(0, 4).map(s => (
              <span key={s} className="text-xs px-2 py-0.5 rounded-full" style={{
                backgroundColor: "var(--bg-mid)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-faint)",
              }}>
                {STYLE_LABELS[s] ?? s}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-1 text-xs" style={{ color: "var(--text-dim)" }}>
            <Clock size={10} />
            {date}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleDeleteClick}
            disabled={deleting}
            aria-label="일정 삭제"
            className="p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
            style={{ color: "#ff6b6b", backgroundColor: "rgba(255,107,107,0.08)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,107,107,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,107,107,0.08)")}
          >
            <Trash2 size={14} />
          </button>
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-1"
            style={{ color: "var(--text-dim)" }} />
        </div>
      </div>
    </div>
  );
}
