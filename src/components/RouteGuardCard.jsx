import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Clock3, Route, ShieldCheck } from "lucide-react";
import { CORRIDOR_WAYPOINTS } from "../data/corridor.js";
import { useAppContext } from "../context/AppContext.jsx";

const advisoryFallbackCache = new Map();

function getFallbackAdvisory(disruption, currentWaypoint, villages) {
  const key = [disruption?.id || "none", currentWaypoint?.id || "none", ...(villages || []).map((village) => village.id)].join(":");
  if (advisoryFallbackCache.has(key)) return advisoryFallbackCache.get(key);
  const names = (villages || []).slice(0, 2).map((village) => village.name);
  const options = names.length === 2 ? names[0] + " or " + names[1] : names[0] || "no listed demo village";
  const signal = disruption?.source === "demo" ? "DEMO EVENT: " : "Live weather signal: ";
  const advisory = signal
    + "A disruption affects the next corridor segment. Pause near "
    + (currentWaypoint?.name || "the current waypoint")
    + " and check local authority advice. Potential demo village-area options: "
    + options
    + ". Travel times are rough straight-line estimates, not road travel times.";
  advisoryFallbackCache.set(key, advisory);
  return advisory;
}

function countWords(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function knownPlaceNames() {
  return CORRIDOR_WAYPOINTS.map((waypoint) => waypoint.name);
}

function advisoryIsSafe(reply, currentWaypoint, villages, disruption) {
  if (typeof reply !== "string" || !reply.trim() || countWords(reply) > 50) return false;
  if (/(road is open|road is closed|confirmed landslide|road closure confirmed|safe to travel|driver has been notified|homestay is booked)/i.test(reply)) return false;
  if (disruption?.source === "demo" && !/DEMO EVENT/i.test(reply)) return false;
  const permittedNames = [
    currentWaypoint?.name,
    ...(villages || []).map((village) => village.name),
  ].filter(Boolean).map((name) => name.toLowerCase());
  return knownPlaceNames().every((name) => {
    if (permittedNames.includes(name.toLowerCase())) return true;
    return !reply.toLowerCase().includes(name.toLowerCase());
  });
}

export default function RouteGuardCard({
  disruption,
  currentWaypoint,
  nearestSafe = [],
  persona,
  onReroute,
  onKeepWaiting,
  detourVillage = null,
}) {
  const { cachedDemoMode } = useAppContext();
  const fallbackAdvisory = useMemo(
    () => getFallbackAdvisory(disruption, currentWaypoint, nearestSafe),
    [disruption, currentWaypoint, nearestSafe],
  );
  const [advisory, setAdvisory] = useState(fallbackAdvisory);
  const [waiting, setWaiting] = useState(false);
  const [advisorySource, setAdvisorySource] = useState("cached-fallback");

  useEffect(() => {
    setAdvisory(fallbackAdvisory);
    setAdvisorySource("cached-fallback");
    setWaiting(false);
    if (!disruption || !currentWaypoint || cachedDemoMode) return undefined;

    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 3000);
    const language = typeof navigator !== "undefined" && navigator.language ? navigator.language : "en";
    const payload = {
      message: "Give one short, calm route-safety advisory in the guest's language, maximum 50 words. Use only the supplied village areas as alternatives. Do not invent places or road conditions, confirm a closure or landslide, claim any staff action is done, or imply a demo listing is bookable.",
      context: {
        routeGuard: {
          enabled: true,
          disruption: {
            id: disruption.id,
            type: disruption.type,
            segment: disruption.segment,
            severity: disruption.severity,
            source: disruption.source,
            detectedAt: disruption.detectedAt,
          },
          persona: persona ? {
            id: persona.id,
            name: persona.name,
            age: persona.age,
            ageGroup: persona.ageGroup,
            healthTags: Array.isArray(persona.healthTags) ? persona.healthTags : [],
          } : null,
          currentWaypoint: {
            id: currentWaypoint.id,
            name: currentWaypoint.name,
            elevationM: currentWaypoint.elevationM,
          },
          nearestSafe: nearestSafe.slice(0, 2).map((village) => ({
            id: village.id,
            name: village.name,
            lat: village.lat,
            lon: village.lon,
            elevationM: village.elevationM,
            distanceKm: village.distanceKm,
            roughTravelMinutes: village.roughTravelMinutes,
            localSpendINR: village.localSpendINR,
            listingStatus: "DEMO LISTING",
          })),
          guestLanguage: language,
        },
      },
    };

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify(payload),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Advisory service unavailable");
        return response.json();
      })
      .then((result) => {
        if (!active || controller.signal.aborted) return;
        if (advisoryIsSafe(result?.reply, currentWaypoint, nearestSafe, disruption)) {
          setAdvisory(result.reply.trim());
          setAdvisorySource("assistant");
        }
      })
      .catch(() => {
        // A cached local advisory is already shown. The guard remains usable without AI.
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [disruption, currentWaypoint, nearestSafe, persona, fallbackAdvisory, cachedDemoMode]);

  if (!disruption || !currentWaypoint) return null;
  const from = CORRIDOR_WAYPOINTS.find((waypoint) => waypoint.id === disruption.segment?.[0]);
  const to = CORRIDOR_WAYPOINTS.find((waypoint) => waypoint.id === disruption.segment?.[1]);
  const demoEvent = disruption.source === "demo";

  return (
    <section className="route-guard-alert-card hazard-alert overflow-hidden rounded-2xl border border-amber-300/80 bg-surface shadow-md dark:border-amber-800">
      <div className="flex items-start gap-3 border-b border-amber-300/60 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/25">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200"><AlertTriangle size={21}/></span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-amber-900 dark:text-amber-200">Route Guard alert</p>
            {demoEvent
              ? <span className="demo-badge">DEMO EVENT</span>
              : <span className="rounded-full border border-border bg-surface px-2 py-1 text-[9px] font-bold text-muted">Live weather signal</span>}
          </div>
          <h2 className="mt-1 font-serif text-xl text-text">{disruption.type === "landslide" ? "Landslide scenario" : "Rain-related segment advisory"}</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{from?.name || "Current waypoint"} → {to?.name || "Next waypoint"} · {disruption.severity} severity</p>
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div className="rounded-xl border border-border bg-bg p-3">
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-accent-text"><ShieldCheck size={14}/> Calm advisory</p>
          <p aria-live="polite" className="mt-2 text-sm leading-relaxed text-text">{advisory}</p>
          <p className="mt-2 text-[9px] text-muted">{advisorySource === "assistant" ? "AI advisory · limited to supplied corridor context" : "Cached fallback advisory · available without AI"}</p>
        </div>

        {detourVillage && <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100">
          <strong>Estimated demo detour selected:</strong> {detourVillage.name}. The dashed red segment remains flagged; the green map line is illustrative and does not confirm a road route or a booking.
        </div>}
        <div>
          <div className="mb-3 flex items-start justify-between gap-2">
            <div><h3 className="font-serif text-lg text-text">Potential pause options</h3><p className="mt-1 text-[10px] leading-relaxed text-muted">Nearest ranked illustrative village areas. Not verified safe, real accommodation, or bookable.</p></div>
            <span className="demo-badge shrink-0">Demo listing</span>
          </div>
          <div className="space-y-3">
            {nearestSafe.slice(0, 2).map((village, index) => (
              <article key={village.id} className="rounded-xl border border-border bg-bg p-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand text-xs font-bold text-white">{index + 1}</span>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-semibold text-text">{village.name}</h4>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <span className="demo-badge">Demo listing</span>
                      {persona?.id === "pilgrim" && <span className="rounded-full bg-surface-2 px-2 py-1 text-[8px] font-semibold text-muted">Lower elevation considered</span>}
                    </div>
                    <p className="mt-2 text-[10px] leading-relaxed text-muted">Approx. {village.elevationM} m · ₹{village.localSpendINR} local spend · Estimated</p>
                    <p className="mt-1 flex items-start gap-1.5 text-[10px] leading-relaxed text-muted"><Clock3 size={12} className="mt-0.5 shrink-0"/> {village.distanceKm} km straight-line · Rough estimate: {village.roughTravelMinutes} min at 25 km/h. Estimated only; not road travel time.</p>
                    <p className="mt-1 text-[9px] text-muted">{village.shortDesc} Not a real or bookable property.</p>
                  </div>
                </div>
                <button type="button" disabled={Boolean(detourVillage)} onClick={() => onReroute(village, disruption)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2.5 text-xs font-bold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-55"><Route size={14}/>{detourVillage ? "Detour already selected" : `Reroute to ${village.name}`} <ArrowRight size={14}/></button>
              </article>
            ))}
            {nearestSafe.length === 0 && <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">No demo village area is available in the current data list.</p>}
          </div>
        </div>

        <button type="button" onClick={() => { setWaiting(true); onKeepWaiting?.(disruption); }} className="w-full rounded-xl border border-border bg-surface px-4 py-3 text-xs font-bold text-text hover:bg-surface-2">
          {waiting ? "Waiting at current waypoint" : "Keep waiting"}
        </button>
        {waiting && <p className="text-[10px] leading-relaxed text-muted">Waiting selected. Confirm current conditions with local authorities; this demo cannot verify route status.</p>}
      </div>
    </section>
  );
}

export function ActionsTakenByAtithi({ actions = [] }) {
  return (
    <section className="route-guard-actions rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-text">Trip Guardian log</p><h2 className="mt-1 font-serif text-xl text-text">Actions taken by Atithi</h2></div>
        <span className="rounded-full bg-surface-2 px-2 py-1 text-[9px] font-semibold text-muted">{actions.length} logged</span>
      </div>
      {actions.length === 0
        ? <p className="mt-3 text-xs leading-relaxed text-muted">No Route Guard reroute actions yet. Non-live actions are marked as demo.</p>
        : <div className="mt-3 space-y-3">{actions.map((action) => (
          <article key={action.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="text-xs font-bold text-text">{action.title}</h3>
              <span className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-extrabold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">{action.status}</span>
            </div>
            <p className="mt-1 text-[10px] leading-relaxed text-muted">{action.detail}</p>
            <p className="mt-1 text-[9px] text-muted">{action.timestamp}{action.source === "demo" ? " · DEMO EVENT" : ""}</p>
          </article>
        ))}</div>}
    </section>
  );
}
