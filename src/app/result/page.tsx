"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, ArrowLeft, Download, Share2, AlertCircle, CheckCircle, X } from "lucide-react";
import Timeline from "@/components/Timeline";
import SkeletonTimeline from "@/components/SkeletonTimeline";
import ThemeToggle from "@/components/ThemeToggle";
import WeatherWidget from "@/components/WeatherWidget";
import type { MockItinerary } from "@/data/mockItinerary";

function isValidItinerary(x: unknown): x is MockItinerary {
  if (typeof x !== "object" || x === null) return false;
  const it = x as Partial<MockItinerary>;
  if (typeof it.destination !== "string" || it.destination.length === 0) return false;
  if (typeof it.duration !== "string" || it.duration.length === 0) return false;
  if (!Array.isArray(it.days) || it.days.length === 0) return false;
  let hasAnyItem = false;
  for (const day of it.days) {
    if (typeof day !== "object" || day === null) return false;
    if (!Array.isArray(day.items)) return false;
    if (day.items.length > 0) hasAnyItem = true;
  }
  return hasAnyItem;
}

function itineraryToText(it: MockItinerary): string {
  const lines: string[] = [];
  lines.push(`✈️ ${it.destination} · ${it.duration}`);
  lines.push("AI 맞춤 여행 일정 (TripVibe)");
  if (it.totalEstimate) lines.push(`💰 예상 경비: ${it.totalEstimate} / 1인`);
  lines.push("");
  for (const day of it.days) {
    lines.push(`━━ ${day.dayLabel} · ${day.date} ━━`);
    for (const item of day.items) {
      if (item.transport) {
        const t = item.transport;
        const cost = t.cost ? ` · ${t.cost}` : "";
        lines.push(`   ↓ ${t.mode} ${t.duration}${cost}`);
      }
      const cost = item.cost ? `  💰${item.cost}` : "";
      lines.push(`${item.time}  ${item.place}  (${item.duration})${cost}`);
      lines.push(`  ${item.description}`);
      lines.push("");
    }
  }
  lines.push("— TripVibe로 생성한 여행 일정");
  return lines.join("\n");
}

