interface ReviewProgressProps {
  current: number;
  total: number;
}

export default function ReviewProgress({
  current,
  total,
}: ReviewProgressProps) {
  return (
    <div style={{ marginBottom: 48 }}>
      <div
        style={{
          display: "flex",
          gap: 2,
          height: 3,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: "100%",
              background:
                i < current
                  ? "var(--ink)"
                  : i === current
                    ? "var(--accent)"
                    : "var(--rule-soft)",
              borderRadius: 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
