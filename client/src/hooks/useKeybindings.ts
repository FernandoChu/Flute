import { useSyncExternalStore, useCallback } from "react";

export interface KeyBinding {
  action: string;
  label: string;
  group: "navigation" | "status" | "copy";
  key: string;
  enabled: boolean;
}

const DEFAULT_BINDINGS: KeyBinding[] = [
  // Navigation
  { action: "deselect", label: "Deselect all words", group: "navigation", key: "Escape", enabled: true },
  { action: "prevWord", label: "Move to previous word", group: "navigation", key: "ArrowLeft", enabled: true },
  { action: "nextWord", label: "Move to next word", group: "navigation", key: "ArrowRight", enabled: true },
  { action: "prevUnknown", label: "Move to previous unknown word", group: "navigation", key: "", enabled: false },
  { action: "nextUnknown", label: "Move to next unknown word", group: "navigation", key: "", enabled: false },
  { action: "prevSentence", label: "Move to previous sentence", group: "navigation", key: "", enabled: false },
  { action: "nextSentence", label: "Move to next sentence", group: "navigation", key: "", enabled: false },
  { action: "expandPopup", label: "Open word details", group: "navigation", key: "Enter", enabled: true },
  // Status
  { action: "setStatus1", label: "Set status to 1", group: "status", key: "1", enabled: true },
  { action: "setStatus2", label: "Set status to 2", group: "status", key: "2", enabled: true },
  { action: "setStatus3", label: "Set status to 3", group: "status", key: "3", enabled: true },
  { action: "setStatus4", label: "Set status to 4", group: "status", key: "4", enabled: true },
  { action: "setStatusKnown", label: "Set status to Known", group: "status", key: "5", enabled: true },
  { action: "setStatusIgnored", label: "Set status to Ignored", group: "status", key: "6", enabled: true },
  // Copy
  { action: "copySentence", label: "Copy hovered sentence", group: "copy", key: "c", enabled: true },
  { action: "copyParagraph", label: "Copy hovered paragraph", group: "copy", key: "C", enabled: true },
];

const STORAGE_KEY = "readerKeybindings";

let bindings: KeyBinding[] = loadBindings();
let listeners = new Set<() => void>();

function loadBindings(): KeyBinding[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_BINDINGS.map((b) => ({ ...b }));
    const parsed: KeyBinding[] = JSON.parse(stored);
    // Merge with defaults: keep stored values but add any new actions
    return DEFAULT_BINDINGS.map((def) => {
      const saved = parsed.find((s) => s.action === def.action);
      return saved ? { ...def, key: saved.key, enabled: saved.enabled } : { ...def };
    });
  } catch {
    return DEFAULT_BINDINGS.map((b) => ({ ...b }));
  }
}

function saveBindings() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings));
}

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  return bindings;
}

export function useKeybindings() {
  const current = useSyncExternalStore(subscribe, getSnapshot);

  const updateBinding = useCallback((action: string, update: Partial<Pick<KeyBinding, "key" | "enabled">>) => {
    bindings = bindings.map((b) =>
      b.action === action ? { ...b, ...update } : b
    );
    saveBindings();
    notify();
  }, []);

  const resetDefaults = useCallback(() => {
    bindings = DEFAULT_BINDINGS.map((b) => ({ ...b }));
    saveBindings();
    notify();
  }, []);

  return { bindings: current, updateBinding, resetDefaults };
}

/** Get the action for a key event, or null if no enabled binding matches */
export function matchKeybinding(key: string, currentBindings: KeyBinding[]): string | null {
  const match = currentBindings.find((b) => b.enabled && b.key && b.key === key);
  return match?.action ?? null;
}
