import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Compass, ArrowLeft, Sparkles, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import ShareTimeline from "./ShareTimeline";
import type { MockItinerary } from "@/data/mockItinerary";

type Params = { params: Promise<{ id: string }> };

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

// ── Per-page SEO ──
export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  if (!id || typeof id !== "string") return { title: "공유된 일정" };

  const { data } = await supabase
    .from("itineraries")
    .select("destination, duration")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (!data) {
    return {
      title: "공유된 일정을 찾을 수 없어요",
      description: "이 일정은 비공개이거나 삭제되었을 수 있습니다.",
      robots: { index: false, follow: false },
    };
  }

  const title = `${data.destination} ${data.duration} 여행 일정`;
  const description = `AI가 만든 ${data.destination} ${data.duration} 일정. 지도·비용·동선·날씨까지 한 번에.`;

  return {
    title,
    description,
    openGraph: { title, description, type: "article" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SharedItineraryPage({ params }: Params) {
  const { id } = await params;
  if (!id || typeof id !== "string") notFound();

  // Anon key + RLS policy on is_public=true → safe public read
  const { data, error } = await supabase
    .from("itineraries")
    .select("id, destination, duration, content, created_at, is_public")
    .eq("id", id)
    .eq("is_public", true)
    .maybeSingle();

  if (error) {
    console.error("[share] DB error:", error.message);
  }

  if (!data) notFound();
  if (!isValidItinerary(data.content)) {
    return (
      <main className="relative min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertCircle size={32} className="mx-auto mb-3" style={{ color: "#ff6b6b" }} />
          <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
            일정 데이터가 손상되었어요
          </p>
          <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
            이 공유 링크는 더 이상 열어볼 수 없습니다.
          </p>
          <Link href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))",
              color: "var(--text-onAccent)",
            }}>
            <Sparkles size={15} />
            나도 일정 만들어보기
          </Link>
        </div>
      </main>
    );
  }

  const itinerary = data.content as MockItinerary;
  const createdLabel = new Date(data.created_at).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 90% 70% at 60% 20%, var(--bg-grad-top) 0%, var(--bg-grad-bot) 55%)"
        }} />
        <div className="absolute rounded-full opacity-15" style={{
          width: 500, height: 500, top: "-10%", right: "-8%",
          background: "radial-gradient(circle, rgba(240,180,41,0.3) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 sm:py-7">
        <Link href="/" className="flex items-center gap-2 text-base transition-all hover:-translate-x-1"
          style={{ color: "var(--text-muted)" }}>
          <ArrowLeft size={18} />
          홈으로
        </Link>

        <div className="hidden sm:flex items-center gap-2.5">
          <Compass size={26} style={{ color: "var(--accent-gold)" }} />
          <span className="font-bold text-xl sm:text-2xl tracking-tight" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "var(--text-primary)",
          }}>TripVibe</span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))",
              color: "var(--text-onAccent)",
            }}>
            <Sparkles size={15} />나도 만들기
          </Link>
        </div>
      </nav>

      {/* Content */}
      <section className="relative z-10 flex-1 px-6 pb-24 pt-2">
        <div className="w-full max-w-2xl mx-auto">
          <div className="mb-5 px-4 py-3 rounded-xl border text-xs flex items-center gap-2"
            style={{
              backgroundColor: "rgba(78,205,196,0.08)",
              borderColor: "rgba(78,205,196,0.25)",
              color: "#4ecdc4",
            }}>
            🔗 공유된 일정 · {createdLabel} 생성
          </div>
          <ShareTimeline itinerary={itinerary} />
        </div>
      </section>

      <footer className="relative z-10 text-center pb-8 text-xs flex flex-col items-center gap-2"
        style={{ color: "var(--text-dim)" }}>
        <div>© 2026 TripVibe · AI가 만드는 완벽한 여행 경험</div>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="hover:underline">개인정보 처리방침</Link>
          <span style={{ opacity: 0.4 }}>·</span>
          <Link href="/terms" className="hover:underline">이용약관</Link>
        </div>
      </footer>
    </main>
  );
}
