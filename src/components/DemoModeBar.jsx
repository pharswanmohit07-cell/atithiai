import React, { useEffect, useState } from "react";
import { AlertTriangle, Wifi, WifiOff, RotateCcw, Database } from "lucide-react";
import { isCachedDemoMode, setCachedDemoMode } from "../lib/demoCache.js";

function isDemoQuery() {
  try { return new URLSearchParams(window.location.search).get("demo") === "1"; }
  catch { return false; }
}

export default function DemoModeBar() {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine !== false);
  const [cachedMode, setCachedMode] = useState(isCachedDemoMode);
  const [showCheats, setShowCheats] = useState(isDemoQuery());
  const demoQuery = isDemoQuery();

  useEffect(() => {
    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);
    const modeHandler = () => setCachedMode(isCachedDemoMode());
    const queryHandler = () => setShowCheats(isDemoQuery());
    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);
    window.addEventListener("atithi:demo-mode", modeHandler);
    window.addEventListener("popstate", queryHandler);
    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);
      window.removeEventListener("atithi:demo-mode", modeHandler);
      window.removeEventListener("popstate", queryHandler);
    };
  }, []);

  const toggleCacheMode = (event) => {
    const next = event.target.checked;
    setCachedDemoMode(next);
    setCachedMode(next);
    window.dispatchEvent(new Event("atithi:demo-mode"));
    window.location.reload();
  };

  const resetDemo = () => {
    try {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith("atithi-")) localStorage.removeItem(key);
      }
    } catch { /* Reload still resets in-memory state. */ }
    window.location.reload();
  };

  return <div className="relative z-[60] border-b border-border bg-surface px-4 py-2 sm:px-6">
    {!online && <div role="status" className="mx-auto mb-2 flex max-w-6xl items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs font-bold text-text"><WifiOff size={15}/>Offline — live weather and uncached requests may be unavailable. Use cached demo results or retry when connected.</div>}
    <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
      <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted">{online ? <Wifi size={13}/> : <WifiOff size={13}/>} {online ? "Connection available" : "Offline"}</span>
      <label className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={cachedMode} onChange={toggleCacheMode} className="h-4 w-4 accent-brand"/><Database size={14}/>Demo mode: use cached results</label>
      {demoQuery && <button type="button" onClick={() => setShowCheats((current) => !current)} aria-expanded={showCheats} className="min-h-9 rounded-lg border border-border px-3 py-1.5 text-xs font-bold"><AlertTriangle size={13} className="mr-1 inline"/>Hotkey cheat sheet</button>}
      {demoQuery && <button type="button" onClick={resetDemo} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold"><RotateCcw size={13}/>Reset demo</button>}
    </div>
    {demoQuery && showCheats && <div className="mx-auto mt-2 max-w-6xl rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 p-3 text-xs leading-relaxed text-muted"><strong className="text-text">Demo only:</strong> Open Plan → Demo controls to simulate a closure or transport strike. Press <kbd className="rounded border border-border px-1.5 py-0.5">Alt</kbd> + <kbd className="rounded border border-border px-1.5 py-0.5">R</kbd> to simulate rain. These are not live alerts. Reset demo clears Atithi saved state on this device.</div>}
  </div>;
}
