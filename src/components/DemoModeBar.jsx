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
  const showDeveloperStrip = import.meta.env.DEV || demoQuery;

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
    try { for (const key of Object.keys(localStorage)) if (key.startsWith("atithi-")) localStorage.removeItem(key); }
    catch { /* Reload still resets in-memory state. */ }
    window.location.reload();
  };

  return <>
    {!online && <div role="status" className="offline-banner relative z-[60] mx-3 mt-2 flex items-start gap-2 rounded-xl border border-amber-400/35 bg-surface/90 px-3 py-2 text-xs font-bold text-text shadow-glass backdrop-blur sm:mx-auto sm:max-w-6xl"><WifiOff size={15} className="mt-0.5 shrink-0 text-amber-500"/>Offline — live weather and uncached requests may be unavailable. Use cached demo results or retry when connected.</div>}
    {showDeveloperStrip && <div className="dev-mode-strip relative z-[60] mt-2 border-y border-white/10 bg-violet-950/55 px-4 py-2 text-white/90 backdrop-blur-xl sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold">{online ? <Wifi size={13}/> : <WifiOff size={13}/>} {online ? "Connection available" : "Offline"}</span>
        <label className="inline-flex min-h-9 items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={cachedMode} onChange={toggleCacheMode} className="h-4 w-4 accent-brand"/><Database size={14}/>Demo mode: use cached results</label>
        {demoQuery && <button type="button" onClick={() => setShowCheats((current) => !current)} aria-expanded={showCheats} className="min-h-9 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold"><AlertTriangle size={13} className="mr-1 inline"/>Hotkey cheat sheet</button>}
        {demoQuery && <button type="button" onClick={resetDemo} className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-bold"><RotateCcw size={13}/>Reset demo</button>}
      </div>
      {demoQuery && showCheats && <div className="mx-auto mt-2 max-w-6xl rounded-xl border border-dashed border-amber-300/40 bg-amber-300/5 p-3 text-xs leading-relaxed text-white/75"><strong className="text-white">Demo only:</strong> Open Plan → Demo controls to simulate a closure or transport strike. Press <kbd className="rounded border border-white/20 px-1.5 py-0.5">Alt</kbd> + <kbd className="rounded border border-white/20 px-1.5 py-0.5">R</kbd> to simulate rain. These are not live alerts. Reset demo clears Atithi saved state on this device.</div>}
    </div>}
  </>;
}