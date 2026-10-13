import React, { useEffect } from "react";
import { AlertTriangle, CloudRain, TrainFront } from "lucide-react";

function demoEnabled() {
  try { return new URLSearchParams(window.location.search).get("demo") === "1"; }
  catch { return false; }
}

export default function DemoControls({ onSimulate }) {
  const enabled = demoEnabled();

  useEffect(() => {
    if (!enabled) return undefined;
    const handleKeyDown = (event) => {
      if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        onSimulate("rain");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, onSimulate]);

  if (!enabled) return null;
  return <section className="rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/5 p-4">
    <div className="flex items-center gap-2"><AlertTriangle size={16} className="text-amber-600"/><h2 className="text-sm font-extrabold">Demo controls</h2><span className="rounded-full bg-amber-500/15 px-2 py-1 text-[9px] font-extrabold tracking-wider text-amber-700 dark:text-amber-300">DEMO EVENT</span></div>
    <p className="mt-1 text-xs text-muted">Simulated events are not live closure or transport reports. Shortcut: Alt+R for a rain disruption.</p>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" onClick={() => onSimulate("closure")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><AlertTriangle size={14}/>Simulate closure <span className="text-[9px] text-muted">DEMO EVENT</span></button>
      <button type="button" onClick={() => onSimulate("strike")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><TrainFront size={14}/>Simulate transport strike <span className="text-[9px] text-muted">DEMO EVENT</span></button>
      <button type="button" onClick={() => onSimulate("rain")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><CloudRain size={14}/>Simulate rain <span className="text-[9px] text-muted">DEMO EVENT</span></button>
    </div>
  </section>;
}
