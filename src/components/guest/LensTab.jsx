import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Languages, LoaderCircle, RefreshCw, Upload, Volume2 } from "lucide-react";
import { getSeedLensResult } from "../../data/lensCache.js";

const CACHE_PREFIX = "atithi-lens-sample:";
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const SAMPLE_PHOTOS = [
  { id: "sample-taxi", title: "Taxi fare board", titleHi: "टैक्सी किराया बोर्ड", src: "/samples/sample-taxi.jpg", imageType: "taxi" },
  { id: "sample-menu", title: "Menu with prices", titleHi: "कीमतों वाला मेन्यू", src: "/samples/sample-menu.jpg", imageType: "menu" },
  { id: "sample-temple", title: "Temple notice board", titleHi: "मंदिर सूचना-पट", src: "/samples/sample-temple.jpg", imageType: "temple" },
];

const COPY = {
  en: {
    title: "Atithi Lens",
    subtitle: "Read a price board. Know what to ask.",
    trySample: "Try a sample",
    upload: "Take a photo or choose an image",
    supported: "JPEG, PNG or WebP · up to 3 MB",
    analyze: "Analyse image",
    analyzing: "Reading the visible text…",
    summary: "What Lens can see",
    prices: "Visible prices",
    questions: "Questions to clarify",
    next: "Next step",
    verdict: "Price impression",
    range: "Broad typical range · estimate only",
    fair: "Looks fair",
    high: "Possibly overpriced",
    unknown: "Can't tell",
    disclaimer: "AI estimate based on typical ranges. Ask the driver/shop to confirm. Not an official rate.",
    etiquette: "Temple etiquette · general guidance",
    report: "Report overcharge",
    reported: "Complaint logged for Tourism Officer",
    cached: "Cached demo result",
    retry: "Retry scan",
    noResult: "Choose a photo or try a sample to begin.",
    error: "Lens could not read this image. Try again or choose a clearer photo.",
    loadingTitle: "Reading visible text",
    loadingDesc: "Checking legibility and preparing a careful estimate…",
    speak: "Read result aloud",
    language: "हिन्दी",
    fileTooBig: "Please choose an image under 3 MB.",
    badFile: "Choose a JPEG, PNG or WebP image.",
    noPrice: "No clear price is visible, so no range is shown.",
  },
  hi: {
    title: "अतिथि लेंस",
    subtitle: "कीमत पढ़ें और पूछने वाली बातें जानें।",
    trySample: "नमूना आज़माएँ",
    upload: "फ़ोटो लें या चित्र चुनें",
    supported: "JPEG, PNG या WebP · अधिकतम 3 MB",
    analyze: "चित्र का विश्लेषण करें",
    analyzing: "दिख रहा पाठ पढ़ रहे हैं…",
    summary: "लेंस क्या पढ़ पाया",
    prices: "दिख रही कीमतें",
    questions: "पूछने योग्य बातें",
    next: "अगला कदम",
    verdict: "कीमत पर अनुमान",
    range: "सामान्य अनुमानित सीमा",
    fair: "उचित लगती है",
    high: "शायद ज़्यादा कीमत",
    unknown: "कह नहीं सकते",
    disclaimer: "सामान्य कीमत-सीमाओं पर आधारित AI अनुमान। चालक/दुकान से पुष्टि करें। यह आधिकारिक दर नहीं है।",
    etiquette: "मंदिर शिष्टाचार · सामान्य सलाह",
    report: "ज़्यादा कीमत की रिपोर्ट करें",
    reported: "शिकायत पर्यटन अधिकारी के लिए दर्ज हुई",
    cached: "कैश किया गया डेमो परिणाम",
    retry: "फिर से कोशिश करें",
    noResult: "शुरू करने के लिए फ़ोटो चुनें या नमूना आज़माएँ।",
    error: "लेंस इस चित्र को पढ़ नहीं पाया। फिर कोशिश करें या साफ़ फ़ोटो चुनें।",
    loadingTitle: "दिख रहा पाठ पढ़ रहे हैं",
    loadingDesc: "चित्र की स्पष्टता जाँची जा रही है…",
    speak: "परिणाम सुनें",
    language: "English",
    fileTooBig: "कृपया 3 MB से छोटा चित्र चुनें।",
    badFile: "JPEG, PNG या WebP चित्र चुनें।",
    noPrice: "कोई स्पष्ट कीमत नहीं दिखी, इसलिए मूल्य-सीमा नहीं दिखाई गई है।",
  },
};

