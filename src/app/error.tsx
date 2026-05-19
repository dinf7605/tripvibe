"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: Props) {
  useEffect(() => {
    console.error("[error boundary]", error);
    // Best-effort Sentry capture — silently no-ops if SDK is absent or DSN unset
    (async () => {
      try {
        const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
        if (!dsn) return;
        const Sentry = await import("@sentry/nextjs");
        Sentry.captureException(error);
      } catch {
        // Sentry import failed — already logged to console above
      }
    })();
  }, [error]);

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-6">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 90% 70% at 60% 20%, var(--bg-grad-top) 0%, var(--bg-grad-bot) 55%)"
        }} />
        <div className="absolute rounded-full opacity-15" style={{
          width: 500, height: 500, top: "-10%", right: "-8%",
          background: "radial-gradient(circle, rgba(255,107,107,0.35) 0%, transparent 70%)",
          filter: "blur(60px)",
        }} />
      </div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-md animate-fade-in">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
          style={{
            backgroundColor: "rgba(255,107,107,0.1)",
            color: "#ff6b6b",
            border: "1px solid rgba(255,107,107,0.25)",
          }}>
          <AlertTriangle size={28} />
        </div>

        <h1 className="font-bold mb-2" style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
          color: "var(--text-primary)",
          letterSpacing: "-0.02em",
        }}>
          앗, 예상치 못한 오류가 발생했어요
        </h1>

        <p className="text-sm leading-relaxed mb-6 max-w-xs" style={{ color: "var(--text-muted)" }}>
          여행을 준비하다 잠시 길을 잃었습니다.
          <br />
          다시 시도하시거나 홈으로 돌아가주세요.
        </p>

        {/* Error detail (dev only) */}
        {process.env.NODE_ENV === "development" && error?.message && (
          <div className="mb-6 px-4 py-3 rounded-lg text-xs text-left max-w-sm w-full overflow-auto"
            style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-faint)",
              color: "var(--text-dim)",
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              maxHeight: 120,
            }}>
            {error.message}
            {error.digest && (
              <div className="mt-1 opacity-60">digest: {error.digest}</div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={reset}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))",
              color: "var(--text-onAccent)",
              boxShadow: "0 8px 20px rgba(240,180,41,0.25)",
            }}>
            <RefreshCw size={15} />
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm border transition-all"
            style={{
              color: "var(--text-muted)",
              borderColor: "var(--border-faint)",
              backgroundColor: "var(--bg-card)",
            }}>
            <Home size={15} />
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
