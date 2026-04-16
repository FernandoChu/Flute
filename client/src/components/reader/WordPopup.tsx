import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { WordStatus } from "shared";
import type { Word } from "shared";
import { apiFetch } from "../../lib/api";

interface DictionaryLink {
  label: string;
  urlTemplate: string;
}

interface WordPopupProps {
  term: string;
  word: Word | undefined;
  anchorEl: HTMLElement;
  sourceLang?: string;
  targetLang?: string;
  dictionaryLinks?: DictionaryLink[];
  onUpdateWord: (data: {
    translation?: string;
    status?: number;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
}

const STATUS_BUTTONS = [
  { label: "1", value: WordStatus.Learning1, color: "bg-status-learning1" },
  { label: "2", value: WordStatus.Learning2, color: "bg-status-learning2" },
  { label: "3", value: WordStatus.Learning3, color: "bg-status-learning3" },
  { label: "4", value: WordStatus.Learning4, color: "bg-status-learning4" },
  { label: "K", value: WordStatus.Known, color: "bg-status-known-light" },
  { label: "X", value: WordStatus.Ignored, color: "bg-status-ignored" },
];

export default function WordPopup({
  term,
  word,
  anchorEl,
  sourceLang,
  targetLang,
  dictionaryLinks,
  onUpdateWord,
  onClose,
}: WordPopupProps) {
  const [translation, setTranslation] = useState(word?.translation ?? "");
  const [notes, setNotes] = useState(word?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    const rect = anchorEl.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8;
    let left = rect.left + window.scrollX;
    // Keep popup within viewport
    const popupWidth = 320;
    if (left + popupWidth > window.innerWidth) {
      left = window.innerWidth - popupWidth - 16;
    }
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
  }, [anchorEl, onClose]);

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

  const handleTranslate = async () => {
    if (!sourceLang || !targetLang) return;
    setTranslating(true);
    setTranslateError(null);
    try {
      const res = await apiFetch<{ data: { translation: string } }>(
        "/translate/word",
        {
          method: "POST",
          body: JSON.stringify({
            term,
            sourceLang,
            targetLang,
          }),
        },
      );
      setTranslation(res.data.translation);
    } catch (err: any) {
      setTranslateError(err.message || "Translation failed");
    } finally {
      setTranslating(false);
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

  return createPortal(
    <div
      ref={popupRef}
      className="absolute z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-4 w-80"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">{term}</h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          &times;
        </button>
      </div>

      <div className="mb-3">
        <div className="flex gap-1.5">
          <input
            type="text"
            value={translation}
            onChange={(e) => setTranslation(e.target.value)}
            placeholder="Translation"
            className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTranslation();
            }}
          />
          {sourceLang && targetLang && (
            <button
              onClick={handleTranslate}
              disabled={translating}
              className="px-2.5 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
              title="Auto-translate"
            >
              {translating ? "..." : "T"}
            </button>
          )}
        </div>
        {translateError && (
          <p className="text-xs text-red-500 mt-1">{translateError}</p>
        )}
      </div>

      <div className="mb-3">
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes"
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex gap-1.5">
        {STATUS_BUTTONS.map((btn) => (
          <button
            key={btn.value}
            onClick={() => handleStatusChange(btn.value)}
            disabled={saving}
            className={`flex-1 py-1.5 rounded text-sm font-medium ${btn.color} hover:opacity-80 transition-opacity disabled:opacity-50 ${
              word?.status === btn.value
                ? "ring-2 ring-blue-500"
                : ""
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {dictionaryLinks && dictionaryLinks.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-1.5">
          {dictionaryLinks.map((dict, i) => (
            <a
              key={i}
              href={dict.urlTemplate.replace("[FLUTE]", encodeURIComponent(term))}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
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
