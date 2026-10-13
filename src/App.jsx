import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight, BookmarkPlus, CalendarDays, Check, Compass, Heart,
  Languages, MapPin, MessageCircle, Minus, Plus, Search, Send, ShieldAlert,
  Sparkles, Sun, Users, Utensils, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./components/ui/ThemeToggle.jsx";
import LensTab from "./components/guest/LensTab.jsx";
import { useDestination } from "./context/DestinationContext.jsx";
import { useTravelContext } from "./context/TravelContext.jsx";
import { getDefaultLanguage, detectTextLanguage, LANGUAGE_OPTIONS, targetLanguageTag, t } from "./i18n.js";

const DestinationMap = lazy(() => import("./components/DestinationMap.jsx"));
const TABS = [
  { id: "home", label: "Home", Icon: Sun },
  { id: "discover", label: "Discover", Icon: Compass },
  { id: "plan", label: "Plan", Icon: CalendarDays },
  { id: "lens", label: "Lens", Icon: Languages },
  { id: "chat", label: "Chat", Icon: MessageCircle },
  { id: "profile", label: "Profile", Icon: Users }
];
const CATEGORY_OPTIONS = ["viewpoint", "market", "cafe", "culture", "nature", "craft", "wellness"];
const CATEGORY_LABELS = {
  viewpoint: "Viewpoint", market: "Market", cafe: "Café", culture: "Culture",
  nature: "Nature", craft: "Craft", wellness: "Wellness"
};
const PACE_OPTIONS = [
  { value: "slow", label: "Slow and thoughtful" },
  { value: "balanced", label: "A little of everything" },
  { value: "curious", label: "Curious and active" }
];
const DIET_OPTIONS = [
  ["any", "No preference"], ["veg", "Vegetarian"], ["vegan", "Vegan"],
  ["nonVeg", "Non-vegetarian"], ["halal", "Halal only where confirmed"], ["glutenFree", "Gluten-free only where confirmed"]
];

function formatNumber(value, locale, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  try { return new Intl.NumberFormat(locale, options).format(number); } catch { return String(number); }
}
function formatDate(value, locale, timezone) {
  try { return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: timezone }).format(new Date(value)); }
  catch { return new Date(value).toISOString(); }
}
function niceWord(value) {
  return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function saveStarted() {
  try { localStorage.setItem("atithi-started-exploring", "yes"); } catch { /* The welcome screen still exits for this session. */ }
}
function readStarted() {
  try { return localStorage.getItem("atithi-started-exploring") === "yes"; } catch { return false; }
}
function localChatFallback(message, destination, language) {
  const base = detectTextLanguage(message);
  const chosen = language === "auto" ? base : language;
  const messages = {
    en: "I can help you explore places, local stories, experiences and food from this destination pack. These are ideas rather than live bookings; check details locally.",
    hi: "मैं इस जगह की चुनिंदा जगहों, स्थानीय कहानियों, अनुभवों और खाने के बारे में मदद कर सकता हूँ। ये सुझाव हैं, लाइव बुकिंग नहीं; विवरण स्थानीय रूप से जाँचें।",
    es: "Puedo ayudarte a descubrir lugares, historias locales, experiencias y comida de esta selección. Son ideas, no reservas en tiempo real; verifica los detalles localmente.",
    fr: "Je peux vous aider à découvrir les lieux, histoires locales, expériences et plats de cette sélection. Ce sont des idées, pas des réservations en direct ; vérifiez sur place.",
    de: "Ich helfe dir, Orte, lokale Geschichten, Erlebnisse und Speisen aus dieser Auswahl zu entdecken. Dies sind Ideen, keine Live-Buchungen; prüfe Details vor Ort.",
    ja: "この目的地の場所、地域の物語、体験、料理を紹介できます。これは提案であり、リアルタイムの予約ではありません。詳細は現地で確認してください。",
    ar: "يمكنني مساعدتك في اكتشاف الأماكن والقصص المحلية والتجارب والأطعمة في هذه الوجهة. هذه اقتراحات وليست حجوزات مباشرة؛ تحقق من التفاصيل محليًا.",
    zh: "我可以帮助你探索此目的地的地点、当地故事、体验和美食。这些是建议，并非实时预订；请在当地确认详情。"
  };
  if (/(hidden gem|quiet|less crowded|hidden place|gemas escondidas|joyau|versteckt|隠れた|隐秘|مخفي|छुपी)/i.test(message)) {
    const hidden = destination.places.filter((place) => place.isHiddenGem).slice(0, 3).map((place) => place.name);
    if (hidden.length) return (messages[chosen] || messages.en) + " Hidden-place ideas: " + hidden.join(", ") + ".";
  }
  return (messages[chosen] || messages.en) + " " + destination.city + ".";
}

function DemoNote({ children = "Demo content · AI-assisted, verify locally" }) {
  return <p className="mt-2 text-[10px] leading-relaxed text-muted">{children}</p>;
}

function PlaceCard({ place, destination, formatCurrency, inPlan, onAdd, onRemove }) {
  const [saved, setSaved] = useState(false);
  return (
    <motion.article layout className="flex min-w-0 flex-col rounded-2xl border border-border bg-bg p-4 transition-colors hover:bg-surface-2/50">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold">{CATEGORY_LABELS[place.category] || niceWord(place.category)}</span>
        {place.isHiddenGem && <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: destination.themeColors.accentSoft, color: destination.themeColors.accent }}><Sparkles size={11}/>Hidden-place pick</span>}
      </div>
      <h3 className="mt-3 font-serif text-xl leading-snug">{place.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{place.localStory}</p>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        <span>{niceWord(place.bestTime)}</span><span>·</span>
        <span>{formatNumber(place.durationMin, destination.locale)} min</span><span>·</span>
        <span>{niceWord(place.crowdLevel)} crowd estimate</span>
      </div>
      <p className="mt-2 text-xs font-semibold">{place.avgSpendLocal > 0 ? "Illustrative spend: " + formatCurrency(place.avgSpendLocal) : "No spend estimate"}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">{place.tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-md border border-border px-2 py-1 text-[10px] text-muted">{tag}</span>)}</div>
      <div className="mt-4 flex gap-2">
        <button type="button" onClick={() => inPlan ? onRemove(place.id) : onAdd(place)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-white" style={{ backgroundColor: destination.themeColors.accent }}>{inPlan ? <><Check size={14}/> In plan · Remove</> : <><Plus size={14}/> Add to plan</>}</button>
        <button type="button" onClick={() => setSaved((value) => !value)} aria-pressed={saved} aria-label={saved ? "Unsave place" : "Save place"} className={"inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border border-border px-3 " + (saved ? "bg-surface-2 text-text" : "bg-surface text-muted")}><Heart size={16} fill={saved ? "currentColor" : "none"}/></button>
      </div>
      <DemoNote />
    </motion.article>
  );
}

