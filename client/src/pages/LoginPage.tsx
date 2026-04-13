import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../lib/api";

export default function LoginPage() {
  const { isLoggedIn, login, isLoggingIn } = useAuth();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () =>
      apiFetch<{ data: { id: string; username: string }[] }>("/auth/users"),
  });

  if (isLoggedIn) {
    return <Redirect to="/" />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  const handleQuickSelect = async (name: string) => {
    setError("");
    try {
      await login(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-8">
        <h1 className="text-3xl font-bold text-center mb-2">Flute</h1>
        <p className="text-gray-500 text-center mb-8">
          Enter your username to get started
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            minLength={2}
            maxLength={30}
            pattern="[a-zA-Z0-9_-]+"
            title="Letters, numbers, hyphens, and underscores only"
          />
          <button
            type="submit"
            disabled={isLoggingIn || !username.trim()}
            className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoggingIn ? "Entering..." : "Enter"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        {users?.data && users.data.length > 0 && (
          <div className="mt-8">
            <p className="text-sm text-gray-500 text-center mb-3">
              Or pick an existing user
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {users.data.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickSelect(u.username)}
                  disabled={isLoggingIn}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                >
                  {u.username}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
