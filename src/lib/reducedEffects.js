import { useEffect, useState } from "react";

const STORAGE_KEY = "atithi-reduced-effects-v1";
let currentValue = null;
let listenersInstalled = false;

export function detectReducedEffects() {
  try {
    if (typeof navigator === "undefined") return false;
    const concurrency = Number(navigator.hardwareConcurrency);
    const memory = Number(navigator.deviceMemory);
    const lowConcurrency = Number.isFinite(concurrency) && concurrency > 0 && concurrency <= 4;
    const lowMemory = Number.isFinite(memory) && memory > 0 && memory <= 4;
    const reducedMotion = typeof window !== "undefined"
      && typeof window.matchMedia === "function"
      && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = navigator.connection?.saveData === true;
    return lowConcurrency || lowMemory || reducedMotion || saveData;
  } catch {
    return false;
  }
}

function readSavedPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed === "boolean" ? parsed : null;
  } catch {
    return null;
  }
}

function applyClass(enabled) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("reduced-effects", Boolean(enabled));
  }
}

function isTextEntry(target) {
  if (typeof Element === "undefined" || !(target instanceof Element)) return false;
  return target.matches('input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]), textarea, [contenteditable="true"]');
}

function installDocumentListeners() {
  if (listenersInstalled || typeof document === "undefined") return;
  listenersInstalled = true;
  const onVisibility = () => document.documentElement.classList.toggle("tab-hidden", document.hidden);
  document.addEventListener("visibilitychange", onVisibility);
  onVisibility();
  document.addEventListener("focusin", (event) => {
    if (isTextEntry(event.target)) document.documentElement.classList.add("keyboard-open");
  });
  document.addEventListener("focusout", () => {
    queueMicrotask(() => {
      if (!isTextEntry(document.activeElement)) document.documentElement.classList.remove("keyboard-open");
    });
  });
}

export function initializeReducedEffects() {
  installDocumentListeners();
  if (currentValue === null) currentValue = readSavedPreference() ?? detectReducedEffects();
  applyClass(currentValue);
  return currentValue;
}

export function getReducedEffects() {
  return currentValue === null ? (readSavedPreference() ?? detectReducedEffects()) : currentValue;
}

export function setReducedEffects(value) {
  const enabled = Boolean(value);
  currentValue = enabled;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled)); } catch { /* Private browsing may block storage; apply for this session. */ }
  applyClass(enabled);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("atithi:reduced-effects-change", { detail: { enabled } }));
  }
  return enabled;
}

export function useReducedEffects() {
  const [enabled, setEnabled] = useState(() => initializeReducedEffects());
  useEffect(() => {
    const update = (event) => setEnabled(typeof event.detail?.enabled === "boolean" ? event.detail.enabled : getReducedEffects());
    window.addEventListener("atithi:reduced-effects-change", update);
    return () => window.removeEventListener("atithi:reduced-effects-change", update);
  }, []);
  return [enabled, setReducedEffects];
}
