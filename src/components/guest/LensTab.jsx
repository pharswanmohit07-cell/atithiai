import React, { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, RefreshCw, Send } from "lucide-react";
import { getSeedLensResult } from "../../data/lensCache.js";
import { useDestination } from "../../context/DestinationContext.jsx";
import { useHotelContext } from "../../context/HotelContext.jsx";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const SAMPLES = [
  { id: "sample-taxi", title: "Demo fare board", subtitle: "Questions to ask before a ride" },
  { id: "sample-menu", title: "Demo menu", subtitle: "Ingredients and bill details" },
  { id: "sample-service", title: "Demo service quote", subtitle: "Request an itemised price" },
];

function friendlyFallback(language = "English") {
  return {
    summary: "A reliable price reading is unavailable. Ask the provider to confirm an itemised total.",
    visiblePrices: [],
    potentialConcerns: ["Confirm inclusions, taxes and any extra charges before paying."],
    nextStep: "Ask the provider or hotel team to confirm the itemised price in writing.",
    fairPrice: { verdict: "Can't tell", roughRange: "", explanation: "The image alone cannot establish a fair price, and no verified comparison price list is configured." },
    disclaimer: "AI estimate only. Not a quote or tariff.",
    language,
    source: "safe-fallback",
  };
}

async function resizeImage(file) {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Image could not be opened."));
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
    if (!base64 || base64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) throw new Error("This image is still too large after resizing. Choose a smaller photo.");
    return { dataUrl, base64, mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function readLocalSample(id, language) {
  try {
    const value = localStorage.getItem("atithi-lens-" + id);
    if (value) {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed.summary === "string") return { ...parsed, source: "cached-demo-result" };
    }
  } catch {
    // The seeded result still works when browser storage is blocked or corrupt.
  }
  return getSeedLensResult(id, language) || friendlyFallback(language);
}

function saveLocalSample(id, result) {
  try {
    localStorage.setItem("atithi-lens-" + id, JSON.stringify(result));
  } catch {
    // The visible result remains usable without persistent storage.
  }
}

export default function LensTab({ onRequest }) {
  const { destination, cachedDemoMode } = useDestination();
  const { preferences } = useHotelContext();
  const inputRef = useRef(null);
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [reported, setReported] = useState(false);
  const [sampleId, setSampleId] = useState(null);
  const language = preferences.language || "English";

  const showSample = (id) => {
    const cached = readLocalSample(id, language);
    setSampleId(id);
    setImage(null);
    setResult(cached);
    setError("");
    setLoading(false);
    setReported(false);
    saveLocalSample(id, cached);
  };

  const chooseImage = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    setResult(null);
    setError("");
    setSampleId(null);
    setReported(false);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    try {
      const resized = await resizeImage(file);
      setImage(resized);
      if (cachedDemoMode) {
        const local = getSeedLensResult("sample-service", language) || friendlyFallback(language);
        setResult(local);
        setSampleId("sample-service");
        setError("Cached demo mode is on. The uploaded image was not sent for analysis; the result below is an illustrative demo.");
        return;
      }
      await analyse(resized);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "This image could not be prepared. Try a sample result.");
      setResult(friendlyFallback(language));
    }
  };

  const analyse = async (selectedImage) => {
    if (!selectedImage || cachedDemoMode) return;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetch("/api/lens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          imageBase64: selectedImage.base64,
          mimeType: selectedImage.mimeType,
          destinationId: destination.id,
          language,
          sampleId: null,
        }),
      });
      let payload = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (payload && typeof payload.summary === "string") {
        setResult(payload);
        if (!response.ok) setError("A safe fallback is shown because the image service did not complete.");
      } else {
        throw new Error("Price Lens is temporarily unavailable.");
      }
    } catch (caught) {
      setResult(friendlyFallback(language));
      setError(caught?.name === "AbortError"
        ? "Image analysis took too long. A local fallback is shown."
        : "Image analysis is unavailable. A local fallback is shown.");
    } finally {
      window.clearTimeout(timeout);
      setLoading(false);
    }
  };

  const report = () => {
    if (!result) return;
    onRequest?.({
      title: "Price question for human review",
      category: "Price Lens",
      detail: "Destination: " + destination.city + ", " + destination.country + ". Source: " + (result.source || "local fallback") + ". Impression: " + (result.fairPrice?.verdict || "Can't tell") + ". " + (result.summary || "No readable summary.") + " Demo request only; no provider was contacted and no overcharge was established.",
    });
    setReported(true);
  };

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center gap-2"><ImagePlus size={19} className="text-accent-text" /><h3 className="font-serif text-xl">Price Lens</h3></div>
        <p className="mt-1 text-xs leading-relaxed text-muted">Read visible words from an image. Fairness cannot be verified from a photo alone; confirm final prices with the provider. AI output is an estimate, not a tariff.</p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {SAMPLES.map((sample) => <button key={sample.id} type="button" onClick={() => showSample(sample.id)} className="min-h-20 rounded-xl border border-border bg-bg p-3 text-left hover:bg-surface-2"><span className="block text-sm font-bold text-text">{sample.title}</span><span className="mt-1 block text-xs leading-relaxed text-muted">{sample.subtitle}</span><span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-accent-text">Cached demo result <CheckCircle2 size={12} /></span></button>)}
      </div>
      <div className="rounded-xl border border-border bg-bg p-3">
        <label className="block text-xs font-bold text-text" htmlFor="lens-image">Analyse a photo</label>
        <p className="mt-1 text-xs text-muted">JPEG, PNG or WebP. The photo is downscaled before upload; maximum request payload is 3 MB.</p>
        <input id="lens-image" ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} className="mt-3 block w-full text-xs text-muted file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-bold file:text-white" />
        {image && <img src={image.dataUrl} alt="Selected price board or menu preview" className="mt-3 max-h-48 max-w-full rounded-lg border border-border object-contain" />}
      </div>
      {loading && <p role="status" className="inline-flex items-center gap-2 text-sm text-muted"><RefreshCw size={15} className="animate-spin" /> Reading visible text…</p>}
      {error && <p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"><AlertCircle size={14} className="mr-1 inline" />{error}</p>}
      {result && <article className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border px-2.5 py-1 text-[9px] font-bold uppercase text-muted">{result.source === "ai-estimate" ? "AI estimate" : "Cached demo result"}</span><span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold">{result.fairPrice?.verdict || "Can't tell"}</span></div>
        <h4 className="mt-3 text-sm font-bold">What the image shows</h4>
        <p className="mt-1 text-sm leading-relaxed text-muted">{result.summary}</p>
        {Array.isArray(result.visiblePrices) && result.visiblePrices.length > 0 && <><h5 className="mt-3 text-xs font-bold">Visible text and prices</h5><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted">{result.visiblePrices.map((price, index) => <li key={index}>{price}</li>)}</ul></>}
        {Array.isArray(result.potentialConcerns) && result.potentialConcerns.length > 0 && <><h5 className="mt-3 text-xs font-bold">Questions to ask</h5><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted">{result.potentialConcerns.map((item, index) => <li key={index}>{item}</li>)}</ul></>}
        <p className="mt-3 text-xs leading-relaxed text-muted">{result.fairPrice?.explanation || "The image alone cannot establish a fair price."}</p>
        <p className="mt-2 text-[10px] leading-relaxed text-muted">{result.disclaimer || "AI estimate only. Not a quote or tariff."}</p>
        <button type="button" onClick={report} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold text-text"><Send size={14} /> {reported ? "Sent to demo request queue" : "Ask hotel team to review"}</button>
      </article>}
    </section>
  );
}
