import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { WordStatus } from "shared";
import type { Word } from "shared";

interface DictionaryLink {
  label: string;
  urlTemplate: string;
}

interface WordPopupProps {
  term: string;
  word: Word | undefined;
  anchorEl: HTMLElement;
  dictionaryLinks?: DictionaryLink[];
  onUpdateWord: (data: {
    translation?: string;
    status?: number;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
  onPlay?: () => void;
}

const STATUS_BUTTONS: { key: number; short: string; hue: string }[] = [
  { key: WordStatus.New, short: "N", hue: "var(--st-new)" },
  { key: WordStatus.Learning1, short: "1", hue: "var(--st-l1)" },
  { key: WordStatus.Learning2, short: "2", hue: "var(--st-l2)" },
  { key: WordStatus.Learning3, short: "3", hue: "var(--st-l3)" },
  { key: WordStatus.Learning4, short: "4", hue: "var(--st-l4)" },
  { key: WordStatus.Known, short: "K", hue: "var(--st-known)" },
  { key: WordStatus.Ignored, short: "×", hue: "var(--st-ignored)" },
];

export default function WordPopup({
  term,
  word,
  anchorEl,
  dictionaryLinks,
  onUpdateWord,
  onClose,
  onPlay,
}: WordPopupProps) {
  const [translation, setTranslation] = useState(word?.translation ?? "");
  const [notes, setNotes] = useState(word?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(
    null,
  );

  const closeRef = useRef<() => void>(() => {});
  closeRef.current = () => {
    const originalTranslation = word?.translation ?? "";
    const originalNotes = word?.notes ?? "";
    if (translation !== originalTranslation || notes !== originalNotes) {
      onUpdateWord({
        translation: translation || undefined,
        notes: notes || undefined,
        status: word?.status ?? WordStatus.Learning1,
      }).catch(() => {});
    }
    onClose();
  };

  useEffect(() => {
    const rect = anchorEl.getBoundingClientRect();
    const popupWidth = 360;
    const top = rect.bottom + window.scrollY + 10;
    let left = rect.left + window.scrollX + rect.width / 2 - popupWidth / 2;
    if (left + popupWidth > window.innerWidth - 16)
      left = window.innerWidth - popupWidth - 16;
    if (left < 16) left = 16;
    setPosition({ top, left });
  }, [anchorEl]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        !anchorEl.contains(e.target as Node)
      ) {
        closeRef.current();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") closeRef.current();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [anchorEl]);

  const handleStatusChange = async (status: number) => {
    setSaving(true);
    try {
      await onUpdateWord({
        status,
        translation: translation || undefined,
        notes: notes || undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTranslation = async () => {
    setSaving(true);
    try {
      await onUpdateWord({
        translation,
        notes: notes || undefined,
        status: word?.status ?? WordStatus.Learning1,
      });
    } finally {
      setSaving(false);
    }
  };

  const currentStatus = word?.status ?? WordStatus.New;

  return createPortal(
    <div
      ref={popupRef}
      style={{
        position: "absolute",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        width: 360,
        zIndex: 50,
        visibility: position ? "visible" : "hidden",
        background: "var(--paper-deep)",
        border: "1px solid var(--rule)",
        borderRadius: 8,
        boxShadow: "var(--shadow-lg)",
        overflow: "hidden",
      }}
    >
      {/* Header: term + close */}
      <div
        style={{
          padding: "14px 16px 10px",
          borderBottom: "1px solid var(--rule-soft)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minWidth: 0,
              flex: 1,
            }}
          >
            <div
              className="display"
              style={{
                fontSize: 26,
                fontWeight: 500,
                letterSpacing: "-0.01em",
                color: "var(--ink)",
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {term}
            </div>
            {onPlay && (
              <button
                onClick={() => onPlay()}
                title="Play pronunciation"
                aria-label="Play pronunciation"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: "1px solid var(--rule)",
                  background: "var(--paper)",
                  color: "var(--ink)",
                  cursor: "pointer",
                  padding: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M3 6 H5 L9 3 V13 L5 10 H3 Z"
                    fill="currentColor"
                  />
                  <path
                    d="M11 6 Q12.5 8 11 10"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M12.5 4.5 Q15 8 12.5 11.5"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </button>
            )}
          </div>
          <button
            onClick={() => closeRef.current()}
            className="btn btn-ghost"
            style={{
              padding: "4px 8px",
              fontSize: 18,
              lineHeight: 1,
              color: "var(--ink-faint)",
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Translation */}
      <div
        style={{
          padding: "12px 16px",
          borderBottom: "1px solid var(--rule-soft)",
        }}
      >
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
          placeholder="Add a translation…"
          className="input"
          style={{ fontSize: 14 }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveTranslation();
          }}
        />
      </div>

      {/* Status row */}
      <div style={{ padding: "12px 16px" }}>
        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--ink-faint)",
            textTransform: "uppercase",
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <span>Status</span>
          <span style={{ color: "var(--ink-faint)" }}>1–4 · k · x</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {STATUS_BUTTONS.map((st) => {
            const active = st.key === currentStatus;
            return (
              <button
                key={st.key}
                onClick={() => handleStatusChange(st.key)}
                disabled={saving}
                className="sans"
                style={{
                  flex: 1,
                  padding: "8px 0",
                  border: active
                    ? "1px solid var(--ink)"
                    : "1px solid var(--rule)",
                  borderRadius: 5,
                  background: active ? "var(--ink)" : "var(--paper)",
                  color: active ? "var(--paper)" : "var(--ink-soft)",
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: saving ? "default" : "pointer",
                  opacity: saving ? 0.6 : 1,
                  transition: "all 100ms ease",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
                title={`Status ${st.short}`}
              >
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: st.hue,
                    opacity: st.key === WordStatus.Known ? 0 : 1,
                  }}
                />
                {st.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notes */}
      <div style={{ padding: "0 16px 14px" }}>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="sans"
          style={{
            width: "100%",
            resize: "none",
            background: "var(--paper)",
            border: "1px solid var(--rule)",
            borderRadius: 5,
            padding: "8px 10px",
            fontSize: 13,
            color: "var(--ink)",
            lineHeight: 1.4,
          }}
        />
      </div>

      {dictionaryLinks && dictionaryLinks.length > 0 && (
        <div
          style={{
            padding: "10px 16px 14px",
            borderTop: "1px solid var(--rule-soft)",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          {dictionaryLinks.map((dict, i) => (
            <a
              key={i}
              href={dict.urlTemplate.replace(
                "[FLUTE]",
                encodeURIComponent(term),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="chip"
              style={{ textDecoration: "none" }}
            >
              {dict.label} ↗
            </a>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
