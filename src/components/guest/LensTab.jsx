import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, Check, Languages, LoaderCircle, MessageCircle, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { getSeedLensResult } from "../../data/lensCache.js";
import { demoFetch, isCachedDemoMode } from "../../lib/demoCache.js";
import IconBadge from "../ui/IconBadge.jsx";
import { useDestination } from "../../context/DestinationContext.jsx";
import { useProfile } from "../../context/ProfileContext.jsx";

const LANGUAGE_KEY = "atithi-lens-language";
const LIST_KEY = "atithi-dish-list-v1";
const MAX_BYTES = 4 * 1024 * 1024;
const LANGUAGES = [
  ["en","English"],["hi","हिन्दी"],["es","Español"],["fr","Français"],["de","Deutsch"],
  ["pt","Português"],["id","Bahasa Indonesia"],["ja","日本語"],["zh","中文"],["ar","العربية"]
];
const MODES = [["menu","Menu"],["sign","Sign"],["transport","Transport"],["general","Auto"]];
const SAMPLES = [
  { id:"sample-menu", title:"Sample menu", src:"/samples/sample-menu.jpg", mode:"menu" },
  { id:"sample-sign", title:"Sample sign", src:"/samples/sample-sign.jpg", mode:"sign" },
  { id:"sample-transport", title:"Sample transport", src:"/samples/sample-transport.jpg", mode:"transport" }
];
function preferredLanguage() {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (LANGUAGES.some(([code]) => code === saved)) return saved;
  } catch { /* Use the browser language if storage is unavailable. */ }
  const base = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase().split("-")[0];
  return LANGUAGES.some(([code]) => code === base) ? base : "en";
}
function localize(language, english, hindi) { return language === "hi" ? hindi : english; }
function safeResult(value, mode) {
  const result = value && typeof value === "object" ? value : {};
  const output = {
    whatIsThis: typeof result.whatIsThis === "string" ? result.whatIsThis : "No clear interpretation is available.",
    detectedLanguage: typeof result.detectedLanguage === "string" ? result.detectedLanguage : "unknown",
    translation: typeof result.translation === "string" ? result.translation : null,
    explanation: typeof result.explanation === "string" ? result.explanation.split(/\s+/).slice(0,69).join(" ") : "Context may be incomplete. Verify important details locally.",
    tips: Array.isArray(result.tips) ? result.tips.filter((item) => typeof item === "string").slice(0,3) : [],
    confidence: ["low","medium","high"].includes(result.confidence) ? result.confidence : "low"
  };
  if (mode === "menu") output.dishes = Array.isArray(result.dishes) ? result.dishes.slice(0,12) : [];
  if (mode === "transport") {
    const transport = result.transport || {};
    output.transport = {
      summary: typeof transport.summary === "string" ? transport.summary : output.whatIsThis,
      priceNote: typeof transport.priceNote === "string" ? transport.priceNote : null,
      verdict: ["Looks fair","Possibly overpriced","Can't tell"].includes(transport.verdict) ? transport.verdict : "Can't tell"
    };
  }
  return output;
}
async function resizeImage(file) {
  if (file.size > 18 * 1024 * 1024) throw new Error("Choose an image smaller than 18 MB before resizing.");
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve,reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("This image could not be opened. Try another photo."));
      element.src = url;
    });
    const scale = Math.min(1,1024 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height = Math.max(1,Math.round(image.naturalHeight*scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image conversion is not available in this browser.");
    context.drawImage(image,0,0,canvas.width,canvas.height);
    let dataUrl = canvas.toDataURL("image/jpeg",0.82);
    if (dataUrl.length > MAX_BYTES * 4 / 3 + 100) dataUrl = canvas.toDataURL("image/jpeg",0.62);
    const base64 = dataUrl.slice(dataUrl.indexOf(",")+1);
    if (!base64 || base64.length > MAX_BYTES * 4 / 3 + 100) throw new Error("This photo is still over 4 MB after resizing. Choose a simpler image.");
    return { dataUrl, base64 };
  } finally { URL.revokeObjectURL(url); }
}
function cachedSample(id, language) {
  try {
    const saved = JSON.parse(localStorage.getItem("atithi-lens-cache:"+id+":"+language) || "null");
    if (saved && saved.result) return safeResult(saved.result, saved.mode);
  } catch { /* Use the built-in sample if storage is unavailable or invalid. */ }
  return safeResult(getSeedLensResult(id), SAMPLES.find((sample) => sample.id === id)?.mode || "general");
}
function saveSample(id, language, mode, result) {
  if (!id) return;
  try { localStorage.setItem("atithi-lens-cache:"+id+":"+language, JSON.stringify({ mode, result, savedAt:Date.now() })); } catch { /* A successful scan still works without local storage. */ }
}
function formatPriceNote(note, destination) {
  if (!note) return null;
  const currency = destination?.currency?.code;
  if (!currency) return note;
  try {
    const formatter = new Intl.NumberFormat(destination.locale, {
      style: "currency",
      currency,
      maximumFractionDigits: ["IDR","JPY","KRW","VND","CLP"].includes(currency) ? 0 : 2
    });
    // priceNote is reserved for a clearly visible price; format its numeric amounts in the selected pack's locale/currency.
    return note.replace(/(?<![\\w])\\d+(?:[.,]\\d{1,2})?(?![\\w])/g, (raw) => {
      const amount = Number(raw.replace(",", "."));
      return Number.isFinite(amount) ? formatter.format(amount) : raw;
    });
  } catch { return note; }
}
export default function LensTab({ onRequest }) {
  const { destination } = useDestination();
  const { profile } = useProfile();
  const fileRef = useRef(null);
  const requestRef = useRef(0);
  const [language,setLanguage] = useState(preferredLanguage);
  const [mode,setMode] = useState("general");
  const [image,setImage] = useState(null);
  const [result,setResult] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [cachedDemo,setCachedDemo] = useState(false);
  const [sampleId,setSampleId] = useState(null);
  const [speaking,setSpeaking] = useState(false);
  const [speechMessage,setSpeechMessage] = useState("");
  const [savedDishes,setSavedDishes] = useState(() => {
    try { const value=JSON.parse(localStorage.getItem(LIST_KEY)||"[]"); return Array.isArray(value)?value:[]; } catch { return []; }
  });
  useEffect(() => () => {
    requestRef.current += 1;
    if (typeof window !== "undefined" && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);
  useEffect(() => {
    setImage(null);setResult(null);setError("");setSampleId(null);setCachedDemo(false);
  }, [destination.id]);
  const saveDish = (dish) => {
    const item = { ...dish, destinationId:destination.id, destination:destination.city, savedAt:new Date().toISOString() };
    setSavedDishes((current) => {
      const next = current.some((entry) => entry.name === item.name && entry.destinationId === item.destinationId) ? current : [...current,item];
      try { localStorage.setItem(LIST_KEY,JSON.stringify(next.slice(-100))); } catch { /* Keep the current session list. */ }
      return next;
    });
    onRequest?.({ title:"Dish saved to my list", category:"Food list", detail: dish.name+" — "+dish.explanation+" ("+destination.city+")" });
  };
  const analyse = async (prepared, selectedMode=mode, selectedLanguage=language, selectedSample=sampleId) => {
    if (!prepared?.base64) return;
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(),6000);
    setLoading(true);setError("");setCachedDemo(false);setSpeechMessage("");
    try {
      const response = await demoFetch("/api/lens",{
        method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,
        body:JSON.stringify({
          imageBase64:prepared.base64,targetLanguage:selectedLanguage,mode:selectedMode,
          city:destination.city,country:destination.country,currency:destination.currency.code,
          profileDiet:profile?.diet || "none",locale:destination.locale
        })
      });
      let payload = null;
      try { payload = await response.json(); } catch { payload = null; }
      if (!response.ok || !payload || typeof payload.whatIsThis !== "string") throw new Error(payload?.error || "Lens could not read this image. Please retry.");
      if (requestId !== requestRef.current) return;
      const normalized = safeResult(payload,selectedMode);
      setResult(normalized);
      if (selectedSample) saveSample(selectedSample,selectedLanguage,selectedMode,normalized);
    } catch (caught) {
      if (requestId !== requestRef.current) return;
      if (selectedSample) {
        setResult(cachedSample(selectedSample,selectedLanguage));
        setCachedDemo(true);
        setError("");
      } else {
        setError(caught?.name === "AbortError" ? "This scan took more than 6 seconds. Please retry or use a sample." : (caught instanceof Error ? caught.message : "Lens is temporarily unavailable."));
      }
    } finally {
      window.clearTimeout(timeout);
      if (requestId === requestRef.current) setLoading(false);
    }
  };
  const useFile = async (file, selectedSample=null, selectedMode=mode) => {
    if (!file) return;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) { setError("Choose a JPEG, PNG, or WebP image."); return; }
    setError("");setResult(null);setCachedDemo(false);setSampleId(selectedSample);
    try {
      const prepared = await resizeImage(file);
      setImage(prepared);
      await analyse(prepared,selectedMode,language,selectedSample);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not prepare this image."); }
  };
  const chooseSample = async (sample) => {
    setMode(sample.mode);setSampleId(sample.id);setError("");setResult(null);setImage(null);setCachedDemo(false);
    if (isCachedDemoMode()) {
      setResult(cachedSample(sample.id,language));setCachedDemo(true);
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(),5000);
    try {
      const response = await demoFetch(sample.src,{cache:"no-store",signal:controller.signal});
      if (!response.ok) throw new Error("Sample image has not been added yet.");
      const blob = await response.blob();
      if (!blob.size) throw new Error("Sample image is empty.");
      await useFile(new File([blob],sample.id+".jpg",{type:blob.type || "image/jpeg"}),sample.id,sample.mode);
    } catch {
      setResult(cachedSample(sample.id,language));setCachedDemo(true);setError("");
    } finally {
      window.clearTimeout(timeout);
    }
  };
  const changeLanguage = (next) => {
    setLanguage(next);
    try { localStorage.setItem(LANGUAGE_KEY,next); } catch { /* Selection remains active for this session. */ }
    setSpeechMessage("");
    if (sampleId && !image) { setResult(cachedSample(sampleId,next));setCachedDemo(true); }
    else if (image) void analyse(image,mode,next,sampleId);
  };
  const speak = () => {
    const textToRead = [result?.whatIsThis,result?.translation,result?.explanation].filter(Boolean).join(". ");
    if (!textToRead || !("speechSynthesis" in window) || typeof SpeechSynthesisUtterance === "undefined") {
      setSpeechMessage("Read aloud is unavailable on this device. The text remains available above.");return;
    }
    if (speaking) { window.speechSynthesis.cancel();setSpeaking(false);return; }
    const target = language.toLowerCase();
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find((item) => item.lang?.toLowerCase() === target)
      || voices.find((item) => item.lang?.toLowerCase().split("-")[0] === target);
    if (!voice) { setSpeechMessage("No matching voice is installed for this language. You can still read the translation above.");return; }
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.voice = voice;utterance.lang = voice.lang || target;
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => { setSpeaking(false);setSpeechMessage("Speech playback is unavailable. The text remains available above."); };
    window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setSpeaking(true);setSpeechMessage("");
  };
  const askAtithi = () => {
    const prompt = "Help me understand this while travelling in "+destination.city+", "+destination.country+". Mode: "+mode+". What Lens identified: "+(result?.whatIsThis||"unclear")+". Translation: "+(result?.translation||"not available")+". Context: "+(result?.explanation||"not available")+". Please explain what I should do or ask locally, and be clear about uncertainty.";
    window.dispatchEvent(new CustomEvent("atithi:open-chat",{detail:{prompt}}));
  };
  const retry = () => image ? void analyse(image,mode,language,sampleId) : sampleId ? void chooseSample(SAMPLES.find((item)=>item.id===sampleId)) : setError("Choose a photo or sample to try again.");
  const dishes = Array.isArray(result?.dishes) ? result.dishes : [];
  const transport = result?.transport;
  return <section className="space-y-4" aria-labelledby="lens-title">
    <header className="flex items-start gap-3"><IconBadge icon={Languages} tone="gold" /><div className="min-w-0 flex-1"><h2 id="lens-title" className="deck-heading font-display text-2xl">Atithi Lens</h2><p className="mt-1 text-xs leading-relaxed text-muted">Travel help when the world gets unfamiliar. Understand a menu, sign, or local transport detail without losing context.</p></div></header>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold">Translate into<select value={language} onChange={(event)=>changeLanguage(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm">{LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
      <div><span className="block text-xs font-bold">What are you looking at?</span><div className="mt-1 grid grid-cols-4 rounded-xl border border-border bg-bg p-1" role="group" aria-label="Lens mode">{MODES.map(([value,label])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>{setMode(value);setResult(null);setError("");setCachedDemo(false);}} className={"min-h-9 rounded-lg px-1 text-[10px] font-bold sm:text-xs "+(mode===value?"bg-brand text-white":"text-muted hover:bg-surface-2")}>{label}</button>)}</div></div>
    </div>
    <div className="rounded-2xl border border-border bg-bg p-3"><div className="mb-2 flex items-center justify-between gap-2"><h3 className="text-xs font-bold">Try a sample</h3><span className="text-[10px] text-muted">Demo examples</span></div><div className="grid grid-cols-3 gap-2">{SAMPLES.map((sample)=><button type="button" key={sample.id} onClick={()=>void chooseSample(sample)} disabled={loading} className="min-w-0 overflow-hidden rounded-xl border border-border bg-surface text-left transition hover:border-brand disabled:opacity-60"><img src={sample.src} alt={sample.title} onError={(event)=>{event.currentTarget.style.display="none";}} className="h-16 w-full object-cover"/><span className="block px-2 py-2 text-[10px] font-bold leading-tight">{sample.title}</span></button>)}</div></div>
    <div className="rounded-2xl border border-dashed border-border bg-surface p-4"><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event)=>{const file=event.target.files?.[0];event.target.value="";setSampleId(null);void useFile(file,null,mode);}} className="sr-only"/><button type="button" onClick={()=>fileRef.current?.click()} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white"><Camera size={17}/>Take a photo or choose an image</button><p className="mt-2 text-center text-[10px] text-muted">JPEG, PNG or WebP · up to 4 MB after downscaling to 1024 px</p>{image&&<img src={image.dataUrl} alt="Preview of selected image" className="mx-auto mt-3 max-h-64 max-w-full rounded-xl border border-border object-contain"/>}</div>
    {loading&&<div role="status" aria-live="polite" className="animate-pulse space-y-3 rounded-2xl border border-border bg-surface p-4"><div className="flex items-center gap-2 text-sm font-bold"><LoaderCircle size={16} className="animate-spin"/>Reading visible details…</div><div className="h-3 w-2/3 rounded bg-surface-2"/><div className="h-3 w-full rounded bg-surface-2"/><div className="h-3 w-5/6 rounded bg-surface-2"/></div>}
    {error&&<div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"><AlertCircle size={15} className="mr-2 inline"/>{error}<button type="button" onClick={retry} className="ml-2 inline-flex items-center gap-1 font-bold underline"><RotateCcw size={12}/>Retry</button></div>}
    {result&&<article className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-brand/10 px-3 py-1 text-[10px] font-bold text-brand">{cachedDemo?"Cached demo result":"Lens result"}</span><span className="rounded-full bg-surface-2 px-3 py-1 text-[10px] font-bold">Confidence: {result.confidence}</span></div>
      <div><h3 className="text-xs font-bold uppercase tracking-wide text-muted">What this appears to be</h3><p className="mt-1 text-sm leading-relaxed">{result.whatIsThis}</p>{result.detectedLanguage&&<p className="mt-1 text-[10px] text-muted">Detected language: {result.detectedLanguage}</p>}</div>
      {result.translation&&<div className="rounded-xl border border-border bg-bg p-3"><h3 className="text-xs font-bold uppercase tracking-wide text-muted">Translation</h3><p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{result.translation}</p></div>}
      <div><h3 className="text-xs font-bold uppercase tracking-wide text-muted">Context that matters</h3><p className="mt-1 text-sm leading-relaxed text-muted">{result.explanation}</p></div>
      {mode==="menu"&&<div><h3 className="text-sm font-bold">Dish notes</h3>{dishes.length?<div className="mt-2 space-y-2">{dishes.map((dish,index)=><div key={dish.name+"-"+index} className="rounded-xl border border-border bg-bg p-3"><div className="flex items-start justify-between gap-2"><h4 className="text-sm font-bold">{dish.name}</h4><button type="button" onClick={()=>saveDish(dish)} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2 py-1.5 text-[10px] font-bold"><Check size={12}/>Add dish to my list</button></div><p className="mt-2 text-xs leading-relaxed text-muted">{dish.explanation}</p><p className="mt-2 text-[10px]"><strong>Diet:</strong> {dish.dietGuess||"Unclear — ask staff"}</p><p className="mt-1 text-[10px]"><strong>Spice:</strong> {dish.spiceGuess||"Unclear"}</p></div>)}</div>:<p className="mt-2 text-xs text-muted">No dishes could be identified with confidence.</p>}{savedDishes.length>0&&<p className="mt-2 text-[10px] text-muted">{savedDishes.length} dish{savedDishes.length===1?"":"es"} in your saved list.</p>}</div>}
      {mode==="transport"&&transport&&<div className="rounded-xl border border-border bg-bg p-3"><h3 className="text-sm font-bold">Transport details</h3><p className="mt-1 text-sm leading-relaxed">{transport.summary}</p>{formatPriceNote(transport.priceNote,destination)&&<p className="mt-2 text-xs text-muted">{formatPriceNote(transport.priceNote,destination)}</p>}<p className="mt-3 inline-flex rounded-full bg-brand/10 px-3 py-1.5 text-xs font-bold">{transport.verdict}</p><p className="mt-2 text-[10px] text-muted">No official rate is asserted.</p></div>}
      {result.tips.length>0&&<div><h3 className="text-xs font-bold uppercase tracking-wide text-muted">Practical tips</h3><div className="mt-2 flex flex-wrap gap-2">{result.tips.map((tip,index)=><span key={index} className="rounded-full border border-border bg-bg px-3 py-2 text-xs leading-relaxed">{tip}</span>)}</div></div>}
      <div className="flex flex-wrap gap-2"><button type="button" onClick={speak} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold">{speaking?<VolumeX size={15}/>:<Volume2 size={15}/>}Read aloud</button><button type="button" onClick={askAtithi} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-brand px-3 py-2 text-xs font-bold text-white"><MessageCircle size={15}/>Ask Atithi about this</button><button type="button" onClick={retry} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-bold"><RotateCcw size={15}/>Retry</button></div>
      {speechMessage&&<p role="status" className="text-xs text-muted">{speechMessage}</p>}
      <p className="border-t border-border pt-3 text-[10px] leading-relaxed text-muted">AI estimate. Verify locally.</p>
    </article>}
  </section>;
}
