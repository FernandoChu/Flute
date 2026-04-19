import { useSyncExternalStore, useCallback } from "react";

export type Theme = "paper" | "sepia" | "dark";
export type StatusViz = "underline" | "highlight" | "dot";
export type BodyFont = "serif" | "sans" | "mono";
export type ColWidth = "narrow" | "medium" | "wide";

export interface ReaderSettings {
  fontSize: number;
  fontFamily: string;
  textAlign: "left" | "justify";
  lineHeight: number;
  theme: Theme;
  statusViz: StatusViz;
  bodyFont: BodyFont;
  colWidth: ColWidth;
}

const STORAGE_KEY = "readerSettings";

const DEFAULTS: ReaderSettings = {
  fontSize: 18,
  fontFamily: "sans-serif",
  textAlign: "justify",
  lineHeight: 1.7,
  theme: "paper",
  statusViz: "underline",
  bodyFont: "serif",
  colWidth: "wide",
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
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return current;
}

export function useReaderSettings() {
  const settings = useSyncExternalStore(subscribe, getSnapshot);

  const update = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
      current = { ...current, [key]: value };
      save();
      notify();
    },
    [],
  );

  const reset = useCallback(() => {
    current = { ...DEFAULTS };
    save();
    notify();
  }, []);

  return { settings, update, reset };
}

export const FONT_FAMILY_FOR_BODY_FONT: Record<BodyFont, string> = {
  serif: "var(--font-body)",
  sans: "var(--font-sans)",
  mono: "var(--font-mono)",
};

export const COL_WIDTH_VAR: Record<ColWidth, string> = {
  narrow: "var(--col-narrow)",
  medium: "var(--col-med)",
  wide: "var(--col-wide)",
};
