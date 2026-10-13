import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const AppContext = createContext(null);
const PREFS_KEY = "atithi-preferences";
const COMPLETED_KEY = "atithi-onboarding-complete";
export const DEFAULT_PREFERENCES = {
  interests: ["nature", "culture"], travelStyle: "couple", pace: "balanced", dietaryPreference: "No preference",
};
function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
    if (saved && typeof saved === "object") return { ...DEFAULT_PREFERENCES, ...saved };
  } catch { /* Use defaults if stored preferences are invalid. */ }
  return { ...DEFAULT_PREFERENCES };
}
function readCompleted() {
  try {
    const value = JSON.parse(localStorage.getItem(COMPLETED_KEY) || "[]");
    return Array.isArray(value) ? value.map(String) : [];
  } catch { return []; }
}
export function AppProvider({ children }) {
  const [preferences, setPreferences] = useState(readPreferences);
  const [completedStays, setCompletedStays] = useState(readCompleted);
  const savePreferences = useCallback((patch) => {
    setPreferences((previous) => {
      const next = { ...previous, ...(typeof patch === "function" ? patch(previous) : patch) };
      localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const isOnboardingComplete = useCallback((stayId) => Boolean(stayId && completedStays.includes(String(stayId))), [completedStays]);
  const markOnboardingComplete = useCallback((stayId) => {
    if (!stayId) return;
    setCompletedStays((previous) => {
      const id = String(stayId);
      if (previous.includes(id)) return previous;
      const next = [...previous, id];
      localStorage.setItem(COMPLETED_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const value = useMemo(() => ({ preferences, savePreferences, isOnboardingComplete, markOnboardingComplete }), [preferences, savePreferences, isOnboardingComplete, markOnboardingComplete]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
export function useAppContext() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useAppContext must be used inside AppProvider");
  return value;
}
