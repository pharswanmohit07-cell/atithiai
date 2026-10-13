import React from "react";
import { CloudRain, Sun, Mountain, CarFront, X } from "lucide-react";

export default function DemoControls({
  appMode,
  setAppMode,
  weather,
  onToggleWeather,
  onDemoEvent,
  isOpen,
  setIsOpen,
}) {
  return (
    <>
      {!isOpen && <button onClick={() => setIsOpen(true)} className="fixed bottom-4 right-4 z-50 rounded-full bg-brand px-3 py-2 text-xs font-medium text-white shadow-lg md:hidden">Controls</button>}
      <div className={`fixed bottom-4 right-4 z-50 flex w-[min(21rem,calc(100vw-2rem))] flex-col gap-3 rounded-2xl border border-border bg-surface/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 md:bottom-6 md:right-6 ${isOpen?"translate-x-0 opacity-100":"translate-x-[130%] opacity-0 pointer-events-none md:translate-x-0 md:opacity-100 md:pointer-events-auto"}`}>
        <button type="button" aria-label="Close demo controls" onClick={() => setIsOpen(false)} className="absolute -right-2.5 -top-2.5 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-surface text-text shadow-sm md:hidden"><X size={14}/></button>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Demo Controls</p>
        <div className="flex rounded-lg bg-surface-2 p-1">
          <button onClick={() => setAppMode("guest")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${appMode==="guest"?"bg-surface text-text shadow-sm":"text-muted hover:text-text"}`}>Guest App</button>
          <button onClick={() => setAppMode("admin")} className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-all ${appMode==="admin"?"bg-surface text-text shadow-sm":"text-muted hover:text-text"}`}>Admin</button>
        </div>
        <button onClick={onToggleWeather} className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all ${weather==="sunny"?"bg-brand hover:brightness-110":"bg-sky-700 hover:bg-sky-800"}`}>{weather==="sunny"?<CloudRain size={16}/>:<Sun size={16}/>} {weather==="sunny"?"Simulate rain":"Reset weather"} <span className="text-[9px] font-normal opacity-80">Demo</span></button>
        <div className="border-t border-border pt-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Demo event · Trip disruption</p>
          <button onClick={() => onDemoEvent("landslide")} className="flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-xs font-semibold text-text hover:bg-surface-2"><span className="flex items-center gap-2"><Mountain size={16} className="text-rose-600"/> Simulate landslide</span><span className="rounded-full bg-rose-100 px-2 py-1 text-[9px] text-rose-800 dark:bg-rose-950/40 dark:text-rose-200">Demo event</span></button>
          <button onClick={() => onDemoEvent("roadblock")} className="mt-2 flex w-full items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-left text-xs font-semibold text-text hover:bg-surface-2"><span className="flex items-center gap-2"><CarFront size={16} className="text-amber-600"/> Simulate roadblock</span><span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Demo event</span></button>
        </div>
      </div>
    </>
  );
}
