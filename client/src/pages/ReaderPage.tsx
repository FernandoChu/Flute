import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { normalizeWord, WordStatus } from "shared";
import { apiFetch } from "../lib/api";
import { useWordStatuses } from "../hooks/useWordStatuses";
import { useKeybindings, matchKeybinding } from "../hooks/useKeybindings";
import TokenizedText from "../components/reader/TokenizedText";
import WordPopup from "../components/reader/WordPopup";
import PhrasePopup from "../components/reader/PhrasePopup";
import AudioPlayer from "../components/reader/AudioPlayer";

interface LessonDetail {
  id: string;
  title: string;
  textContent: string;
  audioUrl: string | null;
  collection: {
    id: string;
    title: string;
    sourceLanguageId: number;
    targetLanguageId: number;
    sourceLanguage?: { code: string };
    targetLanguage?: { code: string };
  };
}

export default function ReaderPage({ lessonId }: { lessonId: string }) {
  const [popup, setPopup] = useState<{
    term: string;
    element: HTMLElement;
  } | null>(null);
  const [phrasePopup, setPhrasePopup] = useState<{
    phrase: string;
    rect: DOMRect;
  } | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: () => apiFetch<{ data: LessonDetail }>(`/lessons/${lessonId}`),
  });

  const languageId = lesson?.data.collection.sourceLanguageId ?? null;
  const { getWord, updateWord, version: wordVersion } = useWordStatuses(languageId);

  // -- Custom whole-word selection via mousedown/mousemove/mouseup --
  const dragStartIdx = useRef<number | null>(null);
  const isDragging = useRef(false);

  function getTokenElements(): HTMLElement[] {
    if (!textContainerRef.current) return [];
    return Array.from(
      textContainerRef.current.querySelectorAll<HTMLElement>("[data-token-idx]"),
    );
  }

  function tokenIdxFromEvent(e: MouseEvent): number | null {
    const el = (e.target as HTMLElement).closest<HTMLElement>(
      "[data-token-idx]",
    );
    if (!el) return null;
    return Number(el.dataset.tokenIdx);
  }

  function applyHighlight(startIdx: number, endIdx: number) {
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    for (const el of getTokenElements()) {
      const idx = Number(el.dataset.tokenIdx);
      const inRange = idx >= lo && idx <= hi;
      el.classList.toggle("phrase-selected", inRange);
      el.classList.toggle("phrase-selected-start", inRange && idx === lo);
      el.classList.toggle("phrase-selected-end", inRange && idx === hi);
    }
  }

  function clearHighlight() {
    for (const el of getTokenElements()) {
      el.classList.remove(
        "phrase-selected",
        "phrase-selected-start",
        "phrase-selected-end",
      );
    }
  }

  function finalizeSelection() {
    const highlighted = getTokenElements().filter((el) =>
      el.classList.contains("phrase-selected"),
    );
    if (highlighted.length < 2) {
      clearHighlight();
      return;
    }

    // Only accept if there's more than one *word* token selected
    const wordTokens = highlighted.filter((el) => el.hasAttribute("data-word-token"));
    if (wordTokens.length < 2) {
      clearHighlight();
      return;
    }

    const phrase = highlighted.map((el) => el.textContent ?? "").join("");
    const trimmed = phrase.trim();
    if (!trimmed) {
      clearHighlight();
      return;
    }

    // Build a rect spanning all highlighted tokens
    const first = highlighted[0].getBoundingClientRect();
    const last = highlighted[highlighted.length - 1].getBoundingClientRect();
    const rect = new DOMRect(
      first.left,
      first.top,
      last.right - first.left,
      last.bottom - first.top,
    );

    setPopup(null);
    setPhrasePopup({ phrase: trimmed, rect });
  }

  useEffect(() => {
    const container = textContainerRef.current;
    if (!container) return;

    function onMouseDown(e: MouseEvent) {
      const idx = tokenIdxFromEvent(e);
      if (idx === null) return;

      // Clear any existing phrase highlight from a previous selection
      clearHighlight();

      // Begin tracking — we don't know yet if this is a click or drag
      dragStartIdx.current = idx;
      isDragging.current = false;
    }

    function onMouseMove(e: MouseEvent) {
      if (dragStartIdx.current === null) return;

      const idx = tokenIdxFromEvent(e);
      if (idx === null) return;

      // Start dragging once the cursor moves to a different token
      if (idx !== dragStartIdx.current) {
        isDragging.current = true;
      }

      if (isDragging.current) {
        // Prevent native selection while dragging
        window.getSelection()?.removeAllRanges();
        applyHighlight(dragStartIdx.current, idx);
      }
    }

    function onMouseUp(_e: MouseEvent) {
      if (isDragging.current) {
        finalizeSelection();
      }
      dragStartIdx.current = null;
      isDragging.current = false;
    }

    function onMouseOver(e: MouseEvent) {
      const idx = tokenIdxFromEvent(e);
      if (idx !== null) hoveredTokenIdxRef.current = idx;
    }

    container.addEventListener("mousedown", onMouseDown);
    container.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      container.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  });

  const closePhrasePopup = useCallback(() => {
    clearHighlight();
    setPhrasePopup(null);
  }, []);

  // --- Keybinding system ---
  const { bindings } = useKeybindings();
  const selectedIdxRef = useRef<number>(-1);
  const hoveredTokenIdxRef = useRef<number>(-1);

  // When popup opens via click, sync the selected index
  const syncSelectedIdx = useCallback((element: HTMLElement) => {
    const idx = element.dataset.tokenIdx;
    if (idx != null) selectedIdxRef.current = Number(idx);
  }, []);

  function getWordElements(): HTMLElement[] {
    if (!textContainerRef.current) return [];
    return Array.from(
      textContainerRef.current.querySelectorAll<HTMLElement>("[data-word-token]"),
    );
  }

  function selectWordElement(el: HTMLElement) {
    const term = el.textContent ?? "";
    el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    selectedIdxRef.current = Number(el.dataset.tokenIdx);
    closePhrasePopup();
    setPopup({ term, element: el });
  }

  function isSentenceBoundary(el: HTMLElement): boolean {
    return /[.!?]/.test(el.textContent ?? "");
  }

  function isParagraphBoundary(el: HTMLElement): boolean {
    return /\n/.test(el.textContent ?? "");
  }

  function extractSentence(anchorIdx: number): string {
    const allEls = getTokenElements();
    const pos = allEls.findIndex((el) => Number(el.dataset.tokenIdx) === anchorIdx);
    if (pos < 0) return "";

    // Scan backward for sentence boundary
    let start = 0;
    for (let i = pos - 1; i >= 0; i--) {
      if (isSentenceBoundary(allEls[i])) {
        start = i + 1;
        break;
      }
    }
    // Scan forward for sentence boundary (inclusive)
    let end = allEls.length - 1;
    for (let i = pos; i < allEls.length; i++) {
      if (isSentenceBoundary(allEls[i])) {
        end = i;
        break;
      }
    }
    return allEls
      .slice(start, end + 1)
      .map((el) => el.textContent ?? "")
      .join("")
      .trim();
  }

  function extractParagraph(anchorIdx: number): string {
    const allEls = getTokenElements();
    const pos = allEls.findIndex((el) => Number(el.dataset.tokenIdx) === anchorIdx);
    if (pos < 0) return "";

    // Scan backward for paragraph boundary (newline)
    let start = 0;
    for (let i = pos - 1; i >= 0; i--) {
      if (isParagraphBoundary(allEls[i])) {
        start = i + 1;
        break;
      }
    }
    // Scan forward for paragraph boundary
    let end = allEls.length - 1;
    for (let i = pos + 1; i < allEls.length; i++) {
      if (isParagraphBoundary(allEls[i])) {
        end = i - 1;
        break;
      }
    }
    return allEls
      .slice(start, end + 1)
      .map((el) => el.textContent ?? "")
      .join("")
      .trim();
  }

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const action = matchKeybinding(e.key, bindings);
      if (!action) return;
      e.preventDefault();

      const wordEls = getWordElements();
      if (wordEls.length === 0) return;

      // Find current position among word elements
      const curIdx = wordEls.findIndex(
        (el) => Number(el.dataset.tokenIdx) === selectedIdxRef.current,
      );

      switch (action) {
        case "deselect":
          setPopup(null);
          closePhrasePopup();
          selectedIdxRef.current = -1;
          break;

        case "prevWord": {
          const next = curIdx > 0 ? curIdx - 1 : wordEls.length - 1;
          selectWordElement(wordEls[next]);
          break;
        }
        case "nextWord": {
          const next = curIdx < wordEls.length - 1 ? curIdx + 1 : 0;
          selectWordElement(wordEls[next]);
          break;
        }

        case "prevUnknown": {
          // Search backward for a word with New status (0 or undefined)
          for (let i = 1; i <= wordEls.length; i++) {
            const idx = (curIdx - i + wordEls.length) % wordEls.length;
            const term = normalizeWord(wordEls[idx].textContent ?? "");
            const word = getWord(term);
            if (!word || word.status === WordStatus.New) {
              selectWordElement(wordEls[idx]);
              break;
            }
          }
          break;
        }
        case "nextUnknown": {
          for (let i = 1; i <= wordEls.length; i++) {
            const idx = (curIdx + i) % wordEls.length;
            const term = normalizeWord(wordEls[idx].textContent ?? "");
            const word = getWord(term);
            if (!word || word.status === WordStatus.New) {
              selectWordElement(wordEls[idx]);
              break;
            }
          }
          break;
        }

        case "prevSentence": {
          // Get all token elements, find sentence boundary before current position
          const allEls = getTokenElements();
          const curTokenIdx = selectedIdxRef.current >= 0 ? selectedIdxRef.current : 0;
          // Scan backward for sentence-ending punctuation
          for (let i = curTokenIdx - 1; i >= 0; i--) {
            const el = allEls[i];
            if (el && isSentenceBoundary(el)) {
              // Find first word token after this boundary
              for (let j = i + 1; j < allEls.length; j++) {
                if (allEls[j].hasAttribute("data-word-token")) {
                  selectWordElement(allEls[j]);
                  return;
                }
              }
            }
          }
          // No boundary found — go to first word
          if (wordEls.length > 0) selectWordElement(wordEls[0]);
          break;
        }
        case "nextSentence": {
          const allEls = getTokenElements();
          const curTokenIdx = selectedIdxRef.current >= 0 ? selectedIdxRef.current : 0;
          // Scan forward for sentence-ending punctuation
          for (let i = curTokenIdx + 1; i < allEls.length; i++) {
            const el = allEls[i];
            if (el && isSentenceBoundary(el)) {
              // Find first word token after this boundary
              for (let j = i + 1; j < allEls.length; j++) {
                if (allEls[j].hasAttribute("data-word-token")) {
                  selectWordElement(allEls[j]);
                  return;
                }
              }
            }
          }
          // No boundary found — go to last word
          if (wordEls.length > 0) selectWordElement(wordEls[wordEls.length - 1]);
          break;
        }

        // Status updates — only if a word is selected
        case "setStatus1":
          if (popup) updateWord(popup.term, { status: WordStatus.Learning1 });
          break;
        case "setStatus2":
          if (popup) updateWord(popup.term, { status: WordStatus.Learning2 });
          break;
        case "setStatus3":
          if (popup) updateWord(popup.term, { status: WordStatus.Learning3 });
          break;
        case "setStatus4":
          if (popup) updateWord(popup.term, { status: WordStatus.Learning4 });
          break;
        case "setStatusKnown":
          if (popup) updateWord(popup.term, { status: WordStatus.Known });
          break;
        case "setStatusIgnored":
          if (popup) updateWord(popup.term, { status: WordStatus.Ignored });
          break;

        // Copy actions — use hovered token position
        case "copySentence": {
          const text = extractSentence(hoveredTokenIdxRef.current);
          if (text) navigator.clipboard.writeText(text);
          break;
        }
        case "copyParagraph": {
          const text = extractParagraph(hoveredTokenIdxRef.current);
          if (text) navigator.clipboard.writeText(text);
          break;
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [bindings, popup, getWord, updateWord, closePhrasePopup]);

  const handleWordClick = useCallback(
    (term: string, element: HTMLElement) => {
      closePhrasePopup();
      syncSelectedIdx(element);
      setPopup((prev) => {
        // Toggle off if clicking the same word
        if (prev && normalizeWord(prev.term) === normalizeWord(term)) {
          selectedIdxRef.current = -1;
          return null;
        }
        return { term, element };
      });
    },
    [closePhrasePopup, syncSelectedIdx],
  );

  const handleUpdateWord = useCallback(
    async (data: {
      translation?: string;
      status?: number;
      notes?: string;
    }) => {
      if (!popup) return;
      await updateWord(popup.term, data);
    },
    [popup, updateWord],
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Loading lesson...</p>
      </div>
    );
  }

  if (!lesson?.data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">Lesson not found</p>
      </div>
    );
  }

  const { data: lessonData } = lesson;
  const currentWord = popup
    ? getWord(normalizeWord(popup.term))
    : undefined;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; {lessonData.collection.title}
        </Link>
        <h1 className="text-2xl font-bold mt-2">{lessonData.title}</h1>
      </div>

      {lessonData.audioUrl && <AudioPlayer src={lessonData.audioUrl} />}

      <div
        ref={textContainerRef}
        className="bg-white rounded-lg border border-gray-200 p-6 select-none"
      >
        <TokenizedText
          text={lessonData.textContent}
          getWord={getWord}
          wordVersion={wordVersion}
          onWordClick={handleWordClick}
        />
      </div>

      {popup && (
        <WordPopup
          term={popup.term}
          word={currentWord}
          anchorEl={popup.element}
          sourceLang={lessonData.collection.sourceLanguage?.code}
          targetLang={lessonData.collection.targetLanguage?.code}
          onUpdateWord={handleUpdateWord}
          onClose={() => setPopup(null)}
        />
      )}

      {phrasePopup && (
        <PhrasePopup
          phrase={phrasePopup.phrase}
          anchorRect={phrasePopup.rect}
          sourceLang={lessonData.collection.sourceLanguage?.code}
          targetLang={lessonData.collection.targetLanguage?.code}
          onClose={closePhrasePopup}
        />
      )}
    </div>
  );
}