function readCachedResult(sampleId, language) {
  if (!sampleId) return null;
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + sampleId);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.language === language && typeof parsed.summary === "string") {
        return { ...parsed, sampleId };
      }
    }
  } catch {
    // A corrupt or blocked localStorage cache must not interrupt Lens.
  }
  const seeded = getSeedLensResult(sampleId, language);
  return seeded ? { ...seeded, sampleId } : null;
}

function saveCachedResult(sampleId, language, result) {
  if (!sampleId) return;
  try {
    localStorage.setItem(CACHE_PREFIX + sampleId, JSON.stringify({ ...result, sampleId, language, cachedAt: new Date().toISOString() }));
  } catch {
    // A successful scan is still shown when browser storage is unavailable.
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      const base64 = dataUrl.includes(",") ? dataUrl.slice(dataUrl.indexOf(",") + 1) : "";
      if (!base64) reject(new Error("The image could not be read."));
      else resolve({ dataUrl, base64, mimeType: file.type, name: file.name });
    };
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.readAsDataURL(file);
  });
}

function safeResult(result, sampleId, language) {
  const validVerdicts = ["Looks fair", "Possibly overpriced", "Can't tell"];
  const visiblePrices = Array.isArray(result?.visiblePrices)
    ? result.visiblePrices.filter((item) => typeof item === "string").slice(0, 12)
    : [];
  const hasVisiblePrice = result?.priceVisible === true
    && visiblePrices.some((item) => /\d/.test(item));
  const fairPrice = result?.fairPrice && typeof result.fairPrice === "object" ? result.fairPrice : {};
  const verdict = hasVisiblePrice && validVerdicts.includes(fairPrice.verdict) ? fairPrice.verdict : "Can't tell";
  const roughRange = hasVisiblePrice && typeof fairPrice.roughRange === "string" && fairPrice.roughRange.trim()
    ? fairPrice.roughRange.trim().slice(0, 160)
    : null;
  const imageType = ["taxi", "menu", "temple", "other"].includes(result?.imageType) ? result.imageType : SAMPLE_PHOTOS.find((sample) => sample.id === sampleId)?.imageType || "other";
  return {
    summary: typeof result?.summary === "string" && result.summary.trim() ? result.summary.trim().slice(0, 700) : COPY[language].error,
    visiblePrices,
    potentialConcerns: Array.isArray(result?.potentialConcerns) ? result.potentialConcerns.filter((item) => typeof item === "string").slice(0, 8) : [],
    nextStep: typeof result?.nextStep === "string" && result.nextStep.trim() ? result.nextStep.trim().slice(0, 400) : COPY[language].next,
    imageType,
    priceVisible: hasVisiblePrice,
    fairPrice: {
      verdict,
      roughRange,
      explanation: typeof fairPrice.explanation === "string" ? fairPrice.explanation.slice(0, 240) : "",
    },
    etiquetteNote: typeof result?.etiquetteNote === "string" ? result.etiquetteNote.slice(0, 300) : "",
    sampleId: sampleId || null,
    language,
  };
}

function verdictLabel(verdict, copy) {
  if (verdict === "Looks fair") return copy.fair;
  if (verdict === "Possibly overpriced") return copy.high;
  return copy.unknown;
}

