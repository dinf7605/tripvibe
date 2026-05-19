"use client";

/**
 * Empty-state illustration for "no trips yet".
 * Pure inline SVG, themed via CSS variables. ~180px wide.
 */
export default function EmptyTripsIllustration() {
  return (
    <div className="relative inline-block">
      <svg
        width="180"
        height="140"
        viewBox="0 0 220 170"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="empty-illu"
      >
        {/* Soft background card / map */}
        <rect
          x="20"
          y="30"
          width="180"
          height="118"
          rx="14"
          fill="var(--bg-card)"
          stroke="var(--border-faint)"
          strokeWidth="1.5"
          strokeDasharray="5 4"
        />

        {/* Map grid hints */}
        <line x1="20" y1="65" x2="200" y2="65" stroke="var(--border-faint)" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
        <line x1="20" y1="105" x2="200" y2="105" stroke="var(--border-faint)" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
        <line x1="75" y1="30" x2="75" y2="148" stroke="var(--border-faint)" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />
        <line x1="145" y1="30" x2="145" y2="148" stroke="var(--border-faint)" strokeWidth="1" strokeDasharray="2 4" opacity="0.5" />

        {/* Travel route (dashed curve) */}
        <path
          d="M55 120 Q80 80 110 95 T170 60"
          stroke="var(--accent-gold)"
          strokeWidth="2.2"
          strokeDasharray="6 5"
          fill="none"
          strokeLinecap="round"
          opacity="0.85"
          className="empty-illu-path"
        />

        {/* Start pin (mint) */}
        <circle cx="55" cy="120" r="7" fill="#4ecdc4" />
        <circle cx="55" cy="120" r="3" fill="#fff" />

        {/* Mid pin (gold) */}
        <circle cx="110" cy="95" r="6" fill="var(--accent-gold)" opacity="0.85" />
        <circle cx="110" cy="95" r="2.5" fill="#fff" />

        {/* End pin marker (coral) */}
        <g transform="translate(170, 60)" className="empty-illu-pin">
          <path
            d="M0 -16 C-9 -16 -14 -9 -14 -3 C-14 5 -2 14 0 18 C2 14 14 5 14 -3 C14 -9 9 -16 0 -16 Z"
            fill="var(--accent-coral)"
            stroke="var(--bg-card)"
            strokeWidth="1.5"
          />
          <circle cx="0" cy="-4" r="4.5" fill="#fff" />
        </g>

        {/* Floating compass (top-left) */}
        <g transform="translate(40, 50)" className="empty-illu-compass">
          <circle r="13" fill="var(--bg-mid)" stroke="var(--accent-gold)" strokeWidth="1.5" opacity="0.95" />
          <path d="M0 -8 L2.5 0 L0 8 L-2.5 0 Z" fill="var(--accent-gold)" />
          <circle r="1.5" fill="var(--bg-card)" />
        </g>

        {/* Tiny floating airplane (top-right) */}
        <g transform="translate(178, 38) rotate(35)" className="empty-illu-plane">
          <path d="M0 -7 L1.5 4 L7 7 L1 4.5 L0 9 L-1 4.5 L-7 7 L-1.5 4 Z" fill="var(--text-muted)" opacity="0.6" />
        </g>

        {/* Sparkle dots */}
        <circle cx="160" cy="115" r="1.8" fill="var(--accent-gold)" opacity="0.5" className="empty-illu-sparkle empty-illu-sparkle-1" />
        <circle cx="95" cy="55" r="1.5" fill="#4ecdc4" opacity="0.55" className="empty-illu-sparkle empty-illu-sparkle-2" />
        <circle cx="185" cy="135" r="1.2" fill="var(--accent-coral)" opacity="0.6" className="empty-illu-sparkle empty-illu-sparkle-3" />
      </svg>

      <style jsx>{`
        .empty-illu {
          display: block;
        }
        :global(.empty-illu-pin) {
          animation: pin-bounce 2.6s ease-in-out infinite;
          transform-origin: 0 18px;
          transform-box: fill-box;
        }
        :global(.empty-illu-compass) {
          animation: compass-spin 6s linear infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        :global(.empty-illu-plane) {
          animation: plane-float 3.2s ease-in-out infinite;
          transform-origin: center;
          transform-box: fill-box;
        }
        :global(.empty-illu-path) {
          stroke-dashoffset: 0;
          animation: path-drift 4s linear infinite;
        }
        :global(.empty-illu-sparkle) {
          animation: sparkle 2.4s ease-in-out infinite;
        }
        :global(.empty-illu-sparkle-1) { animation-delay: 0s; }
        :global(.empty-illu-sparkle-2) { animation-delay: 0.7s; }
        :global(.empty-illu-sparkle-3) { animation-delay: 1.4s; }

        @keyframes pin-bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-4px); }
        }
        @keyframes compass-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes plane-float {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @keyframes path-drift {
          to { stroke-dashoffset: -22; }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.2; transform: scale(0.7); }
          50%      { opacity: 0.8; transform: scale(1.2); }
        }

        @media (prefers-reduced-motion: reduce) {
          :global(.empty-illu-pin),
          :global(.empty-illu-compass),
          :global(.empty-illu-plane),
          :global(.empty-illu-path),
          :global(.empty-illu-sparkle) {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
