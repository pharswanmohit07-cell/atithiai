import React, { useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, ArrowUpRight, PhoneCall } from "lucide-react";
import { CORRIDOR_WAYPOINTS } from "../data/corridor.js";
import { getAdvisory, getSleepingAscentPerDay } from "../lib/altitude.js";

const RISK_STYLES = {
  low: {
    label: "Low caution",
    color: "rgb(var(--teal-rgb))",
    text: "text-emerald-800 dark:text-emerald-200",
    pill: "bg-emerald-100 dark:bg-emerald-950/50",
    bar: "bg-emerald-600",
  },
  moderate: {
    label: "Moderate caution",
    color: "rgb(var(--saffron-rgb))",
    text: "text-amber-800 dark:text-amber-200",
    pill: "bg-amber-100 dark:bg-amber-950/50",
    bar: "bg-amber-500",
  },
  high: {
    label: "High caution",
    color: "rgb(var(--coral-rgb))",
    text: "text-rose-800 dark:text-rose-200",
    pill: "bg-rose-100 dark:bg-rose-950/50",
    bar: "bg-rose-600",
  },
};

function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

function getLanguage() {
  return typeof navigator !== "undefined" && navigator.language ? navigator.language : "en";
}

function ElevationProfile({ currentIndex, currentElevation, riskColor }) {
  const chart = useMemo(() => {
    const width = 640;
    const height = 190;
    const left = 28;
    const right = width - 28;
    const top = 22;
    const bottom = 128;
    const maxElevation = Math.max(4000, ...CORRIDOR_WAYPOINTS.map((item) => item.elevationM));
    const points = CORRIDOR_WAYPOINTS.map((waypoint, index) => {
      const x = left + (index * (right - left)) / Math.max(1, CORRIDOR_WAYPOINTS.length - 1);
      const y = bottom - (waypoint.elevationM / maxElevation) * (bottom - top);
      return { ...waypoint, index, x, y };
    });
    return { width, height, points, path: points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ") };
  }, []);

  const activePoint = chart.points[currentIndex] || chart.points[0];

  return (
    <div className="overflow-x-auto" role="img" aria-label={`Corridor elevation profile. Current: ${activePoint.name}, ${currentElevation} metres.`}>
      <svg viewBox={`0 0 ${chart.width} ${chart.height}`} className="block min-w-[560px] w-full" aria-hidden="true">
        {[1000, 2000, 3000, 4000].map((tick) => {
          const y = 128 - (tick / 4000) * 106;
          return <g key={tick}><line x1="28" x2="612" y1={y} y2={y} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="4 5"/><text x="4" y={y + 3} fontSize="8" fill="currentColor" opacity=".6">{tick / 1000}k</text></g>;
        })}
        <path d={chart.path} fill="none" stroke={riskColor} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        {chart.points.map((point) => (
          <g key={point.id}>
            <line x1={point.x} x2={point.x} y1={point.y + 8} y2="145" stroke="currentColor" strokeOpacity={point.index === currentIndex ? ".3" : ".12"} strokeDasharray="2 4"/>
            <circle cx={point.x} cy={point.y} r={point.index === currentIndex ? 10 : 4.5} fill={point.index === currentIndex ? riskColor : "var(--text-muted)"} stroke="var(--surface)" strokeWidth={point.index === currentIndex ? 3 : 1.5}/>
            {point.index === currentIndex && <text x={point.x} y={point.y - 15} textAnchor="middle" fontSize="10" fontWeight="800" fill={riskColor}>{currentElevation} m</text>}
            <text x={point.x} y="160" textAnchor="middle" fontSize="9" fill="currentColor" fontWeight={point.index === currentIndex ? "800" : "500"} opacity={point.index === currentIndex ? "1" : ".72"}>{point.name.length > 13 ? point.name.split(" ")[0] : point.name}</text>
            <text x={point.x} y="174" textAnchor="middle" fontSize="8" fill="currentColor" opacity=".65">{point.elevationM.toLocaleString("en-IN")} m</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function AltitudeSentinel({
  persona,
  itinerary = [],
  selectedWaypoint,
  selectedWaypointId,
  setSelectedWaypointId,
  onAdvisoryChange,
}) {
  const currentIndex = Math.max(0, CORRIDOR_WAYPOINTS.findIndex((waypoint) => waypoint.id === selectedWaypointId));
  const currentWaypoint = selectedWaypoint || CORRIDOR_WAYPOINTS[currentIndex];
  const nextWaypoint = CORRIDOR_WAYPOINTS[currentIndex + 1] || null;
  const ascentPerDay = useMemo(
    () => getSleepingAscentPerDay({ itinerary, waypoints: CORRIDOR_WAYPOINTS }),
    [itinerary],
  );
  const advisory = useMemo(
    () => getAdvisory({ elevation: currentWaypoint?.elevationM, ascentPerDay, persona }),
    [currentWaypoint?.elevationM, ascentPerDay, persona?.id, persona?.age, persona?.healthTags],
  );
  const baseText = useMemo(
    () => `Altitude Sentinel assessment: ${advisory.level} caution. ${advisory.reasons.join(" ")} Actions: ${advisory.actions.join(" ")}`,
    [advisory],
  );
  const [calmText, setCalmText] = useState(baseText);
  const [textSource, setTextSource] = useState("rule-based");
  const [isRephrasing, setIsRephrasing] = useState(false);

  useEffect(() => {
    onAdvisoryChange?.({
      level: advisory.level,
      personaId: persona?.id || "unknown",
      elevationM: Number(currentWaypoint?.elevationM || 0),
      ascentPerDay,
    });
  }, [advisory, persona?.id, currentWaypoint?.elevationM, ascentPerDay, onAdvisoryChange]);

  useEffect(() => {
    setCalmText(baseText);
    setTextSource("rule-based");
    setIsRephrasing(false);
    const controller = new AbortController();
    let active = true;
    const timeout = setTimeout(() => controller.abort(), 2800);
    const language = getLanguage();
    setIsRephrasing(true);

    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        advisory: baseText,
        persona: {
          id: persona?.id || "unknown",
          name: persona?.name || "Traveller",
          language,
        },
      }),
    })
      .then((response) => {
        if (!response.ok) throw new Error("Altitude wording unavailable");
        return response.json();
      })
      .then((payload) => {
        if (!active || controller.signal.aborted) return;
        const reply = typeof payload?.reply === "string" ? payload.reply.trim() : "";
        if (reply && wordCount(reply) <= 45) {
          setCalmText(reply);
          setTextSource(payload.source === "altitude-rephrase" ? "calm rephrase" : "rule-based fallback");
        }
      })
      .catch(() => {
        // Rule-based text is already visible and remains authoritative.
      })
      .finally(() => {
        clearTimeout(timeout);
        if (active) setIsRephrasing(false);
      });

    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [baseText, persona?.id, persona?.name]);

  const riskStyle = RISK_STYLES[advisory.level] || RISK_STYLES.low;
  const sliderValue = String(currentIndex);

  return (
    <section className="altitude-sentinel rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent-text"><Activity size={20}/></span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Altitude Sentinel</p>
            <h2 className="mt-1 font-serif text-2xl text-text">Know your climb.</h2>
            <p className="mt-1 text-[10px] text-muted">Rule-based elevation and itinerary guidance · waypoints approximate</p>
          </div>
        </div>
        <span className={`rounded-full px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wide ${riskStyle.pill} ${riskStyle.text}`}>{riskStyle.label}</span>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg p-3">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-[9px] font-bold uppercase tracking-wide text-muted">Current waypoint</p><p className="mt-1 text-sm font-bold text-text">{currentWaypoint?.name || "Rudraprayag"}</p><p className="text-[10px] text-muted">Approx. {Number(currentWaypoint?.elevationM || 0).toLocaleString("en-IN")} m</p></div>
          <div className="text-right"><p className="text-[9px] font-bold uppercase tracking-wide text-muted">Next waypoint</p><p className="mt-1 text-sm font-bold text-text">{nextWaypoint?.name || "Corridor endpoint"}</p><p className="text-[10px] text-muted">{nextWaypoint ? `Approx. ${nextWaypoint.elevationM.toLocaleString("en-IN")} m` : "No next waypoint"}</p></div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2" aria-label={`Caution level: ${advisory.level}`}>
          <div className={`h-full rounded-full transition-all duration-300 ${riskStyle.bar}`} style={{ width: advisory.level === "low" ? "33.33%" : advisory.level === "moderate" ? "66.66%" : "100%" }}/>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border bg-bg py-2">
        <ElevationProfile currentIndex={currentIndex} currentElevation={currentWaypoint?.elevationM || 0} riskColor={riskStyle.color}/>
      </div>

      <div className="mt-4 rounded-xl bg-surface-2 p-3">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="altitude-sentinel-slider" className="text-xs font-bold text-text">Preview your climb</label>
          <span className="text-[10px] font-semibold text-muted">{currentIndex + 1} of {CORRIDOR_WAYPOINTS.length}</span>
        </div>
        <input
          id="altitude-sentinel-slider"
          type="range"
          min="0"
          max={String(CORRIDOR_WAYPOINTS.length - 1)}
          step="1"
          value={sliderValue}
          onChange={(event) => setSelectedWaypointId?.(CORRIDOR_WAYPOINTS[Number(event.target.value)]?.id)}
          className="mt-3 block w-full accent-emerald-700"
          aria-label="Preview your climb by corridor waypoint"
        />
        <div className="mt-1 flex items-center justify-between text-[9px] text-muted"><span>{CORRIDOR_WAYPOINTS[0].name}</span><span>{CORRIDOR_WAYPOINTS[CORRIDOR_WAYPOINTS.length - 1].name}</span></div>
        <p className="mt-3 flex items-start gap-2 text-[10px] leading-relaxed text-muted"><ArrowUpRight size={13} className="mt-0.5 shrink-0"/> Largest estimated sleeping-elevation gain from itinerary: {ascentPerDay.toLocaleString("en-IN")} m/day. Estimated from each day's final waypoint.</p>
      </div>

      <div className="mt-4">
        <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent-text"><AlertTriangle size={14}/> Reasons</p>
        <ul className="mt-2 space-y-2">{advisory.reasons.map((reason, index) => <li key={index} className="flex gap-2 text-xs leading-relaxed text-muted"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent"/><span>{reason}</span></li>)}</ul>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent-text">Calm advisory <span className="font-medium normal-case tracking-normal text-muted">· {textSource}{isRephrasing ? " · checking wording…" : ""}</span></p>
        <p aria-live="polite" className="mt-2 rounded-xl border border-border bg-bg p-3 text-xs leading-relaxed text-text">{calmText}</p>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent-text">Suggested actions</p>
        <ul className="mt-2 space-y-2">{advisory.actions.map((action, index) => <li key={index} className="flex gap-2 text-xs leading-relaxed text-muted"><span className="mt-1 text-accent-text">•</span><span>{action}</span></li>)}</ul>
      </div>

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-border bg-surface-2 p-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[10px] leading-relaxed text-muted">General guidance only, not medical advice. Follow local authority and doctor advice. Emergency: 112.</p>
        <a href="tel:112" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-rose-700 px-3 py-2.5 text-xs font-bold text-white hover:bg-rose-800"><PhoneCall size={14}/> Emergency (112)</a>
      </div>
    </section>
  );
}
