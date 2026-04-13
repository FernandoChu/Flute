import { useState, useEffect } from "react";
import { apiFetch } from "../../lib/api";

interface ReviewItem {
  wordId: string;
  word: {
    id: string;
    term: string;
    translation: string | null;
    notes: string | null;
    language: { name: string };
  };
}

interface FlashcardReviewProps {
  item: ReviewItem;
  onRate: (rating: number) => void;
}

interface Preview {
  [key: string]: string;
}

export default function FlashcardReview({ item, onRate }: FlashcardReviewProps) {
  const [flipped, setFlipped] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  useEffect(() => {
    setFlipped(false);
    setPreview(null);
    apiFetch<{ data: Preview }>(`/reviews/preview/${item.word.id}`).then(
      (res) => setPreview(res.data),
      () => {},
    );
  }, [item.word.id]);

  const ratingButtons = [
    { rating: 1, label: "Again", key: "1", color: "bg-red-100 hover:bg-red-200 text-red-700" },
    { rating: 2, label: "Hard", key: "2", color: "bg-orange-100 hover:bg-orange-200 text-orange-700" },
    { rating: 3, label: "Good", key: "3", color: "bg-green-100 hover:bg-green-200 text-green-700" },
    { rating: 4, label: "Easy", key: "4", color: "bg-blue-100 hover:bg-blue-200 text-blue-700" },
  ];

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!flipped) setFlipped(true);
      }
      if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        onRate(Number(e.key));
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [flipped, onRate]);

  return (
    <div className="max-w-lg mx-auto">
      <div
        onClick={() => !flipped && setFlipped(true)}
        className={`bg-white rounded-xl border-2 border-gray-200 p-8 text-center min-h-[200px] flex flex-col items-center justify-center ${
          !flipped ? "cursor-pointer hover:border-blue-300" : ""
        }`}
      >
        <p className="text-xs text-gray-400 mb-3">{item.word.language.name}</p>
        <p className="text-3xl font-bold mb-4">{item.word.term}</p>

        {flipped ? (
          <div>
            <p className="text-xl text-gray-700">
              {item.word.translation || "No translation"}
            </p>
            {item.word.notes && (
              <p className="text-sm text-gray-400 mt-2">{item.word.notes}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">
            Click or press Space to reveal
          </p>
        )}
      </div>

      {flipped && (
        <div className="mt-6 grid grid-cols-4 gap-2">
          {ratingButtons.map((btn) => (
            <button
              key={btn.rating}
              onClick={() => onRate(btn.rating)}
              className={`py-3 rounded-lg text-sm font-medium ${btn.color} transition-colors`}
            >
              <div>{btn.label}</div>
              {preview && (
                <div className="text-xs opacity-70 mt-0.5">
                  {preview[String(btn.rating)] ?? ""}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
