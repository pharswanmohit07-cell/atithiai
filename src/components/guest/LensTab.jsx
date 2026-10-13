import React, { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, LoaderCircle, Send, Volume2, VolumeX } from "lucide-react";
import { getSeedLensResult } from "../../data/lensCache.js";
import { useDestination } from "../../context/DestinationContext.jsx";
import { LANGUAGE_OPTIONS, readLanguagePreference, storeLanguagePreference, t, targetLanguageTag } from "../../i18n.js";

const MAX_BASE64_LENGTH = Math.ceil(3 * 1024 * 1024 * 4 / 3) + 8;
const LANGUAGE_KEY = "atithi-lens-language";
const SAMPLE_IMAGES = [
  { id:"sample-menu", src:"/samples/generic-menu.jpg", mode:"menu", key:"sampleMenu" },
  { id:"sample-taxi", src:"/samples/fare-board.jpg", mode:"price", key:"sampleFare" },
  { id:"sample-service", src:"/samples/notice-sign.jpg", mode:"general", key:"sampleNotice" }
];

function friendlyFallback(language, mode) {
  const message = t("noText", language);
  const base = { mode, detectedLanguage:"unknown", detectedText:"", translation:message, summary:message, confidence:"low", disclaimer:t("disclaimer",language), source:"safe-fallback" };
  if (mode === "menu") return { ...base, dishes:[], estimateNotice:t("estimateNotice",language) };
  if (mode === "price") return { ...base, visiblePrices:[], roughRange:"", rangeLow:null, rangeHigh:null, verdict:"Can't tell", explanation:t("priceBasis",language) };
  return base;
}
function readLocation(destination) {
  return { city:destination.city, country:destination.country, currency:destination.currency.code };
}
async function resizeImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve,reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("The image could not be opened."));
      element.src = url;
    });
    const scale = Math.min(1, 1400 / Math.max(image.naturalWidth,image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image conversion is unavailable in this browser.");
    context.drawImage(image,0,0,canvas.width,canvas.height);
    let dataUrl = canvas.toDataURL("image/jpeg",0.78);
    if (dataUrl.length > MAX_BASE64_LENGTH * 0.99) dataUrl = canvas.toDataURL("image/jpeg",0.58);
    const base64 = dataUrl.slice(dataUrl.indexOf(",")+1);
    if (!base64 || base64.length > MAX_BASE64_LENGTH) throw new Error("This image is still too large after resizing. Choose a smaller image.");
    return { dataUrl, base64, mimeType:"image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}
function normalizeResult(result, language, mode) {
  if (!result) return friendlyFallback(language,mode);
  const normalized = {
    ...result, mode,
    detectedLanguage:result.detectedLanguage || "unknown",
    detectedText:result.detectedText || "",
    translation:result.translation || result.summary || t("noText",language),
    summary:result.summary || result.translation || t("noText",language),
    disclaimer:result.disclaimer || t("disclaimer",language)
  };
  if (mode === "menu" && !Array.isArray(normalized.dishes)) normalized.dishes = [];
  if (mode === "price") {
    normalized.visiblePrices = Array.isArray(normalized.visiblePrices) ? normalized.visiblePrices : [];
    normalized.verdict = normalized.verdict || result.fairPrice?.verdict || "Can't tell";
    normalized.roughRange = normalized.roughRange || result.fairPrice?.roughRange || "";
    normalized.explanation = normalized.explanation || result.fairPrice?.explanation || t("priceBasis",language);
  }
  return normalized;
}
function formatRange(result, currency, locale) {
  if (result?.roughRange) return result.roughRange;
  if (!Number.isFinite(result?.rangeLow)) return "";
  const high = Number.isFinite(result.rangeHigh) ? result.rangeHigh : result.rangeLow;
  try {
    const format = new Intl.NumberFormat(locale,{style:"currency",currency,maximumFractionDigits:["IDR","JPY","KRW","VND","CLP"].includes(currency)?0:2});
    return high === result.rangeLow ? format.format(high) : format.format(result.rangeLow)+" – "+format.format(high);
  } catch { return result.rangeLow+"–"+high+" "+currency; }
}
function localVerdict(verdict,language) {
  if (verdict==="Looks fair") return t("fair",language);
  if (verdict==="Possibly overpriced") return t("overpriced",language);
  return t("cannotTell",language);
}

export default function LensTab({ onRequest }) {
  const { destination, formatCurrency } = useDestination();
  const inputRef = useRef(null);
  const [language,setLanguage] = useState(()=>readLanguagePreference(LANGUAGE_KEY,true));
  const [mode,setMode] = useState("general");
  const [location,setLocation] = useState(()=>readLocation(destination));
  const [image,setImage] = useState(null);
  const [result,setResult] = useState(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [saved,setSaved] = useState(false);
  const [sampleId,setSampleId] = useState(null);
  const [speaking,setSpeaking] = useState(false);
  const [speechMessage,setSpeechMessage] = useState("");

  useEffect(()=>{setLocation(readLocation(destination));setImage(null);setResult(null);setError("");setSampleId(null);setSaved(false);},[destination.id]);

  const analyse = async (selectedImage,selectedMode=mode,selectedLanguage=language) => {
    if(!selectedImage)return;
    setLoading(true);setError("");setSpeechMessage("");
    const controller=new AbortController();
    const timeout=window.setTimeout(()=>controller.abort(),15000);
    try {
      const response=await fetch("/api/lens",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        signal:controller.signal,
        body:JSON.stringify({
          imageBase64:selectedImage.base64,
          mimeType:selectedImage.mimeType,
          targetLanguage:targetLanguageTag(selectedLanguage),
          mode:selectedMode,
          city:location.city.trim(),
          country:location.country.trim(),
          currency:location.currency.trim().toUpperCase(),
          locale:destination.locale
        })
      });
      let payload=null;
      try{payload=await response.json();}catch{payload=null;}
      if(response.ok&&payload&&payload.mode){
        setResult(normalizeResult(payload,selectedLanguage,selectedMode));
        if(payload.source==="safe-fallback")setError(t("imageFailed",selectedLanguage));
      }else{
        setResult(friendlyFallback(selectedLanguage,selectedMode));
        setError(payload?.error||t("imageFailed",selectedLanguage));
      }
    }catch(caught){
      setResult(friendlyFallback(selectedLanguage,selectedMode));
      setError(caught?.name==="AbortError"?t("timedOut",selectedLanguage):t("imageFailed",selectedLanguage));
    }finally{window.clearTimeout(timeout);setLoading(false);}
  };

  const useFile = async (file,sample=null,sampleMode=mode) => {
    if(!file)return;
    if(!["image/jpeg","image/png","image/webp"].includes(file.type)){
      setError(t("chooseSupportedImage",language));return;
    }
    setError("");setResult(null);setSaved(false);setSpeechMessage("");setSampleId(sample);
    try{
      const prepared=await resizeImage(file);
      setImage(prepared);
      await analyse(prepared,sampleMode,language);
    }catch(caught){
      setImage(null);setResult(friendlyFallback(language,sampleMode));
      setError(caught instanceof Error?caught.message:t("imageFailed",language));
    }
  };

  const chooseFile=(event)=>{
    const file=event.target.files?.[0];
    event.target.value="";
    setSampleId(null);
    void useFile(file);
  };

  const chooseSample=async(sample)=>{
    setMode(sample.mode);
    setLoading(true);setError("");setResult(null);setImage(null);setSaved(false);setSampleId(sample.id);
    try{
      const response=await fetch(sample.src,{cache:"no-store"});
      if(!response.ok)throw new Error("sample-not-installed");
      const blob=await response.blob();
      const file=new File([blob],sample.src.split("/").pop(),{type:blob.type||"image/jpeg"});
      await useFile(file,sample.id,sample.mode);
    }catch{
      const cached=getSeedLensResult(sample.id,language);
      setResult(normalizeResult(cached,language,sample.mode));
      setError(t("sampleUnavailable",language));
    }finally{setLoading(false);}
  };

  const changeLanguage=(next)=>{
    setLanguage(next);storeLanguagePreference(LANGUAGE_KEY,next);setSpeechMessage("");
    if(image)void analyse(image,mode,next);
    else if(sampleId)setResult(normalizeResult(getSeedLensResult(sampleId,next),next,mode));
  };
  const changeMode=(next)=>{
    setMode(next);setSaved(false);setSpeechMessage("");
    if(image)void analyse(image,next,language);
    else if(sampleId){
      const sample=SAMPLE_IMAGES.find((item)=>item.id===sampleId);
      if(sample&&sample.mode===next)setResult(normalizeResult(getSeedLensResult(sampleId,language),language,next));
      else setResult(friendlyFallback(language,next));
    }else if(result)setResult(friendlyFallback(language,next));
  };
  const speak=()=>{
    const content=result?.translation||result?.summary||"";
    if(!content||!("speechSynthesis" in window)||typeof SpeechSynthesisUtterance==="undefined"){
      setSpeechMessage(t("voiceUnavailable",language));return;
    }
    if(speaking){window.speechSynthesis.cancel();setSpeaking(false);setSpeechMessage("");return;}
    const voices=window.speechSynthesis.getVoices();
    const target=targetLanguageTag(language).toLowerCase();
    const voice=voices.find((item)=>item.lang?.toLowerCase()===target)
      ||voices.find((item)=>item.lang?.toLowerCase().split("-")[0]===language);
    if(!voice){setSpeechMessage(t("voiceUnavailable",language));return;}
    const utterance=new SpeechSynthesisUtterance(content);
    utterance.lang=voice.lang||target;
    utterance.voice=voice;
    utterance.onend=()=>setSpeaking(false);
    utterance.onerror=()=>{setSpeaking(false);setSpeechMessage(t("voiceUnavailable",language));};
    window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);setSpeaking(true);setSpeechMessage("");
  };
  const saveNote=()=>{
    if(!result||saved)return;
    const detail=[
      "Lens mode: "+mode,
      "Place: "+[location.city,location.country].filter(Boolean).join(", "),
      "Currency context: "+location.currency,
      "Detected language: "+(result.detectedLanguage||"unknown"),
      "Visible text: "+(result.detectedText||"No clear text could be read."),
      "Translation: "+(result.translation||result.summary||"No translation available."),
      mode==="price"?"Visible prices: "+(result.visiblePrices||[]).join("; ")+" · Impression: "+(result.verdict||"Can't tell")+(formatRange(result,location.currency,destination.locale)?" · Range: "+formatRange(result,location.currency,destination.locale):""):"",
      "AI estimate; verify locally. The app has not verified a business, tariff or exchange rate."
    ].filter(Boolean).join("\n");
    onRequest?.({title:"Atithi Lens note",category:"Image translation",detail});
    setSaved(true);
  };

  const dishes=Array.isArray(result?.dishes)?result.dishes:[];
  const prices=Array.isArray(result?.visiblePrices)?result.visiblePrices:[];
  const range=formatRange(result,location.currency,destination.locale);
  return <section className="space-y-4">
    <div><div className="flex items-center gap-2"><ImagePlus size={19} className="text-accent-text"/><h2 className="font-serif text-2xl">{t("lensTitle",language)}</h2></div><p className="mt-1 text-xs leading-relaxed text-muted">{t("lensIntro",language)}</p></div>
    <div className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-bg p-3 sm:grid-cols-3">
      <label className="block text-xs font-bold">{t("city",language)}<input value={location.city} maxLength={100} onChange={(event)=>setLocation({...location,city:event.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal"/></label>
      <label className="block text-xs font-bold">{t("country",language)}<input value={location.country} maxLength={100} onChange={(event)=>setLocation({...location,country:event.target.value})} className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal"/></label>
      <label className="block text-xs font-bold">{t("currency",language)}<input value={location.currency} maxLength={3} onChange={(event)=>setLocation({...location,currency:event.target.value.toUpperCase().replace(/[^A-Z]/g,"").slice(0,3)})} pattern="[A-Za-z]{3}" className="mt-1 min-h-10 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm font-normal uppercase"/></label>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <label className="flex items-center gap-2 text-xs font-bold">{t("targetLanguage",language)}<select value={language} onChange={(event)=>changeLanguage(event.target.value)} className="min-h-10 rounded-lg border border-border bg-bg px-3 py-2 text-sm">{LANGUAGE_OPTIONS.map((item)=><option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      <div className="inline-flex rounded-xl border border-border bg-bg p-1" role="group" aria-label="Lens mode">{[["general","scan"],["menu","menu"],["price","price"]].map(([value,key])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>changeMode(value)} className={"min-h-9 rounded-lg px-3 py-1.5 text-xs font-bold "+(mode===value?"bg-brand text-white":"text-muted hover:bg-surface-2")}>{t(key,language)}</button>)}</div>
    </div>
    <div className="rounded-xl border border-border bg-surface p-3"><h3 className="text-xs font-bold">{t("samplePhotos",language)}</h3><div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">{SAMPLE_IMAGES.map((sample)=><button key={sample.id} type="button" onClick={()=>void chooseSample(sample)} className="rounded-xl border border-border bg-bg p-3 text-left hover:bg-surface-2"><img src={sample.src} alt={t(sample.key,language)} onError={(event)=>{event.currentTarget.hidden=true;}} className="mb-2 h-20 w-full rounded-lg object-cover"/><span className="block text-sm font-bold">{t(sample.key,language)}</span><span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-accent-text">{t("samplePhotos",language)} <CheckCircle2 size={12}/></span></button>)}</div></div>
    <div className="rounded-xl border border-border bg-bg p-3"><label htmlFor="lens-image" className="block text-xs font-bold">{t("uploadPhoto",language)}</label><p className="mt-1 text-xs text-muted">{t("photoHelp",language)}</p><input id="lens-image" ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseFile} className="mt-3 block w-full text-xs text-muted file:mr-3 file:min-h-10 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-2 file:text-xs file:font-bold file:text-white"/>{image&&<img src={image.dataUrl} alt="Selected image preview" className="mt-3 max-h-48 max-w-full rounded-lg border border-border object-contain"/>}</div>
    {loading&&<p role="status" className="inline-flex items-center gap-2 text-sm text-muted"><LoaderCircle size={15} className="animate-spin"/>{t("reading",language)}</p>}
    {error&&<p role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"><AlertCircle size={14} className="mr-1 inline"/>{error}</p>}
    {result&&<article className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-border px-2.5 py-1 text-[9px] font-bold uppercase text-muted">{result.source==="ai-estimate"?"AI estimate":"Cached / fallback"}</span><span className="rounded-full bg-surface-2 px-2.5 py-1 text-[10px] font-bold">{niceConfidence(result.confidence)}</span></div>
      {result.detectedLanguage&&result.detectedLanguage!=="unknown"&&<p className="mt-3 text-[10px] text-muted">{t("detectedLanguage",language)}: {result.detectedLanguage}</p>}
      <h3 className="mt-3 text-sm font-bold">{t("originalText",language)}</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted">{result.detectedText||result.summary||t("noText",language)}</p>
      <h3 className="mt-3 text-sm font-bold">{t("translation",language)}</h3><p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed">{result.translation||result.summary||t("noText",language)}</p>
      {result.summary&&result.summary!==result.translation&&<><h3 className="mt-3 text-sm font-bold">{t("imageSummary",language)}</h3><p className="mt-1 text-sm leading-relaxed text-muted">{result.summary}</p></>}
      {mode==="menu"&&<div className="mt-3"><h3 className="text-sm font-bold">{t("dishDetails",language)}</h3><p className="mt-1 text-[10px] font-bold text-accent-text">{result.estimateNotice||t("estimateNotice",language)}</p>{dishes.length?<div className="mt-2 space-y-2">{dishes.map((dish,index)=><div key={dish.name+"-"+index} className="rounded-xl border border-border bg-bg p-3"><h4 className="text-sm font-bold">{dish.name}</h4><p className="mt-1 text-xs text-muted">{dish.explanation}</p><p className="mt-2 text-xs"><strong>{t("dietGuess",language)}:</strong> <span className="text-muted">{dish.dietGuess}</span></p><p className="mt-1 text-xs"><strong>{t("spiceGuess",language)}:</strong> <span className="text-muted">{dish.spiceGuess}</span></p><p className="mt-2 text-[10px] text-muted">{t("estimateNotice",language)}</p></div>)}</div>:<p className="mt-2 text-xs text-muted">{t("noText",language)}</p>}</div>}
      {mode==="price"&&<div className="mt-3 rounded-xl border border-border bg-bg p-3"><h3 className="text-sm font-bold">{t("priceRange",language)}</h3><p className="mt-1 text-lg font-bold">{range||"—"}</p>{prices.length>0&&<><h4 className="mt-3 text-xs font-bold">{t("visiblePrices",language)}</h4><ul className="mt-1 list-disc space-y-1 pl-5 text-xs text-muted">{prices.map((item,index)=><li key={index}>{item}</li>)}</ul></>}<p className="mt-3 inline-flex rounded-full bg-surface-2 px-2.5 py-1 text-xs font-bold">{t("verdict",language)}: {localVerdict(result.verdict||"Can't tell",language)}</p><p className="mt-2 text-xs leading-relaxed text-muted">{result.explanation||t("priceBasis",language)}</p><p className="mt-2 text-[10px] leading-relaxed text-muted">{t("priceBasis",language)}</p></div>}
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={speak} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-bold">{speaking?<VolumeX size={14}/>:<Volume2 size={14} />}{speaking?t("stopSpeaking",language):t("speak",language)}</button><button type="button" onClick={saveNote} disabled={saved} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white disabled:opacity-70"><Send size={14}/>{saved?t("requestSaved",language):t("askLocal",language)}</button></div>
      {speechMessage&&<p role="status" className="mt-2 text-xs leading-relaxed text-muted">{speechMessage}</p>}
      <p className="mt-3 text-[10px] leading-relaxed text-muted">{t("disclaimer",language)}</p>
    </article>}
  </section>;
}
function niceConfidence(value) {
  if (value==="high") return "High confidence";
  if (value==="medium") return "Medium confidence";
  return "Low confidence";
}
