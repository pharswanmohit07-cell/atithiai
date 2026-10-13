import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext.jsx";
import { useAppContext } from "./context/AppContext.jsx";
import { PLACES, getCrowd, getCrowdLevel } from "./data/places.js";
import { CORRIDOR_WAYPOINTS, DEMO_HOMESTAYS, getNearestDemoHomestays } from "./data/corridor.js";
import { CORRIDOR_ITINERARY } from "./data/guest.js";
import DemoControls from "./components/DemoControls.jsx";
import RouteMap from "./components/RouteMap.jsx";
import AltitudeSentinel from "./components/AltitudeSentinel.jsx";
import LensTab from "./components/guest/LensTab.jsx";
import RescuePass from "./components/RescuePass.jsx";
import RouteGuardCard, { ActionsTakenByAtithi } from "./components/RouteGuardCard.jsx";
import {
  ActionsTakenLog,
  BeatCrowdsPanel,
  DestinationOverview,
  GuardianCard,
  StaffRequestsPanel,
  SustainableImpactCard,
} from "./components/DisruptionGuardian.jsx";
import IconBadge from "./components/ui/IconBadge.jsx";
import ThemeToggle from "./components/ui/ThemeToggle.jsx";
import PlacesMap from "./components/PlacesMap.jsx";
import TripStoryModal from "./components/TripStoryModal.jsx";
import {
  Sun,
  CloudRain,
  Clock,
  MapPin,
  Utensils,
  Sparkles,
  MessageSquare,
  Home,
  LayoutDashboard,
  User,
  Bell,
  ChevronRight,
  Check,
  Compass,
  Coffee,
  ShieldCheck,
  Thermometer,
  Wind,
  Droplets,
  CalendarDays,
  Search,
  BedDouble,
  Bath,
  Car,
  Settings,
  CreditCard,
  ChevronLeft,
  Send,
  X,
  LogOut,
  Share2,
  ShieldAlert,
  PhoneCall,
  House,
  ScanLine,
  Download,
} from "lucide-react";

const SUNNY_ITINERARY = CORRIDOR_ITINERARY.map((item, index) => ({
  ...item,
  icon: index === 0 ? MapPin : Compass,
  type: "corridor-stop",
  status: index === 0 ? "current" : "upcoming",
  isVulnerableToWeather: true,
}));

const AI_ALTERNATIVES = [
  {
    id: "alt_1",
    title: "National Art Museum",
    desc: "Private indoor guided tour (15 mins away).",
    icon: MapPin,
    match: "98% match with 'Culture'",
  },
  {
    id: "alt_2",
    title: "Signature Ayurvedic Spa",
    desc: "60-min deep tissue massage in the wellness center.",
    icon: Sparkles,
    match: "95% match with 'Wellness'",
  },
];

const EXPERIENCES = [
  {
    id: 1,
    title: "Ayurvedic Rejuvenation",
    category: "Wellness",
    time: "Today, 5:30 PM",
    desc: "A restorative 60-minute massage with warm herbal oils in the wellness suite.",
    rating: "4.9",
    duration: "60 min",
    location: "Wellness Pavilion",
    price: "₹3,200",
    availability: "2 times available",
    img: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 2,
    title: "Chef's Tasting Menu",
    category: "Dining",
    time: "Today, 7:30 PM",
    desc: "A five-course vegetarian tasting menu featuring produce from the foothills.",
    rating: "4.8",
    duration: "2 hours",
    location: "Saffron Heritage Room",
    price: "₹2,400 / guest",
    availability: "Tables for 2 or 4",
    img: "https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 3,
    title: "Heritage Sunset Walk",
    category: "Culture",
    time: "Tomorrow, 4:45 PM",
    desc: "A private guided walk through the old town and evening food market.",
    rating: "4.9",
    duration: "90 min",
    location: "Old Town · meet in lobby",
    price: "₹1,800 / guest",
    availability: "Private guide available",
    img: "https://images.unsplash.com/photo-1599839619722-39751411ea63?q=80&w=1000&auto=format&fit=crop",
  },
  {
    id: 4,
    title: "Forest Bathing at Maldevta",
    category: "Wellness",
    time: "Tomorrow, 8:30 AM",
    desc: "A slow, guided walk through cedar shade with tea beside the river.",
    rating: "4.9",
    duration: "2 hours",
    location: "Maldevta · pickup included",
    price: "₹2,600 / guest",
    availability: "3 places remaining",
    img: "https://images.unsplash.com/photo-1448375240586-882707db888b?q=85&w=1000&auto=format&fit=crop",
  },
];

function rankPlacesForChat(query = "", hintedIds = []) {
  const hints = new Set(Array.isArray(hintedIds) ? hintedIds : []);
  const normalized = String(query).toLowerCase().replace(/[^a-z0-9\\s-]/g, " ").replace(/\\s+/g, " ").trim();
  const terms = normalized.split(" ").filter((term) => term.length > 2 && !["where", "what", "show", "give", "some", "with", "from", "near", "places", "place", "should", "could", "would", "have", "today", "please", "find", "tell", "recommend", "suggest", "visit", "explore"].includes(term));
  const synonyms = [];
  if (/quiet|calm|less crowded|avoid crowd|not busy|low crowd/.test(normalized)) synonyms.push("low-crowd");
  if (/rain|rainy|wet weather|indoor/.test(normalized)) synonyms.push("indoor", "rain-friendly");
  if (/local craft|handicraft|artisan|market|shopping/.test(normalized)) synonyms.push("local-artisan", "market");
  if (/green|eco|nature|forest|sustain/.test(normalized)) synonyms.push("eco-friendly", "nature");
  const ranked = PLACES.map((place) => {
    const searchable = [place.name, place.category, ...(place.tags || []), place.shortDesc].join(" ").toLowerCase();
    let score = hints.has(place.id) ? 1 : 0;
    for (const term of terms) {
      if (place.name.toLowerCase().includes(term)) score += 7;
      if (place.category.toLowerCase().includes(term)) score += 4;
      if ((place.tags || []).some((tag) => tag.includes(term))) score += 3;
      if (place.shortDesc.toLowerCase().includes(term)) score += 1;
    }
    for (const synonym of synonyms) if (searchable.includes(synonym)) score += 4;
    return { place, score, crowd: getCrowd(place, getVisitFlags()) };
  }).sort((a, b) => b.score - a.score || a.crowd - b.crowd || a.place.name.localeCompare(b.place.name));
  const matches = ranked.filter((item) => item.score > 1);
  if (matches.length) return matches.slice(0, 4).map((item) => item.place);
  const hinted = Array.from(hints).map((id) => PLACES.find((place) => place.id === id)).filter(Boolean);
  if (hinted.length) {
    return hinted.sort((a, b) => getCrowd(a, getVisitFlags()) - getCrowd(b, getVisitFlags())).slice(0, 4);
  }
  return ranked.sort((a, b) => a.crowd - b.crowd).slice(0, 4).map((item) => item.place);
}

