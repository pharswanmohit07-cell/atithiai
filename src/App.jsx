import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import {
  ArrowRight, CalendarDays, Check, Compass, Heart,
  Languages, MapPin, MessageCircle, Plus, Send, ShieldAlert,
  Sparkles, Sun, Users, X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ThemeToggle from "./components/ui/ThemeToggle.jsx";
import IconBadge from "./components/ui/IconBadge.jsx";
import DemoModeBar from "./components/DemoModeBar.jsx";
import { demoFetch, isCachedDemoMode } from "./lib/demoCache.js";
import { useDestination } from "./context/DestinationContext.jsx";
import { useTravelContext } from "./context/TravelContext.jsx";
import { useProfile } from "./context/ProfileContext.jsx";
import { rankPlaces, rankDishes, rankExperiences } from "./lib/rank.js";
import { getDefaultLanguage, detectTextLanguage, languageBase, LANGUAGE_OPTIONS, targetLanguageTag, t } from "./i18n.js";

const LensTab = lazy(() => import("./components/guest/LensTab.jsx"));
const ProfileTab = lazy(() => import("./components/ProfileTab.jsx"));
const ProfileOnboarding = lazy(() => import("./components/ProfileTab.jsx").then((module) => ({ default: module.ProfileOnboarding })));
const DiscoverTab = lazy(() => import("./components/DiscoverTab.jsx"));
const PlanTab = lazy(() => import("./components/PlanTab.jsx"));
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

function formatPackMoney(value, destination) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat(destination.locale, {
      style: "currency",
      currency: destination.currency.code,
      maximumFractionDigits: ["IDR", "JPY", "KRW", "VND", "CLP"].includes(destination.currency.code) ? 0 : 2
    }).format(amount);
  } catch {
    return new Intl.NumberFormat(destination.locale, { maximumFractionDigits: 2 }).format(amount) + " " + destination.currency.code;
  }
}
function destinationDaypart(timezone) {
  try {
    const hour = Number(new Intl.DateTimeFormat("en", { hour: "2-digit", hourCycle: "h23", timeZone: timezone }).format(new Date()));
    return hour < 11 ? "morning" : hour < 16 ? "afternoon" : "evening";
  } catch {
    return "afternoon";
  }
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

function WeatherPanel({ destination, weather, loading, error, formatNumber }) {
  return <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-accent-text">{weather?.source === "cached-demo" ? "Cached demo result · Open-Meteo snapshot" : "Live weather · Open-Meteo"}</p><h2 className="mt-1 font-serif text-2xl">{weather?.condition || (loading ? "Checking conditions…" : "Weather unavailable")}</h2></div><span className="rounded-xl px-3 py-2 text-xs font-bold" style={{ backgroundColor: destination.themeColors.accentSoft, color: destination.themeColors.accent }}>{destination.city}</span></div>
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
    <header className="mx-auto flex max-w-5xl items-center justify-between"><div className="flex items-center gap-3"><IconBadge icon={Compass} tone="gold" size="lg" /><div><p className="font-serif text-2xl leading-none">Atithi AI</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted">Go beyond the usual</p></div></div><ThemeToggle compact/></header>
    <section className="pitch-hero mx-auto mt-6 max-w-5xl overflow-hidden rounded-[2rem] p-6 text-white shadow-2xl sm:mt-10 sm:p-10" style={{ "--destination-accent": destination.themeColors.accent }}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">A more personal way to explore</p>
      <h1 className="deck-heading mt-4 max-w-3xl font-display text-4xl leading-tight sm:text-6xl">Find the places and stories that make a destination feel personal.</h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 sm:text-base">Discover neighbourhood details, local food and thoughtful experiences beyond the usual shortlist — at your own pace.</p>
      <div className="mt-7 grid grid-cols-1 gap-3 md:grid-cols-3">
        {destinations.map((item) => <button key={item.id} type="button" onClick={() => selectDestination(item.id)} aria-pressed={destination.id === item.id} className={"min-h-28 rounded-2xl border p-4 text-left transition-colors " + (destination.id === item.id ? "border-white bg-white text-slate-900" : "border-white/25 bg-white/10 text-white hover:bg-white/20")}>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.17em]">{item.country}</span><span className="mt-2 block font-serif text-2xl">{item.city}</span>
          <span className="mt-1 block text-xs opacity-75">{item.primaryLanguages.slice(0, 2).join(" · ")}</span>
        </button>)}
      </div>
      <button type="button" onClick={onStart} className="btn-primary mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold">{ "Start exploring" } <ArrowRight size={17}/></button>
    </section>
    <p className="mx-auto mt-4 max-w-5xl text-[10px] leading-relaxed text-muted">Demo content · Place details, stories and spend ranges are AI-assisted examples. Confirm details locally. Only weather is live.</p>
  </main>;
}

