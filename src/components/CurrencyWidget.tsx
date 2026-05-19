"use client";

import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";

const CURRENCY_MAP: Array<{ keys: string[]; code: string; symbol: string; name: string }> = [
  { keys: ["도쿄","오사카","교토","삿포로","후쿠오카","나라","일본","tokyo","osaka","japan"], code: "JPY", symbol: "¥", name: "일본 엔" },
  { keys: ["파리","로마","바르셀로나","암스테르담","베를린","프라하","비엔나","밀라노","madrid","madrid","스페인","프랑스","이탈리아","독일"], code: "EUR", symbol: "€", name: "유로" },
  { keys: ["방콕","치앙마이","푸켓","태국","bangkok","thailand"], code: "THB", symbol: "฿", name: "태국 바트" },
  { keys: ["발리","자카르타","인도네시아","bali","indonesia"], code: "IDR", symbol: "Rp", name: "인도네시아 루피아" },
  { keys: ["뉴욕","로스앤젤레스","샌프란시스코","시카고","미국","뉴욕","las vegas","new york","usa"], code: "USD", symbol: "$", name: "미국 달러" },
  { keys: ["런던","영국","london","uk"], code: "GBP", symbol: "£", name: "영국 파운드" },
  { keys: ["홍콩","hong kong"], code: "HKD", symbol: "HK$", name: "홍콩 달러" },
  { keys: ["싱가포르","singapore"], code: "SGD", symbol: "S$", name: "싱가포르 달러" },
  { keys: ["호주","시드니","멜버른","australia","sydney","melbourne"], code: "AUD", symbol: "A$", name: "호주 달러" },
];

function detectCurrency(destination: string): { code: string; symbol: string; name: string } {
  const d = destination.toLowerCase();
  for (const entry of CURRENCY_MAP) {
    if (entry.keys.some(k => d.includes(k))) {
      return { code: entry.code, symbol: entry.symbol, name: entry.name };
    }
  }
  return { code: "USD", symbol: "$", name: "미국 달러" };
}

type ExchangeData = {
  rate: number;
  from: string;
  fromSymbol: string;
  fromName: string;
  updatedAt: string;
};

type Props = { destination: string; totalEstimate?: string };

export default function CurrencyWidget({ destination, totalEstimate }: Props) {
  const [exchange, setExchange] = useState<ExchangeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState("1");

  const currency = detectCurrency(destination);
  const isKrw = currency.code === "KRW";

  useEffect(() => {
    if (isKrw) { setLoading(false); return; }

    let cancelled = false;
    async function fetchRate() {
      try {
        const res = await fetch(
          `https://api.frankfurter.app/latest?from=${currency.code}&to=KRW`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        const rate = data?.rates?.KRW;
        if (typeof rate !== "number" || !isFinite(rate) || rate <= 0) {
          throw new Error("invalid rate");
        }
        setExchange({
          rate: Math.round(rate),
          from: currency.code,
          fromSymbol: currency.symbol,
          fromName: currency.name,
          updatedAt: typeof data?.date === "string" ? data.date : "",
        });
      } catch (err) {
        console.error("[currency] fetch failed:", err);
        if (!cancelled) setExchange(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchRate();
    return () => { cancelled = true; };
  }, [currency.code, isKrw]);

  if (isKrw) return null;
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border"
        style={{ backgroundColor: "var(--bg-mid)", borderColor: "var(--border-faint)" }}>
        <RefreshCw size={11} className="animate-spin" style={{ color: "var(--accent-gold)" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>환율 불러오는 중...</span>
      </div>
    );
  }
  if (!exchange) return null;

  const parsed = parseFloat(amount);
  const numAmount = isFinite(parsed) && parsed >= 0 ? parsed : 0;
  const converted = Math.round(numAmount * exchange.rate).toLocaleString("ko-KR");

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-faint)" }}>
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={13} style={{ color: "var(--accent-gold)" }} />
        <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>환율 계산기</span>
        <span className="text-xs ml-auto" style={{ color: "var(--text-dim)" }}>
          기준일: {exchange.updatedAt}
        </span>
      </div>

      {/* Rate display */}
      <div className="flex items-center gap-2 mb-4 p-3 rounded-lg"
        style={{ backgroundColor: "var(--bg-mid)" }}>
        <span className="text-sm font-bold" style={{ color: "var(--accent-gold)" }}>
          {exchange.fromSymbol}1
        </span>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>({exchange.fromName})</span>
        <span className="text-xs mx-1" style={{ color: "var(--text-dim)" }}>=</span>
        <span className="text-sm font-bold" style={{ color: "#4ecdc4" }}>
          ₩{exchange.rate.toLocaleString("ko-KR")}
        </span>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>(원)</span>
      </div>

      {/* Calculator */}
      <div className="flex gap-2 items-center mb-3">
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold"
            style={{ color: "var(--accent-gold)" }}>
            {exchange.fromSymbol}
          </span>
          <input
            type="number"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="w-full pl-8 pr-3 py-2 rounded-lg border text-sm"
            style={{
              backgroundColor: "var(--bg-input)",
              borderColor: "var(--border-faint)",
              color: "var(--text-primary)",
            }}
          />
        </div>
        <span className="text-sm font-bold" style={{ color: "var(--text-dim)" }}>=</span>
        <div className="flex-1 flex items-center gap-1 px-3 py-2 rounded-lg border"
          style={{ backgroundColor: "var(--bg-mid)", borderColor: "var(--border-faint)" }}>
          <span className="text-sm font-bold" style={{ color: "#4ecdc4" }}>₩</span>
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{converted}</span>
        </div>
      </div>

      {/* Total estimate hint */}
      {totalEstimate && (
        <p className="text-[10px]" style={{ color: "var(--text-dim)" }}>
          💡 예상 경비: <span style={{ color: "var(--text-muted)" }}>{totalEstimate}</span>
        </p>
      )}
    </div>
  );
}
