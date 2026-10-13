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

export function TravelProvider({ children }) {
  const { destination } = useDestination();
  const previousDestinationId = useRef(destination.id);
  const planDestinationRef = useRef(destination.id);
  const planMetaDestinationRef = useRef(destination.id);
  const skipNextPlanWrite = useRef(false);
  const skipNextMetaWrite = useRef(false);
  const [itinerary, setItinerary] = useState(() => readStored(PLAN_PREFIX + destination.id, []).filter((item) => item && typeof item.id === "string" && typeof item.itemType === "string"));
  const [planMeta, setPlanMeta] = useState(() => {
    const stored = readStored(PLAN_META_PREFIX + destination.id, {});
    return { activeDisruption: stored?.activeDisruption && typeof stored.activeDisruption === "object" ? stored.activeDisruption : null, changeLog: Array.isArray(stored?.changeLog) ? stored.changeLog.filter((item) => item && typeof item.message === "string").slice(0, 40) : [] };
  });
  const [requests, setRequests] = useState(() => readStored(REQUESTS_PREFIX + destination.id, []));
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = readStored(MESSAGES_PREFIX + destination.id, []);
    return saved.length ? saved : [makeWelcome(destination)];
  });

  useEffect(() => {
    if (previousDestinationId.current === destination.id) return;
    previousDestinationId.current = destination.id;
    // A new destination always gets a fresh active plan; its own prior notes and chat may be restored.
    planDestinationRef.current = destination.id;
    planMetaDestinationRef.current = destination.id;
    skipNextPlanWrite.current = true;
    skipNextMetaWrite.current = true;
    setItinerary(readStored(PLAN_PREFIX + destination.id, []).filter((item) => item && typeof item.id === "string" && typeof item.itemType === "string").slice(0, 12));
    const savedMeta = readStored(PLAN_META_PREFIX + destination.id, {});
    setPlanMeta({ activeDisruption: savedMeta?.activeDisruption && typeof savedMeta.activeDisruption === "object" ? savedMeta.activeDisruption : null, changeLog: Array.isArray(savedMeta?.changeLog) ? savedMeta.changeLog.filter((item) => item && typeof item.message === "string").slice(0, 40) : [] });
    const destinationRequests = readStored(REQUESTS_PREFIX + destination.id, [])
      .filter((item) => item && item.destinationId === destination.id)
      .slice(0, MAX_REQUESTS);
    setRequests(destinationRequests);
    const savedMessages = readStored(MESSAGES_PREFIX + destination.id, [])
      .filter((item) => item && typeof item.text === "string")
      .slice(-MAX_MESSAGES);
    setChatMessages(savedMessages.length ? savedMessages : [makeWelcome(destination)]);
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
