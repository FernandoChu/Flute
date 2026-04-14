import { useState, useCallback, useRef, useEffect } from "react";

export interface PhraseSelection {
  phrase: string;
  rect: DOMRect;
  anchorWordIdx: number;
}

function getTokenElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>("[data-token-idx]"),
  );
}

function tokenIdxFromEvent(e: MouseEvent): number | null {
  const el = (e.target as HTMLElement).closest<HTMLElement>(
    "[data-token-idx]",
  );
  if (!el) return null;
  return Number(el.dataset.tokenIdx);
}

export function useTextSelection(
  textContainerRef: React.RefObject<HTMLDivElement | null>,
  onClearWordPopup: () => void,
) {
  const [phrasePopup, setPhrasePopup] = useState<PhraseSelection | null>(null);
  const hoveredTokenIdxRef = useRef<number>(-1);
  const dragStartIdx = useRef<number | null>(null);
  const isDragging = useRef(false);

  function applyHighlight(container: HTMLElement, startIdx: number, endIdx: number) {
    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    for (const el of getTokenElements(container)) {
      const idx = Number(el.dataset.tokenIdx);
      const inRange = idx >= lo && idx <= hi;
      el.classList.toggle("phrase-selected", inRange);
      el.classList.toggle("phrase-selected-start", inRange && idx === lo);
      el.classList.toggle("phrase-selected-end", inRange && idx === hi);
    }
  }

  function clearHighlightFrom(container: HTMLElement) {
    for (const el of getTokenElements(container)) {
      el.classList.remove(
        "phrase-selected",
        "phrase-selected-start",
        "phrase-selected-end",
        "inline-translation-space",
      );
    }
  }

  const clearHighlight = useCallback(() => {
    if (textContainerRef.current) {
      clearHighlightFrom(textContainerRef.current);
    }
  }, [textContainerRef]);

  const closePhrasePopup = useCallback(() => {
    clearHighlight();
    setPhrasePopup(null);
  }, [clearHighlight]);

  useEffect(() => {
    const container = textContainerRef.current;
    if (!container) return;

    function finalizeSelection() {
      const highlighted = getTokenElements(container!).filter((el) =>
        el.classList.contains("phrase-selected"),
      );
      if (highlighted.length < 2) {
        clearHighlightFrom(container!);
        return;
      }

      const wordTokens = highlighted.filter((el) => el.hasAttribute("data-word-token"));
      if (wordTokens.length < 2) {
        clearHighlightFrom(container!);
        return;
      }

      const phrase = highlighted.map((el) => el.textContent ?? "").join("");
      const trimmed = phrase.trim();
      if (!trimmed) {
        clearHighlightFrom(container!);
        return;
      }

      // Add spacer to first token so the line expands to fit the translation
      highlighted[0].classList.add("inline-translation-space");

      // Compute rect after spacer is applied (getBoundingClientRect forces reflow)
      const first = highlighted[0].getBoundingClientRect();
      const last = highlighted[highlighted.length - 1].getBoundingClientRect();
      const rect = new DOMRect(
        first.left,
        first.top,
        last.right - first.left,
        last.bottom - first.top,
      );

      const anchorWordIdx = Number(wordTokens[0].dataset.tokenIdx);

      onClearWordPopup();
      setPhrasePopup({ phrase: trimmed, rect, anchorWordIdx });
    }

    function onMouseDown(e: MouseEvent) {
      if (e.button !== 0) return; // Only handle left-click
      const idx = tokenIdxFromEvent(e);
      if (idx === null) {
        // Clicking whitespace dismisses word and phrase selections
        onClearWordPopup();
        clearHighlightFrom(container!);
        setPhrasePopup(null);
        return;
      }
      clearHighlightFrom(container!);
      dragStartIdx.current = idx;
      isDragging.current = false;
    }

    function onMouseMove(e: MouseEvent) {
      if (dragStartIdx.current === null) return;
      const idx = tokenIdxFromEvent(e);
      if (idx === null) return;
      if (idx !== dragStartIdx.current) {
        isDragging.current = true;
      }
      if (isDragging.current) {
        window.getSelection()?.removeAllRanges();
        applyHighlight(container!, dragStartIdx.current, idx);
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

  return { phrasePopup, closePhrasePopup, hoveredTokenIdxRef };
}
