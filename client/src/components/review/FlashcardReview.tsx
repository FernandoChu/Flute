import { useState, useEffect, useMemo } from "react";
import { apiFetch } from "../../lib/api";

interface ReviewItem {
  wordId: string;
  word: {
    id: string;
    term: string;
    translation: string | null;
    notes: string | null;
    contextSentence: string | null;
    language: { name: string };
  };
}

interface WordEdits {
  translation?: string | null;
  notes?: string | null;
  contextSentence?: string | null;
}

interface FlashcardReviewProps {
  item: ReviewItem;
  onRate: (rating: number) => void;
  onUpdate: (edits: WordEdits) => Promise<void>;
}

interface Preview {
  [key: string]: string;
}

const RATINGS = [
  {
    rating: 1,
    label: "Again",
    key: "1",
    color: "oklch(0.58 0.14 28)",
  },
  {
    rating: 2,
    label: "Hard",
    key: "2",
    color: "oklch(0.65 0.12 55)",
  },
  {
    rating: 3,
    label: "Good",
    key: "3",
    color: "oklch(0.55 0.08 150)",
  },
  {
    rating: 4,
    label: "Easy",
    key: "4",
    color: "oklch(0.5 0.1 230)",
  },
] as const;

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
            className="border-b-2 border-accent text-ink"
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

export default function FlashcardReview({
  item,
  onRate,
  onUpdate,
}: FlashcardReviewProps) {
  const [flipped, setFlipped] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translation, setTranslation] = useState(item.word.translation ?? "");
  const [notes, setNotes] = useState(item.word.notes ?? "");
  const [contextSentence, setContextSentence] = useState(
    item.word.contextSentence ?? "",
  );

  useEffect(() => {
    setFlipped(false);
    setPreview(null);
    setEditing(false);
    setTranslation(item.word.translation ?? "");
    setNotes(item.word.notes ?? "");
    setContextSentence(item.word.contextSentence ?? "");
    apiFetch<{ data: Preview }>(`/reviews/preview/${item.word.id}`).then(
      (res) => setPreview(res.data),
      () => {},
    );
  }, [
    item.word.id,
    item.word.translation,
    item.word.notes,
    item.word.contextSentence,
  ]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate({
        translation: translation.trim() || null,
        notes: notes.trim() || null,
        contextSentence: contextSentence.trim() || null,
      });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setTranslation(item.word.translation ?? "");
    setNotes(item.word.notes ?? "");
    setContextSentence(item.word.contextSentence ?? "");
    setEditing(false);
  };

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (editing) return;
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
  }, [flipped, editing, onRate]);

  const hasSentence = !!item.word.contextSentence;

  return (
    <div>
      {/* Flashcard */}
      <div
        onClick={() => !flipped && !editing && setFlipped(true)}
        className={`relative flex min-h-[420px] flex-col rounded-[14px] border border-rule bg-paper-deep px-12 py-14 shadow-[var(--shadow-md)] ${
          !flipped && !editing ? "cursor-pointer" : "cursor-default"
        }`}
      >
        {/* Corner meta */}
        <div className="mono absolute left-6 top-5 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          {item.word.language.name}
        </div>
        {flipped && !editing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="btn btn-ghost sans absolute right-4 top-4 px-2.5 py-1 text-[11px] text-ink-faint"
            title="Edit card"
          >
            Edit
          </button>
        )}

        {editing ? (
          <div className="m-auto flex w-full max-w-[520px] flex-col gap-3 text-left">
            <div>
              <div className="mono mb-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                Term
              </div>
              <div className="display text-2xl font-medium text-ink">
                {item.word.term}
              </div>
            </div>
            <div>
              <div className="mono mb-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                Translation
              </div>
              <input
                type="text"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="Translation"
                autoFocus
                className="input"
              />
            </div>
            <div>
              <div className="mono mb-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                Notes
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                rows={3}
                className="input resize-y"
              />
            </div>
            <div>
              <div className="mono mb-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
                Context sentence
              </div>
              <textarea
                value={contextSentence}
                onChange={(e) => setContextSentence(e.target.value)}
                placeholder="Context sentence"
                rows={2}
                className="input resize-y"
              />
            </div>
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary sans flex-1"
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="btn sans flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="m-auto w-full text-center">
            {hasSentence ? (
              <p className="mx-auto mb-6 mt-0 max-w-[600px] font-body text-[22px] leading-[1.5] text-ink">
                <HighlightedSentence
                  sentence={item.word.contextSentence!}
                  term={item.word.term}
                />
              </p>
            ) : (
              <div className="display mb-6 text-[64px] font-medium leading-none tracking-[-0.025em] text-ink">
                {item.word.term}
              </div>
            )}

            {flipped ? (
              <div className="mt-4">
                <div className="mx-auto mb-6 h-px w-[60px] bg-rule" />
                <div className="mb-3 font-body text-[26px] font-normal italic text-ink">
                  {item.word.translation || "—"}
                </div>
                {item.word.notes && (
                  <div className="mt-1.5 whitespace-pre-wrap text-[13px] text-ink-faint">
                    {item.word.notes}
                  </div>
                )}
              </div>
            ) : (
              <div className="mono mt-12 text-[11px] uppercase tracking-[0.1em] text-ink-faint">
                Click or press <span className="kbd">␣</span> to reveal
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating buttons */}
      <div className="mt-6">
        <div className="grid grid-cols-4 gap-2.5">
          {RATINGS.map((r) => (
            <button
              key={r.rating}
              onClick={() => onRate(r.rating)}
              disabled={!flipped || editing}
              className={`sans relative overflow-hidden rounded-lg border border-rule bg-paper-deep px-3.5 pb-3.5 pt-4 text-left text-ink transition-all duration-[120ms] ${
                flipped && !editing
                  ? "cursor-pointer opacity-100"
                  : "cursor-default opacity-40"
              }`}
            >
              <div
                className="absolute bottom-0 left-0 top-0 w-[3px]"
                style={{ background: r.color }}
              />
              <div className="flex items-baseline justify-between">
                <div className="display text-[20px] font-medium tracking-[-0.01em] text-ink">
                  {r.label}
                </div>
                <span className="kbd">{r.key}</span>
              </div>
              <div className="mono mt-1.5 text-[11px] tracking-[0.06em] text-ink-faint">
                next ·{" "}
                {preview ? preview[String(r.rating)] ?? "—" : "…"}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
