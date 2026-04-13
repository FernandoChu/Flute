import { useRef, useCallback, useSyncExternalStore, useEffect } from "react";
import { apiFetch } from "../lib/api";
import type { Word } from "shared";

/**
 * External store for word statuses.
 * Avoids O(n) re-renders by letting each WordToken subscribe to its own term.
 */

interface WordMap {
  [normalizedTerm: string]: Word;
}

type Listener = () => void;

function createWordStore() {
  let words: WordMap = {};
  let version = 0;
  const listeners = new Set<Listener>();

  function getSnapshot() {
    return version;
  }

  function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify() {
    version++;
    listeners.forEach((l) => l());
  }

  function setAll(wordList: Word[]) {
    words = {};
    for (const w of wordList) {
      words[w.term] = w;
    }
    notify();
  }

  function setWord(term: string, word: Word) {
    words[term] = word;
    notify();
  }

  function getWord(term: string): Word | undefined {
    return words[term];
  }

  function getAllWords(): WordMap {
    return words;
  }

  return { getSnapshot, subscribe, notify, setAll, setWord, getWord, getAllWords };
}

export function useWordStatuses(languageId: number | null) {
  const storeRef = useRef(createWordStore());
  const store = storeRef.current;
  const loadedLangRef = useRef<number | null>(null);

  // Subscribe to store version to trigger re-render when any word changes
  const version = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

  useEffect(() => {
    if (!languageId || languageId === loadedLangRef.current) return;

    let cancelled = false;
    apiFetch<{ data: Word[] }>(`/words?languageId=${languageId}`).then(
      (res) => {
        if (!cancelled) {
          store.setAll(res.data);
          loadedLangRef.current = languageId;
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [languageId, store]);

  const getWord = useCallback(
    (term: string): Word | undefined => {
      return store.getWord(term.toLowerCase());
    },
    [store],
  );

  const updateWord = useCallback(
    async (
      term: string,
      data: { translation?: string; status?: number; notes?: string },
      existingWordId?: string,
    ): Promise<Word> => {
      const normalized = term.toLowerCase();
      const existing = store.getWord(normalized);

      if (existing || existingWordId) {
        const id = existingWordId || existing!.id;
        const res = await apiFetch<{ data: Word }>(`/words/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        });
        store.setWord(normalized, res.data);
        return res.data;
      } else {
        // Create new word
        const res = await apiFetch<{ data: Word }>("/words", {
          method: "POST",
          body: JSON.stringify({
            languageId,
            term: normalized,
            ...data,
          }),
        });
        store.setWord(normalized, res.data);
        return res.data;
      }
    },
    [languageId, store],
  );

  return { getWord, updateWord, getAllWords: store.getAllWords, version };
}
