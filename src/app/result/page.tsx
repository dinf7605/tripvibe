"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, ArrowLeft, Download, Share2, AlertCircle, CheckCircle, X, Pencil, Save, XCircle, Globe, Lock, Copy, Check } from "lucide-react";
import Timeline from "@/components/Timeline";
import SkeletonTimeline from "@/components/SkeletonTimeline";
import ThemeToggle from "@/components/ThemeToggle";
import WeatherWidget from "@/components/WeatherWidget";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
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
  const { user } = useAuth();
  const [itinerary, setItinerary] = useState<MockItinerary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editDraft, setEditDraft] = useState<MockItinerary | null>(null);
  const [itineraryId, setItineraryId] = useState<string | null>(null);
  const [itineraryStyles, setItineraryStyles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const regenAbortRef = useRef<AbortController | null>(null);
  const [isPublic, setIsPublic] = useState<boolean>(false);
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [showShareBox, setShowShareBox] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const copyResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    // Pick up the DB id if present (set by home page or my-trips)
    const id = sessionStorage.getItem("tripvibe_itinerary_id");
    if (id) setItineraryId(id);

    // Hydrate is_public flag from DB on mount when we know the id
    if (id) {
      (async () => {
        try {
          const { data: row, error: rowErr } = await supabase
            .from("itineraries")
            .select("is_public")
            .eq("id", id)
            .maybeSingle();
          if (rowErr) {
            console.warn("[result] is_public fetch error:", rowErr.message);
            return;
          }
          if (row && typeof row.is_public === "boolean") setIsPublic(row.is_public);
        } catch (err) {
          // Promise-level rejection (network down, etc.) — don't crash
          console.warn("[result] is_public fetch threw:", err);
        }
      })();
    }

    // Pick up the styles context (used for "regenerate this place")
    try {
      const rawStyles = sessionStorage.getItem("tripvibe_itinerary_styles");
      if (rawStyles) {
        const arr = JSON.parse(rawStyles);
        if (Array.isArray(arr)) {
          setItineraryStyles(arr.filter((s): s is string => typeof s === "string"));
        }
      }
    } catch {
      // ignore — styles are best-effort context
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

  // Cleanup any pending toast timer + in-flight regenerate fetch on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (regenAbortRef.current) regenAbortRef.current.abort();
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
    };
  }, []);

  const shareUrl =
    typeof window !== "undefined" && itineraryId
      ? `${window.location.origin}/share/${itineraryId}`
      : "";

  const togglePublic = async () => {
    if (!user || !itineraryId || togglingPublic) return;
    setTogglingPublic(true);
    const next = !isPublic;
    try {
      const { data, error: dbError } = await supabase
        .from("itineraries")
        .update({ is_public: next })
        .eq("id", itineraryId)
        .select("is_public");
      if (dbError) {
        console.error("[public-toggle] DB error:", dbError.message);
        showToast("공개 설정 변경에 실패했어요.", "error");
        return;
      }
      if (!data || data.length === 0) {
        showToast("일정을 찾지 못했어요. 다시 시도해주세요.", "error");
        return;
      }
      setIsPublic(next);
      if (next) {
        setShowShareBox(true);
        showToast("공개 링크가 활성화됐어요. 링크를 복사해 공유하세요.");
      } else {
        setShowShareBox(false);
        showToast("공개 링크가 비활성화됐어요.");
      }
    } catch (err) {
      console.error("[public-toggle] threw:", err);
      showToast("네트워크 오류로 변경에 실패했어요.", "error");
    } finally {
      setTogglingPublic(false);
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    const success = await (async () => {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(shareUrl);
          return true;
        } catch { /* fall through */ }
      }
      return legacyCopy(shareUrl);
    })();

    if (success) {
      setLinkCopied(true);
      if (copyResetRef.current) clearTimeout(copyResetRef.current);
      copyResetRef.current = setTimeout(() => setLinkCopied(false), 2000);
    } else {
      showToast("클립보드 복사에 실패했어요. 링크를 길게 눌러 복사해주세요.", "error");
    }
  };

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

  const handleRegenerateItem = async (dayIdx: number, itemIdx: number) => {
    if (!itinerary || regeneratingKey) return;
    const day = itinerary.days[dayIdx];
    const target = day?.items?.[itemIdx];
    if (!target) {
      showToast("재생성할 장소를 찾지 못했습니다.", "error");
      return;
    }

    // Read styles + duration from the saved itinerary row if available; otherwise default
    // We don't store styles on MockItinerary itself, so the API treats absent styles fine.
    const existingPlaces: string[] = [];
    for (const d of itinerary.days) {
      for (const it of d.items) {
        if (typeof it.place === "string" && it.place.trim()) existingPlaces.push(it.place);
      }
    }

    const key = `${dayIdx}-${itemIdx}`;
    setRegeneratingKey(key);

    // Abort any previous in-flight request, install a fresh controller
    if (regenAbortRef.current) regenAbortRef.current.abort();
    const controller = new AbortController();
    regenAbortRef.current = controller;

    try {
      const res = await fetch("/api/regenerate-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          destination: itinerary.destination,
          duration: itinerary.duration,
          styles: itineraryStyles,
          currentItem: target,
          existingPlaces,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "장소 재생성에 실패했습니다.");
      }

      const fresh = (await res.json()) as {
        time?: string;
        place: string;
        description?: string;
        category: string;
        duration?: string;
        cost?: string;
        coords?: { lat: number; lng: number };
      };

      // Merge: replace at [dayIdx][itemIdx], preserve original transport (predecessor unchanged)
      const nextItinerary: MockItinerary = {
        ...itinerary,
        days: itinerary.days.map((d, di) => {
          if (di !== dayIdx) return d;
          return {
            ...d,
            items: d.items.map((it, ii) => {
              if (ii !== itemIdx) return it;
              const freshDesc = (fresh.description ?? "").trim();
              return {
                ...it,
                time: fresh.time ?? it.time,
                place: fresh.place,
                // Fall back to original description if AI returned empty,
                // so the card never looks blank
                description: freshDesc.length > 0 ? freshDesc : it.description,
                category: fresh.category as typeof it.category,
                duration: fresh.duration ?? it.duration,
                cost: fresh.cost ?? it.cost,
                coords: fresh.coords ?? undefined,
              };
            }),
          };
        }),
      };

      // Persist locally and to DB
      try {
        sessionStorage.setItem("tripvibe_itinerary", JSON.stringify(nextItinerary));
      } catch {
        // Non-blocking — UI still updates
      }

      if (user && itineraryId) {
        try {
          const { data, error: dbError } = await supabase
            .from("itineraries")
            .update({ content: nextItinerary })
            .eq("id", itineraryId)
            .select("id");
          if (dbError) {
            console.error("[regenerate] DB update error:", dbError.message);
            showToast("새 장소를 적용했지만 DB 저장에 실패했어요.", "error");
          } else if (!data || data.length === 0) {
            showToast("새 장소를 적용했지만 저장된 일정을 찾지 못했어요.", "error");
          } else {
            showToast("새 장소로 교체했어요.");
          }
        } catch (err) {
          console.error("[regenerate] DB update threw:", err);
          showToast("새 장소를 적용했지만 저장 중 네트워크 오류가 발생했어요.", "error");
        }
      } else {
        showToast("새 장소로 교체했어요.");
      }

      setItinerary(nextItinerary);
    } catch (err) {
      // Quiet AbortError — user navigated away or triggered another regen
      if (err instanceof Error && err.name === "AbortError") {
        console.warn("[regenerate] aborted");
      } else {
        console.error("[regenerate] failed:", err);
        const msg = err instanceof Error ? err.message : "알 수 없는 오류";
        showToast(msg, "error");
      }
    } finally {
      // Only clear if the controller we set is still the active one
      if (regenAbortRef.current === controller) {
        regenAbortRef.current = null;
      }
      setRegeneratingKey(null);
    }
  };

  const startEdit = () => {
    if (!itinerary) return;
    // Deep clone to allow cancel without mutating the source
    setEditDraft(JSON.parse(JSON.stringify(itinerary)));
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditDraft(null);
    setEditMode(false);
  };

  const saveEdit = async () => {
    if (!editDraft) return;

    // 1. Auto-clean: drop items where both place and description are empty
    const cleaned: MockItinerary = {
      ...editDraft,
      days: editDraft.days.map(d => ({
        ...d,
        items: (Array.isArray(d.items) ? d.items : []).filter(it => {
          const placeOk = typeof it.place === "string" && it.place.trim().length > 0;
          const descOk = typeof it.description === "string" && it.description.trim().length > 0;
          return placeOk || descOk;
        }),
      })),
    };

    // 2. Final shape validation (catches all-empty days etc.)
    if (!isValidItinerary(cleaned)) {
      showToast("저장할 일정에 유효한 장소가 없습니다. 최소 하나의 장소를 입력해주세요.", "error");
      return;
    }

    setSaving(true);
    try {
      // 3. Update local + sessionStorage first so user sees the change immediately
      try {
        sessionStorage.setItem("tripvibe_itinerary", JSON.stringify(cleaned));
      } catch {
        showToast("브라우저 저장 공간이 부족합니다.", "error");
        return;
      }

      // 4. Persist to DB when applicable
      if (user && itineraryId) {
        try {
          const { data, error: dbError } = await supabase
            .from("itineraries")
            .update({ content: cleaned })
            .eq("id", itineraryId)
            .select("id");

          if (dbError) {
            console.error("[edit] DB update error:", dbError.message);
            showToast("DB 저장에 실패했어요. 변경사항은 이 페이지에만 반영됩니다.", "error");
          } else if (!data || data.length === 0) {
            // 0 rows matched — either deleted elsewhere, or RLS blocked
            console.warn("[edit] DB update affected 0 rows");
            showToast("저장된 일정을 찾을 수 없어요. 다른 곳에서 삭제되었을 수 있습니다.", "error");
          } else {
            showToast("일정이 저장되었습니다.");
          }
        } catch (err) {
          console.error("[edit] DB update threw:", err);
          showToast("네트워크 오류로 DB 저장에 실패했어요.", "error");
        }
      } else if (user && !itineraryId) {
        showToast("이 일정은 DB에 저장되어 있지 않아 이 페이지에서만 변경됩니다.", "error");
      } else {
        showToast("일정이 변경되었습니다. (로그인 시 영구 저장됩니다)");
      }

      setItinerary(cleaned);
      setEditMode(false);
      setEditDraft(null);
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!itinerary) return;
    const text = itineraryToText(itinerary);

    // Behavior simplified: always copy to clipboard, never open the OS share sheet.
    // Falls back to a hidden textarea + execCommand for older browsers / non-secure
    // contexts where navigator.clipboard isn't available.
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        showToast("일정이 클립보드에 복사되었어요!");
        return;
      } catch {
        // fall through to legacy
      }
    }

    if (legacyCopy(text)) {
      showToast("일정이 클립보드에 복사되었어요!");
    } else {
      showToast("클립보드 복사에 실패했어요. '저장' 버튼으로 파일을 받아주세요.", "error");
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
          {editMode ? (
            <>
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: "var(--text-muted)", borderColor: "var(--border-faint)", backgroundColor: "var(--bg-card)" }}>
                <XCircle size={15} />취소
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))",
                  color: "var(--text-onAccent)",
                  border: "none",
                }}>
                {saving
                  ? <div className="w-4 h-4 rounded-full border-2 animate-spin" style={{ borderColor: "currentColor", borderTopColor: "transparent" }} />
                  : <Save size={15} />}
                저장
              </button>
            </>
          ) : (
            <>
              {user && itineraryId && (
                <button
                  onClick={togglePublic}
                  disabled={togglingPublic || !!regeneratingKey}
                  title={isPublic ? "공개 링크 끄기" : "이 일정을 공개 링크로 공유"}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    color: isPublic ? "#4ecdc4" : "var(--text-muted)",
                    borderColor: isPublic ? "rgba(78,205,196,0.35)" : "var(--border-faint)",
                    backgroundColor: isPublic ? "rgba(78,205,196,0.08)" : "var(--bg-card)",
                  }}>
                  {togglingPublic
                    ? <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "currentColor", borderTopColor: "transparent" }} />
                    : isPublic ? <Globe size={15} /> : <Lock size={15} />}
                  {isPublic ? "공개 중" : "공개"}
                </button>
              )}
              <button
                onClick={startEdit}
                disabled={!itinerary || !!regeneratingKey}
                title={regeneratingKey ? "장소 재추천이 끝난 후 편집할 수 있어요" : ""}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ color: "var(--text-muted)", borderColor: "var(--border-faint)", backgroundColor: "var(--bg-card)" }}
                onMouseEnter={e => { if (itinerary && !regeneratingKey) e.currentTarget.style.color = "var(--text-primary)"; }}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                <Pencil size={15} />편집
              </button>
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
            </>
          )}
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
            {/* Public share link box */}
            {!editMode && isPublic && itineraryId && showShareBox && (
              <div className="mb-5 p-4 rounded-xl border animate-fade-in"
                style={{
                  backgroundColor: "rgba(78,205,196,0.06)",
                  borderColor: "rgba(78,205,196,0.3)",
                }}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <Globe size={14} style={{ color: "#4ecdc4" }} />
                    <span className="text-xs font-semibold" style={{ color: "#4ecdc4" }}>
                      공개 링크가 활성화됐어요
                    </span>
                  </div>
                  <button onClick={() => setShowShareBox(false)}
                    className="opacity-50 hover:opacity-100 transition-opacity">
                    <X size={13} style={{ color: "var(--text-muted)" }} />
                  </button>
                </div>
                <p className="text-[11px] mb-3" style={{ color: "var(--text-muted)" }}>
                  로그인하지 않은 사람도 이 링크로 일정을 볼 수 있어요. &lsquo;공개 중&rsquo;을 한 번 더 누르면 다시 비공개로 바뀝니다.
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    onClick={e => (e.currentTarget as HTMLInputElement).select()}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-mono outline-none truncate"
                    style={{
                      backgroundColor: "var(--bg-input)",
                      border: "1px solid var(--border-faint)",
                      color: "var(--text-primary)",
                    }}
                  />
                  <button onClick={copyShareUrl}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: linkCopied
                        ? "rgba(34,197,94,0.15)"
                        : "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))",
                      color: linkCopied ? "#22c55e" : "var(--text-onAccent)",
                      border: linkCopied ? "1px solid rgba(34,197,94,0.35)" : "none",
                      minWidth: 78,
                    }}>
                    {linkCopied ? <><Check size={12} />복사됨</> : <><Copy size={12} />복사</>}
                  </button>
                </div>
              </div>
            )}

            {/* Hint to re-open share box when public is on but box was closed */}
            {!editMode && isPublic && itineraryId && !showShareBox && (
              <button onClick={() => setShowShareBox(true)}
                className="mb-5 w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs transition-all"
                style={{
                  backgroundColor: "rgba(78,205,196,0.05)",
                  border: "1px solid rgba(78,205,196,0.2)",
                  color: "#4ecdc4",
                }}>
                <Globe size={12} />
                공개 링크 보기
              </button>
            )}

            {!editMode && (
              <div className="mb-5">
                <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                  🌤 {itinerary.destination} 현재 날씨
                </p>
                <WeatherWidget destination={itinerary.destination} />
              </div>
            )}
            {editMode && editDraft ? (
              <>
                <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs"
                  style={{ backgroundColor: "rgba(240,180,41,0.08)", border: "1px solid rgba(240,180,41,0.25)", color: "var(--accent-gold)" }}>
                  <Pencil size={12} />
                  <span>편집 모드 · 카드를 드래그해 순서를 바꾸고, 필드를 직접 수정하세요. 순서 변경 시 이동 정보는 초기화돼요.</span>
                </div>
                <Timeline
                  key="edit"
                  itinerary={editDraft}
                  editMode
                  onItineraryChange={setEditDraft}
                />
              </>
            ) : (
              <Timeline
                key="view"
                itinerary={itinerary}
                onRegenerateItem={handleRegenerateItem}
                regeneratingKey={regeneratingKey}
              />
            )}
          </div>
        )}
      </section>

      <footer className="relative z-10 text-center pb-8 text-xs" style={{ color: "var(--text-dim)" }}>
        © 2025 TripVibe · AI가 만드는 완벽한 여행 경험
      </footer>
    </main>
  );
}
