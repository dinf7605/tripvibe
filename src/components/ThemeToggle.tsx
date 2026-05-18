"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

export default function ThemeToggle({ size = "md" }: { size?: "sm" | "md" }) {
  const { theme, toggleTheme } = useTheme();
  const iconSize = size === "sm" ? 13 : 15;
  const pad = size === "sm" ? "p-1.5" : "p-2";

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className={`${pad} rounded-lg border transition-all`}
      style={{
        color: "var(--text-muted)",
        borderColor: "var(--border-faint)",
        backgroundColor: "var(--bg-card)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = "var(--accent-gold)";
        e.currentTarget.style.borderColor = "var(--border-subtle)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = "var(--text-muted)";
        e.currentTarget.style.borderColor = "var(--border-faint)";
      }}
    >
      {theme === "dark" ? <Sun size={iconSize} /> : <Moon size={iconSize} />}
    </button>
  );
}
