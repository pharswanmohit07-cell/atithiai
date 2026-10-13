import React, { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, LoaderCircle, Send, Volume2, VolumeX } from "lucide-react";
import { getSeedLensResult } from "../../data/lensCache.js";
import { useDestination } from "../../context/DestinationContext.jsx";
import { LANGUAGE_OPTIONS, readLanguagePreference, storeLanguagePreference, t, targetLanguageTag } from "../../i18n.js";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const LANGUAGE_KEY = "atithi-lens-language";
const LOCATION_KEY = "atithi-lens-location";
const SAMPLES = [
  { id: "sample-menu", src: "/samples/generic-menu.jpg", titleKey: "sampleMenu", fallbackId: "sample-menu", mode: "menu" },
  { id: "sample-taxi", src: "/samples/fare-board.jpg", titleKey: "sampleFare", fallbackId: "sample-taxi", mode: "price" },
  { id: "sample-service", src: "/samples/notice-sign.jpg", titleKey: "sampleNotice", fallbackId: "sample-service", mode: "general" }
];

function fallbackResult(language, mode) {
  const message = t("noText", language);
  const common = {
    mode,
    detectedLanguage: "unknown",
    detectedText: "",
    translation: message,
    summary: message,
    confidence: "low",
    disclaimer: t("disclaimer", language),
    source: "safe-fallback"
  };
  if (mode === "menu") return { ...common, dishes: [], estimateNotice: t("estimateNotice", language) };
  if (mode === "price") return { ...common, visiblePrices: [], roughRange: "", verdict: "Can't tell", explanation: t("priceBasis", language) };
  return common;
}

function normalizeCached(value, language, mode) {
  if (!value) return fallbackResult(language, mode);
  const result = {
    ...value,
    mode,
    detectedLanguage: value.detectedLanguage || value.language || "unknown",
    detectedText: value.detectedText || (Array.isArray(value.visiblePrices) ? value.visiblePrices.join("\n") : ""),
    translation: value.translation || value.summary || t("noText", language),
    summary: value.summary || value.translation || t("noText", language),
    disclaimer: value.disclaimer || t("disclaimer", language),
    source: value.source || "cached-demo-result"
  };
  if (mode === "menu" && !Array.isArray(result.dishes)) result.dishes = [];
  if (mode === "price") {
    if (!Array.isArray(result.visiblePrices)) result.visiblePrices = [];
    if (!result.verdict && value.fairPrice?.verdict) result.verdict = value.fairPrice.verdict;
    result.verdict = result.verdict || "Can't tell";
    result.roughRange = result.roughRange || value.fairPrice?.roughRange || "";
    result.explanation = result.explanation || value.fairPrice?.explanation || t("priceBasis", language);
  }
  return result;
}

function readStoredLocation(destination) {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCATION_KEY) || "null");
    if (saved && typeof saved === "object") {
      return {
        city: typeof saved.city === "string" ? saved.city : destination.city,
        country: typeof saved.country === "string" ? saved.country : destination.country,
        currency: /^[A-Za-z]{3}$/.test(saved.currency || "") ? saved.currency.toUpperCase() : destination.currency.code
      };
    }
  } catch {
    // The selected destination is a safe default if storage is unavailable.
  }
  return { city: destination.city, country: destination.country, currency: destination.currency.code };
}

async function resizeImage(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The image could not be opened."));
      element.src = objectUrl;
    });
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image conversion is unavailable in this browser.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    let dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    if (dataUrl.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 100) dataUrl = canvas.toDataURL("image/jpeg", 0.62);
    const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
    if (!base64 || base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) {
      throw new Error("This image is still too large after resizing. Choose a smaller photo.");
    }
    return { dataUrl, base64, mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getLocalResult(id, language, mode) {
  try {
    const cached = localStorage.getItem("atithi-lens-" + id);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.summary === "string") return normalizeCached({ ...parsed, source: "cached-demo-result" }, language, mode);
    }
  } catch {
    // A seeded result still works when browser storage is unavailable.
  }
  return normalizeCached(getSeedLensResult(id, language), language, mode);
}

function saveLocalResult(id, result) {
  try { localStorage.setItem("atithi-lens-" + id, JSON.stringify(result)); } catch { /* Keep the result usable for this session. */ }
}

function formatMoneyRange(result, currency, locale) {
  if (result?.roughRange) return result.roughRange;
  if (!Number.isFinite(result?.rangeLow)) return "";
  const high = Number.isFinite(result?.rangeHigh) ? result.rangeHigh : result.rangeLow;
  try {
    const format = new Intl.NumberFormat(locale, {
      style: "currency", currency,
      maximumFractionDigits: ["IDR", "JPY", "KRW", "VND", "CLP"].includes(currency) ? 0 : 2
    });
    return result.rangeLow === high ? format.format(result.rangeLow) : format.format(result.rangeLow) + " – " + format.format(high);
  } catch {
    return result.rangeLow === high ? result.rangeLow + " " + currency : result.rangeLow + "–" + high + " " + currency;
  }
}

