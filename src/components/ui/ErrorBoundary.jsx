import React from "react";
import { AlertTriangle, RefreshCw, RotateCcw } from "lucide-react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    // Keep the real client-side exception visible in production DevTools too.
    // The recovery screen intentionally remains generic for visitors.
    console.error("Atithi AI render error:", error);
    if (info?.componentStack) console.error("Atithi AI component stack:", info.componentStack);
  }

  resetDemo = () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("atithi-")) localStorage.removeItem(key);
      }
    } catch { /* Storage may be disabled in private browsing. */ }
    window.location.reload();
  };

  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="min-h-screen min-h-dvh flex items-center justify-center px-4 py-8 text-text">
      <section className="glass-card w-full max-w-md rounded-3xl border border-border p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-500"><AlertTriangle size={24}/></span>
        <h1 className="mt-4 font-display text-3xl">Let’s start fresh.</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">Something went wrong while opening this screen. Your browser can reload the trip or reset its saved demo state.</p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white"><RefreshCw size={15}/>Reload</button>
          <button type="button" onClick={this.resetDemo} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border px-4 py-3 text-sm font-bold"><RotateCcw size={15}/>Reset demo</button>
        </div>
      </section>
    </main>;
  }
}
