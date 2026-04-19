import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--paper)",
          }}
        >
          <div
            style={{
              maxWidth: 440,
              textAlign: "center",
              padding: 32,
            }}
          >
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: "0.14em",
                color: "var(--ink-faint)",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              Unexpected error
            </div>
            <h1
              className="display"
              style={{
                margin: 0,
                fontSize: 28,
                fontWeight: 500,
                letterSpacing: "-0.02em",
                color: "var(--ink)",
                marginBottom: 10,
              }}
            >
              Something went wrong.
            </h1>
            <p
              style={{
                color: "var(--ink-soft)",
                marginBottom: 20,
                fontSize: 14,
                lineHeight: 1.5,
              }}
            >
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null });
                window.location.reload();
              }}
              className="btn btn-primary sans"
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
