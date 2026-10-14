import React, { useEffect, useRef, useState } from "react";
import { ArrowLeft, ClipboardEdit, Hotel, MessageCircle, Phone, Users, X } from "lucide-react";
import DraftSheet, { DRAFT_LANGUAGES } from "./ui/DraftSheet.jsx";
import { buildHumanDraft } from "../lib/flexStay.js";
import { saveLocalSuggestion } from "../lib/localSuggestions.js";

export default function HumanHelpSheet({ destination, language = "en", onClose }) {
  const [view, setView] = useState("menu");
  const [draftState, setDraftState] = useState(null);
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [details, setDetails] = useState("");
  const [feedback, setFeedback] = useState("");
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const safeEmergencyNumber = String(destination?.emergencyNumber || "").replace(/[^0-9+]/g, "").slice(0, 20);
  const initialLanguage = DRAFT_LANGUAGES.some((item) => item.value === language) ? language : "en";

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const handleKeyDown = (event) => { if (event.key === "Escape") onCloseRef.current?.(); };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const openDraft = (kind) => {
    const message = buildHumanDraft({ kind, destinationCity: destination.city, language: initialLanguage });
    setDraftState({ kind, language: initialLanguage, message });
    setView("draft");
  };

  const changeLanguage = (nextLanguage) => {
    if (!draftState) return;
    setDraftState({
      ...draftState,
      language: nextLanguage,
      message: buildHumanDraft({ kind: draftState.kind, destinationCity: destination.city, language: nextLanguage })
    });
  };

  const saveSuggestion = (event) => {
    event.preventDefault();
    const result = saveLocalSuggestion(destination.id, { name, area, details });
    if (!result.ok) {
      setFeedback(result.reason === "storage-unavailable"
        ? "Local storage is unavailable in this browser. Keep a copy of your suggestion before closing."
        : "Add a short title, area, and description before saving.");
      return;
    }
    setFeedback(result.suggestion.status);
    setName("");
    setArea("");
    setDetails("");
  };

  if (view === "draft" && draftState) {
    return <DraftSheet
      title={draftState.kind === "host" ? "Draft a message to a local host" : "Draft a message to my hotel front desk"}
      description="Review the message and choose yourself whether to share it."
      message={draftState.message}
      onMessageChange={(message) => setDraftState({ ...draftState, message: message.slice(0,500) })}
      language={draftState.language}
      onLanguageChange={changeLanguage}
      disclaimer={draftState.kind === "host"
        ? "Demo host. No live host is connected. Atithi AI does not send this message or make a booking."
        : "Draft only. Atithi AI does not send this or contact anyone. Any arrival or departure request is subject to the hotel's decision and fees."}
      onClose={onClose}
    >
      <button type="button" onClick={() => setView("menu")} className="mt-4 inline-flex min-h-11 items-center gap-2 border border-border bg-surface px-3 py-2 text-sm font-semibold"><ArrowLeft size={15} aria-hidden="true"/>Back to human help</button>
    </DraftSheet>;
  }

  return <div
    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 px-0 sm:items-center sm:px-4"
    role="presentation"
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="human-help-title"
      className="w-full max-h-[92dvh] max-w-xl overflow-y-auto border border-border bg-surface p-4 text-text shadow-xl sm:max-h-[85vh] sm:rounded-xl sm:p-6"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 id="human-help-title" className="font-display text-2xl sm:text-3xl">Human help</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">Choose a local number, prepare your own message, or save a suggestion.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close human help" className="inline-flex min-h-11 min-w-11 items-center justify-center border border-border bg-surface"><X size={18} aria-hidden="true"/></button>
      </header>

      <p className="mt-4 border-l-2 border-brand bg-surface-2 p-3 text-sm leading-relaxed">In this demo, Atithi AI does not connect you to live staff.</p>

      <div className="mt-4 grid gap-2">
        <a href={safeEmergencyNumber ? "tel:" + safeEmergencyNumber : undefined} aria-disabled={!safeEmergencyNumber} className={"flex min-h-12 items-center gap-3 border border-border bg-bg p-3 text-sm font-semibold " + (!safeEmergencyNumber ? "pointer-events-none opacity-50" : "")}>
          <Phone size={18} aria-hidden="true"/><span className="flex-1">Local emergency number</span><strong>{safeEmergencyNumber || "Not listed"}</strong>
        </a>
        <button type="button" onClick={() => openDraft("hotel")} className="flex min-h-12 items-center gap-3 border border-border bg-bg p-3 text-left text-sm font-semibold"><Hotel size={18} aria-hidden="true"/>Draft a message to my hotel front desk</button>
        <button type="button" onClick={() => openDraft("host")} className="flex min-h-12 items-center gap-3 border border-border bg-bg p-3 text-left text-sm font-semibold"><MessageCircle size={18} aria-hidden="true"/>Draft a message to a local host</button>
        <button type="button" onClick={() => { setView("suggest"); setFeedback(""); }} className="flex min-h-12 items-center gap-3 border border-border bg-bg p-3 text-left text-sm font-semibold"><ClipboardEdit size={18} aria-hidden="true"/>Suggest a correction or hidden gem for our local curators</button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted">The emergency link opens your device's phone handler. Atithi AI does not dispatch help. Confirm the right local number and your location.</p>

      {view === "suggest" && <form onSubmit={saveSuggestion} className="mt-5 border-t border-border pt-4">
        <div className="flex items-center gap-2"><Users size={17} aria-hidden="true"/><h3 className="text-base font-bold">Suggestion for local curation</h3></div>
        <p className="mt-1 text-xs leading-relaxed text-muted">Saved in this browser only. No curator is contacted.</p>
        <label className="mt-3 block text-xs font-bold text-muted">Suggestion title<input value={name} onChange={(event) => setName(event.target.value.slice(0,100))} maxLength={100} required className="mt-1 min-h-11 w-full border border-border bg-bg px-3 py-2 text-base text-text" style={{fontSize:"16px"}}/></label>
        <label className="mt-3 block text-xs font-bold text-muted">Place or area<input value={area} onChange={(event) => setArea(event.target.value.slice(0,120))} maxLength={120} required className="mt-1 min-h-11 w-full border border-border bg-bg px-3 py-2 text-base text-text" style={{fontSize:"16px"}}/></label>
        <label className="mt-3 block text-xs font-bold text-muted">What should we know?<textarea value={details} onChange={(event) => setDetails(event.target.value.slice(0,700))} maxLength={700} rows={3} required className="mt-1 min-h-24 w-full resize-y border border-border bg-bg px-3 py-3 text-base text-text" style={{fontSize:"16px"}}/></label>
        <div className="mt-3 flex flex-wrap gap-2"><button type="submit" className="min-h-11 bg-brand px-4 py-2 text-sm font-bold text-white">Save suggestion locally</button><button type="button" onClick={() => setView("menu")} className="min-h-11 border border-border bg-surface px-4 py-2 text-sm font-semibold">Back</button></div>
        {feedback && <p role="status" className="mt-3 text-xs leading-relaxed text-muted">{feedback}</p>}
      </form>}
    </section>
  </div>;
}
