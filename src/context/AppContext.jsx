import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CORRIDOR_WAYPOINTS, DEFAULT_CORRIDOR_WAYPOINT_ID } from "../data/corridor.js";

const AppContext = createContext(null);
const PREFS_KEY = "atithi-preferences";
const COMPLETED_KEY = "atithi-onboarding-complete";
const PERSONA_KEY = "atithi-persona";
const WAYPOINT_KEY = "atithi-selected-waypoint";
const RESCUE_ALTITUDE_KEY = "atithi-rescue-pass-altitude";

export const DEFAULT_PREFERENCES = {
  interests: ["nature", "culture"],
  travelStyle: "balanced",
  pace: "balanced",
  dietaryPreference: "No preference",
};
export const PERSONA_OPTIONS = [
  {
    id: "pilgrim", name: "Pilgrim", role: "guest", age: 62, ageGroup: "60+",
    fitnessProfile: "Gentle pace", healthTags: ["BP"],
    description: "Age 62 · hypertension (demo profile)", subtitle: "A steadier pilgrimage with rest and weather-aware decisions.",
  },
  {
    id: "trekker", name: "Trekker", role: "guest", age: 28, ageGroup: "18–39",
    fitnessProfile: "Fit · active", healthTags: ["none"],
    description: "Age 28 · fit (demo profile)", subtitle: "Trail-conscious planning, disruption checks and local alternatives.",
  },
  {
    id: "tourism-officer", name: "Tourism Officer", role: "staff", age: null, ageGroup: "Adult",
    fitnessProfile: "Officer view", healthTags: ["none"],
    description: "Tourism operations · regional overview", subtitle: "Monitor route signals, safety reports and community redirection.",
  },
];

function safeRead(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}
function readPreferences() {
  const saved = safeRead(PREFS_KEY, null);
  return saved && typeof saved === "object" ? { ...DEFAULT_PREFERENCES, ...saved } : { ...DEFAULT_PREFERENCES };
}
function readCompleted() {
  const value = safeRead(COMPLETED_KEY, []);
  return Array.isArray(value) ? value.map(String) : [];
}
function readPersona() {
  const saved = safeRead(PERSONA_KEY, null);
  const option = PERSONA_OPTIONS.find((item) => item.id === saved?.id);
  if (!option) return null;
  const allowedTags = ["BP", "heart", "asthma", "none"];
  const tags = Array.isArray(saved.healthTags) ? saved.healthTags.filter((tag) => allowedTags.includes(tag)) : option.healthTags;
  return { ...option, ...saved, healthTags: tags.length ? [...new Set(tags)] : ["none"] };
}
function readWaypoint() {
  const saved = safeRead(WAYPOINT_KEY, DEFAULT_CORRIDOR_WAYPOINT_ID);
  return CORRIDOR_WAYPOINTS.some((item) => item.id === saved) ? saved : DEFAULT_CORRIDOR_WAYPOINT_ID;
}
function readRescuePassAltitude() {
  const saved = safeRead(RESCUE_ALTITUDE_KEY, null);
  if (!saved || typeof saved !== "object") {
    return { altitudeLevel: null, personaId: null, elevationM: null, ascentPerDay: null, updatedAt: null };
  }
  return {
    altitudeLevel: ["low", "moderate", "high"].includes(saved.altitudeLevel) ? saved.altitudeLevel : null,
    personaId: ["pilgrim", "trekker", "tourism-officer"].includes(saved.personaId) ? saved.personaId : null,
    elevationM: Number.isFinite(Number(saved.elevationM)) ? Math.max(0, Number(saved.elevationM)) : null,
    ascentPerDay: Number.isFinite(Number(saved.ascentPerDay)) ? Math.max(0, Number(saved.ascentPerDay)) : null,
    updatedAt: typeof saved.updatedAt === "string" ? saved.updatedAt : null,
  };
}
function segmentForWaypoint(waypointId) {
  const index = CORRIDOR_WAYPOINTS.findIndex((waypoint) => waypoint.id === waypointId);
  if (index < 0) return ["rudraprayag", "guptkashi"];
  if (index < CORRIDOR_WAYPOINTS.length - 1) return [CORRIDOR_WAYPOINTS[index].id, CORRIDOR_WAYPOINTS[index + 1].id];
  return [CORRIDOR_WAYPOINTS[index - 1].id, CORRIDOR_WAYPOINTS[index].id];
}

