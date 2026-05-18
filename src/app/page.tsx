"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { MapPin, Clock, Sparkles, Search, ChevronRight, Globe, Star, Compass, AlertCircle, X } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";

// ── Types ──────────────────────────────────────────────
type TravelStyle = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  activeColor: string;
};

// ── Data ───────────────────────────────────────────────
const TRAVEL_STYLES: TravelStyle[] = [
  { id: "healing",    label: "#힐링",     emoji: "🌿", color: "rgba(78,205,196,0.12)",  activeColor: "#4ecdc4" },
  { id: "food",       label: "#맛집",     emoji: "🍜", color: "rgba(255,107,107,0.12)", activeColor: "#ff6b6b" },
  { id: "activity",   label: "#액티비티", emoji: "🏄", color: "rgba(240,180,41,0.12)",  activeColor: "#f0b429" },
  { id: "insta",      label: "#인스타감성",emoji: "📸", color: "rgba(168,85,247,0.12)",  activeColor: "#a855f7" },
  { id: "culture",    label: "#문화탐방", emoji: "🏛️", color: "rgba(59,130,246,0.12)",  activeColor: "#3b82f6" },
  { id: "nature",     label: "#자연경관", emoji: "🌄", color: "rgba(34,197,94,0.12)",   activeColor: "#22c55e" },
  { id: "shopping",   label: "#쇼핑",     emoji: "🛍️", color: "rgba(244,114,182,0.12)", activeColor: "#f472b6" },
  { id: "nightlife",  label: "#나이트라이프",emoji: "🌙", color: "rgba(99,102,241,0.12)", activeColor: "#6366f1" },
];

const DURATIONS = [
  "1박 2일", "2박 3일", "3박 4일", "4박 5일", "5박 6일", "6박 7일",
];

const POPULAR_DESTINATIONS = ["도쿄", "오사카", "파리", "방콕", "발리", "뉴욕", "런던", "바르셀로나"];

function seeded(n: number) {
  const x = Math.sin(n + 1) * 10000;
  return x - Math.floor(x);
}
const STARS = Array.from({ length: 40 }, (_, i) => ({
  width:   seeded(i * 5)     * 2 + 1,
  height:  seeded(i * 5 + 1) * 2 + 1,
  top:     seeded(i * 5 + 2) * 60,
  left:    seeded(i * 5 + 3) * 100,
  opacity: seeded(i * 5 + 4) * 0.4 + 0.1,
}));

