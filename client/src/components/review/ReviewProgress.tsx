interface ReviewProgressProps {
  current: number;
  total: number;
}

export default function ReviewProgress({ current, total }: ReviewProgressProps) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between text-sm text-gray-500 mb-1">
        <span>
          {current} / {total} reviewed
        </span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
