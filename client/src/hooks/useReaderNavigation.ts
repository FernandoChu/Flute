import { useRef, useCallback, useEffect } from "react";
import { normalizeWord, WordStatus } from "shared";
import type { Word } from "shared";
import { useKeybindings, matchKeybinding } from "./useKeybindings";

interface Options {
  popup: { term: string; element: HTMLElement } | null;
  setPopup: (p: { term: string; element: HTMLElement } | null) => void;
  closePhrasePopup: () => void;
  hoveredTokenIdxRef: React.RefObject<number>;
  getWord: (term: string) => Word | undefined;
  updateWord: (term: string, data: { translation?: string; status?: number; notes?: string }) => Promise<unknown>;
  onExpandPopup?: () => void;
  onToggleTranslations?: () => void;
  onPrevPage?: () => void;
  onNextPage?: () => void;
  onPlayTts?: () => void;
}

function getTokenElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>("[data-token-idx]"),
  );
}

function getWordElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>("[data-word-token]"),
  );
}

function isSentenceBoundary(el: HTMLElement): boolean {
  return /[.!?]/.test(el.textContent ?? "");
}

function isParagraphBoundary(el: HTMLElement): boolean {
  return /\n/.test(el.textContent ?? "");
}

function extractSentence(container: HTMLElement, anchorIdx: number): string {
  const allEls = getTokenElements(container);
  const pos = allEls.findIndex((el) => Number(el.dataset.tokenIdx) === anchorIdx);
  if (pos < 0) return "";

  let start = 0;
  for (let i = pos - 1; i >= 0; i--) {
    if (isSentenceBoundary(allEls[i])) {
      start = i + 1;
      break;
    }
  }
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

function extractParagraph(container: HTMLElement, anchorIdx: number): string {
  const allEls = getTokenElements(container);
  const pos = allEls.findIndex((el) => Number(el.dataset.tokenIdx) === anchorIdx);
  if (pos < 0) return "";

  let start = 0;
  for (let i = pos - 1; i >= 0; i--) {
    if (isParagraphBoundary(allEls[i])) {
      start = i + 1;
      break;
    }
  }
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

export function useReaderNavigation(
  textContainerRef: React.RefObject<HTMLDivElement | null>,
  { popup, setPopup, closePhrasePopup, hoveredTokenIdxRef, getWord, updateWord, onExpandPopup, onToggleTranslations, onPrevPage, onNextPage, onPlayTts }: Options,
) {
  const { bindings } = useKeybindings();
  const selectedIdxRef = useRef<number>(-1);

  const syncSelectedIdx = useCallback((element: HTMLElement) => {
    const idx = element.dataset.tokenIdx;
    if (idx != null) selectedIdxRef.current = Number(idx);
  }, []);

  useEffect(() => {
    const container = textContainerRef.current;
    if (!container) return;

    function selectWordElement(el: HTMLElement) {
      const term = el.dataset.wordText ?? el.textContent ?? "";
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      selectedIdxRef.current = Number(el.dataset.tokenIdx);
      closePhrasePopup();
      setPopup({ term, element: el });
    }

    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const action = matchKeybinding(e.key, bindings);
      if (!action) return;
      e.preventDefault();

      const wordEls = getWordElements(container!);
      if (wordEls.length === 0) return;

      const curIdx = wordEls.findIndex(
        (el) => Number(el.dataset.tokenIdx) === selectedIdxRef.current,
      );

      switch (action) {
        case "toggleTranslations":
          if (onToggleTranslations) onToggleTranslations();
          break;

        case "prevPage":
          if (onPrevPage) onPrevPage();
          break;

        case "nextPage":
          if (onNextPage) onNextPage();
          break;

        case "expandPopup":
          if (popup && onExpandPopup) onExpandPopup();
          break;

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
          const allEls = getTokenElements(container!);
          const curTokenIdx = selectedIdxRef.current >= 0 ? selectedIdxRef.current : 0;
          for (let i = curTokenIdx - 1; i >= 0; i--) {
            const el = allEls[i];
            if (el && isSentenceBoundary(el)) {
              for (let j = i + 1; j < allEls.length; j++) {
                if (allEls[j].hasAttribute("data-word-token")) {
                  selectWordElement(allEls[j]);
                  return;
                }
              }
            }
          }
          if (wordEls.length > 0) selectWordElement(wordEls[0]);
          break;
        }
        case "nextSentence": {
          const allEls = getTokenElements(container!);
          const curTokenIdx = selectedIdxRef.current >= 0 ? selectedIdxRef.current : 0;
          for (let i = curTokenIdx + 1; i < allEls.length; i++) {
            const el = allEls[i];
            if (el && isSentenceBoundary(el)) {
              for (let j = i + 1; j < allEls.length; j++) {
                if (allEls[j].hasAttribute("data-word-token")) {
                  selectWordElement(allEls[j]);
                  return;
                }
              }
            }
          }
          if (wordEls.length > 0) selectWordElement(wordEls[wordEls.length - 1]);
          break;
        }

        case "setStatus1":
        case "setStatus2":
        case "setStatus3":
        case "setStatus4":
        case "setStatusKnown":
        case "setStatusIgnored": {
          let term: string | undefined;
          const hoveredEl = wordEls.find(
            (el) => Number(el.dataset.tokenIdx) === hoveredTokenIdxRef.current,
          );
          if (hoveredEl) term = hoveredEl.dataset.wordText ?? hoveredEl.textContent ?? "";
          if (!term) term = popup?.term;
          if (!term) break;
          const statusMap: Record<string, number> = {
            setStatus1: WordStatus.Learning1,
            setStatus2: WordStatus.Learning2,
            setStatus3: WordStatus.Learning3,
            setStatus4: WordStatus.Learning4,
            setStatusKnown: WordStatus.Known,
            setStatusIgnored: WordStatus.Ignored,
          };
          updateWord(term, { status: statusMap[action] });
          break;
        }

        case "playTts": {
          if (onPlayTts) onPlayTts();
          break;
        }

        case "copySentence": {
          const text = extractSentence(container!, hoveredTokenIdxRef.current);
          if (text) navigator.clipboard.writeText(text);
          break;
        }
        case "copyParagraph": {
          const text = extractParagraph(container!, hoveredTokenIdxRef.current);
          if (text) navigator.clipboard.writeText(text);
          break;
        }
      }
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [bindings, popup, getWord, updateWord, closePhrasePopup, setPopup, textContainerRef, hoveredTokenIdxRef, onExpandPopup, onToggleTranslations, onPrevPage, onNextPage, onPlayTts]);

  return { selectedIdxRef, syncSelectedIdx };
}
