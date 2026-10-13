import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useDestination } from "./DestinationContext.jsx";

const HotelContext = createContext(null);
const PROFILE_KEY = "atithi-guest-preferences";
const EMPTY_PREFERENCES = { language: "en", dietaryPreference: "No preference", travelParty: "Family" };

function safeRead(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function initialItinerary(destination) {
  return destination.places.slice(0, 4).map((place, index) => ({
    id: place.id,
    placeId: place.id,
    title: place.name,
    note: "Suggested stop · Demo itinerary",
    order: index + 1,
  }));
}

export function HotelProvider({ children }) {
  const { destination } = useDestination();
  const previousDestinationId = useRef(destination.id);
  const [itinerary, setItinerary] = useState(() => initialItinerary(destination));
  const [requests, setRequests] = useState([]);
  const [preferences, setPreferences] = useState(() => ({ ...EMPTY_PREFERENCES, ...safeRead(PROFILE_KEY, {}) }));

  useEffect(() => {
    if (previousDestinationId.current === destination.id) return;
    previousDestinationId.current = destination.id;
    setItinerary(initialItinerary(destination));
    setRequests([]);
  }, [destination]);

  const updatePreferences = useCallback((patch) => {
    setPreferences((previous) => {
      const next = { ...previous, ...patch };
      try { localStorage.setItem(PROFILE_KEY, JSON.stringify(next)); } catch { /* Keep settings in memory for this session. */ }
      return next;
    });
  }, []);

  const addRequest = useCallback((request) => {
    const item = {
      id: (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2),
      title: String(request?.title || "Guest request").slice(0, 140),
      category: String(request?.category || "Front desk").slice(0, 60),
      detail: String(request?.detail || "").slice(0, 1000),
      status: "Pending human review",
      priority: request?.priority === "urgent" ? "urgent" : "normal",
      createdAt: new Date().toISOString(),
      destinationId: destination.id,
    };
    setRequests((current) => [item, ...current].slice(0, 80));
    return item;
  }, [destination.id]);

  const updateRequestStatus = useCallback((id, status) => {
    const allowed = ["Pending human review", "Approved by staff", "Declined by staff", "Completed by staff"];
    if (!allowed.includes(status)) return;
    setRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request));
  }, []);

  const addItineraryStop = useCallback((place) => {
    if (!destination.places.some((candidate) => candidate.id === place?.id)) return;
    setItinerary((current) => current.some((stop) => stop.placeId === place.id)
      ? current
      : [...current, { id: place.id, placeId: place.id, title: place.name, note: "Added by guest · Demo itinerary", order: current.length + 1 }]);
  }, [destination.places]);

  const removeItineraryStop = useCallback((id) => {
    setItinerary((current) => current.filter((stop) => stop.id !== id).map((stop, index) => ({ ...stop, order: index + 1 })));
  }, []);

  const value = {
    itinerary, setItinerary, requests, addRequest, updateRequestStatus,
    preferences, updatePreferences, addItineraryStop, removeItineraryStop,
  };
  return <HotelContext.Provider value={value}>{children}</HotelContext.Provider>;
}

export function useHotelContext() {
  const value = useContext(HotelContext);
  if (!value) throw new Error("useHotelContext must be used inside HotelProvider");
  return value;
}