function ExperienceCard({ experience, destination, formatCurrency, onSave }) {
  return <article className="flex min-w-0 flex-col rounded-2xl border border-border bg-bg p-4">
    <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold">{CATEGORY_LABELS[experience.category] || niceWord(experience.category)}</span>{experience.communityLed && <span className="text-[10px] font-bold text-accent-text">Community-led idea</span>}</div>
    <h3 className="mt-3 font-serif text-xl leading-snug">{experience.title}</h3>
    <p className="mt-2 text-sm leading-relaxed text-muted">{experience.localStory}</p>
    <div className="mt-3 space-y-1 text-xs text-muted"><p>Demo host: <span className="font-semibold text-text">{experience.hostName}</span></p><p>{formatNumber(experience.durationMin, destination.locale)} min · {experience.rainFriendly ? "Rain-friendly" : "Weather dependent"}</p><p>Designed for: {experience.suitsWho.map(niceWord).join(", ")}</p></div>
    <p className="mt-3 text-sm font-bold">{formatCurrency(experience.priceLocal)} <span className="text-[10px] font-normal text-muted">illustrative estimate</span></p>
    <button type="button" onClick={() => onSave(experience)} className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><BookmarkPlus size={15}/> Save idea</button>
    <DemoNote />
  </article>;
}

