interface ReviewSummaryProps {
  stats: { again: number; hard: number; good: number; easy: number };
  onClose: () => void;
  onRestart: () => void;
}

const BUCKETS = [
  { key: "again", label: "Again", color: "oklch(0.58 0.14 28)" },
  { key: "hard", label: "Hard", color: "oklch(0.65 0.12 55)" },
  { key: "good", label: "Good", color: "oklch(0.55 0.08 150)" },
  { key: "easy", label: "Easy", color: "oklch(0.5 0.1 230)" },
] as const;

export default function ReviewSummary({
  stats,
  onClose,
  onRestart,
}: ReviewSummaryProps) {
  const total = stats.again + stats.hard + stats.good + stats.easy;

  return (
    <div className="py-10 text-center">
      <div className="mono mb-3 text-[10px] uppercase tracking-[0.14em] text-ink-faint">
        Session complete
      </div>
      <h2 className="display m-0 text-[44px] font-medium tracking-[-0.02em] text-ink">
        {total} card{total !== 1 ? "s" : ""} reviewed.
      </h2>

      <div className="my-9 grid grid-cols-4 gap-2.5">
        {BUCKETS.map((b) => (
          <div
            key={b.key}
            className="relative overflow-hidden rounded-lg border border-rule bg-paper-deep px-3.5 py-5 text-left"
          >
            <div
              className="absolute bottom-0 left-0 top-0 w-[3px]"
              style={{ background: b.color }}
            />
            <div className="display text-[28px] font-medium tracking-[-0.01em] text-ink">
              {stats[b.key]}
            </div>
            <div className="mono mt-1 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
              {b.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-2.5">
        <button onClick={onRestart} className="btn btn-primary sans">
          Review more
        </button>
        <button onClick={onClose} className="btn sans">
          Done
        </button>
      </div>
    </div>
  );
}