export default function LensTab({ selectedWaypoint, persona, onRequest }) {
  const [language, setLanguage] = useState("en");
  const [lensImage, setLensImage] = useState(null);
  const [lensResult, setLensResult] = useState(null);
  const [lensError, setLensError] = useState("");
  const [lensLoading, setLensLoading] = useState(false);
  const [cachedDemo, setCachedDemo] = useState(false);
  const [reported, setReported] = useState(false);
  const [sampleImageErrors, setSampleImageErrors] = useState({});
  const [lastSampleId, setLastSampleId] = useState(null);
  const fileInputRef = useRef(null);
  const requestIdRef = useRef(0);
  const copy = COPY[language];

  useEffect(() => () => {
    requestIdRef.current += 1;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (!lastSampleId && !lensImage) return;
    if (cachedDemo && lastSampleId) {
      const cached = readCachedResult(lastSampleId, language);
      if (cached) {
        const priceVisible = Boolean(cached.fairPrice?.roughRange || (cached.visiblePrices || []).some((item) => /\\d/.test(item)));
        setLensResult(safeResult({ ...cached, priceVisible }, lastSampleId, language));
        return;
      }
    }
    if (lensImage) void analyzeImage(lensImage, lastSampleId, language);
  }, [language]);

  const showSampleCache = (sampleId, lang = language) => {
    const cached = readCachedResult(sampleId, lang);
    if (!cached) return false;
    setLensResult(safeResult({ ...cached, priceVisible: cached.fairPrice?.roughRange ? true : (cached.visiblePrices || []).some((item) => /\d/.test(item)) }, sampleId, lang));
    setCachedDemo(true);
    setLensLoading(false);
    setLensError("");
    setLastSampleId(sampleId);
    setReported(false);
    return true;
  };

  const analyzeImage = async (image, sampleId = null, lang = language) => {
    if (!image?.base64) return;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    setLensLoading(true);
    setLensError("");
    setCachedDemo(false);
    setReported(false);
    try {
      const response = await fetch("/api/lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: image.base64,
          mimeType: image.mimeType,
          waypoint: selectedWaypoint?.name || "Himalayan corridor",
          language: lang,
          persona: {
            id: persona?.id || "traveller",
            name: persona?.name || "Traveller",
          },
          sampleId,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || COPY[lang].error);
      if (requestId !== requestIdRef.current) return;
      const result = safeResult(payload, sampleId, lang);
      setLensResult(result);
      setLastSampleId(sampleId);
      setCachedDemo(false);
      if (sampleId) saveCachedResult(sampleId, lang, result);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      if (sampleId && showSampleCache(sampleId, lang)) {
        setLensError("");
      } else {
        setLensError(error?.name === "AbortError" ? (lang === "hi" ? "विश्लेषण में 6 सेकंड से अधिक लगे। फिर कोशिश करें।" : "Analysis took over 6 seconds. Please retry.") : (error instanceof Error ? error.message : COPY[lang].error));
      }
    } finally {
      clearTimeout(timeout);
      if (requestId === requestIdRef.current) setLensLoading(false);
    }
  };

  const chooseSample = async (sample) => {
    setLensResult(null);
    setLensError("");
    setCachedDemo(false);
    setLastSampleId(sample.id);
    setReported(false);
    setSampleImageErrors((previous) => ({ ...previous, [sample.id]: false }));
    try {
      const response = await fetch(sample.src, { cache: "no-cache" });
      if (!response.ok) throw new Error("Sample image asset isn't available yet.");
      const blob = await response.blob();
      if (!blob.size || blob.size > MAX_IMAGE_BYTES) throw new Error("Sample image is invalid.");
      const file = new File([blob], sample.id + ".jpg", { type: "image/jpeg" });
      const image = await fileToDataUrl(file);
      setLensImage({ ...image, sampleId: sample.id, imageType: sample.imageType });
      await analyzeImage({ ...image, sampleId: sample.id }, sample.id);
    } catch {
      // Sample assets may be added separately; seeded results keep the demo flow usable.
      setLensImage(null);
      showSampleCache(sample.id);
    }
  };

  const selectLensImage = async (event) => {
    const file = event.target.files?.[0];
    setLensImage(null);
    setLensResult(null);
    setLensError("");
    setCachedDemo(false);
    setLastSampleId(null);
    setReported(false);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setLensError(copy.badFile);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setLensError(copy.fileTooBig);
      return;
    }
    try {
      const image = await fileToDataUrl(file);
      setLensImage(image);
      await analyzeImage(image, null);
    } catch {
      setLensError(copy.error);
    }
  };

  const retry = () => {
    if (lastSampleId) {
      const sample = SAMPLE_PHOTOS.find((item) => item.id === lastSampleId);
      if (sample) {
        chooseSample(sample);
        return;
      }
    }
    if (lensImage) analyzeImage(lensImage, null);
  };

  const reportOvercharge = () => {
    onRequest?.({
      title: "Tourist price complaint (demo)",
      category: "Price Lens",
      detail: `Demo price complaint. Corridor: ${selectedWaypoint?.name || "Selected route"}. Sample: ${lastSampleId || "traveller photo"}. Lens verdict: ${lensResult?.fairPrice?.verdict || "Can't tell"}. Summary: ${lensResult?.summary || "No analysis summary"} Request a Tourism Officer review; this demo does not contact authorities or establish overcharging.`,
    });
    setReported(true);
  };

  const speakResult = () => {
    if (typeof window === "undefined" || !window.speechSynthesis || !lensResult) return;
    window.speechSynthesis.cancel();
    const text = [
      lensResult.summary,
      `${copy.verdict}: ${verdictLabel(lensResult.fairPrice?.verdict, copy)}.`,
      lensResult.fairPrice?.roughRange || copy.noPrice,
      lensResult.nextStep,
      copy.disclaimer,
    ].join(" ");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : "en-IN";
    window.speechSynthesis.speak(utterance);
  };

  const etiquetteNote = lensResult && (lensResult.imageType === "temple" || lastSampleId === "sample-temple")
    ? (language === "hi"
      ? (persona?.id === "pilgrim"
        ? "स्थानीय रीति का सम्मान करें: जहाँ आवश्यक हो चमड़े की वस्तुएँ हटाएँ और सिर ढकें। नियम मंदिर के अनुसार अलग हो सकते हैं; संदेह हो तो कर्मचारियों से पूछें।"
        : "मंदिर के स्थानीय नियमों का सम्मान करें: जहाँ आवश्यक हो चमड़े की वस्तुएँ हटाएँ और सिर ढकें। प्रवेश से पहले सूचना-पट पढ़ें।")
      : (persona?.id === "pilgrim"
        ? "Respect local customs: remove leather items and cover your head where required. Practices vary by temple; ask staff if unsure."
        : "Follow posted temple customs. Remove leather items and cover your head where required; practices vary by site, so ask staff if unsure."))
    : "";

  return (
    <section className="lens-tab space-y-4" aria-labelledby="lens-tab-heading">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Atithi AI · Safety tool</p>
          <h3 id="lens-tab-heading" className="mt-1 font-serif text-2xl text-text">{copy.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted">{copy.subtitle}</p>
        </div>
        <button type="button" onClick={() => setLanguage((current) => current === "en" ? "hi" : "en")} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-text" aria-label="Toggle English and Hindi"><Languages size={15}/>{copy.language}</button>
      </header>

      <div>
        <div className="mb-2 flex items-center gap-2"><span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-accent-text">{copy.trySample}</span><span className="h-px flex-1 bg-border"/></div>
        <div className="grid grid-cols-3 gap-2">
          {SAMPLE_PHOTOS.map((sample) => (
            <button type="button" key={sample.id} onClick={() => chooseSample(sample)} disabled={lensLoading} className="group min-w-0 rounded-xl border border-border bg-surface p-2 text-left transition hover:border-accent hover:shadow-sm disabled:opacity-60">
              <span className="relative block aspect-[4/3] overflow-hidden rounded-lg bg-surface-2">
                {sampleImageErrors[sample.id]
                  ? <span className="flex h-full flex-col items-center justify-center gap-1 p-2 text-center text-[9px] text-muted"><Upload size={17}/>{language === "hi" ? "नमूना परिणाम उपलब्ध" : "Sample result ready"}</span>
                  : <img src={sample.src} alt={language === "hi" ? sample.titleHi : sample.title} loading="lazy" onError={() => setSampleImageErrors((previous) => ({ ...previous, [sample.id]: true }))} className="h-full w-full object-cover transition group-hover:scale-[1.03]"/>}
              </span>
              <span className="mt-2 block text-[10px] font-semibold leading-tight text-text">{language === "hi" ? sample.titleHi : sample.title}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="block rounded-2xl border border-dashed border-border bg-surface p-4 text-center">
        {lensImage?.dataUrl
          ? <img src={lensImage.dataUrl} alt="Selected price photo" className="mx-auto max-h-48 max-w-full rounded-xl object-contain"/>
          : <span className="flex flex-col items-center py-3"><Upload size={24} className="text-accent-text"/><span className="mt-2 text-sm font-semibold text-text">{copy.upload}</span><span className="mt-1 text-[10px] text-muted">{copy.supported}</span></span>}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={selectLensImage} className="mt-3 block w-full text-xs text-muted"/>
      </label>

      {!lensImage && !lensResult && !lensLoading && !lensError && <p className="rounded-xl bg-surface-2 p-3 text-xs text-muted">{copy.noResult}</p>}
      {lensLoading && (
        <div role="status" aria-live="polite" className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-text"><LoaderCircle size={16} className="animate-spin text-accent-text"/>{copy.loadingTitle}</div>
          <p className="text-[10px] text-muted">{copy.loadingDesc}</p>
          <div className="animate-pulse space-y-2"><div className="h-3 w-3/4 rounded bg-surface-2"/><div className="h-3 w-full rounded bg-surface-2"/><div className="h-3 w-5/6 rounded bg-surface-2"/><div className="mt-4 h-16 rounded-xl bg-surface-2"/></div>
        </div>
      )}
      {lensError && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs leading-relaxed text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"><div className="flex items-start gap-2"><AlertCircle size={15} className="mt-0.5 shrink-0"/><span>{lensError}</span></div><button type="button" onClick={retry} className="mt-3 inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-xs font-bold text-rose-800 dark:border-rose-800 dark:text-rose-200"><RefreshCw size={13}/>{copy.retry}</button></div>}

      {lensResult && (
        <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-accent-text">{copy.summary}</p>
            {cachedDemo && <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{copy.cached}</span>}
          </div>
          <p className="text-sm leading-relaxed text-text">{lensResult.summary}</p>
          <div className="rounded-xl border border-border bg-bg p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{copy.verdict}</p>
            <p className={`mt-1 text-sm font-extrabold ${lensResult.fairPrice?.verdict === "Looks fair" ? "text-emerald-700 dark:text-emerald-300" : lensResult.fairPrice?.verdict === "Possibly overpriced" ? "text-amber-700 dark:text-amber-300" : "text-muted"}`}>{verdictLabel(lensResult.fairPrice?.verdict, copy)}</p>
            {lensResult.fairPrice?.roughRange
              ? <p className="mt-1 text-xs leading-relaxed text-muted">{copy.range}: {lensResult.fairPrice.roughRange}</p>
              : <p className="mt-1 text-xs text-muted">{copy.noPrice}</p>}
            {lensResult.fairPrice?.explanation && <p className="mt-2 text-[10px] leading-relaxed text-muted">{lensResult.fairPrice.explanation}</p>}
          </div>
          {lensResult.visiblePrices.length > 0 && <div><p className="text-xs font-semibold text-text">{copy.prices}</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted">{lensResult.visiblePrices.map((price, index) => <li key={index}>{price}</li>)}</ul></div>}
          {lensResult.potentialConcerns.length > 0 && <div><p className="text-xs font-semibold text-text">{copy.questions}</p><ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-muted">{lensResult.potentialConcerns.map((issue, index) => <li key={index}>{issue}</li>)}</ul></div>}
          <p className="text-xs font-medium leading-relaxed text-text">{copy.next}: {lensResult.nextStep}</p>
          {etiquetteNote && <div className="rounded-xl border border-amber-300/70 bg-amber-50 p-3 dark:border-amber-800/70 dark:bg-amber-950/25"><p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-800 dark:text-amber-200">{copy.etiquette}</p><p className="mt-1 text-xs leading-relaxed text-text">{etiquetteNote}</p></div>}
          <p className="border-t border-border pt-3 text-[10px] leading-relaxed text-muted">{copy.disclaimer}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={speakResult} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-xs font-bold text-text"><Volume2 size={15}/>{copy.speak}</button>
            <button type="button" onClick={retry} disabled={lensLoading} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-bg px-3 py-2.5 text-xs font-bold text-text disabled:opacity-50"><RefreshCw size={15}/>{copy.retry}</button>
          </div>
          <button type="button" onClick={reportOvercharge} disabled={reported} className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white disabled:opacity-70"><AlertCircle size={15}/>{reported ? copy.reported : copy.report}</button>
          <p className="text-[9px] leading-relaxed text-muted">{language === "hi" ? "रिपोर्ट एक डेमो अनुरोध है; इससे किसी अधिकारी या आपातकालीन सेवा को स्वतः संपर्क नहीं किया जाता।" : "This logs a demo request for the Tourism Officer; it does not automatically contact an authority or emergency service."}</p>
        </div>
      )}

      <p className="text-[10px] leading-relaxed text-muted">{copy.disclaimer}</p>
    </section>
  );
}