function DishCard({ dish, destination, formatCurrencyRange, onSave }) {
  const dietary = [
    dish.diet.veg === true ? "Vegetarian" : null,
    dish.diet.vegan === true ? "Vegan" : null,
    dish.diet.nonVeg === true ? "Non-vegetarian" : null,
    dish.diet.halal === true ? "Halal-tagged" : null,
    dish.diet.glutenFree === true ? "Gluten-free-tagged" : null
  ].filter(Boolean);
  return <article className="rounded-2xl border border-border bg-bg p-4">
    <div className="flex items-start justify-between gap-3"><h3 className="font-serif text-xl">{dish.name}</h3><span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold">Demo range</span></div>
    <p className="mt-2 text-sm leading-relaxed text-muted">{dish.description}</p>
    <p className="mt-2 text-xs text-muted">Try around: {dish.whereToEat}</p>
    <p className="mt-2 text-xs">{dietary.length ? dietary.join(" · ") : "Dietary details uncertain — ask the cook"} · spice {formatNumber(dish.spiceLevel, destination.locale, { maximumFractionDigits: 0 })}/3</p>
    <p className="mt-2 text-sm font-bold">{formatCurrencyRange(dish.priceRangeLocal[0], dish.priceRangeLocal[1])}</p>
    <p className="mt-1 text-[10px] leading-relaxed text-muted">Best time: {niceWord(dish.bestTime)} · Recipe and allergen details vary.</p>
    <button type="button" onClick={() => onSave(dish)} className="mt-3 min-h-10 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold">Save food idea</button>
    <DemoNote />
  </article>;
}

function WeatherPanel({ destination, weather, loading, error, formatNumber }) {
  return <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-accent-text">Live weather · Open-Meteo</p><h2 className="mt-1 font-serif text-2xl">{weather?.condition || (loading ? "Checking conditions…" : "Weather unavailable")}</h2></div><span className="rounded-xl px-3 py-2 text-xs font-bold" style={{ backgroundColor: destination.themeColors.accentSoft, color: destination.themeColors.accent }}>{destination.city}</span></div>
    {weather ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">{[
      ["Temperature", formatNumber(weather.temperatureC, destination.locale, { maximumFractionDigits: 0 }) + "°C"],
      ["Feels like", weather.feelsLikeC == null ? "—" : formatNumber(weather.feelsLikeC, destination.locale, { maximumFractionDigits: 0 }) + "°C"],
      ["Wind", weather.windKmh == null ? "—" : formatNumber(weather.windKmh, destination.locale, { maximumFractionDigits: 0 }) + " km/h"],
      ["Humidity", weather.humidity == null ? "—" : formatNumber(weather.humidity, destination.locale, { maximumFractionDigits: 0 }) + "%"]
    ].map(([label, value]) => <div key={label} className="rounded-xl bg-bg p-3"><p className="text-[10px] text-muted">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>)}</div> : <p className="mt-3 text-xs text-muted">{error || "A network connection is needed for live weather."}</p>}
    <DemoNote>Weather is the only live destination feed. It does not verify opening times, transport, crowds, access or safety.</DemoNote>
  </section>;
}

function WelcomeScreen({ destination, destinations, selectDestination, onStart }) {
  return <main className="min-h-screen bg-bg px-4 py-5 text-text sm:px-6 sm:py-8">
    <header className="mx-auto flex max-w-5xl items-center justify-between"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: destination.themeColors.accent }}><Compass size={23}/></span><div><p className="font-serif text-2xl leading-none">Atithi AI</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Go beyond the usual</p></div></div><ThemeToggle compact/></header>
    <section className="mx-auto mt-6 max-w-5xl overflow-hidden rounded-[2rem] p-6 text-white sm:mt-10 sm:p-10" style={{ background: "linear-gradient(125deg, #163e4b 0%, #28365c 55%, " + destination.themeColors.accent + " 100%)" }}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">A more personal way to explore</p>
      <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight sm:text-6xl">Find the places and stories that make a destination feel personal.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">Discover neighbourhood details, local food and thoughtful experiences beyond the usual shortlist — at your own pace.</p>
      <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
        {destinations.map((item) => <button key={item.id} type="button" onClick={() => selectDestination(item.id)} aria-pressed={destination.id === item.id} className={"min-h-28 rounded-2xl border p-4 text-left transition-colors " + (destination.id === item.id ? "border-white bg-white text-slate-900" : "border-white/25 bg-white/10 text-white hover:bg-white/20")}>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.17em]">{item.country}</span><span className="mt-2 block font-serif text-2xl">{item.city}</span>
          <span className="mt-1 block text-xs opacity-75">{item.primaryLanguages.slice(0, 2).join(" · ")}</span>
        </button>)}
      </div>
      <button type="button" onClick={onStart} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-slate-900">{ "Start exploring" } <ArrowRight size={17}/></button>
    </section>
    <p className="mx-auto mt-4 max-w-5xl text-[10px] leading-relaxed text-muted">Demo content · Place details, stories and spend ranges are AI-assisted examples. Confirm details locally. Only weather is live.</p>
  </main>;
}

