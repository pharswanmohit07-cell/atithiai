import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2, X } from "lucide-react";

export const DRAFT_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
  { value: "id", label: "Indonesian" }
];

async function copyDraft(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch { /* Try the local selection fallback. */ }
  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.readOnly = true;
    field.setAttribute("aria-hidden", "true");
    field.style.position = "fixed";
    field.style.opacity = "0";
    field.style.fontSize = "16px";
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand("copy");
    field.remove();
    return copied;
  } catch {
    return false;
  }
}

export default function DraftSheet({
  title,
  description = "",
  message,
  onMessageChange,
  onClose,
  disclaimer,
  language = "en",
  onLanguageChange,
  showWhatsApp = false,
  children
}) {
  const [feedback, setFeedback] = useState("");
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    const onKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const safeMessage = String(message || "").slice(0, 500);
  const copy = async () => {
    const copied = await copyDraft(safeMessage);
    setFeedback(copied ? "Draft copied. Nothing was sent." : "Copy was not available. Select and copy the draft text manually.");
  };
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: title || "Atithi AI draft", text: safeMessage });
        setFeedback("Share sheet opened. Review it before sending.");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }
    const copied = await copyDraft(safeMessage);
    setFeedback(copied ? "Sharing is unavailable here, so the draft was copied instead." : "Sharing and copy are unavailable. Select and copy the draft text manually.");
  };

  return <div
    className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 px-0 sm:items-center sm:px-4"
    role="presentation"
    onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="draft-sheet-title"
      className="w-full max-h-[92dvh] max-w-xl overflow-y-auto border border-border bg-surface p-4 text-text shadow-xl sm:max-h-[85vh] sm:rounded-xl sm:p-6"
      style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="draft-sheet-title" className="font-display text-2xl sm:text-3xl">{title}</h2>
          {description && <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>}
        </div>
        <button type="button" onClick={onClose} aria-label="Close draft" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center border border-border bg-surface"><X size={18} aria-hidden="true"/></button>
      </header>
      {children}
      {typeof onLanguageChange === "function" && <label className="mt-4 block text-xs font-bold text-muted">Draft language
        <select value={DRAFT_LANGUAGES.some((item) => item.value === language) ? language : "en"} onChange={(event) => onLanguageChange(event.target.value)} className="mt-1 min-h-11 w-full border border-border bg-bg px-3 py-2 text-base text-text">
          {DRAFT_LANGUAGES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
      </label>}
      <label className="mt-4 block text-xs font-bold text-muted">Edit before you send
        <textarea value={safeMessage} onChange={(event) => onMessageChange(event.target.value.slice(0, 500))} maxLength={500} rows={5} className="mt-1 min-h-32 w-full resize-y border border-border bg-bg px-3 py-3 text-base font-normal leading-relaxed text-text" style={{ fontSize: "16px" }} />
      </label>
      <p className="mt-1 text-right text-[10px] text-muted">{safeMessage.length}/500 characters</p>
      {disclaimer && <p className="mt-3 border-l-2 border-brand bg-surface-2 p-3 text-xs leading-relaxed text-text">{disclaimer}</p>}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <button type="button" onClick={copy} className="inline-flex min-h-11 items-center justify-center gap-2 border border-border bg-surface px-3 py-2 text-sm font-bold"><Copy size={15} aria-hidden="true"/>Copy</button>
        <button type="button" onClick={share} className="inline-flex min-h-11 items-center justify-center gap-2 border border-border bg-surface px-3 py-2 text-sm font-bold"><Share2 size={15} aria-hidden="true"/>Share</button>
        {showWhatsApp && <a href={"https://wa.me/?text=" + encodeURIComponent(safeMessage)} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center gap-2 border border-border bg-surface px-3 py-2 text-sm font-bold sm:flex-1">Open WhatsApp</a>}
        <button type="button" onClick={onClose} className="inline-flex min-h-11 items-center justify-center gap-2 bg-brand px-3 py-2 text-sm font-bold text-white sm:ml-auto"><Check size={15} aria-hidden="true"/>Done</button>
      </div>
      {feedback && <p role="status" className="mt-3 text-xs leading-relaxed text-muted">{feedback}</p>}
    </section>
  </div>;
}
