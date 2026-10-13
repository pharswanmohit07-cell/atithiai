import React from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ArrowRightLeft, CheckCircle2, Clock3, Compass, Leaf, MapPin, ShieldCheck, Users } from "lucide-react";
import { PLACES, getCrowd, getCrowdLevel, getNearestPlaces } from "../data/places.js";

function estimatedVisitFlags() {
  const day = new Date().getDay();
  return { isWeekend: day === 0 || day === 6, isHoliday: false };
}

export function CrowdBadge({ place, score }) {
  const level = getCrowdLevel(score ?? getCrowd(place, estimatedVisitFlags()));
  const style = level === "Low"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"
    : level === "Medium"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200"
      : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200";
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${style}`}>{level} · estimated</span>;
}

export function GuardianCard({ disruption, itineraryItem, alternatives = [], onAccept }) {
  if (!disruption || !itineraryItem) return null;
  const kind = disruption.type === "rain" ? "Rain / weather shift" : disruption.type === "landslide" ? "Landslide alert" : "Roadblock alert";
  return (
    <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="hazard-alert mb-5 overflow-hidden rounded-2xl border border-amber-300/70 bg-surface shadow-sm dark:border-amber-800/70">
      <div className="flex items-start gap-3 border-b border-border bg-amber-50/80 p-4 dark:bg-amber-950/20">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"><ShieldCheck size={21}/></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800 dark:text-amber-200">Disruption Guardian</p><span className="rounded-full border border-border bg-surface px-2 py-0.5 text-[9px] font-semibold text-muted">{disruption.source === "demo" ? "Demo event" : "Weather-linked"}</span></div>
          <h3 className="mt-1 font-serif text-xl text-text">{disruption.title || kind}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{itineraryItem.title} may be affected. Atithi ranked two alternatives to keep the trip moving.</p>
        </div>
        <span className="shrink-0 rounded-full bg-rose-100 px-2 py-1 text-[9px] font-bold uppercase text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">{disruption.severity} severity</span>
      </div>
      <div className="space-y-3 p-4">
        {alternatives.slice(0, 2).map((place, index) => {
          const score = getCrowd(place, estimatedVisitFlags());
          return (
            <article key={place.id} className="rounded-xl border border-border bg-bg p-3">
              <div className="flex items-start gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-text">{place.name}</h4>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{place.shortDesc}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2"><CrowdBadge place={place} score={score}/>{place.isCorridorWaypoint ? <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300">Safety hold point · confirm locally</span> : <span className="text-[10px] text-muted">~{place.travelMinutes} min travel · estimated</span>}</div>
                  <p className="mt-2 text-[10px] font-semibold text-accent-text">{place.isCorridorWaypoint ? "Not a destination recommendation or route clearance" : `₹${place.localSpendINR} local spend · estimated`}</p>
                </div>
              </div>
              <button type="button" onClick={() => onAccept(itineraryItem, place, disruption)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-semibold text-white hover:brightness-110">Accept reroute <ArrowRightLeft size={14}/></button>
            </article>
          );
        })}
        {alternatives.length === 0 && <p className="text-sm text-muted">No verified alternative is available in the curated place list yet. Check local road and weather updates before travelling.</p>}
      </div>
    </motion.section>
  );
}

export function ActionsTakenLog({ actions = [], compact = false }) {
  const visible = compact ? actions.slice(0, 4) : actions.slice(0, 8);
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Trip Guardian</p><h3 className="mt-1 font-serif text-xl text-text">Actions taken by Atithi</h3></div>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-2 text-accent-text"><CheckCircle2 size={18}/></span>
      </div>
      {visible.length ? <div className="space-y-3">{visible.map((action) => <div key={action.id} className="flex items-start gap-3 border-t border-border pt-3"><span className="mt-0.5 text-accent-text"><CheckCircle2 size={15}/></span><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-text">{action.title}</p>{action.detail && <p className="mt-0.5 text-xs leading-relaxed text-muted">{action.detail}</p>}<div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted"><span>{action.time || "Just now"}</span>{action.source && <span>· {action.source === "demo" ? "Demo event" : "Guardian"}</span>}</div></div></div>)}</div> : <p className="rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">No reroutes yet. Atithi will log driver notifications and itinerary changes here when a plan is disrupted.</p>}
    </section>
  );
}

export function SustainableImpactCard({ placeIds = [] }) {
  const selected = [...new Set(placeIds)].map((id) => PLACES.find((place) => place.id === id)).filter(Boolean);
  const flags = estimatedVisitFlags();
  const lowCrowdChoices = selected.filter((place) => getCrowdLevel(getCrowd(place, flags)) === "Low" || place.tags.includes("low-crowd")).length;
  const localChoices = selected.filter((place) => place.tags.includes("local-artisan") || place.tags.includes("eco-friendly")).length;
  const spend = selected.reduce((sum, place) => sum + Number(place.localSpendINR || 0), 0);
  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><Leaf size={18}/></span><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Travel thoughtfully</p><h3 className="font-serif text-xl text-text">Your sustainable impact</h3></div></div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-surface-2 p-3"><p className="text-[9px] uppercase tracking-wide text-muted">Low crowd</p><p className="mt-1 text-xl font-semibold text-text">{lowCrowdChoices}</p><p className="text-[9px] text-muted">choices · estimated</p></div>
        <div className="rounded-xl bg-surface-2 p-3"><p className="text-[9px] uppercase tracking-wide text-muted">Local / eco</p><p className="mt-1 text-xl font-semibold text-text">{localChoices}</p><p className="text-[9px] text-muted">picks</p></div>
        <div className="rounded-xl bg-surface-2 p-3"><p className="text-[9px] uppercase tracking-wide text-muted">Local spend</p><p className="mt-1 text-lg font-semibold text-text">₹{spend.toLocaleString("en-IN")}</p><p className="text-[9px] text-muted">estimated</p></div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-muted">Spend figures are demo estimates per selected destination, not receipts or live economic measurements.</p>
    </section>
  );
}

export function DestinationOverview({ redirectionsCount = 0, localSpendRedirected = 0, actions = [] }) {
  const day = new Date().getDay();
  const flags = { isWeekend: day === 0 || day === 6, isHoliday: false };
  const scored = PLACES.map((place) => ({ ...place, crowdScore: getCrowd(place, flags) })).sort((a,b) => b.crowdScore-a.crowdScore);
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Tourism-board view</p><h2 className="mt-1 font-serif text-2xl text-text">Destination overview</h2><p className="mt-1 text-xs text-muted">Illustrative crowd index by destination · all values estimated</p></div><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2 text-accent-text"><Compass size={19}/></span></div>
      <div className="space-y-3">{scored.map((place) => {const level=getCrowdLevel(place.crowdScore);const bar=level==="Low"?"bg-emerald-500":level==="Medium"?"bg-amber-500":"bg-rose-500";return <div key={place.id}><div className="mb-1 flex items-center justify-between gap-2"><span className="truncate text-xs font-medium text-text">{place.name}</span><span className="shrink-0 text-[10px] text-muted">{place.crowdScore}/100 · est.</span></div><div className="h-2 overflow-hidden rounded-full bg-surface-2"><div className={`h-full rounded-full ${bar}`} style={{width:`${place.crowdScore}%`}}/></div></div>;})}</div>
      <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-xl bg-surface-2 p-4"><p className="text-[10px] uppercase tracking-wide text-muted">Redirected trips</p><p className="mt-1 text-2xl font-semibold text-text">{redirectionsCount}</p><p className="text-[10px] text-muted">Guardian accepts</p></div><div className="rounded-xl bg-surface-2 p-4"><p className="text-[10px] uppercase tracking-wide text-muted">Local spend redirected</p><p className="mt-1 text-2xl font-semibold text-text">₹{Number(localSpendRedirected).toLocaleString("en-IN")}</p><p className="text-[10px] text-muted">estimated INR</p></div></div>
      <div className="mt-5"><ActionsTakenLog actions={actions} compact/></div>
    </section>
  );
}

export function BeatCrowdsPanel({ search = "", onAddPlace, isWeekend = false, selectedPlaceIds = [] }) {
  const [enabled, setEnabled] = React.useState(false);
  const [chosenHigh, setChosenHigh] = React.useState(null);
  const flags = { isWeekend, isHoliday: false };
  const query = search.trim().toLowerCase();
  const places = PLACES.filter((place) => `${place.name} ${place.shortDesc} ${place.category}`.toLowerCase().includes(query));
  const lowCrowdAlternative = chosenHigh
    ? getNearestPlaces(chosenHigh, PLACES, PLACES.length)
        .filter((place) => getCrowdLevel(getCrowd(place, flags)) === "Low")
        .sort((a, b) => getCrowd(a, flags) - getCrowd(b, flags) || a.distanceKm - b.distanceKm)
        .slice(0, 2)
    : [];

  return (
    <section className="mb-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><Users size={18}/></span>
          <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-text">Trip Guardian</p><h3 className="font-serif text-xl text-text">Beat the crowds</h3><p className="text-xs text-muted">Choose a quieter route into the hills.</p></div>
        </div>
        <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((value) => !value)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled?"bg-brand":"bg-border"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${enabled?"left-6":"left-1"}`}/><span className="sr-only">Toggle Beat the crowds</span></button>
      </div>
      {!enabled && <p className="mt-3 rounded-xl bg-surface-2 p-3 text-xs leading-relaxed text-muted">Turn on to compare estimated crowd levels and find local alternatives to busy hotspots.</p>}
      {enabled && <div className="mt-4 space-y-3">
        {places.map((place) => {
          const score = getCrowd(place, flags);
          const level = getCrowdLevel(score);
          return <article key={place.id} className="rounded-xl border border-border bg-bg p-3">
            <div className="flex items-start justify-between gap-2"><div className="min-w-0"><h4 className="text-sm font-semibold text-text">{place.name}</h4><p className="mt-1 text-xs leading-relaxed text-muted">{place.shortDesc}</p></div><CrowdBadge place={place} score={score}/></div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-muted"><span>{place.travelMinutes} min from Dehradun · estimated</span><span>·</span><span>₹{place.localSpendINR} local spend · estimated</span></div>
            {level === "High" ? <button type="button" onClick={() => setChosenHigh(place)} className="mt-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-accent-text hover:bg-surface-2">Find a nearby Low-crowd alternative</button> : <button type="button" disabled={selectedPlaceIds.includes(place.id)} onClick={() => onAddPlace(place, null)} className="mt-3 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{selectedPlaceIds.includes(place.id)?"Added to your day":"Add to my day"}</button>}
            {chosenHigh?.id === place.id && <div className="mt-3 space-y-2 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 dark:border-emerald-900 dark:bg-emerald-950/20"><p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">A quieter alternative · estimated crowd</p>{lowCrowdAlternative.length?lowCrowdAlternative.map((alternative)=><div key={alternative.id} className="border-t border-emerald-200/70 pt-2 first:border-0 first:pt-0 dark:border-emerald-900/70"><div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-text">{alternative.name}</p><p className="mt-0.5 text-[10px] text-muted">{alternative.distanceKm.toFixed(1)} km away · estimated · {getCrowd(alternative,flags)}/100 crowd index</p></div><CrowdBadge place={alternative} score={getCrowd(alternative,flags)}/></div><p className="mt-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-200">+₹{alternative.localSpendINR} estimated to local community</p><button type="button" disabled={selectedPlaceIds.includes(alternative.id)} onClick={() => {onAddPlace(alternative, place);setChosenHigh(null);}} className="mt-2 rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">{selectedPlaceIds.includes(alternative.id)?"Already in your day":"Add alternative"}</button></div>):<p className="text-xs text-muted">No low-crowd place is currently available in the curated list.</p>}</div>}
          </article>;
        })}
        {places.length===0&&<p className="py-5 text-center text-sm text-muted">No destinations match that search.</p>}
        <p className="text-[10px] leading-relaxed text-muted">Crowd levels, travel minutes and community-spend figures are estimated demo values, not live feeds or guarantees.</p>
      </div>}
    </section>
  );
}

