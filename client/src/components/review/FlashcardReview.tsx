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
        style={{
          background: "var(--paper-deep)",
          border: "1px solid var(--rule)",
          borderRadius: 14,
          padding: "56px 48px",
          display: "flex",
          flexDirection: "column",
          boxShadow: "var(--shadow-md)",
          position: "relative",
          minHeight: 420,
          cursor: !flipped && !editing ? "pointer" : "default",
        }}
      >
        {/* Corner meta */}
        <div
          className="mono"
          style={{
            position: "absolute",
            top: 20,
            left: 24,
            fontSize: 10,
            color: "var(--ink-faint)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {item.word.language.name}
        </div>
        {flipped && !editing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            className="btn btn-ghost sans"
            style={{
              position: "absolute",
              top: 16,
              right: 16,
              fontSize: 11,
              color: "var(--ink-faint)",
              padding: "4px 10px",
            }}
            title="Edit card"
          >
            Edit
          </button>
        )}

        {editing ? (
          <div
            style={{
              margin: "auto",
              width: "100%",
              maxWidth: 520,
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Term
              </div>
              <div
                className="display"
                style={{
                  fontSize: 24,
                  fontWeight: 500,
                  color: "var(--ink)",
                }}
              >
                {item.word.term}
              </div>
            </div>
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
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
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Notes
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes"
                rows={3}
                className="input"
                style={{ resize: "vertical" }}
              />
            </div>
            <div>
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.1em",
                  color: "var(--ink-faint)",
                  textTransform: "uppercase",
                  marginBottom: 6,
                }}
              >
                Context sentence
              </div>
              <textarea
                value={contextSentence}
                onChange={(e) => setContextSentence(e.target.value)}
                placeholder="Context sentence"
                rows={2}
                className="input"
                style={{ resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn btn-primary sans"
                style={{ flex: 1 }}
              >
                {saving ? "Saving…" : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={saving}
                className="btn sans"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              margin: "auto",
              textAlign: "center",
              width: "100%",
            }}
          >
            {hasSentence ? (
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 22,
                  lineHeight: 1.5,
                  color: "var(--ink)",
                  margin: "0 0 24px",
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
                  fontSize: 64,
                  fontWeight: 500,
                  letterSpacing: "-0.025em",
                  color: "var(--ink)",
                  lineHeight: 1,
                  marginBottom: 24,
                }}
              >
                {item.word.term}
              </div>
            )}

            {flipped ? (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    height: 1,
                    background: "var(--rule)",
                    width: 60,
                    margin: "0 auto 24px",
                  }}
                />
                <div
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 26,
                    fontWeight: 400,
                    color: "var(--ink)",
                    fontStyle: "italic",
                    marginBottom: 12,
                  }}
                >
                  {item.word.translation || "—"}
                </div>
                {item.word.notes && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--ink-faint)",
                      whiteSpace: "pre-wrap",
                      marginTop: 6,
                    }}
                  >
                    {item.word.notes}
                  </div>
                )}
              </div>
            ) : (
              <div
                className="mono"
                style={{
                  marginTop: 48,
                  fontSize: 11,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                }}
              >
                Click or press <span className="kbd">␣</span> to reveal
              </div>
            )}
          </div>
        )}
      </div>

      {/* Rating buttons */}
      <div style={{ marginTop: 24 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 10,
          }}
        >
          {RATINGS.map((r) => (
            <button
              key={r.rating}
              onClick={() => onRate(r.rating)}
              disabled={!flipped || editing}
              className="sans"
              style={{
                padding: "16px 14px 14px",
                background: "var(--paper-deep)",
                border: "1px solid var(--rule)",
                borderRadius: 8,
                cursor: flipped && !editing ? "pointer" : "default",
                opacity: flipped && !editing ? 1 : 0.4,
                textAlign: "left",
                transition: "all 120ms ease",
                position: "relative",
                overflow: "hidden",
                color: "var(--ink)",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: 3,
                  background: r.color,
                }}
              />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <div
                  className="display"
                  style={{
                    fontSize: 20,
                    fontWeight: 500,
                    color: "var(--ink)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {r.label}
                </div>
                <span className="kbd">{r.key}</span>
              </div>
              <div
                className="mono"
                style={{
                  marginTop: 6,
                  fontSize: 11,
                  color: "var(--ink-faint)",
                  letterSpacing: "0.06em",
                }}
              >
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
