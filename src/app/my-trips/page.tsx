"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, ArrowLeft, History, AlertCircle, Plus, LogIn, CheckCircle, X } from "lucide-react";
import TripCard from "@/components/TripCard";
import ThemeToggle from "@/components/ThemeToggle";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import type { ItineraryRow } from "@/lib/supabase";

type TripSummary = Omit<ItineraryRow, "content">;

export default function MyTripsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => setToast(null), type === "error" ? 3500 : 2500);
  };

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }

    let active = true;
    supabase
      .from("itineraries")
      .select("id, destination, duration, styles, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError("일정 목록을 불러오지 못했습니다.");
        else setTrips((data as TripSummary[]) ?? []);
        setLoading(false);
      });

    return () => { active = false; };
  }, [user, authLoading]);

  const handleTripClick = async (id: string) => {
    const { data, error } = await supabase
      .from("itineraries")
      .select("content")
      .eq("id", id)
      .single();

    if (error || !data) {
      console.error("[my-trips] load error:", error?.message);
      showToast("일정을 불러오지 못했습니다. 다시 시도해주세요.", "error");
      return;
    }

    try {
      sessionStorage.setItem("tripvibe_itinerary", JSON.stringify(data.content));
    } catch (storageErr) {
      console.error("[my-trips] sessionStorage error:", storageErr);
      showToast("브라우저 저장 공간이 부족합니다.", "error");
      return;
    }
    router.push("/result");
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from("itineraries").delete().eq("id", id);
    if (error) {
      setDeletingId(null);
      showToast("삭제에 실패했습니다. 다시 시도해주세요.", "error");
      return;
    }
    setTrips(prev => prev.filter(t => t.id !== id));
    setDeletingId(null);
    showToast("일정이 삭제되었습니다.");
  };

  return (
    <main className="relative min-h-screen flex flex-col">
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
          홈으로
        </button>

        <div className="flex items-center gap-2.5">
          <Compass size={26} style={{ color: "var(--accent-gold)" }} />
          <span className="font-bold text-xl sm:text-2xl tracking-tight" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "var(--text-primary)",
          }}>TripVibe</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm border transition-all"
            style={{ color: "var(--accent-gold)", borderColor: "var(--border-subtle)", backgroundColor: "rgba(240,180,41,0.08)" }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(240,180,41,0.14)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(240,180,41,0.08)")}
          >
            <Plus size={15} />새 일정
          </button>
        </div>
      </nav>

      {/* ── Content ── */}
      <section className="relative z-10 flex-1 px-4 sm:px-6 pb-24 pt-4 max-w-2xl mx-auto w-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: "rgba(240,180,41,0.1)", color: "var(--accent-gold)" }}>
            <History size={18} />
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>내 여행 기록</h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {user ? user.email : "로그인하여 여행 기록을 확인하세요"}
            </p>
          </div>
        </div>

        {/* Not logged in */}
        {!authLoading && !user ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "rgba(240,180,41,0.08)", color: "var(--accent-gold)" }}>
              <LogIn size={28} />
            </div>
            <div>
              <p className="font-semibold text-lg mb-1" style={{ color: "var(--text-primary)" }}>로그인이 필요해요</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>내 여행 기록을 보려면 로그인하세요.</p>
            </div>
            <button onClick={() => router.push("/auth")}
              className="px-6 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))", color: "var(--text-onAccent)" }}>
              로그인 / 회원가입
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border p-5" style={{ borderColor: "var(--border-faint)", backgroundColor: "var(--bg-card)" }}>
                <div className="flex gap-3 mb-3">
                  <div className="skeleton h-5 w-24 rounded" />
                  <div className="skeleton h-5 w-16 rounded-full" />
                </div>
                <div className="flex gap-2 mb-3">
                  <div className="skeleton h-5 w-14 rounded-full" />
                  <div className="skeleton h-5 w-14 rounded-full" />
                </div>
                <div className="skeleton h-3 w-28 rounded" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 px-5 py-4 rounded-xl border"
            style={{ backgroundColor: "rgba(255,107,107,0.08)", borderColor: "rgba(255,107,107,0.25)", color: "#ff6b6b" }}>
            <AlertCircle size={16} />
            <p className="text-sm">{error}</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="text-4xl">🗺️</div>
            <p className="font-medium" style={{ color: "var(--text-primary)" }}>아직 저장된 일정이 없어요</p>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>메인 페이지에서 첫 번째 여행 일정을 생성해보세요!</p>
            <button onClick={() => router.push("/")}
              className="mt-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{ background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))", color: "var(--text-onAccent)" }}>
              일정 생성하러 가기
            </button>
          </div>
        ) : (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs mb-4" style={{ color: "var(--text-dim)" }}>총 {trips.length}개의 여행 일정</p>
            {trips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                onClick={() => handleTripClick(trip.id)}
                onDelete={() => handleDelete(trip.id)}
                deleting={deletingId === trip.id}
              />
            ))}
          </div>
        )}
      </section>

      <footer className="relative z-10 text-center pb-8 text-xs" style={{ color: "var(--text-dim)" }}>
        © 2025 TripVibe · AI가 만드는 완벽한 여행 경험
      </footer>
    </main>
  );
}
