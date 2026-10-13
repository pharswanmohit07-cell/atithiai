import React, { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, CalendarClock, ChevronRight, CircleHelp, Compass, Globe2, Map,
  MessageCircle, ShieldCheck, Sparkles, Utensils, Users, WifiOff, BedDouble,
  Phone, LoaderCircle,
} from "lucide-react";
import { useAuth } from "./context/AuthContext.jsx";
import { useDestination } from "./context/DestinationContext.jsx";
import { useHotelContext } from "./context/HotelContext.jsx";
import ThemeToggle from "./components/ui/ThemeToggle.jsx";
import StayPass from "./components/StayPass.jsx";
import LensTab from "./components/guest/LensTab.jsx";

const DestinationMap = lazy(() => import("./components/DestinationMap.jsx"));
const TABS = [
  { id: "home", label: "Home", Icon: BedDouble },
  { id: "map", label: "Map", Icon: Map },
  { id: "services", label: "Services", Icon: CircleHelp },
  { id: "discover", label: "Discover", Icon: Compass },
  { id: "profile", label: "Profile", Icon: Users },
  { id: "pass", label: "Stay Pass", Icon: ShieldCheck },
];

function OfflineBanner() {
  const { cachedDemoMode, setCachedDemoMode } = useDestination();
  const [online, setOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  if (online && !cachedDemoMode) return null;
  return (
    <div role="status" aria-live="polite" className="flex items-start gap-2 border-b border-amber-400 bg-amber-50 px-4 py-3 text-xs text-amber-950 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-100">
      <WifiOff size={16} className="mt-0.5 shrink-0" />
      <span className="min-w-0 flex-1">{online ? "Cached demo mode is on. AI requests are bypassed; local results are used." : "You're offline. Weather may be unavailable; requests and plans stay local until connectivity returns."}</span>
      <button type="button" onClick={() => setCachedDemoMode(!cachedDemoMode)} className="min-h-9 shrink-0 rounded-lg border border-current px-2 py-1 font-bold">{cachedDemoMode ? "Use AI" : "Use cached results"}</button>
    </div>
  );
}

function Header({ manager = false, onSwitch }) {
  const { destination, weather, weatherLoading, weatherError, cachedDemoMode, setCachedDemoMode } = useDestination();
  const { user } = useAuth();
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-surface px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-accent-text">Atithi AI · Hotel Co-Host</p>
          <h1 className="mt-1 break-words font-serif text-2xl leading-tight sm:text-3xl">{destination.hotel.name}</h1>
          <p className="mt-1 text-xs text-muted">{destination.city}, {destination.country} · Three-star demo hotel</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <ThemeToggle compact />
          <button type="button" onClick={() => setCachedDemoMode(!cachedDemoMode)} aria-pressed={cachedDemoMode} className="min-h-10 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold text-text">{cachedDemoMode ? "Cached demo: On" : "Cached demo: Off"}</button>
          <button type="button" onClick={onSwitch} className="min-h-10 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold text-text">{manager ? "Switch persona / destination" : "Switch persona / destination"}</button>
          <span className="hidden text-xs text-muted lg:inline">{user?.persona || "Demo guest"}</span>
        </div>
      </header>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border bg-bg px-4 py-2 text-xs text-muted sm:px-6">
        <span className="inline-flex items-center gap-1.5"><span className={"h-2 w-2 rounded-full " + (weather ? "bg-emerald-600" : "bg-amber-500")} />{weather ? "Live weather" : weatherLoading ? "Weather loading" : "Weather unavailable"}</span>
        <span>{weather ? weather.temperatureC + "°C · " + weather.condition + (weather.windKmh == null ? "" : " · wind " + weather.windKmh + " km/h") : weatherError || "Only weather is live; hotel, partner, price and availability content is demo data."}</span>
      </div>
    </>
  );
}

