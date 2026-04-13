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
  { popup, setPopup, closePhrasePopup, hoveredTokenIdxRef, getWord, updateWord }: Options,
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
      const term = el.textContent ?? "";
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
  }, [bindings, popup, getWord, updateWord, closePhrasePopup, setPopup, textContainerRef, hoveredTokenIdxRef]);

  return { selectedIdxRef, syncSelectedIdx };
}
