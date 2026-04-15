import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../../lib/api";

interface ReviewItem {
  wordId: string;
  word: {
    id: string;
    term: string;
    translation: string | null;
    contextSentence: string | null;
    language: { name: string };
  };
}

interface MultipleChoiceReviewProps {
  item: ReviewItem;
  onRate: (rating: number) => void;
}

interface Distractor {
  id: string;
  translation: string | null;
}

function HighlightedSentence({ sentence, term }: { sentence: string; term: string }) {
  const parts = useMemo(() => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return sentence.split(regex);
  }, [sentence, term]);

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <span key={i} className="text-blue-600 font-bold underline underline-offset-4">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export default function MultipleChoiceReview({
  item,
  onRate,
}: MultipleChoiceReviewProps) {
  const [choices, setChoices] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [correct, setCorrect] = useState(false);

  useEffect(() => {
    setSelected(null);
    setCorrect(false);

    const correctAnswer = item.word.translation || "?";

    apiFetch<{ data: Distractor[] }>(
      `/reviews/distractors?wordId=${item.word.id}&count=3`,
    ).then(
      (res) => {
        const distractorTexts = res.data
          .map((d) => d.translation ?? "")
          .filter((t) => t && t !== correctAnswer);

        const allChoices = [correctAnswer, ...distractorTexts.slice(0, 3)];
        // Pad if not enough distractors
        while (allChoices.length < 4) {
          allChoices.push("—");
        }
        // Shuffle
        setChoices(allChoices.sort(() => Math.random() - 0.5));
      },
      () => {
        setChoices([correctAnswer, "—", "—", "—"].sort(() => Math.random() - 0.5));
      },
    );
  }, [item.word.id, item.word.translation]);

  const handleSelect = (choice: string) => {
    if (selected) return;
    const isCorrect = choice === (item.word.translation || "?");
    setSelected(choice);
    setCorrect(isCorrect);

    // Auto-advance after a short delay
    setTimeout(() => {
      onRate(isCorrect ? 3 : 1); // Good on correct, Again on incorrect
    }, 800);
  };

  const hasSentence = !!item.word.contextSentence;

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center mb-6">
        <p className="text-xs text-gray-400 mb-3">{item.word.language.name}</p>
        {hasSentence ? (
          <p className="text-xl leading-relaxed">
            <HighlightedSentence
              sentence={item.word.contextSentence!}
              term={item.word.term}
            />
          </p>
        ) : (
          <p className="text-3xl font-bold">{item.word.term}</p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3">
        {choices.map((choice, i) => {
          let className =
            "w-full py-3 px-4 rounded-lg border-2 text-left transition-colors ";

          if (!selected) {
            className += "border-gray-200 hover:border-blue-300 hover:bg-blue-50 cursor-pointer";
          } else if (choice === (item.word.translation || "?")) {
            className += "border-green-500 bg-green-50 text-green-700";
          } else if (choice === selected) {
            className += "border-red-500 bg-red-50 text-red-700";
          } else {
            className += "border-gray-200 opacity-50";
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(choice)}
              disabled={!!selected}
              className={className}
            >
              <span className="text-xs text-gray-400 mr-2">{i + 1}.</span>
              {choice}
            </button>
          );
        })}
      </div>

      {selected && (
        <p
          className={`text-center mt-4 text-sm font-medium ${
            correct ? "text-green-600" : "text-red-600"
          }`}
        >
          {correct ? "Correct!" : `Wrong — the answer is "${item.word.translation}"`}
        </p>
      )}
    </div>
  );
}