function localChatFallback(message, destination) {
  const text = String(message || "").toLowerCase();
  if (/(price|cost|fee|charge|refund|pay|payment|booking|book|available|availability)/i.test(text)) {
    return "I can send this question to the hotel team. Any fee, booking or availability must be confirmed by a staff member; nothing is charged or booked by this assistant.";
  }
  if (/(food|dish|eat|restaurant|menu|diet|vegetarian|vegan|allerg)/i.test(text)) {
    return "I can show dishes in the selected destination pack. Please confirm ingredients, allergens and current venue details directly with the hotel team or restaurant.";
  }
  if (/(experience|activity|tour|guide|partner|things to do|visit|explore)/i.test(text)) {
    return "The destination pack includes illustrative Demo listing experiences. I can show the list, but a human must confirm partner legitimacy, schedule, price and availability.";
  }
  if (/(weather|rain|wind|temperature|forecast)/i.test(text)) {
    return "The weather panel shows the latest available Open-Meteo observation for " + destination.city + ". It does not confirm venue opening, traffic or travel safety.";
  }
  return "I can help with your stay at " + destination.city + ", show destination-pack ideas, or send a request to the hotel team. Anything involving money, a booking or availability needs human approval.";
}

function GuestChat({ guest, destination, preferences, addRequest, cachedDemoMode }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([{ role: "assistant", text: "Welcome. I’m your hotel co-host for this demo stay. Ask about local experiences, food, weather or a request for the team." }]);
  const [sending, setSending] = useState(false);

  const send = async (event) => {
    event.preventDefault();
    const message = draft.trim().slice(0, 1200);
    if (!message || sending) return;
    setDraft("");
    setMessages((current) => [...current, { role: "guest", text: message }]);
    if (/(emergency|urgent help|call an ambulance|police|fire emergency)/i.test(message)) {
      addRequest({ title: "Urgent local emergency request", category: "Emergency", priority: "urgent", detail: "Guest message: " + message + ". Demo log only; no service was contacted. Call local emergency number " + destination.emergencyNumber + " if urgent." });
      setMessages((current) => [...current, { role: "assistant", text: "I recorded an urgent demo request for the hotel team. This app cannot dispatch emergency services. If there is immediate danger, call " + destination.emergencyNumber + " now." }]);
      return;
    }
    let reply = localChatFallback(message, destination);
    if (!cachedDemoMode) {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 6000);
      setSending(true);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message,
            destinationId: destination.id,
            preferences,
            guest: { name: guest?.name || "Demo guest", persona: guest?.persona || "Guest (Family)" },
          }),
        });
        const payload = await response.json();
        if (response.ok && typeof payload?.reply === "string" && payload.reply.trim()) reply = payload.reply.trim().slice(0, 1600);
      } catch {
        // The destination-aware local reply remains visible.
      } finally {
        window.clearTimeout(timeout);
        setSending(false);
      }
    }
    setMessages((current) => [...current, { role: "assistant", text: reply }]);
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white"><Sparkles size={18} /></span><div><h2 className="font-serif text-xl">AI co-host</h2><p className="text-[10px] text-muted">Local fallback always available · Human approval required for money</p></div></div>
      <div className="mt-4 max-h-64 space-y-2 overflow-y-auto" aria-live="polite">
        {messages.map((item, index) => <div key={index} className={"max-w-[94%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed " + (item.role === "guest" ? "ml-auto bg-brand text-white" : "border border-border bg-bg text-text")}>{item.text}</div>)}
      </div>
      <form onSubmit={send} className="mt-3 flex gap-2">
        <input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} placeholder="Ask about your stay..." className="min-w-0 min-h-11 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text" aria-label="Message the AI co-host" />
        <button type="submit" disabled={sending || !draft.trim()} className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{sending ? "..." : "Send"}</button>
      </form>
      <p className="mt-2 text-[10px] text-muted">The AI can suggest, not confirm. Hotel staff control bookings, fees, refunds and availability.</p>
    </section>
  );
}

function RequestButton({ title, category, detail, addRequest, children, priority }) {
  const [sent, setSent] = useState(false);
  return <button type="button" onClick={() => { addRequest({ title, category, detail, priority }); setSent(true); }} className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-3 text-left text-sm font-semibold text-text hover:bg-surface-2">
    <span className="min-w-0">{children || title}{sent && <span className="mt-1 block text-xs font-medium text-emerald-700 dark:text-emerald-300">Request added for human review</span>}</span><ChevronRight size={16} className="shrink-0 text-muted" />
  </button>;
}

