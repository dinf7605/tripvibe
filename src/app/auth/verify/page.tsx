"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Compass, Mail, RefreshCw, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "idle" | "sending" | "sent" | "error";

function VerifyInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const email = sp.get("email") ?? "";
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cooldown ticker — prevents the user from hammering the resend button
  useEffect(() => {
    if (cooldown <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    if (!intervalRef.current) {
      intervalRef.current = setInterval(() => {
        setCooldown(c => Math.max(0, c - 1));
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [cooldown]);

  const resend = async () => {
    if (!email) {
      setError("이메일 정보가 없어 재발송할 수 없습니다. 회원가입을 다시 진행해주세요.");
      setStatus("error");
      return;
    }
    if (cooldown > 0 || status === "sending") return;

    setStatus("sending");
    setError(null);
    try {
      const { error: rsErr } = await supabase.auth.resend({ type: "signup", email });
      if (rsErr) {
        const m = rsErr.message.toLowerCase();
        if (m.includes("rate") || m.includes("too many")) {
          setError("요청이 너무 많습니다. 잠시 후 다시 시도해주세요.");
        } else if (m.includes("already") && m.includes("confirmed")) {
          setError("이미 인증된 계정입니다. 로그인 페이지에서 로그인해주세요.");
        } else {
          setError(rsErr.message);
        }
        setStatus("error");
        return;
      }
      setStatus("sent");
      setCooldown(60); // 60s before allowing another resend
    } catch (err) {
      console.error("[verify] resend threw:", err);
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setStatus("error");
    }
  };

  const buttonDisabled = cooldown > 0 || status === "sending" || !email;

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4">
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
      </div>

      <div className="relative z-10 w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-3">
            <Compass size={22} style={{ color: "var(--accent-gold)" }} />
            <span className="font-bold text-xl tracking-tight" style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              color: "var(--text-primary)",
            }}>TripVibe</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-7 text-center" style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-faint)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}>
          {/* Mail icon */}
          <div className="mx-auto mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: "rgba(240,180,41,0.1)",
              color: "var(--accent-gold)",
              border: "1px solid rgba(240,180,41,0.25)",
            }}>
            <Mail size={24} />
          </div>

          <h1 className="font-bold text-lg mb-2" style={{ color: "var(--text-primary)" }}>
            인증 메일을 발송했어요
          </h1>
          {email ? (
            <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{email}</span>
            </p>
          ) : null}
          <p className="text-xs leading-relaxed mb-5" style={{ color: "var(--text-muted)" }}>
            받은편지함에서 메일을 열어 인증 링크를 클릭해주세요.
            <br />
            메일이 안 보이면 <strong style={{ color: "var(--text-primary)" }}>스팸함</strong>도 확인해보세요.
          </p>

          {/* Sent confirmation */}
          {status === "sent" && (
            <div className="mb-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs"
              style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
              <CheckCircle size={13} />
              인증 메일을 다시 보냈어요.
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mb-4 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs"
              style={{ backgroundColor: "rgba(255,107,107,0.1)", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.2)" }}>
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          {/* Resend button */}
          <button
            onClick={resend}
            disabled={buttonDisabled}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))",
              color: "var(--text-onAccent)",
            }}
          >
            <span className="inline-flex items-center justify-center gap-1.5">
              {status === "sending" ? (
                <div className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: "currentColor", borderTopColor: "transparent" }} />
              ) : (
                <RefreshCw size={14} />
              )}
              {cooldown > 0 ? `${cooldown}초 후 다시 시도` : status === "sending" ? "보내는 중..." : "인증 메일 재발송"}
            </span>
          </button>

          {!email && (
            <p className="mt-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
              이메일 정보가 없습니다. 회원가입을 다시 시도해주세요.
            </p>
          )}
        </div>

        {/* Back to login */}
        <button
          onClick={() => router.push("/auth")}
          className="mt-5 w-full flex items-center justify-center gap-1.5 text-xs transition-colors"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
        >
          <ArrowLeft size={12} />
          로그인 페이지로
        </button>

        <div className="mt-3 flex items-center justify-center gap-3 text-[11px]" style={{ color: "var(--text-dim)" }}>
          <Link href="/privacy" className="hover:underline">개인정보 처리방침</Link>
          <span style={{ opacity: 0.4 }}>·</span>
          <Link href="/terms" className="hover:underline">이용약관</Link>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 animate-spin" style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
      </main>
    }>
      <VerifyInner />
    </Suspense>
  );
}
