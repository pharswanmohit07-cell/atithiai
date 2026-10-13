import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { getDefaultLanguage } from "../i18n.js";

const STORAGE_KEY = "atithi-traveler-profile-v1";
const ProfileContext = createContext(null);
export const PROFILE_INTERESTS = Object.freeze(["nature", "food", "culture", "craft", "wellness", "nightlife", "quiet"]);
export const PROFILE_DIETS = Object.freeze([
  { value: "none", label: "No restriction" },
  { value: "veg", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "non-veg", label: "Non-vegetarian" },
  { value: "halal", label: "Halal" },
  { value: "gluten-aware", label: "Gluten-aware" }
]);
export const PROFILE_LANGUAGES = Object.freeze([
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ar", label: "Arabic" },
  { code: "zh", label: "Chinese" },
  { code: "pt", label: "Portuguese" },
  { code: "id", label: "Indonesian" }
]);

export const DEFAULT_PROFILE = Object.freeze({
  interests: [],
  diet: "none",
  spiceTolerance: 2,
  dailyBudget: { level: "medium", amount: null, currencyCode: null },
  pace: "balanced",
  travelParty: "solo",
  avoidCrowds: false,
  languages: [getDefaultLanguage()],
  onboardingComplete: false
});

function normalizeProfile(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const budget = input.dailyBudget && typeof input.dailyBudget === "object" ? input.dailyBudget : {};
  const languages = Array.isArray(input.languages)
    ? [...new Set(input.languages.filter((language) => PROFILE_LANGUAGES.some((item) => item.code === language)))].slice(0, 3)
    : [];
  const amount = budget.amount === "" || budget.amount == null ? null : Number(budget.amount);
  return {
    interests: Array.isArray(input.interests)
      ? [...new Set(input.interests.filter((item) => PROFILE_INTERESTS.includes(item)))].slice(0, PROFILE_INTERESTS.length)
      : [],
    diet: PROFILE_DIETS.some((item) => item.value === input.diet) ? input.diet : "none",
    spiceTolerance: Number.isFinite(Number(input.spiceTolerance)) ? Math.max(1, Math.min(3, Math.round(Number(input.spiceTolerance)))) : 2,
    dailyBudget: {
      level: ["low", "medium", "high"].includes(budget.level) ? budget.level : "medium",
      amount: Number.isFinite(amount) && amount > 0 ? Math.min(amount, 1e12) : null,
      currencyCode: typeof budget.currencyCode === "string" && /^[A-Z]{3}$/.test(budget.currencyCode.toUpperCase()) ? budget.currencyCode.toUpperCase() : null
    },
    pace: ["relaxed", "balanced", "packed"].includes(input.pace) ? input.pace : "balanced",
    travelParty: ["solo", "couple", "family", "friends"].includes(input.travelParty) ? input.travelParty : "solo",
    avoidCrowds: input.avoidCrowds === true,
    languages: languages.length ? languages : [getDefaultLanguage()],
    onboardingComplete: input.onboardingComplete === true
  };
}
function safeReadProfile() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return normalizeProfile(raw ? JSON.parse(raw) : DEFAULT_PROFILE);
  } catch {
    return normalizeProfile(DEFAULT_PROFILE);
  }
}

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(safeReadProfile);
  const updateProfile = useCallback((patch) => {
    setProfile((current) => {
      const next = normalizeProfile({ ...current, ...patch, dailyBudget: patch?.dailyBudget ? { ...current.dailyBudget, ...patch.dailyBudget } : current.dailyBudget });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Profile edits remain available for this session. */ }
      return next;
    });
  }, []);
  const toggleInterest = useCallback((interest) => {
    setProfile((current) => {
      if (!PROFILE_INTERESTS.includes(interest)) return current;
      const interests = current.interests.includes(interest)
        ? current.interests.filter((item) => item !== interest)
        : [...current.interests, interest];
      const next = normalizeProfile({ ...current, interests });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep session state even without storage. */ }
      return next;
    });
  }, []);
  const toggleLanguage = useCallback((language) => {
    setProfile((current) => {
      if (!PROFILE_LANGUAGES.some((item) => item.code === language)) return current;
      const languages = current.languages.includes(language)
        ? current.languages.filter((item) => item !== language)
        : current.languages.length < 3 ? [...current.languages, language] : current.languages;
      const next = normalizeProfile({ ...current, languages });
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep session state even without storage. */ }
      return next;
    });
  }, []);
  const finishOnboarding = useCallback(() => updateProfile({ onboardingComplete: true }), [updateProfile]);
  const restartOnboarding = useCallback(() => updateProfile({ onboardingComplete: false }), [updateProfile]);
  const value = useMemo(() => ({
    profile, updateProfile, toggleInterest, toggleLanguage, finishOnboarding, restartOnboarding
  }), [profile, updateProfile, toggleInterest, toggleLanguage, finishOnboarding, restartOnboarding]);
  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) throw new Error("useProfile must be used within ProfileProvider");
  return context;
}
