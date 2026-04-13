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
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-90"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
        maxWidth: 360,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="font-medium text-sm text-gray-800 leading-snug pr-2">
          {phrase}
        </p>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0"
        >
          &times;
        </button>
      </div>

      {translation && (
        <p className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2 mb-3">
          {translation}
        </p>
      )}

      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      {sourceLang && targetLang && (
        <button
          onClick={handleTranslate}
          disabled={translating}
          className="w-full py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
        >
          {translating
            ? "Translating..."
            : translation
              ? "Translate again"
              : "Translate"}
        </button>
      )}

      {!sourceLang || !targetLang ? (
        <p className="text-xs text-gray-400">
          Language codes unavailable for translation.
        </p>
      ) : null}
    </div>,
    document.body,
  );
}