function getVisitFlags() {
  const day = new Date().getDay();
  return { isWeekend: day === 0 || day === 6, isHoliday: false };
}
function getDistanceKm(first, second) {
  const radians = (value) => value * Math.PI / 180;
  const lat = radians(second.lat - first.lat);
  const lon = radians(second.lon - first.lon);
  const h = Math.sin(lat / 2) ** 2 + Math.cos(radians(first.lat)) * Math.cos(radians(second.lat)) * Math.sin(lon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function rankGuardianAlternatives(item, disruption, itinerary) {
  if (!item || !disruption) return [];
  const originalPlace = PLACES.find((place) => place.id === item.placeId);
  const originalWaypoint = CORRIDOR_WAYPOINTS.find((waypoint) => waypoint.id === item.waypointId);
  const original = originalPlace || originalWaypoint;
  if (!original) return [];

  if (originalWaypoint) {
    const currentIndex = CORRIDOR_WAYPOINTS.findIndex((waypoint) => waypoint.id === originalWaypoint.id);
    return CORRIDOR_WAYPOINTS
      .filter((waypoint, index) => index < currentIndex && !disruption.affectedPlaceIds.includes(waypoint.id))
      .map((waypoint) => ({
        ...waypoint,
        id: waypoint.id,
        shortDesc: `Pause at this earlier corridor checkpoint until current local road and weather advice confirms whether onward travel is appropriate. ${waypoint.desc}`,
        category: "corridor-checkpoint",
        tags: ["low-crowd"],
        baseCrowd: 35,
        travelMinutes: null,
        localSpendINR: 0,
        isCorridorWaypoint: true,
      }))
      .sort((first, second) => getDistanceKm(original, first) - getDistanceKm(original, second))
      .slice(0, 2);
  }

  const flags = getVisitFlags();
  const alreadyPlanned = new Set(itinerary.filter((candidate) => candidate.id !== item.id).map((candidate) => candidate.placeId).filter(Boolean));
  return PLACES.filter((place) => place.id !== original.id && !disruption.affectedPlaceIds.includes(place.id) && !alreadyPlanned.has(place.id))
    .map((place) => {
      const crowd = getCrowd(place, flags);
      const distance = getDistanceKm(original, place);
      let score = (100 - crowd) * 0.45 - Math.min(distance, 100) * 0.35;
      if (place.tags.includes("low-crowd")) score += 18;
      if (place.tags.includes("eco-friendly") || place.tags.includes("local-artisan")) score += 5;
      if (disruption.type === "rain") {
        if (place.indoor || place.tags.includes("indoor") || place.tags.includes("rain-friendly")) score += 35;
        if (place.outdoor) score -= 18;
      }
      if (disruption.type === "landslide" || disruption.type === "roadblock") {
        if (distance <= 15) score += 12;
        if (place.tags.includes("low-crowd")) score += 7;
      }
      return { ...place, crowdScore: crowd, distanceKm: distance, guardianScore: score };
    })
    .sort((first, second) => second.guardianScore - first.guardianScore).slice(0, 2);
}

const INITIAL_REQUESTS = [];

// --- MAIN APP ---
export default function AtithiAI() {
  const { user, logout } = useAuth();
  const {
    preferences, savePreferences, persona, clearPersona, updateHealthTags,
    selectedWaypoint, selectedWaypointId, setSelectedWaypointId,
    weather, weatherSource, weatherObservation, weatherLoading, weatherError,
    manualRainOverride, toggleManualRainOverride,
    disruptions, simulateLandslide, clearDemoEvents,
    updateRescuePassAltitude, rescuePassContext,
  } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const isDemoMode = new URLSearchParams(location.search).get("demo") === "1";
  const [appMode, setAppMode] = useState(location.pathname === "/admin" ? "admin" : "guest");
  const [actionsLog, setActionsLog] = useState([]);
  const [routeActions, setRouteActions] = useState([]);
  const [detourVillage, setDetourVillage] = useState(null);
  const [reroutesAccepted, setReroutesAccepted] = useState(0);
  const [routeSpendINR, setRouteSpendINR] = useState(0);
  const [crowdSelectionIds, setCrowdSelectionIds] = useState([]);
  const [itinerary, setItinerary] = useState(SUNNY_ITINERARY);
  const [showAIIntervention, setShowAIIntervention] = useState(false);
  const [isResolving, setIsResolving] = useState(false);
  const [activeGuestTab, setActiveGuestTab] = useState("home");
  const [isDemoControlsOpen, setIsDemoControlsOpen] = useState(true);
  const [requests, setRequests] = useState(() =>
    INITIAL_REQUESTS,
  );
  const rescuePassRef = useRef(null);
  const rescuePassActions = useMemo(() => {
    const timestampFromId = (action) => {
      const match = String(action?.id || "").match(/(\\d{10,})/);
      return match ? Number(match[1]) : 0;
    };
    return [...routeActions, ...actionsLog]
      .sort((first, second) => timestampFromId(second) - timestampFromId(first))
      .slice(0, 4);
  }, [routeActions, actionsLog]);

  useEffect(() => {
    if (!isDemoMode) return undefined;
    const handleRescuePassHotkey = (event) => {
      if (event.altKey && event.key.toLowerCase() === "p") {
        event.preventDefault();
        rescuePassRef.current?.openPreview();
      }
    };
    window.addEventListener("keydown", handleRescuePassHotkey);
    return () => window.removeEventListener("keydown", handleRescuePassHotkey);
  }, [isDemoMode]);

  const simulateAscent = () => {
    const index = CORRIDOR_WAYPOINTS.findIndex((waypoint) => waypoint.id === selectedWaypointId);
    const next = CORRIDOR_WAYPOINTS[(Math.max(0, index) + 1) % CORRIDOR_WAYPOINTS.length];
    if (next) setSelectedWaypointId(next.id);
  };

  useEffect(() => {
    const applyPlan = (event) => {
      const plan = Array.isArray(event.detail) ? event.detail : [];
      const nextItinerary = plan.map((item, index) => {
        const place = PLACES.find((candidate) => candidate.id === item.placeId);
        const tags = Array.isArray(item.tags) ? item.tags : [];
        const dining = tags.includes("food") || tags.includes("dining") || place?.category === "food";
        return {
          id: `personalized-${Date.now()}-${index}`,
          time: item.time,
          title: place?.name || item.title,
          desc: item.desc || place?.description || "A thoughtfully selected experience for your day.",
          location: place?.location || "Corridor waypoint",
          icon: dining ? Utensils : tags.includes("nature") ? MapPin : Compass,
          type: dining ? "dining" : "activity",
          status: index === 0 ? "current" : "upcoming",
          isVulnerableToWeather: Boolean(place?.outdoor),
          placeId: item.placeId,
        };
      });
      if (nextItinerary.length) {
        setItinerary(nextItinerary);
        setActiveGuestTab("home");
      }
    };
    window.addEventListener("atithi:plan-accepted", applyPlan);
    return () => window.removeEventListener("atithi:plan-accepted", applyPlan);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("atithi:weather", { detail: weather }));
  }, [weather]);

  useEffect(() => {
    if (!isDemoMode) return undefined;
    const handleDemoHotkey = (event) => {
      if (event.altKey && event.key.toLowerCase() === "r") {
        event.preventDefault();
        simulateLandslide();
      }
    };
    window.addEventListener("keydown", handleDemoHotkey);
    return () => window.removeEventListener("keydown", handleDemoHotkey);
  }, [isDemoMode, simulateLandslide]);

  const addPlaceToItinerary = (place, redirectedFrom = null) => {
    setItinerary((current) => {
      if (current.some((item) => item.placeId === place.id)) return current;
      return [...current, {
        id: `discover-${place.id}-${Date.now()}`,
        time: current.length >= 6 ? "Later today" : ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM", "07:00 PM", "Later today"][current.length],
        title: place.name, desc: place.shortDesc, location: place.name,
        icon: place.category === "market" ? Compass : MapPin, type: "activity",
        status: "upcoming", placeId: place.id, isVulnerableToWeather: Boolean(place.outdoor),
      }];
    });
    setCrowdSelectionIds((current) => current.includes(place.id) ? current : [...current, place.id]);
    if (redirectedFrom) {
      setActionsLog((current) => [{
        id: `crowd-redirect-${Date.now()}`, title: `Beat the crowds: ${place.name} added`,
        detail: `Suggested instead of high-crowd ${redirectedFrom.name}; ₹${place.localSpendINR} local spend · estimated.`,
        time: "Just now", source: "guardian", kind: "redirection", localSpendINR: place.localSpendINR,
      }, ...current]);
    } else {
      setActionsLog((current) => [{
        id: `place-add-${Date.now()}`, title: `${place.name} added to your day`,
        detail: `₹${place.localSpendINR} local spend · estimated.`, time: "Just now",
        source: "guardian", kind: "selection",
      }, ...current]);
    }
  };

  const acceptGuardianAlternative = (itineraryItem, place, disruption) => {
    setItinerary((current) => current.map((item) => item.id === itineraryItem.id ? {
      ...item,
      title: place.isCorridorWaypoint ? `Pause at ${place.name}` : place.name,
      desc: place.shortDesc,
      location: place.name,
      placeId: place.isCorridorWaypoint ? undefined : place.id,
      waypointId: place.isCorridorWaypoint ? place.id : undefined,
      lat: place.lat,
      lon: place.lon,
      elevationM: place.elevationM,
      icon: place.category === "market" ? Compass : MapPin,
      isVulnerableToWeather: place.isCorridorWaypoint ? false : Boolean(place.outdoor),
      aiAdjusted: true, guardianAdjusted: true,
    } : item));
    addRequest({
      title: `Notify transport lead: review onward plan at ${place.name}`, category: "Trip Guardian",
      detail: `Accepted safety checkpoint for ${itineraryItem.title}; check current local road and weather advisories before moving.`,
    });
    addRequest({
      title: "Local support: review onward timing", category: "Trip Guardian",
      detail: `Itinerary timing requires a review after the ${disruption.type} disruption near ${itineraryItem.title}.`,
    });
    setCrowdSelectionIds((current) => place.isCorridorWaypoint || current.includes(place.id) ? current : [...current, place.id]);
    const now = Date.now();
    setActionsLog((current) => [
      { id: `timing-action-${now}`, title: "Onward timing review requested", detail: "Local support request created to review the next safe travel decision.", time: "Just now", source: disruption.source, kind: "staff-action" },
      { id: `transport-action-${now+1}`, title: `Transport review requested · ${place.name}`, detail: "Review local access, route advisories and onward timing before movement.", time: "Just now", source: disruption.source, kind: "staff-action" },
      { id: `redirect-${now+2}`, title: place.isCorridorWaypoint ? `Corridor hold point selected · ${place.name}` : `Itinerary rerouted: ${itineraryItem.title} → ${place.name}`, detail: place.isCorridorWaypoint ? `${disruption.title}. Pause point only; confirm current instructions from local authorities before moving.` : `${disruption.title}. ₹${place.localSpendINR} local spend at the alternative · estimated.`, time: "Just now", source: disruption.source, kind: place.isCorridorWaypoint ? "safety-action" : "redirection", localSpendINR: place.isCorridorWaypoint ? 0 : place.localSpendINR },
      ...current,
    ]);
  };

  const handleSwitchPersona = () => {
    logout();
    clearPersona();
    navigate("/", { replace: true });
  };
  const handleLogout = handleSwitchPersona;

  const addRequest = (request) => {
    setRequests((current) => [
      {
        id: Date.now(),
        title: request.title,
        category: request.category,
        detail: String(request.detail || "Safety report").includes("Corridor:")
          ? request.detail
          : `${request.detail || "Safety report"} · Corridor: ${selectedWaypoint?.name || "Selected route"}`,
        status: "Received",
        time: "Today, just now",
      },
      ...current,
    ]);
  };

  const handleClearRouteGuardDemo = () => {
    clearDemoEvents();
    setDetourVillage(null);
    setRouteActions([]);
    setReroutesAccepted(0);
    setRouteSpendINR(0);
    setItinerary(SUNNY_ITINERARY);
    setActionsLog((current) => current.filter((action) =>
      !String(action.id).startsWith("route-redirect-")
      && !String(action.id).startsWith("route-wait-")
    ));
  };

  useEffect(() => {
    if (
      weather === "rainy" &&
      itinerary.some((item) => item.isVulnerableToWeather)
    ) {
      setTimeout(() => setShowAIIntervention(true), 600);
    } else {
      setShowAIIntervention(false);
    }
  }, [weather, itinerary]);

  const acceptAlternative = (alt) => {
    setIsResolving(true);
    setTimeout(() => {
      setItinerary((prev) =>
        prev.map((item) =>
          item.time === "04:00 PM"
            ? {
                ...item,
                title: alt.title,
                desc: alt.desc,
                isVulnerableToWeather: false,
                icon: alt.icon,
                aiAdjusted: true,
              }
            : item,
        ),
      );
      setShowAIIntervention(false);
      setIsResolving(false);
    }, 1200);
  };

  const keepOriginal = () => { setShowAIIntervention(false); };
  const currentWaypointIndex = CORRIDOR_WAYPOINTS.findIndex((waypoint) => waypoint.id === selectedWaypointId);
  const routeSegment = currentWaypointIndex >= 0 && currentWaypointIndex < CORRIDOR_WAYPOINTS.length - 1
    ? [CORRIDOR_WAYPOINTS[currentWaypointIndex].id, CORRIDOR_WAYPOINTS[currentWaypointIndex + 1].id]
    : [CORRIDOR_WAYPOINTS[CORRIDOR_WAYPOINTS.length - 2].id, CORRIDOR_WAYPOINTS[CORRIDOR_WAYPOINTS.length - 1].id];
  const routeGuardDisruption = disruptions.find((item) =>
    item.source === "demo" && item.segment?.[0] === routeSegment[0] && item.segment?.[1] === routeSegment[1]
  ) || disruptions.find((item) =>
    item.segment?.[0] === routeSegment[0] && item.segment?.[1] === routeSegment[1]
  ) || null;
  const nearestSafeVillages = useMemo(
    () => getNearestDemoHomestays(selectedWaypoint, persona?.id, 2),
    [selectedWaypoint, persona?.id],
  );
  const affectedStop = itinerary.find((item) => item.waypointId === routeSegment[0]) || null;
  const guardianDisruption = routeGuardDisruption;
  const guardianAlternatives = nearestSafeVillages;

  const handleRouteReroute = (village, disruption) => {
    if (!village || !disruption) return;
    const targetWaypointId = disruption.segment?.[0] || selectedWaypointId;
    setDetourVillage(village);
    setItinerary((current) => current.map((item) => item.waypointId === targetWaypointId ? {
      ...item,
      title: "Pause near " + village.name,
      desc: "Route Guard selected this illustrative village area as a possible pause point. Verify access and current conditions locally; this is not a booked stay or a confirmed road route.",
      location: village.name,
      waypointId: undefined,
      placeId: undefined,
      villageId: village.id,
      lat: village.lat,
      lon: village.lon,
      elevationM: village.elevationM,
      isVulnerableToWeather: false,
      guardianAdjusted: true,
      routeDetour: true,
    } : item));
    const now = Date.now();
    const timestamp = new Date(now).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    const actions = [
      {
        id: "route-driver-" + now,
        title: "Driver notified: pickup moved",
        detail: "Simulated notification only; no driver was contacted. Suggested meeting point: " + village.name + " (Demo listing).",
        status: "Sent (demo)", timestamp, source: "demo",
      },
      {
        id: "route-village-" + (now + 1),
        title: "Homestay alerted: 2 guests arriving",
        detail: "Simulated notification only; no host or property was contacted. This is an illustrative village area, not a bookable listing.",
        status: "Sent (demo)", timestamp, source: "demo",
      },
      {
        id: "route-emergency-" + (now + 2),
        title: "Emergency contact notified",
        detail: "Simulated notification only; no emergency contact or service was contacted. Call 112 for immediate danger.",
        status: "Sent (demo)", timestamp, source: "demo",
      },
    ];
    setRouteActions((current) => [...actions, ...current]);
    setReroutesAccepted((current) => current + 1);
    setRouteSpendINR((current) => current + Number(village.localSpendINR || 0));
    setActionsLog((current) => [{
      id: "route-redirect-" + now,
      title: "Route Guard detour suggested · " + village.name,
      detail: "Demo reroute accepted. " + village.distanceKm + " km straight-line distance; travel time is estimated at 25 km/h, not a road route.",
      time: timestamp, source: "demo", kind: "redirection", localSpendINR: Number(village.localSpendINR || 0),
    }, ...current]);
  };

  const handleKeepWaiting = (disruption) => {
    const timestamp = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    setActionsLog((current) => [{
      id: "route-wait-" + Date.now(),
      title: "Waiting at " + (selectedWaypoint?.name || "current waypoint"),
      detail: disruption.source === "demo" ? "DEMO EVENT: Waiting selected. Check current local authority guidance before proceeding." : "Waiting selected. Check current local authority guidance before proceeding.",
      time: timestamp, source: disruption.source, kind: "safety-action",
    }, ...current]);
  };
  const flags = getVisitFlags();
  const lowCrowdContext = PLACES.map((place) => ({
    id: place.id, name: place.name, category: place.category, tags: place.tags,
    lat: place.lat, lon: place.lon, travelMinutes: place.travelMinutes,
    localSpendINR: place.localSpendINR, crowdEstimate: getCrowd(place, flags), shortDesc: place.shortDesc,
  })).sort((first, second) => first.crowdEstimate - second.crowdEstimate).slice(0, 5);
  const redirectionsCount = actionsLog.filter((action) => action.kind === "redirection").length;
  const localSpendRedirected = actionsLog.filter((action) => action.kind === "redirection").reduce((sum, action) => sum + Number(action.localSpendINR || 0), 0) + routeSpendINR;
  const isWeekend = flags.isWeekend;

  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-accent selection:text-text">
      {appMode === "guest" ? (
        <GuestApp
          guest={user}
          persona={persona}
          onUpdateHealthTags={updateHealthTags}
          onSwitchPersona={handleSwitchPersona}
          selectedWaypoint={selectedWaypoint}
          selectedWaypointId={selectedWaypointId}
          setSelectedWaypointId={setSelectedWaypointId}
          weatherObservation={weatherObservation}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          disruptions={disruptions}
          routeGuardDisruption={routeGuardDisruption}
          nearestSafeVillages={nearestSafeVillages}
          routeSegment={routeSegment}
          detourVillage={detourVillage}
          routeActions={routeActions}
          onRouteReroute={handleRouteReroute}
          onKeepWaiting={handleKeepWaiting}
          onAltitudeAdvisoryChange={updateRescuePassAltitude}
          onExportRescuePass={() => rescuePassRef.current?.exportPass()}
          onPreviewRescuePass={() => rescuePassRef.current?.openPreview()}
          lowCrowdPlaces={lowCrowdContext}
          actionsLog={actionsLog}
          crowdSelectionIds={crowdSelectionIds}
          isWeekend={isWeekend}
          guardianDisruption={guardianDisruption}
          affectedStop={affectedStop}
          guardianAlternatives={guardianAlternatives}
          onAcceptGuardianAlternative={acceptGuardianAlternative}
          onAddPlaceToItinerary={addPlaceToItinerary}
          preferences={preferences}
          onSavePreferences={savePreferences}
          onOpenOnboarding={() => window.dispatchEvent(new Event("atithi:reopen-onboarding"))}
          weather={weather}
          weatherSource={weatherSource}
          itinerary={itinerary}
          showAIIntervention={showAIIntervention}
          isResolving={isResolving}
          acceptAlternative={acceptAlternative}
          keepOriginal={keepOriginal}
          activeTab={activeGuestTab}
          setActiveTab={setActiveGuestTab}
          requests={requests}
          addRequest={addRequest}
        />
      ) : (
        <AdminDashboard
          persona={persona}
          onSwitchPersona={handleSwitchPersona}
          selectedWaypoint={selectedWaypoint}
          selectedWaypointId={selectedWaypointId}
          setSelectedWaypointId={setSelectedWaypointId}
          weatherObservation={weatherObservation}
          weatherLoading={weatherLoading}
          weatherError={weatherError}
          disruptions={disruptions}
          routeGuardDisruption={routeGuardDisruption}
          nearestSafeVillages={nearestSafeVillages}
          routeSegment={routeSegment}
          detourVillage={detourVillage}
          routeActions={routeActions}
          affectedTravelers={disruptions.length > 0 ? 1 : 0}
          reroutesAccepted={reroutesAccepted}
          onRouteReroute={handleRouteReroute}
          onKeepWaiting={handleKeepWaiting}
          actionsLog={actionsLog}
          redirectionsCount={redirectionsCount + reroutesAccepted}
          localSpendRedirected={localSpendRedirected}
          guardianDisruption={guardianDisruption}
          affectedStop={affectedStop}
          guardianAlternatives={guardianAlternatives}
          onAcceptGuardianAlternative={acceptGuardianAlternative}
          requests={requests}
          weather={weather}
          weatherSource={weatherSource}
          itinerary={itinerary}
          showAIIntervention={showAIIntervention}
          staffUser={user}
        />
      )}

      <RescuePass
        ref={rescuePassRef}
        traveler={user}
        persona={persona}
        tripItinerary={itinerary}
        currentWaypoint={selectedWaypoint}
        altitudeAdvisoryLevel={rescuePassContext?.altitudeLevel}
        healthTags={persona?.healthTags || []}
        actions={rescuePassActions}
      />

      {isDemoMode && (
        <DemoControls
          appMode={appMode}
          setAppMode={setAppMode}
          weather={weather}
          isOpen={isDemoControlsOpen}
          setIsOpen={setIsDemoControlsOpen}
          isRainOverride={manualRainOverride}
          onToggleWeather={toggleManualRainOverride}
          onSimulateLandslide={simulateLandslide}
          onSimulateAscent={simulateAscent}
          selectedWaypoint={selectedWaypoint}
          onClearDemoEvents={handleClearRouteGuardDemo}
        />
      )}
    </div>
  );
}

