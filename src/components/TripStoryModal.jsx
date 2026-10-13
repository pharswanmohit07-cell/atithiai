import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toBlob } from "html-to-image";
import { Check, Download, Leaf, LoaderCircle, Share2, Sparkles, Sun, X } from "lucide-react";
import { PLACES, getCrowd, getCrowdLevel } from "../data/places.js";

const STORY_WIDTH = 360;
const STORY_HEIGHT = 640;
const INR = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const WEATHER_LABELS = {
  sunny: { en: "Clear skies", hi: "खुला आसमान" },
  rainy: { en: "Rain in the hills", hi: "पहाड़ों में बारिश" },
  cloudy: { en: "Cloudy skies", hi: "बादल छाए हैं" },
};

function isHindi(language) {
  return /^hi(?:-|$)|hindi|हिंदी/i.test(String(language || ""));
}

function formatStoryDate(date, hindi) {
  return new Intl.DateTimeFormat(hindi ? "hi-IN" : "en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getLocalCaptionFallback(name, highlights, hindi) {
  if (hindi) {
    return [
      `${name || "यात्री"} — पहाड़ों ने आज अपनी एक नई कहानी सुनाई।`,
      `${highlights[0] || "हर मोड़"} से ${highlights[1] || "खामोश वादियों"} तक, कुछ यादें रास्तों से भी लंबी चलती हैं।`,
    ];
  }
  return [
    `${name || "Traveller"}, the mountains left a little light in your day.`,
    `From ${highlights[0] || "quiet paths"} to ${highlights[1] || "local discoveries"}, the best journeys give something back.`,
  ];
}

function getJourneyMetrics(itinerary = [], selectedIds = []) {
  const ids = new Set([
    ...itinerary.map((item) => item.placeId).filter(Boolean),
    ...selectedIds.filter(Boolean),
  ]);
  const journeyPlaces = Array.from(ids)
    .map((id) => PLACES.find((place) => place.id === id))
    .filter(Boolean);
  const spend = journeyPlaces.reduce((sum, place) => sum + Number(place.localSpendINR || 0), 0);
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  const lowCrowdPicks = journeyPlaces.filter((place) =>
    place.tags?.includes("low-crowd") ||
    getCrowdLevel(getCrowd(place, { isWeekend, isHoliday: false })) === "Low"
  ).length;
  return { spend, lowCrowdPicks, placeCount: journeyPlaces.length };
}

function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export default function TripStoryModal({
  open,
  onClose,
  guest,
  preferences,
  weather = "sunny",
  itinerary = [],
  crowdSelectionIds = [],
}) {
  const storyRef = useRef(null);
  const [caption, setCaption] = useState([]);
  const [captionSource, setCaptionSource] = useState("local");
  const [captionLoading, setCaptionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [previewScale, setPreviewScale] = useState(1);
  const [status, setStatus] = useState("");
  const [exportError, setExportError] = useState("");
  const language = preferences?.language || guest?.language || guest?.preferredLanguage || "en";
  const hindi = isHindi(language);
  const today = useMemo(() => new Date(), []);
  const dateLabel = useMemo(() => formatStoryDate(today, hindi), [today, hindi]);
  const guestName = String(guest?.name || guest?.fullName || "Traveller").trim().slice(0, 80);
  const highlights = useMemo(() => {
    const unique = [];
    const seen = new Set();
    for (const item of itinerary) {
      const title = String(item?.title || "").trim();
      if (!title || seen.has(title.toLowerCase())) continue;
      seen.add(title.toLowerCase());
      unique.push({ title, detail: String(item?.location || item?.desc || "").trim() });
      if (unique.length === 3) break;
    }
    return unique;
  }, [itinerary]);
  const metrics = useMemo(() => getJourneyMetrics(itinerary, crowdSelectionIds), [itinerary, crowdSelectionIds]);
  const weatherLabel = WEATHER_LABELS[weather]?.[hindi ? "hi" : "en"] || (hindi ? "पहाड़ों का मौसम" : "Mountain weather");
  const localCaption = useMemo(
    () => getLocalCaptionFallback(guestName, highlights.map((item) => item.title), hindi),
    [guestName, highlights, hindi],
  );
  const displayedCaption = caption.length === 2 ? caption : localCaption;

  useEffect(() => {
    const syncPreviewScale = () => setPreviewScale(Math.min(1, Math.max(0.65, (window.innerWidth - 40) / STORY_WIDTH)));
    syncPreviewScale();
    window.addEventListener("resize", syncPreviewScale);
    return () => window.removeEventListener("resize", syncPreviewScale);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10500);
    setCaption(localCaption);
    setCaptionSource("local");
    setCaptionLoading(true);
    setStatus("");
    setExportError("");

    fetch("/api/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        guestName,
        language: String(language).slice(0, 32),
        date: dateLabel,
        weather: weatherLabel,
        highlights: highlights.map((item) => item.title),
        lowCrowdPicks: metrics.lowCrowdPicks,
        estimatedLocalSpendINR: metrics.spend,
      }),
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Caption service unavailable");
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        const lines = Array.isArray(payload.lines)
          ? payload.lines.map((line) => String(line || "").trim()).filter(Boolean).slice(0, 2)
          : String(payload.caption || "").split("\n").map((line) => line.trim()).filter(Boolean).slice(0, 2);
        if (lines.length === 2) {
          setCaption(lines);
          setCaptionSource(payload.source === "gemini" ? "gemini" : "local");
        }
      })
      .catch(() => {
        // The local poetic caption is kept if the endpoint is unavailable or times out.
      })
      .finally(() => {
        if (!cancelled) setCaptionLoading(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [open, guestName, language, dateLabel, weatherLabel, highlights, metrics.lowCrowdPicks, metrics.spend, localCaption]);

  const makePng = useCallback(async () => {
    if (!storyRef.current) throw new Error("The story card is not ready yet.");
    await document.fonts?.ready;
    const blob = await toBlob(storyRef.current, {
      pixelRatio: 3,
      cacheBust: true,
      backgroundColor: "var(--surface-2)",
      width: STORY_WIDTH,
      height: STORY_HEIGHT,
      style: {
        width: `${STORY_WIDTH}px`,
        height: `${STORY_HEIGHT}px`,
        transform: "none",
        borderRadius: "0",
      },
    });
    if (!blob) throw new Error("Could not render the PNG in this browser.");
    return blob;
  }, []);

  const handleDownload = useCallback(async () => {
    setExporting(true);
    setExportError("");
    setStatus("");
    try {
      const blob = await makePng();
      saveBlob(blob, `atithi-trip-story-${today.toISOString().slice(0, 10)}.png`);
      setStatus("Your 1080 × 1920 Trip Story PNG is ready.");
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "PNG export failed. Try another browser.");
    } finally {
      setExporting(false);
    }
  }, [makePng, today]);

  const handleShare = useCallback(async () => {
    setExporting(true);
    setExportError("");
    setStatus("");
    try {
      const blob = await makePng();
      const filename = `atithi-trip-story-${today.toISOString().slice(0, 10)}.png`;
      if (typeof File === "function" && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
        const file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "My Trip Story · Atithi AI",
            text: displayedCaption.join("\n"),
          });
          setStatus("Your journey story was shared.");
        } else {
          saveBlob(blob, filename);
          setStatus("File sharing is unavailable here, so your PNG was downloaded instead.");
        }
      } else {
        saveBlob(blob, filename);
        setStatus("Image sharing is unavailable here, so your PNG was downloaded instead.");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        setExportError(error instanceof Error ? error.message : "Sharing failed. Download the PNG instead.");
      }
    } finally {
      setExporting(false);
    }
  }, [makePng, today, displayedCaption]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
          role="presentation"
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="trip-story-title"
            className="flex max-h-[96dvh] w-full max-w-[510px] flex-col overflow-hidden rounded-t-[28px] border border-border bg-surface text-text shadow-2xl sm:rounded-[28px]"
            initial={{ opacity: 0, y: 32, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 25, stiffness: 260 } }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-accent-text">A keepsake from the hills</p>
                <h2 id="trip-story-title" className="font-serif text-xl">Your Trip Story</h2>
              </div>
              <button type="button" aria-label="Close Trip Story" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted hover:bg-surface-2"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <div className="mx-auto origin-top" style={{ width: STORY_WIDTH * previewScale, height: STORY_HEIGHT * previewScale }}>
                <motion.div
                  ref={storyRef}
                  className="trip-story-art relative flex h-[640px] w-[360px] flex-col overflow-hidden text-white"
                  initial={{ opacity: 0, y: 18, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.55, ease: "easeOut" } }}
                  style={{
                    background: "linear-gradient(160deg, rgb(var(--brand-rgb)) 0%, rgb(var(--indigo-rgb)) 42%, rgb(var(--coral-rgb)) 74%, rgb(var(--accent-rgb)) 130%)",
                    boxShadow: "0 18px 44px rgb(var(--brand-rgb) / .28)",
                    transform: `scale(${previewScale})`,
                    transformOrigin: "top left",
                  }}
                >
                  <div className="pointer-events-none absolute -right-14 -top-9 h-52 w-52 rounded-full border border-white/45" />
                  <div className="pointer-events-none absolute -right-5 top-0 h-36 w-36 rounded-full bg-saffron/35 shadow-[0_0_70px_rgba(255,232,173,.7)]" />
                  <div className="pointer-events-none absolute -left-16 top-[245px] h-44 w-[490px] rounded-[50%] bg-teal/45 blur-[1px]" />
                  <div className="pointer-events-none absolute -bottom-10 -left-12 h-[220px] w-[510px] rounded-[50%] bg-brand/95" />
                  <div className="pointer-events-none absolute -bottom-20 -right-24 h-[250px] w-[450px] rounded-[50%] bg-indigo/90" />
                  <div className="pointer-events-none absolute bottom-[100px] -left-16 h-36 w-[420px] rotate-[-8deg] rounded-[50%] bg-teal/90" />
                  <div className="relative z-10 flex h-full flex-col px-7 pb-5 pt-7">
                    <div className="flex items-center justify-between">
                      <span className="rounded-full border border-white/25 bg-white/30 px-3 py-1.5 text-[8px] font-extrabold uppercase tracking-[0.22em]">Atithi AI · Trip Guardian</span>
                      <span className="text-[9px] font-semibold tracking-wide">01 / HIMALAYAS</span>
                    </div>
                    <p className="mt-8 text-[9px] font-extrabold uppercase tracking-[0.28em] text-white/85">{dateLabel}</p>
                    <h1 className="mt-2 max-w-[295px] font-serif text-[37px] font-semibold leading-[0.98] tracking-[-0.04em]">A day well<br/><span className="italic">wandered.</span></h1>
                    <p className="mt-3 max-w-[280px] text-[13px] font-medium leading-relaxed text-white/85">A little less rush. A little more wonder.</p>

                    <div className="mt-4 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/55 bg-white/30 text-sm font-bold">{guestName.slice(0, 1).toUpperCase()}</div>
                      <div className="min-w-0"><p className="truncate text-[12px] font-extrabold">{guestName}</p><p className="text-[9px] font-medium text-white/75">{weatherLabel} · Dehradun & the hills</p></div>
                    </div>

                    <div className="mt-4 rounded-2xl border border-white/45 bg-brand/55 p-3.5 shadow-sm backdrop-blur-sm">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[8px] font-extrabold uppercase tracking-[0.2em] text-white/90">Today's highlights</p>
                        <Sparkles size={13}/>
                      </div>
                      {highlights.length ? highlights.map((item, index) => (
                        <div key={`${item.title}-${index}`} className="flex gap-2.5 border-t border-white/20 py-2 first:border-0">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">{index + 1}</span>
                          <div className="min-w-0"><p className="text-[10px] font-extrabold leading-snug">{item.title}</p>{item.detail && <p className="mt-0.5 line-clamp-1 text-[8px] leading-snug text-white/80">{item.detail}</p>}</div>
                        </div>
                      )) : <p className="py-2 text-[10px]">A few memorable moments, still to come.</p>}
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-2xl border border-white/35 bg-brand/85 p-3 text-white">
                        <Leaf size={15} className="mb-2 text-saffron"/>
                        <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-white/65">Local spend</p>
                        <p className="mt-0.5 font-serif text-[22px] leading-tight">₹{INR.format(metrics.spend)}</p>
                        <p className="mt-1 text-[7px] text-white/65">Estimated in local places</p>
                      </div>
                      <div className="rounded-2xl border border-white/45 bg-white/90 text-text p-3">
                        <Sun size={15} className="mb-2 text-coral"/>
                        <p className="text-[7px] font-bold uppercase tracking-[0.14em] text-brand">Low-crowd picks</p>
                        <p className="mt-0.5 font-serif text-[22px] leading-tight">{metrics.lowCrowdPicks}</p>
                        <p className="mt-1 text-[7px] text-brand">Quieter choices · estimated</p>
                      </div>
                    </div>

                    <div className="mt-auto rounded-2xl border border-white/35 bg-white/90 text-text px-3 py-2.5">
                      <p className="font-serif text-[12px] italic leading-snug">{displayedCaption[0]}</p>
                      <p className="mt-1 font-serif text-[11px] italic leading-snug">{displayedCaption[1]}</p>
                      <div className="mt-2 flex items-center justify-between border-t border-border/50 pt-2">
                        <span className="text-[7px] font-extrabold uppercase tracking-[0.18em]">Travel gently · Leave good behind</span>
                        <span className="text-[9px] font-black tracking-tight">atithi<span className="text-coral">.ai</span></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
              <p className="mx-auto mt-3 max-w-[360px] text-center text-[10px] leading-relaxed text-muted">Your share card is rendered at 1080 × 1920 pixels. Crowd and spending figures are estimated from your current itinerary.</p>
              {captionLoading && <p className="mt-2 flex items-center justify-center gap-2 text-[10px] text-muted"><LoaderCircle className="animate-spin" size={12}/>Writing a two-line caption…</p>}
              {captionSource === "local" && !captionLoading && <p className="mt-2 text-center text-[9px] text-muted">Local caption · works even when AI is offline</p>}
              {status && <p role="status" className="mt-2 text-center text-xs text-emerald-700 dark:text-emerald-300"><Check size={13} className="mr-1 inline"/> {status}</p>}
              {exportError && <p role="alert" className="mt-2 text-center text-xs text-rose-600">{exportError}</p>}
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-t border-border bg-surface p-3 sm:p-4">
              <button type="button" disabled={exporting} onClick={handleShare} className="flex items-center justify-center gap-2 rounded-xl bg-brand px-3 py-3 text-xs font-bold text-white shadow-sm transition hover:opacity-90 disabled:opacity-55">
                {exporting ? <LoaderCircle size={15} className="animate-spin"/> : <Share2 size={15}/>} Share your journey
              </button>
              <button type="button" disabled={exporting} onClick={handleDownload} className="flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-3 text-xs font-bold text-text transition hover:bg-border disabled:opacity-55">
                {exporting ? <LoaderCircle size={15} className="animate-spin"/> : <Download size={15}/>} Download PNG
              </button>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