function ChatView({ destination, preferences, chatMessages, addChatMessage, addRequest }) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyLanguage, setReplyLanguage] = useState(() => {
    try { return localStorage.getItem("atithi-chat-language") || "auto"; } catch { return "auto"; }
  });
  const writeLanguage = (value) => {
    setReplyLanguage(value);
    try { localStorage.setItem("atithi-chat-language", value); } catch { /* Keep the selection for this session. */ }
  };

  const submit = async (event) => {
    event.preventDefault();
    const message = draft.trim().slice(0, 1200);
    if (!message || sending) return;
    setDraft("");
    addChatMessage({ role: "guest", text: message });
    const localLanguage = replyLanguage === "auto" ? detectTextLanguage(message) : replyLanguage;
    let reply = localChatFallback(message, destination, localLanguage);
    if (/(save|remember|add to (my )?trip|keep this|note this|guardar|recordar|enregistrer|merken|保存|记住|حفظ|सहेज)/i.test(message)) {
      addRequest({ title: "Travel note from chat", category: "Chat idea", detail: message });
      reply = t("requestCreated", localLanguage);
    } else {
      setSending(true);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 7000);
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            message, destinationId: destination.id,
            replyLanguage: replyLanguage === "auto" ? "auto" : targetLanguageTag(replyLanguage),
            preferences: { ...preferences, language: localLanguage },
            city: destination.city, country: destination.country, currency: destination.currency.code,
            primaryLanguages: destination.primaryLanguages,
            placeIds: destination.places.map((place) => place.id),
            experienceIds: destination.experiences.map((experience) => experience.id),
            dishIds: destination.dishes.map((dish) => dish.id)
          })
        });
        let payload = null;
        try { payload = await response.json(); } catch { payload = null; }
        if (response.ok && typeof payload?.reply === "string" && payload.reply.trim()) reply = payload.reply.slice(0, 2200);
      } catch {
        // The local multilingual fallback is intentionally usable offline.
      } finally {
        window.clearTimeout(timeout);
        setSending(false);
      }
    }
    addChatMessage({ role: "assistant", text: reply });
  };

  return <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-white"><MessageCircle size={19}/></span><div><h2 className="font-serif text-2xl">{t("chatTitle", getDefaultLanguage())}</h2><p className="text-xs text-muted">Ask about places, local stories, food and experiences.</p></div></div>
      <label className="flex items-center gap-2 text-xs font-bold text-text">{t("replyLanguage", getDefaultLanguage())}<select value={replyLanguage} onChange={(event) => writeLanguage(event.target.value)} className="min-h-10 max-w-40 rounded-xl border border-border bg-bg px-2 py-2 text-xs"><option value="auto">{t("detectLanguage", getDefaultLanguage())}</option>{LANGUAGE_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
    </div>
    <div className="mt-4 max-h-[min(52vh,520px)] space-y-3 overflow-y-auto rounded-2xl bg-bg p-3" aria-live="polite">
      {chatMessages.map((message) => <div key={message.id} className={"max-w-[94%] rounded-2xl px-3 py-3 text-sm leading-relaxed " + (message.role === "guest" ? "ml-auto text-white" : "border border-border bg-surface text-text")} style={message.role === "guest" ? { backgroundColor: destination.themeColors.accent } : undefined}><p className="whitespace-pre-wrap">{message.text}</p><time className="mt-1 block text-[9px] opacity-60">{formatDate(message.createdAt, destination.locale, destination.timezone)}</time></div>)}
      {sending && <p role="status" className="text-xs text-muted">{t("sending", getDefaultLanguage())}</p>}
    </div>
    <form onSubmit={submit} className="mt-3 flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} placeholder={t("chatPlaceholder", getDefaultLanguage())} className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm" aria-label={t("chatPlaceholder", getDefaultLanguage())}/><button type="submit" disabled={!draft.trim() || sending} aria-label={t("send", getDefaultLanguage())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: destination.themeColors.accent }}><Send size={15}/><span className="hidden sm:inline">{t("send", getDefaultLanguage())}</span></button></form>
    <DemoNote>AI replies use the selected destination pack. Verify local advice independently; no booking or service request is sent to an external provider.</DemoNote>
  </section>;
}

