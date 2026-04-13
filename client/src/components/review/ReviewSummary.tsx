interface ReviewSummaryProps {
  stats: { again: number; hard: number; good: number; easy: number };
  onClose: () => void;
  onRestart: () => void;
}

export default function ReviewSummary({ stats, onClose, onRestart }: ReviewSummaryProps) {
  const total = stats.again + stats.hard + stats.good + stats.easy;

  return (
    <div className="max-w-md mx-auto text-center">
      <h2 className="text-2xl font-bold mb-2">Session Complete</h2>
      <p className="text-gray-500 mb-6">
        You reviewed {total} card{total !== 1 ? "s" : ""}.
      </p>

      <div className="grid grid-cols-4 gap-3 mb-8">
        <div className="bg-red-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-red-600">{stats.again}</p>
          <p className="text-xs text-gray-500">Again</p>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-orange-600">{stats.hard}</p>
          <p className="text-xs text-gray-500">Hard</p>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-green-600">{stats.good}</p>
          <p className="text-xs text-gray-500">Good</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3">
          <p className="text-2xl font-bold text-blue-600">{stats.easy}</p>
          <p className="text-xs text-gray-500">Easy</p>
        </div>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          onClick={onRestart}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Review more
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
}
