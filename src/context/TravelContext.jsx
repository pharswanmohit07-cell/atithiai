import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useDestination } from "./DestinationContext.jsx";

const TravelContext = createContext(null);
const REQUESTS_PREFIX = "atithi-traveler-requests:";
const MESSAGES_PREFIX = "atithi-traveler-chat:";
const PLAN_PREFIX = "atithi-traveler-plan:";
const PLAN_META_PREFIX = "atithi-plan-meta:";
const MAX_REQUESTS = 60;
const MAX_MESSAGES = 80;
const ITEM_TYPES = new Set(["place", "experience", "dish"]);

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = JSON.parse(raw);
    return Array.isArray(fallback) && Array.isArray(value)
      ? value
      : value && typeof value === "object" && !Array.isArray(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep session state if storage is unavailable. */ }
}
function safeText(value, maxLength, fallback = "") {
  return typeof value === "string" ? value.slice(0, maxLength) : fallback;
}
function safeFinite(value, fallback = null) {
  return value !== null && value !== "" && Number.isFinite(Number(value)) ? Number(value) : fallback;
}
function safeDate(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : new Date().toISOString();
}
function readPlan(key) {
  const value = readStored(key, []);
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item)
      && typeof item.id === "string" && ITEM_TYPES.has(item.itemType))
    .slice(0, 12)
    .map((item) => ({
      id: safeText(item.id, 100),
      itemType: item.itemType,
      itemId: safeText(item.itemId, 100, safeText(item.placeId, 100, "")) || null,
      placeId: safeText(item.placeId, 100) || null,
      locationPlaceId: safeText(item.locationPlaceId, 100) || null,
      title: safeText(item.title, 200, "Saved stop"),
      note: safeText(item.note, 1600),
      bestTime: safeText(item.bestTime, 40, "any"),
      window: safeText(item.window, 40),
      durationMin: Math.max(10, Math.min(1440, Math.round(safeFinite(item.durationMin, 45)))),
      time: safeText(item.time, 40) || null,
      status: ["Planned", "Done", "Skipped"].includes(item.status) ? item.status : "Planned",
      estimatedCost: Math.max(0, safeFinite(item.estimatedCost, 0)),
      lat: safeFinite(item.lat),
      lon: safeFinite(item.lon),
      category: safeText(item.category, 60, item.itemType),
      score: safeFinite(item.score, 0),
      reasons: Array.isArray(item.reasons)
        ? item.reasons.filter((reason) => typeof reason === "string").slice(0, 6).map((reason) => reason.slice(0, 120))
        : [],
      travelMinutes: Math.max(0, safeFinite(item.travelMinutes, 0)),
      travelDistanceKm: Math.max(0, safeFinite(item.travelDistanceKm, 0)) || (item.travelDistanceKm == null || item.travelDistanceKm === "" ? null : 0),
      whereToEat: safeText(item.whereToEat, 240)
    }));
}
function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function makeWelcome(destination) {
  return { id: "welcome-" + destination.id, role: "assistant", text: destination.greeting, createdAt: new Date().toISOString() };
}
function resultRefs(items) {
  if (!Array.isArray(items)) return [];
  return items.filter((item) => item && ITEM_TYPES.has(item.itemType) && typeof item.id === "string")
    .slice(0, 5).map((item) => ({
      id: item.id.slice(0, 100),
      itemType: item.itemType,
      score: Number.isFinite(Number(item.score)) ? Number(item.score) : 0,
      reasons: Array.isArray(item.reasons) ? item.reasons.filter((reason) => typeof reason === "string").slice(0, 6).map((reason) => reason.slice(0, 120)) : []
    }));
}
function readRequests(key, destinationId) {
  const value = readStored(key, []);
  if (!Array.isArray(value)) return [];
  return value
    .filter((item) => item && typeof item === "object" && !Array.isArray(item)
      && (typeof item.destinationId !== "string" || item.destinationId === destinationId))
    .slice(0, MAX_REQUESTS)
    .map((item) => ({
      id: safeText(item.id, 100, newId()),
      title: safeText(item.title, 140, "Travel note"),
      category: safeText(item.category, 60, "Trip idea"),
      detail: safeText(item.detail, 1600),
      placeId: safeText(item.placeId, 100) || null,
      status: safeText(item.status, 60, "Saved to trip notes"),
      createdAt: safeDate(item.createdAt),
      destinationId
    }));
}
function readChatMessages(key, destination) {
  const value = readStored(key, []);
  const saved = Array.isArray(value)
    ? value.filter((item) => item && typeof item === "object" && !Array.isArray(item)
      && typeof item.text === "string")
      .slice(-MAX_MESSAGES)
      .map((item) => ({
        id: safeText(item.id, 100, newId()),
        role: item.role === "guest" ? "guest" : "assistant",
        text: safeText(item.text, 2500),
        createdAt: safeDate(item.createdAt),
        ...(typeof item.intent === "string" ? { intent: item.intent.slice(0, 40) } : {}),
        ...(Array.isArray(item.results) ? { results: resultRefs(item.results) } : {})
      }))
    : [];
  return saved.length ? saved : [makeWelcome(destination)];
}
function readPlanMeta(key) {
  const stored = readStored(key, {});
  const disruption = stored?.activeDisruption;
  const activeDisruption = disruption && typeof disruption === "object" && !Array.isArray(disruption)
    && ["rain", "storm", "heat", "closure", "strike"].includes(disruption.type)
    && Array.isArray(disruption.affectedStopIds)
    ? {
        id: safeText(disruption.id, 120, newId()),
        type: disruption.type,
        affectedStopIds: disruption.affectedStopIds.filter((id) => typeof id === "string").slice(0, 12),
        severity: disruption.severity === "high" ? "high" : "moderate",
        source: disruption.source === "live" ? "live" : "demo",
        detectedAt: safeDate(disruption.detectedAt)
      }
    : null;
  const changeLog = Array.isArray(stored?.changeLog)
    ? stored.changeLog
        .filter((item) => item && typeof item === "object" && !Array.isArray(item) && typeof item.message === "string")
        .slice(0, 40)
        .map((item) => ({
          id: safeText(item.id, 100, newId()),
          createdAt: safeDate(item.createdAt),
          message: safeText(item.message, 260),
          reason: safeText(item.reason, 260),
          type: safeText(item.type, 40, "update")
        }))
    : [];
  return { activeDisruption, changeLog };
}

