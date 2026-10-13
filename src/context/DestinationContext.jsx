import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_DESTINATION_ID, DESTINATIONS, getDestinationById } from "../data/destinations/index.js";
import { demoFetch } from "../lib/demoCache.js";

const DestinationContext = createContext(null);
const DESTINATION_KEY = "atithi-destination-id";

function readStoredId() {
  try {
    const saved = localStorage.getItem(DESTINATION_KEY);
    return getDestinationById(saved)?.id || DEFAULT_DESTINATION_ID;
  } catch {
    return DEFAULT_DESTINATION_ID;
  }
}

function describeWeather(code) {
  if (code === 0) return { label: "Clear", kind: "clear" };
  if ([1, 2].includes(code)) return { label: "Partly cloudy", kind: "cloudy" };
  if (code === 3) return { label: "Overcast", kind: "cloudy" };
  if ([45, 48].includes(code)) return { label: "Fog", kind: "cloudy" };
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { label: "Rain", kind: "rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { label: "Snow", kind: "snow" };
  if ([95, 96, 99].includes(code)) return { label: "Thunderstorm", kind: "storm" };
  return { label: "Conditions unavailable", kind: "unknown" };
}

export function DestinationProvider({ children }) {
  const [destinationId, setDestinationId] = useState(readStoredId);
  const destination = useMemo(() => getDestinationById(destinationId), [destinationId]);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  const selectDestination = useCallback((id) => {
    const match = getDestinationById(id);
    if (!match) return false;
    if (match.id === destinationId) return true;
    setDestinationId(match.id);
    try { localStorage.setItem(DESTINATION_KEY, match.id); } catch { /* Selection remains active in this tab. */ }
    return true;
  }, [destinationId]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--destination-accent", destination.themeColors.accent);
    root.style.setProperty("--destination-accent-soft", destination.themeColors.accentSoft);
    const hex = destination.themeColors.accent.replace("#", "");
    if (/^[0-9a-f]{6}$/i.test(hex)) {
      const channels = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
      root.style.setProperty("--destination-accent-rgb", channels.join(" "));
    }
  }, [destination]);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), 5500);
    setWeather(null);
    setWeatherLoading(true);
    setWeatherError("");
    const params = new URLSearchParams({
      latitude: String(destination.lat),
      longitude: String(destination.lon),
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m",
      timezone: destination.timezone
    });

    demoFetch("https://api.open-meteo.com/v1/forecast?" + params.toString(), { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Weather is unavailable.");
        return response.json();
      })
      .then((payload) => {
        const current = payload?.current;
        if (!current || !Number.isFinite(Number(current.temperature_2m))) throw new Error("Weather response was incomplete.");
        const condition = describeWeather(Number(current.weather_code));
        if (!active) return;
        setWeather({
          destinationId: destination.id,
          temperatureC: Number(current.temperature_2m),
          feelsLikeC: Number.isFinite(Number(current.apparent_temperature)) ? Number(current.apparent_temperature) : null,
          humidity: Number.isFinite(Number(current.relative_humidity_2m)) ? Number(current.relative_humidity_2m) : null,
          precipitationMm: Number.isFinite(Number(current.precipitation)) ? Number(current.precipitation) : null,
          windKmh: Number.isFinite(Number(current.wind_speed_10m)) ? Number(current.wind_speed_10m) : null,
          condition: condition.label,
          kind: condition.kind,
          observedAt: String(current.time || ""),
          source: response.headers.get("X-Atithi-Cache") === "demo" ? "cached-demo" : "live"
        });
      })
      .catch((error) => {
        if (!active) return;
        setWeatherError(error?.name === "AbortError"
          ? "Live weather timed out. Check a trusted forecast before going out."
          : "Live weather is temporarily unavailable. Check local conditions before going out.");
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
    if (!Number.isFinite(value)) return "—";
    try {
      return new Intl.NumberFormat(destination.locale, {
        style: "currency",
        currency: destination.currency.code,
        maximumFractionDigits: ["IDR", "JPY", "KRW", "VND", "CLP"].includes(destination.currency.code) ? 0 : 2,
        ...options
      }).format(value);
    } catch {
      return new Intl.NumberFormat(destination.locale, { maximumFractionDigits: 2 }).format(value) + " " + destination.currency.code;
    }
  }, [destination.currency.code, destination.locale]);

  const formatNumber = useCallback((value, options = {}) => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "—";
    return new Intl.NumberFormat(destination.locale, options).format(number);
  }, [destination.locale]);

  const value = useMemo(() => ({
    destination, destinations: DESTINATIONS, selectDestination, formatCurrency, formatNumber,
    mapCenter: [destination.lat, destination.lon],
    weather: weather?.destinationId === destination.id ? weather : null,
    weatherLoading, weatherError, emergencyNumber: destination.emergencyNumber
  }), [destination, selectDestination, formatCurrency, formatNumber, weather, weatherLoading, weatherError]);

  return <DestinationContext.Provider value={value}>{children}</DestinationContext.Provider>;
}

export function useDestination() {
  const context = useContext(DestinationContext);
  if (!context) throw new Error("useDestination must be used within DestinationProvider");
  return context;
}
