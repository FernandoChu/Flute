interface ReviewProgressProps {
  current: number;
  total: number;
}

export default function ReviewProgress({
  current,
  total,
}: ReviewProgressProps) {
  return (
    <div className="mb-12">
      <div className="flex h-[3px] gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-full flex-1 rounded-[1px] ${
              i < current
                ? "bg-ink"
                : i === current
                  ? "bg-accent"
                  : "bg-rule-soft"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
