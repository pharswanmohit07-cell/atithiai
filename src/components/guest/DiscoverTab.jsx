import React, { useMemo, useState } from "react";
import { BadgeCheck, CalendarClock, ChefHat, Compass, ExternalLink, MapPin, ShoppingBag, Sparkles, Utensils } from "lucide-react";
import { useHotelContext } from "../../context/HotelContext.jsx";
import { getFreeTimeMinutes, rankDishes, rankExperiences } from "../../lib/rank.js";

const panel = "rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5";
const field = "min-h-10 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold text-text";
const button = "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-text disabled:cursor-not-allowed disabled:opacity-50";
function isRainy(weather) { return /rain|drizzle|shower|storm|wet/i.test(String(weather?.kind || weather?.condition || "")); }
function hostDetails(experience, settings) {
  const staff = settings.hostExperiencePicks?.[experience.id] || {};
  return { enabled: staff.enabled !== false, note: String(staff.note || experience.hostNote || "The front desk team selected this destination-pack listing.").trim() };
}
function displayDuration(minutes, locale) {
  const total = Math.max(0, Number(minutes) || 0);
  if (!total) return "Duration to confirm";
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return new Intl.ListFormat(locale, { style: "short", type: "conjunction" }).format([
    ...(hours ? [hours + " hr" + (hours === 1 ? "" : "s")] : []),
    ...(mins ? [mins + " min"] : []),
  ]);
}
function niceLabel(value) { return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }

function ExperienceCard({ experience, note, destination, formatCurrency, headcount, onBook }) {
  return <article className="flex w-[min(84vw,290px)] shrink-0 flex-col rounded-2xl border border-border bg-bg p-4">
    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand/10 px-2 py-1 text-[9px] font-extrabold uppercase tracking-wide text-brand dark:text-saffron">Host's pick</span><span className="demo-badge">Demo listing</span></div>
    <h3 className="mt-3 font-serif text-lg leading-snug">{experience.name}</h3><p className="mt-1 text-xs leading-relaxed text-muted">{experience.description}</p>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><p className="rounded-lg bg-surface p-2"><span className="block text-[10px] text-muted">Partner (demo)</span><span className="mt-1 block font-semibold">{experience.partner}</span></p><p className="rounded-lg bg-surface p-2"><span className="block text-[10px] text-muted">Duration</span><span className="mt-1 block font-semibold">{displayDuration(experience.durationMinutes, destination.locale)}</span></p></div>
    <p className="mt-2 text-sm font-bold">{experience.price == null ? "Price to confirm" : formatCurrency(experience.price)} <span className="text-[10px] font-normal text-muted">per person · demo estimate</span></p>
    <p className="mt-1 text-xs text-muted">Estimated total for {headcount}: {experience.price == null ? "confirm with staff" : formatCurrency(Number(experience.price) * headcount)}</p>
    <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100"><p className="font-extrabold">A note from the host team</p><p className="mt-1">{note}</p></div>
    <p className="mt-2 text-[10px] leading-relaxed text-muted">{experience.category} · {experience.rainFriendly ? "Rain-friendly" : "Weather dependent"} · Suits {Array.isArray(experience.suits) ? experience.suits.map(niceLabel).join(", ") : "varied parties"}</p>
    {experience.rankReason && <p className="mt-1 text-[10px] leading-relaxed text-muted">Why this pick: {experience.rankReason}.</p>}
    <button type="button" onClick={() => onBook(experience)} className="mt-4 min-h-11 w-full rounded-xl bg-brand px-3 py-2 text-xs font-extrabold text-white"><CalendarClock size={15} className="mr-1 inline"/>Book via hotel</button>
  </article>;
}
function DishCard({ dish, destination, formatCurrency, onOrder }) {
  const mapUrl = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(dish.name + " restaurants " + destination.city);
  return <article className="rounded-xl border border-border bg-bg p-3">
    <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold">{dish.name}</h3><span className="demo-badge">Demo dish</span></div>
    <p className="mt-1 text-xs text-muted">{dish.price == null ? "Price to confirm" : formatCurrency(dish.price)} <span className="text-[10px]">· demo estimate</span></p>
    <p className="mt-1 text-xs leading-relaxed text-muted">{dish.whereToEat}</p>
    <p className="mt-2 text-[10px] text-muted">Diet tags: {(dish.diet || []).map(niceLabel).join(", ") || "Ask the kitchen"} · Spice: {niceLabel(dish.spiceLevel)}</p>
    {dish.rankReason && <p className="mt-2 rounded-lg bg-surface p-2 text-xs leading-relaxed"><strong>Why:</strong> {dish.rankReason}.</p>}
    <p className="mt-2 text-[11px] font-bold text-amber-800 dark:text-amber-200">Confirm ingredients with the restaurant. This is not an allergen-free claim.</p>
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => onOrder(dish)} className="min-h-10 flex-1 rounded-lg bg-brand px-2 py-2 text-xs font-bold text-white"><ShoppingBag size={13} className="mr-1 inline"/>Order via hotel kitchen</button><a href={mapUrl} target="_blank" rel="noreferrer" className={button}><MapPin size={13}/>Directions <ExternalLink size={12}/></a></div>
  </article>;
}