function fallbackIntent(text, currencySymbol = "") {
  const value = String(text || "").toLowerCase();
  let intent = "other";
  if (/\b(plan|itinerary|plan my day|day plan)\b/.test(value)) intent = "plan_day";
  else if (/\b(food|dish|eat|menu|restaurant|vegan|vegetarian|spicy)\b/.test(value)) intent = "find_food";
  else if (/\b(experience|workshop|class|guide|activity|craft|tour)\b/.test(value)) intent = "find_experience";
  else if (/\b(help|support|lost|translate|emergency)\b/.test(value)) intent = "help";
  else if (/\b(place|visit|see|hidden|quiet|crowded|nearby|viewpoint|museum|market|park|find|where)\b/.test(value)) intent = "find_place";
  const categories = [];
  const categoryPhrases = [
    ["nature", /\b(nature|park|forest|garden|walk|hike|landscape)\b/],
    ["market", /\b(market|bazaar|shopping)\b/],
    ["cafe", /\b(cafe|café|coffee|tea)\b/],
    ["culture", /\b(culture|history|heritage|museum|temple|music)\b/],
    ["craft", /\b(craft|artisan|pottery|textile|tile|painting|woodcarving|ceramic)\b/],
    ["viewpoint", /\b(view|viewpoint|sunset|overlook)\b/],
    ["wellness", /\b(wellness|yoga|massage|relax|meditate)\b/]
  ];
  for (const [category, pattern] of categoryPhrases) if (pattern.test(value)) categories.push(category);
  let diet = null;
  if (/\bvegan\b/.test(value)) diet = "vegan";
  else if (/\bvegetarian\b|\bveg\b/.test(value)) diet = "veg";
  else if (/\bhalal\b/.test(value)) diet = "halal";
  else if (/gluten[- ]?(free|aware)/.test(value)) diet = "gluten-aware";
  else if (/\bnon[- ]?veg(etarian)?\b/.test(value)) diet = "non-veg";
  const budgetMatch = value.match(new RegExp("(?:under|below|less than|max|up to|budget of)\\s*(?:" + (currencySymbol ? String(currencySymbol) + "\\s*" : "") + ")?([\\d][\\d,.]*)", "i"));
  let maxBudgetLocal = null;
  if (budgetMatch) {
    const amount = Number(budgetMatch[1].replace(/,(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
    if (Number.isFinite(amount) && amount > 0) maxBudgetLocal = amount;
  }
  const timeOfDay = /\b(morning|breakfast|sunrise)\b/.test(value) ? "morning" : /\b(afternoon|lunch|noon)\b/.test(value) ? "afternoon" : /\b(evening|night|dinner|sunset)\b/.test(value) ? "evening" : null;
  const durationMatch = value.match(/(\d+(?:\.\d+)?)\s*(hours?|hrs?|h\b|minutes?|mins?|m\b)/);
  const durationMin = durationMatch ? Number(durationMatch[1]) * (/hour|hr|\bh\b/.test(durationMatch[2]) ? 60 : 1) : null;
  return {
    intent,
    filters: {
      categories, diet, maxBudgetLocal, timeOfDay,
      mood: /\b(quiet|calm|peaceful|relaxed|slow)\b/.test(value) ? "quiet" : null,
      avoidCrowds: /\b(avoid crowds|less crowded|not crowded|quiet|crowd-free)\b/.test(value) ? true : null,
      indoorOnly: /\b(indoors?|inside|rainy day|rainy|rain|wet weather)\b/.test(value) ? true : null,
      durationMin: Number.isFinite(durationMin) ? durationMin : null
    },
    language: targetLanguageTag(detectTextLanguage(text))
  };
}
function resolveChatResult(destination, result) {
  if (!result || typeof result.id !== "string") return null;
  const collection = result.itemType === "place" ? destination.places : result.itemType === "experience" ? destination.experiences : result.itemType === "dish" ? destination.dishes : [];
  const item = collection.find((entry) => entry.id === result.id);
  if (!item) return null;
  const title = result.itemType === "experience" ? item.title : item.name;
  const description = item.localStory || item.description || "";
  const price = result.itemType === "place"
    ? item.avgSpendLocal > 0 ? "Illustrative spend: " + formatPackMoney(item.avgSpendLocal, destination) : "No spend estimate"
    : result.itemType === "experience"
      ? "Illustrative estimate: " + formatPackMoney(item.priceLocal, destination)
      : Array.isArray(item.priceRangeLocal) ? "Demo range: " + formatPackMoney(item.priceRangeLocal[0], destination) + " – " + formatPackMoney(item.priceRangeLocal[1], destination) : "";
  let mapPlace = result.itemType === "place" ? item : destination.places.find((place) => place.category === item.category);
  if (!mapPlace && result.itemType === "dish") mapPlace = destination.places.find((place) => ["market", "cafe"].includes(place.category));
  if (!mapPlace) mapPlace = destination.places[0];
  return { ...item, id: item.id, itemType: result.itemType, title, description, price, reasons: result.reasons || [], score: result.score || 0, mapPlaceId: mapPlace?.id };
}
function localRankedReply(language, items) {
  const base = languageBase(language);
  const firstNames = items.slice(0, 2).map((item) => item.title).filter(Boolean).join(" and ");
  const lead = {
    en: "I ranked options against your preferences. These are demo ideas; confirm details locally.",
    hi: "मैंने आपकी पसंद के अनुसार विकल्प क्रमबद्ध किए हैं। ये डेमो सुझाव हैं; स्थानीय रूप से पुष्टि करें।",
    es: "He ordenado opciones según tus preferencias. Son ideas de demostración; verifica los detalles localmente.",
    fr: "J’ai classé les options selon vos préférences. Ce sont des exemples ; vérifiez les détails sur place.",
    de: "Ich habe passende Optionen nach deinen Vorlieben sortiert. Dies sind Demo-Ideen; prüfe Details vor Ort.",
    ja: "好みに合わせて候補を並べました。デモ用の提案なので、詳細は現地で確認してください。",
    ar: "رتبت الخيارات وفق تفضيلاتك. هذه اقتراحات تجريبية؛ تحقق من التفاصيل محليًا.",
    zh: "我已按你的偏好排列候选项。这些是演示建议，请在当地确认详情。",
    pt: "Ordenei as opções de acordo com as suas preferências. São ideias de demonstração; confirme os detalhes localmente.",
    id: "Saya mengurutkan pilihan berdasarkan preferensi perjalanan Anda. Ini ide demo; verifikasi detailnya secara lokal."
  }[base] || "I ranked options against your preferences. These are demo ideas; confirm details locally.";
  if (!items.length) {
    return {
      en:"I couldn't find an option matching every filter in this destination pack. Try relaxing a constraint and verify details locally.",
      hi:"इस डेस्टिनेशन पैक में सभी फ़िल्टर से मेल खाता विकल्प नहीं मिला। कोई फ़िल्टर ढीला करके स्थानीय रूप से पुष्टि करें।",
      es:"No encontré una opción que cumpla todos los filtros. Prueba a relajar uno y verifica los detalles localmente.",
      fr:"Aucune option ne correspond à tous les filtres. Essayez d’en assouplir un et vérifiez sur place.",
      de:"Keine Option erfüllt alle Filter. Lockere einen Filter und prüfe die Details vor Ort.",
      ja:"すべての条件に合う候補がありません。条件を緩めて現地で確認してください。",
      ar:"لم أجد خيارًا يطابق جميع المرشحات. خفف أحد الشروط وتحقق محليًا.",
      zh:"没有找到符合所有筛选条件的选项。请放宽一个条件并在当地确认。",
      pt:"Não encontrei uma opção que corresponda a todos os filtros. Tente flexibilizar um e confirme localmente.",
      id:"Tidak ada pilihan yang cocok dengan semua filter. Coba longgarkan satu kriteria dan verifikasi secara lokal."
    }[base] || "I couldn't find an option matching every filter. Try relaxing a constraint and verify locally.";
  }
  return firstNames ? lead + " " + firstNames + "." : lead;
}
function ChatResultCard({ destination, result, added, onAdd, onShowMap }) {
  const title = result.title;
  const description = result.description;
  return <article className="rounded-xl border border-border bg-bg p-3">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-serif text-lg leading-snug">{title}</h3><span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold capitalize">{result.itemType}</span></div>
    <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
    {result.itemType === "dish" && result.whereToEat && <p className="mt-1 text-[10px] text-muted">Suggested area: {result.whereToEat}</p>}
    {result.itemType !== "place" && <p className="mt-1 text-[10px] leading-relaxed text-muted">Map opens a related area from this destination pack, not a verified host or food-provider location.</p>}
    {result.price && <p className="mt-2 text-xs font-bold">{result.price} <span className="font-normal text-muted">· demo</span></p>}
    {result.reasons.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{result.reasons.slice(0, 4).map((reason, index) => <span key={reason + index} className="rounded-full border border-border bg-surface px-2 py-1 text-[9px] leading-relaxed text-muted">{reason}</span>)}</div>}
    <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={onAdd} disabled={added} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{added ? <Check size={13}/> : <Plus size={13}/>} {added ? "Added to plan" : "Add to plan"}</button><button type="button" onClick={onShowMap} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-bold"><MapPin size={13}/>Show on map</button></div>
  </article>;
}
function chatFallbackMessage(reason) {
  const messages = {
    cached_demo_mode: "Cached demo mode is enabled, so this message did not call Gemini. Turn it off in the Demo Mode bar and retry.",
    no_ranked_items: "No matching items were selected from this destination pack. Try asking for places, food, or experiences.",
    missing_api_key: "GEMINI_API_KEY is missing from this deployment. Add it to Vercel Preview and redeploy.",
    provider_http_400: "Gemini rejected the request (HTTP 400). Check the model name and API request.",
    provider_http_401: "Google rejected the key (HTTP 401). Use a valid Google AI Studio Gemini API key, then redeploy.",
    provider_http_403: "Google denied the request (HTTP 403). Check API-key restrictions and Gemini API access.",
    provider_http_404: "Gemini model was not found (HTTP 404). Set GEMINI_MODEL to gemini-2.5-flash and redeploy.",
    provider_http_429: "Gemini quota or rate limit was reached (HTTP 429). Check usage and limits in AI Studio.",
    provider_http_5xx: "Gemini returned a temporary server error. Retry shortly.",
    timeout: "Gemini took too long to respond. Retry, and check provider availability if it continues.",
    request_timeout: "The browser timed out waiting for the chat API. Retry once.",
    network_error: "The browser could not reach /api/chat. Check this deployment and the Network panel.",
    request_failed: "The chat API returned an error response. Inspect the /api/chat request in DevTools.",
    response_rejected: "Gemini responded, but the app rejected the response format. Retry with a shorter question.",
    provider_error: "The Gemini request failed. Check the /api/chat response reason in DevTools.",
    not_gemini: "The API returned a fallback response instead of a Gemini-generated response."
  };
  return messages[reason] || messages.provider_error;
}

function ChatView({ destination, weather, profile, chatMessages, addChatMessage, addRequest, addItineraryItem, onShowOnMap, initialPrompt, onPrefillConsumed }) {
  const [draft, setDraft] = useState("");
  useEffect(() => {
    if (!initialPrompt) return;
    setDraft(initialPrompt.slice(0, 1200));
    onPrefillConsumed?.();
  }, [initialPrompt, onPrefillConsumed]);
  const [sending, setSending] = useState(false);
  const [providerStatus, setProviderStatus] = useState({ source: "unknown", reason: "" });
  const [replyLanguage, setReplyLanguage] = useState(() => {
    try { return localStorage.getItem("atithi-chat-language") || "auto"; } catch { return "auto"; }
  });
  const [addedResults, setAddedResults] = useState([]);
  const writeLanguage = (value) => {
    setReplyLanguage(value);
    try { localStorage.setItem("atithi-chat-language", value); } catch { /* Keep the selection for this session. */ }
  };

  const submit = async (event) => {
    event.preventDefault();
    const message = draft.trim().slice(0, 1200);
    if (!message || sending) return;
    setProviderStatus({ source: "checking", reason: "" });
    setDraft("");
    addChatMessage({ role: "guest", text: message });
    setSending(true);
    let requestLanguage = replyLanguage === "auto" ? detectTextLanguage(message) : replyLanguage;
    let parsedIntent = fallbackIntent(message, destination.currency.symbol);
    const intentController = new AbortController();
    const intentTimeout = window.setTimeout(() => intentController.abort(), 3000);
    try {
      const response = await demoFetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: intentController.signal,
        body: JSON.stringify({
          text: message,
          city: destination.city,
          country: destination.country,
          currency: destination.currency.code,
          currencySymbol: destination.currency.symbol,
          languages: profile.languages
        })
      });
      const payload = await response.json();
      if (response.ok && payload && typeof payload.intent === "string" && payload.filters && typeof payload.filters === "object") parsedIntent = payload;
    } catch {
      // The local keyword extractor is used when intent parsing is offline or times out.
    } finally {
      window.clearTimeout(intentTimeout);
    }

    if (replyLanguage !== "auto") parsedIntent.language = targetLanguageTag(replyLanguage);
    else requestLanguage = parsedIntent.language || requestLanguage;
    const filters = {
      ...(parsedIntent.filters || {}),
      diet: parsedIntent.filters?.diet && parsedIntent.filters.diet !== "none" ? parsedIntent.filters.diet : (profile.diet === "none" ? null : profile.diet),
      avoidCrowds: parsedIntent.filters?.avoidCrowds ?? profile.avoidCrowds,
      maxBudgetLocal: parsedIntent.filters?.maxBudgetLocal ?? null
    };
    const freeMinutes = profile.pace === "relaxed" ? 180 : profile.pace === "packed" ? 600 : 360;
    const context = { weather, timeOfDay: filters.timeOfDay || destinationDaypart(destination.timezone), freeMinutes, budget: profile.dailyBudget.amount };
    let ranked = [];
    if (parsedIntent.intent === "find_food") ranked = rankDishes(destination.dishes, profile, filters, context);
    else if (parsedIntent.intent === "find_experience") ranked = rankExperiences(destination.experiences, profile, filters, context);
    else if (parsedIntent.intent === "find_place" || parsedIntent.intent === "plan_day") ranked = rankPlaces(destination.places, profile, filters, context);
    else {
      const placeResults = rankPlaces(destination.places, profile, filters, context).slice(0, 3);
      const experienceResults = rankExperiences(destination.experiences, profile, filters, context).slice(0, 2);
      ranked = [...placeResults, ...experienceResults].sort((a, b) => b.score - a.score);
    }
    ranked = ranked.slice(0, 5).map((item) => ({
      ...item,
      itemType: item.itemType || (parsedIntent.intent === "find_food" ? "dish" : parsedIntent.intent === "find_experience" ? "experience" : "place")
    }));
    const fallback = localRankedReply(requestLanguage, ranked.map((item) => ({
      title: item.itemType === "experience" ? item.title : item.name
    })));
    let reply = fallback;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 7000);
    try {
      const response = await demoFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          message,
          destinationId: destination.id,
          replyLanguage: replyLanguage === "auto" ? (parsedIntent.language || "auto") : targetLanguageTag(replyLanguage),
          profile,
          weather: weather?.source === "live" ? weather : null,
          rankedItems: ranked.map((item) => ({ id: item.id, itemType: item.itemType, score: item.score, reasons: item.reasons })),
          intent: parsedIntent.intent
        })
      });
      const payload = await response.json();
      const usableReply = response.ok && typeof payload?.reply === "string" && payload.reply.trim() && payload.reply.trim().split(/\s+/).length <= 70;
      if (usableReply) reply = payload.reply.trim();
      setProviderStatus({
        source: usableReply && payload?.source === "gemini" ? "gemini" : "fallback",
        reason: typeof payload?.reason === "string" ? payload.reason : (usableReply ? "not_gemini" : "request_failed")
      });
    } catch {
      setProviderStatus({
        source: "fallback",
        reason: isCachedDemoMode() ? "cached_demo_mode" : controller.signal.aborted ? "request_timeout" : "network_error"
      });
      // Keep deterministic ranked cards visible while reporting why Gemini did not answer.
    } finally {
      window.clearTimeout(timeout);
      setSending(false);
    }
    addChatMessage({ role: "assistant", text: reply, intent: parsedIntent.intent, results: ranked });
    if (/^(save|remember|add to (my )?trip|keep this|note this)$/i.test(message.trim())) {
      addRequest({ title: "Travel note from chat", category: "Chat idea", detail: message });
    }
  };

  return <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-center gap-3"><IconBadge icon={MessageCircle} tone="teal" /><div><h2 className="font-serif text-2xl">{t("chatTitle", getDefaultLanguage())}</h2><p className="text-xs text-muted">Tell Atithi what kind of place, food or experience you have in mind.</p></div></div>
      <label className="flex items-center gap-2 text-xs font-bold text-text">{t("replyLanguage", getDefaultLanguage())}<select value={replyLanguage} onChange={(event) => writeLanguage(event.target.value)} className="min-h-10 max-w-40 rounded-xl border border-border bg-bg px-2 py-2 text-xs"><option value="auto">{t("detectLanguage", getDefaultLanguage())}</option>{LANGUAGE_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
    </div>
    {providerStatus.source !== "unknown" && <div role="status" className={"mb-3 rounded-xl border px-3 py-2 text-xs leading-relaxed " + (providerStatus.source === "gemini" ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-100" : providerStatus.source === "checking" ? "border-border bg-bg text-muted" : "border-amber-500/40 bg-amber-500/10 text-amber-100")}>
      {providerStatus.source === "checking"
        ? "Checking live Gemini response…"
        : providerStatus.source === "gemini"
          ? "Gemini connected — this reply was generated by Gemini."
          : <><strong>Local fallback active:</strong> {chatFallbackMessage(providerStatus.reason)}</>}
    </div>}
    <div className="mt-4 max-h-[min(62vh,640px)] space-y-3 overflow-y-auto rounded-2xl bg-bg p-3" aria-live="polite">
      {chatMessages.map((message) => <div key={message.id} className={"max-w-[98%] rounded-2xl px-3 py-3 text-sm leading-relaxed " + (message.role === "guest" ? "ml-auto text-white" : "border border-border bg-surface text-text")} style={message.role === "guest" ? { backgroundColor: destination.themeColors.accent } : undefined}>
        <p className="whitespace-pre-wrap">{message.text}</p><time className="mt-1 block text-[9px] opacity-60">{formatDate(message.createdAt, destination.locale, destination.timezone)}</time>
        {message.role === "assistant" && Array.isArray(message.results) && message.results.length > 0 && <div className="mt-3 space-y-2">{message.results.map((reference) => {
          const result = resolveChatResult(destination, reference);
          if (!result) return null;
          const key = reference.itemType + ":" + reference.id;
          return <ChatResultCard key={key} destination={destination} result={result} added={addedResults.includes(key)} onAdd={() => { const stop = addItineraryItem(result, reference.itemType); if (stop) setAddedResults((current) => [...new Set([...current, key])]); }} onShowMap={() => result.mapPlaceId && onShowOnMap(result.mapPlaceId)}/>;
        })}</div>}
      </div>)}
      {sending && <p role="status" className="text-xs text-muted">{t("sending", getDefaultLanguage())}</p>}
    </div>
    <form onSubmit={submit} className="mt-3 flex gap-2"><input value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={1200} placeholder={t("chatPlaceholder", getDefaultLanguage())} className="min-h-11 min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm" aria-label={t("chatPlaceholder", getDefaultLanguage())}/><button type="submit" disabled={!draft.trim() || sending} aria-label={t("send", getDefaultLanguage())} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold text-white disabled:opacity-50" style={{ backgroundColor: destination.themeColors.accent }}><Send size={15}/><span className="hidden sm:inline">{t("send", getDefaultLanguage())}</span></button></form>
    <DemoNote>Rank scores and reason chips come from deterministic rules. Stories, hosts and spending ranges are illustrative; only weather is live.</DemoNote>
  </section>;
}
export default function AtithiAI() {
  const { destination, destinations, selectDestination, weather, weatherLoading, weatherError, formatCurrency, formatNumber, emergencyNumber } = useDestination();
  const { itinerary, addItineraryStop, addItineraryItem, removeItineraryStop, clearItinerary, requests, addRequest, chatMessages, addChatMessage } = useTravelContext();
  const { profile } = useProfile();
  const [started, setStarted] = useState(readStarted);
  const [activeTab, setActiveTab] = useState("home");
  const [chatPrefill, setChatPrefill] = useState("");
  const [mapFocusId, setMapFocusId] = useState(null);

  useEffect(() => { document.title = "Atithi AI · Go beyond the usual"; }, []);
  useEffect(() => {
    const openChat = (event) => {
      setChatPrefill(String(event.detail?.prompt || "").slice(0, 1200));
      setActiveTab("chat");
    };
    window.addEventListener("atithi:open-chat", openChat);
    return () => window.removeEventListener("atithi:open-chat", openChat);
  }, []);
  useEffect(() => { setMapFocusId(null); }, [destination.id]);
  useEffect(() => {
    if (activeTab !== "discover" || !mapFocusId) return undefined;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("destination-map-container")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeTab, mapFocusId]);
  const planIds = useMemo(() => new Set(itinerary.map((item) => item.placeId)), [itinerary]);
  const rankProfile = useMemo(() => ({
    ...profile,
    dailyBudget: {
      ...profile.dailyBudget,
      amount: profile.dailyBudget.amount !== null && profile.dailyBudget.currencyCode !== destination.currency.code
        ? null
        : profile.dailyBudget.amount
    }
  }), [profile, destination.currency.code]);
  const buildPlan = () => setActiveTab("plan");
  const showOnMap = (placeId) => {
    if (!destination.places.some((place) => place.id === placeId)) return;
    setMapFocusId(placeId);
    setActiveTab("discover");
  };

  const goStart = () => {
    saveStarted();
    setStarted(true);
    setActiveTab("home");
  };

  if (!started) return <><DemoModeBar/><WelcomeScreen destination={destination} destinations={destinations} selectDestination={selectDestination} onStart={goStart}/></>;
  if (!profile.onboardingComplete) return <><DemoModeBar/><Suspense fallback={<div role="status" className="mx-auto max-w-6xl p-6 text-sm text-muted">Loading your preferences…</div>}><ProfileOnboarding destination={destination} onFinish={() => setActiveTab("home")}/></Suspense></>;

  return <main className="min-h-screen bg-bg pb-[calc(5.75rem+env(safe-area-inset-bottom))] text-text">
    <DemoModeBar/>
    <header className="sticky top-0 z-40 border-b border-border bg-surface/95 px-4 py-3 shadow-sm sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <button type="button" onClick={() => setActiveTab("home")} className="flex min-w-0 items-center gap-3 text-left"><IconBadge icon={Compass} tone="violet" /><span className="min-w-0"><span className="block truncate font-display text-2xl leading-none">Atithi AI</span><span className="mt-1 block truncate text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Go beyond the usual</span></span></button>
        <div className="flex items-center gap-2"><label className="sr-only" htmlFor="header-destination">Choose destination</label><select id="header-destination" value={destination.id} onChange={(event) => selectDestination(event.target.value)} className="min-h-10 max-w-32 rounded-xl border border-border bg-bg px-2 py-2 text-xs font-bold sm:max-w-48">{destinations.map((item) => <option key={item.id} value={item.id}>{item.city}, {item.country}</option>)}</select><ThemeToggle compact/><a href={"tel:" + emergencyNumber} className="inline-flex min-h-10 items-center gap-1 rounded-xl border border-border px-2 py-2 text-xs font-extrabold text-text" aria-label={"Call local emergency number " + emergencyNumber}><ShieldAlert size={15}/><span className="hidden sm:inline">SOS</span></a></div>
      </div>
    </header>

    <div className="mx-auto max-w-6xl space-y-5 px-4 py-5 sm:px-6 sm:py-7">
      <Suspense fallback={<section role="status" className="rounded-2xl border border-border bg-surface p-6 text-sm text-muted">Loading this section…</section>}>
      {activeTab === "home" && <div className="space-y-5">
        <section className="pitch-hero overflow-hidden rounded-3xl p-5 text-white shadow-2xl sm:p-8" style={{ "--destination-accent": destination.themeColors.accent }}>
          <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/75">{destination.city} · {destination.country}</p>
          <h1 className="deck-heading mt-3 max-w-3xl font-display text-4xl leading-tight sm:text-5xl">{destination.greeting}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/80">A personalised travel companion for hidden places, local stories and experiences that make a destination feel personal.</p>
          <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setActiveTab("discover")} className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold">Discover the unexpected <ArrowRight size={16}/></button><button type="button" onClick={buildPlan} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-bold text-white">Build my day</button></div>
        </section>
        <WeatherPanel destination={destination} weather={weather} loading={weatherLoading} error={weatherError} formatNumber={formatNumber}/>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="deck-heading font-serif text-2xl">A few places to begin</h2><p className="mt-1 text-xs text-muted">A changing mix of well-known landmarks and quieter corners.</p></div><button type="button" onClick={() => setActiveTab("discover")} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold">All places <ArrowRight size={14}/></button></div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">{[...destination.places].sort((a,b)=>Number(b.isHiddenGem)-Number(a.isHiddenGem)).slice(0,3).map((place)=><PlaceCard key={place.id} place={place} destination={destination} formatCurrency={formatCurrency} inPlan={planIds.has(place.id)} onAdd={addItineraryStop} onRemove={removeItineraryStop}/>)}</div><DemoNote/>
        </section>
        <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-serif text-2xl">Your plan</h2><p className="mt-1 text-xs text-muted">{formatNumber(itinerary.length, destination.locale)} places saved for this destination.</p></div><button type="button" onClick={() => setActiveTab("plan")} className="min-h-10 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white">Review plan</button></div>{itinerary.length > 0 ? <ol className="mt-3 space-y-2">{itinerary.slice(0,3).map((stop,index)=><li key={stop.id || stop.placeId} className="flex items-center gap-3 rounded-xl bg-bg p-3"><span className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{backgroundColor:destination.themeColors.accent}}>{formatNumber(index+1,destination.locale)}</span><span className="min-w-0 flex-1"><span className="block text-sm font-bold">{stop.title}</span><span className="block text-[10px] text-muted">{niceWord(stop.bestTime || "any")}</span></span><button type="button" onClick={()=>removeItineraryStop(stop.id || stop.placeId)} className="min-h-9 rounded-lg border border-border px-2 text-xs">Remove</button></li>)}</ol> : <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">Save a place from Discover or build a suggested day to start your plan.</p>}</section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><button type="button" onClick={() => setActiveTab("lens")} className="rounded-2xl border border-border bg-surface p-4 text-left hover:bg-surface-2"><Languages className="text-accent-text"/><h2 className="mt-2 font-serif text-xl">Translate what you see</h2><p className="mt-1 text-xs text-muted">Scan signs, menus and fare boards using Atithi Lens.</p></button><button type="button" onClick={() => setActiveTab("chat")} className="rounded-2xl border border-border bg-surface p-4 text-left hover:bg-surface-2"><MessageCircle className="text-accent-text"/><h2 className="mt-2 font-serif text-xl">Ask a travel question</h2><p className="mt-1 text-xs text-muted">Chat in your own language and explore ideas from this destination pack.</p></button></div>
      </div>}

      {activeTab === "discover" && <DiscoverTab
        destination={destination}
        profile={rankProfile}
        weather={weather}
        itinerary={itinerary}
        requests={requests}
        addItineraryItem={addItineraryItem}
        removeItineraryStop={removeItineraryStop}
        addRequest={addRequest}
        onShowOnMap={showOnMap}
        focusPlaceId={mapFocusId}
      />}

      {activeTab === "plan" && <PlanTab/>}

      {activeTab === "lens" && <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><LensTab onRequest={(request)=>addRequest({title:request.title,category:request.category,detail:request.detail})}/></section>}
      {activeTab === "chat" && <ChatView key={destination.id} destination={destination} weather={weather} profile={rankProfile} chatMessages={chatMessages} addChatMessage={addChatMessage} addRequest={addRequest} addItineraryItem={addItineraryItem} onShowOnMap={showOnMap} initialPrompt={chatPrefill} onPrefillConsumed={() => setChatPrefill("")}/>}
      {activeTab === "profile" && <ProfileTab destination={destination} destinations={destinations} selectDestination={selectDestination} requests={requests} formatDate={formatDate}/> }
      </Suspense>
    </div>

    <nav aria-label="Main navigation" className="bottom-nav-glass fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.4rem)] z-50 rounded-2xl px-1.5 pt-1.5 pb-1.5 sm:inset-x-1/2 sm:w-[min(46rem,calc(100%-2rem))] sm:-translate-x-1/2">
       <div className="mx-auto flex max-w-3xl items-stretch justify-around gap-0.5">{TABS.map(({id,label,Icon})=><button key={id} type="button" onClick={()=>setActiveTab(id)} aria-current={activeTab===id?"page":undefined} className={"bottom-nav-item relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 text-[9px] font-semibold sm:text-[10px] "+(activeTab===id?"text-text":"text-muted")}><span className="relative z-10 flex flex-col items-center justify-center gap-1">{activeTab===id&&<motion.span layoutId="active-nav-pill" className="nav-active-pill absolute inset-x-0 -inset-y-0.5 rounded-xl bg-brand/15 ring-1 ring-accent/20" transition={{ type:"spring", stiffness:420, damping:32 }}/>}<Icon size={18} className="relative z-10"/><span className="bottom-nav-label relative z-10 max-w-full truncate">{label}</span></span></button>)}</div>
     </nav>
  </main>;
}
