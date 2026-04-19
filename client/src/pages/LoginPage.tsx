import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../lib/api";

function FluteMark({ size = 30 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
      }}
    >
      <div style={{ width: 2, height: size * 0.75, background: "var(--ink)", borderRadius: 2 }} />
      <div
        style={{
          position: "absolute",
          top: size * 0.22,
          left: size * 0.5 + 4,
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: "var(--accent)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: size * 0.42,
          left: size * 0.5 + 4,
          width: 5,
          height: 5,
          borderRadius: "50%",
          border: "1.2px solid var(--ink)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: size * 0.62,
          left: size * 0.5 + 4,
          width: 5,
          height: 5,
          borderRadius: "50%",
          border: "1.2px solid var(--ink)",
        }}
      />
    </div>
  );
}

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
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        background: "var(--paper)",
        position: "relative",
        zIndex: 1,
      }}
    >
      {/* Left: brand pane */}
      <div
        style={{
          padding: "64px 72px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1px solid var(--rule)",
          background: "var(--paper-deep)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <FluteMark />
          <span
            className="display"
            style={{
              fontSize: 24,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "var(--ink)",
            }}
          >
            Flute
          </span>
        </div>

        <div style={{ position: "relative", zIndex: 2 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              marginBottom: 16,
            }}
          >
            A reading-first language app
          </div>
          <h1
            className="display"
            style={{
              margin: 0,
              fontSize: 68,
              fontWeight: 400,
              letterSpacing: "-0.025em",
              lineHeight: 1.02,
              color: "var(--ink)",
            }}
          >
            Read your way
            <br />
            <span style={{ fontStyle: "italic" }}>into</span> a language.
          </h1>
          <p
            style={{
              marginTop: 24,
              maxWidth: 440,
              fontSize: 17,
              lineHeight: 1.55,
              color: "var(--ink-soft)",
            }}
          >
            Import any text — a novel, a subtitle file — and learn by doing.
            Click words for instant translation, generate pronunciation for any
            word or sentence, and review with spaced repetition.{" "}
            <span style={{ fontStyle: "italic" }}>
              Learn by reading the texts you already love.
            </span>
          </p>
        </div>

        <div
          className="mono"
          style={{
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--ink-faint)",
            textTransform: "uppercase",
          }}
        >
          self-hosted · MIT
        </div>
      </div>

      {/* Right: picker */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 64,
        }}
      >
        <div style={{ width: "100%", maxWidth: 400 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              letterSpacing: "0.18em",
              color: "var(--ink-faint)",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Sign in · username only
          </div>
          <div
            className="display"
            style={{
              fontSize: 32,
              fontWeight: 500,
              letterSpacing: "-0.02em",
              marginBottom: 28,
              color: "var(--ink)",
            }}
          >
            Who's reading?
          </div>

          {users?.data && users.data.length > 0 && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                marginBottom: 24,
              }}
            >
              {users.data.map((u) => (
                <button
                  key={u.id}
                  onClick={() => handleQuickSelect(u.username)}
                  disabled={isLoggingIn}
                  className="sans"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "12px 16px",
                    background: "transparent",
                    border: "1px solid var(--rule)",
                    borderRadius: 10,
                    cursor: "pointer",
                    textAlign: "left",
                    color: "var(--ink)",
                    fontSize: 14,
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: "var(--paper-sunk)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-display)",
                      fontWeight: 600,
                      fontSize: 15,
                      color: "var(--ink-soft)",
                      border: "1px solid var(--rule)",
                    }}
                  >
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--ink)",
                      }}
                    >
                      {u.username}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 14,
              color: "var(--ink-faint)",
            }}
          >
            <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
            <span
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              or new
            </span>
            <div style={{ flex: 1, height: 1, background: "var(--rule)" }} />
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="new username"
              className="input"
              style={{ flex: 1, padding: "12px 14px", fontSize: 14 }}
              autoFocus
              minLength={2}
              maxLength={30}
              pattern="[a-zA-Z0-9_-]+"
              title="Letters, numbers, hyphens, and underscores only"
            />
            <button
              type="submit"
              disabled={isLoggingIn || !username.trim()}
              className="btn btn-primary sans"
              style={{ padding: "0 20px" }}
            >
              {isLoggingIn ? "…" : "Enter"}
            </button>
          </form>

          {error && (
            <p
              className="mono"
              style={{
                marginTop: 14,
                fontSize: 12,
                color: "var(--accent)",
                letterSpacing: "0.04em",
              }}
            >
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
