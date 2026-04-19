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
    <div style={{ textAlign: "center", padding: "40px 0" }}>
      <div
        className="mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.14em",
          color: "var(--ink-faint)",
          textTransform: "uppercase",
          marginBottom: 12,
        }}
      >
        Session complete
      </div>
      <h2
        className="display"
        style={{
          margin: 0,
          fontSize: 44,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          color: "var(--ink)",
        }}
      >
        {total} card{total !== 1 ? "s" : ""} reviewed.
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 10,
          marginTop: 36,
          marginBottom: 36,
        }}
      >
        {BUCKETS.map((b) => (
          <div
            key={b.key}
            style={{
              padding: "20px 14px",
              background: "var(--paper-deep)",
              border: "1px solid var(--rule)",
              borderRadius: 8,
              position: "relative",
              overflow: "hidden",
              textAlign: "left",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                bottom: 0,
                width: 3,
                background: b.color,
              }}
            />
            <div
              className="display"
              style={{
                fontSize: 28,
                fontWeight: 500,
                color: "var(--ink)",
                letterSpacing: "-0.01em",
              }}
            >
              {stats[b.key]}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                marginTop: 4,
              }}
            >
              {b.label}
            </div>
          </div>
        ))}
      </div>

      <div
        style={{ display: "flex", gap: 10, justifyContent: "center" }}
      >
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
