import { useLocation } from "wouter";
import { useAuth } from "../hooks/useAuth";

function FluteMark({ size = 26 }: { size?: number }) {
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
      <div
        style={{
          width: 2,
          height: size * 0.75,
          background: "var(--ink)",
          borderRadius: 2,
        }}
      />
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

const NAV = [
  { key: "library", label: "Library", href: "/" },
  { key: "vocabulary", label: "Vocabulary", href: "/vocabulary" },
  { key: "review", label: "Review", href: "/review" },
  { key: "settings", label: "Settings", href: "/settings" },
];

function isActivePath(pathname: string, href: string, key: string): boolean {
  if (key === "library") return pathname === "/" || pathname.startsWith("/reader");
  return pathname.startsWith(href);
}

export default function NavBar() {
  const { username, logout } = useAuth();
  const [location, navigate] = useLocation();

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 40,
        background: "oklch(from var(--paper) l c h / 0.85)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--rule)",
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: "0 auto",
          padding: "0 32px",
          height: 58,
          display: "flex",
          alignItems: "center",
          gap: 28,
        }}
      >
        <button
          onClick={() => navigate("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            padding: 0,
            color: "var(--ink)",
          }}
        >
          <FluteMark />
          <span
            className="display"
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: "-0.02em",
            }}
          >
            Flute
          </span>
        </button>

        <nav style={{ display: "flex", gap: 4, marginLeft: 12 }}>
          {NAV.map((n) => {
            const active = isActivePath(location, n.href, n.key);
            return (
              <button
                key={n.key}
                onClick={() => navigate(n.href)}
                className="sans"
                style={{
                  position: "relative",
                  padding: "8px 14px",
                  background: "transparent",
                  border: 0,
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: active ? 600 : 450,
                  color: active ? "var(--ink)" : "var(--ink-soft)",
                  borderRadius: 6,
                  letterSpacing: "0.005em",
                }}
              >
                {n.label}
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      right: 14,
                      bottom: -2,
                      height: 2,
                      background: "var(--ink)",
                      borderRadius: 2,
                    }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1 }} />

        <button
          onClick={logout}
          title="Sign out · switch user"
          className="sans"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "transparent",
            border: 0,
            cursor: "pointer",
            padding: 0,
            color: "var(--ink-soft)",
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.05em",
            }}
          >
            {username}
          </span>
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: "var(--accent-wash)",
              color: "var(--accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display)",
              fontWeight: 600,
              fontSize: 13,
              border: "1px solid var(--rule)",
            }}
          >
            {(username ?? "?").charAt(0).toUpperCase()}
          </span>
        </button>
      </div>
    </header>
  );
}
