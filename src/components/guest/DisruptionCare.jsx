import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, BedDouble, CloudRain, ShieldAlert, Sparkles, Utensils } from "lucide-react";
import { useHotelContext } from "../../context/HotelContext.jsx";
import { useDestination } from "../../context/DestinationContext.jsx";
import { disruptionAffectsPlan, disruptionSeverityRank, localDisruptionAdvisory, rankDisruptionAlternatives, replaceAffectedItineraryStop } from "../../lib/disruptions.js";
import { rankDishes, rankExperiences } from "../../lib/rank.js";

function handledKey(destinationId) { return "atithi-disruption-handled:" + destinationId; }
function readHandled(destinationId) {
  try { const parsed = JSON.parse(localStorage.getItem(handledKey(destinationId)) || "[]"); return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : []; }
  catch { return []; }
}
function Severity({ value }) {
  const urgent = ["high", "critical"].includes(value);
  return <span className={"rounded-full px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide " + (urgent ? "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100" : "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100")}>{value} severity</span>;
}

export default function DisruptionCare({ destination, weather, itinerary, setItinerary, preferences, disruptions }) {
  const { formatCurrency } = useDestination();
  const { flexSettings, addRequest, recordAction } = useHotelContext();
  const [handled, setHandled] = useState(() => readHandled(destination.id));
  const [advisory, setAdvisory] = useState("");
  const relevant = useMemo(() => (disruptions || [])
    .filter((item) => disruptionAffectsPlan(item, itinerary))
    .filter((item) => !handled.includes(item.id))
    .sort((a, b) => disruptionSeverityRank(b.severity) - disruptionSeverityRank(a.severity) || String(b.detectedAt).localeCompare(String(a.detectedAt))),
  [disruptions, itinerary, handled]);
  const disruption = relevant[0];
  const alternatives = useMemo(() => disruption ? rankDisruptionAlternatives({
    destination,
    itinerary,
    disruption,
    weatherKind: disruption.type === "rain" || disruption.type === "storm" || disruption.type === "heat" ? disruption.type : (weather?.kind || "unknown"),
    limit: 2,
  }) : [], [destination, itinerary, disruption, weather?.kind]);
  const activeExperiencePool = flexSettings.hostPicks.localExperiences
    ? destination.experiences.filter((experience) => flexSettings.hostExperiencePicks?.[experience.id]?.enabled !== false)
      .map((experience) => ({ ...experience, hostNote: flexSettings.hostExperiencePicks?.[experience.id]?.note || experience.hostNote }))
    : [];
  const rainyForSuggestions = Boolean(disruption);
  const hostPicks = useMemo(() => rankExperiences(activeExperiencePool, {
    partyType: preferences?.travelParty || "Family",
    freeTimeMinutes: 240,
    weatherKind: rainyForSuggestions ? "rain" : (weather?.kind || "unknown"),
    lowCrowdPreference: true,
  }).slice(0, 2), [activeExperiencePool, preferences?.travelParty, rainyForSuggestions, disruption?.type, weather?.kind]);
  const warmDishes = useMemo(() => flexSettings.hostPicks.localFood
    ? rankDishes(destination.dishes.filter((dish) => dish.warmInRain === true), { weatherKind: "rain", diet: preferences?.dietaryPreference || "any" }).slice(0, 2)
    : [], [destination.dishes, flexSettings.hostPicks.localFood, preferences?.dietaryPreference]);

  useEffect(() => { setHandled(readHandled(destination.id)); }, [destination.id]);
  useEffect(() => {
    if (!disruption) { setAdvisory(""); return undefined; }
    const local = localDisruptionAdvisory({ disruption, alternatives, city: destination.city, language: preferences?.language || "English" });
    setAdvisory(local);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        mode: "disruption_advisory",
        destinationId: destination.id,
        language: preferences?.language || "English",
        disruption: {
          type: disruption.type,
          title: disruption.title,
          severity: disruption.severity,
          source: disruption.source,
          affectedPlaceIds: disruption.affectedPlaceIds,
          detectedAt: disruption.detectedAt,
        },
        alternativePlaceIds: alternatives.map((place) => place.id),
      }),
    }).then((response) => response.ok ? response.json() : null).then((payload) => {
      if (!controller.signal.aborted && typeof payload?.reply === "string" && payload.reply.trim()) setAdvisory(payload.reply.split(/\s+/).slice(0, 50).join(" "));
    }).catch(() => { /* The calm local advisory stays in place after the 3-second timeout or a failed request. */ });
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [disruption?.id, destination.id, destination.city, preferences?.language, alternatives]);

  const markHandled = (item, action) => {
    const next = Array.from(new Set([...handled, item.id]));
    setHandled(next);
    try { localStorage.setItem(handledKey(destination.id), JSON.stringify(next)); } catch { /* Session state still updates. */ }
    recordAction({ title: action === "accept" ? "Disruption alternative accepted" : "Guest kept original plan", detail: item.title + " · " + (action === "accept" ? "Itinerary updated from the destination pack." : "The original itinerary was retained."), actor: "Guest" });
  };
  const accept = (place) => {
    if (!disruption || !place) return;
    setItinerary((current) => replaceAffectedItineraryStop(current, disruption, place));
    markHandled(disruption, "accept");
  };
  const keepOriginal = () => { if (disruption) markHandled(disruption, "keep"); };
  const requestCare = (careOfferType, detail, extra = {}) => {
    if (!disruption) return;
    addRequest({
      type: "disruption_care",
      title: careOfferType === "late_arrival_hold" ? "Late-arrival room hold request" : careOfferType === "discounted_late_checkout" ? "Disruption care: discounted late check-out" : "Disruption care: extra-night inquiry",
      category: "Disruption care",
      status: "Awaiting hotel approval",
      priority: disruption.severity === "high" || disruption.severity === "critical" ? "urgent" : "normal",
      detail: detail + " Requested in response to: " + disruption.title + ". Staff approval is required; this does not reserve a room or confirm a booking.",
      disruptionId: disruption.id,
      careOfferType,
      guestName: "Demo guest",
      aiSuggested: true,
      aiSuggestionReason: "This is a manager-configured care option triggered by a recorded disruption.",
      actionActor: "Guest",
      ...extra,
    });
    recordAction({ title: "Disruption care requested (demo)", detail: careOfferType + " · " + disruption.title, actor: "Guest" });
  };
  if (!disruption) return null;
  const lateTiers = Array.isArray(flexSettings.flexTiers?.late) ? flexSettings.flexTiers.late : [];
  const preferredTier = lateTiers.slice().sort((a, b) => Number(a.fee) - Number(b.fee))[0];
  const discount = Math.max(0, Math.min(80, Number(flexSettings.disruptionCare?.lateCheckoutDiscountPercent) || 0));
  const discountedFee = preferredTier ? Math.round(Math.max(0, Number(preferredTier.fee) || 0) * (100 - discount) / 100) : null;
  const delay = disruption.type === "flight_delay";
  return <div className="space-y-4">
    <section role="status" aria-live="polite" className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-200/70 dark:bg-amber-900"><AlertTriangle size={18}/></span>
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-extrabold">Disruption advisory</p><Severity value={disruption.severity}/><span className="rounded-full border border-current px-2 py-1 text-[9px] font-bold">{disruption.source === "live" ? "Live weather · Open-Meteo" : "DEMO EVENT"}</span></div><p className="mt-1 text-sm leading-relaxed">{advisory}</p><p className="mt-1 text-[10px] opacity-80">No live road, transport, flight or venue-availability feed is connected.</p></div>
    </section>
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand dark:text-saffron"><CloudRain size={20}/></span><div><h2 className="font-serif text-2xl">Disruption Care</h2><p className="mt-1 text-xs leading-relaxed text-muted">{disruption.title} · detected {new Intl.DateTimeFormat(destination.locale, { dateStyle: "medium", timeStyle: "short", timeZone: destination.timezone }).format(new Date(disruption.detectedAt))}</p></div></div>
      {alternatives.length ? <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{alternatives.map((place) => <article key={place.id} className="rounded-xl border border-border bg-bg p-3"><div className="flex items-center justify-between gap-2"><p className="text-sm font-bold">{place.name}</p><span className="rounded-full bg-surface px-2 py-1 text-[9px] font-bold text-muted">{place.distanceKm === Infinity ? "nearby" : place.distanceKm.toFixed(1) + " km estimate"}</span></div><p className="mt-1 text-xs leading-relaxed text-muted">{place.reason}. This is a destination-pack alternative, not live venue availability.</p><button type="button" onClick={() => accept(place)} className="mt-3 min-h-10 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white">Accept alternative <ArrowRight size={13} className="ml-1 inline"/></button></article>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-border p-3 text-sm text-muted">No suitable alternative is tagged in this destination pack; keep your plan and ask the hotel team to confirm local conditions.</p>}
      <button type="button" onClick={keepOriginal} className="mt-3 min-h-10 rounded-lg border border-border bg-bg px-3 py-2 text-xs font-bold">Keep original plan</button>
      {(hostPicks.length > 0 || warmDishes.length > 0) && <div className="mt-4 grid grid-cols-1 gap-3 border-t border-border pt-4 md:grid-cols-2">
        {hostPicks.length > 0 && <div><p className="flex items-center gap-2 text-sm font-bold"><Sparkles size={15}/>Rain-friendly Host's Picks</p><div className="mt-2 space-y-2">{hostPicks.map((pick) => <div key={pick.id} className="rounded-lg bg-bg p-3"><p className="text-xs font-bold">{pick.name}</p><p className="mt-1 text-[10px] text-muted">{pick.hostNote || pick.description} · Demo listing</p></div>)}</div></div>}
        {warmDishes.length > 0 && <div><p className="flex items-center gap-2 text-sm font-bold"><Utensils size={15}/>Warm Taste Local ideas</p><div className="mt-2 space-y-2">{warmDishes.map((dish) => <div key={dish.id} className="rounded-lg bg-bg p-3"><p className="text-xs font-bold">{dish.name} · {dish.price == null ? "Price to confirm" : formatCurrency(dish.price)}</p><p className="mt-1 text-[10px] text-muted">{dish.rankReason || "A warm dish from the destination pack"}. Confirm ingredients with the restaurant.</p></div>)}</div></div>}
      </div>}
      <div className="mt-4 rounded-xl border border-border bg-bg p-3">
        <div className="flex items-center gap-2"><BedDouble size={17}/><p className="text-sm font-bold">Hotel care options · demo only</p></div>
        {delay && flexSettings.disruptionCare?.lateArrivalHoldEnabled !== false && <div className="mt-3 rounded-lg bg-surface p-3"><p className="text-xs font-bold">Late-arrival hold</p><p className="mt-1 text-xs text-muted">{flexSettings.disruptionCare?.lateArrivalNote || "Late arrival noted; the front desk must confirm the hold."}</p><button type="button" onClick={() => requestCare("late_arrival_hold", flexSettings.disruptionCare?.lateArrivalNote || "Please note a delayed arrival and hold the room if hotel policy permits.")} className="mt-2 min-h-10 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white">Request late-arrival hold</button></div>}
        {!delay && flexSettings.disruptionCare?.lateCheckoutReliefEnabled !== false && <div className="mt-3 rounded-lg bg-surface p-3"><p className="text-xs font-bold">Discounted late check-out</p><p className="mt-1 text-xs text-muted">{preferredTier ? "Demo tier until " + preferredTier.until + " · " + discount + "% manager-configured discount · estimated " + formatCurrency(discountedFee) : "No late check-out tiers are configured in this destination pack."}</p>{preferredTier && <button type="button" onClick={() => requestCare("discounted_late_checkout", "Proposed late check-out until " + preferredTier.until + " at estimated " + formatCurrency(discountedFee) + " after a " + discount + "% demo discount. Original pack tier was " + formatCurrency(preferredTier.fee) + ".", { offerFee: discountedFee, requestedTime: preferredTier.until, discountPercent: discount })} className="mt-2 min-h-10 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white">Request discounted late check-out</button>}</div>}
        {!delay && flexSettings.disruptionCare?.extraNightOfferEnabled === true && <div className="mt-3 rounded-lg bg-surface p-3"><p className="text-xs font-bold">Ask about an extra night</p><p className="mt-1 text-xs text-muted">{flexSettings.disruptionCare?.extraNightNote || "Ask the front desk for a manager-confirmed room rate."} No nightly rate is configured in this pack, so no price is guessed.</p><button type="button" onClick={() => requestCare("extra_night", "Guest asks whether an extra night can be offered due to " + disruption.title + ". Manager to quote a local-currency rate and confirm room availability.")} className="mt-2 min-h-10 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white">Ask about an extra night</button></div>}
        <p className="mt-3 text-[10px] leading-relaxed text-muted">All care offers require manager approval. No room is held and no payment is taken by this demo.</p>
      </div>
    </section>
  </div>;
}
