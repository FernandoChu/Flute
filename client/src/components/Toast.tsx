import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";

interface ToastItem {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <ToastNotification key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastNotification({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: number) => void;
}) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(item.id), 4000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss]);

  const bg = {
    success: "oklch(0.5 0.12 150)",
    error: "var(--accent)",
    info: "var(--ink)",
  }[item.type];

  return (
    <div
      className="sans"
      onClick={() => onDismiss(item.id)}
      style={{
        background: bg,
        color: "var(--paper)",
        padding: "10px 14px",
        borderRadius: 8,
        boxShadow: "var(--shadow-lg)",
        fontSize: 13,
        maxWidth: 380,
        pointerEvents: "auto",
        cursor: "pointer",
        animation: "fadeIn 0.2s ease-out",
      }}
    >
      {item.message}
    </div>
  );
}
