"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Compass, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Mode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const friendlyAuthError = (rawMsg: string): string => {
    const m = rawMsg.toLowerCase();
    if (m.includes("email not confirmed") || m.includes("email_not_confirmed")) {
      return "이메일 인증이 완료되지 않았습니다. 받은편지함의 인증 링크를 먼저 클릭해주세요.";
    }
    if (m.includes("invalid login credentials") || m.includes("invalid_credentials")) {
      return "이메일 또는 비밀번호가 올바르지 않습니다.";
    }
    if (m.includes("user already registered")) {
      return "이미 가입된 이메일입니다.";
    }
    if (m.includes("password should be at least")) {
      return "비밀번호는 6자 이상이어야 합니다.";
    }
    if (m.includes("rate limit") || m.includes("too many requests")) {
      return "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.";
    }
    if (m.includes("network") || m.includes("fetch")) {
      return "네트워크 오류입니다. 인터넷 연결을 확인해주세요.";
    }
    return `오류: ${rawMsg}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setError(friendlyAuthError(error.message));
        } else if (data.session) {
          // Email confirmation is disabled; user is already logged in
          router.push("/");
        } else {
          setSuccess("인증 메일을 발송했습니다. 받은편지함을 확인하고 링크를 클릭한 후 로그인하세요.");
          setMode("login");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setError(friendlyAuthError(error.message));
        } else {
          router.push("/");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? friendlyAuthError(err.message) : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
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
        <div className="absolute rounded-full opacity-15" style={{
          width: 400, height: 400, bottom: "0%", left: "-5%",
          background: "radial-gradient(circle, rgba(78,205,196,0.35) 0%, transparent 70%)",
          filter: "blur(70px)",
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
            {mode === "login" ? "계정에 로그인하여 여행 기록을 관리하세요" : "가입하고 나만의 여행 일정을 저장하세요"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border p-6" style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border-faint)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}>
          {/* Tab */}
          <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ backgroundColor: "var(--bg-mid)" }}>
            {(["login", "signup"] as Mode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(null); setSuccess(null); }}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  backgroundColor: mode === m ? "var(--bg-card)" : "transparent",
                  color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                  boxShadow: mode === m ? "0 2px 8px rgba(0,0,0,0.3)" : "none",
                }}>
                {m === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                이메일
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--text-dim)" }} />
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  required placeholder="hello@example.com"
                  className="input-field w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-faint)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-muted)" }}>
                비밀번호
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  style={{ color: "var(--text-dim)" }} />
                <input
                  type={showPw ? "text" : "password"} value={password}
                  onChange={e => setPassword(e.target.value)}
                  required placeholder={mode === "signup" ? "6자 이상 입력" : "비밀번호 입력"}
                  minLength={6}
                  className="input-field w-full pl-9 pr-10 py-2.5 rounded-xl border text-sm"
                  style={{ backgroundColor: "var(--bg-input)", borderColor: "var(--border-faint)", color: "var(--text-primary)" }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-opacity hover:opacity-100 opacity-50">
                  {showPw ? <EyeOff size={14} style={{ color: "var(--text-muted)" }} /> : <Eye size={14} style={{ color: "var(--text-muted)" }} />}
                </button>
              </div>
            </div>

            {/* Error / Success */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                style={{ backgroundColor: "rgba(255,107,107,0.1)", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.2)" }}>
                <AlertCircle size={13} className="shrink-0" />{error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs"
                style={{ backgroundColor: "rgba(34,197,94,0.1)", color: "#22c55e", border: "1px solid rgba(34,197,94,0.2)" }}>
                <CheckCircle size={13} className="shrink-0" />{success}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all mt-2"
              style={{
                background: "linear-gradient(135deg, var(--accent-gold) 0%, var(--accent-gold-lt) 50%, var(--accent-coral) 100%)",
                color: "var(--text-onAccent)",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}>
              {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
            </button>
          </form>
        </div>

        <button onClick={() => router.push("/")}
          className="mt-6 w-full text-center text-xs transition-colors"
          style={{ color: "var(--text-dim)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--text-muted)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}>
          ← 홈으로 돌아가기
        </button>
      </div>
    </main>
  );
}