export default function ResultPage() {
  const router = useRouter();
  const [itinerary, setItinerary] = useState<MockItinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), type === "error" ? 3500 : 2500);
  };

  useEffect(() => {
    const raw = sessionStorage.getItem("tripvibe_itinerary");
    if (!raw) {
      setError("일정 데이터가 없습니다. 메인 페이지로 돌아가 다시 생성해 주세요.");
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!isValidItinerary(parsed)) {
        setError("일정 데이터의 형식이 올바르지 않습니다. 다시 생성해주세요.");
        return;
      }
      setItinerary(parsed);
    } catch {
      setError("일정 데이터를 불러오는데 실패했습니다.");
      return;
    }

    // Pick up save-error message from /api/generate flow
    const saveErr = sessionStorage.getItem("tripvibe_save_error");
    if (saveErr) {
      sessionStorage.removeItem("tripvibe_save_error");
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setToast({ message: saveErr, type: "error" });
      toastTimerRef.current = setTimeout(() => setToast(null), 4000);
    }
  }, []);

  // Cleanup any pending toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const handleDownload = () => {
    if (!itinerary) return;
    const text = itineraryToText(itinerary);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `TripVibe_${itinerary.destination}_${itinerary.duration}.txt`.replace(/\s+/g, "_");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("일정을 텍스트 파일로 저장했어요.");
  };

  const legacyCopy = (text: string): boolean => {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.setAttribute("readonly", "");
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  };

  const handleShare = async () => {
    if (!itinerary) return;
    const text = itineraryToText(itinerary);
    const title = `${itinerary.destination} ${itinerary.duration} 여행 일정`;

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title, text });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        showToast("일정이 클립보드에 복사되었어요. 원하는 곳에 붙여넣으세요.");
        return;
      } catch {
        // fall through to legacy
      }
    }

    if (legacyCopy(text)) {
      showToast("일정이 클립보드에 복사되었어요. 원하는 곳에 붙여넣으세요.");
    } else {
      showToast("이 브라우저에서는 공유를 지원하지 않습니다. '저장' 버튼을 이용해주세요.", "error");
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col">
      {/* ── Background ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 90% 70% at 60% 20%, var(--bg-grad-top) 0%, var(--bg-grad-bot) 55%)"
        }} />
        <div className="absolute rounded-full opacity-15" style={{
          width: 500, height: 500, top: "-10%", right: "-8%",
          background: "radial-gradient(circle, rgba(240,180,41,0.3) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div className="absolute rounded-full opacity-10" style={{
          width: 400, height: 400, bottom: "10%", left: "-5%",
          background: "radial-gradient(circle, rgba(78,205,196,0.3) 0%, transparent 70%)",
          filter: "blur(70px)",
        }} />
      </div>

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 sm:bottom-8 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 flex items-center gap-3 px-4 sm:px-5 py-3.5 rounded-xl border shadow-xl animate-fade-in"
          style={{
            backgroundColor: "var(--bg-card)",
            borderColor: toast.type === "success" ? "rgba(34,197,94,0.35)" : "rgba(255,107,107,0.35)",
            color: toast.type === "success" ? "#22c55e" : "var(--accent-coral)",
            maxWidth: 420,
          }}>
          {toast.type === "success" ? <CheckCircle size={16} className="shrink-0" /> : <AlertCircle size={16} className="shrink-0" />}
          <span className="text-sm flex-1">{toast.message}</span>
          <button onClick={() => setToast(null)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 sm:py-7">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-base transition-all hover:-translate-x-1"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={18} />
          돌아가기
        </button>

        <div className="hidden sm:flex items-center gap-2.5">
          <Compass size={26} style={{ color: "var(--accent-gold)" }} />
          <span className="font-bold text-xl sm:text-2xl tracking-tight" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "var(--text-primary)",
          }}>TripVibe</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleShare}
            disabled={!itinerary}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: "var(--text-muted)", borderColor: "var(--border-faint)", backgroundColor: "var(--bg-card)" }}
            onMouseEnter={e => { if (itinerary) e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
            <Share2 size={15} />공유
          </button>
          <button
            onClick={handleDownload}
            disabled={!itinerary}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ color: "var(--accent-gold)", borderColor: "var(--border-subtle)", backgroundColor: "rgba(240,180,41,0.08)" }}
            onMouseEnter={e => { if (itinerary) e.currentTarget.style.backgroundColor = "rgba(240,180,41,0.14)"; }}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(240,180,41,0.08)")}>
            <Download size={15} />저장
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <section className="relative z-10 flex-1 px-6 pb-24 pt-4">
        {error ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <div className="flex items-center gap-3 px-6 py-4 rounded-xl border"
              style={{ backgroundColor: "rgba(255,107,107,0.08)", borderColor: "rgba(255,107,107,0.25)", color: "#ff6b6b" }}>
              <AlertCircle size={18} />
              <p className="text-sm">{error}</p>
            </div>
            <button onClick={() => router.push("/")}
              className="px-6 py-3 rounded-xl text-sm font-medium"
              style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)", border: "1px solid var(--border-faint)" }}>
              메인으로 돌아가기
            </button>
          </div>
        ) : !itinerary ? (
          <SkeletonTimeline />
        ) : (
          <div className="animate-fade-in w-full max-w-2xl mx-auto">
            <div className="mb-5">
              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                🌤 {itinerary.destination} 현재 날씨
              </p>
              <WeatherWidget destination={itinerary.destination} />
            </div>
            <Timeline itinerary={itinerary} />
          </div>
        )}
      </section>

      <footer className="relative z-10 text-center pb-8 text-xs" style={{ color: "var(--text-dim)" }}>
        © 2025 TripVibe · AI가 만드는 완벽한 여행 경험
      </footer>
    </main>
  );
}
