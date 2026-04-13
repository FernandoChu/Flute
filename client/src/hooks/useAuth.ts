import { useState, useCallback, useSyncExternalStore } from "react";
import { apiFetch } from "../lib/api";

const STORAGE_KEY = "username";

function getSnapshot(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}

function subscribe(callback: () => void): () => void {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function useAuth() {
  const username = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const login = useCallback(async (name: string) => {
    setIsLoggingIn(true);
    try {
      await apiFetch<{ data: { id: string; username: string } }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({ username: name }),
        },
      );
      localStorage.setItem(STORAGE_KEY, name.trim().toLowerCase());
      // Dispatch storage event so other tabs/hooks pick it up
      window.dispatchEvent(new Event("storage"));
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("storage"));
  }, []);

  return { username, isLoggedIn: !!username, login, logout, isLoggingIn };
}
