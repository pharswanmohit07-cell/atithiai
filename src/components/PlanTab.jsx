import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown, ArrowUp, CalendarDays, Check, CheckCircle2, Clock3, CloudRain,
  Compass, MapPin, RotateCcw, Share2, Sparkles, Sun, TrainFront,
  Utensils, Users, Wind, X, AlertTriangle, Route, Leaf
} from "lucide-react";
import { rankDishes, rankExperiences, rankPlaces } from "../lib/rank.js";
import { useDestination } from "../context/DestinationContext.jsx";
import { useProfile } from "../context/ProfileContext.jsx";
import { useTravelContext } from "../context/TravelContext.jsx";
import DemoControls from "./DemoControls.jsx";
import { demoFetch } from "../lib/demoCache.js";
import IconBadge from "./ui/IconBadge.jsx";

const FLOW = [
  { id: "planned", label: "Planned route" },
  { id: "weather", label: "Weather shift" },
  { id: "alternative", label: "Alternative found" },
  { id: "local", label: "Local discovery" }
];
const DAY_START = { relaxed: 570, balanced: 540, packed: 510 };
const STOP_TARGETS = { relaxed: 3, balanced: 4, packed: 6 };
const SLOT_LIMITS = { relaxed: 135, balanced: 180, packed: 150 };

