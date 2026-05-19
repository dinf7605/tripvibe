"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Clock, Wallet } from "lucide-react";
import type { ItineraryItem } from "@/data/mockItinerary";

const CATEGORIES: Array<{ id: ItineraryItem["category"]; label: string; color: string; bg: string }> = [
  { id: "food",     label: "맛집",     color: "#ff6b6b", bg: "rgba(255,107,107,0.15)" },
  { id: "activity", label: "액티비티", color: "#f0b429", bg: "rgba(240,180,41,0.15)" },
  { id: "culture",  label: "문화",     color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  { id: "nature",   label: "자연",     color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  { id: "shopping", label: "쇼핑",     color: "#f472b6", bg: "rgba(244,114,182,0.15)" },
  { id: "healing",  label: "힐링",     color: "#4ecdc4", bg: "rgba(78,205,196,0.15)" },
];

function categoryConfig(category: ItineraryItem["category"]) {
  return CATEGORIES.find(c => c.id === category) ?? CATEGORIES[1];
}

type Props = {
  id: string;
  item: ItineraryItem;
  index: number;
  onChange: (patch: Partial<ItineraryItem>) => void;
  onDelete: () => void;
};

export default function SortableEditableCard({ id, item, onChange, onDelete }: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const cat = categoryConfig(item.category);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} className="relative flex gap-2 sm:gap-3 mb-3">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex-shrink-0 w-8 self-stretch flex items-center justify-center rounded-lg cursor-grab active:cursor-grabbing transition-colors"
        style={{ color: "var(--text-dim)", backgroundColor: "var(--bg-mid)", border: "1px solid var(--border-faint)" }}
        title="드래그하여 순서 변경"
        aria-label="드래그 핸들"
      >
        <GripVertical size={16} />
      </button>

      {/* Card */}
      <div
        className="flex-1 rounded-xl border p-3 sm:p-4"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: cat.color + "40",
          boxShadow: `0 2px 8px ${cat.color}10`,
        }}
      >
        {/* Top row: time + category + cost + delete */}
        <div className="flex items-center gap-2 flex-wrap mb-3">
          {/* Time input */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
            style={{ backgroundColor: "var(--bg-mid)", border: "1px solid var(--border-faint)" }}>
            <Clock size={10} style={{ color: "var(--text-muted)" }} />
            <input
              type="text"
              value={item.time}
              onChange={e => onChange({ time: e.target.value })}
              placeholder="09:00"
              className="bg-transparent outline-none font-mono w-12"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          {/* Category select */}
          <select
            value={item.category}
            onChange={e => onChange({ category: e.target.value as ItineraryItem["category"] })}
            className="px-2 py-1 rounded-md text-xs font-medium outline-none cursor-pointer"
            style={{ backgroundColor: cat.bg, color: cat.color, border: `1px solid ${cat.color}40` }}
          >
            {CATEGORIES.map(c => (
              <option key={c.id} value={c.id} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
                {c.label}
              </option>
            ))}
          </select>

          {/* Duration */}
          <input
            type="text"
            value={item.duration}
            onChange={e => onChange({ duration: e.target.value })}
            placeholder="1시간"
            className="px-2 py-1 rounded-md text-xs w-20 outline-none"
            style={{
              backgroundColor: "var(--bg-mid)",
              border: "1px solid var(--border-faint)",
              color: "var(--text-primary)",
            }}
          />

          {/* Cost */}
          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs"
            style={{ backgroundColor: "rgba(78,205,196,0.1)", border: "1px solid rgba(78,205,196,0.25)" }}>
            <Wallet size={10} style={{ color: "#4ecdc4" }} />
            <input
              type="text"
              value={item.cost ?? ""}
              onChange={e => onChange({ cost: e.target.value || undefined })}
              placeholder="비용"
              className="bg-transparent outline-none w-20"
              style={{ color: "#4ecdc4" }}
            />
          </div>

          {/* Delete */}
          <button
            onClick={onDelete}
            className="ml-auto p-1.5 rounded-md transition-colors"
            style={{ color: "#ff6b6b", backgroundColor: "rgba(255,107,107,0.08)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,107,107,0.18)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(255,107,107,0.08)")}
            title="이 장소 삭제"
            aria-label="장소 삭제"
          >
            <Trash2 size={13} />
          </button>
        </div>

        {/* Place name */}
        <input
          type="text"
          value={item.place}
          onChange={e => onChange({ place: e.target.value })}
          placeholder="장소명"
          className="w-full px-3 py-2 mb-2 rounded-lg outline-none font-semibold text-sm sm:text-base"
          style={{
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-faint)",
            color: "var(--text-primary)",
          }}
        />

        {/* Description */}
        <textarea
          value={item.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="장소 설명"
          rows={2}
          className="w-full px-3 py-2 rounded-lg outline-none text-xs sm:text-sm resize-none"
          style={{
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-faint)",
            color: "var(--text-muted)",
            lineHeight: 1.5,
          }}
        />
      </div>
    </div>
  );
}