export default function DiscoverTab({ destination, weather, preferences, itinerary, addItineraryStop, addRequest, formatCurrency }) {
  const { flexSettings, requests } = useHotelContext();
  const [experienceCategory, setExperienceCategory] = useState("all");
  const [rainOnly, setRainOnly] = useState(false);
  const [partyFit, setPartyFit] = useState("all");
  const [diet, setDiet] = useState("any");
  const [spice, setSpice] = useState("any");
  const [budgetCap, setBudgetCap] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("any");
  const [suggestedIds, setSuggestedIds] = useState([]);
  const [headcount, setHeadcount] = useState(1);
  const activeExperiences = useMemo(() => {
    if (!flexSettings.hostPicks.localExperiences) return [];
    return destination.experiences.filter((experience) => hostDetails(experience, flexSettings).enabled)
      .filter((experience) => experienceCategory === "all" || experience.category === experienceCategory)
      .filter((experience) => !rainOnly || experience.rainFriendly === true)
      .filter((experience) => partyFit === "all" || (experience.suits || []).includes(partyFit))
      .map((experience) => ({ ...experience, hostNote: hostDetails(experience, flexSettings).note }));
  }, [destination.experiences, flexSettings, experienceCategory, rainOnly, partyFit]);
  const rankedExperiences = useMemo(() => rankExperiences(activeExperiences, {
    partyType: preferences?.travelParty || "Family", freeTimeMinutes: getFreeTimeMinutes(destination.hotel.checkOut, preferences?.departureTime),
    weatherKind: weather?.kind || weather?.condition || "unknown",
    lowCrowdPreference: flexSettings.hostPicks.quieterPlaces,
  }), [activeExperiences, destination.hotel.checkOut, preferences?.travelParty, preferences?.departureTime, weather?.kind, weather?.condition, flexSettings.hostPicks.quieterPlaces]);
  const filteredDishes = useMemo(() => (flexSettings.hostPicks.localFood ? destination.dishes : []).filter((dish) => {
    const price = Number(dish.price);
    if (budgetCap !== "" && Number.isFinite(price) && price > Math.max(0, Number(budgetCap))) return false;
    if (diet !== "any" && !rankDishes([dish], { diet }).length) return false;
    const spiceScore = { mild: 1, medium: 2, hot: 3 };
    const selectedSpice = spiceScore[spice];
    if (selectedSpice && (spiceScore[dish.spiceLevel] || 3) > selectedSpice) return false;
    if (timeOfDay !== "any" && !(dish.timeOfDay || []).includes(timeOfDay) && !(dish.timeOfDay || []).includes("anytime")) return false;
    return true;
  }), [destination.dishes, flexSettings.hostPicks.localFood, budgetCap, diet, spice, timeOfDay]);
  const rankedDishes = useMemo(() => rankDishes(filteredDishes, { diet, spice, timeOfDay, weatherKind: weather?.kind || weather?.condition || "unknown" }), [filteredDishes, diet, spice, timeOfDay, weather?.kind, weather?.condition]);
  const suggestions = useMemo(() => suggestedIds.length ? rankedDishes.filter((dish) => suggestedIds.includes(dish.id)).slice(0, 3) : [], [rankedDishes, suggestedIds]);
  const bookExperience = (experience) => addRequest({
    type: "experience_booking", title: "Host's Pick: " + experience.name, category: "Local experience",
    status: "Awaiting partner confirmation (demo)",
    detail: "Guest requested a demo booking. Hotel staff must confirm partner, schedule, availability and final terms before any commitment.",
    experienceId: experience.id, partner: experience.partner, price: experience.price,
    estimatedTotal: Math.max(0, Number(experience.price) || 0) * headcount, headcount,
    durationMinutes: experience.durationMinutes, hostNote: experience.hostNote,
    aiSuggested: true, aiSuggestionReason: experience.rankReason || "Curated and ranked from the selected destination pack.", actionActor: "Guest",
  });
  const orderDish = (dish) => addRequest({
    type: "food_order", title: "Kitchen request: " + dish.name, category: "Food discovery",
    status: "Awaiting kitchen confirmation (demo)",
    detail: "Guest requested " + dish.name + ". Hotel kitchen must confirm ingredients, allergens, price, preparation and availability. No order has been submitted to an external restaurant.",
    dishId: dish.id, price: dish.price, estimatedTotal: Math.max(0, Number(dish.price) || 0) * headcount, headcount,
    aiSuggested: true, aiSuggestionReason: "The dish is listed in the selected destination pack; the kitchen still needs to confirm the request.", actionActor: "Guest",
  });
  const guestRequests = requests.filter((request) => request.destinationId === destination.id && (request.experienceId || request.dishId));

  return <div className="space-y-4">
    <section className="overflow-hidden rounded-3xl bg-sunrise p-5 text-white shadow-sm sm:p-7"><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/75">Explore with local guidance</p><h2 className="mt-2 font-serif text-3xl sm:text-4xl">Discover {destination.city}</h2><p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">Staff-curated demo listings and destination-pack food ideas. Hotel staff confirm providers, ingredients, timings and prices.</p></section>

    <section className={panel}>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Compass size={19} className="text-brand dark:text-saffron"/><h2 className="font-serif text-2xl">Host's Picks</h2></div><p className="mt-1 text-xs text-muted">Local experiences recommended by the front desk · Destination pack · Demo listings</p></div><div className="flex items-center gap-2"><label className="text-[10px] font-semibold text-muted" htmlFor="experience-headcount">Guests</label><input id="experience-headcount" type="number" min="1" max="12" value={headcount} onChange={(event) => setHeadcount(Math.max(1, Math.min(12, Number(event.target.value) || 1)))} className="w-16 min-h-9 rounded-lg border border-border bg-bg px-2 text-xs text-text"/></div></div>
      {!flexSettings.hostPicks.localExperiences && <p className="mt-4 rounded-xl bg-bg p-4 text-sm text-muted">The front desk has temporarily paused experience recommendations for this destination.</p>}
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3"><label className="text-[10px] font-semibold text-muted">Category<select value={experienceCategory} onChange={(e) => setExperienceCategory(e.target.value)} className={field + " mt-1 w-full"}><option value="all">All categories</option>{Array.from(new Set(destination.experiences.map((experience) => experience.category).filter(Boolean))).map((category) => <option key={category} value={category}>{niceLabel(category)}</option>)}</select></label><label className="text-[10px] font-semibold text-muted">Who it suits<select value={partyFit} onChange={(e) => setPartyFit(e.target.value)} className={field + " mt-1 w-full"}><option value="all">All guests</option>{["family", "couple", "solo", "seniors"].map((item) => <option key={item} value={item}>{niceLabel(item)}</option>)}</select></label><label className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold"><input type="checkbox" checked={rainOnly} onChange={(e) => setRainOnly(e.target.checked)}/>Rain-friendly only</label></div>
      {rankedExperiences.length === 0 ? <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted">No picks match these filters. Change a filter or ask the front desk.</p> : <div className="mt-4 flex snap-x gap-3 overflow-x-auto pb-2">{rankedExperiences.map((experience) => <ExperienceCard key={experience.id} experience={experience} note={experience.hostNote} destination={destination} formatCurrency={formatCurrency} headcount={headcount} onBook={bookExperience}/>)}</div>}
      <p className="mt-2 text-[10px] leading-relaxed text-muted">Requesting a pick does not make a booking. Partner confirmation is pending until hotel staff review the request.</p>
    </section>

    <section className={panel}>
      <div className="flex items-center gap-2"><Utensils size={19} className="text-brand dark:text-saffron"/><h2 className="font-serif text-2xl">Taste Local</h2></div>
      <div className="mt-3 rounded-xl border border-accent/30 bg-bg p-3"><p className="flex items-center gap-2 text-sm font-bold"><ChefHat size={16}/>Chef's special today</p><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{flexSettings.chefSpecial || "Please ask the front desk about today's special."}</p></div>
      <p className="mt-3 text-xs text-muted">Pack dishes are ideas, not live menus. Always confirm ingredients and preparation with the restaurant or hotel kitchen.</p>
      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="text-[10px] font-semibold text-muted">Diet<select value={diet} onChange={(e) => { setDiet(e.target.value); setSuggestedIds([]); }} className={field + " mt-1 w-full"}><option value="any">Any diet</option><option value="veg">Vegetarian</option><option value="vegan">Vegan</option><option value="non-veg">Non-vegetarian</option><option value="halal">Halal-tagged only</option><option value="gluten-aware">Gluten-aware tag only</option></select></label>
        <label className="text-[10px] font-semibold text-muted">Spice level<select value={spice} onChange={(e) => { setSpice(e.target.value); setSuggestedIds([]); }} className={field + " mt-1 w-full"}><option value="any">Any spice</option><option value="mild">Mild or lower</option><option value="medium">Medium or lower</option><option value="hot">Any, including hot</option></select></label>
        <label className="text-[10px] font-semibold text-muted">Maximum budget ({destination.currency.code})<input type="number" min="0" value={budgetCap} onChange={(e) => { setBudgetCap(e.target.value); setSuggestedIds([]); }} placeholder="Any budget" className={field + " mt-1 w-full"} /></label>
        <label className="text-[10px] font-semibold text-muted">Time of day<select value={timeOfDay} onChange={(e) => { setTimeOfDay(e.target.value); setSuggestedIds([]); }} className={field + " mt-1 w-full"}><option value="any">Any time</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="snack">Snack</option></select></label>
      </div>
      <button type="button" onClick={() => setSuggestedIds(rankDishes(filteredDishes, { diet, spice, timeOfDay, weatherKind: weather?.kind || weather?.condition || "unknown" }).slice(0, 3).map((dish) => dish.id))} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-extrabold text-white"><Sparkles size={16}/>What should I eat now?</button>
      {suggestedIds.length > 0 && <div className="mt-3 rounded-xl border border-border bg-bg p-3"><p className="text-xs font-bold">Three rule-ranked ideas</p><p className="mt-1 text-[10px] text-muted">{isRainy(weather) ? "Rain-aware ranking gives warm dishes extra weight." : "Ranked from your diet, spice, time and budget filters."}</p></div>}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">{(suggestedIds.length ? suggestions : rankedDishes).slice(0, suggestedIds.length ? 3 : 12).map((dish) => <DishCard key={dish.id} dish={dish} destination={destination} formatCurrency={formatCurrency} onOrder={orderDish}/>)}</div>
      {rankedDishes.length === 0 && <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">{flexSettings.hostPicks.localFood ? "No dishes in this pack are tagged for every selected filter. Ask the hotel to check the menu; no ingredient or halal/gluten status is assumed." : "The front desk has paused local-food recommendations for this destination. Ask the hotel team for help with the menu."}</p>}
      <p className="mt-3 text-[10px] font-semibold text-amber-800 dark:text-amber-200">Confirm ingredients with the restaurant. No dish is represented as allergen-free. Dietary tags are illustrative and recipes vary.</p>
    </section>

    {guestRequests.length > 0 && <section className={panel}><div className="flex items-center gap-2"><BadgeCheck size={18} className="text-brand dark:text-saffron"/><h2 className="font-serif text-xl">Your Host's Picks &amp; kitchen requests</h2></div><p className="mt-1 text-xs text-muted">Status updates from the shared demo hotel queue.</p><div className="mt-3 space-y-2">{guestRequests.slice(0, 12).map((request) => <article key={request.id} className="rounded-xl border border-border bg-bg p-3"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold">{request.title}</h3><span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold">{request.status}</span></div>{request.estimatedTotal != null && <p className="mt-1 text-xs font-semibold">Estimated total · {formatCurrency(request.estimatedTotal)} <span className="font-normal text-muted">({request.headcount || 1} guest(s), demo)</span></p>}<p className="mt-1 text-xs leading-relaxed text-muted">{request.detail}</p>{request.updatedAt && <time className="mt-1 block text-[10px] text-muted">{new Intl.DateTimeFormat(destination.locale, { dateStyle: "medium", timeStyle: "short", timeZone: destination.timezone }).format(new Date(request.updatedAt))}</time>}</article>)}</div></section>}
  </div>;
}
