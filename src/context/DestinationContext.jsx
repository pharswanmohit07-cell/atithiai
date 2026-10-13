import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DESTINATION_ID, DESTINATIONS, getDestinationById } from "../data/destinations/index.js";

const DestinationContext = createContext(null);
const DESTINATION_KEY = "atithi-destination-id";
const CACHED_DEMO_KEY = "atithi-cached-demo-mode";

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

function initialDestinationId() {
  const stored = readStored(DESTINATION_KEY, DEFAULT_DESTINATION_ID);
  return getDestinationById(stored)?.id || DEFAULT_DESTINATION_ID;
}

function describeWeather(code) {
  if ([0].includes(code)) return { label: "Clear", kind: "clear" };
  if ([1, 2].includes(code)) return { label: "Partly cloudy", kind: "cloudy" };
  if ([3].includes(code)) return { label: "Overcast", kind: "cloudy" };
  if ([45, 48].includes(code)) return { label: "Fog", kind: "cloudy" };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rain", kind: "rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", kind: "snow" };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", kind: "storm" };
  return { label: "Conditions unavailable", kind: "unknown" };
}

export function DestinationProvider({ children }) {
  const [destinationId, setDestinationId] = useState(initialDestinationId);
  const [cachedDemoMode, setCachedDemoModeState] = useState(() => readStored(CACHED_DEMO_KEY, false) === true);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState("");

  const destination = useMemo(() => getDestinationById(destinationId), [destinationId]);

  const selectDestination = useCallback((id) => {
    const match = getDestinationById(id);
    if (!match) return false;
    setDestinationId(match.id);
    try { localStorage.setItem(DESTINATION_KEY, JSON.stringify(match.id)); } catch { /* Selection remains active for this session. */ }
    return true;
  }, []);

  const setCachedDemoMode = useCallback((enabled) => {
    const next = Boolean(enabled);
    setCachedDemoModeState(next);
    try { localStorage.setItem(CACHED_DEMO_KEY, JSON.stringify(next)); } catch { /* Session-only mode still works when storage is blocked. */ }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);
    let active = true;
    setWeatherLoading(true);
    setWeatherError("");

    const params = new URLSearchParams({
      latitude: String(destination.lat),
      longitude: String(destination.lon),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
      timezone: destination.timezone,
    });

    fetch("https://api.open-meteo.com/v1/forecast?" + params.toString(), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Weather service unavailable");
        return response.json();
      })
      .then((payload) => {
        const current = payload?.current;
        if (!current || !Number.isFinite(Number(current.temperature_2m))) throw new Error("Weather response incomplete");
        const condition = describeWeather(Number(current.weather_code));
        if (!active) return;
        setWeather({
          destinationId: destination.id,
          temperatureC: Math.round(Number(current.temperature_2m)),
          feelsLikeC: Number.isFinite(Number(current.apparent_temperature)) ? Math.round(Number(current.apparent_temperature)) : null,
          humidity: Number.isFinite(Number(current.relative_humidity_2m)) ? Number(current.relative_humidity_2m) : null,
          precipitationMm: Number.isFinite(Number(current.precipitation)) ? Number(current.precipitation) : null,
          windKmh: Number.isFinite(Number(current.wind_speed_10m)) ? Math.round(Number(current.wind_speed_10m)) : null,
          condition: condition.label,
          kind: condition.kind,
          observedAt: String(current.time || ""),
          source: "live",
        });
      })
      .catch((error) => {
        if (!active) return;
        setWeatherError(error?.name === "AbortError"
          ? "Live weather timed out. Check a trusted forecast before making plans."
          : "Live weather is temporarily unavailable. Check local conditions before making plans.");
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) setWeatherLoading(false);
      });

    return () => {
      active = false;
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [destination.id, destination.lat, destination.lon, destination.timezone]);

  const formatCurrency = useCallback((amount, options = {}) => {
    const value = Number(amount);
    if (!Number.isFinite(value)) return "Not available";
    try {
      return new Intl.NumberFormat(destination.locale, {
        style: "currency",
        currency: destination.currency.code,
        maximumFractionDigits: destination.currency.code === "IDR" ? 0 : 2,
        ...options,
      }).format(value);
    } catch {
      return new Intl.NumberFormat(destination.locale, { maximumFractionDigits: 2 }).format(value) + " " + destination.currency.code;
    }
  }, [destination.currency.code, destination.locale]);

  const value = useMemo(() => ({
    destination,
    destinations: DESTINATIONS,
    selectDestination,
    formatCurrency,
    weather: weather?.destinationId === destination.id ? weather : null,
    weatherLoading,
    weatherError,
    cachedDemoMode,
    setCachedDemoMode,
  }), [destination, selectDestination, formatCurrency, weather, weatherLoading, weatherError, cachedDemoMode, setCachedDemoMode]);

  return <DestinationContext.Provider value={value}>{children}</DestinationContext.Provider>;
}

export function useDestination() {
  const value = useContext(DestinationContext);
  if (!value) throw new Error("useDestination must be used inside DestinationProvider");
  return value;
}