function ServiceView({ destination, formatCurrency, addRequest }) {
  const [showExperiences, setShowExperiences] = useState(false);
  const [showFood, setShowFood] = useState(false);
  const [checkInKind, setCheckInKind] = useState("early");
  const early = destination.hotel.flexTiers.early;
  const late = destination.hotel.flexTiers.late;
  const tiers = checkInKind === "early" ? early : late;
  const requestFlex = (kind, tier) => addRequest({
    title: kind === "early" ? "Early check-in request" : "Late check-out request",
    category: "Flexible timing",
    detail: "Requested " + (kind === "early" ? "check-in from " + tier.from : "check-out until " + tier.until) + ". Illustrative fee " + formatCurrency(tier.fee) + " (demo). Staff must confirm policy, room readiness and final price. No payment was taken.",
  });

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white"><CalendarClock size={20} /></span><div><h2 className="font-serif text-xl">Early check-in / Late check-out</h2><p className="mt-1 text-xs leading-relaxed text-muted">Fees shown below are illustrative demo amounts, not a quote. Staff approval is required and nothing is charged here.</p></div></div>
        <div className="mt-4 flex gap-2"><button type="button" onClick={() => setCheckInKind("early")} className={"min-h-10 flex-1 rounded-xl border px-3 text-sm font-semibold " + (checkInKind === "early" ? "border-brand bg-brand text-white" : "border-border bg-bg text-text")}>Early check-in</button><button type="button" onClick={() => setCheckInKind("late")} className={"min-h-10 flex-1 rounded-xl border px-3 text-sm font-semibold " + (checkInKind === "late" ? "border-brand bg-brand text-white" : "border-border bg-bg text-text")}>Late check-out</button></div>
        <div className="mt-3 space-y-2">{tiers.map((tier) => <RequestButton key={checkInKind === "early" ? tier.from : tier.until} title="Request timing exception" category="Flexible timing" addRequest={() => requestFlex(checkInKind, tier)}>{checkInKind === "early" ? "Request check-in from " + tier.from : "Request check-out until " + tier.until}<span className="mt-1 block text-xs font-normal text-muted">Illustrative fee: {formatCurrency(tier.fee)} · Demo</span></RequestButton>)}</div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><Compass size={20} /></span><div><h2 className="font-serif text-xl">Local experiences</h2><p className="text-xs text-muted">Curated ideas; not confirmed partners or bookings.</p></div></div>
        <button type="button" onClick={() => setShowExperiences((value) => !value)} className="mt-3 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-semibold text-text">{showExperiences ? "Hide experiences" : "Browse Demo listings"}</button>
        {showExperiences && <div className="mt-3 space-y-2">{destination.experiences.map((experience) => <article key={experience.id} className="rounded-xl border border-border bg-bg p-3"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{experience.name}</h3><span className="demo-badge">Demo listing</span></div><p className="mt-1 text-xs text-muted">{experience.description}</p><p className="mt-1 text-[10px] text-muted">Suggested partner: {experience.partner}</p><button type="button" onClick={() => addRequest({ title: "Ask about " + experience.name, category: "Local experience", detail: "Guest asks staff to verify the demo listing, provider, schedule and full price before any commitment." })} className="mt-2 min-h-10 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white">Ask hotel team to verify</button></article>)}</div>}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><Utensils size={20} /></span><div><h2 className="font-serif text-xl">Food discovery</h2><p className="text-xs text-muted">Diet and allergen details must be confirmed with the venue.</p></div></div>
        <button type="button" onClick={() => setShowFood((value) => !value)} className="mt-3 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm font-semibold text-text">{showFood ? "Hide dishes" : "Explore local dishes"}</button>
        {showFood && <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">{destination.dishes.map((dish) => <article key={dish.id} className="rounded-xl border border-border bg-bg p-3"><h3 className="text-sm font-bold">{dish.name}</h3><p className="mt-1 text-xs text-muted">Diet: {dish.diet.join(", ")} · Spice: {dish.spiceLevel}</p><p className="mt-2 text-xs leading-relaxed text-muted">{dish.whereToEat}</p><button type="button" onClick={() => addRequest({ title: "Food question: " + dish.name, category: "Food discovery", detail: "Please recommend a currently open venue and confirm ingredients, allergens and price with the guest." })} className="mt-2 min-h-10 rounded-lg border border-border px-3 py-2 text-xs font-bold">Ask hotel team</button></article>)}</div>}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><MessageCircle size={20} /></span><div><h2 className="font-serif text-xl">Talk to a human</h2><p className="text-xs text-muted">Send a request to the hotel team. Demo only; not a live messaging service.</p></div></div>
        <div className="mt-3"><RequestButton title="Request a call from the front desk" category="Human assistance" detail="Guest requests a human follow-up from the hotel team." addRequest={addRequest}>Request a call from the front desk</RequestButton></div>
      </section>

      <section className="rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-900 dark:bg-rose-950/30 sm:p-5">
        <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-700 text-white"><Phone size={20} /></span><div><h2 className="font-serif text-xl text-rose-950 dark:text-rose-100">Emergency · local number</h2><p className="text-xs text-rose-900 dark:text-rose-200">Double-check the local number before travel. This button does not notify hotel staff.</p></div></div>
        <a href={"tel:" + destination.emergencyNumber} className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 py-3 text-sm font-bold text-white">Call {destination.emergencyNumber}</a>
      </section>
    </div>
  );
}