// ── Component ──────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [destination, setDestination] = useState("");
  const [duration, setDuration] = useState("");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!errorMsg) return;
    const t = setTimeout(() => setErrorMsg(null), 5000);
    return () => clearTimeout(t);
  }, [errorMsg]);

  const filteredSuggestions = destination.length > 0
    ? POPULAR_DESTINATIONS.filter(d => d.includes(destination))
    : POPULAR_DESTINATIONS;

  const toggleStyle = (id: string) => {
    setSelectedStyles(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const canGenerate = destination.trim().length > 0 && duration.length > 0 && selectedStyles.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate || isLoading) return;
    setIsLoading(true);
    setErrorMsg(null);
    setLoadingMsg(`${destination} · ${duration} 최적 코스 분석 중...`);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destination, duration, styles: selectedStyles }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "일정 생성에 실패했습니다.");
      }

      const itinerary = await res.json();

      try {
        sessionStorage.setItem("tripvibe_itinerary", JSON.stringify(itinerary));
      } catch (storageErr) {
        console.error("[generate] sessionStorage error:", storageErr);
        throw new Error("일정 데이터를 임시 저장하지 못했습니다. 브라우저 저장 공간을 확인해주세요.");
      }

      if (user) {
        const { error: dbError } = await supabase.from("itineraries").insert({
          destination,
          duration,
          styles: selectedStyles,
          content: itinerary,
          user_id: user.id,
        });
        if (dbError) {
          console.error("[save itinerary] DB error:", dbError.message);
          try {
            sessionStorage.setItem(
              "tripvibe_save_error",
              "일정은 만들었지만 '내 여행'에 저장하지 못했어요. (네트워크 또는 권한 문제)"
            );
          } catch { /* ignore */ }
        }
      }

      router.push("/result");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setIsLoading(false);
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col">

      {/* ── Loading overlay ── */}
      {isLoading && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 px-6"
          style={{ backgroundColor: "var(--overlay-veil)", backdropFilter: "blur(12px)" }}>
          <div className="relative w-14 h-14 sm:w-16 sm:h-16">
            <div className="absolute inset-0 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
            <div className="absolute inset-2 rounded-full border animate-spin"
              style={{ borderColor: "rgba(240,180,41,0.3)", borderTopColor: "transparent", animationDuration: "1.5s", animationDirection: "reverse" }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles size={16} style={{ color: "var(--accent-gold)" }} />
            </div>
          </div>
          <div className="text-center">
            <p className="font-semibold mb-1 text-sm sm:text-base" style={{ color: "var(--text-primary)" }}>AI가 일정을 생성하고 있어요</p>
            <p className="text-xs sm:text-sm" style={{ color: "var(--text-muted)" }}>{loadingMsg}</p>
          </div>
        </div>
      )}

      {/* ── Error toast ── */}
      {errorMsg && (
        <div className="fixed bottom-6 sm:bottom-8 left-4 right-4 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-50 flex items-center gap-3 px-4 sm:px-5 py-3.5 rounded-xl border shadow-xl"
          style={{ backgroundColor: "var(--bg-card)", borderColor: "rgba(255,107,107,0.35)", color: "var(--accent-coral)", maxWidth: 420 }}>
          <AlertCircle size={16} className="shrink-0" />
          <span className="text-sm flex-1">{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity ml-1">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Atmospheric background ── */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        {/* Deep gradient base */}
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 90% 70% at 60% 20%, var(--bg-grad-top) 0%, var(--bg-grad-bot) 55%)"
        }} />
        {/* Drifting orbs */}
        <div className="orb absolute rounded-full opacity-20" style={{
          width: 600, height: 600,
          top: "-10%", right: "-8%",
          background: "radial-gradient(circle, rgba(240,180,41,0.4) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div className="orb-slow absolute rounded-full opacity-15" style={{
          width: 500, height: 500,
          bottom: "-5%", left: "-5%",
          background: "radial-gradient(circle, rgba(78,205,196,0.35) 0%, transparent 70%)",
          filter: "blur(70px)",
        }} />
        <div className="orb absolute rounded-full opacity-10" style={{
          width: 300, height: 300,
          top: "40%", left: "30%",
          background: "radial-gradient(circle, rgba(168,85,247,0.5) 0%, transparent 70%)",
          filter: "blur(50px)",
          animationDelay: "-8s",
        }} />
        {/* Star field */}
        {STARS.map((s, i) => (
          <div key={i} className="absolute rounded-full bg-white" suppressHydrationWarning
            style={{ width: s.width, height: s.height, top: `${s.top}%`, left: `${s.left}%`, opacity: s.opacity }}
          />
        ))}
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 sm:py-7 animate-float-up delay-1">
        <div className="flex items-center gap-2.5">
          <Compass size={26} style={{ color: "var(--accent-gold)" }} />
          <span className="font-bold text-xl sm:text-2xl tracking-tight" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "var(--text-primary)"
          }}>
            TripVibe
          </span>
        </div>
        <div className="flex items-center gap-3 sm:gap-5">
          <Link href="/my-trips" className="hidden sm:block text-base transition-colors" style={{ color: "var(--text-muted)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
            내 여행
          </Link>
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-sm max-w-[140px] truncate" style={{ color: "var(--text-muted)" }}>
                {user.email}
              </span>
              <button onClick={async () => {
                  const { error } = await signOut();
                  if (error) setErrorMsg(`로그아웃 실패: ${error}`);
                }}
                className="text-sm px-3.5 py-2 rounded-full border transition-all"
                style={{ color: "var(--text-muted)", borderColor: "var(--border-faint)", backgroundColor: "transparent" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}>
                로그아웃
              </button>
            </div>
          ) : (
            <Link href="/auth"
              className="text-sm sm:text-base px-4 sm:px-5 py-2 sm:py-2.5 rounded-full border transition-all"
              style={{ color: "var(--accent-gold)", borderColor: "var(--border-subtle)", backgroundColor: "rgba(240,180,41,0.06)" }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(240,180,41,0.12)")}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(240,180,41,0.06)")}>
              로그인
            </Link>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pt-8 sm:pt-12 pb-20 sm:pb-24">

        {/* Badge */}
        <div className="animate-float-up delay-2 flex items-center gap-2 mb-8 px-4 py-2 rounded-full text-xs font-medium border" style={{
          backgroundColor: "rgba(240,180,41,0.08)",
          borderColor: "var(--border-subtle)",
          color: "var(--accent-gold)",
        }}>
          <Sparkles size={12} />
          <span>AI 기반 맞춤 여행 플래너</span>
          <Star size={10} fill="currentColor" />
        </div>

        {/* Headline */}
        <h1 className="animate-float-up delay-3 text-center leading-tight mb-4" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(2.6rem, 6vw, 5rem)",
          fontWeight: 900,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
        }}>
          당신의 완벽한
          <br />
          <em style={{
            fontStyle: "italic",
            background: "linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-lt) 50%, var(--accent-coral) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}>
            여행의 시작
          </em>
        </h1>

        {/* Sub */}
        <p className="animate-float-up delay-4 text-center max-w-md mb-12 leading-relaxed" style={{
          color: "var(--text-muted)",
          fontSize: "1.05rem",
          fontWeight: 300,
        }}>
          목적지와 여행 스타일을 알려주세요.
          <br />
          AI가 단 몇 초 만에 완벽한 일정을 만들어드립니다.
        </p>

        {/* ── Planner Card ── */}
        <div className="animate-float-up delay-5 w-full max-w-2xl rounded-2xl border p-4 sm:p-8" style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-faint)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04) inset",
        }}>

          {/* Row 1: Destination + Duration */}
          <div className="flex gap-3 mb-6">
            {/* Destination input */}
            <div className="relative flex-1">
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                <MapPin size={11} className="inline mr-1" />
                어디로 떠나시나요?
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--text-dim)" }} />
                <input
                  type="text"
                  value={destination}
                  onChange={e => { setDestination(e.target.value); setShowSuggestions(true); }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="예: 도쿄, 파리, 발리..."
                  className="input-field w-full pl-10 pr-4 py-3 rounded-xl border text-sm transition-all"
                  style={{
                    backgroundColor: "var(--bg-input)",
                    borderColor: "var(--border-faint)",
                    color: "var(--text-primary)",
                  }}
                />
                {/* Suggestions dropdown */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-2 rounded-xl border overflow-hidden" style={{
                    backgroundColor: "var(--bg-mid)",
                    borderColor: "var(--border-faint)",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.5)",
                    zIndex: 50,
                  }}>
                    {filteredSuggestions.slice(0, 6).map((dest) => (
                      <button key={dest}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors"
                        style={{ color: "var(--text-muted)" }}
                        onMouseEnter={e => {
                          e.currentTarget.style.backgroundColor = "rgba(240,180,41,0.07)";
                          e.currentTarget.style.color = "var(--text-primary)";
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "var(--text-muted)";
                        }}
                        onMouseDown={() => { setDestination(dest); setShowSuggestions(false); }}>
                        <Globe size={12} style={{ color: "var(--accent-gold)", flexShrink: 0 }} />
                        {dest}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Duration select */}
            <div className="w-44">
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                <Clock size={11} className="inline mr-1" />
                여행 기간
              </label>
              <select
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="input-field w-full px-4 py-3 rounded-xl border text-sm transition-all cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-input)",
                  borderColor: "var(--border-faint)",
                  color: duration ? "var(--text-primary)" : "var(--text-dim)",
                }}>
                <option value="" disabled>기간 선택</option>
                {DURATIONS.map(d => (
                  <option key={d} value={d} style={{ backgroundColor: "var(--bg-card)", color: "var(--text-primary)" }}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Travel style tags */}
          <div className="mb-8">
            <label className="block text-xs font-medium mb-3" style={{ color: "var(--text-muted)" }}>
              <Sparkles size={11} className="inline mr-1" />
              여행 스타일 선택 (복수 선택 가능)
            </label>
            <div className="flex flex-wrap gap-2">
              {TRAVEL_STYLES.map(style => {
                const isActive = selectedStyles.includes(style.id);
                return (
                  <button
                    key={style.id}
                    onClick={() => toggleStyle(style.id)}
                    className={`tag-btn flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all ${isActive ? "active" : ""}`}
                    style={{
                      backgroundColor: isActive ? `${style.activeColor}22` : style.color,
                      borderColor: isActive ? style.activeColor : "var(--border-faint)",
                      color: isActive ? style.activeColor : "var(--text-muted)",
                      transform: isActive ? "translateY(-1px)" : "none",
                      boxShadow: isActive ? `0 4px 16px ${style.activeColor}30` : "none",
                    }}>
                    <span>{style.emoji}</span>
                    <span>{style.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 3: Generate button */}
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className={`btn-generate w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-base transition-all ${!canGenerate ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
            style={{
              background: canGenerate
                ? "linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-lt) 50%, var(--accent-coral) 100%)"
                : "var(--bg-input)",
              color: canGenerate ? "var(--text-onAccent)" : "var(--text-dim)",
              border: canGenerate ? "none" : "1px solid var(--border-faint)",
              animation: canGenerate ? undefined : "none",
              boxShadow: canGenerate ? undefined : "none",
            }}>
            <Sparkles size={18} />
            <span>일정 생성하기</span>
            <ChevronRight size={18} />
          </button>

          {/* Helper hint */}
          {!canGenerate && (
            <p className="text-center text-xs mt-3" style={{ color: "var(--text-dim)" }}>
              목적지, 기간, 여행 스타일을 모두 선택하면 활성화됩니다
            </p>
          )}
        </div>

        {/* ── Social proof ── */}
        <div className="animate-float-up delay-6 flex items-center gap-8 mt-10" style={{ color: "var(--text-dim)" }}>
          <div className="flex items-center gap-2 text-sm">
            <div className="flex -space-x-2">
              {["🧑‍💼","👩‍🦰","🧑‍🎨","👨‍💻"].map((emoji, i) => (
                <div key={i} className="w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs" style={{
                  borderColor: "var(--bg-card)",
                  backgroundColor: "var(--bg-mid)",
                }}>
                  {emoji}
                </div>
              ))}
            </div>
            <span style={{ color: "var(--text-muted)" }}>
              <strong style={{ color: "var(--accent-gold)" }}>12,400+</strong> 명이 이용 중
            </span>
          </div>
          <div className="w-px h-4" style={{ backgroundColor: "var(--border-faint)" }} />
          <div className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-muted)" }}>
            <Star size={13} fill="var(--accent-gold)" style={{ color: "var(--accent-gold)" }} />
            <strong style={{ color: "var(--accent-gold)" }}>4.9</strong>
            <span>평균 만족도</span>
          </div>
          <div className="w-px h-4" style={{ backgroundColor: "var(--border-faint)" }} />
          <div className="text-sm" style={{ color: "var(--text-muted)" }}>
            ⚡ 평균 <strong style={{ color: "var(--text-primary)" }}>3초</strong> 내 일정 완성
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 text-center pb-8 text-xs" style={{ color: "var(--text-dim)" }}>
        © 2025 TripVibe · AI가 만드는 완벽한 여행 경험
      </footer>
    </main>
  );
}
