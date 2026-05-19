import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "이용약관",
  description: "TripVibe 서비스 이용약관입니다.",
};

const UPDATED_AT = "2026-05-19";

export default function TermsPage() {
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
          }}>이용약관</h1>
          <p className="text-xs" style={{ color: "var(--text-dim)" }}>
            최종 업데이트: {UPDATED_AT}
          </p>
        </header>

        <div className="space-y-7 text-sm leading-relaxed" style={{ color: "var(--text-muted)" }}>
          <p>
            본 약관은 이용자가 TripVibe(이하 &ldquo;서비스&rdquo;)를 이용함에 있어 서비스와 이용자
            간의 권리·의무 및 책임사항을 규정합니다.
          </p>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              제1조 (목적)
            </h2>
            <p>
              본 약관은 서비스 운영자가 제공하는 AI 기반 여행 일정 생성 서비스의 이용 조건과 절차,
              회원과 서비스 간의 권리·의무를 정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              제2조 (서비스의 내용)
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>AI를 활용한 맞춤형 여행 일정 자동 생성</li>
              <li>생성된 일정의 저장·편집·공유 기능</li>
              <li>지도·날씨·환율·동선 최적화 부가 정보 제공</li>
              <li>그 외 서비스가 추가하는 기능</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              제3조 (회원가입 및 계정)
            </h2>
            <p>
              회원가입은 이메일 주소를 이용해 무료로 진행됩니다. 회원은 본인의 계정을 타인에게
              양도하거나 공유할 수 없으며, 계정 관리 책임은 회원 본인에게 있습니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              제4조 (AI 생성 콘텐츠의 한계)
            </h2>
            <p>
              서비스는 AI 모델(Groq Llama)을 활용해 일정을 생성합니다. 생성된 콘텐츠의 정확성·완전성·
              최신성을 보장하지 않으며, 다음 사항은 이용자 책임입니다:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li>실제 영업시간·휴무·예약 가능 여부 확인</li>
              <li>현지 안전 정보 및 입국 규정 확인</li>
              <li>표시된 예상 비용·소요시간은 참고 목적이며 실제와 다를 수 있음</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              제5조 (금지 행위)
            </h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>타인의 계정을 도용하거나 무단으로 접근하는 행위</li>
              <li>서비스의 정상 운영을 방해하는 행위(과도한 자동 호출, 해킹 시도 등)</li>
              <li>법령에 위반되는 내용을 입력하거나 생성하는 행위</li>
              <li>서비스를 상업적으로 무단 이용하는 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              제6조 (서비스 변경 및 중단)
            </h2>
            <p>
              서비스는 기술적 사유, 운영상 필요에 따라 일부 또는 전부를 변경·중단할 수 있으며, 이로
              인해 발생한 손해에 대해 책임지지 않습니다. 단, 사전 고지가 가능한 경우 공지합니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              제7조 (책임의 한계)
            </h2>
            <p>
              서비스는 무료로 제공되며, 이용자가 본 서비스를 이용해 발생한 직간접적 손해(예약 실수,
              여행 중 문제 등)에 대해 책임을 지지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="font-semibold text-base mb-2" style={{ color: "var(--text-primary)" }}>
              제8조 (약관 변경)
            </h2>
            <p>
              본 약관은 필요에 따라 변경될 수 있으며, 변경 시 서비스 내 고지를 통해 이용자에게
              알립니다. 변경된 약관에 동의하지 않는 경우 이용자는 회원 탈퇴를 통해 서비스 이용을
              종료할 수 있습니다.
            </p>
          </section>
        </div>

        <footer className="mt-12 pt-6 border-t flex items-center justify-between text-xs"
          style={{ borderColor: "var(--border-faint)", color: "var(--text-dim)" }}>
          <Link href="/privacy" className="transition-colors hover:underline">개인정보 처리방침</Link>
          <span>© 2026 TripVibe</span>
        </footer>
      </article>
    </main>
  );
}
