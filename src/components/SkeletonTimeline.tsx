export default function SkeletonTimeline() {
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="mb-8 text-center flex flex-col items-center gap-3">
        <div className="skeleton h-6 w-40 rounded-full" />
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="skeleton h-4 w-32 rounded" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 p-1 rounded-xl border" style={{ borderColor: "var(--border-faint)", backgroundColor: "var(--bg-mid)" }}>
        {[1, 2].map(i => (
          <div key={i} className="flex-1 py-3 px-4 rounded-lg flex flex-col items-center gap-1.5">
            <div className="skeleton h-4 w-12 rounded" />
            <div className="skeleton h-3 w-16 rounded" />
          </div>
        ))}
      </div>

      {/* Items */}
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <div className="flex-shrink-0 w-14 flex flex-col items-center">
              <div className="skeleton w-8 h-8 rounded-full" />
              {i < 4 && <div className="skeleton w-px flex-1 min-h-[40px] mt-1 rounded" />}
            </div>
            <div className="flex-1 mb-4 rounded-xl border p-4" style={{ borderColor: "var(--border-faint)", backgroundColor: "var(--bg-card)" }}>
              <div className="flex items-center gap-2 mb-3">
                <div className="skeleton h-3 w-12 rounded" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
              <div className="skeleton h-5 w-40 rounded mb-2" />
              <div className="skeleton h-3 w-full rounded mb-1.5" />
              <div className="skeleton h-3 w-3/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
