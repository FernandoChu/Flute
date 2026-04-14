import { useSyncExternalStore, useCallback } from "react";

export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  textAlign: "left" | "justify";
  lineHeight: number;
}

const STORAGE_KEY = "readerSettings";

const DEFAULTS: ReaderSettings = {
  fontSize: 18,
  fontFamily: "sans-serif",
  textAlign: "left",
  lineHeight: 1.75,
};

let current: ReaderSettings = load();
let listeners = new Set<() => void>();

function load(): ReaderSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(stored) };
  } catch {
    return { ...DEFAULTS };
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  return current;
}

export function useReaderSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot);

  const update = useCallback(<K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
    current = { ...current, [key]: value };
    save();
    notify();
  }, []);

  const reset = useCallback(() => {
    current = { ...DEFAULTS };
    save();
    notify();
  }, []);

  return { settings, update, reset };
}
