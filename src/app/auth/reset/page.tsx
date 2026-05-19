"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Status = "checking" | "ready" | "no-session" | "saving" | "done";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Supabase emits PASSWORD_RECOVERY event when arriving from a reset email.
  // The hash tokens are auto-processed by supabase-js → session becomes available.
  useEffect(() => {
    let cancelled = false;
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null;

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setStatus("ready");
      }
    });

    // Fallback: check immediately in case event already fired before mount
    supabase.auth.getSession()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.session) {
          setStatus("ready");
        } else {
          // Give Supabase a moment to process the hash, then re-check
          fallbackTimer = setTimeout(() => {
            if (cancelled) return;
            supabase.auth.getSession()
              .then(({ data: d2 }) => {
                if (cancelled) return;
                setStatus(d2?.session ? "ready" : "no-session");
              })
              .catch(() => {
                if (!cancelled) setStatus("no-session");
              });
          }, 800);
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("no-session");
      });

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      subscription?.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }

    setStatus("saving");
    try {
      const { error: updErr } = await supabase.auth.updateUser({ password });
      if (updErr) {
        setError(updErr.message ?? "비밀번호 변경에 실패했습니다.");
        setStatus("ready");
        return;
      }
      setStatus("done");
      // After a short success display, send user to home (logged in)
      setTimeout(() => router.push("/"), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류가 발생했습니다.");
      setStatus("ready");
    }
  };

  return (
    <main className="relative min-h-screen flex flex-col items-center justify-center px-4">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 90% 70% at 60% 20%, var(--bg-grad-top) 0%, var(--bg-grad-bot) 55%)"
        }} />
        <div className="absolute rounded-full opacity-20" style={{
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
          <p className="text-sm text-center" style={{ color: "var(--text-muted)" }}>
            새 비밀번호를 설정해주세요
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-6" style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-faint)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}>
          {status === "checking" && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-7 h-7 rounded-full border-2 animate-spin"
                style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
              <span className="text-sm" style={{ color: "var(--text-muted)" }}>인증 정보 확인 중...</span>
            </div>
          )}

          {status === "no-session" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <AlertCircle size={28} style={{ color: "#ff6b6b" }} />
              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  유효하지 않은 링크예요
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                  비밀번호 재설정 링크가 만료되었거나 잘못되었습니다.
                  <br />
                  로그인 페이지에서 다시 요청해주세요.
                </p>
              </div>
              <button
                onClick={() => router.push("/auth")}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: "linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt))",
                  color: "var(--text-onAccent)",
                }}>
                로그인 페이지로
              </button>
            </div>
          )}

          {status === "done" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <CheckCircle size={28} style={{ color: "#22c55e" }} />
              <div>
                <p className="font-semibold mb-1" style={{ color: "var(--text-primary)" }}>
                  비밀번호가 변경되었어요
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>잠시 후 메인 페이지로 이동합니다...</p>
              </div>
            </div>
          )}

          {(status === "ready" || status === "saving") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* New password */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                  새 비밀번호
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "var(--text-dim)" }} />
                  <input
                    type={showPw ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    required placeholder="6자 이상 입력" minLength={6}
                    className="input-field w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm"
                    style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-faint)", color: "var(--text-primary)" }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 opacity-50">
                    {showPw ? <EyeOff size={14} style={{ color: "var(--text-muted)" }} /> : <Eye size={14} style={{ color: "var(--text-muted)" }} />}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: "var(--text-dim)" }} />
                  <input
                    type={showPw ? "text" : "password"} value={passwordConfirm}
                    onChange={e => setPasswordConfirm(e.target.value)}
                    required placeholder="비밀번호 한 번 더 입력" minLength={6}
                    className="input-field w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm"
                    style={{
                      backgroundColor: "var(--bg-input)",
                      borderColor:
                        passwordConfirm.length > 0 && password !== passwordConfirm
                          ? "rgba(255,107,107,0.5)"
                          : passwordConfirm.length > 0 && password === passwordConfirm
                          ? "rgba(34,197,94,0.5)"
                          : "var(--border-faint)",
                      color: "var(--text-primary)",
                    }}
                  />
                </div>
                {passwordConfirm.length > 0 && password !== passwordConfirm && (
                  <p className="text-[11px] mt-1.5 ml-1" style={{ color: "#ff6b6b" }}>
                    비밀번호가 일치하지 않습니다.
                  </p>
                )}
              </div>

              {error && (
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                  style={{ backgroundColor: "rgba(255,107,107,0.1)", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.2)" }}>
                  <AlertCircle size={13} className="shrink-0" />{error}
                </div>
              )}

              <button type="submit" disabled={status === "saving"}
                className="w-full py-3 rounded-xl font-semibold text-sm transition-all mt-2"
                style={{
                  background: "linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-lt) 50%, var(--accent-coral) 100%)",
                  color: "var(--text-onAccent)",
                  opacity: status === "saving" ? 0.7 : 1,
                  cursor: status === "saving" ? "not-allowed" : "pointer",
                }}>
                {status === "saving" ? "변경 중..." : "비밀번호 변경"}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
