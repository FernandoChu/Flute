import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../../lib/api";

interface PhrasePopupProps {
  phrase: string;
  anchorRect: DOMRect;
  sourceLang?: string;
  targetLang?: string;
  onClose: () => void;
}

export default function PhrasePopup({
  phrase,
  anchorRect,
  sourceLang,
  targetLang,
  onClose,
}: PhrasePopupProps) {
  const [translation, setTranslation] = useState("");
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const top = anchorRect.bottom + window.scrollY + 8;
    let left = anchorRect.left + window.scrollX;
    const popupWidth = 360;
    if (left + popupWidth > window.innerWidth) {
      left = window.innerWidth - popupWidth - 16;
    }
    if (left < 16) left = 16;
    setPosition({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const handleTranslate = async () => {
    if (!sourceLang || !targetLang) return;
    setTranslating(true);
    setError(null);
    try {
      const res = await apiFetch<{ data: { translation: string } }>(
        "/translate/sentence",
        {
          method: "POST",
          body: JSON.stringify({
            sentence: phrase,
            sourceLang,
            targetLang,
          }),
        },
      );
      setTranslation(res.data.translation);
    } catch (err: any) {
      setError(err.message || "Translation failed");
    } finally {
      setTranslating(false);
    }
  };

  return createPortal(
    <div
      ref={popupRef}
      className="absolute z-50 w-[360px] max-w-[360px] rounded-lg border border-rule bg-paper-deep p-4 shadow-[var(--shadow-lg)]"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <p className="m-0 flex-1 text-[13px] italic leading-[1.4] text-ink">
          {phrase}
        </p>
        <button
          onClick={onClose}
          className="btn btn-ghost px-1.5 py-0.5 text-[18px] leading-none text-ink-faint"
        >
          ×
        </button>
      </div>

      {translation && (
        <p className="mb-3 rounded-[5px] border border-rule-soft bg-paper-sunk px-3 py-2 text-[13px] leading-[1.4] text-ink">
          {translation}
        </p>
      )}

      {error && (
        <p className="mono mb-3 text-[11px] tracking-[0.04em] text-accent">
          {error}
        </p>
      )}

      {sourceLang && targetLang ? (
        <button
          onClick={handleTranslate}
          disabled={translating}
          className="btn sans w-full"
        >
          {translating
            ? "Translating…"
            : translation
              ? "Translate again"
              : "Translate"}
        </button>
      ) : (
        <p className="mono text-[10px] tracking-[0.04em] text-ink-faint">
          Language codes unavailable for translation.
        </p>
      )}
    </div>,
    document.body,
  );
}
