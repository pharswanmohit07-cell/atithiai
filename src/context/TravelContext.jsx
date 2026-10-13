import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useDestination } from "./DestinationContext.jsx";

const TravelContext = createContext(null);
const PROFILE_KEY = "atithi-traveler-preferences";
const REQUESTS_PREFIX = "atithi-traveler-requests:";
const MESSAGES_PREFIX = "atithi-traveler-chat:";
const MAX_REQUESTS = 60;
const MAX_MESSAGES = 80;

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const value = JSON.parse(raw);
    return Array.isArray(fallback) && Array.isArray(value) ? value : (value && typeof value === "object" && !Array.isArray(value) ? value : fallback);
  } catch {
    return fallback;
  }
}
function writeStored(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Keep state in memory if storage is unavailable. */ }
}
function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
}
function readPreferences() {
  const saved = readStored(PROFILE_KEY, {});
  return {
    language: typeof saved.language === "string" && saved.language ? saved.language : (typeof navigator !== "undefined" ? navigator.language || "en" : "en"),
    interests: Array.isArray(saved.interests) ? saved.interests.filter((item) => typeof item === "string").slice(0, 10) : [],
    pace: ["slow", "balanced", "curious"].includes(saved.pace) ? saved.pace : "balanced",
    dietaryPreference: ["any", "veg", "vegan", "nonVeg", "halal", "glutenFree"].includes(saved.dietaryPreference) ? saved.dietaryPreference : "any",
    travelParty: ["solo", "couples", "families", "friends"].includes(saved.travelParty) ? saved.travelParty : "solo"
  };
}
function makeWelcome(destination) {
  return { id: "welcome-" + destination.id, role: "assistant", text: destination.greeting, createdAt: new Date().toISOString() };
}

export function TravelProvider({ children }) {
  const { destination } = useDestination();
  const previousDestinationId = useRef(destination.id);
  const [itinerary, setItinerary] = useState([]);
  const [requests, setRequests] = useState(() => readStored(REQUESTS_PREFIX + destination.id, []));
  const [chatMessages, setChatMessages] = useState(() => {
    const saved = readStored(MESSAGES_PREFIX + destination.id, []);
    return saved.length ? saved : [makeWelcome(destination)];
  });
  const [preferences, setPreferences] = useState(readPreferences);

  useEffect(() => {
    if (previousDestinationId.current === destination.id) return;
    previousDestinationId.current = destination.id;
    // Destination changes deliberately start a fresh plan and conversation to avoid cross-city state.
    setItinerary([]);
    setRequests([]);
    setChatMessages([makeWelcome(destination)]);
    writeStored(REQUESTS_PREFIX + destination.id, []);
    writeStored(MESSAGES_PREFIX + destination.id, [makeWelcome(destination)]);
  }, [destination]);

  const updatePreferences = useCallback((patch) => {
    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      writeStored(PROFILE_KEY, next);
      return next;
    });
  }, []);

  const addRequest = useCallback((input = {}) => {
    const now = new Date().toISOString();
    const item = {
      id: newId(),
      title: String(input.title || "Travel note").trim().slice(0, 140),
      category: String(input.category || "Trip idea").slice(0, 60),
      detail: String(input.detail || "").trim().slice(0, 1600),
      placeId: typeof input.placeId === "string" ? input.placeId.slice(0, 100) : null,
      status: "Saved to trip notes",
      createdAt: now,
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
    const item = {
      id: newId(),
      role: message?.role === "guest" ? "guest" : "assistant",
      text: String(message?.text || "").trim().slice(0, 2500),
      createdAt: new Date().toISOString()
    };
    if (!item.text) return null;
    setChatMessages((current) => {
      const next = [...current, item].slice(-MAX_MESSAGES);
      writeStored(MESSAGES_PREFIX + destination.id, next);
      return next;
    });
    return item;
  }, [destination.id]);

  const addItineraryStop = useCallback((place) => {
    if (!place || typeof place.id !== "string" || !destination.places.some((item) => item.id === place.id)) return;
    setItinerary((current) => {
      if (current.some((item) => item.placeId === place.id)) return current;
      return [...current, { id: place.id, placeId: place.id, bestTime: place.bestTime, title: place.name, note: place.localStory }].slice(0, 12);
    });
  }, [destination]);

  const removeItineraryStop = useCallback((placeId) => {
    setItinerary((current) => current.filter((item) => item.placeId !== placeId));
  }, []);

  const clearItinerary = useCallback(() => setItinerary([]), []);

  const value = {
    itinerary, setItinerary, addItineraryStop, removeItineraryStop, clearItinerary,
    requests, addRequest, chatMessages, addChatMessage, preferences, updatePreferences
  };
  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}

export function useTravelContext() {
  const context = useContext(TravelContext);
  if (!context) throw new Error("useTravelContext must be used within TravelProvider");
  return context;
}
