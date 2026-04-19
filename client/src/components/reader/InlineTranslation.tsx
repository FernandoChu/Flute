import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { apiFetch } from "../../lib/api";

interface Props {
  text: string;
  type: "word" | "phrase";
  existingTranslation?: string | null;
  sourceLang?: string;
  targetLang?: string;
  anchorEl?: HTMLElement;
  anchorRect?: DOMRect;
  onClick?: () => void;
  onTranslated?: (translation: string) => void;
}

export default function InlineTranslation({
  text,
  type,
  existingTranslation,
  sourceLang,
  targetLang,
  anchorEl,
  anchorRect: anchorRectProp,
  onClick,
  onTranslated,
}: Props) {
  const [translation, setTranslation] = useState<string | null>(
    existingTranslation ?? null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (existingTranslation != null) {
      setTranslation(existingTranslation);
      setLoading(false);
      onTranslated?.(existingTranslation);
      return;
    }
    if (!sourceLang || !targetLang) return;

    setLoading(true);
    setTranslation(null);

    const endpoint =
      type === "word" ? "/translate/word" : "/translate/sentence";
    const body =
      type === "word"
        ? { term: text, sourceLang, targetLang }
        : { sentence: text, sourceLang, targetLang };

    let cancelled = false;
    apiFetch<{ data: { translation: string } }>(endpoint, {
      method: "POST",
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!cancelled) {
          setTranslation(res.data.translation);
          onTranslated?.(res.data.translation);
        }
      })
      .catch(() => {
        if (!cancelled) setTranslation(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [text, type, existingTranslation, sourceLang, targetLang]);

  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const rect = anchorRectProp ?? anchorEl?.getBoundingClientRect();
    if (!rect) return;
    // Position above the green pill (in the margin space created by margin-top)
    // Leave room for the upward-pointing caret (7px)
    setPosition({
      top: rect.top + window.scrollY - 7,
      left: rect.left + window.scrollX + rect.width / 2,
    });
  }, [anchorEl, anchorRectProp]);

  if (!position) return null;

  const content = loading ? "\u2026" : translation;
  if (!content) return null;

  return createPortal(
    <div
      className={`absolute z-50 -translate-x-1/2 -translate-y-full ${onClick ? "cursor-pointer hover:opacity-80" : ""}`}
      style={{
        top: position.top,
        left: position.left,
      }}
      onClick={onClick}
    >
      <span className="whitespace-nowrap font-body text-base italic text-accent">
        {content}
      </span>
      <div className="absolute left-1/2 top-full h-0 w-0 -translate-x-1/2 border-x-[7px] border-b-[7px] border-x-transparent border-b-accent" />
    </div>,
    document.body,
  );
}