function HomeView({ user, destination, weather, weatherLoading, weatherError, itinerary, buildItinerary, addRequest, preferences, cachedDemoMode }) {
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-3xl bg-sunrise p-5 text-white shadow-lg sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Welcome · {user?.persona || "Guest (Family)"}</p>
        <h2 className="mt-3 max-w-xl font-serif text-3xl leading-tight sm:text-4xl">Make your stay feel effortless.</h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">Discover what to do, ask for help and plan around the guest’s preferences. Staff confirm availability, fees and bookings.</p>
        <button type="button" onClick={buildItinerary} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-teal-950">{cachedDemoMode ? "Build local itinerary" : "Refresh suggested itinerary"} <ArrowRight size={16} /></button>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-text">Live weather · Open-Meteo</p><h2 className="mt-1 font-serif text-2xl">{weather ? weather.condition : weatherLoading ? "Getting current weather…" : "Weather unavailable"}</h2></div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-accent-text"><Globe2 size={21} /></span></div>
        {weather && <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4"><div className="rounded-xl bg-bg p-3"><p className="text-xs text-muted">Temperature</p><p className="mt-1 text-xl font-bold">{weather.temperatureC}°C</p></div><div className="rounded-xl bg-bg p-3"><p className="text-xs text-muted">Feels like</p><p className="mt-1 text-xl font-bold">{weather.feelsLikeC == null ? "—" : weather.feelsLikeC + "°C"}</p></div><div className="rounded-xl bg-bg p-3"><p className="text-xs text-muted">Wind</p><p className="mt-1 text-xl font-bold">{weather.windKmh == null ? "—" : weather.windKmh + " km/h"}</p></div><div className="rounded-xl bg-bg p-3"><p className="text-xs text-muted">Humidity</p><p className="mt-1 text-xl font-bold">{weather.humidity == null ? "—" : weather.humidity + "%"}</p></div></div>}
        {!weather && <p role="status" className="mt-3 text-sm text-muted">{weatherError || "Weather may be unavailable when the device has no internet."}</p>}
        <p className="mt-3 text-[10px] leading-relaxed text-muted">Weather is the only live destination data. It does not verify openings, availability, traffic or safety.</p>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Your itinerary</h2><p className="text-xs text-muted">Illustrative suggestions · Demo itinerary</p></div><span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold">{itinerary.length} stops</span></div>
        <ol className="mt-4 space-y-3">{itinerary.map((stop, index) => <li key={stop.id} className="flex items-start gap-3 rounded-xl border border-border bg-bg p-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">{index + 1}</span><div className="min-w-0 flex-1"><h3 className="text-sm font-bold">{stop.title}</h3><p className="mt-1 text-xs text-muted">{stop.note || "Suggested stop · Demo itinerary"}</p></div></li>)}</ol>
        <p className="mt-3 text-xs text-muted">All visits and timings require confirmation with the hotel or venue. Prices and bookings are not processed here.</p>
      </section>
      <GuestChat guest={user} destination={destination} preferences={preferences} addRequest={addRequest} cachedDemoMode={cachedDemoMode} />
    </div>
  );
}

