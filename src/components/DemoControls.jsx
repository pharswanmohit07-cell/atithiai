import React from "react";
import { AlertTriangle, Plane, Train, XCircle } from "lucide-react";
import { useDestination } from "../context/DestinationContext.jsx";
import { useHotelContext } from "../context/HotelContext.jsx";
import { makeDemoDisruption } from "../lib/disruptions.js";

function demoEnabled() {
  try { return new URLSearchParams(window.location.search).get("demo") === "1"; } catch { return false; }
}

export default function DemoControls() {
  const { destination } = useDestination();
  const { itinerary, addDisruption, clearDemoDisruptions } = useHotelContext();
  if (!demoEnabled()) return null;
  const trigger = (type) => {
    const disruption = makeDemoDisruption({ type, destination, itinerary });
    if (disruption) addDisruption(disruption);
  };
  return <section className="rounded-2xl border border-dashed border-amber-400 bg-amber-50 p-4 text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.18em]">DEMO EVENT</p><h2 className="mt-1 font-serif text-xl">Simulate a disruption</h2><p className="mt-1 text-xs">Simulated only. No road, flight or partner systems are contacted.</p></div><button type="button" onClick={clearDemoDisruptions} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-current px-2 py-1 text-xs font-bold"><XCircle size={14}/>Clear demo events</button></div>
    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button type="button" onClick={() => trigger("strike")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white"><Train size={14}/>Simulate transport strike</button>
      <button type="button" onClick={() => trigger("closure")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white"><XCircle size={14}/>Simulate attraction closure</button>
      <button type="button" onClick={() => trigger("flight_delay")} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-xs font-bold text-white"><Plane size={14}/>Simulate flight delay</button>
    </div>
    <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed"><AlertTriangle size={12} className="mt-0.5 shrink-0"/>Press Alt+R to add a demo transport disruption. This shortcut works only with ?demo=1.</p>
  </section>;
}
