import React from "react";
import { CloudRain, Sun, Mountain, RotateCcw, X } from "lucide-react";

export default function DemoControls({
  appMode,
  setAppMode,
  weather,
  isRainOverride = false,
  onToggleWeather,
  onSimulateLandslide,
  onSimulateAscent,
  selectedWaypoint,
  onClearDemoEvents,
  isOpen,
  setIsOpen,
}) {
  return (
    <>
      {!isOpen && <button onClick={() => setIsOpen(true)} className="fixed bottom-4 right-4 z-50 rounded-full bg-brand px-3 py-2 text-xs font-medium text-white shadow-lg md:hidden">Controls</button>}
      <div className={`fixed bottom-4 right-4 z-50 flex w-[min(22rem,calc(100vw-2rem))] flex-col gap-3 rounded-2xl border border-border bg-surface/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 md:bottom-6 md:right-6 ${isOpen ? "translate-x-0 opacity-100" : "translate-x-[130%] opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto"}`}>
        <button type="button" aria-label="Close demo controls" onClick={() => setIsOpen(false)} className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm md:hidden"><X size={14}/></button>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">Demo Controls</p>
          <span className="demo-badge">DEMO EVENT</span>
        </div>
        <div className="flex rounded-lg bg-surface-2 p-1">
          <button onClick={() => setAppMode("guest")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${appMode === "guest" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}>Guest App</button>
          <button onClick={() => setAppMode("admin")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${appMode === "admin" ? "bg-surface text-text shadow-sm" : "text-muted hover:text-text"}`}>Admin</button>
        </div>
        <button type="button" onClick={onToggleWeather} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all ${isRainOverride ? "bg-sky-700 hover:bg-sky-800" : "bg-brand hover:brightness-110"}`}>
          {isRainOverride ? <Sun size={16}/> : <CloudRain size={16}/>}
          {isRainOverride ? "Reset rain override" : "Simulate rain"}
          <span className="demo-badge text-[8px]">Demo event</span>
        </button>
        <button type="button" onClick={onSimulateAscent} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-xs font-semibold text-text hover:bg-surface-2">
          <span className="flex items-center gap-2"><Mountain size={16} className="text-accent-text"/> Simulate ascent · Demo event</span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-[8px] font-extrabold uppercase text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">{selectedWaypoint?.name || "Current waypoint"}</span>
        </button>
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Route Guard · Demo event</p>
          <button type="button" onClick={onSimulateLandslide} className="flex w-full items-center justify-between gap-3 rounded-xl border border-rose-300 bg-surface px-3 py-3 text-left text-xs font-semibold text-text hover:bg-surface-2 dark:border-rose-900">
            <span className="flex items-center gap-2"><Mountain size={17} className="shrink-0 text-rose-600"/> Simulate landslide (Rudraprayag-Guptkashi)</span>
            <span className="demo-badge shrink-0">DEMO EVENT</span>
          </button>
          <button type="button" onClick={onClearDemoEvents} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-xs font-bold text-text hover:bg-border">
            <RotateCcw size={14}/> Clear / reset demo events
          </button>
          <p className="mt-2 text-[9px] leading-relaxed text-muted">Alt+R triggers the landslide demo while ?demo=1 is present. Reset clears demo events and the rain override; live weather alerts remain automatic.</p>
        </div>
      </div>
    </>
  );
}