export function TravelProvider({ children }) {
  const { destination } = useDestination();
  const previousDestinationId = useRef(destination.id);
  const planDestinationRef = useRef(destination.id);
  const planMetaDestinationRef = useRef(destination.id);
  const skipNextPlanWrite = useRef(false);
  const skipNextMetaWrite = useRef(false);
  const [itinerary, setItinerary] = useState(() => readPlan(PLAN_PREFIX + destination.id));
  const [planMeta, setPlanMeta] = useState(() => readPlanMeta(PLAN_META_PREFIX + destination.id));
  const [requests, setRequests] = useState(() => readRequests(REQUESTS_PREFIX + destination.id, destination.id));
  const [chatMessages, setChatMessages] = useState(() => readChatMessages(MESSAGES_PREFIX + destination.id, destination));

  useEffect(() => {
    if (previousDestinationId.current === destination.id) return;
    previousDestinationId.current = destination.id;
    // A new destination always gets a fresh active plan; its own prior notes and chat may be restored.
    planDestinationRef.current = destination.id;
    planMetaDestinationRef.current = destination.id;
    skipNextPlanWrite.current = true;
    skipNextMetaWrite.current = true;
    setItinerary(readPlan(PLAN_PREFIX + destination.id));
    setPlanMeta(readPlanMeta(PLAN_META_PREFIX + destination.id));
    setRequests(readRequests(REQUESTS_PREFIX + destination.id, destination.id));
    setChatMessages(readChatMessages(MESSAGES_PREFIX + destination.id, destination));
  }, [destination]);

  useEffect(() => {
    if (skipNextPlanWrite.current) { skipNextPlanWrite.current = false; return; }
    if (planDestinationRef.current === destination.id) writeStored(PLAN_PREFIX + destination.id, itinerary.slice(0, 12));
  }, [itinerary, destination.id]);

  useEffect(() => {
    if (skipNextMetaWrite.current) { skipNextMetaWrite.current = false; return; }
    if (planMetaDestinationRef.current === destination.id) writeStored(PLAN_META_PREFIX + destination.id, planMeta);
  }, [planMeta, destination.id]);

  const setActiveDisruption = useCallback((disruption) => {
    setPlanMeta((current) => ({ ...current, activeDisruption: disruption && typeof disruption === "object" ? disruption : null }));
  }, []);
  const addPlanLog = useCallback((entry) => {
    const item = { id: newId(), createdAt: new Date().toISOString(), message: String(entry?.message || "").trim().slice(0, 260), reason: String(entry?.reason || "").trim().slice(0, 260), type: String(entry?.type || "update").slice(0, 40) };
    if (!item.message) return null;
    setPlanMeta((current) => ({ ...current, changeLog: [item, ...current.changeLog].slice(0, 40) }));
    return item;
  }, []);
  const clearPlanLog = useCallback(() => setPlanMeta((current) => ({ ...current, changeLog: [] })), []);

  const addRequest = useCallback((input = {}) => {
    const item = {
      id: newId(),
      title: String(input.title || "Travel note").trim().slice(0, 140),
      category: String(input.category || "Trip idea").slice(0, 60),
      detail: String(input.detail || "").trim().slice(0, 1600),
      placeId: typeof input.placeId === "string" ? input.placeId.slice(0, 100) : null,
      status: "Saved to trip notes",
      createdAt: new Date().toISOString(),
      destinationId: destination.id
    };
    setRequests((current) => {
      const next = [item, ...current].slice(0, MAX_REQUESTS);
      writeStored(REQUESTS_PREFIX + destination.id, next);
      return next;
    });
    return item;
  }, [destination.id]);

  const addChatMessage = useCallback((message) => {
    const text = String(message?.text || "").trim().slice(0, 2500);
    if (!text) return null;
    const item = {
      id: newId(),
      role: message?.role === "guest" ? "guest" : "assistant",
      text,
      createdAt: new Date().toISOString(),
      ...(message?.intent ? { intent: String(message.intent).slice(0, 40) } : {}),
      ...(message?.results ? { results: resultRefs(message.results) } : {})
    };
    setChatMessages((current) => {
      const next = [...current, item].slice(-MAX_MESSAGES);
      writeStored(MESSAGES_PREFIX + destination.id, next);
      return next;
    });
    return item;
  }, [destination.id]);

  const addItineraryItem = useCallback((sourceItem, itemType = "place") => {
    if (!sourceItem || !ITEM_TYPES.has(itemType) || typeof sourceItem.id !== "string") return null;
    const collection = itemType === "place" ? destination.places : itemType === "experience" ? destination.experiences : destination.dishes;
    const item = collection.find((entry) => entry.id === sourceItem.id);
    if (!item) return null;
    const title = itemType === "experience" ? item.title : item.name;
    const stop = {
      id: itemType + "-" + item.id,
      itemType,
      itemId: item.id,
      placeId: itemType === "place" ? item.id : null,
      title,
      note: item.localStory || item.description || "",
      bestTime: item.bestTime || "any",
      durationMin: Number(item.durationMin) || null,
      time: null,
      status: "Planned",
      estimatedCost: itemType === "experience" ? (Number(item.priceLocal) || 0) : itemType === "dish" ? (Array.isArray(item.priceRangeLocal) ? (Number(item.priceRangeLocal[0]) + Number(item.priceRangeLocal[1])) / 2 : 0) : (Number(item.avgSpendLocal) || 0),
      lat: Number.isFinite(Number(item.lat)) ? Number(item.lat) : null,
      lon: Number.isFinite(Number(item.lon)) ? Number(item.lon) : null,
      category: item.category || (itemType === "dish" ? "food" : "experience"),
      score: Number.isFinite(Number(sourceItem.score)) ? Number(sourceItem.score) : 0,
      reasons: Array.isArray(sourceItem.reasons) ? sourceItem.reasons.slice(0, 6) : []
    };
    setItinerary((current) => current.some((entry) => entry.id === stop.id) ? current : [...current, stop].slice(0, 12));
    return stop;
  }, [destination]);

  const addItineraryStop = useCallback((place) => addItineraryItem(place, "place"), [addItineraryItem]);
  const removeItineraryStop = useCallback((id) => {
    setItinerary((current) => current.filter((item) => item.id !== id && item.placeId !== id && item.itemId !== id));
  }, []);
  const clearItinerary = useCallback(() => setItinerary([]), []);

  const value = {
    itinerary, setItinerary, addItineraryItem, addItineraryStop, removeItineraryStop, clearItinerary,
    activeDisruption: planMeta.activeDisruption, setActiveDisruption, changeLog: planMeta.changeLog, addPlanLog, clearPlanLog,
    requests, addRequest, chatMessages, addChatMessage
  };
  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}

export function useTravelContext() {
  const context = useContext(TravelContext);
  if (!context) throw new Error("useTravelContext must be used within TravelProvider");
  return context;
}
