import React, { useEffect, useMemo, useState } from "react";
import {
  Bookmark, Check, Clock3, Compass, ExternalLink, Map as MapIcon, MapPin,
  Plus, Send, Sparkles, Sun, Users, X
} from "lucide-react";
import { rankPlaces, rankDishes, rankExperiences } from "../lib/rank.js";

const SEGMENTS = [
  { id: "hidden", label: "Hidden Gems", icon: Sparkles },
  { id: "experiences", label: "Local Experiences", icon: Users },
  { id: "food", label: "Taste Local", icon: Sun }
];

function readArray(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
function writeArray(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep changes in memory for this session. */ }
}
function localDaypart(timezone) {
  try {
    const hour = Number(new Intl.DateTimeFormat("en", { hour: "2-digit", hourCycle: "h23", timeZone: timezone }).format(new Date()));
    return hour < 11 ? "morning" : hour < 16 ? "afternoon" : "evening";
  } catch { return "afternoon"; }
}
function niceWord(value) {
  return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function money(value, destination) {
  if (!Number.isFinite(Number(value))) return "—";
  try {
    return new Intl.NumberFormat(destination.locale, {
      style: "currency",
      currency: destination.currency.code,
      maximumFractionDigits: ["IDR", "JPY", "KRW", "VND", "CLP"].includes(destination.currency.code) ? 0 : 2
    }).format(Number(value));
  } catch { return new Intl.NumberFormat(destination.locale).format(Number(value)) + " " + destination.currency.code; }
}
function moneyRange(range, destination) {
  if (!Array.isArray(range)) return "—";
  return money(range[0], destination) + " – " + money(range[1], destination);
}
function story(item) {
  return item.localStory || item.description || "Story details are part of this demonstration pack.";
}
function reasonChips(item) {
  const reasons = Array.isArray(item.reasons) ? item.reasons : [];
  return reasons.length
    ? <div className="mt-3"><p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Why this for you</p><div className="flex flex-wrap gap-1.5">{reasons.slice(0, 5).map((reason, index) => <span key={reason + index} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] leading-relaxed text-muted">{reason}</span>)}</div></div>
    : <p className="mt-3 text-[10px] text-muted">Why this for you: a match from your selected destination pack.</p>;
}
function Badge({ children, accent }) {
  return <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold" style={accent ? { backgroundColor: accent.soft, color: accent.color } : undefined}>{children}</span>;
}
function SavedExperience({ saved, onSave }) {
  return <button type="button" onClick={onSave} aria-pressed={saved} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold">{saved ? <Check size={14}/> : <Bookmark size={14}/>} {saved ? "Saved locally" : "Save"}</button>;
}

export default function DiscoverTab({
  destination,
  profile,
  weather,
  itinerary = [],
  requests = [],
  addItineraryItem,
  addRequest,
  removeItineraryStop,
  onShowOnMap,
  focusPlaceId = null
}) {
  const [segment, setSegment] = useState("hidden");
  const [beatCrowds, setBeatCrowds] = useState(Boolean(profile?.avoidCrowds));
  const [gemFilter, setGemFilter] = useState("hidden");
  const [mapVisible, setMapVisible] = useState(Boolean(focusPlaceId));
  const [search, setSearch] = useState("");
  const [tasteDiet, setTasteDiet] = useState(profile?.diet || "none");
  const [spiceCap, setSpiceCap] = useState(Number(profile?.spiceTolerance) || 2);
  const [tasteBudget, setTasteBudget] = useState(() => profile?.dailyBudget?.currencyCode === destination.currency.code && profile?.dailyBudget?.amount != null ? String(profile.dailyBudget.amount) : "");
  const [tasteTime, setTasteTime] = useState("now");
  const [eatNow, setEatNow] = useState(false);
  const [savedExperiences, setSavedExperiences] = useState(() => readArray("atithi-saved-experiences:" + destination.id));
  const [expandedStories, setExpandedStories] = useState([]);
  const [suggestionName, setSuggestionName] = useState("");
  const [suggestionArea, setSuggestionArea] = useState("");
  const [suggestionStory, setSuggestionStory] = useState("");
  const [suggestionSaved, setSuggestionSaved] = useState(false);
  const [localSuggestions, setLocalSuggestions] = useState(() => readArray("atithi-local-suggestions:" + destination.id));

  useEffect(() => {
    setSavedExperiences(readArray("atithi-saved-experiences:" + destination.id));
    setLocalSuggestions(readArray("atithi-local-suggestions:" + destination.id));
    setSuggestionSaved(false);
    setTasteBudget(profile?.dailyBudget?.currencyCode === destination.currency.code && profile?.dailyBudget?.amount != null ? String(profile.dailyBudget.amount) : "");
    setTasteDiet(profile?.diet || "none");
    setSpiceCap(Number(profile?.spiceTolerance) || 2);
    setBeatCrowds(Boolean(profile?.avoidCrowds));
  }, [destination.id, destination.currency.code, profile?.dailyBudget?.amount, profile?.dailyBudget?.currencyCode, profile?.diet, profile?.spiceTolerance, profile?.avoidCrowds]);

  useEffect(() => { if (focusPlaceId) setMapVisible(true); }, [focusPlaceId]);

  const currentPart = useMemo(() => localDaypart(destination.timezone), [destination.timezone]);
  const freeMinutes = profile?.pace === "relaxed" ? 180 : profile?.pace === "packed" ? 600 : 360;
  const availableBudget = profile?.dailyBudget?.currencyCode === destination.currency.code ? profile?.dailyBudget?.amount : null;
  const rankingProfile = useMemo(() => ({
    ...profile,
    avoidCrowds: beatCrowds,
    dailyBudget: {
      ...(profile?.dailyBudget || {}),
      amount: availableBudget
    }
  }), [profile, beatCrowds, availableBudget]);

  const sharedContext = useMemo(() => ({
    weather,
    timeOfDay: currentPart,
    freeMinutes,
    budget: availableBudget
  }), [weather, currentPart, freeMinutes, availableBudget]);

  const rankedPlaces = useMemo(() => {
    const ranked = rankPlaces(destination.places, rankingProfile, { avoidCrowds: beatCrowds }, sharedContext);
    const matchingFilter = ranked.filter((place) => {
      if (gemFilter === "hidden") return place.isHiddenGem === true;
      if (gemFilter === "famous") return place.isHiddenGem !== true;
      return true;
    });
    const query = search.trim().toLocaleLowerCase();
    return matchingFilter.filter((place) => !query || [place.name, place.category, place.localStory, ...(place.tags || [])].join(" ").toLocaleLowerCase().includes(query));
  }, [destination.places, rankingProfile, beatCrowds, profile?.avoidCrowds, sharedContext, gemFilter, search]);

  const rankedExperiences = useMemo(() => rankExperiences(
    destination.experiences.filter((experience) => experience.communityLed === true),
    rankingProfile,
    { avoidCrowds: beatCrowds || Boolean(profile?.avoidCrowds) },
    sharedContext
  ), [destination.experiences, rankingProfile, beatCrowds, profile?.avoidCrowds, sharedContext]);

  const parsedBudget = tasteBudget.trim() === "" ? null : Number(tasteBudget);
  const validTasteBudget = parsedBudget !== null && Number.isFinite(parsedBudget) && parsedBudget >= 0 ? parsedBudget : null;
  const tasteProfile = useMemo(() => ({
    ...rankingProfile,
    diet: tasteDiet,
    spiceTolerance: Number(spiceCap) || 2,
    dailyBudget: { ...(rankingProfile.dailyBudget || {}), amount: validTasteBudget }
  }), [rankingProfile, tasteDiet, spiceCap, validTasteBudget]);
  const tasteFilters = useMemo(() => ({
    diet: tasteDiet,
    maxSpiceLevel: Number(spiceCap) || 3,
    maxBudgetLocal: validTasteBudget,
    timeOfDay: tasteTime === "now" ? currentPart : tasteTime === "any" ? null : tasteTime
  }), [tasteDiet, spiceCap, validTasteBudget, tasteTime, currentPart]);

  const rankedDishes = useMemo(() => rankDishes(
    destination.dishes,
    tasteProfile,
    tasteFilters,
    { ...sharedContext, timeOfDay: tasteFilters.timeOfDay || currentPart }
  ), [destination.dishes, tasteProfile, tasteFilters, sharedContext, currentPart]);

  const nowDishes = useMemo(() => {
    const currentTimeMatches = rankDishes(
      destination.dishes,
      tasteProfile,
      { ...tasteFilters, timeOfDay: currentPart },
      { ...sharedContext, timeOfDay: currentPart }
    );
    if (currentTimeMatches.length >= 3) return currentTimeMatches.slice(0, 3);
    const fallbackMatches = rankDishes(
      destination.dishes,
      tasteProfile,
      { ...tasteFilters, timeOfDay: null },
      { ...sharedContext, timeOfDay: currentPart }
    );
    const existing = new Set(currentTimeMatches.map((dish) => dish.id));
    return [...currentTimeMatches, ...fallbackMatches.filter((dish) => !existing.has(dish.id))].slice(0, 3);
  }, [destination.dishes, tasteProfile, tasteFilters, sharedContext, currentPart]);

  const itineraryIds = useMemo(() => new Set(itinerary.flatMap((item) => [item.id, item.placeId, item.itemId].filter(Boolean)), [itinerary]);
  const hasPlanItem = (item, type) => itineraryIds.has(type === "experience" || type === "dish" ? type + "-" + item.id : item.id) || itineraryIds.has(item.id);
  const toggleSavedExperience = (id) => {
    setSavedExperiences((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      writeArray("atithi-saved-experiences:" + destination.id, next);
      return next;
    });
  };
  const addToPlan = (item, type = "place") => {
    if (typeof addItineraryItem === "function") addItineraryItem(item, type);
  };
  const showPlaceOnMap = (placeId) => {
    setMapVisible(true);
    if (typeof onShowOnMap === "function") onShowOnMap(placeId);
  };
  const saveExperienceRequest = (experience) => {
    if (requests.some((request) => request.category === "Experience request (demo)" && request.title === experience.title)) return;
    addRequest?.({
      title: experience.title,
      category: "Experience request (demo)",
      detail: [
        "Demo only — no host has been contacted and no booking exists.",
        "Illustrative host: " + experience.hostName,
        "Destination: " + destination.city + ", " + destination.country,
        "Experience idea: " + story(experience),
        "Illustrative price: " + money(experience.priceLocal, destination)
      ].join("\n")
    });
  };
  const saveContributorSuggestion = (event) => {
    event.preventDefault();
    const name = suggestionName.trim().slice(0, 100);
    const area = suggestionArea.trim().slice(0, 120);
    const details = suggestionStory.trim().slice(0, 700);
    if (!name || !area || !details) return;
    const suggestion = {
      id: Date.now().toString(36),
      name,
      area,
      details,
      destinationId: destination.id,
      createdAt: new Date().toISOString(),
      status: "Thanks, a local curator would review this (demo)"
    };
    setLocalSuggestions((current) => {
      const next = [suggestion, ...current].slice(0, 20);
      writeArray("atithi-local-suggestions:" + destination.id, next);
      return next;
    });
    setSuggestionName("");
    setSuggestionArea("");
    setSuggestionStory("");
    setSuggestionSaved(true);
  };

  const isInPlan = (item, type) => hasPlanItem(item, type);
  const [DestinationMap, setDestinationMap] = useState(null);
  useEffect(() => {
    if (!mapVisible) return undefined;
    let active = true;
    import("./DestinationMap.jsx").then((module) => { if (active) setDestinationMap(() => module.default); }).catch(() => { if (active) setDestinationMap(null); });
    return () => { active = false; };
  }, [mapVisible]);

  const mapSection = mapVisible ? <section id="destination-map-container" className="rounded-2xl border border-border bg-surface p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Map view</h2><p className="mt-1 text-xs text-muted">Pins show pack locations. Coordinates and crowd estimates are approximate.</p></div><Badge accent={{ color: destination.themeColors.accent, soft: destination.themeColors.accentSoft }}>{destination.city}, {destination.country}</Badge></div>
    <div className="mt-3 min-h-[320px] overflow-hidden rounded-xl border border-border">
      {DestinationMap ? <DestinationMap destination={destination} height={360} focusPlaceId={focusPlaceId} onAddPlace={(place) => addToPlan(place, "place")} plannedIds={[...itineraryIds]}/> : <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted"><span className="animate-pulse">Loading map…</span></div>}
    </div>
  </section> : null;

  return <section className="space-y-5">
    <div className="overflow-hidden rounded-3xl p-5 text-white sm:p-7" style={{ background: "linear-gradient(125deg, #163e4b 0%, #28365c 55%, " + destination.themeColors.accent + " 100%)" }}>
      <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">Discover · {destination.city}</p>
      <h1 className="mt-2 font-serif text-4xl">Go beyond the usual.</h1>
      <p className="mt-2 max-w-2xl text-sm text-white/80">Find hidden corners, community-led ideas and dishes that say something about this place.</p>
      <p className="mt-3 text-[10px] leading-relaxed text-white/75">Demo content · Experiences, stories and prices are illustrative. Confirm details locally.</p>
    </div>

    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
      <div className="flex flex-wrap gap-1 rounded-xl bg-bg p-1">{SEGMENTS.map(({ id, label, icon: Icon }) => <button key={id} type="button" onClick={() => setSegment(id)} aria-pressed={segment === id} className={"inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold sm:text-sm " + (segment === id ? "bg-brand text-white shadow-sm" : "text-muted hover:bg-surface-2")}>{Icon && <Icon size={15}/>}<span>{label}</span></button>)}}</div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setBeatCrowds((current) => !current)} role="switch" aria-checked={beatCrowds} className={"inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold " + (beatCrowds ? "border-transparent bg-brand text-white" : "border-border bg-bg text-text")}><span className={"h-2 w-2 rounded-full " + (beatCrowds ? "bg-emerald-300" : "bg-muted")}/>{beatCrowds ? "Beat the crowds: on" : "Beat the crowds"}</button>
        <button type="button" onClick={() => setMapVisible((visible) => !visible)} aria-pressed={mapVisible} className={"inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold " + (mapVisible ? "border-transparent bg-brand text-white" : "border-border bg-bg text-text")}><MapIcon size={14}/>{mapVisible ? "Hide map" : "Map view"}</button>
      </div>
    </div>

    {mapSection}

    {segment === "hidden" && <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">Hidden gems and familiar landmarks</h2><p className="mt-1 text-xs text-muted">Sorted by your profile, interests, pace and current conditions.</p></div><Badge accent={{ color: destination.themeColors.accent, soft: destination.themeColors.accentSoft }}>{rankedPlaces.length} matches</Badge></div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row"><label className="relative block min-w-0 flex-1"><span className="sr-only">Search places</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search place names, stories or tags" className="min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm"/></label><div className="flex rounded-xl border border-border bg-bg p-1" role="group" aria-label="Hidden versus famous filter">{[["hidden","Hidden gems"],["famous","Famous"],["all","All"]].map(([value,label]) => <button key={value} type="button" onClick={() => setGemFilter(value)} aria-pressed={gemFilter === value} className={"min-h-9 flex-1 rounded-lg px-3 py-1.5 text-xs font-bold " + (gemFilter === value ? "bg-surface-2 text-text" : "text-muted")}>{label}</button>)}</div></div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rankedPlaces.map((place) => {
          const inPlan = isInPlan(place, "place");
          const opened = expandedStories.includes(place.id);
          return <article key={place.id} className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4 transition-colors hover:bg-surface-2/40">
            <div className="flex flex-wrap items-center gap-2"><Badge accent={{ color: destination.themeColors.accent, soft: destination.themeColors.accentSoft }}>{place.category}</Badge>{place.isHiddenGem ? <Badge accent={{ color: destination.themeColors.accent, soft: destination.themeColors.accentSoft }}>Hidden-place pick</Badge> : <Badge>Famous / established</Badge>}</div>
            <h3 className="mt-3 font-serif text-2xl leading-snug">{place.name}</h3>
            <div className="mt-2 flex flex-wrap gap-1.5"><Badge>{niceWord(place.crowdLevel)} · Estimated crowd</Badge>{place.rainFriendly && <Badge>Rain-friendly</Badge>}{place.indoor && <Badge>Indoor</Badge>}<Badge><Clock3 className="mr-1 inline" size={11}/>{niceWord(place.bestTime)}</Badge></div>
            <details className="mt-3 rounded-xl border border-border bg-bg p-3"><summary className="cursor-pointer text-xs font-extrabold">Local story</summary><p className="mt-2 text-sm leading-relaxed text-muted">{story(place)}</p></details>
            {reasonChips(place)}
            <div className="mt-auto flex flex-wrap gap-2 pt-4"><button type="button" onClick={() => addToPlan(place, "place")} disabled={inPlan} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{inPlan ? <Check size={14}/> : <Plus size={14}/>} {inPlan ? "Added to plan" : "Add to plan"}</button><button type="button" onClick={() => showPlaceOnMap(place.id)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold"><MapPin size={14}/>Show on map</button></div>
            <p className="mt-3 text-[10px] text-muted">Demo content · Story and crowd level are estimates.</p>
          </article>;
        })}
      </div>
      {!rankedPlaces.length && <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted">No places fit these filters. Choose “All” or try another search.</p>}

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-2"><Sparkles size={17} className="text-accent-text"/><h2 className="font-serif text-2xl">Suggest a hidden gem</h2></div>
        <p className="mt-1 text-xs leading-relaxed text-muted">Share a place or local story for a possible future community-curation workflow. Suggestions are stored only on this device; no curator is contacted.</p>
        <form onSubmit={saveContributorSuggestion} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold text-muted">Place name<input required maxLength={100} value={suggestionName} onChange={(event) => setSuggestionName(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-normal text-text"/></label>
          <label className="text-xs font-bold text-muted">Area / neighbourhood<input required maxLength={120} value={suggestionArea} onChange={(event) => setSuggestionArea(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-normal text-text"/></label>
          <label className="text-xs font-bold text-muted sm:col-span-2">Why is it special?<textarea required maxLength={700} rows={3} value={suggestionStory} onChange={(event) => setSuggestionStory(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-normal text-text" placeholder="A personal detail, craft, view or local story…"/></label>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2"><button type="submit" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white"><Send size={14}/>Save suggestion locally</button>{suggestionSaved && <p role="status" className="text-xs font-semibold text-accent-text">Thanks, a local curator would review this (demo).</p>}</div>
        </form>
        {localSuggestions.length > 0 && <p className="mt-3 text-[10px] text-muted">{localSuggestions.length} suggestion{localSuggestions.length === 1 ? "" : "s"} saved on this device.</p>}
      </section>
    </section>}

    {segment === "experiences" && <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4"><h2 className="font-serif text-2xl">Local experiences</h2><p className="mt-1 text-xs text-muted">Community-led activity ideas ranked against your interests, pace and travel party. Hosts and prices are demo content.</p><p className="mt-1 text-[10px] text-muted">“Request via host (demo)” only saves a note here. It does not contact a host or create a booking.</p></div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{rankedExperiences.map((experience) => {
        const saved = savedExperiences.includes(experience.id);
        const inPlan = isInPlan(experience, "experience");
        const requested = requests.some((request) => request.category === "Experience request (demo)" && request.title === experience.title);
        return <article key={experience.id} className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center gap-2"><Badge accent={{ color: destination.themeColors.accent, soft: destination.themeColors.accentSoft }}>{experience.category}</Badge>{experience.communityLed && <Badge accent={{ color: destination.themeColors.accent, soft: destination.themeColors.accentSoft }}>Community-led</Badge>}<Badge>Demo content</Badge></div>
          <h3 className="mt-3 font-serif text-2xl leading-snug">{experience.title}</h3>
          <p className="mt-2 text-xs text-muted">Demo host: <span className="font-semibold text-text">{experience.hostName}</span></p>
          <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{story(experience)}</p>
          <div className="mt-3 flex flex-wrap gap-1.5"><Badge><Clock3 size={11} className="mr-1 inline"/>{experience.durationMin} min</Badge><Badge>{experience.rainFriendly ? "Rain-friendly" : "Weather dependent"}</Badge></div>
          <p className="mt-2 text-xs text-muted">Suits: {(experience.suitsWho || []).map(niceWord).join(", ") || "Varied travel styles"}</p>
          <p className="mt-3 text-sm font-extrabold">{money(experience.priceLocal, destination)} <span className="text-[10px] font-normal text-muted">· illustrative local-currency price</span></p>
          {reasonChips(experience)}
          <div className="mt-auto flex flex-wrap gap-2 pt-4"><SavedExperience saved={saved} onSave={() => toggleSavedExperience(experience.id)}/><button type="button" onClick={() => addToPlan(experience, "experience")} disabled={inPlan} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{inPlan ? <Check size={14}/> : <Plus size={14}/>} {inPlan ? "Added to plan" : "Add to plan"}</button></div>
          <button type="button" disabled={requested} onClick={() => saveExperienceRequest(experience)} className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold disabled:opacity-60">{requested ? <Check size={14}/> : <Send size={14}/>} {requested ? "Request saved (demo)" : "Request via host (demo)"}</button>
        </article>;
      })}</div>
      {!rankedExperiences.length && <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted">No community-led activity matches this profile in the current pack.</p>}
    </section>}

    {segment === "food" && <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="font-serif text-2xl">Taste Local</h2><p className="mt-1 text-xs text-muted">Recommendations consider your food preference, spice tolerance, estimated spend and destination time.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <label className="text-xs font-bold text-muted">Diet filter<select value={tasteDiet} onChange={(event) => setTasteDiet(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"><option value="none">No preference</option><option value="veg">Vegetarian</option><option value="vegan">Vegan</option><option value="non-veg">Non-vegetarian</option><option value="halal">Halal-tagged only</option><option value="gluten-aware">Gluten-aware</option></select></label>
          <label className="text-xs font-bold text-muted">Maximum spice<select value={spiceCap} onChange={(event) => setSpiceCap(Number(event.target.value))} className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"><option value={1}>1 · Mild</option><option value={2}>2 · Medium</option><option value={3}>3 · Hot</option></select></label>
          <label className="text-xs font-bold text-muted">Maximum spend ({destination.currency.code})<input type="number" min="0" step="any" value={tasteBudget} onChange={(event) => setTasteBudget(event.target.value)} placeholder="No cap" className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-normal text-text"/></label>
          <label className="text-xs font-bold text-muted">Time of day<select value={tasteTime} onChange={(event) => { setTasteTime(event.target.value); setEatNow(false); }} className="mt-1 min-h-10 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"><option value="now">Now · {niceWord(currentPart)}</option><option value="any">Any time</option><option value="morning">Morning</option><option value="afternoon">Afternoon</option><option value="evening">Evening</option></select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-[10px] leading-relaxed text-muted">Dietary tags are estimates. Confirm ingredients with the restaurant, including allergens and preparation.</p><button type="button" onClick={() => { setEatNow(true); setTasteTime("now"); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-extrabold text-white"><Sparkles size={14}/>What should I eat now?</button></div>
      </div>
      {eatNow && <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><div><h3 className="font-serif text-2xl">Three ideas for right now</h3><p className="mt-1 text-xs text-muted">Matched to your diet, spice preference, current destination time and live weather when available. If fewer than three items fit the exact time, the remaining suggestions relax time only.</p></div><button type="button" onClick={() => setEatNow(false)} aria-label="Dismiss eat now ideas" className="rounded-lg border border-border p-2"><X size={15}/></button></div>
        {nowDishes.length ? <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">{nowDishes.map((dish) => <DishCard key={dish.id} dish={dish} destination={destination} ranked={dish} formatCurrency={money} onAdd={() => addToPlan(dish,"dish")} inPlan={isInPlan(dish,"dish")} showOnMap={() => showPlaceOnMap(destination.places.find((place) => ["market","cafe"].includes(place.category))?.id || destination.places[0]?.id)}/>)}</div> : <p className="mt-3 text-sm text-muted">No dish fits every current filter. Try “Any time” or allow a higher spice level or spend.</p>}
      </section>}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{rankedDishes.map((dish) => <DishCard key={dish.id} dish={dish} destination={destination} ranked={dish} formatCurrency={money} onAdd={() => addToPlan(dish,"dish")} inPlan={isInPlan(dish,"dish")} showOnMap={() => showPlaceOnMap(destination.places.find((place) => ["market","cafe"].includes(place.category))?.id || destination.places[0]?.id)}/>)}</div>
      {!rankedDishes.length && <p className="rounded-2xl border border-dashed border-border bg-surface p-6 text-sm text-muted">No dishes match every filter. Try a broader diet selection, a higher maximum spice or more budget.</p>}
    </section>}
  </section>;
}

function DishCard({ dish, destination, ranked, formatCurrency, onAdd, inPlan, showOnMap }) {
  const place = destination.places.find((item) => ["market", "cafe"].includes(item.category)) || destination.places[0];
  const range = Array.isArray(dish.priceRangeLocal) ? formatCurrency(dish.priceRangeLocal[0], destination) + " – " + formatCurrency(dish.priceRangeLocal[1], destination) : "Price estimate unavailable";
  const mapHref = place ? "geo:" + place.lat + "," + place.lon + "?q=" + encodeURIComponent((dish.whereToEat || "local food") + " " + destination.city) : "geo:0,0";
  const dietNotes = [];
  if (dish.diet?.veg === true) dietNotes.push("Vegetarian-tagged");
  if (dish.diet?.vegan === true) dietNotes.push("Vegan-tagged");
  if (dish.diet?.nonVeg === true) dietNotes.push("Non-vegetarian-tagged");
  if (dish.diet?.halal === true) dietNotes.push("Halal-tagged");
  if (dish.diet?.glutenFree === true) dietNotes.push("Gluten-aware tag");
  return <article className="flex flex-col rounded-2xl border border-border bg-surface p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><h3 className="font-serif text-2xl">{dish.name}</h3><Badge>Demo range</Badge></div>
    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{dish.description}</p>
    <p className="mt-2 text-xs text-muted">Where to look: {dish.whereToEat}</p>
    <p className="mt-2 text-xs text-muted">{dietNotes.length ? dietNotes.join(" · ") : "Dietary details unknown — check recipe and preparation"} · Spice {dish.spiceLevel}/3</p>
    <p className="mt-2 text-sm font-extrabold">{range}</p>
    {reasonChips(ranked)}
    <p className="mt-3 rounded-lg border border-border bg-bg p-2 text-[10px] leading-relaxed text-muted">Confirm ingredients with the restaurant. Recipes and preparation vary; no allergen-safety claim is made.</p>
    <div className="mt-auto flex flex-wrap gap-2 pt-4"><button type="button" onClick={onAdd} disabled={inPlan} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{inPlan ? <Check size={14}/> : <Plus size={14}/>} {inPlan ? "Added to plan" : "Add to plan"}</button><a href={mapHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold" aria-label={"Open a map near " + dish.whereToEat}>{<ExternalLink size={14}/>}Map area</a><button type="button" onClick={showOnMap} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-bold"><MapPin size={14}/>In-app map</button></div>
    <p className="mt-3 text-[10px] text-muted">Demo content · Estimated local price range.</p>
  </article>;
}