function describeWeatherCode(code) {
  if (code === 0) return { label: "Clear sky", kind: "sunny" };
  if (code === 1) return { label: "Mainly clear", kind: "sunny" };
  if (code === 2) return { label: "Partly cloudy", kind: "cloudy" };
  if (code === 3) return { label: "Overcast", kind: "cloudy" };
  if ([45, 48].includes(code)) return { label: "Fog", kind: "cloudy" };
  if ([51, 53, 55].includes(code)) return { label: "Drizzle", kind: "rainy" };
  if ([56, 57].includes(code)) return { label: "Freezing drizzle", kind: "rainy" };
  if ([61, 63, 65].includes(code)) return { label: "Rain", kind: "rainy" };
  if ([66, 67].includes(code)) return { label: "Freezing rain", kind: "rainy" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", kind: "rainy" };
  if ([80, 81, 82].includes(code)) return { label: "Rain showers", kind: "rainy" };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", kind: "rainy" };
  return { label: "Conditions unavailable", kind: "sunny" };
}

export function AppProvider({ children }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [completedStays, setCompletedStays] = useState(readCompleted);
  const [persona, setPersona] = useState(readPersona);
  const [selectedWaypointIdState, setSelectedWaypointIdState] = useState(readWaypoint);
  const [weatherObservation, setWeatherObservation] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");
  const [manualRainOverride, setManualRainOverride] = useState(false);
  const [disruptions, setDisruptions] = useState([]);
  const [rescuePassContext, setRescuePassContext] = useState(readRescuePassAltitude);

  const selectedWaypoint = useMemo(
    () => CORRIDOR_WAYPOINTS.find((item) => item.id === selectedWaypointIdState) || CORRIDOR_WAYPOINTS.find((item) => item.id === DEFAULT_CORRIDOR_WAYPOINT_ID),
    [selectedWaypointIdState],
  );
  const selectedWaypointId = selectedWaypoint?.id || DEFAULT_CORRIDOR_WAYPOINT_ID;

  const savePreferences = useCallback((patch) => {
    setPreferences((previous) => {
      const next = { ...previous, ...(typeof patch === "function" ? patch(previous) : patch) };
      try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch { /* Session state remains usable if storage is unavailable. */ }
      return next;
    });
  }, []);

  const selectPersona = useCallback((id) => {
    const option = PERSONA_OPTIONS.find((item) => item.id === id);
    if (!option) return null;
    const next = { ...option, healthTags: [...option.healthTags] };
    setPersona(next);
    try { localStorage.setItem(PERSONA_KEY, JSON.stringify(next)); } catch { /* Keep the selection in memory for this session. */ }
    return next;
  }, []);

  const clearPersona = useCallback(() => {
    setPersona(null);
    try { localStorage.removeItem(PERSONA_KEY); } catch { /* In-memory state still clears. */ }
  }, []);

  const updateHealthTags = useCallback((tags) => {
    const allowed = ["BP", "heart", "asthma", "none"];
    setPersona((previous) => {
      if (!previous) return previous;
      const unique = [...new Set((Array.isArray(tags) ? tags : []).filter((tag) => allowed.includes(tag)))];
      const healthTags = unique.includes("none") ? ["none"] : (unique.length ? unique : ["none"]);
      const next = { ...previous, healthTags };
      try { localStorage.setItem(PERSONA_KEY, JSON.stringify(next)); } catch { /* Keep the session selection. */ }
      return next;
    });
  }, []);

  const setSelectedWaypointId = useCallback((id) => {
    if (!CORRIDOR_WAYPOINTS.some((item) => item.id === id)) return;
    setSelectedWaypointIdState(id);
    try { localStorage.setItem(WAYPOINT_KEY, JSON.stringify(id)); } catch { /* Selection remains in memory. */ }
  }, []);

  const toggleManualRainOverride = useCallback(() => {
    setManualRainOverride((previous) => !previous);
  }, []);

  const updateRescuePassAltitude = useCallback((payload = {}) => {
    setRescuePassContext((previous) => {
      const nextValues = {
        altitudeLevel: ["low", "moderate", "high"].includes(payload.level) ? payload.level : null,
        personaId: ["pilgrim", "trekker", "tourism-officer"].includes(payload.personaId) ? payload.personaId : null,
        elevationM: Number.isFinite(Number(payload.elevationM)) ? Math.max(0, Number(payload.elevationM)) : null,
        ascentPerDay: Number.isFinite(Number(payload.ascentPerDay)) ? Math.max(0, Number(payload.ascentPerDay)) : null,
      };
      if (
        previous.altitudeLevel === nextValues.altitudeLevel
        && previous.personaId === nextValues.personaId
        && previous.elevationM === nextValues.elevationM
        && previous.ascentPerDay === nextValues.ascentPerDay
      ) return previous;
      const next = { ...nextValues, updatedAt: new Date().toISOString() };
      try { localStorage.setItem(RESCUE_ALTITUDE_KEY, JSON.stringify(next)); } catch { /* Keep Rescue Pass context for this session. */ }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!selectedWaypoint) return undefined;
    const controller = new AbortController();
    let mounted = true;
    setWeatherLoading(true);
    setWeatherError("");

    const query = new URLSearchParams({
      latitude: String(selectedWaypoint.lat),
      longitude: String(selectedWaypoint.lon),
      current: "temperature_2m,apparent_temperature,precipitation,rain,showers,weather_code,wind_speed_10m",
      hourly: "precipitation_probability",
      timezone: "auto",
      forecast_days: "1",
    });
    fetch(`https://api.open-meteo.com/v1/forecast?${query.toString()}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Weather service returned an error.");
        return response.json();
      })
      .then((payload) => {
        const current = payload?.current;
        if (!current || !Number.isFinite(Number(current.temperature_2m))) throw new Error("Weather observation is incomplete.");
        const condition = describeWeatherCode(Number(current.weather_code));
        const hourlyTimes = Array.isArray(payload?.hourly?.time) ? payload.hourly.time : [];
        const currentHour = String(current.time || "").slice(0, 13);
        const probabilityIndex = hourlyTimes.findIndex((time) => String(time).slice(0, 13) === currentHour);
        const probabilityRaw = probabilityIndex >= 0 ? payload.hourly.precipitation_probability?.[probabilityIndex] : null;
        const precipitationProbability = probabilityRaw != null && Number.isFinite(Number(probabilityRaw)) ? Number(probabilityRaw) : null;
        if (!mounted) return;
        setWeatherObservation({
          waypointId: selectedWaypoint.id,
          temperatureC: Math.round(Number(current.temperature_2m)),
          apparentTemperatureC: Number.isFinite(Number(current.apparent_temperature)) ? Math.round(Number(current.apparent_temperature)) : null,
          precipitationMm: Number(current.precipitation || 0),
          precipitationProbability,
          rainMm: Number(current.rain || 0),
          windSpeedKmh: Number.isFinite(Number(current.wind_speed_10m)) ? Math.round(Number(current.wind_speed_10m)) : null,
          weatherCode: Number(current.weather_code),
          condition: condition.label,
          kind: condition.kind,
          observedAt: current.time || "",
        });
        setWeatherError("");
      })
      .catch((error) => {
        if (error?.name === "AbortError" || !mounted) return;
        setWeatherError("Live weather is unavailable. Check local conditions before travel.");
      })
      .finally(() => { if (mounted) setWeatherLoading(false); });

    return () => { mounted = false; controller.abort(); };
  }, [selectedWaypoint?.id, selectedWaypoint?.lat, selectedWaypoint?.lon]);

  const liveObservation = weatherObservation?.waypointId === selectedWaypointId ? weatherObservation : null;
  const weather = manualRainOverride ? "rainy" : (liveObservation?.kind === "rainy" ? "rainy" : "sunny");
  const weatherSource = manualRainOverride ? "demo" : "live";

  useEffect(() => {
    const rainDetected = Boolean(
      liveObservation && (
        Number(liveObservation.precipitationMm) > 0 ||
        Number(liveObservation.precipitationProbability) >= 60
      ),
    );
    const segment = segmentForWaypoint(selectedWaypointId);
    const disruptionId = "live-rain-" + segment[0] + "-" + segment[1];
    setDisruptions((current) => {
      const existing = current.find((item) => item.id === disruptionId && item.source === "live");
      if (!rainDetected) return current.filter((item) => !(item.type === "rain" && item.source === "live"));
      if (existing) return current;
      return [
        ...current.filter((item) => !(item.type === "rain" && item.source === "live")),
        {
          id: disruptionId,
          type: "rain",
          segment,
          severity: Number(liveObservation.precipitationProbability) >= 80 || Number(liveObservation.precipitationMm) >= 5 ? "high" : "moderate",
          source: "live",
          detectedAt: new Date().toISOString(),
        },
      ];
    });
  }, [liveObservation, selectedWaypointId]);

  useEffect(() => {
    const segment = segmentForWaypoint(selectedWaypointId);
    setDisruptions((current) => {
      const existing = current.find((item) => item.id === "demo-rain-override");
      if (!manualRainOverride) return current.filter((item) => item.id !== "demo-rain-override");
      if (existing && existing.segment?.[0] === segment[0] && existing.segment?.[1] === segment[1]) return current;
      return [
        ...current.filter((item) => item.id !== "demo-rain-override"),
        {
          id: "demo-rain-override",
          type: "rain",
          segment,
          severity: "moderate",
          source: "demo",
          detectedAt: new Date().toISOString(),
        },
      ];
    });
  }, [manualRainOverride, selectedWaypointId]);

  const simulateLandslide = useCallback(() => {
    const disruption = {
      id: "demo-landslide-rudraprayag-guptkashi",
      type: "landslide",
      segment: ["rudraprayag", "guptkashi"],
      severity: "high",
      source: "demo",
      detectedAt: new Date().toISOString(),
    };
    setDisruptions((current) => [
      ...current.filter((item) => item.id !== disruption.id),
      disruption,
    ]);
    return disruption;
  }, []);

  const clearDemoEvents = useCallback(() => {
    setManualRainOverride(false);
    setDisruptions((current) => current.filter((item) => item.source !== "demo"));
  }, []);

  const isOnboardingComplete = useCallback((stayId) => Boolean(stayId && completedStays.includes(String(stayId))), [completedStays]);
  const markOnboardingComplete = useCallback((stayId) => {
    if (!stayId) return;
    setCompletedStays((previous) => {
      const id = String(stayId);
      if (previous.includes(id)) return previous;
      const next = [...previous, id];
      try { localStorage.setItem(COMPLETED_KEY, JSON.stringify(next)); } catch { /* This only affects onboarding persistence. */ }
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    preferences, savePreferences, isOnboardingComplete, markOnboardingComplete,
    persona, selectPersona, clearPersona, updateHealthTags,
    corridorWaypoints: CORRIDOR_WAYPOINTS, selectedWaypoint, selectedWaypointId, setSelectedWaypointId,
    weather, weatherSource, weatherObservation: liveObservation, weatherLoading, weatherError,
    disruptions, simulateLandslide, clearDemoEvents,
    rescuePassContext, updateRescuePassAltitude,
    manualRainOverride, toggleManualRainOverride,
  }), [
    preferences, savePreferences, isOnboardingComplete, markOnboardingComplete,
    persona, selectPersona, clearPersona, updateHealthTags,
    selectedWaypoint, selectedWaypointId, setSelectedWaypointId, weather, weatherSource,
    liveObservation, weatherLoading, weatherError, disruptions, simulateLandslide, clearDemoEvents,
    rescuePassContext, updateRescuePassAltitude,
    manualRainOverride, toggleManualRainOverride,
  ]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppContext must be used inside AppProvider");
  return value;
}