export function StaffRequestsPanel({ requests = [] }) {
  const staffRequests = requests
    .filter((request) => ["Trip Guardian", "Price Lens"].includes(request.category))
    .slice(0, 10);
  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Operations follow-up</p><h2 className="mt-1 font-serif text-xl text-text">Guardian & price complaints</h2><p className="mt-1 text-[10px] text-muted">Price complaints are demo requests and do not establish overcharging.</p></div><span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-text">{staffRequests.length}</span></div>
      {staffRequests.length ? <div className="space-y-3">{staffRequests.map((request) => <article key={request.id} className="flex items-start gap-3 border-t border-border pt-3 first:border-0 first:pt-0"><span className="mt-0.5 text-accent-text"><CheckCircle2 size={16}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-semibold text-text">{request.title}</p>{request.category === "Price Lens" && <span className="rounded-full bg-amber-100 px-2 py-1 text-[9px] font-bold text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">DEMO COMPLAINT</span>}</div><p className="mt-1 text-xs leading-relaxed text-muted">{request.detail}</p><p className="mt-1 text-[10px] text-muted">{request.status || "Received"} · {request.time || "Just now"}</p></div></article>)}</div> : <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">Accepted reroutes and tourist price complaints will appear here as demo requests.</p>}
    </section>
  );
}
