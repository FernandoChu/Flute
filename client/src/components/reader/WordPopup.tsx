import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { WordStatus } from "shared";
import type { Word } from "shared";

interface WordPopupProps {
  term: string;
  word: Word | undefined;
  anchorEl: HTMLElement;
  onUpdateWord: (data: {
    translation?: string;
    status?: number;
    notes?: string;
  }) => Promise<void>;
  onClose: () => void;
}

const STATUS_BUTTONS = [
  { label: "1", value: WordStatus.Learning1, color: "bg-yellow-100" },
  { label: "2", value: WordStatus.Learning2, color: "bg-yellow-200" },
  { label: "3", value: WordStatus.Learning3, color: "bg-yellow-300" },
  { label: "4", value: WordStatus.Learning4, color: "bg-yellow-400" },
  { label: "K", value: WordStatus.Known, color: "bg-green-200" },
  { label: "X", value: WordStatus.Ignored, color: "bg-gray-200" },
];

export default function WordPopup({
  term,
  word,
  anchorEl,
  onUpdateWord,
  onClose,
}: WordPopupProps) {
  const [translation, setTranslation] = useState(word?.translation ?? "");
  const [notes, setNotes] = useState(word?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

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
      style={{ top: position.top, left: position.left }}
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
        <input
          type="text"
          value={translation}
          onChange={(e) => setTranslation(e.target.value)}
          placeholder="Translation"
          className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveTranslation();
          }}
        />
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
    </div>,
    document.body,
  );
}