function ProfileView({ user, preferences, updatePreferences, destination, selectDestination, destinations, formatCurrency, cachedDemoMode, setCachedDemoMode, onSwitch }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="font-serif text-2xl">Guest profile</h2>
        <p className="mt-1 text-sm text-muted">{user?.persona || "Guest (Family)"} · Demo profile</p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-xs font-semibold text-muted">Language preference<select value={preferences.language} onChange={(event) => updatePreferences({ language: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">{Array.from(new Set(["English", ...destination.primaryLanguages])).map((language) => <option key={language} value={language}>{language}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted">Dietary preference<select value={preferences.dietaryPreference} onChange={(event) => updatePreferences({ dietaryPreference: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">{["No preference", "Vegetarian", "Vegan", "Pescatarian", "Halal", "Gluten-free", "Dairy-free", "Other — ask me"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-xs font-semibold text-muted sm:col-span-2">Travel party<select value={preferences.travelParty} onChange={(event) => updatePreferences({ travelParty: event.target.value })} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">{["Family", "Solo", "Couple", "Friends", "Business"].map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <h2 className="font-serif text-xl">Destination</h2><p className="mt-1 text-xs text-muted">Switching destination resets this demo itinerary and request list.</p>
        <select aria-label="Choose destination" value={destination.id} onChange={(event) => selectDestination(event.target.value)} className="mt-3 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">{destinations.map((item) => <option key={item.id} value={item.id}>{item.city}, {item.country}</option>)}</select>
        <button type="button" onClick={onSwitch} className="mt-3 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-3 text-sm font-semibold text-text">Switch persona / destination</button>
      </section>
      <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><h2 className="font-serif text-xl">Demo data mode</h2><p className="mt-1 text-xs text-muted">Bypass AI endpoints and use local fallback results.</p></div><button type="button" role="switch" aria-checked={cachedDemoMode} onClick={() => setCachedDemoMode(!cachedDemoMode)} className={"min-h-11 rounded-xl px-4 text-sm font-bold " + (cachedDemoMode ? "bg-amber-500 text-slate-950" : "bg-brand text-white")}>{cachedDemoMode ? "On" : "Off"}</button></div>
        <p className="mt-3 text-[10px] text-muted">All destination pack, partner, policy, price and availability details are demos. Currency display uses the selected pack’s ISO currency code.</p>
      </section>
    </div>
  );
}

function ManagerDashboard({ destination, weather, weatherLoading, weatherError, requests, updateRequestStatus, onSwitch, selectDestination, destinations }) {
  const orderedRequests = [...requests].sort((a, b) => Number(b.priority === "urgent") - Number(a.priority === "urgent") || String(b.createdAt).localeCompare(String(a.createdAt)));
  const pending = orderedRequests.filter((request) => request.status === "Pending human review").length;
  return (
    <main className="min-h-screen bg-bg text-text">
      <OfflineBanner />
      <Header manager onSwitch={onSwitch} />
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 pb-10 sm:px-6 sm:py-7">
        <section className="rounded-3xl bg-sunrise p-5 text-white sm:p-7"><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Manager workspace · Demo</p><h2 className="mt-2 font-serif text-3xl sm:text-4xl">Your team stays in control.</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">Review every guest request. Approve, decline or follow up manually. The demo never charges guests or confirms availability automatically.</p></section>
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs text-muted">Requests logged</p><p className="mt-1 text-3xl font-bold">{requests.length}</p></div>
          <div className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs text-muted">Awaiting review</p><p className="mt-1 text-3xl font-bold">{pending}</p></div>
          <div className="rounded-2xl border border-border bg-surface p-4"><p className="text-xs text-muted">Hotel rooms · demo</p><p className="mt-1 text-3xl font-bold">{destination.hotel.rooms}</p></div>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <h2 className="font-serif text-2xl">Hotel and destination</h2>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold text-muted">Selected destination<select value={destination.id} onChange={(event) => selectDestination(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">{destinations.map((item) => <option key={item.id} value={item.id}>{item.city}, {item.country}</option>)}</select></label>
            <div className="rounded-xl bg-bg p-3 text-sm"><p className="font-semibold">{destination.hotel.name}</p><p className="mt-1 text-xs text-muted">{destination.hotel.stars}-star · {destination.hotel.rooms} rooms · Check-in {destination.hotel.checkIn} · Check-out {destination.hotel.checkOut}</p></div>
          </div>
          <p className="mt-3 text-xs text-muted">{weather ? "Live weather: " + weather.condition + ", " + weather.temperatureC + "°C." : weatherLoading ? "Loading live weather…" : weatherError || "Weather unavailable."} Only weather is live; room inventory, listed experiences and prices are illustrative data.</p>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">Guest requests</h2><p className="mt-1 text-xs text-muted">Requests are not booking confirmations. Review money and schedule details with the guest.</p></div><span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold">{requests.length}</span></div>
          {orderedRequests.length === 0 ? <p className="mt-4 rounded-xl bg-bg p-4 text-sm text-muted">No requests yet. Create a request from the guest view to test this queue.</p> : <div className="mt-4 space-y-3">{orderedRequests.map((request) => <article key={request.id} className="rounded-xl border border-border bg-bg p-4"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold">{request.title}</h3>{request.priority === "urgent" && <span className="rounded-full bg-rose-700 px-2 py-1 text-[9px] font-extrabold text-white">URGENT · DEMO</span>}<span className="rounded-full border border-border px-2 py-1 text-[9px] text-muted">{request.category}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{request.detail}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted">{request.status} · {new Date(request.createdAt).toLocaleString()}</span>{request.status === "Pending human review" && <div className="flex flex-wrap gap-2"><button type="button" onClick={() => updateRequestStatus(request.id, "Approved by staff")} className="min-h-10 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white">Approve / confirm manually</button><button type="button" onClick={() => updateRequestStatus(request.id, "Declined by staff")} className="min-h-10 rounded-lg border border-border px-3 py-2 text-xs font-bold">Decline</button></div>}</div></article>)}</div>}
        </section>
        <button type="button" onClick={onSwitch} className="min-h-11 rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-text">Switch persona / destination</button>
      </div>
    </main>
  );
}

export default function AtithiAI({ mode = "guest" }) {
  const { user, logout } = useAuth();
  const { destination, destinations, selectDestination, formatCurrency, weather, weatherLoading, weatherError, cachedDemoMode, setCachedDemoMode } = useDestination();
  const { itinerary, requests, addRequest, updateRequestStatus, preferences, updatePreferences, addItineraryStop, removeItineraryStop, setItinerary } = useHotelContext();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [planLoading, setPlanLoading] = useState(false);

  useEffect(() => { setActiveTab("home"); }, [destination.id]);

  const switchPersona = () => {
    logout();
    navigate("/", { replace: true });
  };

  const buildItinerary = async () => {
    if (planLoading) return;
    setPlanLoading(true);
    const localPlan = destination.places.slice(0, 4).map((place) => ({ id: place.id, placeId: place.id, title: place.name, note: "Suggested stop · Demo itinerary" }));
    if (cachedDemoMode) {
      setItinerary(localPlan);
      setPlanLoading(false);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6500);
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ destinationId: destination.id, preferences, weather: weather?.kind || "unknown" }),
      });
      const payload = await response.json();
      if (!response.ok || !Array.isArray(payload?.itinerary) || payload.itinerary.length < 3) throw new Error("Plan unavailable");
      const validIds = new Set(destination.places.map((place) => place.id));
      const next = payload.itinerary.filter((item) => validIds.has(item.placeId)).slice(0, 8).map((item, index) => ({ id: item.placeId, placeId: item.placeId, title: destination.places.find((place) => place.id === item.placeId).name, note: "Suggested stop · Demo itinerary", order: index + 1 }));
      setItinerary(next.length ? next : localPlan);
    } catch {
      setItinerary(localPlan);
    } finally {
      window.clearTimeout(timeout);
      setPlanLoading(false);
    }
  };

  if (mode === "admin" || user?.role === "manager") {
    return <ManagerDashboard destination={destination} weather={weather} weatherLoading={weatherLoading} weatherError={weatherError} requests={requests} updateRequestStatus={updateRequestStatus} onSwitch={switchPersona} selectDestination={selectDestination} destinations={destinations} />;
  }

  return (
    <main className="min-h-screen bg-bg pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-text">
      <OfflineBanner />
      <Header onSwitch={switchPersona} />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-5 sm:px-6 sm:py-7">
        {activeTab === "home" && <HomeView user={user} destination={destination} weather={weather} weatherLoading={weatherLoading} weatherError={weatherError} itinerary={itinerary} buildItinerary={buildItinerary} addRequest={addRequest} preferences={preferences} cachedDemoMode={cachedDemoMode} />}
        {activeTab === "map" && <Suspense fallback={<div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-border bg-surface text-sm text-muted"><LoaderCircle className="mr-2 animate-spin" size={18} />Loading destination map…</div>}><DestinationMap destination={destination} height={420} /></Suspense>}
        {activeTab === "services" && <ServiceView destination={destination} formatCurrency={formatCurrency} addRequest={addRequest} />}
        {activeTab === "discover" && <div className="space-y-4">
          <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="font-serif text-2xl">Discover {destination.city}</h2><p className="mt-1 text-sm text-muted">Curated destination-pack places with approximate coordinates. Suggestions are not bookings.</p><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">{destination.places.map((place) => <article key={place.id} className="rounded-xl border border-border bg-bg p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="text-sm font-bold">{place.name}</h3><p className="mt-1 text-xs text-muted">{place.category} · {place.rainFriendly ? "Indoor / rain-friendly" : "Weather dependent"}</p></div>{place.lowCrowd && <span className="rounded-full bg-emerald-100 px-2 py-1 text-[9px] font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100">Estimated quieter</span>}</div><button type="button" onClick={() => addItineraryStop(place)} className="mt-3 min-h-10 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold text-text">{itinerary.some((stop) => stop.placeId === place.id) ? "Already in itinerary" : "Add to itinerary"}</button></article>)}</div></section>
          <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="font-serif text-2xl">Price Lens</h2><p className="mb-3 mt-1 text-xs text-muted">Image analysis is an AI estimate, not a tariff or a finding of overcharging. Ask the hotel team to verify before making a payment.</p><LensTab onRequest={(request) => addRequest({ title: request.title, category: "Price Lens", detail: request.detail })} /></section>
        </div>}
        {activeTab === "profile" && <ProfileView user={user} preferences={preferences} updatePreferences={updatePreferences} destination={destination} selectDestination={selectDestination} destinations={destinations} formatCurrency={formatCurrency} cachedDemoMode={cachedDemoMode} setCachedDemoMode={setCachedDemoMode} onSwitch={switchPersona} />}
        {activeTab === "pass" && <StayPass guest={user} />}
      </div>
      <nav aria-label="Guest navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-stretch justify-around gap-0.5">{TABS.map(({ id, label, Icon }) => <button key={id} type="button" onClick={() => setActiveTab(id)} aria-current={activeTab === id ? "page" : undefined} className={"flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 text-[9px] font-semibold sm:text-[10px] " + (activeTab === id ? "bg-brand/10 text-brand dark:text-saffron" : "text-muted")}><Icon size={18} /><span className="max-w-full truncate">{label}</span></button>)}</div>
      </nav>
    </main>
  );
}
