# 🧭 TripVibe — AI 여행 플래너

AI가 단 몇 초 만에 맞춤형 여행 일정을 생성해주는 풀스택 웹앱입니다. 목적지·기간·여행 스타일을 선택하면 Groq Llama 3.3 70B가 일정·동선·예상 비용을 자동으로 짜드립니다.

## 주요 기능

- ✨ **AI 일정 자동 생성** — Groq Llama 3.3 70B 기반, 평균 3초
- 💰 **예상 비용 + 이동 동선** — 장소별 비용·교통수단·소요시간 표시
- 🗺️ **Google Maps 연동** — 장소명 클릭 시 지도 검색
- 👤 **회원 시스템** — Supabase Auth (이메일 인증)
- 📚 **여행 기록 저장/관리** — 본인 일정 보기·삭제 (RLS 적용)
- 💾 **저장 / 공유** — 텍스트 다운로드, Web Share API, 클립보드 복사
- 🌗 **다크/라이트 테마** — 시스템 설정 자동 반영 + 토글
- 📱 **PWA** — 모바일 홈 화면 추가, 오프라인 일부 지원

## 기술 스택

- **Framework**: Next.js 16 (App Router, Turbopack)
- **UI**: React 19 + Tailwind CSS v4 + lucide-react
- **AI**: Groq SDK (`llama-3.3-70b-versatile`)
- **DB / Auth**: Supabase (PostgreSQL + RLS)
- **언어**: TypeScript

## 실행 방법

```bash
git clone https://github.com/dinf7605/tripvibe.git
cd tripvibe
npm install
cp .env.local.example .env.local   # 또는 직접 작성
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인하세요.

## 환경 변수

`.env.local` 파일에 아래 세 개 키를 채워야 합니다:

```env
GROQ_API_KEY=gsk_...                              # https://console.groq.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co  # Supabase 프로젝트 URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...  # Supabase anon/publishable key
```

## Supabase 설정

```sql
-- 테이블 생성
CREATE TABLE itineraries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  destination TEXT NOT NULL,
  duration TEXT NOT NULL,
  styles TEXT[] DEFAULT '{}',
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS 정책 (본인 일정만 접근 가능)
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own select" ON itineraries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own insert" ON itineraries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own delete" ON itineraries FOR DELETE USING (auth.uid() = user_id);
```

## 빌드 / 배포

```bash
npm run build
npm start
```

Vercel 배포 시 위 세 가지 환경변수를 대시보드에 등록하세요.

## 라이선스

MIT