export default function AtithiAI() {
  const { destination, destinations, selectDestination, weather, weatherLoading, weatherError, formatCurrency, formatNumber, emergencyNumber } = useDestination();
  const { itinerary, addItineraryStop, removeItineraryStop, clearItinerary, requests, addRequest, chatMessages, addChatMessage, preferences, updatePreferences } = useTravelContext();
  const [started, setStarted] = useState(readStarted);
  const [activeTab, setActiveTab] = useState("home");
  const [placeQuery, setPlaceQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [hiddenOnly, setHiddenOnly] = useState(false);
  const [showExperiences, setShowExperiences] = useState(true);
  const [showDishes, setShowDishes] = useState(true);
  const [interestDraft, setInterestDraft] = useState("");

  useEffect(() => { document.title = "Atithi AI · Go beyond the usual"; }, []);
  const planIds = useMemo(() => new Set(itinerary.map((item) => item.placeId)), [itinerary]);
  const filteredPlaces = useMemo(() => destination.places.filter((place) => {
    const query = placeQuery.trim().toLowerCase();
    return (!query || [place.name, place.localStory, place.category, ...place.tags].join(" ").toLowerCase().includes(query))
      && (categoryFilter === "all" || place.category === categoryFilter)
      && (!hiddenOnly || place.isHiddenGem);
  }), [destination.places, placeQuery, categoryFilter, hiddenOnly]);

  const saveIdea = (item, kind) => {
    const title = kind === "experience" ? item.title : item.name;
    const detail = kind === "experience"
      ? item.localStory + " Demo host: " + item.hostName + ". Illustrative spend: " + formatCurrency(item.priceLocal) + "."
      : item.description + " Suggested area: " + item.whereToEat + ". Illustrative price range: " + formatCurrency(item.priceRangeLocal[0]) + "–" + formatCurrency(item.priceRangeLocal[1]) + ".";
    const request = addRequest({ title: title, category: kind === "experience" ? "Experience idea" : "Food idea", detail });
    addChatMessage({ role: "assistant", text: t("requestCreated", getDefaultLanguage()) + " · " + request.title });
  };

  const buildPlan = async () => {
    const weatherKind = weather?.kind || "unknown";
    const timeOrder = { morning: 0, afternoon: 1, evening: 2, any: 3 };
    const score = (place) => {
      let value = place.isHiddenGem ? 3 : 0;
      if (weatherKind === "rain" && place.rainFriendly) value += 3;
      if (preferences.pace === "slow" && place.crowdLevel === "low") value += 3;
      if (preferences.pace === "curious" && ["culture", "craft", "market"].includes(place.category)) value += 2;
      if (preferences.interests.some((interest) => place.tags.some((tag) => tag.toLowerCase().includes(interest.toLowerCase())))) value += 4;
      return value;
    };
    const selected = [...destination.places]
      .filter((place) => !planIds.has(place.id))
      .sort((a, b) => score(b) - score(a) || timeOrder[a.bestTime] - timeOrder[b.bestTime] || a.name.localeCompare(b.name))
      .slice(0, Math.max(0, 5 - itinerary.length));
    selected.forEach(addItineraryStop);
    setActiveTab("plan");
  };

  const addInterest = (event) => {
    event.preventDefault();
    const interest = interestDraft.trim().toLowerCase().slice(0, 32);
    if (!interest) return;
    updatePreferences({ interests: Array.from(new Set([...preferences.interests, interest])).slice(0, 10) });
    setInterestDraft("");
  };

  const goStart = () => {
    saveStarted();
    setStarted(true);
    setActiveTab("home");
  };

  if (!started) return <WelcomeScreen destination={destination} destinations={destinations} selectDestination={selectDestination} onStart={goStart}/>;

  return <main className="min-h-screen bg-bg pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-text">
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 px-4 py-3 shadow-sm backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <button type="button" onClick={() => setActiveTab("home")} className="flex min-w-0 items-center gap-3 text-left"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: destination.themeColors.accent }}><Compass size={22}/></span><span className="min-w-0"><span className="block truncate font-serif text-2xl leading-none">Atithi AI</span><span className="mt-1 block truncate text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Go beyond the usual</span></span></button>
        <div className="flex items-center gap-2"><label className="sr-only" htmlFor="header-destination">Choose destination</label><select id="header-destination" value={destination.id} onChange={(event) => selectDestination(event.target.value)} className="min-h-10 max-w-32 rounded-xl border border-border bg-bg px-2 py-2 text-xs font-bold sm:max-w-48">{destinations.map((item) => <option key={item.id} value={item.id}>{item.city}, {item.country}</option>)}</select><ThemeToggle compact/><a href={"tel:" + emergencyNumber} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-border px-2 py-2 text-xs font-extrabold text-text" aria-label={"Call local emergency number " + emergencyNumber}><ShieldAlert size={15}/><span className="hidden sm:inline">SOS</span></a></div>
      </div>
    </header>

    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      {activeTab === "home" && <div className="space-y-5">
        <section className="overflow-hidden rounded-3xl p-5 text-white shadow-lg sm:p-8" style={{ background: "linear-gradient(125deg, #163e4b 0%, #28365c 55%, " + destination.themeColors.accent + " 100%)" }}>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/75">{destination.city} · {destination.country}</p>
          <h1 className="mt-3 max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">{destination.greeting}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">A personalised travel companion for hidden places, local stories and experiences that make a destination feel personal.</p>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setActiveTab("discover")} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-900">Discover the unexpected <ArrowRight size={16}/></button><button type="button" onClick={buildPlan} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-bold text-white">Build my day</button></div>
        </section>
        <WeatherPanel destination={destination} weather={weather} loading={weatherLoading} error={weatherError} formatNumber={formatNumber}/>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">A few places to begin</h2><p className="mt-1 text-xs text-muted">A changing mix of well-known landmarks and quieter corners.</p></div><button type="button" onClick={() => setActiveTab("discover")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold">All places <ArrowRight size={14}/></button></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">{[...destination.places].sort((a,b)=>Number(b.isHiddenGem)-Number(a.isHiddenGem)).slice(0,3).map((place)=><PlaceCard key={place.id} place={place} destination={destination} formatCurrency={formatCurrency} inPlan={planIds.has(place.id)} onAdd={addItineraryStop} onRemove={removeItineraryStop}/>)}</div><DemoNote/>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Your plan</h2><p className="mt-1 text-xs text-muted">{formatNumber(itinerary.length, destination.locale)} places saved for this destination.</p></div><button type="button" onClick={() => setActiveTab("plan")} className="min-h-10 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white">Review plan</button></div>{itinerary.length > 0 ? <ol className="mt-3 space-y-2">{itinerary.slice(0,3).map((stop,index)=><li key={stop.placeId} className="flex items-center gap-3 rounded-xl bg-bg p-3"><span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{backgroundColor:destination.themeColors.accent}}>{formatNumber(index+1,destination.locale)}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{stop.title}</span><span className="block text-[10px] text-muted">{niceWord(stop.bestTime || "any")}</span></span><button type="button" onClick={()=>removeItineraryStop(stop.placeId)} className="min-h-9 rounded-lg border border-border px-2 text-xs">Remove</button></li>)}</ol> : <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">Save a place from Discover or build a suggested day to start your plan.</p>}</section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><button type="button" onClick={() => setActiveTab("lens")} className="rounded-2xl border border-border bg-surface p-4 text-left hover:bg-surface-2"><Languages className="text-accent-text"/><h2 className="mt-2 font-serif text-xl">Translate what you see</h2><p className="mt-1 text-xs text-muted">Scan signs, menus and fare boards using Atithi Lens.</p></button><button type="button" onClick={() => setActiveTab("chat")} className="rounded-2xl border border-border bg-surface p-4 text-left hover:bg-surface-2"><MessageCircle className="text-accent-text"/><h2 className="mt-2 font-serif text-xl">Ask a travel question</h2><p className="mt-1 text-xs text-muted">Chat in your own language and explore ideas from this destination pack.</p></button></div>
      </div>}

      {activeTab === "discover" && <section className="space-y-5">
        <div className="overflow-hidden rounded-3xl p-5 text-white sm:p-7" style={{ background: "linear-gradient(125deg, #163e4b 0%, #28365c 55%, " + destination.themeColors.accent + " 100%)" }}><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">Discover · {destination.city}</p><h1 className="mt-2 font-serif text-4xl">Go beyond the usual.</h1><p className="mt-2 max-w-2xl text-sm text-white/80">Find neighbourhood details, creative places, local food and slower ways to explore.</p></div>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Places and hidden corners</h2><p className="mt-1 text-xs text-muted">A curated starting point — current access, crowds and availability are not verified.</p></div><span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-bold">{formatNumber(filteredPlaces.length, destination.locale)} places</span></div>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto_auto]"><label className="relative block"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-muted"/><input value={placeQuery} onChange={(event)=>setPlaceQuery(event.target.value)} placeholder="Search stories, tags or places" className="min-h-10 w-full rounded-xl border border-border bg-bg pl-9 pr-3 py-2 text-sm"/></label><label className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 text-xs font-semibold"><span className="sr-only">Filter category</span><select value={categoryFilter} onChange={(event)=>setCategoryFilter(event.target.value)} className="min-h-10 w-full bg-transparent py-2"><option value="all">All categories</option>{CATEGORY_OPTIONS.map((category)=><option key={category} value={category}>{CATEGORY_LABELS[category]}</option>)}</select></label><label className="flex min-h-10 items-center gap-2 rounded-xl border border-border bg-bg px-3 text-xs font-semibold"><input type="checkbox" checked={hiddenOnly} onChange={(event)=>setHiddenOnly(event.target.checked)}/>Hidden-place picks</label></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{filteredPlaces.map((place)=><PlaceCard key={place.id} place={place} destination={destination} formatCurrency={formatCurrency} inPlan={planIds.has(place.id)} onAdd={addItineraryStop} onRemove={removeItineraryStop}/>)}</div>
          {filteredPlaces.length===0 && <p className="mt-4 rounded-xl border border-dashed border-border p-5 text-sm text-muted">No places match those filters. Try another category or search.</p>}
          <div className="mt-5 overflow-hidden rounded-2xl border border-border"><Suspense fallback={<div className="map-empty min-h-64">Loading destination map…</div>}><DestinationMap destination={destination} height={320}/></Suspense></div>
          <DemoNote/>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><button type="button" onClick={()=>setShowExperiences((value)=>!value)} className="flex min-h-10 w-full items-center justify-between gap-3 text-left"><span><span className="block font-serif text-2xl">Local experiences</span><span className="mt-1 block text-xs text-muted">Small-group ideas, craft, food, culture and slow moments.</span></span>{showExperiences?<Minus size={17}/>:<Plus size={17}/>}</button>{showExperiences&&<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{destination.experiences.map((experience)=><ExperienceCard key={experience.id} experience={experience} destination={destination} formatCurrency={formatCurrency} onSave={(item)=>saveIdea(item,"experience")}/>)}</div>}<DemoNote/></section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><button type="button" onClick={()=>setShowDishes((value)=>!value)} className="flex min-h-10 w-full items-center justify-between gap-3 text-left"><span><span className="block font-serif text-2xl">Taste local</span><span className="mt-1 block text-xs text-muted">Dish stories and illustrative local spend ranges.</span></span>{showDishes?<Minus size={17}/>:<Plus size={17}/>}</button>{showDishes&&<div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{destination.dishes.map((dish)=><DishCard key={dish.id} dish={dish} destination={destination} formatNumber={formatNumber} formatCurrencyRange={(low,high)=>formatCurrency(low)+" – "+formatCurrency(high)} onSave={(item)=>saveIdea(item,"dish")}/>)}</div>}<DemoNote>Dietary tags and dishes are illustrative, recipes vary and allergens must be confirmed directly with a food provider.</DemoNote></section>
      </section>}

      {activeTab === "plan" && <section className="space-y-4"><div className="rounded-3xl p-5 text-white sm:p-7" style={{background:"linear-gradient(125deg, #163e4b 0%, #28365c 55%, "+destination.themeColors.accent+" 100%)"}}><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">Your personal plan</p><h1 className="mt-2 font-serif text-4xl">A day with room to wander.</h1><p className="mt-2 text-sm text-white/80">Choose places yourself or use a simple pack-based suggestion. Nothing is booked.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={buildPlan} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-extrabold text-slate-900"><Sparkles size={16}/>Suggest places</button><button type="button" onClick={clearItinerary} disabled={!itinerary.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/30 px-4 py-2 text-sm font-bold disabled:opacity-50"><X size={15}/>Clear plan</button></div></div>
          {itinerary.length ? <ol className="space-y-3">{itinerary.map((stop,index)=>{const place=destination.places.find((item)=>item.id===stop.placeId);if(!place)return null;return <li key={stop.placeId} className="flex gap-3 rounded-2xl border border-border bg-surface p-4"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{backgroundColor:destination.themeColors.accent}}>{formatNumber(index+1,destination.locale)}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-xl">{place.name}</h2><span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold">{niceWord(place.bestTime)}</span></div><p className="mt-1 text-sm leading-relaxed text-muted">{place.localStory}</p><p className="mt-2 text-[10px] text-muted">{formatNumber(place.durationMin,destination.locale)} min · {niceWord(place.category)}</p></div><button type="button" onClick={()=>removeItineraryStop(place.id)} aria-label={"Remove "+place.name} className="min-h-9 min-w-9 rounded-lg border border-border px-2"><X size={15}/></button></li>})}</ol> : <div className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center"><CalendarDays size={28} className="mx-auto text-muted"/><h2 className="mt-3 font-serif text-2xl">Your plan starts with curiosity.</h2><p className="mt-2 text-sm text-muted">Add places from Discover or ask for suggestions tailored to your interests and pace.</p><button type="button" onClick={()=>setActiveTab("discover")} className="mt-4 min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white">Find places</button></div>}
          <DemoNote>Suggested times of day are approximate preferences, not opening-hour information or reservations.</DemoNote>
        </section>}

      {activeTab === "lens" && <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><LensTab onRequest={(request)=>addRequest({title:request.title,category:request.category,detail:request.detail})}/></section>}
      {activeTab === "chat" && <ChatView destination={destination} preferences={preferences} chatMessages={chatMessages} addChatMessage={addChatMessage} addRequest={addRequest}/>}
      {activeTab === "profile" && <section className="space-y-4">
        <div className="rounded-3xl p-5 text-white sm:p-7" style={{background:"linear-gradient(125deg, #163e4b 0%, #28365c 55%, "+destination.themeColors.accent+" 100%)"}}><p className="text-xs font-bold uppercase tracking-[0.18em] text-white/70">Your travel style</p><h1 className="mt-2 font-serif text-4xl">Make it yours.</h1><p className="mt-2 text-sm text-white/80">Your preferences help shape suggestions on this device.</p></div>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="font-serif text-2xl">Destination</h2><div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">{destinations.map((item)=><button key={item.id} type="button" onClick={()=>selectDestination(item.id)} aria-pressed={destination.id===item.id} className={"min-h-20 rounded-xl border p-3 text-left "+(destination.id===item.id?"border-current bg-surface-2":"border-border bg-bg")}><span className="block text-[10px] text-muted">{item.country}</span><span className="mt-1 block font-serif text-xl">{item.city}</span></button>)}</div></section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="font-serif text-2xl">Your pace</h2><label className="mt-3 block text-xs font-bold text-muted">Travel mood<select value={preferences.pace} onChange={(event)=>updatePreferences({pace:event.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">{PACE_OPTIONS.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label className="mt-3 block text-xs font-bold text-muted">Food preference<select value={preferences.dietaryPreference} onChange={(event)=>updatePreferences({dietaryPreference:event.target.value})} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text">{DIET_OPTIONS.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><form onSubmit={addInterest} className="mt-4"><label htmlFor="profile-interest" className="block text-xs font-bold text-muted">Interests — add one at a time</label><div className="mt-1 flex gap-2"><input id="profile-interest" value={interestDraft} maxLength={32} onChange={(event)=>setInterestDraft(event.target.value)} placeholder="e.g. ceramics, gardens, music" className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text"/><button type="submit" className="min-h-11 rounded-xl bg-brand px-3 text-sm font-bold text-white">Add</button></div></form><div className="mt-3 flex flex-wrap gap-2">{preferences.interests.map((interest)=><button key={interest} type="button" onClick={()=>updatePreferences({interests:preferences.interests.filter((item)=>item!==interest)})} className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-bg px-3 py-1 text-xs">{interest}<X size={12}/></button>)}</div></section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><h2 className="font-serif text-2xl">Saved trip notes</h2>{requests.length ? <div className="mt-3 space-y-2">{requests.map((request)=><article key={request.id} className="rounded-xl border border-border bg-bg p-3"><div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-sm font-bold">{request.title}</h3><span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold">{request.status}</span></div><p className="mt-1 text-xs text-muted">{request.category}</p><p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-muted">{request.detail}</p><time className="mt-2 block text-[10px] text-muted">{formatDate(request.createdAt,destination.locale,destination.timezone)}</time></article>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">Save a Lens result, dish or experience to keep a note here.</p>}</section>
        <p className="text-[10px] leading-relaxed text-muted">Your plan, chat and saved notes are stored locally in this browser. Switching destinations starts a fresh plan and conversation.</p>
      </section>}
    </div>

    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-1 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.35rem)] shadow-[0_-8px_30px_rgba(0,0,0,0.06)] backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-stretch justify-around gap-0.5">{TABS.map(({id,label,Icon})=><button key={id} type="button" onClick={()=>setActiveTab(id)} aria-current={activeTab===id?"page":undefined} className={"flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 text-[9px] font-semibold sm:text-[10px] "+(activeTab===id?"bg-brand/10 text-brand dark:text-accent":"text-muted")}><Icon size={18}/><span className="max-w-full truncate">{label}</span></button>)}</div>
    </nav>
  </main>;
}
