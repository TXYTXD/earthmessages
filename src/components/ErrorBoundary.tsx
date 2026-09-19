import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// A crash anywhere in the app used to leave a blank screen, which tells
// nobody anything. This shows what happened and offers the two things that
// actually fix it: reload, or clear the saved theme and reload.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[UMS] crashed:", error, info.componentStack);
  }

  private reload = () => {
    window.location.reload();
  };

  // A stored theme is the most likely thing to make the app unopenable,
  // so offer a way back that does not need the app to be working.
  private resetTheme = () => {
    for (const key of [
      "app-theme",
      "app-custom-theme",
      "app-theme-effects",
      "app-theme-elements",
      "app-effects-enabled",
      "app-ambience-enabled",
      "app-ui-sounds-enabled",
    ]) {
      try {
        localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#0b0d14",
          color: "#e8eaf0",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😵‍💫</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 8px" }}>UMS Messages hit a problem</h1>
          <p style={{ fontSize: 14, opacity: 0.75, margin: "0 0 20px", lineHeight: 1.5 }}>
            Reloading usually sorts it. If it keeps happening, resetting the theme is the next thing to try —
            your chats are not affected.
          </p>

          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={this.reload}
              style={{
                padding: "10px 20px", borderRadius: 999, border: "none", cursor: "pointer",
                background: "#4f7cff", color: "white", fontSize: 14, fontWeight: 600,
              }}
            >
              Reload
            </button>
            <button
              onClick={this.resetTheme}
              style={{
                padding: "10px 20px", borderRadius: 999, cursor: "pointer",
                border: "1px solid rgba(255,255,255,0.2)", background: "transparent",
                color: "#e8eaf0", fontSize: 14, fontWeight: 600,
              }}
            >
              Reset theme &amp; reload
            </button>
          </div>

          <p style={{ fontSize: 11, opacity: 0.5, marginTop: 20, wordBreak: "break-word" }}>
            {String(this.state.error?.message ?? this.state.error).slice(0, 200)}
          </p>
        </div>
      </div>
    );
  }
}
