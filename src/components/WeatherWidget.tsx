"use client";

import { useEffect, useState } from "react";
import { Cloud, Wind, Droplets, ThermometerSun } from "lucide-react";

const WMO: Record<number, { label: string; emoji: string }> = {
  0:  { label: "맑음",       emoji: "☀️" },
  1:  { label: "대체로 맑음", emoji: "🌤️" },
  2:  { label: "구름 조금",  emoji: "⛅" },
  3:  { label: "흐림",       emoji: "☁️" },
  45: { label: "안개",       emoji: "🌫️" },
  48: { label: "안개",       emoji: "🌫️" },
  51: { label: "이슬비",     emoji: "🌦️" },
  53: { label: "이슬비",     emoji: "🌦️" },
  55: { label: "이슬비",     emoji: "🌦️" },
  61: { label: "비",         emoji: "🌧️" },
  63: { label: "비",         emoji: "🌧️" },
  65: { label: "강한 비",    emoji: "🌧️" },
  71: { label: "눈",         emoji: "🌨️" },
  73: { label: "눈",         emoji: "🌨️" },
  75: { label: "강한 눈",    emoji: "❄️" },
  77: { label: "눈발",       emoji: "❄️" },
  80: { label: "소나기",     emoji: "🌦️" },
  81: { label: "소나기",     emoji: "🌦️" },
  82: { label: "강한 소나기", emoji: "⛈️" },
  95: { label: "천둥번개",   emoji: "⛈️" },
  96: { label: "천둥번개",   emoji: "⛈️" },
  99: { label: "천둥번개",   emoji: "⛈️" },
};

function getWmo(code: number) {
  return WMO[code] ?? { label: "알 수 없음", emoji: "🌡️" };
}

const DAY_LABELS = ["오늘", "내일", "모레", "그 다음날"];

type WeatherData = {
  current: {
    temp: number;
    code: number;
    wind: number;
    humidity: number;
  };
  daily: Array<{
    maxTemp: number;
    minTemp: number;
    code: number;
    rain: number;
  }>;
};

type Props = { destination: string };

export default function WeatherWidget({ destination }: Props) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchWeather() {
      try {
        // 1. Geocode destination
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=ko&format=json`
        );
        if (!geoRes.ok) throw new Error(`geocoding HTTP ${geoRes.status}`);
        const geoData = await geoRes.json();
        const first = geoData?.results?.[0];
        if (!first || typeof first.latitude !== "number" || typeof first.longitude !== "number") {
          throw new Error("destination not found");
        }
        const { latitude, longitude, timezone } = first;

        // 2. Fetch weather
        const params = new URLSearchParams({
          latitude: String(latitude),
          longitude: String(longitude),
          current: "temperature_2m,weathercode,windspeed_10m,relative_humidity_2m",
          daily: "temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum",
          timezone: typeof timezone === "string" ? timezone : "auto",
          forecast_days: "4",
        });
        const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        if (!wxRes.ok) throw new Error(`forecast HTTP ${wxRes.status}`);
        const wx = await wxRes.json();

        if (cancelled) return;

        const cur = wx?.current;
        const daily = wx?.daily;
        if (!cur || !daily || !Array.isArray(daily.time)) throw new Error("weather payload malformed");

        const safeNum = (v: unknown, fallback = 0): number =>
          typeof v === "number" && isFinite(v) ? v : fallback;

        setWeather({
          current: {
            temp: Math.round(safeNum(cur.temperature_2m)),
            code: safeNum(cur.weathercode, -1),
            wind: Math.round(safeNum(cur.windspeed_10m)),
            humidity: Math.round(safeNum(cur.relative_humidity_2m)),
          },
          daily: (daily.time as string[]).map((_, i: number) => ({
            maxTemp: Math.round(safeNum(daily.temperature_2m_max?.[i])),
            minTemp: Math.round(safeNum(daily.temperature_2m_min?.[i])),
            code: safeNum(daily.weathercode?.[i], -1),
            rain: Math.round(safeNum(daily.precipitation_sum?.[i]) * 10) / 10,
          })),
        });
      } catch (err) {
        console.error("[weather] fetch failed:", err);
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchWeather();
    return () => { cancelled = true; };
  }, [destination]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl border"
        style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-faint)" }}>
        <div className="w-4 h-4 rounded-full border-2 animate-spin shrink-0"
          style={{ borderColor: "var(--accent-gold)", borderTopColor: "transparent" }} />
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>날씨 불러오는 중...</span>
      </div>
    );
  }

  if (error || !weather || weather.daily.length === 0) return null;

  const cur = getWmo(weather.current.code);
  const today = weather.daily[0];

  return (
    <div className="rounded-xl border p-4" style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border-faint)" }}>
      <div className="flex items-start justify-between gap-4 mb-4">
        {/* Current weather */}
        <div className="flex items-center gap-3">
          <span className="text-4xl leading-none">{cur.emoji}</span>
          <div>
            <div className="flex items-end gap-1">
              <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                {weather.current.temp}°
              </span>
              <span className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>C</span>
            </div>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>{cur.label}</span>
          </div>
        </div>

        {/* Details */}
        <div className="flex gap-4 text-xs" style={{ color: "var(--text-muted)" }}>
          <div className="flex flex-col items-center gap-1">
            <Wind size={13} style={{ color: "var(--accent-gold)" }} />
            <span>{weather.current.wind}km/h</span>
            <span className="opacity-60">바람</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Droplets size={13} style={{ color: "#4ecdc4" }} />
            <span>{weather.current.humidity}%</span>
            <span className="opacity-60">습도</span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ThermometerSun size={13} style={{ color: "#ff6b6b" }} />
            <span>{today.maxTemp}° / {today.minTemp}°</span>
            <span className="opacity-60">최고/최저</span>
          </div>
        </div>
      </div>

      {/* 4-day forecast */}
      <div className="flex gap-2">
        {weather.daily.map((d, i) => {
          const w = getWmo(d.code);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 py-2 px-1 rounded-lg"
              style={{ backgroundColor: "var(--bg-mid)" }}>
              <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>
                {DAY_LABELS[i] ?? `+${i}일`}
              </span>
              <span className="text-lg leading-none">{w.emoji}</span>
              <span className="text-[10px]" style={{ color: "var(--text-primary)" }}>
                {d.maxTemp}°
              </span>
              <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                {d.minTemp}°
              </span>
              {d.rain > 0 && (
                <span className="text-[9px]" style={{ color: "#4ecdc4" }}>
                  {d.rain}mm
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-1 mt-3">
        <Cloud size={10} style={{ color: "var(--text-dim)" }} />
        <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
          {destination} 현재 날씨 · Open-Meteo
        </span>
      </div>
    </div>
  );
}
