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
      className="absolute z-50 w-[360px] overflow-hidden rounded-lg border border-rule bg-paper-deep shadow-[var(--shadow-lg)]"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {/* Header: term + close */}
      <div className="border-b border-rule-soft px-4 pb-2.5 pt-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="display min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[26px] font-medium tracking-[-0.01em] text-ink">
              {term}
            </div>
            {onPlay && (
              <button
                onClick={() => onPlay()}
                title="Play pronunciation"
                aria-label="Play pronunciation"
                className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-full border border-rule bg-paper p-0 text-ink"
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
            className="btn btn-ghost px-2 py-1 text-[18px] leading-none text-ink-faint"
            aria-label="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Translation */}
      <div className="border-b border-rule-soft px-4 py-3">
        <div className="mono mb-1.5 text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          Translation
        </div>
        <input
          type="text"
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          placeholder="Add a translation…"
          className="input text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveTranslation();
          }}
        />
      </div>

      {/* Status row */}
      <div className="px-4 py-3">
        <div className="mono mb-2 flex justify-between text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          <span>Status</span>
          <span className="text-ink-faint">1–4 · k · x</span>
        </div>
        <div className="flex gap-1">
          {STATUS_BUTTONS.map((st) => {
            const active = st.key === currentStatus;
            return (
              <button
                key={st.key}
                onClick={() => handleStatusChange(st.key)}
                disabled={saving}
                className={`sans inline-flex flex-1 items-center justify-center gap-1 rounded-[5px] border py-2 text-[12px] font-medium transition-all duration-100 ${
                  active
                    ? "border-ink bg-ink text-paper"
                    : "border-rule bg-paper text-ink-soft"
                } ${saving ? "cursor-default opacity-60" : "cursor-pointer"}`}
                title={`Status ${st.short}`}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full"
                  style={{
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
      <div className="px-4 pb-3.5">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add a note…"
          rows={2}
          className="sans w-full resize-none rounded-[5px] border border-rule bg-paper px-2.5 py-2 text-[13px] leading-[1.4] text-ink"
        />
      </div>

      {dictionaryLinks && dictionaryLinks.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-rule-soft px-4 pb-3.5 pt-2.5">
          {dictionaryLinks.map((dict, i) => (
            <a
              key={i}
              href={dict.urlTemplate.replace(
                "[FLUTE]",
                encodeURIComponent(term),
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="chip no-underline"
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