function verdictLabel(verdict, language) {
  if (verdict === "Looks fair") return t("fair", language);
  if (verdict === "Possibly overpriced") return t("overpriced", language);
  return t("cannotTell", language);
}

export default function LensTab({ onRequest }) {
  const { destination, cachedDemoMode } = useDestination();
  const inputRef = useRef(null);
  const [language, setLanguage] = useState(() => readLanguagePreference(LANGUAGE_KEY, true));
  const [mode, setMode] = useState("general");
  const [location, setLocation] = useState(() => readStoredLocation(destination));
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reported, setReported] = useState(false);
  const [sampleId, setSampleId] = useState(null);
  const [speechStatus, setSpeechStatus] = useState("");
  const [speaking, setSpeaking] = useState(false);
  const ui = useMemo(() => ({
    title: t("lensTitle", language),
    intro: t("lensIntro", language)
  }), [language]);

  const persistLocation = (next) => {
    setLocation(next);
    try { localStorage.setItem(LOCATION_KEY, JSON.stringify(next)); } catch { /* State remains active for the session. */ }
  };

  const analyse = async (selectedImage, selectedMode = mode, selectedLanguage = language) => {
    if (!selectedImage) return;
    if (cachedDemoMode) {
      setResult(fallbackResult(selectedLanguage, selectedMode));
      setError(t("imageFailed", selectedLanguage));
      return;
    }
    setLoading(true);
    setError("");
    setSpeechStatus("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch("/api/lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: selectedImage.base64,
          mimeType: selectedImage.mimeType,
          targetLanguage: targetLanguageTag(selectedLanguage),
          mode: selectedMode,
          city: location.city.trim(),
          country: location.country.trim(),
          currency: location.currency.toUpperCase(),
          locale: destination.locale
        })
      });
      let payload = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (response.ok && payload && typeof payload.mode === "string") {
        setResult(normalizeCached(payload, selectedLanguage, selectedMode));
        if (payload.source === "safe-fallback") setError(t("imageFailed", selectedLanguage));
      } else {
        setResult(fallbackResult(selectedLanguage, selectedMode));
        setError(typeof payload?.error === "string" ? payload.error : t("imageFailed", selectedLanguage));
      }
    } catch (caught) {
      setResult(fallbackResult(selectedLanguage, selectedMode));
      setError(caught?.name === "AbortError" ? t("timedOut", selectedLanguage) : t("imageFailed", selectedLanguage));
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  };

  const useFile = async (file, selectedSample = null, selectedMode = mode) => {
    setResult(null);
    setError("");
    setSampleId(selectedSample);
    setReported(false);
    setSpeechStatus("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError(t("chooseSupportedImage", language));
      return;
    }
    try {
      const resized = await resizeImage(file);
      setImage(resized);
      if (selectedSample && cachedDemoMode) {
        const cached = getLocalResult(selectedSample, language, selectedMode);
        setResult(cached);
        setError("");
        return;
      }
      await analyse(resized, selectedMode);
    } catch (caught) {
      setImage(null);
      setResult(fallbackResult(language, mode));
      setError(caught instanceof Error ? caught.message : t("imageFailed", language));
    }
  };

  const chooseImage = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    setSampleId(null);
    void useFile(file);
  };

  const showSample = async (sample) => {
    setResult(null);
    setImage(null);
    setError("");
    setSampleId(sample.id);
    setMode(sample.mode);
    setReported(false);
    setSpeechStatus("");
    setLoading(true);
    try {
      const response = await fetch(sample.src, { cache: "no-store" });
      if (!response.ok) throw new Error("Sample image has not been added.");
      const blob = await response.blob();
      const namedBlob = new File([blob], sample.src.split("/").pop(), { type: blob.type || "image/jpeg" });
      await useFile(namedBlob, sample.fallbackId, sample.mode);
    } catch {
      const cached = getLocalResult(sample.fallbackId, language, sample.mode);
      setResult(cached);
      setError(t("sampleUnavailable", language));
      setImage(null);
    } finally {
      setLoading(false);
    }
  };

  const changeLanguage = (next) => {
    setLanguage(next);
    storeLanguagePreference(LANGUAGE_KEY, next);
    setSpeechStatus("");
    if (image && !cachedDemoMode) void analyse(image, mode, next);
    else if (sampleId) setResult(getLocalResult(sampleId, next, mode));
    else if (result) setResult(fallbackResult(next, mode));
  };

  const changeMode = (next) => {
    setMode(next);
    setReported(false);
    setSpeechStatus("");
    if (image) void analyse(image, next);
    else if (sampleId) setResult(getLocalResult(sampleId, language, next));
    else if (result) setResult(fallbackResult(language, next));
  };

  const speak = () => {
    const textToSpeak = result?.translation || result?.summary || "";
    if (!textToSpeak.trim() || typeof window === "undefined" || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechStatus(t("voiceUnavailable", language));
      return;
    }
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      setSpeechStatus("");
      return;
    }
    const voices = window.speechSynthesis.getVoices();
    const desiredTag = targetLanguageTag(language).toLowerCase();
    const voice = voices.find((item) => item.lang?.toLowerCase() === desiredTag)
      || voices.find((item) => item.lang?.toLowerCase().startsWith(language.toLowerCase() + "-"))
      || voices.find((item) => item.lang?.toLowerCase().split("-")[0] === language.toLowerCase());
    if (!voice) {
      setSpeechStatus(t("voiceUnavailable", language));
      return;
    }
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.lang = voice.lang || targetLanguageTag(language);
    utterance.voice = voice;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setSpeechStatus(t("voiceUnavailable", language));
    };
    setSpeechStatus("");
    setSpeaking(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const askHotel = () => {
    if (!result) return;
    const details = [
      "Lens mode: " + mode,
      "Location entered: " + [location.city, location.country].filter(Boolean).join(", "),
      "Currency: " + location.currency,
      "Detected language: " + (result.detectedLanguage || "unknown"),
      "Visible text: " + (result.detectedText || "No clear text could be read."),
      "Translation: " + (result.translation || result.summary || "No translation available."),
      mode === "price" ? "Price verdict: " + (result.verdict || "Can't tell") + "; visible-price range: " + formatMoneyRange(result, location.currency, destination.locale) : "",
      "Source: " + (result.source || "local fallback") + ". AI estimate only; staff should verify locally. No provider was contacted by the scan."
    ].filter(Boolean).join("\n");
    onRequest?.({
      title: "Lens question for hotel review",
      category: "Atithi Lens",
      detail: details
    });
    setReported(true);
  };

  const visiblePrices = Array.isArray(result?.visiblePrices) ? result.visiblePrices : [];
  const dishes = Array.isArray(result?.dishes) ? result.dishes : [];
  const formattedRange = formatMoneyRange(result, location.currency, destination.locale);

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-2"><ImagePlus size={19} className="text-accent-text" /><h3 className="font-serif text-xl">{ui.title}</h3></div>
        <p className="mt-1 text-xs leading-relaxed text-muted">{ui.intro}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-bg p-3 sm:grid-cols-3">
        <label className="block text-xs font-bold text-text">{t("city", language)}
          <input value={location.city} maxLength={100} onChange={(event) => persistLocation({ ...location, city: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-text" />
        </label>
        <label className="block text-xs font-bold text-text">{t("country", language)}
          <input value={location.country} maxLength={100} onChange={(event) => persistLocation({ ...location, country: event.target.value })} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal text-text" />
        </label>
        <label className="block text-xs font-bold text-text">{t("currency", language)}
          <input value={location.currency} maxLength={3} pattern="[A-Za-z]{3}" onChange={(event) => persistLocation({ ...location, currency: event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3) })} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal uppercase text-text" />
        </label>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex items-center gap-2 text-xs font-bold text-text" htmlFor="lens-language">{t("targetLanguage", language)}
          <select id="lens-language" value={language} onChange={(event) => changeLanguage(event.target.value)} className="min-h-10 rounded-lg border border-border bg-bg px-3 py-2 text-sm font-semibold">
            {LANGUAGE_OPTIONS.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
          </select>
        </label>
        <div className="inline-flex rounded-xl border border-border bg-bg p-1" role="group" aria-label="Lens mode">
          {[["general", "scan"], ["menu", "menu"], ["price", "price"]].map(([value, key]) => <button key={value} type="button" onClick={() => changeMode(value)} aria-pressed={mode === value} className={"min-h-9 rounded-lg px-3 py-1.5 text-xs font-bold " + (mode === value ? "bg-brand text-white" : "text-muted hover:bg-surface-2")}>{t(key, language)}</button>)}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface p-3">
        <h4 className="text-xs font-bold text-text">{t("samplePhotos", language)}</h4>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {SAMPLES.map((sample) => <button key={sample.id} type="button" onClick={() => void showSample(sample)} className="min-h-16 rounded-xl border border-border bg-bg p-3 text-left hover:bg-surface-2">
            <img src={sample.src} alt={t(sample.titleKey, language)} onError={(event) => { event.currentTarget.hidden = true; }} className="mb-2 h-20 w-full rounded-lg object-cover" />
            <span className="block text-sm font-bold text-text">{t(sample.titleKey, language)}</span>
            <span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-accent-text">{t("samplePhotos", language)} <CheckCircle2 size={12} /></span>
          </button>)}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-bg p-3">
        <label className="block text-xs font-bold text-text" htmlFor="lens-image">{t("uploadPhoto", language)}</label>
        <p className="mt-1 text-xs text-muted">{t("photoHelp", language)}</p>
        <input id="lens-image" ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="mt-3 block w-full text-xs text-muted file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
        {image && <img src={image.dataUrl} alt="Selected menu, fare board or notice preview" className="mt-3 max-h-48 max-w-full rounded-lg border border-border object-contain" />}
      </div>

      {loading && <p role="status" className="inline-flex items-center gap-2 text-sm text-muted"><LoaderCircle size={15} className="animate-spin" />{t("reading", language)}</p>}
      {error && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"><AlertCircle size={14} className="mr-1 inline" />{error}</p>}

      {result && <article className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border px-2.5 py-1 text-[9px] font-bold uppercase text-muted">{result.source === "ai-estimate" ? "AI estimate" : "Cached / fallback result"}</span>
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold">{result.confidence === "low" ? "Low confidence" : result.confidence === "high" ? "High confidence" : "Medium confidence"}</span>
        </div>
        {result.detectedLanguage && result.detectedLanguage !== "unknown" && <p className="mt-3 text-[10px] text-muted">{t("detectedLanguage", language)}: {result.detectedLanguage}</p>}
        <h4 className="mt-3 text-sm font-bold">{t("originalText", language)}</h4>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{result.detectedText || result.summary || t("noText", language)}</p>
        <h4 className="mt-3 text-sm font-bold">{t("translation", language)}</h4>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-text">{result.translation || result.summary || t("noText", language)}</p>
        {result.summary && result.summary !== result.translation && <><h4 className="mt-3 text-sm font-bold">{t("imageSummary", language)}</h4><p className="mt-1 text-sm leading-relaxed text-muted">{result.summary}</p></>}

        {mode === "menu" && <div className="mt-3">
          <h4 className="text-sm font-bold">{t("dishDetails", language)}</h4>
          <p className="mt-1 text-[10px] font-bold text-accent-text">{result.estimateNotice || t("estimateNotice", language)}</p>
          {dishes.length ? <div className="mt-2 space-y-2">{dishes.map((dish, index) => <div key={dish.name + "-" + index} className="rounded-xl border border-border bg-bg p-3"><h5 className="text-sm font-bold">{dish.name}</h5><p className="mt-1 text-xs leading-relaxed text-muted">{dish.explanation}</p><p className="mt-2 text-xs"><span className="font-bold">{t("dietGuess", language)}:</span> <span className="text-muted">{dish.dietGuess}</span></p><p className="mt-1 text-xs"><span className="font-bold">{t("spiceGuess", language)}:</span> <span className="text-muted">{dish.spiceGuess}</span></p><p className="mt-2 text-[10px] text-muted">{t("estimateNotice", language)}</p></div>)}</div> : <p className="mt-2 text-xs text-muted">{t("noText", language)}</p>}
        </div>}

        {mode === "price" && <div className="mt-3 rounded-xl border border-border bg-bg p-3">
          <h4 className="text-sm font-bold">{t("priceRange", language)}</h4>
          <p className="mt-1 text-lg font-bold">{formattedRange || "—"}</p>
          {visiblePrices.length > 0 && <><h5 className="mt-3 text-xs font-bold">{t("visiblePrices", language)}</h5><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted">{visiblePrices.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
          <p className="mt-3 inline-flex rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold">{t("verdict", language)}: {verdictLabel(result.verdict || "Can't tell", language)}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{result.explanation || t("priceBasis", language)}</p>
          <p className="mt-2 text-[10px] leading-relaxed text-muted">{t("priceBasis", language)}</p>
        </div>}

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={speak} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold text-text">{speaking ? <VolumeX size={14} /> : <Volume2 size={14} />}{speaking ? t("stopSpeaking", language) : t("speak", language)}</button>
          <button type="button" onClick={askHotel} disabled={reported} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white disabled:cursor-default disabled:opacity-70"><Send size={14} />{reported ? t("requestSent", language) : t("askHotel", language)}</button>
        </div>
        {speechStatus && <p role="status" className="mt-2 text-xs leading-relaxed text-muted">{speechStatus}</p>}
        <p className="mt-3 text-[10px] leading-relaxed text-muted">{t("disclaimer", language)}</p>
      </article>}
      {cachedDemoMode && <p className="text-[10px] leading-relaxed text-muted">Cached demo mode is on; photos are not sent to the image service.</p>}
    </section>
  );
}
