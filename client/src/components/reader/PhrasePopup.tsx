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
      style={{
        position: "absolute",
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
        width: 360,
        maxWidth: 360,
        zIndex: 50,
        background: "var(--paper-deep)",
        border: "1px solid var(--rule)",
        borderRadius: 8,
        boxShadow: "var(--shadow-lg)",
        padding: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          marginBottom: 12,
          gap: 8,
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "var(--ink)",
            lineHeight: 1.4,
            fontStyle: "italic",
            margin: 0,
            flex: 1,
          }}
        >
          {phrase}
        </p>
        <button
          onClick={onClose}
          className="btn btn-ghost"
          style={{
            padding: "2px 6px",
            fontSize: 18,
            lineHeight: 1,
            color: "var(--ink-faint)",
          }}
        >
          ×
        </button>
      </div>

      {translation && (
        <p
          style={{
            fontSize: 13,
            color: "var(--ink)",
            background: "var(--paper-sunk)",
            border: "1px solid var(--rule-soft)",
            borderRadius: 5,
            padding: "8px 12px",
            marginBottom: 12,
            lineHeight: 1.4,
          }}
        >
          {translation}
        </p>
      )}

      {error && (
        <p
          className="mono"
          style={{
            fontSize: 11,
            color: "var(--accent)",
            letterSpacing: "0.04em",
            marginBottom: 12,
          }}
        >
          {error}
        </p>
      )}

      {sourceLang && targetLang ? (
        <button
          onClick={handleTranslate}
          disabled={translating}
          className="btn sans"
          style={{ width: "100%" }}
        >
          {translating
            ? "Translating…"
            : translation
              ? "Translate again"
              : "Translate"}
        </button>
      ) : (
        <p
          className="mono"
          style={{
            fontSize: 10,
            color: "var(--ink-faint)",
            letterSpacing: "0.04em",
          }}
        >
          Language codes unavailable for translation.
        </p>
      )}
    </div>,
    document.body,
  );
}
