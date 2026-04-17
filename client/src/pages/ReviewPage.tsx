import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiFetch } from "../lib/api";
import FlashcardReview from "../components/review/FlashcardReview";
import MultipleChoiceReview from "../components/review/MultipleChoiceReview";
import ReviewProgress from "../components/review/ReviewProgress";
import ReviewSummary from "../components/review/ReviewSummary";

interface Language {
  id: number;
  code: string;
  name: string;
}

type ReviewMode = "flashcard" | "multiple-choice";

interface ReviewItem {
  id: string;
  wordId: string;
  word: {
    id: string;
    term: string;
    translation: string | null;
    status: number;
    notes: string | null;
    contextSentence: string | null;
    languageId: number;
    language: { code: string; name: string };
  };
}

export default function ReviewPage() {
  const queryClient = useQueryClient();
  const [languageId, setLanguageId] = useState("");
  const [wordStatus, setWordStatus] = useState("");
  const [mode, setMode] = useState<ReviewMode>("flashcard");
  const [started, setStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState({ again: 0, hard: 0, good: 0, easy: 0 });

  const { data: languages } = useQuery({
    queryKey: ["languages"],
    queryFn: () => apiFetch<{ data: Language[] }>("/languages"),
  });

  const langParam = languageId ? `&languageId=${languageId}` : "";
  const statusParam = wordStatus !== "" ? `&wordStatus=${wordStatus}` : "";
  const filterParams = `${langParam}${statusParam}`;

  const { data: countData } = useQuery({
    queryKey: ["review-count", languageId, wordStatus],
    queryFn: () =>
      apiFetch<{ data: { count: number } }>(
        `/reviews/due/count?${filterParams}`,
      ),
  });

  const { data: reviewData, refetch } = useQuery({
    queryKey: ["review-items", languageId, wordStatus],
    queryFn: () =>
      apiFetch<{ data: ReviewItem[] }>(
        `/reviews/due?limit=20${filterParams}`,
      ),
    enabled: started,
  });

  const items = reviewData?.data ?? [];
  const currentItem = items[currentIdx] ?? null;
  const dueCount = countData?.data.count ?? 0;

  const handleUpdate = useCallback(
    async (edits: {
      translation?: string | null;
      notes?: string | null;
      contextSentence?: string | null;
    }) => {
      if (!currentItem) return;
      const wordId = currentItem.word.id;

      const res = await apiFetch<{ data: ReviewItem["word"] }>(
        `/words/${wordId}`,
        {
          method: "PUT",
          body: JSON.stringify(edits),
        },
      );

      queryClient.setQueryData<{ data: ReviewItem[] }>(
        ["review-items", languageId, wordStatus],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((it) =>
              it.word.id === wordId
                ? { ...it, word: { ...it.word, ...res.data } }
                : it,
            ),
          };
        },
      );
      queryClient.invalidateQueries({ queryKey: ["vocabulary"] });
    },
    [currentItem, languageId, wordStatus, queryClient],
  );

  const handleRate = useCallback(
    async (rating: number) => {
      if (!currentItem) return;

      await apiFetch(`/reviews/${currentItem.word.id}`, {
        method: "POST",
        body: JSON.stringify({ rating }),
      });

      setStats((prev) => {
        const key =
          rating === 1
            ? "again"
            : rating === 2
              ? "hard"
              : rating === 3
                ? "good"
                : "easy";
        return { ...prev, [key]: prev[key as keyof typeof prev] + 1 };
      });

      if (currentIdx + 1 < items.length) {
        setCurrentIdx((i) => i + 1);
      } else {
        setFinished(true);
        queryClient.invalidateQueries({ queryKey: ["review-count"] });
        queryClient.invalidateQueries({ queryKey: ["vocabulary-stats"] });
      }
    },
    [currentItem, currentIdx, items.length, queryClient],
  );

  const handleStart = () => {
    setStarted(true);
    setCurrentIdx(0);
    setFinished(false);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
  };

  const handleRestart = async () => {
    setStarted(false);
    setFinished(false);
    setCurrentIdx(0);
    setStats({ again: 0, hard: 0, good: 0, easy: 0 });
    await queryClient.invalidateQueries({ queryKey: ["review-items"] });
    await queryClient.invalidateQueries({ queryKey: ["review-count"] });
    // Small delay then restart
    setTimeout(() => {
      setStarted(true);
      refetch();
    }, 100);
  };

  // Setup screen
  if (!started) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Review</h1>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Language
            </label>
            <select
              value={languageId}
              onChange={(e) => setLanguageId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All languages</option>
              {languages?.data.map((lang) => (
                <option key={lang.id} value={lang.id}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Word Status
            </label>
            <select
              value={wordStatus}
              onChange={(e) => setWordStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All statuses</option>
              <option value="1">Learning 1</option>
              <option value="2">Learning 2</option>
              <option value="3">Learning 3</option>
              <option value="4">Learning 4</option>
              <option value="5">Known</option>
            </select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mode
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setMode("flashcard")}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  mode === "flashcard"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Flashcard
              </button>
              <button
                onClick={() => setMode("multiple-choice")}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  mode === "multiple-choice"
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-300 hover:bg-gray-50"
                }`}
              >
                Multiple Choice
              </button>
            </div>
          </div>

          <p className="text-center text-gray-500 mb-4">
            {dueCount} card{dueCount !== 1 ? "s" : ""} due for review
          </p>

          <button
            onClick={handleStart}
            disabled={dueCount === 0}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {dueCount === 0 ? "No cards to review" : "Start Review"}
          </button>

          <Link
            href="/"
            className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-4"
          >
            Back to Library
          </Link>
        </div>
      </div>
    );
  }

  // Summary screen
  if (finished) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Review</h1>
        <ReviewSummary
          stats={stats}
          onRestart={handleRestart}
          onClose={() => {
            setStarted(false);
            setFinished(false);
          }}
        />
      </div>
    );
  }

  // Loading
  if (!currentItem) {
    return (
      <div className="max-w-lg mx-auto p-6 text-center text-gray-500">
        Loading reviews...
      </div>
    );
  }

  // Active review
  const total = items.length;
  const reviewed = currentIdx;

  return (
    <div className="max-w-lg mx-auto p-6">
      <ReviewProgress current={reviewed} total={total} />

      {mode === "flashcard" ? (
        <FlashcardReview
          item={currentItem}
          onRate={handleRate}
          onUpdate={handleUpdate}
        />
      ) : (
        <MultipleChoiceReview item={currentItem} onRate={handleRate} />
      )}
    </div>
  );
}
