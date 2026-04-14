import { useMemo, useState, useCallback } from "react";
import { tokenize } from "shared";

const STORAGE_KEY = "readerParagraphsPerPage";
const DEFAULT_PER_PAGE = 8;

function loadPerPage(): number {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v ? Number(v) : DEFAULT_PER_PAGE;
  } catch {
    return DEFAULT_PER_PAGE;
  }
}

export interface PageData {
  text: string;
  tokenOffset: number;
}

export function useReaderPagination(fullText: string) {
  const [currentPage, setCurrentPage] = useState(0);
  const [perPage, setPerPageRaw] = useState(loadPerPage);

  const setPerPage = useCallback((n: number) => {
    setPerPageRaw(n);
    localStorage.setItem(STORAGE_KEY, String(n));
    setCurrentPage(0);
  }, []);

  // Split into paragraphs and compute token offsets
  const { pages, totalPages } = useMemo(() => {
    const paragraphs = fullText.split(/\n/);
    // Compute token count for each paragraph, accounting for the newline separator
    // The full text joined with \n: each paragraph except the last has a trailing \n
    const paraData: { text: string; tokenCount: number }[] = [];
    let running = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const paraText = paragraphs[i];
      const tokens = tokenize(paraText);
      paraData.push({ text: paraText, tokenCount: tokens.length });
      running += tokens.length;
      // Account for the \n separator token between paragraphs
      if (i < paragraphs.length - 1) {
        running += 1; // the \n itself becomes a token in the full tokenization
      }
    }

    // Group paragraphs into pages
    // Filter out empty paragraphs for grouping but keep them for offset tracking
    const pageList: PageData[] = [];
    let offset = 0;
    let nonEmptyCount = 0;
    let pageStartIdx = 0;

    for (let i = 0; i < paraData.length; i++) {
      if (paraData[i].text.trim()) nonEmptyCount++;
      if (nonEmptyCount >= perPage || i === paraData.length - 1) {
        // Compute token offset for this page's start paragraph
        let pageOffset = 0;
        for (let j = 0; j < pageStartIdx; j++) {
          pageOffset += paraData[j].tokenCount;
          if (j < paraData.length - 1) pageOffset += 1; // \n separator
        }
        const pageText = paragraphs.slice(pageStartIdx, i + 1).join("\n");
        pageList.push({ text: pageText, tokenOffset: pageOffset });
        pageStartIdx = i + 1;
        nonEmptyCount = 0;
      }
    }

    // Handle edge case: empty text
    if (pageList.length === 0) {
      pageList.push({ text: fullText, tokenOffset: 0 });
    }

    return { pages: pageList, totalPages: pageList.length };
  }, [fullText, perPage]);

  // Clamp current page
  const safePage = Math.min(currentPage, totalPages - 1);
  if (safePage !== currentPage) setCurrentPage(safePage);

  const page = pages[safePage] ?? pages[0];

  const goNext = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
  }, [totalPages]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  const goToPage = useCallback((n: number) => {
    setCurrentPage(Math.max(0, Math.min(n, totalPages - 1)));
  }, [totalPages]);

  return {
    page,
    currentPage: safePage,
    totalPages,
    goNext,
    goPrev,
    goToPage,
    perPage,
    setPerPage,
  };
}