// --- GUEST APP CONTAINER ---
function GuestApp(props) {
  const { activeTab, setActiveTab } = props;

  const tabVariants = {
    hidden: { opacity: 0, y: 10, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: { opacity: 0, y: -10, scale: 0.98, transition: { duration: 0.2 } },
  };

  return (
    <div className="flex justify-center min-h-screen bg-bg p-0 md:p-8">
      <div className="w-full max-w-[430px] bg-bg md:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative h-[100dvh] md:h-[850px] border-[8px] border-brand">
        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto pb-28 scrollbar-hide">
          <AnimatePresence mode="wait">
            {activeTab === "home" && (
              <motion.div
                key="home"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <HomeTab {...props} />
              </motion.div>
            )}
            {activeTab === "discover" && (
              <motion.div
                key="discover"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <DiscoverTab onRequest={props.addRequest} onAddPlace={props.onAddPlaceToItinerary} crowdSelectionIds={props.crowdSelectionIds} isWeekend={props.isWeekend} setSelectedWaypointId={props.setSelectedWaypointId} />
              </motion.div>
            )}
            {activeTab === "ai" && (
              <motion.div
                key="ai"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <AITab
                  onRequest={props.addRequest}
                  guest={props.guest}
                  preferences={props.preferences}
                  weather={props.weather}
                  disruptions={props.disruptions}
                  lowCrowdPlaces={props.lowCrowdPlaces}
                  selectedWaypoint={props.selectedWaypoint}
                  weatherObservation={props.weatherObservation}
                  crowdSelectionIds={props.crowdSelectionIds}
                  onAddPlaceToItinerary={props.onAddPlaceToItinerary}
                />
              </motion.div>
            )}
            {activeTab === "services" && (
              <motion.div
                key="services"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <ServicesTab
                  persona={props.persona}
                  requests={props.requests}
                  onRequest={props.addRequest}
                  setActiveTab={setActiveTab}
                  selectedWaypoint={props.selectedWaypoint}
                  onExportRescuePass={props.onExportRescuePass}
                  onPreviewRescuePass={props.onPreviewRescuePass}
                />
              </motion.div>
            )}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                variants={tabVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="h-full"
              >
                <ProfileTab guest={props.guest} persona={props.persona} onUpdateHealthTags={props.onUpdateHealthTags} onSwitchPersona={props.onSwitchPersona} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 left-0 right-0 bg-surface/90 backdrop-blur-xl border-t border-border px-6 py-4 flex justify-between items-center z-40 pb-safe">
          <NavIcon
            icon={Home}
            label="Home"
            active={activeTab === "home"}
            onClick={() => setActiveTab("home")}
          />
          <NavIcon
            icon={Compass}
            label="Discover"
            active={activeTab === "discover"}
            onClick={() => setActiveTab("discover")}
          />

          <div className="relative -top-6">
            <button
              onClick={() => setActiveTab("ai")}
              className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform ${activeTab === "ai" ? "bg-brand text-white shadow-brand/30" : "bg-surface text-accent-text shadow-black/10"}`}
            >
              <motion.div whileTap={{ scale: 0.9 }} animate={activeTab === "ai" ? { y: [0, -3, 0] } : { y: 0 }} transition={{ duration: 0.28 }}>
                <IconBadge icon={Sparkles} tone="violet" size="md" className="!h-12 !w-12 rounded-full" />
              </motion.div>
            </button>
          </div>

          <NavIcon
            icon={Bell}
            label="Services"
            active={activeTab === "services"}
            onClick={() => setActiveTab("services")}
          />
          <NavIcon
            icon={User}
            label="Profile"
            active={activeTab === "profile"}
            onClick={() => setActiveTab("profile")}
          />
        </div>
      </div>
    </div>
  );
}

// --- TAB COMPONENTS ---

function HomeTab({
  guest, persona, preferences, weather, weatherSource, selectedWaypoint, selectedWaypointId, setSelectedWaypointId, weatherObservation, weatherLoading, weatherError,
  disruptions = [], actionsLog = [], routeGuardDisruption, nearestSafeVillages = [], routeSegment = [], detourVillage, routeActions = [], onRouteReroute, onKeepWaiting,
  onAltitudeAdvisoryChange,
  guardianDisruption, affectedStop, guardianAlternatives = [], onAcceptGuardianAlternative, crowdSelectionIds = [],
  itinerary, showAIIntervention, isResolving, acceptAlternative, keepOriginal, addRequest, setActiveTab,
  onExportRescuePass, onPreviewRescuePass,
}) {
  const [tripStoryOpen, setTripStoryOpen] = useState(false);
  const currentPlan = itinerary.find((item) => item.status === "current");
  return (
    <>
      <div className="home-hero relative min-h-[330px] overflow-hidden bg-[#20362E] text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?q=85&w=1200&auto=format&fit=crop')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#13231E]/55 via-[#13231E]/15 to-[#13231E]/90" />
        <div className="relative flex min-h-[330px] flex-col justify-between px-6 pb-5 pt-11">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">
                CHAR DHAM-STYLE CORRIDOR
              </p>
              <p className="mt-1 text-xs text-white/85">
                {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle compact />
              <button
                onClick={() => setActiveTab("profile")}
                aria-label="Open profile"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-surface/10 text-white backdrop-blur"
              >
                <IconBadge icon={User} tone="sky" size="sm" className="!h-9 !w-9 rounded-full border border-white/30" />
              </button>
            </div>
          </div>
          <div>
            <p className="mb-1 text-sm font-medium text-[#F0D6AD]">
              A safer way through the Himalayas
            </p>
            <h1 className="max-w-[290px] font-serif text-[42px] leading-[0.93]">
              Good morning,
              <br />
              <span className="italic">{guest?.name?.split(" ")[0] || "Guest"}.</span>
            </h1>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[10px] font-medium backdrop-blur">
                {persona?.age ? `Age ${persona.age} · ${persona.ageGroup}` : "Regional safety overview"}
              </span>
              <span className="flex items-center gap-1.5 rounded-full border border-white/25 bg-black/20 px-3 py-1.5 text-[10px] font-medium backdrop-blur">
                {weather === "sunny" ? (
                  <IconBadge icon={Sun} tone="saffron" size="sm" className="!h-7 !w-7 rounded-full" />
                ) : (
                  <IconBadge icon={CloudRain} tone="sky" size="sm" className="!h-7 !w-7 rounded-full" />
                )}
                {weatherObservation ? `${weatherObservation.temperatureC}°C · ${weatherObservation.condition}` : weatherLoading ? "Checking live weather…" : weather === "sunny" ? "Weather unavailable" : "Rain override"}{" "}
                <span className="text-white/60">{selectedWaypoint?.name || "Rudraprayag"}{weatherSource === "demo" ? " · demo override" : ""}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 space-y-6 sm:px-6">
        <section className="mb-1 rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-text">Open-Meteo · Current conditions</p><h2 className="mt-1 font-serif text-xl text-text">{selectedWaypoint?.name || "Rudraprayag"}</h2><p className="mt-1 text-[10px] text-muted">Approx. {selectedWaypoint?.elevationM ?? 895} m · coordinates/elevation are approximate</p></div>
            <span className="rounded-full bg-surface-2 px-2 py-1 text-[9px] font-semibold text-muted">{weatherLoading ? "Updating…" : weatherSource === "demo" ? "Manual rain override" : "Live signal"}</span>
          </div>
          <label className="mt-3 block text-[10px] font-semibold text-muted">Select corridor waypoint
            <select value={selectedWaypointId} onChange={(event) => setSelectedWaypointId(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-border bg-bg px-3 py-3 text-sm font-medium text-text">
              {CORRIDOR_WAYPOINTS.map((waypoint) => <option key={waypoint.id} value={waypoint.id}>{waypoint.name} · approx. {waypoint.elevationM} m</option>)}
            </select>
          </label>
          {weatherObservation && <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[9px] text-muted">Temperature</p><p className="mt-1 text-sm font-bold text-text">{weatherObservation.temperatureC}°C</p><p className="text-[9px] text-muted">Feels {weatherObservation.apparentTemperatureC ?? "—"}°C</p></div>
            <div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[9px] text-muted">Rainfall</p><p className="mt-1 text-sm font-bold text-text">{weatherObservation.rainMm.toFixed(1)} mm</p><p className="text-[9px] text-muted">Current</p></div>
            <div className="rounded-xl bg-surface-2 p-2.5"><p className="text-[9px] text-muted">Wind</p><p className="mt-1 text-sm font-bold text-text">{weatherObservation.windSpeedKmh ?? "—"}</p><p className="text-[9px] text-muted">km/h</p></div>
          </div>}
          {weatherError && <p role="status" className="mt-3 text-xs text-amber-700 dark:text-amber-300">{weatherError}</p>}
          <p className="mt-3 text-[9px] leading-relaxed text-muted">Weather data informs planning but cannot confirm road access, landslides or safe travel. Check current local authority advice.</p>
        </section>

        <AltitudeSentinel
          persona={persona}
          itinerary={itinerary}
          selectedWaypoint={selectedWaypoint}
          selectedWaypointId={selectedWaypointId}
          setSelectedWaypointId={setSelectedWaypointId}
          onAdvisoryChange={onAltitudeAdvisoryChange}
        />

        <RouteMap
          selectedWaypointId={selectedWaypointId}
          setSelectedWaypointId={setSelectedWaypointId}
          disruptions={disruptions}
          detourVillage={detourVillage}
          height={340}
        />

        {routeGuardDisruption && (
          <motion.div
            role="alert"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: [1, 0.55, 1] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
            className="flex items-start gap-3 rounded-2xl border border-amber-400 bg-amber-50 p-4 shadow-sm dark:border-amber-800 dark:bg-amber-950/30"
          >
            <ShieldAlert size={20} className="mt-0.5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-900 dark:text-amber-200">Route Guard · Next segment flagged</p>{routeGuardDisruption.source === "demo" && <span className="rounded-full bg-rose-100 px-2 py-1 text-[9px] font-extrabold text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">DEMO EVENT</span>}</div>
              <p className="mt-1 text-sm font-semibold text-text">{CORRIDOR_WAYPOINTS.find((waypoint) => waypoint.id === routeSegment[0])?.name} → {CORRIDOR_WAYPOINTS.find((waypoint) => waypoint.id === routeSegment[1])?.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted">This segment is highlighted for review. Pause and confirm conditions with current local authority guidance; the demo cannot verify road status.</p>
            </div>
          </motion.div>
        )}

        {routeGuardDisruption && (
          <RouteGuardCard
            disruption={routeGuardDisruption}
            currentWaypoint={selectedWaypoint}
            nearestSafe={nearestSafeVillages}
            persona={persona}
            onReroute={onRouteReroute}
            onKeepWaiting={onKeepWaiting}
            detourVillage={detourVillage}
          />
        )}
        <ActionsTakenByAtithi actions={routeActions} />

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent-text"><ShieldCheck size={19}/></span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-accent-text">Offline Rescue Pass</p>
              <h2 className="mt-1 font-serif text-xl text-text">Keep your trip details handy.</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">Export a travel summary with waypoint, altitude advisory, demo health tags and recent Atithi actions.</p>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={onExportRescuePass} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand px-3 py-3 text-xs font-bold text-white"><Download size={15}/> Export Rescue Pass</button>
            <button type="button" onClick={onPreviewRescuePass} className="rounded-xl border border-border bg-surface-2 px-3 py-3 text-xs font-semibold text-text">Preview</button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">Works offline after export. Save this image to your gallery; it needs no internet.</p>
        </section>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => setActiveTab("services")}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left shadow-sm"
          >
            <span>
              <span className="block text-[10px] uppercase tracking-wide text-accent-text">
                Travel support
              </span>
              <span className="mt-1 block text-xs font-semibold text-text">
                Report a hazard
              </span>
            </span>
            <IconBadge icon={ShieldAlert} tone="coral" size="sm" />
          </button>
          <button
            onClick={() => setActiveTab("ai")}
            className="flex items-center justify-between rounded-xl border border-border bg-surface px-3.5 py-3 text-left shadow-sm"
          >
            <span>
              <span className="block text-[10px] uppercase tracking-wide text-accent-text">
                Trip Guardian
              </span>
              <span className="mt-1 block text-xs font-semibold text-text">
                Ask about the route
              </span>
            </span>
            <IconBadge icon={Sparkles} tone="violet" size="sm" />
          </button>
        </div>
        <AnimatePresence mode="popLayout">
          {!showAIIntervention && !isResolving && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface rounded-2xl p-5 shadow-sm border border-border"
            >
              <div className="flex gap-3">
                <Sparkles
                  size={20}
                  className="text-accent-text shrink-0 mt-0.5"
                />
                <div>
                  <p className="text-text leading-relaxed">
                    {weather === "sunny"
                      ? "Atithi is watching for route changes and helping you discover quieter local places."
                      : "Weather has shifted. Check the Guardian suggestions before leaving for an outdoor stop."}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        
        <ActionsTakenLog actions={actionsLog} compact />

        {currentPlan && (
          <section className="overflow-hidden rounded-2xl bg-brand text-white shadow-[0_14px_28px_rgba(31,48,40,0.14)]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <span className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#E7C99C]">
                <IconBadge icon={Clock} tone="teal" size="sm" className="!h-7 !w-7" /> Next up
              </span>
              <span className="rounded-full bg-surface/10 px-2.5 py-1 text-[10px] font-semibold">
                {currentPlan.time}
              </span>
            </div>
            <div className="p-4">
              <p className="text-[10px] uppercase tracking-wide text-white/55">
                Your route, watched by Atithi
              </p>
              <h2 className="mt-1 font-serif text-[25px] leading-tight">
                {currentPlan.title}
              </h2>
              <p className="mt-1 text-xs text-white/70">
                {currentPlan.location || currentPlan.desc} ·{" "}
                {currentPlan.duration || "Curated for you"}
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface/8 p-3">
                  <p className="text-[9px] uppercase tracking-wide text-white/55">Waypoint elevation</p>
                  <p className="mt-1 text-[11px] font-semibold">{currentPlan.elevationM ?? selectedWaypoint?.elevationM ?? "—"} m · approx.</p>
                </div>
                <div className="rounded-xl bg-surface/8 p-3">
                  <p className="text-[9px] uppercase tracking-wide text-white/55">Day segment</p>
                  <p className="mt-1 text-[11px] font-semibold">{currentPlan.dayLabel || selectedWaypoint?.name || "Corridor route"}</p>
                </div>
              </div>
              <button
                type="button"
                disabled={!currentPlan.waypointId}
                onClick={() => currentPlan.waypointId && setSelectedWaypointId(currentPlan.waypointId)}
                className="mt-3 flex w-full items-center justify-between rounded-xl bg-accent px-3.5 py-2.5 text-left text-[11px] font-bold text-text disabled:opacity-50"
              >
                Use this waypoint for weather <ChevronRight size={15}/>
              </button>
            </div>
          </section>
        )}

        <div>
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-serif text-2xl text-text">Three-day corridor plan</h2>
            <span className="text-sm font-medium text-muted">
              {itinerary.length} route stops
            </span>
          </div>

          <div className="relative border-l-2 border-border ml-4 space-y-8 pb-4">
            <AnimatePresence>
              {itinerary.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="relative pl-6"
                >
                  <div
                    className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 ${
                      item.status === "completed"
                        ? "bg-muted border-muted"
                        : item.status === "current"
                          ? "bg-brand border-brand"
                          : item.isVulnerableToWeather && weather === "rainy"
                            ? "bg-surface border-red-500 animate-pulse"
                            : "bg-surface border-border"
                    }`}
                  />

                  <div
                    className={`
                    rounded-2xl p-4 transition-all
                    ${item.status === "current" ? "bg-surface shadow-md border border-border" : ""}
                    ${item.isVulnerableToWeather && weather === "rainy" ? "bg-red-50 border border-red-100" : ""}
                  `}
                  >
                    {item.dayLabel && item.dayLabel !== itinerary[index - 1]?.dayLabel && <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.14em] text-accent-text">{item.dayLabel}</p>}
                    <p
                      className={`text-xs font-semibold tracking-wider mb-1 ${
                        item.status === "completed"
                          ? "text-muted"
                          : item.status === "current"
                            ? "text-accent-text"
                            : item.isVulnerableToWeather && weather === "rainy"
                              ? "text-red-500"
                              : "text-muted"
                      }`}
                    >
                      {item.time}
                    </p>
                    <h3
                      className={`font-medium text-lg mb-1 ${item.status === "completed" ? "text-muted line-through" : "text-text"}`}
                    >
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted leading-snug">
                      {item.desc}
                    </p>

                    {item.aiAdjusted && (
                      <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-accent-text bg-accent/10 px-2 py-1 rounded-md">
                        <IconBadge icon={Sparkles} tone="violet" size="sm" className="!h-7 !w-7" /> Adjusted by AI
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl border border-border bg-surface p-4 shadow-sm"
        >
          <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-accent/15 blur-2xl" />
          <div className="relative flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#F5D5A2] to-[#D88972] text-[#273D31]">
              <Share2 size={19} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-accent-text">Keep the feeling</p>
              <h2 className="mt-0.5 font-serif text-xl text-text">Your day, beautifully told.</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">Turn your route and quieter local discoveries into a story worth sharing.</p>
            </div>
          </div>
          <button type="button" onClick={() => setTripStoryOpen(true)} className="relative mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:opacity-90">
            <Share2 size={15} /> Share your journey
          </button>
        </motion.section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Local economy · demo village ideas</p>
          <h2 className="mt-1 font-serif text-2xl text-text">Travel with local value.</h2>
          <p className="mt-2 text-xs leading-relaxed text-muted">Explore six illustrative homestay-village areas. Every card is marked Demo listing: these are not real properties, not verified accommodation and not bookable.</p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {DEMO_HOMESTAYS.slice(0, 2).map((village) => <div key={village.id} className="rounded-xl border border-border bg-bg p-3"><span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[8px] font-bold uppercase text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">Demo listing</span><h3 className="mt-2 text-xs font-semibold text-text">{village.name}</h3><p className="mt-1 text-[10px] text-muted">₹{village.localSpendINR} local spend · demo estimate</p></div>)}
          </div>
          <button type="button" onClick={() => setActiveTab("discover")} className="mt-3 w-full rounded-xl bg-brand px-4 py-3 text-xs font-bold text-white">Explore village areas</button>
        </section>
      </div>
      <TripStoryModal
        open={tripStoryOpen}
        onClose={() => setTripStoryOpen(false)}
        guest={guest}
        preferences={preferences}
        weather={weather}
        itinerary={itinerary}
        crowdSelectionIds={crowdSelectionIds}
      />
    </>
  );
}

function DiscoverTab({ onRequest, onAddPlace, crowdSelectionIds = [], isWeekend = false, setSelectedWaypointId }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [selected, setSelected] = useState(null);
  const [destinationView, setDestinationView] = useState("list");
  const [destinationCategory, setDestinationCategory] = useState("All");
  const categories = ["All", "Wellness", "Dining", "Culture"];
  const destinationCategories = ["All", "nature", "spiritual", "heritage", "market", "viewpoint", "village"];
  const filteredDestinations = PLACES.filter((place) =>
    (destinationCategory === "All" || place.category === destinationCategory) &&
    `${place.name} ${place.category} ${place.shortDesc} ${(place.tags || []).join(" ")}`
      .toLowerCase().includes(search.toLowerCase())
  );
  const isSelectedWeekend = isWeekend;
  const categoryIcons = { All: Compass, Wellness: Sparkles, Dining: Utensils, Culture: MapPin };
  const categoryTones = { All: "teal", Wellness: "violet", Dining: "saffron", Culture: "sky" };
  const filtered = EXPERIENCES.filter(
    (experience) =>
      (category === "All" || experience.category === category) &&
      `${experience.title} ${experience.desc}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  return (
    <div className="px-5 pb-8 pt-8 sm:px-6">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-text">
            Himalayan corridor · Local discovery
          </p>
          <h1 className="font-serif text-[34px] leading-none text-text">
            Discover
            <br />
            <span className="italic">Rishikesh to Kedarnath.</span>
          </h1>
        </div>
        <span className="mb-1 flex items-center gap-1 text-xs text-muted">
          <IconBadge icon={MapPin} tone="teal" size="sm" className="!h-7 !w-7 rounded-full" /> 30.3165° N
        </span>
      </div>
      <button
        onClick={() => setSelected(EXPERIENCES[3])}
        className="discover-feature relative mb-5 flex h-[218px] w-full items-end overflow-hidden rounded-2xl bg-brand text-left text-white shadow-lg"
      >
        <div
          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 hover:scale-[1.03]"
          style={{ backgroundImage: `url(${EXPERIENCES[3].img})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#14251F]/95 via-[#14251F]/25 to-transparent" />
        <div className="relative w-full p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded-full border border-white/25 bg-black/20 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] backdrop-blur">
              Outside the ordinary · {EXPERIENCES[3].category}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-surface/90 px-2 py-1 text-[10px] font-bold text-text">
              ★ {EXPERIENCES[3].rating}
            </span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-serif text-[26px] leading-none">
                Breathe beyond the city
              </h2>
              <p className="mt-1.5 text-[10px] text-white/75">
                {EXPERIENCES[3].location} · {EXPERIENCES[3].duration}
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-accent px-3 py-2 text-[10px] font-bold text-text">
              Explore <ChevronRight size={13} className="ml-1 inline" />
            </span>
          </div>
        </div>
      </button>
      <label className="relative block mb-4">
        <IconBadge icon={Search} tone="teal" size="sm" className="absolute left-2 top-2 !h-7 !w-7 rounded-full" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search corridor villages and destinations"
          className="w-full bg-surface border border-border rounded-xl py-2.5 pl-10 pr-3 text-sm outline-none focus:border-accent"
        />
      </label>

      <section className="mb-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Regional destinations</p>
            <h2 className="mt-1 font-serif text-2xl text-text">Local alternatives</h2>
            <p className="mt-1 text-xs text-muted">Curated Dehradun and Mussoorie suggestions; verify conditions before travel.</p>
          </div>
          <div role="group" aria-label="Destination view" className="flex rounded-xl border border-border bg-surface-2 p-1">
            {["list", "map"].map((mode) => (
              <button key={mode} type="button" aria-pressed={destinationView === mode} onClick={() => setDestinationView(mode)} className={`rounded-lg px-3 py-2 text-xs font-semibold capitalize transition ${destinationView === mode ? "bg-brand text-white shadow-sm" : "text-muted hover:text-text"}`}>{mode === "list" ? "List" : "Map"}</button>
            ))}
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Destination category filters">
          {destinationCategories.map((item) => (
            <button key={item} type="button" aria-pressed={destinationCategory === item} onClick={() => setDestinationCategory(item)} className={`whitespace-nowrap rounded-full px-3 py-2 text-[10px] font-semibold capitalize transition ${destinationCategory === item ? "bg-brand text-white" : "border border-border bg-surface text-muted hover:bg-surface-2"}`}>{item === "All" ? "All places" : item}</button>
          ))}
        </div>
        <p className="mb-2 text-[10px] text-muted">{filteredDestinations.length} destinations · crowd, travel and spend figures estimated</p>
        {destinationView === "map" ? (
          <PlacesMap places={filteredDestinations} onAddToItinerary={onAddPlace} selectedPlaceIds={crowdSelectionIds} height={350} />
        ) : (
          <div className="space-y-2">
            {filteredDestinations.map((place) => {
              const crowdScore = getCrowd(place, { isWeekend: isSelectedWeekend, isHoliday: false });
              const crowdLevel = getCrowdLevel(crowdScore);
              const crowdStyle = crowdLevel === "Low" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200" : crowdLevel === "Medium" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200" : "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200";
              const added = crowdSelectionIds.includes(place.id);
              return (
                <article key={place.id} className="rounded-xl border border-border bg-bg p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><h3 className="text-sm font-semibold text-text">{place.name}</h3><p className="mt-1 text-xs leading-relaxed text-muted">{place.shortDesc}</p></div>
                    <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${crowdStyle}`}>{crowdLevel} · est.</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted"><span>~{place.travelMinutes} min · estimated</span><span>₹{place.localSpendINR} local spend · estimated</span></div>
                  <button type="button" disabled={added} onClick={() => onAddPlace(place)} className="mt-3 w-full rounded-lg bg-brand px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50">{added ? "Added to itinerary" : "Add to itinerary"}</button>
                </article>
              );
            })}
            {!filteredDestinations.length && <p className="rounded-xl bg-surface-2 p-4 text-center text-xs text-muted">No regional places match this filter.</p>}
          </div>
        )}
        <p className="mt-3 text-[9px] leading-relaxed text-muted">Crowd index, travel time and local-spend amounts are demo estimates, not live data. Check local conditions before travelling.</p>
      </section>

      <section className="mb-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Community-first travel</p>
        <h2 className="mt-1 font-serif text-2xl text-text">Homestay village ideas</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">These six entries are illustrative map-area concepts only. They are not verified accommodation providers, real properties, inventory, availability or bookable stays.</p>
        <div className="mt-4 space-y-3">
          {DEMO_HOMESTAYS.filter((village) => `${village.name} ${village.tags.join(" ")} ${village.shortDesc}`.toLowerCase().includes(search.toLowerCase())).map((village) => (
            <article key={village.id} className="rounded-xl border border-border bg-bg p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><h3 className="text-sm font-semibold text-text">{village.name}</h3><p className="mt-1 text-xs leading-relaxed text-muted">{village.shortDesc}</p></div>
                <span className="shrink-0 rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[8px] font-extrabold uppercase tracking-wide text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">Demo listing</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">{village.tags.map((tag) => <span key={tag} className="rounded-full bg-surface-2 px-2 py-1 text-[9px] font-semibold text-muted">{tag}</span>)}</div>
              <p className="mt-2 text-[10px] font-semibold text-accent-text">₹{village.localSpendINR.toLocaleString("en-IN")} · local spend demo estimate · approx. {village.elevationM} m</p>
              <button type="button" onClick={() => setSelectedWaypointId(village.nearbyWaypointId)} className="mt-3 w-full rounded-lg bg-brand px-3 py-2.5 text-xs font-semibold text-white">Use nearby waypoint for weather</button>
              <p className="mt-2 text-[9px] text-muted">Not a real property · not bookable · no host or rate verification</p>
            </article>
          ))}
        </div>
        <p className="mt-3 text-[10px] leading-relaxed text-muted">Travel-spend amounts are fictional demo estimates, not accommodation quotes or bookings.</p>
      </section>

      <section className="mb-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Char Dham-style corridor</p>
        <h2 className="mt-1 font-serif text-2xl text-text">Route waypoints</h2>
        <p className="mt-2 text-xs text-muted">Approximate positions and elevations for planning context; not turn-by-turn navigation or live road data.</p>
        <div className="mt-3 space-y-2">
          {CORRIDOR_WAYPOINTS.map((waypoint) => (
            <button key={waypoint.id} type="button" onClick={() => setSelectedWaypointId(waypoint.id)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-bg p-3 text-left hover:bg-surface-2">
              <span><span className="block text-xs font-semibold text-text">{waypoint.name}</span><span className="mt-0.5 block text-[9px] text-muted">{waypoint.segment} · {waypoint.lat.toFixed(4)}, {waypoint.lon.toFixed(4)}</span></span>
              <span className="shrink-0 text-[10px] font-semibold text-accent-text">~{waypoint.elevationM} m</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {categories.map((item) => {
          const CategoryIcon = categoryIcons[item];
          return (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${category === item ? "bg-brand text-white shadow-sm" : "bg-surface border border-border text-muted"}`}
            >
              <IconBadge icon={CategoryIcon} tone={categoryTones[item]} size="sm" className="!h-7 !w-7 rounded-full" />
              {item}
            </button>
          );
        })}
      </div>
      <BeatCrowdsPanel search={search} onAddPlace={onAddPlace} isWeekend={isWeekend} selectedPlaceIds={crowdSelectionIds} />
      <SustainableImpactCard placeIds={crowdSelectionIds} />
      <div className="mb-3 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-accent-text">
            Chosen for you
          </p>
          <h2 className="font-serif text-[22px] leading-tight text-text">
            A little more local
          </h2>
        </div>
        <span className="text-[10px] text-muted">
          {filtered.length} experiences
        </span>
      </div>
      <div className="space-y-3 pb-8">
        {filtered.map((experience) => (
          <article
            key={experience.id}
            className="flex overflow-hidden rounded-2xl border border-border bg-surface shadow-sm"
          >
            <div
              className="w-[104px] shrink-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${experience.img})` }}
            />
            <div className="min-w-0 flex-1 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-accent-text">
                  {experience.category} · {experience.duration}
                </span>
                <span className="shrink-0 text-[10px] font-semibold text-muted">
                  ★ {experience.rating}
                </span>
              </div>
              <h3 className="mt-1 font-serif text-[18px] leading-tight text-text">
                {experience.title}
              </h3>
              <p className="mt-1 text-[10px] leading-snug text-muted">
                {experience.location}
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-semibold text-muted">
                  {experience.time}
                </span>
                <button
                  onClick={() => setSelected(experience)}
                  className="shrink-0 text-[10px] font-bold text-accent-text"
                >
                  Details <ChevronRight size={12} className="inline" />
                </button>
              </div>
              <p className="mt-1 text-[9px] text-muted">
                {experience.price} · {experience.availability}
              </p>
              <p className="sr-only">{experience.desc}</p>
            </div>
          </article>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-sm text-muted py-10">
            No experiences match that search.
          </p>
        )}
      </div>
      {selected && (
        <div
          className="fixed inset-0 z-[70] bg-black/45 p-5 flex items-center justify-center"
          onClick={() => setSelected(null)}
        >
          <section
            role="dialog"
            aria-modal="true"
            className="w-full max-w-sm bg-bg rounded-2xl overflow-hidden shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="h-40 bg-cover bg-center"
              style={{ backgroundImage: `url(${selected.img})` }}
            />
            <div className="p-5">
              <div className="flex justify-between">
                <span className="text-xs uppercase text-accent-text font-semibold">
                  {selected.category}
                </span>
                <button aria-label="Close" onClick={() => setSelected(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="mt-2 flex items-start justify-between gap-3">
                <h2 className="font-serif text-2xl leading-tight">
                  {selected.title}
                </h2>
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold text-muted">
                  ★ {selected.rating}
                </span>
              </div>
              <p className="text-sm text-muted mt-2">{selected.desc}</p>
              <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface p-3 text-xs">
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-accent-text">
                    When
                  </p>
                  <p className="mt-1 font-semibold">{selected.time}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-accent-text">
                    Duration
                  </p>
                  <p className="mt-1 font-semibold">{selected.duration}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-accent-text">
                    Where
                  </p>
                  <p className="mt-1 font-semibold">{selected.location}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-wide text-accent-text">
                    From
                  </p>
                  <p className="mt-1 font-semibold">{selected.price}</p>
                </div>
              </div>
              <p className="mt-3 text-[10px] text-muted">
                {selected.availability}
              </p>
              <button
                onClick={() => {
                  onRequest({
                    title: selected.title,
                    category: "Experience booking",
                    detail: `${selected.time} · ${selected.location} · ${selected.price}`,
                  });
                  setSelected(null);
                }}
                className="w-full mt-5 bg-brand text-white py-3 rounded-xl text-sm font-medium"
              >
                Request reservation
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AITab({ onRequest, guest, preferences, weather, weatherObservation, selectedWaypoint, disruptions = [], lowCrowdPlaces = [], onAddPlaceToItinerary, crowdSelectionIds = [] }) {
  const [messages, setMessages] = useState([
    {
      from: "concierge",
      text: `Welcome, ${guest?.name || "traveller"}. I can help with corridor safety, weather changes, route disruptions, suspected scams and quieter local alternatives. Confirm current official advice before travelling.`,
    },
  ]);
  const [draft, setDraft] = useState("");
  const quickReplies = [
    "Check the selected waypoint weather",
    "Suggest a quieter local stop",
    "What should I ask before agreeing to a fare?",
  ];

  const sendMessage = async (text = draft) => {
    const message = text.trim();
    if (!message) return;
    setMessages((current) => [...current, { from: "guest", text: message }]);
    const lower = message.toLowerCase();
    let reply = "Tell me which corridor waypoint you are considering, or ask about an active disruption, a safer pause point or lower-crowd alternatives.";
    if (/(hazard|landslide|roadblock|road block|unsafe|scam|overcharg|overpricing|suspicious fare)/i.test(message)) {
      onRequest({
        title: "Safety concern reported",
        category: "Trip safety",
        detail: message,
      });
      reply = "I logged this concern in the demo Trip Guardian report list for follow-up. This does not alert emergency services or verify the report; check current local guidance before proceeding.";
    } else if (/(emergency|urgent help|112)/i.test(message)) {
      reply = "If you or someone else is in immediate danger in India, call 112 now. This chat is not an emergency dispatch service.";
    } else if (/(weather|rain|temperature|wind|forecast)/i.test(message)) {
      reply = weatherObservation
        ? `The latest Open-Meteo observation supplied to this chat is for ${selectedWaypoint?.name || "the selected corridor waypoint"}: ${weatherObservation.temperatureC}°C, ${weatherObservation.condition}, rain ${weatherObservation.rainMm} mm, wind ${weatherObservation.windSpeedKmh ?? "unavailable"} km/h. Forecast data cannot confirm road safety or route access.`
        : `Live weather for ${selectedWaypoint?.name || "the selected corridor waypoint"} is not available right now. Check official forecasts and local road advisories before setting out.`;
    } else if (/(homestay|village stay|local stay)/i.test(message)) {
      reply = "Open Discover to see six Demo listing village-area ideas. They are fictional planning examples, not verified properties or bookable accommodation.";
    } else if (/(crowd|quiet|less busy|offbeat|where should|where can|visit|explore|trip|travel|route|what to do)/i.test(message)) {
      reply = "I can compare curated destinations by estimated crowd level and suggest a conservative alternative. These estimates are illustrative; I cannot confirm current access or road conditions.";
    }
    setDraft("");
    let finalReply = reply;
    const shouldShowPlaces = /where|place|destination|visit|explore|recommend|suggest|crowd|quiet|offbeat|trip|travel|route|what can i see|what to do/i.test(message);
    let finalAction = shouldShowPlaces
      ? { type: "show_places", placeIds: lowCrowdPlaces.slice(0, 5).map((place) => place.id).filter(Boolean) }
      : { type: "none", placeIds: [] };
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          context: {
            guest: { name: guest?.name, room: guest?.room, stayId: guest?.stayId },
            preferences, weather, disruptions, lowCrowdPlaces,
            selectedWaypoint: selectedWaypoint ? { id: selectedWaypoint.id, name: selectedWaypoint.name } : null,
            weatherObservation,
          },
        }),
      });
      if (response.ok) {
        const payload = await response.json();
        if (typeof payload.reply === "string" && payload.reply.trim()) finalReply = payload.reply.trim();
        if (payload.action && (payload.action.type === "show_places" || payload.action.type === "none")) {
          const validIds = new Set(PLACES.map((place) => place.id));
          finalAction = {
            type: payload.action.type,
            placeIds: Array.isArray(payload.action.placeIds)
              ? payload.action.placeIds.filter((id) => validIds.has(id)).slice(0, 5)
              : [],
          };
        }
      }
    } catch {
      // Keep a local concierge response when the serverless function is unavailable.
    }
    setMessages((current) => [...current, { from: "concierge", text: finalReply, query: message, action: finalAction }]);
  };

  return (
    <div className="h-full min-h-[560px] flex flex-col bg-bg">
      <div className="pt-12 px-6 pb-4 bg-surface border-b border-border shadow-sm relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center">
            <IconBadge icon={Sparkles} tone="saffron" size="sm" />
          </div>
          <div>
            <h1 className="font-serif text-xl">Atithi Concierge</h1>
            <p className="text-xs text-green-700 font-medium">
              ● Online · ready to help
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-5 overflow-y-auto space-y-3 pb-5">
        {messages.map((message, index) => {
          const showMap = message.from === "concierge" && message.action?.type === "show_places";
          const suggestedPlaces = showMap ? rankPlacesForChat(message.query || "", message.action.placeIds) : [];
          return (
            <div key={`${index}-${message.from}`} className={message.from === "guest" ? "ml-auto max-w-[86%]" : "max-w-[98%]"}>
              <div className={`rounded-2xl p-4 text-sm leading-relaxed ${message.from === "guest" ? "bg-brand text-white rounded-br-sm" : "bg-surface shadow-sm border border-border rounded-tl-sm"}`}>
                {message.text}
              </div>
              {showMap && suggestedPlaces.length > 0 && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface p-3 shadow-sm">
                  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent-text">Places to consider · estimated data</p>
                  <PlacesMap
                    places={suggestedPlaces}
                    mini
                    height={190}
                    onAddToItinerary={onAddPlaceToItinerary}
                    selectedPlaceIds={crowdSelectionIds}
                  />
                  <div className="mt-3 space-y-2">
                    {suggestedPlaces.map((place) => (
                      <article key={place.id} className="rounded-xl border border-border bg-bg p-3">
                        <div className="flex items-start justify-between gap-2"><div><h3 className="text-xs font-semibold text-text">{place.name}</h3><p className="mt-1 text-[10px] leading-relaxed text-muted">{place.shortDesc}</p></div><span className="rounded-full bg-surface-2 px-2 py-1 text-[9px] capitalize text-muted">{place.category}</span></div>
                        <p className="mt-2 text-[10px] text-muted">~{place.travelMinutes} min · crowd and time estimates</p>
                        <button type="button" disabled={crowdSelectionIds.includes(place.id)} onClick={() => onAddPlaceToItinerary(place)} className="mt-2 w-full rounded-lg bg-brand px-3 py-2 text-[10px] font-semibold text-white disabled:opacity-50">{crowdSelectionIds.includes(place.id) ? "Already added" : "Add to itinerary"}</button>
                      </article>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {quickReplies.map((reply) => (
              <button
                key={reply}
                onClick={() => sendMessage(reply)}
                className="bg-surface text-text text-xs font-medium px-3 py-2 rounded-full border border-border"
              >
                {reply}
              </button>
            ))}
          </div>
        )}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
        className="px-4 py-3 bg-surface border-t border-border flex gap-2"
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask for a recommendation or service..."
          className="min-w-0 flex-1 bg-surface-2 rounded-full py-3 px-4 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          aria-label="Send message"
          type="submit"
          disabled={!draft.trim()}
          className="w-11 h-11 shrink-0 rounded-full bg-brand flex items-center justify-center text-white disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function ServicesTab({ requests = [], onRequest, setActiveTab, selectedWaypoint, persona, onExportRescuePass, onPreviewRescuePass }) {
  const [panel, setPanel] = useState("");
  const [hazardType, setHazardType] = useState("Road obstruction");
  const [hazardDetails, setHazardDetails] = useState("");
  const actionCards = [
    { name: "Report a hazard", detail: "Flag a road issue, unsafe condition or suspected scam.", icon: ShieldAlert, tone: "coral", onClick: () => setPanel("hazard") },
    { name: "Emergency (112)", detail: "Call India’s unified emergency response number.", icon: PhoneCall, tone: "coral", href: "tel:112" },
    { name: "Find homestay", detail: "Explore clearly labelled demo village ideas; no bookings.", icon: House, tone: "emerald", onClick: () => setActiveTab("discover") },
    { name: "Scan a price (Lens)", detail: "Read visible prices and spot questions to clarify.", icon: ScanLine, tone: "violet", onClick: () => setPanel("lens") },
    { name: "Export Rescue Pass", detail: "Save your traveller, itinerary and safety summary.", icon: Download, tone: "teal", onClick: onExportRescuePass },
    { name: "Preview Rescue Pass", detail: "Check your dates and emergency contact before saving.", icon: ShieldCheck, tone: "teal", onClick: onPreviewRescuePass },
  ];

  return (
    <div className="services-page min-h-full px-5 pb-8 pt-8 sm:px-6">
      <div className="mb-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-text">Travel safety · Local support</p>
        <h1 className="mt-2 font-serif text-[34px] leading-none text-text">Help along the way.</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">Report concerns, reach emergency services or review a price before deciding. Atithi does not verify a property or guarantee a price is fair.</p>
      </div>
      <div className="mb-5 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-text">Current corridor focus</p>
        <h2 className="mt-1 font-serif text-xl text-text">{selectedWaypoint?.name || "Rudraprayag"}</h2>
        <p className="mt-1 text-xs text-muted">Approx. {selectedWaypoint?.elevationM ?? 895} m elevation · planning coordinates are approximate</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {actionCards.map((action) => {
          const Icon = action.icon;
          const card = (
            <>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-2 text-accent-text"><Icon size={20}/></span>
              <h2 className="mt-4 text-sm font-bold text-text">{action.name}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted">{action.detail}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[10px] font-bold text-accent-text">{action.name === "Emergency (112)" ? "Call 112" : action.name === "Find homestay" ? "See demo villages" : action.name === "Export Rescue Pass" ? "Download pass" : action.name === "Preview Rescue Pass" ? "Preview pass" : "Open tool"} <ChevronRight size={13}/></span>
            </>
          );
          const classes = "flex min-h-[170px] flex-col rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-accent hover:shadow-md";
          return action.href
            ? <a key={action.name} href={action.href} className={classes}>{card}</a>
            : <button key={action.name} type="button" onClick={action.onClick} className={classes}>{card}</button>;
        })}
      </div>

      <section className="mt-7">
        <div className="mb-3"><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent-text">Trip Guardian log</p><h2 className="mt-1 font-serif text-2xl text-text">Your safety reports</h2></div>
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          {requests.length ? (
            <div className="space-y-3">{requests.slice(0, 5).map((request) => (
              <article key={request.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                <div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold text-text">{request.title}</h3><span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-[9px] text-muted">{request.status || "Received"}</span></div>
                <p className="mt-1 text-xs leading-relaxed text-muted">{request.detail}</p>
                <p className="mt-1 text-[10px] text-muted">{request.category} · {request.time || "Just now"}</p>
              </article>
            ))}</div>
          ) : <p className="text-xs leading-relaxed text-muted">No reports have been submitted in this session. Use Report a hazard to log a route concern or suspected overpricing.</p>}
        </div>
      </section>

      {panel && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-5" onClick={(event) => { if (event.target === event.currentTarget) setPanel(""); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="safety-tool-title" className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-border bg-bg p-5 text-text shadow-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Atithi AI · Safety tool</p><h2 id="safety-tool-title" className="mt-1 font-serif text-2xl">{panel === "hazard" ? "Report a hazard" : "Price Lens"}</h2></div><button type="button" aria-label="Close" onClick={() => setPanel("")} className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface"><X size={17}/></button></div>
            {panel === "hazard" ? (
              <form onSubmit={submitHazard} className="mt-5 space-y-4">
                <p className="text-xs leading-relaxed text-muted">This creates a demo report in the local Trip Guardian log; it does not dispatch emergency help. Call 112 for an immediate emergency.</p>
                <label className="block text-xs font-semibold text-muted">Issue type<select value={hazardType} onChange={(event) => setHazardType(event.target.value)} className="mt-2 block w-full rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text"><option>Road obstruction</option><option>Flooding or landslide concern</option><option>Suspected overpricing or scam</option><option>Unsafe travel condition</option><option>Other local concern</option></select></label>
                <label className="block text-xs font-semibold text-muted">What did you notice?<textarea value={hazardDetails} onChange={(event) => setHazardDetails(event.target.value)} maxLength={600} rows={4} placeholder="Describe the visible issue and where it is…" className="mt-2 block w-full resize-y rounded-xl border border-border bg-surface px-3 py-3 text-sm text-text placeholder:text-muted"/></label>
                <p className="text-[10px] text-muted">Current corridor: {selectedWaypoint?.name || "Rudraprayag"}. Do not use this demo form for urgent help.</p>
                <button type="submit" className="w-full rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white">Submit demo safety report</button>
              </form>
            ) : (
              <div className="mt-5">
                <LensTab selectedWaypoint={selectedWaypoint} persona={persona} onRequest={onRequest} />
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function ProfileTab({ guest, persona, onUpdateHealthTags, onSwitchPersona }) {
  const healthTags = Array.isArray(persona?.healthTags) && persona.healthTags.length ? persona.healthTags : ["none"];
  const conditions = ["BP", "heart", "asthma", "none"];
  const toggleHealthTag = (tag) => {
    if (tag === "none") {
      onUpdateHealthTags(["none"]);
      return;
    }
    const next = healthTags.filter((item) => item !== "none");
    onUpdateHealthTags(next.includes(tag) ? next.filter((item) => item !== tag) : [...next, tag]);
  };

  return (
    <div className="profile-page px-5 pb-8 pt-8 sm:px-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div><p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-text">Your trip profile</p><h1 className="font-serif text-[34px] leading-none text-text">Plan for you.</h1></div>
        <ThemeToggle compact/>
      </div>
      <section className="profile-pass relative mb-6 overflow-hidden rounded-2xl p-5 text-white shadow-lg">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-white/65">Atithi AI · Demo persona</p>
        <div className="mt-5 flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#E7C99C]/60 bg-surface/5 font-serif text-2xl text-[#E7C99C]">{guest?.name?.trim()?.[0]?.toUpperCase() || "P"}</div>
          <div><h2 className="font-serif text-[25px] leading-none">{persona?.name || guest?.name || "Traveller"}</h2><p className="mt-2 text-xs text-white/75">{persona?.age ? `Age ${persona.age} · group ${persona.ageGroup}` : persona?.description || "Regional safety overview"}</p><p className="mt-1 text-[10px] text-white/65">{persona?.fitnessProfile || "Health-aware travel profile"}</p></div>
        </div>
        <p className="mt-5 border-t border-white/15 pt-3 text-[10px] leading-relaxed text-white/75">Demo profile only · health tags are not a medical record or medical advice.</p>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Personal safety context</p><h2 className="mt-1 font-serif text-2xl text-text">Health tags</h2><p className="mt-2 text-xs leading-relaxed text-muted">Choose only the demo tags you want used for safer planning. This is not connected to medical records.</p></div>
        <div className="mt-4"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">Age group</p><span className="inline-flex rounded-full border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-text">{persona?.ageGroup || "Not set"}{persona?.age ? ` · age ${persona.age} (demo)` : ""}</span></div>
        <div className="mt-5"><p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted">Known conditions · demo</p><div className="flex flex-wrap gap-2">{conditions.map((tag) => {const selected = healthTags.includes(tag);return <button key={tag} type="button" aria-pressed={selected} onClick={() => toggleHealthTag(tag)} className={`rounded-full border px-3 py-2 text-xs font-semibold capitalize transition ${selected ? "border-brand bg-brand text-white" : "border-border bg-surface text-muted hover:bg-surface-2"}`}>{tag === "BP" ? "BP / hypertension" : tag === "none" ? "None" : tag}</button>;})}</div></div>
        <p className="mt-4 text-[10px] leading-relaxed text-muted">These tags are optional demo inputs. For an actual emergency, call 112; don't rely on this app for medical assessment.</p>
      </section>

      <section className="mb-6 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Route context</p>
        <h2 className="mt-1 font-serif text-xl text-text">Health-aware, weather-aware travel</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted">Atithi can surface the selected corridor weather, mark affected stops and suggest conservative checkpoints. Coordinates and elevations are approximate planning context, not a navigation or medical guarantee.</p>
      </section>

      <button type="button" onClick={onSwitchPersona} className="flex w-full items-center justify-between rounded-2xl border border-border bg-surface p-4 text-left shadow-sm transition hover:bg-surface-2">
        <span><span className="block text-sm font-bold text-text">Switch persona</span><span className="mt-1 block text-xs text-muted">Choose Pilgrim, Trekker or Tourism Officer.</span></span><ChevronRight size={18} className="text-accent-text"/>
      </button>
    </div>
  );
}

function NavIcon({ icon: Icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 min-w-[64px]"
    >
      <motion.div whileTap={{ scale: 0.9 }} animate={active ? { y: [0, -3, 0] } : { y: 0 }} transition={{ duration: 0.28 }}>
        <IconBadge icon={Icon} tone={active ? "saffron" : "teal"} size="sm" className={active ? "" : "opacity-85"} />
      </motion.div>
      <span
        className={`text-[10px] font-medium ${active ? "text-text" : "text-muted"}`}
      >
        {label}
      </span>
    </button>
  );
}

// --- ADMIN DASHBOARD ---
// Keeping the Admin Dashboard intact for the Demo controller
function AdminDashboard({
  weather, weatherSource, itinerary, staffUser, persona, onSwitchPersona,
  selectedWaypoint, selectedWaypointId, setSelectedWaypointId,
  weatherObservation, weatherLoading, weatherError,
  disruptions = [], actionsLog = [], routeActions = [], affectedTravelers = 0, reroutesAccepted = 0,
  routeGuardDisruption, nearestSafeVillages = [], routeSegment = [], detourVillage, onRouteReroute, onKeepWaiting,
  redirectionsCount = 0, localSpendRedirected = 0, requests = [],
}) {
  const isConflict = disruptions.some((event) => Array.isArray(event.segment) && event.segment.length === 2);
  const isResolved = itinerary.some((item) => item.guardianAdjusted || item.aiAdjusted);
  const weatherSourceLabel = weatherSource === "demo" ? "Manual rain override" : weatherObservation ? "Live Open-Meteo" : "No observation";

  return (
    <div className="min-h-screen flex bg-surface-2">
      {/* Sidebar */}
      <div className="w-64 bg-brand text-white flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <IconBadge icon={Sparkles} tone="saffron" size="sm" />
            <span className="font-serif text-xl tracking-wide">Atithi AI</span>
          </div>
          <p className="text-white/50 text-xs">Himalayan Trip Guardian</p>
        </div>

        <div className="p-4 space-y-1 flex-1">
          <SidebarItem icon={LayoutDashboard} label="Overview" active tone="saffron" />
          <SidebarItem icon={User} label="Active disruptions" count={disruptions.length} tone="teal" />
          <SidebarItem
            icon={Sparkles}
            label="AI Control Center"
            alert={isConflict}
            tone="coral"
          />
          <SidebarItem icon={Bell} label="Guardian actions" count={actionsLog.length} tone="sky" />
          <SidebarItem icon={CalendarDays} label="Corridor waypoints" tone="violet" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-serif text-text">
              Himalayan Trip Guardian
            </h1>
            <p className="text-muted">
              Regional trip safety · crowd-aware redirections
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-surface px-4 py-2 rounded-lg shadow-sm border border-border flex items-center gap-3">
              <IconBadge icon={Thermometer} tone="coral" size="sm" pulse={isConflict} />
              <div className="flex flex-col">
                <span className="text-xs text-muted uppercase font-semibold">
                  Weather signal
                </span>
                <span className="text-sm font-medium capitalize text-text">
                  {weatherObservation ? `${weatherObservation.temperatureC}°C · ${weatherObservation.condition}` : weatherLoading ? "Updating live weather…" : "Weather unavailable"}
                </span>
                <span className="mt-0.5 block text-[10px] text-muted">{selectedWaypoint?.name || "Rudraprayag"} · {weatherSourceLabel}</span>
              </div>
            </div>
            <ThemeToggle compact />
            <span className="hidden text-xs text-muted lg:inline">{persona?.name || staffUser?.name || "Tourism Officer"} · Demo profile</span>
            <button type="button" onClick={onSwitchPersona} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-2"><User size={15}/> Switch persona</button>
          </div>
        </header>

        <div className="grid grid-cols-2 gap-4 mb-8 xl:grid-cols-4">
          <StatCard
            title="Active disruptions"
            value={String(disruptions.length)}
            trend={disruptions.length ? "Guardian review needed" : "No active signals"}
            alert={isConflict}
            icon={CloudRain}
            tone="coral"
          />
          <StatCard
            title="Affected travelers"
            value={String(affectedTravelers)}
            trend="Demo estimate · in-app traveler"
            icon={User}
            tone="saffron"
          />
          <StatCard title="Reroutes accepted" value={String(reroutesAccepted)} trend="Demo itinerary updates" icon={Compass} tone="emerald" />
          <StatCard
            title="Estimated local spend redirected"
            value={String(localSpendRedirected.toLocaleString("en-IN"))}
            trend="Demo estimate · INR"
            icon={MapPin}
            tone="saffron"
          />
        </div>

        <section className="mb-8 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Open-Meteo · Current conditions</p><h2 className="mt-1 font-serif text-2xl text-text">{selectedWaypoint?.name || "Rudraprayag"}</h2><p className="mt-1 text-xs text-muted">Approx. {selectedWaypoint?.elevationM ?? 895} m · planning coordinates/elevation approximate</p></div>
            <span className="rounded-full bg-surface-2 px-2.5 py-1.5 text-[10px] font-semibold text-muted">{weatherLoading ? "Updating…" : "Selected waypoint"}</span>
          </div>
          <label className="mt-4 block max-w-xl text-xs font-semibold text-muted">Weather waypoint
            <select value={selectedWaypointId} onChange={(event) => setSelectedWaypointId(event.target.value)} className="mt-2 block w-full rounded-xl border border-border bg-bg px-3 py-3 text-sm text-text">
              {CORRIDOR_WAYPOINTS.map((waypoint) => <option key={waypoint.id} value={waypoint.id}>{waypoint.name} · approx. {waypoint.elevationM} m</option>)}
            </select>
          </label>
          {weatherObservation && <div className="mt-4 grid max-w-xl grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface-2 p-3"><p className="text-[10px] text-muted">Temperature</p><p className="mt-1 font-semibold text-text">{weatherObservation.temperatureC}°C</p><p className="text-[9px] text-muted">Feels {weatherObservation.apparentTemperatureC ?? "—"}°C</p></div>
            <div className="rounded-xl bg-surface-2 p-3"><p className="text-[10px] text-muted">Rainfall</p><p className="mt-1 font-semibold text-text">{weatherObservation.rainMm.toFixed(1)} mm</p><p className="text-[9px] text-muted">Current reading</p></div>
            <div className="rounded-xl bg-surface-2 p-3"><p className="text-[10px] text-muted">Wind</p><p className="mt-1 font-semibold text-text">{weatherObservation.windSpeedKmh ?? "—"} km/h</p></div>
          </div>}
          {weatherError && <p role="status" className="mt-3 text-xs text-amber-700 dark:text-amber-300">{weatherError}</p>}
          <p className="mt-3 text-[10px] leading-relaxed text-muted">Weather informs planning; it does not verify route openings, landslides or travel safety. Confirm current local authority advisories.</p>
        </section>
        <section className="mb-5 rounded-2xl border border-border bg-surface p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Route Guard · Active disruptions</p><h2 className="mt-1 font-serif text-2xl text-text">Corridor incident overview</h2><p className="mt-1 text-xs text-muted">Source and segment are shown per signal. Demo events are simulated and are not official road reports.</p></div>
            <span className="rounded-full bg-surface-2 px-2.5 py-1.5 text-[10px] font-semibold text-muted">{disruptions.length} active</span>
          </div>
          {disruptions.length === 0
            ? <p className="mt-4 rounded-xl bg-surface-2 p-3 text-xs text-muted">No current disruption signals in the app state. This does not prove that the route is clear.</p>
            : <div className="mt-4 space-y-2">{disruptions.map((event) => {
              const from = CORRIDOR_WAYPOINTS.find((waypoint) => waypoint.id === event.segment?.[0]);
              const to = CORRIDOR_WAYPOINTS.find((waypoint) => waypoint.id === event.segment?.[1]);
              return <article key={event.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-border bg-bg p-3">
                <div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold capitalize text-text">{event.type} · {from?.name || "Waypoint"} → {to?.name || "Waypoint"}</h3>{event.source === "demo" ? <span className="rounded-full bg-rose-100 px-2 py-1 text-[8px] font-extrabold text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">DEMO EVENT</span> : <span className="rounded-full bg-emerald-100 px-2 py-1 text-[8px] font-bold text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200">LIVE WEATHER</span>}</div><p className="mt-1 text-[10px] text-muted">Severity: {event.severity} · Detected: {event.detectedAt ? new Date(event.detectedAt).toLocaleString() : "Not available"}</p></div>
              </article>;
            })}</div>}
        </section>
        <div className="mb-8 space-y-6">
          <RouteMap selectedWaypointId={selectedWaypointId} setSelectedWaypointId={setSelectedWaypointId} disruptions={disruptions} detourVillage={detourVillage} height={420} />
          {routeGuardDisruption && <RouteGuardCard disruption={routeGuardDisruption} currentWaypoint={selectedWaypoint} nearestSafe={nearestSafeVillages} persona={persona} onReroute={onRouteReroute} onKeepWaiting={onKeepWaiting} detourVillage={detourVillage} />}
          <ActionsTakenByAtithi actions={routeActions} />
        </div>
        <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <DestinationOverview redirectionsCount={redirectionsCount} localSpendRedirected={localSpendRedirected} actions={actionsLog} />
          <div className="space-y-6">
            <StaffRequestsPanel requests={requests} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 bg-surface rounded-2xl shadow-sm border border-border p-6">
            <h2 className="text-lg font-serif mb-4 flex items-center gap-2">
              <IconBadge icon={User} tone="teal" size="sm" /> Corridor Safety Activity
            </h2>
            <div className="space-y-4">
              <div
                className={`p-4 rounded-xl border ${isConflict ? "bg-red-50 border-red-100 dark:bg-rose-950/30 dark:border-rose-900/60" : isResolved ? "bg-surface-2 border-accent" : "border-border"}`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center font-serif">
                      V
                    </div>
                    <div>
                      <h3 className="font-medium text-text">
                        {persona?.name || staffUser?.name || "Traveler overview"}{" "}
                        <span className="text-xs font-normal text-muted bg-surface-2 px-2 py-0.5 rounded ml-2">
                          {persona?.role === "staff" ? "Tourism Officer · demo" : "Guest persona · demo"}
                        </span>
                      </h3>
                      <p className="text-xs text-muted">
                        Crowd-aware routing · Estimated destination index
                      </p>
                    </div>
                  </div>
                </div>

                {isConflict && (
                  <div className="bg-surface p-3 rounded-lg border border-red-100 mt-2">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                      <IconBadge icon={CloudRain} tone="coral" size="sm" pulse />{" "}
                      <span className="text-sm font-semibold">
                        Trip disruption detected · {disruptions[0]?.type || "route change"}
                      </span>
                    </div>
                    <p className="text-sm text-text mb-2">
                      {affectedStop?.title || "An itinerary stop"} may be affected. Check the Guardian alternatives before travelling.
                    </p>
                  </div>
                )}

                {isResolved && (
                  <div className="bg-surface p-3 rounded-lg border border-border mt-2">
                    <div className="flex items-center gap-2 text-text mb-1">
                      <IconBadge icon={Check} tone="emerald" size="sm" />{" "}
                      <span className="text-sm font-semibold">
                        Guardian alternative accepted
                      </span>
                    </div>
                    <p className="text-sm text-muted">
                      A destination was rerouted. See the Guardian action log for the current route.
                    </p>
                  </div>
                )}

                {!isConflict && !isResolved && (
                  <div className="bg-surface-2 p-3 rounded-lg mt-2">
                    <p className="text-sm text-muted">
                      Your route is currently clear. Guardian will keep watching for disruption signals.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarItem({ icon: Icon, label, active, count, alert, tone = "teal" }) {
  return (
    <button
      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${active ? "bg-surface/10 text-white" : "text-white/60 hover:bg-surface/5 hover:text-white"}`}
    >
      <div className="flex items-center gap-3">
        <IconBadge icon={Icon} tone={alert ? "coral" : tone} size="sm" pulse={alert} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {count && (
        <span className="bg-surface/10 text-xs px-2 py-0.5 rounded-full">
          {count}
        </span>
      )}
      {alert && (
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
      )}
    </button>
  );
}

function StatCard({ title, value, trend, alert, icon = LayoutDashboard, tone = "teal" }) {
  return (
    <div
      className={`bg-surface rounded-2xl p-5 shadow-sm border ${alert ? "border-red-200" : "border-border"}`}
    >
      <div className="mb-3 flex items-center gap-3">
        <IconBadge icon={icon} tone={alert ? "coral" : tone} size="md" pulse={alert} />
        <h3 className="text-sm font-semibold text-muted">{title}</h3>
      </div>
      <div className="flex items-end justify-between">
        <span
          className={`text-3xl font-serif ${alert ? "text-red-600" : "text-text"}`}
        >
          {value}
        </span>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-md ${alert ? "bg-red-50 text-red-600" : "bg-surface-2 text-muted"}`}
        >
          {trend}
        </span>
      </div>
    </div>
  );
}
