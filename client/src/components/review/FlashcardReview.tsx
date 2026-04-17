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

export default function FlashcardReview({ item, onRate, onUpdate }: FlashcardReviewProps) {
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
  }, [item.word.id, item.word.translation, item.word.notes, item.word.contextSentence]);

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

  const ratingButtons = [
    { rating: 1, label: "Again", key: "1", color: "bg-red-100 hover:bg-red-200 text-red-700" },
    { rating: 2, label: "Hard", key: "2", color: "bg-orange-100 hover:bg-orange-200 text-orange-700" },
    { rating: 3, label: "Good", key: "3", color: "bg-green-100 hover:bg-green-200 text-green-700" },
    { rating: 4, label: "Easy", key: "4", color: "bg-blue-100 hover:bg-blue-200 text-blue-700" },
  ];

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
    <div className="max-w-lg mx-auto">
      <div
        onClick={() => !flipped && !editing && setFlipped(true)}
        className={`relative bg-white rounded-xl border-2 border-gray-200 p-8 text-center min-h-[200px] flex flex-col items-center justify-center ${
          !flipped && !editing ? "cursor-pointer hover:border-blue-300" : ""
        }`}
      >
        {flipped && !editing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="absolute top-3 right-3 text-xs text-gray-400 hover:text-gray-700 px-2 py-1 rounded border border-gray-200 hover:border-gray-300"
            title="Edit card"
          >
            Edit
          </button>
        )}

        <p className="text-xs text-gray-400 mb-3">{item.word.language.name}</p>

        {editing ? (
          <div className="w-full text-left space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Term
              </label>
              <p className="text-lg font-semibold">{item.word.term}</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Translation
              </label>
              <input
                type="text"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="Translation"
                autoFocus
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                rows={3}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Context sentence
              </label>
              <textarea
                value={contextSentence}
                onChange={(e) => setContextSentence(e.target.value)}
                placeholder="Context sentence"
                rows={2}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {hasSentence ? (
              <p className="text-xl leading-relaxed mb-4">
                <HighlightedSentence
                  sentence={item.word.contextSentence!}
                  term={item.word.term}
                />
              </p>
            ) : (
              <p className="text-3xl font-bold mb-4">{item.word.term}</p>
            )}

            {flipped ? (
              <div>
                <p className="text-xl text-gray-700">
                  {item.word.translation || "No translation"}
                </p>
                {item.word.notes && (
                  <p className="text-sm text-gray-400 mt-2 whitespace-pre-wrap">
                    {item.word.notes}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                Click or press Space to reveal
              </p>
            )}
          </>
        )}
      </div>

      {flipped && !editing && (
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
