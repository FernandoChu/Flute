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

function HighlightedSentence({
  sentence,
  term,
}: {
  sentence: string;
  term: string;
}) {
  const parts = useMemo(() => {
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    return sentence.split(regex);
  }, [sentence, term]);

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <span
            key={i}
            style={{
              borderBottom: "2px solid var(--accent)",
              color: "var(--ink)",
            }}
          >
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
        while (allChoices.length < 4) allChoices.push("—");
        setChoices(allChoices.sort(() => Math.random() - 0.5));
      },
      () => {
        setChoices(
          [correctAnswer, "—", "—", "—"].sort(() => Math.random() - 0.5),
        );
      },
    );
  }, [item.word.id, item.word.translation]);

  const handleSelect = (choice: string) => {
    if (selected) return;
    const isCorrect = choice === (item.word.translation || "?");
    setSelected(choice);
    setCorrect(isCorrect);

    setTimeout(() => {
      onRate(isCorrect ? 3 : 1);
    }, 800);
  };

  const hasSentence = !!item.word.contextSentence;

  return (
    <div>
      <div
        style={{
          background: "var(--paper-deep)",
          border: "1px solid var(--rule)",
          borderRadius: 14,
          padding: "48px 48px",
          textAlign: "center",
          marginBottom: 24,
          boxShadow: "var(--shadow-md)",
          position: "relative",
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          {item.word.language.name}
        </div>
        {hasSentence ? (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 22,
              lineHeight: 1.5,
              color: "var(--ink)",
              margin: 0,
              maxWidth: 600,
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            <HighlightedSentence
              sentence={item.word.contextSentence!}
              term={item.word.term}
            />
          </p>
        ) : (
          <div
            className="display"
            style={{
              fontSize: 56,
              fontWeight: 500,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
            }}
          >
            {item.word.term}
          </div>
        )}
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {choices.map((choice, i) => {
          const isCorrect = choice === (item.word.translation || "?");
          const isSelected = selected === choice;
          let borderColor = "var(--rule)";
          let background = "var(--paper-deep)";
          let color = "var(--ink)";

          if (selected) {
            if (isCorrect) {
              borderColor = "oklch(0.55 0.12 150)";
              background = "oklch(0.94 0.06 150)";
              color = "oklch(0.3 0.1 150)";
            } else if (isSelected) {
              borderColor = "var(--accent)";
              background = "var(--accent-wash)";
              color = "var(--accent)";
            } else {
              color = "var(--ink-faint)";
            }
          }

          return (
            <button
              key={i}
              onClick={() => handleSelect(choice)}
              disabled={!!selected}
              className="sans"
              style={{
                width: "100%",
                padding: "14px 18px",
                fontSize: 15,
                borderRadius: 8,
                border: `1px solid ${borderColor}`,
                background,
                color,
                textAlign: "left",
                cursor: selected ? "default" : "pointer",
                display: "flex",
                alignItems: "center",
                gap: 12,
                transition: "all 120ms ease",
              }}
            >
              <span className="kbd">{i + 1}</span>
              {choice}
            </button>
          );
        })}
      </div>

      {selected && (
        <p
          className="mono"
          style={{
            textAlign: "center",
            marginTop: 16,
            fontSize: 12,
            letterSpacing: "0.06em",
            color: correct ? "oklch(0.4 0.12 150)" : "var(--accent)",
          }}
        >
          {correct
            ? "Correct."
            : `The answer is "${item.word.translation}"`}
        </p>
      )}
    </div>
  );
}
