import React, { useMemo, useState } from "react";
import { Clock3, Copy, Hotel, Route } from "lucide-react";
import { buildRequestDraft, computeGaps } from "../lib/flexStay.js";
import { useProfile } from "../context/ProfileContext.jsx";
import DraftSheet, { DRAFT_LANGUAGES } from "./ui/DraftSheet.jsx";

const STORAGE_KEY = "atithi-flex-stay-v1";
const EMPTY_FORM = Object.freeze({ arrival: "", checkIn: "14:00", checkOut: "11:00", departure: "", hotelName: "" });

function validStoredTime(value, fallback) {
  return typeof value === "string" && (value === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(value)) ? value : fallback;
}

function readForm() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY_FORM };
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return { ...EMPTY_FORM };
    return {
      arrival: validStoredTime(value.arrival, ""),
      checkIn: validStoredTime(value.checkIn, "14:00") || "14:00",
      checkOut: validStoredTime(value.checkOut, "11:00") || "11:00",
      departure: validStoredTime(value.departure, ""),
      hotelName: typeof value.hotelName === "string" ? value.hotelName.slice(0, 120) : ""
    };
  } catch {
    return { ...EMPTY_FORM };
  }
}

function formatTime(value, locale) {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ""));
  if (!match) return value || "";
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC"
    }).format(new Date(Date.UTC(2020, 0, 1, Number(match[1]), Number(match[2]))));
  } catch {
    return value;
  }
}

function formatGap(minutes, locale) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const formatNumber = (value) => {
    try { return new Intl.NumberFormat(locale).format(value); } catch { return String(value); }
  };
  if (!hours) return formatNumber(mins) + " min";
  if (!mins) return formatNumber(hours) + " h";
  return formatNumber(hours) + " h " + formatNumber(mins) + " min";
}

