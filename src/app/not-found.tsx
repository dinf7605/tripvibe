"use client";

import Link from "next/link";
import { Compass, Home, MapPin } from "lucide-react";

export default function NotFound() {
  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 90% 70% at 60% 20%, var(--bg-grad-top) 0%, var(--bg-grad-bot) 55%)"
        }} />
        <div className="absolute rounded-full opacity-15" style={{
          width: 500, height: 500, top: "-10%", right: "-8%",
          background: "radial-gradient(circle, rgba(240,180,41,0.4) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
        <div className="absolute rounded-full opacity-10" style={{
          width: 400, height: 400, bottom: "5%", left: "-5%",
          background: "radial-gradient(circle, rgba(78,205,196,0.35) 0%, transparent 70%)",
          filter: "blur(70px)",
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md animate-fade-in">
        {/* Spinning compass */}
        <div className="relative w-20 h-20 mb-6">
          <Compass
            size={80}
            style={{ color: "var(--accent-gold)" }}
            className="nf-compass"
          />
        </div>

        {/* Big 404 */}
        <h1 className="font-bold leading-none mb-2" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(4rem, 14vw, 7rem)",
          background: "linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-coral) 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          letterSpacing: "-0.04em",
        }}>
          404
        </h1>

        <p className="text-base font-semibold mb-1.5" style={{ color: "var(--text-primary)" }}>
          길을 잃으셨나요?
        </p>
        <p className="text-sm leading-relaxed mb-8 max-w-xs" style={{ color: "var(--text-muted)" }}>
          이 페이지는 아직 지도에 없는 모양이에요.
          <br />
          홈으로 돌아가서 새로운 여행을 떠나볼까요?
        </p>

        <div className="flex gap-2">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))",
              color: "var(--text-onAccent)",
              boxShadow: "0 8px 20px rgba(240,180,41,0.25)",
            }}>
            <Home size={15} />
            홈으로
          </Link>
          <Link
            href="/my-trips"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm border transition-all"
            style={{
              color: "var(--text-muted)",
              borderColor: "var(--border-faint)",
              backgroundColor: "var(--bg-card)",
            }}>
            <MapPin size={15} />
            내 여행
          </Link>
        </div>
      </div>

      <style jsx>{`
        :global(.nf-compass) {
          animation: nf-spin 8s linear infinite;
        }
        @keyframes nf-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          :global(.nf-compass) { animation: none; }
        }
      `}</style>
    </main>
  );
}
