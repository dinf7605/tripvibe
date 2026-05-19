import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "TripVibe가 수집·이용하는 개인정보의 항목과 처리 방침을 안내합니다.",
};

const UPDATED_AT = "2026-05-19";

export default function PrivacyPage() {
  return (
    <main className="relative min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 90% 70% at 60% 20%, var(--bg-grad-top) 0%, var(--bg-grad-bot) 55%)"
        }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-4 sm:px-8 py-5 sm:py-7">
        <Link href="/" className="flex items-center gap-2 text-base transition-all hover:-translate-x-1"
          style={{ color: "var(--text-muted)" }}>
          <ArrowLeft size={18} />
          돌아가기
        </Link>
        <div className="flex items-center gap-2.5">
          <Compass size={22} style={{ color: "var(--accent-gold)" }} />
          <span className="font-bold text-lg tracking-tight" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "var(--text-primary)",
          }}>TripVibe</span>
        </div>
        <div style={{ width: 80 }} />
      </nav>

      <article className="relative z-10 flex-1 mx-auto w-full max-w-2xl px-5 pb-24 pt-2">
        <header className="mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            color: "var(--text-primary)",
          }}>개인정보 처리방침</h1>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            최종 업데이트: {UPDATED_AT}
          </p>
        </header>

        <div className="space-y-7 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <p>
            TripVibe(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 소중히 다루며, 관련 법령에 따라
            아래와 같이 개인정보를 수집·이용합니다.
          </p>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              1. 수집하는 개인정보 항목
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회원가입: 이메일 주소, 비밀번호(암호화 저장)</li>
              <li>서비스 이용 기록: 생성한 여행 일정 데이터, 접속 일시, 브라우저 정보</li>
              <li>자동 수집: 쿠키 및 로컬 스토리지(테마 설정, 세션 토큰)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              2. 이용 목적
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>회원 식별 및 로그인 유지</li>
              <li>여행 일정 저장·관리 기능 제공</li>
              <li>서비스 개선을 위한 통계 분석(개인 식별 불가 형태)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              3. 보관 기간
            </h2>
            <p>
              회원 탈퇴 시 모든 개인정보와 생성한 여행 일정 데이터는 지체 없이 파기됩니다. 단, 관련
              법령에 따라 일정 기간 보존이 필요한 경우 해당 기간 동안 분리 보관합니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              4. 제3자 제공
            </h2>
            <p>
              서비스는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 처리
              위탁이 이루어집니다:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>Supabase (인증·데이터베이스 호스팅)</li>
              <li>Groq (AI 일정 생성을 위한 LLM 호출 — 개인정보 미전송, 입력 텍스트만 전달)</li>
              <li>Vercel (애플리케이션 호스팅)</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              5. 이용자의 권리
            </h2>
            <p>
              이용자는 언제든지 자신의 개인정보를 열람·수정·삭제·처리정지 요청할 수 있으며, 회원
              탈퇴를 통해 모든 데이터의 삭제를 요구할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              6. 쿠키 및 로컬 스토리지
            </h2>
            <p>
              서비스는 로그인 상태 유지와 테마(다크/라이트) 저장을 위해 브라우저의 로컬 스토리지를
              사용합니다. 브라우저 설정에서 언제든 삭제할 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              7. 문의
            </h2>
            <p>
              개인정보 관련 문의는 서비스 운영자에게 연락해주세요. 본 방침은 사전 고지 후 변경될 수
              있습니다.
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-6 border-t flex items-center justify-between text-xs"
          style={{ borderColor: "var(--border-faint)", color: "var(--text-dim)" }}>
          <Link href="/terms" className="transition-colors hover:underline">이용약관</Link>
          <span>© 2026 TripVibe</span>
        </footer>
      </article>
    </main>
  );
}
