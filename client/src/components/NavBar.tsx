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
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/85 backdrop-blur-[10px]">
      <div className="mx-auto flex h-[58px] max-w-[1400px] items-center gap-7 px-8">
        <button
          onClick={() => navigate("/")}
          className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-ink"
        >
          <FluteMark />
          <span className="display text-[22px] font-medium tracking-[-0.02em]">
            Flute
          </span>
        </button>

        <nav className="ml-3 flex gap-1">
          {NAV.map((n) => {
            const active = isActivePath(location, n.href, n.key);
            return (
              <button
                key={n.key}
                onClick={() => navigate(n.href)}
                className="sans relative cursor-pointer rounded-md border-0 bg-transparent px-3.5 py-2 text-[13px] tracking-[0.005em]"
                style={{
                  fontWeight: active ? 600 : 450,
                  color: active ? "var(--ink)" : "var(--ink-soft)",
                }}
              >
                {n.label}
                {active && (
                  <span className="absolute -bottom-0.5 left-[14px] right-[14px] h-0.5 rounded-[2px] bg-ink" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex-1" />

        <button
          onClick={logout}
          title="Sign out · switch user"
          className="sans flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-ink-soft"
        >
          <span className="mono text-[11px] tracking-[0.05em]">{username}</span>
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-rule bg-accent-wash font-display text-[13px] font-semibold text-accent">
            {(username ?? "?").charAt(0).toUpperCase()}
          </span>
        </button>
      </div>
    </header>
  );
}