export default function FlexStayPlanner({ destination, profile, onPlanAroundGap }) {
  const activeProfile = profile || useProfile().profile;
  const [form, setForm] = useState(readForm);
  const [sheet, setSheet] = useState(null);
  const preferredLanguage = DRAFT_LANGUAGES.some((item) => item.value === activeProfile?.languages?.[0]) ? activeProfile.languages[0] : "en";
  const gaps = useMemo(() => computeGaps(form), [form]);
  const hasEnteredTravelTime = Boolean(form.arrival || form.departure);

  const update = (field, value) => {
    const next = { ...form, [field]: value };
    setForm(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Keep edits available in this session if storage is unavailable. */ }
  };

  const openDraft = (kind) => {
    const time = kind === "early" ? (form.arrival ? form.arrival : form.checkIn) : (form.departure ? form.departure : form.checkOut);
    setSheet({
      kind,
      language: preferredLanguage,
      message: buildRequestDraft({ kind, time, hotelName: form.hotelName, language: preferredLanguage })
    });
  };

  const changeLanguage = (language) => {
    if (!sheet) return;
    const time = sheet.kind === "early" ? (form.arrival || form.checkIn) : (form.departure || form.checkOut);
    setSheet({ ...sheet, language, message: buildRequestDraft({ kind: sheet.kind, time, hotelName: form.hotelName, language }) });
  };

  const timeField = (field, label, value, required = false) => <label className="block min-w-0 text-xs font-bold text-muted">
    {label}
    <input
      type="time"
      value={value}
      onChange={(event) => update(field, event.target.value)}
      className="mt-1 min-h-11 w-full min-w-0 border border-border bg-bg px-3 py-2 text-base text-text"
      style={{ fontSize: "16px" }}
      aria-label={label}
      required={required}
    />
  </label>;

  return <section className="rounded-xl border border-border bg-surface p-4 sm:p-5" aria-labelledby="flex-stay-title">
    <div className="flex items-start gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-border bg-surface-2 text-brand" aria-hidden="true"><Clock3 size={20}/></span>
      <div className="min-w-0 flex-1">
        <h2 id="flex-stay-title" className="font-display text-2xl">Arriving early or leaving late?</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">Estimate the time gap and plan an easy stop, or prepare a message you can send yourself. The hotel decides availability and fees.</p>
      </div>
    </div>

    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {timeField("arrival", "Arrival time (optional)", form.arrival)}
      {timeField("checkIn", "Hotel check-in time", form.checkIn)}
      {timeField("checkOut", "Hotel check-out time", form.checkOut)}
      {timeField("departure", "Departure time (optional)", form.departure)}
      <label className="block text-xs font-bold text-muted sm:col-span-2">Hotel name (optional)
        <input type="text" value={form.hotelName} onChange={(event) => update("hotelName", event.target.value.slice(0,120))} maxLength={120} placeholder="Add the name for your own draft" className="mt-1 min-h-11 w-full border border-border bg-bg px-3 py-2 text-base text-text" style={{ fontSize: "16px" }}/>
      </label>
    </div>

    {!hasEnteredTravelTime && <p className="mt-4 border border-dashed border-border bg-bg p-3 text-sm leading-relaxed text-muted">Add your arrival or departure time to estimate a gap. Check-in defaults to 14:00 and check-out to 11:00 until you change them.</p>}

    {gaps.hasEarlyGap && <article className="mt-4 border border-border bg-bg p-4">
      <p className="text-sm font-bold">You have about {formatGap(gaps.earlyGapMin, destination.locale)} before check-in.</p>
      <p className="mt-1 text-xs text-muted">Arrival {formatTime(form.arrival, destination.locale)} · check-in {formatTime(form.checkIn, destination.locale)}.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onPlanAroundGap?.({ kind: "early", gapMinutes: gaps.earlyGapMin })} className="inline-flex min-h-11 items-center justify-center gap-2 bg-brand px-3 py-2 text-sm font-bold text-white"><Route size={15} aria-hidden="true"/>Plan around this gap</button>
        <button type="button" onClick={() => openDraft("early")} className="inline-flex min-h-11 items-center justify-center gap-2 border border-border bg-surface px-3 py-2 text-sm font-bold"><Hotel size={15} aria-hidden="true"/>Draft a request to my hotel</button>
      </div>
    </article>}

    {gaps.hasLateGap && <article className="mt-3 border border-border bg-bg p-4">
      <p className="text-sm font-bold">You have about {formatGap(gaps.lateGapMin, destination.locale)} between check-out and departure.</p>
      <p className="mt-1 text-xs text-muted">Check-out {formatTime(form.checkOut, destination.locale)} · departure {formatTime(form.departure, destination.locale)}.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => onPlanAroundGap?.({ kind: "late", gapMinutes: gaps.lateGapMin })} className="inline-flex min-h-11 items-center justify-center gap-2 bg-brand px-3 py-2 text-sm font-bold text-white"><Route size={15} aria-hidden="true"/>Plan around this gap</button>
        <button type="button" onClick={() => openDraft("late")} className="inline-flex min-h-11 items-center justify-center gap-2 border border-border bg-surface px-3 py-2 text-sm font-bold"><Hotel size={15} aria-hidden="true"/>Draft a request to my hotel</button>
      </div>
    </article>}

    {hasEnteredTravelTime && !gaps.hasEarlyGap && !gaps.hasLateGap && <p className="mt-4 border border-border bg-bg p-3 text-sm leading-relaxed text-muted">These times do not show an early-arrival or late-departure gap. If you are crossing midnight, enter the local arrival and departure times carefully.</p>}

    <section className="mt-4 border-t border-border pt-4">
      <h3 className="text-sm font-bold">If the hotel says no</h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-muted">
        <li>Ask whether luggage storage is possible.</li>
        <li>Ask whether late check-out has a fee before deciding.</li>
        <li>Plan an easy activity close to the hotel for the gap.</li>
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-muted">Draft only. Atithi AI does not send this or contact anyone. The hotel decides availability and fees.</p>
    </section>

    {sheet && <DraftSheet
      title={sheet.kind === "early" ? "Ask about early check-in" : "Ask about late check-out"}
      description="Review and edit this message before choosing how to share it."
      message={sheet.message}
      onMessageChange={(message) => setSheet({ ...sheet, message: message.slice(0,500) })}
      language={sheet.language}
      onLanguageChange={changeLanguage}
      disclaimer="Draft only. Atithi AI does not send this or contact anyone. The hotel decides availability and fees."
      showWhatsApp
      onClose={() => setSheet(null)}
    />}
  </section>;
}