function niceWord(value) {
  return String(value || "").replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
function currency(value, destination) {
  if (!Number.isFinite(Number(value))) return "—";
  try {
    return new Intl.NumberFormat(destination.locale, {
      style: "currency",
      currency: destination.currency.code,
      maximumFractionDigits: ["IDR", "JPY", "KRW", "VND", "CLP"].includes(destination.currency.code) ? 0 : 2
    }).format(Number(value));
  } catch {
    return new Intl.NumberFormat(destination.locale).format(Number(value)) + " " + destination.currency.code;
  }
}
function distanceKm(a, b) {
  const coordinates = [a?.lat, a?.lon, b?.lat, b?.lon];
  if (coordinates.some((value) => value == null || value === "" || !Number.isFinite(Number(value)))) return null;
  const rad = (value) => Number(value) * Math.PI / 180;
  const dLat = rad(Number(b.lat) - Number(a.lat));
  const dLon = rad(Number(b.lon) - Number(a.lon));
  const lat1 = rad(Number(a.lat));
  const lat2 = rad(Number(b.lat));
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
function roughMinutes(a, b) {
  const km = distanceKm(a, b);
  return km == null ? null : Math.max(0, Math.round((km / 20) * 60));
}
function clock(minutes) {
  const whole = Math.max(0, Math.round(minutes));
  const hour24 = Math.floor(whole / 60) % 24;
  const minute = whole % 60;
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return hour12 + ":" + String(minute).padStart(2, "0") + " " + suffix;
}
function packPlaceForStop(stop, destination) {
  const placeId = stop?.locationPlaceId || stop?.placeId || (stop?.itemType === "place" ? stop?.itemId : null);
  return destination.places.find((place) => place.id === placeId) || null;
}
function resolveStop(stop, destination) {
  if (!stop) return null;
  const collection = stop.itemType === "experience" ? destination.experiences : stop.itemType === "dish" ? destination.dishes : destination.places;
  return collection.find((item) => item.id === (stop.itemId || stop.placeId)) || null;
}
function stopCost(item, kind) {
  if (!item) return 0;
  if (kind === "experience") return Number(item.priceLocal) || 0;
  if (kind === "dish") {
    const range = item.priceRangeLocal;
    return Array.isArray(range) ? (Number(range[0]) + Number(range[1])) / 2 : 0;
  }
  return Number(item.avgSpendLocal) || 0;
}
function stopTitle(item, kind) {
  return kind === "experience" ? item.title : item.name;
}
function anchorPlace(destination, item, current) {
  const places = destination.places || [];
  if (!places.length) return null;
  const preferred = item?.diet ? places.filter((place) => ["market", "cafe"].includes(place.category)) : places.filter((place) => place.category === item?.category);
  const pool = preferred.length ? preferred : places;
  return [...pool].sort((a, b) => {
    const da = distanceKm(a, current);
    const db = distanceKm(b, current);
    return (da ?? 1e6) - (db ?? 1e6);
  })[0] || places[0];
}
function targetWindow(index, mealIndex, total) {
  if (index === mealIndex) return "lunch";
  if (index === total - 1) return "evening";
  if (index < mealIndex) return "morning";
  return "afternoon";
}
function toStop(item, kind, destination, windowName, currentPlace = null) {
  const anchor = kind === "place" ? item : anchorPlace(destination, item, currentPlace);
  const isDish = kind === "dish";
  return {
    id: kind + "-" + item.id,
    itemType: kind,
    itemId: item.id,
    placeId: kind === "place" ? item.id : null,
    locationPlaceId: anchor?.id || null,
    title: stopTitle(item, kind),
    note: item.localStory || item.description || "",
    bestTime: item.bestTime || windowName,
    window: windowName,
    durationMin: Math.max(10, Number(item.durationMin) || (isDish ? 45 : 60)),
    time: null,
    status: "Planned",
    estimatedCost: stopCost(item, kind),
    lat: Number.isFinite(Number(anchor?.lat)) ? Number(anchor.lat) : null,
    lon: Number.isFinite(Number(anchor?.lon)) ? Number(anchor.lon) : null,
    category: item.category || (kind === "dish" ? "food" : kind),
    score: Number(item.score) || 0,
    reasons: Array.isArray(item.reasons) ? item.reasons.slice(0, 6) : ["Selected from your destination pack"],
    ...(kind === "dish" ? { whereToEat: item.whereToEat || "Local eateries (confirm locally)" } : {})
  };
}
function scheduleStops(stops, pace) {
  let cursor = DAY_START[pace] || DAY_START.balanced;
  let previous = null;
  return stops.map((stop) => {
    const previousStop = previous;
    const travelDistance = previousStop ? distanceKm(previousStop, stop) : null;
    const travelMinutes = previousStop ? roughMinutes(previousStop, stop) : 0;
    const target = stop.window === "lunch" ? 12 * 60
      : stop.window === "afternoon" ? 13 * 60 + 30
      : stop.window === "evening" ? 17 * 60
      : pace === "packed" ? 8 * 60 + 30 : 9 * 60;
    const start = Math.max(cursor + (travelMinutes || 0), target);
    const end = start + (Number(stop.durationMin) || 45);
    previous = stop;
    cursor = end;
    return { ...stop, time: clock(start), travelMinutes, travelDistanceKm: travelDistance };
  });
}
function localAdvisory(type, affectedTitle, language) {
  const lang = String(language || "en").toLowerCase().split("-")[0];
  const content = {
    en: "Conditions may affect " + (affectedTitle || "one stop") + ". Consider the alternative below, and check local guidance before setting out. This is a planning suggestion, not a live closure or transport report.",
    hi: (affectedTitle || "एक पड़ाव") + " पर परिस्थितियों का असर हो सकता है। नीचे दिया विकल्प देखें और निकलने से पहले स्थानीय जानकारी जाँचें। यह योजना सुझाव है, लाइव बंदी या परिवहन रिपोर्ट नहीं।",
    es: "Las condiciones pueden afectar " + (affectedTitle || "una parada") + ". Considera la alternativa y consulta información local antes de salir. Es una sugerencia de planificación, no un aviso real de cierre o transporte.",
    fr: "Les conditions peuvent affecter " + (affectedTitle || "une étape") + ". Envisagez l’alternative et vérifiez les informations locales avant de partir. Ceci est un conseil de planification, pas une alerte réelle de fermeture ou de transport.",
    de: "Die Bedingungen können " + (affectedTitle || "einen Stopp") + " beeinflussen. Prüfe die Alternative und lokale Hinweise vor dem Aufbruch. Dies ist ein Planungshinweis, keine echte Sperrungs- oder Verkehrsmeldung.",
    pt: "As condições podem afetar " + (affectedTitle || "uma paragem") + ". Considere a alternativa e confirme as informações locais antes de sair. Isto é uma sugestão de planeamento, não um alerta real de encerramento ou transporte.",
    id: "Kondisi dapat memengaruhi " + (affectedTitle || "satu persinggahan") + ". Pertimbangkan alternatif di bawah dan periksa informasi lokal sebelum berangkat. Ini saran perencanaan, bukan laporan penutupan atau transportasi langsung.",
    ja: (affectedTitle || "予定の立ち寄り先") + "は状況の影響を受ける可能性があります。下の代替案を検討し、出発前に現地情報を確認してください。これは計画上の提案で、実際の閉鎖や交通情報ではありません。"
  };
  return content[lang] || content.en;
}
function categoryIcon(category) {
  if (category === "food" || category === "market" || category === "cafe") return Utensils;
  if (category === "craft") return Sparkles;
  if (category === "nature" || category === "viewpoint") return Leaf;
  if (category === "wellness") return Sun;
  if (category === "experience") return Users;
  return Compass;
}
function stopPeriod(stop) {
  return stop.window === "lunch" ? "lunch" : stop.window || "morning";
}
function sumCosts(stops) {
  return stops.reduce((sum, item) => sum + Math.max(0, Number(item.estimatedCost) || 0), 0);
}
function liveWeatherDisruption(weather, itinerary, destination) {
  if (!weather || weather.source !== "live") return null;
  let type = null;
  if (weather.kind === "storm" || Number(weather.windKmh) >= 45) type = "storm";
  else if (weather.kind === "rain" || Number(weather.precipitationMm) >= 1) type = "rain";
  else if (Number(weather.feelsLikeC ?? weather.temperatureC) >= 35) type = "heat";
  if (!type) return null;
  const affected = itinerary.filter((stop) => {
    const place = packPlaceForStop(stop, destination);
    if (!place) return false;
    return place.indoor !== true && (type !== "rain" || place.rainFriendly !== true);
  }).map((stop) => stop.id);
  if (!affected.length) return null;
  const severity = type === "storm" && Number(weather.windKmh) >= 60 || Number(weather.temperatureC) >= 39 ? "high" : "moderate";
  return {
    id: "live-" + destination.id + "-" + type + "-" + String(weather.observedAt || ""),
    type,
    affectedStopIds: affected,
    severity,
    source: "live",
    detectedAt: new Date().toISOString()
  };
}

function makeIntro(destination, itinerary, currencyCode, language = "en") {
  const lang = String(language || "en").toLowerCase().split(/[-_]/)[0];
  const names = itinerary.length ? itinerary.slice(0, 2).map((stop) => stop.title).join(" and ") : "";
  const copy = {
    en: names
      ? ["Your " + destination.city + " day is shaped around " + names + ", with a meal and time to wander.", "Costs use illustrative " + currencyCode + " estimates; travel time is a straight-line approximation, not a route or traffic prediction."]
      : ["Build a day around a few thoughtful stops, with room to pause and explore.", "All times, costs and travel estimates are approximate."],
    hi: names
      ? ["आपका " + destination.city + " का दिन " + names + " के आसपास है, जिसमें भोजन और घूमने का समय भी शामिल है।", "खर्च " + currencyCode + " में अनुमानित है; यात्रा समय सीधी दूरी पर आधारित है, सड़क मार्ग या ट्रैफिक का अनुमान नहीं।"]
      : ["कुछ सोच-समझकर चुने गए पड़ावों और आराम के समय के साथ अपना दिन बनाएँ।", "समय, खर्च और यात्रा के सभी अनुमान लगभग हैं।"],
    es: names
      ? ["Tu día en " + destination.city + " gira en torno a " + names + ", con una comida y tiempo para explorar.", "Los costes son estimaciones en " + currencyCode + "; el tiempo de viaje usa distancia en línea recta, no rutas ni tráfico."]
      : ["Organiza el día con algunas paradas interesantes y tiempo para descansar.", "Los horarios, costes y tiempos de viaje son aproximados."],
    fr: names
      ? ["Votre journée à " + destination.city + " s’organise autour de " + names + ", avec un repas et du temps pour flâner.", "Les coûts sont estimés en " + currencyCode + "; le temps de trajet utilise la distance à vol d’oiseau, pas les routes ni le trafic."]
      : ["Composez votre journée autour de quelques étapes et gardez du temps pour souffler.", "Les horaires, coûts et durées de trajet sont approximatifs."],
    de: names
      ? ["Dein Tag in " + destination.city + " dreht sich um " + names + ", mit einer Mahlzeit und Zeit zum Entdecken.", "Die Kosten sind Schätzungen in " + currencyCode + "; Reisezeiten beruhen auf Luftlinie, nicht auf Straßen oder Verkehr."]
      : ["Plane einige interessante Stopps und lass dir Zeit zum Entdecken.", "Zeit-, Kosten- und Reiseangaben sind Näherungswerte."],
    pt: names
      ? ["O seu dia em " + destination.city + " passa por " + names + ", com uma refeição e tempo para explorar.", "Os custos são estimativas em " + currencyCode + "; o tempo de viagem usa distância em linha reta, não rotas ou trânsito."]
      : ["Organize o dia com algumas paragens interessantes e tempo para descansar.", "Horários, custos e tempos de viagem são aproximados."],
    id: names
      ? ["Hari Anda di " + destination.city + " berpusat pada " + names + ", dengan waktu makan dan kesempatan menjelajah.", "Biaya adalah perkiraan dalam " + currencyCode + "; waktu perjalanan memakai jarak garis lurus, bukan rute atau lalu lintas."]
      : ["Susun hari dengan beberapa persinggahan menarik dan waktu untuk beristirahat.", "Waktu, biaya, dan perjalanan hanyalah perkiraan."],
    ja: names
      ? [destination.city + "での一日は" + names + "を中心に、食事と散策の時間も含めています。", "費用は" + currencyCode + "での概算です。移動時間は直線距離に基づき、実際の道路や交通状況を示しません。"]
      : ["気になる場所をいくつか選び、休憩や散策の時間も確保しましょう。", "時間、費用、移動時間はすべて概算です。"],
    zh: names
      ? ["您在" + destination.city + "的一天将围绕" + names + "安排，并留出用餐和自由探索的时间。", "费用以" + currencyCode + "估算；移动时间按直线距离计算，并非真实路线或交通预测。"]
      : ["选择几个值得探索的停留点，并留出休息和漫步的时间。", "时间、费用和移动时间均为估算。"],
    ar: names
      ? ["تم ترتيب يومك في " + destination.city + " حول " + names + "، مع وقت لتناول الطعام والاستكشاف.", "التكاليف تقديرية بعملة " + currencyCode + "؛ ووقت التنقل مبني على المسافة المستقيمة وليس الطرق أو حركة المرور."]
      : ["خطط ليوم يضم محطات ممتعة مع وقت للراحة والاستكشاف.", "الأوقات والتكاليف وأزمنة التنقل كلها تقديرية."]
  };
  const sentences = copy[lang] || copy.en;
  return sentences.join(" ");
}

export default function PlanTab() {
  const { destination, weather, weatherLoading, weatherError } = useDestination();
  const { profile } = useProfile();
  const {
    itinerary, setItinerary, clearItinerary,
    activeDisruption, setActiveDisruption, changeLog, addPlanLog, clearPlanLog, requests
  } = useTravelContext();
  const [phase, setPhase] = useState("planned");
  const [discoveryStory, setDiscoveryStory] = useState(null);
  const [advisory, setAdvisory] = useState("");
  const [advisoryLoading, setAdvisoryLoading] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const lastLiveKey = useRef("");
  const lastAdvisoryId = useRef("");
  const lastPhaseDisruptionId = useRef(null);
  const previousPlanStructure = useRef("");
  const isDemo = useMemo(() => {
    try { return new URLSearchParams(window.location.search).get("demo") === "1"; } catch { return false; }
  }, []);
  const budget = profile?.dailyBudget?.currencyCode === destination.currency.code
    && profile?.dailyBudget?.amount != null && profile?.dailyBudget?.amount !== ""
    && Number.isFinite(Number(profile.dailyBudget.amount))
    ? Number(profile.dailyBudget.amount)
    : null;
  const plannerProfile = useMemo(() => ({
    ...profile,
    dailyBudget: { ...(profile?.dailyBudget || {}), amount: budget }
  }), [profile, budget]);
  const pace = ["relaxed", "balanced", "packed"].includes(profile?.pace) ? profile.pace : "balanced";
  const targetCount = STOP_TARGETS[pace];
  const totalCost = useMemo(() => sumCosts(itinerary), [itinerary]);
  const generatePlan = useCallback(() => {
    const maxStops = targetCount;
    const mealIndex = Math.max(1, Math.floor(maxStops / 2) - 1);
    const experienceIndex = pace === "relaxed" ? 0 : pace === "balanced" ? 2 : 1;
    const used = new Set();
    const stops = [];
    const eligibleMeals = rankDishes(destination.dishes, plannerProfile, {
      diet: profile?.diet || "none",
      maxSpiceLevel: profile?.spiceTolerance || 2,
      timeOfDay: "afternoon"
    }, { weather, timeOfDay: "afternoon", freeMinutes: 60 });
    const mealReserve = budget == null || !eligibleMeals.length
      ? 0
      : Math.min(...eligibleMeals.map((dish) => Number(dish.priceRangeLocal?.[1])).filter(Number.isFinite));
    let spend = 0;
    let previousPlace = null;
    for (let index = 0; index < maxStops; index += 1) {
      const windowName = targetWindow(index, mealIndex, maxStops);
      const rawRemainingBudget = budget == null ? null : Math.max(0, budget - spend);
      const remainingBudget = rawRemainingBudget == null || index === mealIndex
        ? rawRemainingBudget
        : Math.max(0, rawRemainingBudget - mealReserve);
      const budgetFilter = remainingBudget == null ? {} : { maxBudgetLocal: remainingBudget };
      let chosen = null;
      let kind = "place";
      if (index === mealIndex) {
        let meals = rankDishes(destination.dishes, plannerProfile, {
          ...budgetFilter,
          diet: profile?.diet || "none",
          maxSpiceLevel: profile?.spiceTolerance || 2,
          timeOfDay: "afternoon"
        }, { weather, timeOfDay: "afternoon", freeMinutes: 60 });
        if (!meals.length) meals = rankDishes(destination.dishes, plannerProfile, {
          ...budgetFilter, diet: profile?.diet || "none", maxSpiceLevel: profile?.spiceTolerance || 2
        }, { weather, timeOfDay: "afternoon", freeMinutes: 60 });
        chosen = meals.find((item) => !used.has("dish-" + item.id) && (budget == null || stopCost(item, "dish") <= remainingBudget));
        kind = "dish";
      } else if (index === experienceIndex) {
        const experienceLimit = SLOT_LIMITS[pace];
        const experiences = rankExperiences(destination.experiences.filter((item) => item.communityLed === true), plannerProfile, {
          ...budgetFilter,
          timeOfDay: windowName === "evening" ? "evening" : windowName
        }, { weather, timeOfDay: windowName, freeMinutes: experienceLimit });
        chosen = experiences.find((item) => !used.has("experience-" + item.id) && (budget == null || stopCost(item, "experience") <= remainingBudget));
        kind = "experience";
      }
      if (!chosen) {
        const places = rankPlaces(destination.places, plannerProfile, {
          ...budgetFilter,
          avoidCrowds: profile?.avoidCrowds === true,
          timeOfDay: windowName === "lunch" ? "afternoon" : windowName
        }, { weather, timeOfDay: windowName === "lunch" ? "afternoon" : windowName, freeMinutes: SLOT_LIMITS[pace] });
        chosen = places.find((item) => !used.has("place-" + item.id) && (budget == null || stopCost(item, "place") <= remainingBudget));
        kind = "place";
      }
      if (!chosen) continue;
      const stop = toStop(chosen, kind, destination, windowName, previousPlace);
      if (kind !== "place" && !stop.locationPlaceId && previousPlace) {
        stop.lat = previousPlace.lat;
        stop.lon = previousPlace.lon;
        stop.locationPlaceId = previousPlace.id;
      }
      used.add(stop.id);
      stops.push(stop);
      spend += Math.max(0, stop.estimatedCost);
      previousPlace = kind === "place" ? chosen : destination.places.find((place) => place.id === stop.locationPlaceId) || previousPlace;
    }
    const scheduled = scheduleStops(stops, pace);
    setItinerary(scheduled);
    setActiveDisruption(null);
    setDiscoveryStory(null);
    setPhase("planned");
    setAdvisory("");
    lastLiveKey.current = "";
    lastAdvisoryId.current = "";
    addPlanLog({
      type: "plan-generated",
      message: "Generated a " + pace + " day with " + scheduled.length + " stops.",
      reason: "Rule-based ranking used profile preferences, destination weather, durations, time windows and available budget."
    });
  }, [targetCount, pace, budget, destination, profile, weather, setItinerary, setActiveDisruption, addPlanLog]);

  const currentAffectedStop = useMemo(() => {
    if (!activeDisruption?.affectedStopIds?.length) return null;
    return itinerary.find((stop) => activeDisruption.affectedStopIds.includes(stop.id) && stop.status !== "Skipped") || null;
  }, [activeDisruption, itinerary]);
  const currentAffectedPlace = currentAffectedStop ? packPlaceForStop(currentAffectedStop, destination) : null;

  useEffect(() => {
    const structure = destination.id + "|" + itinerary.map((stop) => stop.id).join("|");
    const structureChanged = previousPlanStructure.current !== structure;
    previousPlanStructure.current = structure;
    if (!itinerary.length) return;
    if (itinerary.some((stop) => !resolveStop(stop, destination))) return;
    const enriched = itinerary.map((stop) => {
      const kind = stop.itemType || "place";
      const item = resolveStop(stop, destination);
      const anchor = packPlaceForStop(stop, destination) || (kind === "place" ? item : anchorPlace(destination, item, null));
      const windowName = stop.window || (kind === "dish" ? "lunch" : ["morning", "afternoon", "evening"].includes(stop.bestTime) ? stop.bestTime : "afternoon");
      return {
        ...stop,
        itemType: kind,
        itemId: stop.itemId || stop.placeId || item.id,
        placeId: kind === "place" ? item.id : stop.placeId || null,
        locationPlaceId: anchor?.id || stop.locationPlaceId || null,
        window: windowName,
        estimatedCost: Number.isFinite(Number(stop.estimatedCost)) ? Number(stop.estimatedCost) : stopCost(item, kind),
        durationMin: Math.max(10, Number(stop.durationMin) || Number(item.durationMin) || 45),
        lat: stop.lat != null && stop.lat !== "" && Number.isFinite(Number(stop.lat)) ? Number(stop.lat) : Number.isFinite(Number(anchor?.lat)) ? Number(anchor.lat) : null,
        lon: stop.lon != null && stop.lon !== "" && Number.isFinite(Number(stop.lon)) ? Number(stop.lon) : Number.isFinite(Number(anchor?.lon)) ? Number(anchor.lon) : null,
        status: ["Planned", "Done", "Skipped"].includes(stop.status) ? stop.status : "Planned",
        reasons: Array.isArray(stop.reasons) ? stop.reasons : []
      };
    });
    const needsMetadata = enriched.some((stop, index) => !itinerary[index].time || !itinerary[index].window || (itinerary[index].lat == null && stop.lat != null) || (itinerary[index].estimatedCost == null));
    if (structureChanged || needsMetadata) setItinerary(scheduleStops(enriched, pace));
  }, [itinerary, destination.id, destination.places, destination.experiences, destination.dishes, pace, setItinerary]);

  const alternatives = useMemo(() => {
    if (!activeDisruption || !currentAffectedStop) return [];
    const originalPlace = currentAffectedPlace;
    const alreadyInPlan = new Set(itinerary.filter((stop) => stop.id !== currentAffectedStop.id).map((stop) => stop.locationPlaceId || stop.placeId || stop.itemId));
    const remainingBudget = budget == null ? null : Math.max(0, budget - totalCost + (Number(currentAffectedStop.estimatedCost) || 0));
    const budgetFilters = remainingBudget == null ? {} : { maxBudgetLocal: remainingBudget };
    const weatherIssue = ["rain", "storm", "heat"].includes(activeDisruption.type);
    const sameCategory = originalPlace ? destination.places.filter((item) => item.category === originalPlace.category) : [];
    const rankSet = (places) => rankPlaces(places, plannerProfile, {
      ...budgetFilters,
      avoidCrowds: true,
      timeOfDay: currentAffectedStop.window === "lunch" ? "afternoon" : currentAffectedStop.window,
      durationMin: currentAffectedStop.durationMin
    }, { weather, timeOfDay: currentAffectedStop.window, freeMinutes: currentAffectedStop.durationMin })
      .filter((place) => !alreadyInPlan.has(place.id) && place.id !== originalPlace?.id && (remainingBudget == null || stopCost(place, "place") <= remainingBudget));
    let candidates = rankSet(sameCategory);
    if (candidates.length < 2) candidates = rankSet(destination.places);
    if (weatherIssue) {
      const weatherFriendlyIds = new Set(candidates.filter((place) => place.indoor === true || place.rainFriendly === true).map((place) => place.id));
      candidates = candidates.map((place) => weatherFriendlyIds.has(place.id)
        ? { ...place, score: (Number(place.score) || 0) + 8, reasons: [...new Set([...(place.reasons || []), "More suitable for the current weather"])] }
        : place);
    }
    const withProximity = candidates.map((place) => {
      const km = distanceKm(originalPlace, place);
      const near = km != null && km <= 5;
      const reasons = [...(place.reasons || [])];
      reasons.unshift(near ? "Nearby alternative (rough estimate)" : "A different place in this destination pack");
      if (originalPlace && place.category === originalPlace.category) reasons.push("Similar category to the affected stop");
      return { ...place, reasons: [...new Set(reasons)], distanceKm: km, score: (Number(place.score) || 0) + (km == null ? 0 : Math.max(0, 5 - km)) };
    });
    return withProximity.sort((a, b) => b.score - a.score || (a.distanceKm ?? 999) - (b.distanceKm ?? 999)).slice(0, 2);
  }, [activeDisruption, currentAffectedStop, currentAffectedPlace, itinerary, budget, totalCost, destination, plannerProfile, weather]);

  useEffect(() => {
    const live = liveWeatherDisruption(weather, itinerary, destination);
    if (!live) {
      if (activeDisruption?.source === "live") setActiveDisruption(null);
      return;
    }
    if (lastLiveKey.current === live.id) return;
    if (activeDisruption?.source === "demo") return;
    lastLiveKey.current = live.id;
    setActiveDisruption(live);
    setPhase("weather");
    addPlanLog({
      type: "weather-shift",
      message: "Live weather may affect " + live.affectedStopIds.length + " planned stop(s).",
      reason: "Open-Meteo destination weather: " + (weather?.condition || live.type) + (Number.isFinite(Number(weather?.temperatureC)) ? ", " + Math.round(weather.temperatureC) + "°C" : "") + "."
    });
  }, [weather, itinerary, destination, activeDisruption, setActiveDisruption, addPlanLog]);

  useEffect(() => {
    if (activeDisruption) {
      if (lastPhaseDisruptionId.current !== activeDisruption.id) {
        lastPhaseDisruptionId.current = activeDisruption.id;
        setPhase("weather");
      }
    } else {
      lastPhaseDisruptionId.current = null;
      if (phase === "weather" || phase === "alternative") setPhase("planned");
    }
  }, [activeDisruption?.id, phase]);

  useEffect(() => {
    if (activeDisruption && currentAffectedStop && alternatives.length > 0) setPhase("alternative");
  }, [activeDisruption, currentAffectedStop, alternatives.length]);

  useEffect(() => {
    if (!activeDisruption || !currentAffectedStop || lastAdvisoryId.current === activeDisruption.id) return undefined;
    lastAdvisoryId.current = activeDisruption.id;
    const language = profile?.languages?.[0] || "en";
    const fallback = localAdvisory(activeDisruption.type, currentAffectedStop.title, language);
    setAdvisory(fallback);
    setAdvisoryLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 3000);
    demoFetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        mode: "advisory",
        language,
        destination: { city: destination.city, country: destination.country },
        disruption: { type: activeDisruption.type, severity: activeDisruption.severity, source: activeDisruption.source },
        affectedStop: { title: currentAffectedStop.title, category: currentAffectedStop.category },
        alternatives: alternatives.map((item) => ({ title: item.name, category: item.category, indoor: item.indoor === true, rainFriendly: item.rainFriendly === true })),
        weather: activeDisruption.source === "live" && weather?.source === "live" ? { condition: weather.condition, temperatureC: weather.temperatureC, windKmh: weather.windKmh } : null
      })
    }).then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        const text = typeof payload?.advisory === "string" ? payload.advisory.trim() : "";
        if (text && text.split(/\s+/).filter(Boolean).length <= 45 && !controller.signal.aborted) setAdvisory(text);
      })
      .catch(() => { /* The local language fallback remains visible. */ })
      .finally(() => {
        window.clearTimeout(timeout);
        setAdvisoryLoading(false);
      });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [activeDisruption?.id, currentAffectedStop?.id, profile?.languages, destination.city, destination.country, alternatives, weather]);

  const simulateDisruption = useCallback((type) => {
    if (!isDemo || !itinerary.length) return;
    const affected = itinerary.find((stop) => stop.itemType === "place" && stop.status !== "Skipped")
      || itinerary.find((stop) => stop.status !== "Skipped");
    if (!affected) return;
    const disruption = {
      id: "demo-" + type + "-" + Date.now().toString(36),
      type: ["rain", "storm", "heat", "closure", "strike"].includes(type) ? type : "closure",
      affectedStopIds: [affected.id],
      severity: type === "storm" ? "high" : "moderate",
      source: "demo",
      detectedAt: new Date().toISOString()
    };
    setActiveDisruption(disruption);
    setPhase("weather");
    setDiscoveryStory(null);
    setAdvisory("");
    addPlanLog({
      type: "demo-event",
      message: "DEMO EVENT: " + niceWord(type) + " simulated for " + affected.title + ".",
      reason: "Simulated locally for product testing; not a real-world closure or transport alert."
    });
  }, [isDemo, itinerary, setActiveDisruption, addPlanLog]);

  const acceptAlternative = (alternative) => {
    if (!currentAffectedStop) return;
    const oldTitle = currentAffectedStop.title;
    const replacement = toStop(alternative, "place", destination, currentAffectedStop.window || "afternoon", currentAffectedPlace);
    replacement.time = currentAffectedStop.time;
    replacement.status = "Planned";
    const next = scheduleStops(itinerary.map((stop) => stop.id === currentAffectedStop.id ? replacement : stop), pace);
    setItinerary(next);
    setDiscoveryStory({ title: alternative.name, story: alternative.localStory, replaced: oldTitle });
    setActiveDisruption(null);
    setPhase("local");
    setAdvisory("");
    addPlanLog({
      type: "alternative-accepted",
      message: "Swapped " + oldTitle + " for " + alternative.name + ".",
      reason: (alternative.reasons || []).slice(0, 3).join("; ") || "Matched by ranking rules for category, time, duration, weather and budget."
    });
  };

  const keepOriginal = () => {
    if (currentAffectedStop) addPlanLog({
      type: "original-kept",
      message: "Kept " + currentAffectedStop.title + " in the itinerary.",
      reason: "You dismissed the alternative. Check official local guidance before visiting."
    });
    setActiveDisruption(null);
    setAdvisory("");
    setPhase("planned");
  };

  const updateStatus = (id, status) => {
    setItinerary((current) => current.map((stop) => stop.id === id ? { ...stop, status } : stop));
    const stop = itinerary.find((item) => item.id === id);
    if (stop) addPlanLog({ type: "status", message: stop.title + " marked " + status.toLowerCase() + ".", reason: "Updated by you." });
  };
  const reorder = (index, direction) => {
    setItinerary((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return scheduleStops(next, pace);
    });
    addPlanLog({ type: "reorder", message: "Reordered an itinerary stop.", reason: "Travel-time estimates and start times were recalculated after your change." });
  };
  const resetPlan = () => {
    clearItinerary();
    setActiveDisruption(null);
    clearPlanLog();
    setPhase("planned");
    setDiscoveryStory(null);
    setAdvisory("");
    setShareMessage("");
    lastLiveKey.current = "";
    lastAdvisoryId.current = "";
  };
  const makeShareText = () => [
    "My day in " + destination.city + ", " + destination.country,
    ...itinerary.map((stop, index) => (index + 1) + ". " + (stop.time || "Time flexible") + " — " + stop.title + " (" + (stop.status || "Planned") + ")"),
    "Estimated pack-based spend: " + currency(totalCost, destination),
    "Travel times are rough straight-line estimates, not traffic or route predictions."
  ].join("\n");
  const shareDay = async () => {
    const text = makeShareText();
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "My day in " + destination.city, text });
        setShareMessage("Share sheet opened.");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Clipboard unavailable");
      }
      setShareMessage("Day summary copied to clipboard.");
    } catch {
      setShareMessage("Sharing and clipboard access are unavailable in this browser.");
    }
  };

  const weatherSummary = weather?.source === "live"
    ? (weather.condition + (Number.isFinite(Number(weather.temperatureC)) ? " · " + Math.round(weather.temperatureC) + "°C" : "") + (Number.isFinite(Number(weather.windKmh)) ? " · " + Math.round(weather.windKmh) + " km/h wind" : ""))
    : weatherLoading ? "Checking destination weather…" : "Live weather unavailable";
  const phaseIndex = FLOW.findIndex((item) => item.id === phase);
  const hasNoBudgetAmount = budget == null;

  return <section className="space-y-4">
    <header className="pitch-hero overflow-hidden rounded-3xl p-5 text-white shadow-2xl sm:p-7" style={{ "--destination-accent": destination.themeColors.accent }}>
      <div className="flex items-center gap-3"><IconBadge icon={CalendarDays} tone="gold"/><div><p className="text-xs font-extrabold uppercase tracking-[0.18em] text-white/70">Your personal plan · {destination.city}</p><h1 className="deck-heading mt-1 font-display text-4xl">A day with space to wander.</h1></div></div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/80">A rules-based day plan that adapts to your travel pace, preferences and destination weather. Nothing is booked.</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={generatePlan} className="btn-primary inline-flex min-h-11 items-center gap-2 rounded-xl px-4 py-2 text-sm font-extrabold"><Sparkles size={16}/>Plan my day</button>
        <button type="button" onClick={shareDay} disabled={!itinerary.length} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-50"><Share2 size={15}/>Share my day</button>
        <button type="button" onClick={resetPlan} disabled={!itinerary.length && !changeLog.length && !activeDisruption} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-4 py-2 text-sm font-bold disabled:opacity-50"><RotateCcw size={15}/>Reset plan</button>
      </div>
      {shareMessage && <p role="status" className="mt-3 text-xs text-white/90">{shareMessage}</p>}
    </header>

    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-serif text-2xl">Adaptive route</h2><p className="mt-1 text-xs text-muted">Plan states update as events are detected and you choose what to change.</p></div><span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-bold">Weather: {weatherSummary}</span></div>
      <ol className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{FLOW.map((item, index) => <li key={item.id} aria-current={index === phaseIndex ? "step" : undefined} className={"flex min-h-14 items-center gap-2 rounded-xl border p-3 " + (index === phaseIndex ? "border-transparent bg-brand text-white" : "border-border bg-bg text-muted")}><span className={"flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold " + (index === phaseIndex ? "bg-white/20" : "bg-surface-2")}>{index < phaseIndex ? <Check size={14}/> : index + 1}</span><span className="text-xs font-bold">{item.label}</span></li>)}</ol>
      {weatherError && <p className="mt-3 text-[10px] leading-relaxed text-muted">{weatherError} Weather-driven disruptions use only destination weather returned by Open-Meteo.</p>}
    </section>

    <DemoControls onSimulate={simulateDisruption}/>

    {activeDisruption && currentAffectedStop && <section className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 sm:p-5">
      <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300">{activeDisruption.type === "rain" ? <CloudRain size={19}/> : activeDisruption.type === "strike" ? <TrainFront size={19}/> : activeDisruption.type === "heat" ? <Sun size={19}/> : activeDisruption.type === "storm" ? <Wind size={19}/> : <AlertTriangle size={19}/>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-serif text-2xl">A stop may need a second look</h2><span className="rounded-full bg-amber-500/15 px-2 py-1 text-[10px] font-extrabold">{activeDisruption.source === "demo" ? "DEMO EVENT" : "LIVE WEATHER"}</span></div><p className="mt-1 text-sm leading-relaxed text-muted">{niceWord(activeDisruption.type)} · {niceWord(activeDisruption.severity)} · Affects: <span className="font-semibold text-text">{currentAffectedStop.title}</span></p>{advisory && <p className="mt-3 rounded-xl border border-border bg-surface p-3 text-sm leading-relaxed">{advisory}{advisoryLoading && <span className="ml-2 text-[10px] text-muted">Refining wording…</span>}</p>}<p className="mt-2 text-[10px] leading-relaxed text-muted">{activeDisruption.source === "live" ? "Based only on Open-Meteo destination weather thresholds; not a venue closure or transport report." : "Simulated for testing. No actual venue closure, road issue or transport strike is being reported."}</p></div></div>
      <div className="mt-4"><h3 className="font-serif text-xl">Two ranked alternatives</h3><p className="mt-1 text-xs text-muted">Prioritised by category, approximate proximity, duration, estimated spend and weather suitability.</p>
        {alternatives.length ? <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">{alternatives.map((item) => <article key={item.id} className="rounded-xl border border-border bg-surface p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold">{niceWord(item.category)}</span>{item.indoor && <span className="text-[10px] font-bold text-accent-text">Indoor</span>}{item.rainFriendly && <span className="text-[10px] font-bold text-accent-text">Rain-friendly</span>}</div><h4 className="mt-2 font-serif text-xl">{item.name}</h4><p className="mt-1 text-xs leading-relaxed text-muted">{item.localStory}</p><div className="mt-2 flex flex-wrap gap-1">{(item.reasons || []).slice(0,4).map((reason,index)=><span key={reason+index} className="rounded-full border border-border px-2 py-1 text-[9px] text-muted">{reason}</span>)}</div><p className="mt-2 text-xs font-bold">{currency(item.avgSpendLocal, destination)} <span className="font-normal text-muted">· estimated spend</span>{item.distanceKm != null && <span className="font-normal text-muted"> · {item.distanceKm.toFixed(1)} km rough distance</span>}</p><button type="button" onClick={() => acceptAlternative(item)} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white"><Check size={14}/>Accept alternative</button></article>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-border bg-surface p-4 text-sm text-muted">No alternative fits the current hard constraints. Keep the original and verify conditions locally, or change your budget / pace in Profile.</p>}
        <button type="button" onClick={keepOriginal} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-bold"><X size={14}/>Keep original</button>
      </div>
    </section>}

    {discoveryStory && <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5"><div className="flex items-center gap-2"><Sparkles size={17} className="text-accent-text"/><h2 className="font-serif text-2xl">A local discovery</h2></div><p className="mt-2 text-sm leading-relaxed">{discoveryStory.title} is now in your route instead of {discoveryStory.replaced}.</p><p className="mt-2 text-sm leading-relaxed text-muted">{discoveryStory.story}</p><span className="mt-3 inline-block rounded-full border border-border px-2.5 py-1 text-[10px] text-muted">Demo destination story · verify details locally</span></section>}

    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-serif text-2xl">Your day, in order</h2><p className="mt-1 text-xs text-muted">{itinerary.length} stops · {niceWord(pace)} pace · one-day estimate</p></div><span className="rounded-full bg-surface-2 px-3 py-1.5 text-xs font-extrabold">{currency(totalCost, destination)} estimated spend</span></div>
      <div className="mt-3 rounded-xl border border-border bg-bg p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-bold">Running total vs daily budget</span><span className="text-xs font-extrabold">{budget == null ? "No numeric budget set" : currency(totalCost, destination) + " / " + currency(budget, destination)}</span></div>{budget != null && <><div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-2"><div className={"h-full rounded-full " + (totalCost > budget ? "bg-rose-500" : "bg-brand")} style={{ width: Math.min(100, budget > 0 ? (totalCost / budget) * 100 : totalCost > 0 ? 100 : 0) + "%" }}/></div><p className="mt-2 text-[10px] text-muted">{totalCost > budget ? "Estimated costs exceed the budget you entered by " + currency(totalCost - budget, destination) + "." : currency(Math.max(0, budget - totalCost), destination) + " budget remaining."}</p></>}</div>
      <p className="mt-3 rounded-xl border border-border bg-bg p-3 text-sm leading-relaxed text-muted">{makeIntro(destination, itinerary, destination.currency.code, profile?.languages?.[0])}</p>
      {itinerary.length ? <ol className="mt-4 space-y-0">{itinerary.map((stop, index) => {
        const Icon = categoryIcon(stop.category);
        const disruptionAffects = activeDisruption?.affectedStopIds?.includes(stop.id);
        const status = ["Planned", "Done", "Skipped"].includes(stop.status) ? stop.status : "Planned";
        return <li key={stop.id} className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-3 pb-4 last:pb-0">
          <div className="relative flex flex-col items-center"><span className={"z-10 flex h-7 w-7 items-center justify-center rounded-full " + (status === "Done" ? "bg-emerald-600 text-white" : status === "Skipped" ? "bg-surface-2 text-muted" : "text-white")} style={status === "Planned" ? { backgroundColor: destination.themeColors.accent } : undefined}>{status === "Done" ? <Check size={14}/> : <Icon size={14}/>}</span>{index < itinerary.length - 1 && <span className="absolute top-7 bottom-0 w-px bg-border"/>}</div>
          <article className={"rounded-2xl border p-4 " + (disruptionAffects ? "border-amber-500 bg-amber-500/5 ring-1 ring-amber-500/20" : "border-border bg-bg")}>
            <div className="flex flex-wrap items-center justify-between gap-2"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 text-xs font-extrabold"><Clock3 size={13}/>{stop.time || "Time flexible"}</span><span className="rounded-full bg-surface-2 px-2 py-1 text-[9px] font-bold">{niceWord(stop.category)}</span>{disruptionAffects && <span className="rounded-full bg-amber-500/15 px-2 py-1 text-[9px] font-extrabold text-amber-700 dark:text-amber-300">Needs review</span>}</div><span className={"rounded-full px-2 py-1 text-[10px] font-bold " + (status === "Done" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : status === "Skipped" ? "bg-surface-2 text-muted" : "bg-brand/10 text-brand dark:text-accent")}>{status}</span></div>
            <h3 className="mt-2 font-serif text-2xl">{stop.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted">{stop.note}</p>
            <p className="mt-2 text-xs text-muted">{stop.durationMin} min planned · {currency(stop.estimatedCost, destination)} estimated spend</p>
            {stop.travelMinutes > 0 && <p className="mt-1 inline-flex items-center gap-1.5 text-[10px] text-muted"><Route size={12}/>{stop.travelMinutes} min travel · rough estimate{stop.travelDistanceKm != null ? " (" + stop.travelDistanceKm.toFixed(1) + " km straight-line)" : ""}</p>}
            {stop.whereToEat && <p className="mt-1 text-xs text-muted">Suggested area: {stop.whereToEat}</p>}
            {stop.reasons?.length > 0 && <div className="mt-3"><p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-[0.12em] text-muted">Why this</p><div className="flex flex-wrap gap-1.5">{stop.reasons.slice(0,5).map((reason, reasonIndex) => <span key={reason+reasonIndex} className="rounded-full border border-border px-2.5 py-1 text-[10px] text-muted">{reason}</span>)}</div></div>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => updateStatus(stop.id, status === "Done" ? "Planned" : "Done")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[10px] font-bold">{status === "Done" ? <RotateCcw size={12}/> : <CheckCircle2 size={12}/>} {status === "Done" ? "Mark planned" : "Mark done"}</button>
              <button type="button" onClick={() => updateStatus(stop.id, status === "Skipped" ? "Planned" : "Skipped")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-[10px] font-bold">{status === "Skipped" ? <RotateCcw size={12}/> : <X size={12}/>} {status === "Skipped" ? "Restore" : "Skip"}</button>
              <div className="ml-auto flex gap-1"><button type="button" disabled={index === 0} onClick={() => reorder(index, -1)} aria-label={"Move "+stop.title+" up"} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-30"><ArrowUp size={14}/></button><button type="button" disabled={index === itinerary.length - 1} onClick={() => reorder(index, 1)} aria-label={"Move "+stop.title+" down"} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface disabled:opacity-30"><ArrowDown size={14}/></button><button type="button" onClick={() => { setItinerary((current) => current.filter((item) => item.id !== stop.id)); addPlanLog({ type: "remove", message: "Removed " + stop.title + " from the plan.", reason: "Removed by you." }); }} aria-label={"Remove "+stop.title} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface"><X size={14}/></button></div>
            </div>
          </article>
        </li>;
      })}</ol> : <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center"><CalendarDaysFallback/><h3 className="mt-3 font-serif text-2xl">Your plan starts with curiosity.</h3><p className="mt-2 text-sm text-muted">Generate a one-day route, or add a place, dish or experience from Discover.</p><button type="button" onClick={generatePlan} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white"><Sparkles size={15}/>Plan my day</button></div>}
      <p className="mt-4 text-[10px] leading-relaxed text-muted">All place stories, prices and crowd levels are demo pack estimates. Travel times use straight-line distance at 20 km/h and are not road routes or traffic predictions.</p>
    </section>

    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-serif text-2xl">What changed and why</h2><p className="mt-1 text-xs text-muted">A small log of automatic suggestions and your choices.</p></div><span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold">{changeLog.length} entries</span></div>
      {changeLog.length ? <ol className="mt-3 space-y-2">{changeLog.slice(0,12).map((item) => <li key={item.id} className="rounded-xl border border-border bg-bg p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold">{item.message}</p><time className="text-[9px] text-muted">{new Date(item.createdAt).toLocaleTimeString(destination.locale, { hour: "2-digit", minute: "2-digit", timeZone: destination.timezone })}</time></div>{item.reason && <p className="mt-1 text-[10px] leading-relaxed text-muted">{item.reason}</p>}</li>)}</ol> : <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">Plan generation, detected weather shifts and your choices will appear here.</p>}
    </section>
    <section className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-serif text-2xl">My requests</h2><p className="mt-1 text-xs text-muted">Saved experience requests remain demo notes only.</p></div><span className="rounded-full border border-border px-2 py-1 text-[10px] font-bold">Demo only</span></div>
      {requests.filter((request) => request.category === "Experience request (demo)").length
        ? <div className="mt-3 space-y-2">{requests.filter((request) => request.category === "Experience request (demo)").map((request) => <article key={request.id} className="rounded-xl border border-border bg-bg p-3"><h3 className="text-sm font-bold">{request.title}</h3><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted">{request.detail}</p><time className="mt-2 block text-[10px] text-muted">{new Date(request.createdAt).toLocaleString(destination.locale, { dateStyle: "medium", timeStyle: "short", timeZone: destination.timezone })}</time></article>)}</div>
        : <p className="mt-3 rounded-xl border border-dashed border-border p-4 text-sm text-muted">No experience requests saved yet. Requests do not contact hosts or create bookings.</p>}
    </section>
      </section>;
}

function CalendarDaysFallback() {
  return <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2"><CalendarDays size={24}/></span>;
}
