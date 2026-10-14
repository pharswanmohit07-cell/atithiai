import React, { useEffect, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { readLocalSuggestions, saveLocalSuggestion } from "../lib/localSuggestions.js";

export default function LocalSuggestionForm({ destinationId, variant = "discover" }) {
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState("");
  const [savedCount, setSavedCount] = useState(() => readLocalSuggestions(destinationId).length);

  useEffect(() => {
    setSavedCount(readLocalSuggestions(destinationId).length);
    setName("");
    setArea("");
    setDetails("");
    setFeedback("");
  }, [destinationId]);

  const save = (event) => {
    event.preventDefault();
    const result = saveLocalSuggestion(destinationId, { name, area, details });
    if (!result.ok) {
      setFeedback(result.reason === "storage-unavailable"
        ? "Local storage is unavailable in this browser. Keep a copy of your suggestion before closing."
        : "Add a place name, area and a short story before saving.");
      return;
    }
    setSavedCount(readLocalSuggestions(destinationId).length);
    setName("");
    setArea("");
    setDetails("");
    setFeedback("Thanks, a local curator would review this (demo).");
  };

  return <section className={variant === "discover" ? "rounded-xl border border-border bg-surface p-4 sm:p-5" : "min-w-0"}>
    <div className="flex items-center gap-2"><Sparkles size={17} className="text-accent-text" aria-hidden="true"/><h2 className="font-serif text-2xl">{variant === "discover" ? "Suggest a hidden gem" : "Suggest a correction or hidden gem"}</h2></div>
    <p className="mt-1 text-xs leading-relaxed text-muted">Share a place or local story for a possible future community-curation workflow. Suggestions are stored only on this device; no curator is contacted.</p>
    <form onSubmit={save} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label className="text-xs font-bold text-muted">Place name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value.slice(0,100))} className="mt-1 min-h-11 w-full border border-border bg-bg px-3 py-2 text-base font-normal text-text" style={{fontSize:"16px"}}/></label>
      <label className="text-xs font-bold text-muted">Area / neighbourhood<input required maxLength={120} value={area} onChange={(event) => setArea(event.target.value.slice(0,120))} className="mt-1 min-h-11 w-full border border-border bg-bg px-3 py-2 text-base font-normal text-text" style={{fontSize:"16px"}}/></label>
      <label className="text-xs font-bold text-muted sm:col-span-2">Why is it special?<textarea required maxLength={700} rows={3} value={details} onChange={(event) => setDetails(event.target.value.slice(0,700))} className="mt-1 min-h-24 w-full resize-y border border-border bg-bg px-3 py-3 text-base font-normal text-text" style={{fontSize:"16px"}} placeholder="A personal detail, craft, view or local story…"/></label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" className="inline-flex min-h-11 items-center gap-2 bg-brand px-4 py-2 text-xs font-bold text-white"><Send size={14} aria-hidden="true"/>Save suggestion locally</button>
        {feedback && <p role="status" className="text-xs font-semibold text-accent-text">{feedback}</p>}
      </div>
    </form>
    {savedCount > 0 && <p className="mt-3 text-[10px] text-muted">{savedCount} suggestion{savedCount === 1 ? "" : "s"} saved on this device.</p>}
  </section>;
}
