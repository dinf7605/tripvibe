import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    "Supabase 환경변수가 설정되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 추가해주세요."
  );
}

export const supabase = createClient(url, key);

export type ItineraryRow = {
  id: string;
  user_id: string | null;
  destination: string;
  duration: string;
  styles: string[];
  content: object;
  is_public: boolean;
  created_at: string;
};
