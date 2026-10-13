import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { toPng } from "html-to-image";
import QRCode from "qrcode";
import { CalendarDays, Download, ExternalLink, PhoneCall, ShieldCheck, WifiOff, X } from "lucide-react";

const PREFERENCES_KEY = "atithi-rescue-pass-preferences";
const PASS_WIDTH = 1080;
const PASS_HEIGHT = 1350;
const DISCLAIMER = "Informational only. Not a medical record or an official document.";

function readPreferences() {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFERENCES_KEY) || "{}");
    return {
      startDate: typeof saved.startDate === "string" ? saved.startDate : "",
      endDate: typeof saved.endDate === "string" ? saved.endDate : "",
      emergencyContact: typeof saved.emergencyContact === "string" ? saved.emergencyContact : "",
    };
  } catch {
    return { startDate: "", endDate: "", emergencyContact: "" };
  }
}

function savePreferences(value) {
  try {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(value));
  } catch {
    // Rescue Pass remains usable if browser storage is disabled.
  }
}

function formatDateTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value || "Time unavailable");
  return date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function normalizeItinerary(itinerary = []) {
  return itinerary.slice(0, 8).map((item, index) => ({
    day: item.dayLabel || (item.day ? "DAY " + item.day : "STOP " + (index + 1)),
    title: item.title || item.name || item.location || "Corridor waypoint",
    waypointId: item.waypointId || null,
    elevationM: Number.isFinite(Number(item.elevationM)) ? Number(item.elevationM) : null,
  }));
}

function normalizeActions(actions = []) {
  return actions.slice(0, 4).map((action) => ({
    title: String(action?.title || "Atithi action").slice(0, 100),
    status: String(action?.status || "Logged").slice(0, 40),
    time: String(action?.timestamp || action?.time || "").slice(0, 80),
    source: action?.source === "demo" ? "Demo" : "Atithi",
  }));
}

const RescuePass = forwardRef(function RescuePass({
  traveler,
  persona,
  tripItinerary = [],
  currentWaypoint,
  altitudeAdvisoryLevel,
  healthTags = [],
  actions = [],
}, ref) {
  const passRef = useRef(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState("");
  const [hasExported, setHasExported] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [scale, setScale] = useState(0.36);
  const initialPreferences = useMemo(() => readPreferences(), []);
  const [startDate, setStartDate] = useState(initialPreferences.startDate);
  const [endDate, setEndDate] = useState(initialPreferences.endDate);
  const [emergencyContact, setEmergencyContact] = useState(initialPreferences.emergencyContact);
  const [generatedAt] = useState(() => new Date().toISOString());

  const travelerName = traveler?.name?.trim() || "Traveller";
  const personaName = persona?.name || (persona?.id === "tourism-officer" ? "Tourism Officer" : "Guest profile");
  const waypointName = currentWaypoint?.name || "Not selected";
  const elevation = Number.isFinite(Number(currentWaypoint?.elevationM)) ? Number(currentWaypoint.elevationM) : null;
  const safeTags = healthTags.filter((tag) => typeof tag === "string" && tag.trim() && tag !== "none").slice(0, 4);
  const tagLabels = safeTags.length ? safeTags.map((tag) => tag === "BP" ? "BP / hypertension (demo)" : tag + " (demo)") : ["No tags provided (demo profile)"];
  const itinerary = useMemo(() => normalizeItinerary(tripItinerary), [tripItinerary]);
  const latestActions = useMemo(() => normalizeActions(actions), [actions]);
  const tripDates = startDate || endDate
    ? (startDate ? formatDateTime(startDate + "T12:00:00").split(",")[0] : "Date not set")
      + " — " + (endDate ? formatDateTime(endDate + "T12:00:00").split(",")[0] : "Date not set")
    : "Trip dates not entered";

  const passData = useMemo(() => ({
    v: 1,
    traveler: travelerName,
    persona: personaName,
    tripDates: { start: startDate || null, end: endDate || null, label: tripDates },
    itinerary: itinerary.map((stop) => ({
      day: stop.day,
      waypoint: stop.title,
      ...(stop.elevationM == null ? {} : { elevationM: stop.elevationM }),
    })),
    currentWaypoint: {
      name: waypointName,
      elevationM: elevation,
    },
    altitudeAdvisoryLevel: altitudeAdvisoryLevel || "Not assessed",
    healthTags: tagLabels,
    emergency: {
      general: "112",
      travelerContact: emergencyContact.trim() || "Not provided",
    },
    actionsTaken: latestActions,
    generatedBy: "Atithi AI",
    generatedAt,
    disclaimer: DISCLAIMER,
  }), [
    travelerName, personaName, startDate, endDate, tripDates, itinerary, waypointName,
    elevation, altitudeAdvisoryLevel, tagLabels, emergencyContact, latestActions, generatedAt,
  ]);

  const qrPayload = useMemo(() => JSON.stringify(passData), [passData]);

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#142820", light: "#FFFFFF" },
    })
      .then((url) => { if (active) setQrCodeUrl(url); })
      .catch(() => { if (active) setQrCodeUrl(""); });
    return () => { active = false; };
  }, [qrPayload]);

  useEffect(() => {
    savePreferences({ startDate, endDate, emergencyContact });
  }, [startDate, endDate, emergencyContact]);

  const updateScale = useCallback(() => {
    if (typeof window === "undefined") return;
    const nextScale = Math.min(
      0.58,
      (window.innerWidth - 36) / PASS_WIDTH,
      (window.innerHeight - 230) / PASS_HEIGHT,
    );
    setScale(Math.max(0.16, nextScale));
  }, []);

  const openPreview = useCallback(() => {
    updateScale();
    setPreviewOpen(true);
  }, [updateScale]);

  const closePreview = useCallback(() => setPreviewOpen(false), []);

  const exportPass = useCallback(async () => {
    if (!passRef.current || !qrCodeUrl) {
      setToast("Rescue Pass is preparing. Try export again in a moment.");
      return;
    }
    setExporting(true);
    setToast("");
    try {
      const dataUrl = await toPng(passRef.current, {
        cacheBust: true,
        pixelRatio: 1,
        width: PASS_WIDTH,
        height: PASS_HEIGHT,
        backgroundColor: "#F6F7F3",
        style: {
          transform: "none",
          transformOrigin: "top left",
          width: PASS_WIDTH + "px",
          height: PASS_HEIGHT + "px",
        },
      });
      const anchor = document.createElement("a");
      anchor.download = "rescue-pass.png";
      anchor.href = dataUrl;
      anchor.click();

      try {
        if (typeof navigator !== "undefined" && typeof navigator.share === "function" && typeof navigator.canShare === "function") {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], "rescue-pass.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({ files: [file], title: "Atithi AI Offline Rescue Pass", text: "Save this image to your gallery; it needs no internet." });
            } catch {
              // The PNG has already been downloaded. A dismissed share sheet is not an export failure.
            }
          }
        }
      } catch {
        // Sharing is optional; the downloaded PNG is the primary export.
      }

      setHasExported(true);
      setToast("Rescue Pass exported. Works offline — save this image to your gallery; it needs no internet.");
      window.setTimeout(() => setToast(""), 7000);
    } catch {
      setToast("PNG export is unavailable. Opening print view so you can save or print the pass.");
      try {
        window.print();
      } catch {
        // Leave the print fallback message on screen.
      }
    } finally {
      setExporting(false);
    }
  }, [qrCodeUrl]);

  useImperativeHandle(ref, () => ({
    openPreview,
    closePreview,
    exportPass,
  }), [openPreview, closePreview, exportPass]);

  const fieldStyle = {
    width: "100%",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "10px 12px",
    background: "var(--surface)",
    color: "var(--text)",
    fontSize: 12,
  };

  const card = (
    <div
      ref={passRef}
      className="rescue-pass-print-root rescue-pass-print-card"
      style={{
        width: PASS_WIDTH,
        height: PASS_HEIGHT,
        boxSizing: "border-box",
        padding: 44,
        background: "#F6F7F3",
        color: "#192B24",
        fontFamily: "Arial, Helvetica, sans-serif",
        position: "fixed",
        top: 0,
        left: -16000,
        zIndex: -1,
        overflow: "hidden",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      <div style={{ width: "100%", height: "100%", border: "3px solid #19392F", borderRadius: 28, overflow: "hidden", display: "flex", flexDirection: "column", background: "#FFFFFF" }}>
        <div style={{ background: "#19392F", color: "#FFFFFF", padding: "31px 38px 29px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 16, letterSpacing: 4, fontWeight: 800, color: "#E8C18A" }}>ATITHI AI · TRAVEL SAFETY</div>
            <div style={{ fontSize: 39, letterSpacing: 0.2, fontWeight: 800, marginTop: 10 }}>OFFLINE RESCUE PASS</div>
            <div style={{ fontSize: 17, marginTop: 8, color: "#DDE7E0" }}>Personal trip summary · informational use only</div>
          </div>
          <div style={{ width: 88, height: 88, borderRadius: 44, border: "2px solid #E8C18A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 43, color: "#E8C18A", fontWeight: 800 }}>A</div>
        </div>

        <div style={{ padding: "28px 34px 18px", display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 24 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#4F655C", letterSpacing: 2 }}>TRAVELLER</div>
              <div style={{ fontSize: 36, fontWeight: 800, marginTop: 6, overflowWrap: "anywhere" }}>{travelerName}</div>
              <div style={{ fontSize: 18, marginTop: 6, color: "#50645C" }}>Persona: {personaName}</div>
            </div>
            <div style={{ minWidth: 250, maxWidth: 350, border: "1px solid #B8C8BE", borderRadius: 15, padding: "17px 20px", background: "#EDF3EE" }}>
              <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: "#4F655C" }}>TRIP DATES</div>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 8 }}>{tripDates}</div>
              <div style={{ fontSize: 13, marginTop: 7, color: "#5D7067" }}>Add or update dates in pass preview</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: 16 }}>
            <div style={{ borderRadius: 18, padding: 20, background: "#E6F0E8", border: "1px solid #B8D1BE" }}>
              <div style={{ fontSize: 13, color: "#486455", fontWeight: 800, letterSpacing: 1.8 }}>CURRENT WAYPOINT</div>
              <div style={{ fontSize: 30, fontWeight: 800, marginTop: 9 }}>{waypointName}</div>
              <div style={{ fontSize: 19, marginTop: 7 }}>Elevation: {elevation == null ? "Not available" : elevation.toLocaleString("en-IN") + " m"}</div>
            </div>
            <div style={{ borderRadius: 18, padding: 20, background: "#FFF3DC", border: "1px solid #E5C58D" }}>
              <div style={{ fontSize: 13, color: "#80551E", fontWeight: 800, letterSpacing: 1.5 }}>ALTITUDE ADVISORY</div>
              <div style={{ fontSize: 28, fontWeight: 800, marginTop: 13 }}>{altitudeAdvisoryLevel || "Not assessed"}</div>
              <div style={{ fontSize: 14, marginTop: 7, color: "#795D36" }}>General guidance, not medical advice</div>
            </div>
          </div>

          <div style={{ border: "1px solid #C9D3CD", borderRadius: 17, padding: "17px 20px" }}>
            <div style={{ fontSize: 14, color: "#4F655C", fontWeight: 800, letterSpacing: 1.6 }}>HEALTH TAGS · DEMO PROFILE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 12 }}>
              {tagLabels.map((tag) => <span key={tag} style={{ fontSize: 15, fontWeight: 700, color: "#19392F", background: "#EAF0EB", border: "1px solid #C5D5CA", borderRadius: 40, padding: "9px 15px" }}>{tag}</span>)}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 18, minHeight: 325 }}>
            <div style={{ border: "1px solid #CAD3CE", borderRadius: 17, padding: "17px 20px" }}>
              <div style={{ fontSize: 14, color: "#4F655C", fontWeight: 800, letterSpacing: 1.6 }}>ITINERARY SUMMARY</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                {itinerary.map((stop, index) => (
                  <div key={stop.day + stop.title + index} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 27, height: 27, borderRadius: 14, flexShrink: 0, background: "#19392F", color: "#FFFFFF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>{index + 1}</div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: 15, lineHeight: 1.25, fontWeight: 800 }}>{stop.title}</div>
                      <div style={{ fontSize: 11, lineHeight: 1.3, marginTop: 3, color: "#607067" }}>{stop.day}{stop.elevationM == null ? "" : " · approx. " + stop.elevationM.toLocaleString("en-IN") + " m"}</div>
                    </div>
                  </div>
                ))}
                {!itinerary.length && <div style={{ fontSize: 15, color: "#5D7067" }}>No itinerary stops are currently listed.</div>}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
              <div style={{ border: "1px solid #C5D1C9", borderRadius: 17, padding: "15px 17px", background: "#FBFCFA" }}>
                <div style={{ fontSize: 14, color: "#4F655C", fontWeight: 800, letterSpacing: 1.4 }}>EMERGENCY CONTACTS</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 13 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: "#19392F", color: "white", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 20, fontWeight: 800 }}>112</span></div>
                  <div><div style={{ fontSize: 17, fontWeight: 800 }}>112</div><div style={{ fontSize: 12, marginTop: 3, color: "#5D7067" }}>General emergency</div></div>
                </div>
                <div style={{ marginTop: 15, borderTop: "1px solid #D7DED9", paddingTop: 12 }}>
                  <div style={{ fontSize: 12, color: "#5D7067" }}>Traveller's own contact</div>
                  <div style={{ fontSize: 17, fontWeight: 700, marginTop: 4, overflowWrap: "anywhere" }}>{emergencyContact.trim() || "Not provided"}</div>
                </div>
              </div>

              <div style={{ border: "1px solid #C5D1C9", borderRadius: 17, padding: "15px 17px", textAlign: "center", flex: 1 }}>
                {qrCodeUrl
                  ? <img src={qrCodeUrl} alt="Self-generated Rescue Pass QR code" style={{ width: 190, height: 190, margin: "0 auto", imageRendering: "pixelated" }}/>
                  : <div style={{ width: 190, height: 190, margin: "0 auto", background: "#E8EDE9", borderRadius: 10 }}/>}
                <div style={{ fontSize: 13, fontWeight: 800, marginTop: 7 }}>PASS DATA QR</div>
                <div style={{ fontSize: 10, lineHeight: 1.3, color: "#6A776F", marginTop: 4 }}>Self-generated, not an official registration</div>
              </div>
            </div>
          </div>

          <div style={{ borderRadius: 17, border: "1px solid #CAD3CE", padding: "15px 20px" }}>
            <div style={{ fontSize: 14, color: "#4F655C", fontWeight: 800, letterSpacing: 1.6 }}>ACTIONS TAKEN BY ATITHI · LATEST ENTRIES</div>
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              {latestActions.length
                ? latestActions.map((action, index) => (
                  <div key={action.title + index} style={{ flex: 1, minWidth: 0, borderLeft: "4px solid #DAB477", paddingLeft: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.3 }}>{action.title}</div>
                    <div style={{ fontSize: 11, color: "#5D7067", marginTop: 5 }}>{action.status}{action.time ? " · " + action.time : ""}</div>
                  </div>
                ))
                : <div style={{ fontSize: 14, color: "#5D7067" }}>No Atithi actions have been recorded yet.</div>}
            </div>
          </div>

          <div style={{ borderTop: "2px solid #DCE3DD", paddingTop: 13, display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 18 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Generated by Atithi AI on {formatDateTime(generatedAt)}</div>
              <div style={{ fontSize: 12, color: "#5D7067", marginTop: 5 }}>{DISCLAIMER}</div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11, color: "#5D7067", flexShrink: 0 }}>Approximate corridor data<br/>Keep official instructions handy</div>
          </div>
        </div>
      </div>
    </div>
  );

  const exportLabel = exporting ? "Preparing PNG…" : "Export Rescue Pass";

  return (
    <>
      <style>{`
        @media print {
          @page { size: 8in 10in; margin: 0; }
          html, body { margin: 0 !important; padding: 0 !important; background: #FFFFFF !important; }
          body * { visibility: hidden !important; }
          .rescue-pass-print-root, .rescue-pass-print-root * { visibility: visible !important; }
          .rescue-pass-print-root {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 1080px !important;
            height: 1350px !important;
            z-index: 999999 !important;
            overflow: hidden !important;
            transform: none !important;
            box-shadow: none !important;
          }
          .rescue-pass-preview-layer, .rescue-pass-toast { display: none !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
      {card}

      {previewOpen && (
        <div className="rescue-pass-preview-layer fixed inset-0 z-[180] flex flex-col items-center overflow-y-auto bg-black/65 p-4 text-text backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Offline Rescue Pass preview">
          <div className="mb-3 flex w-full max-w-3xl items-center justify-between gap-3 rounded-2xl border border-border bg-surface px-4 py-3 shadow-xl">
            <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent-text">Atithi AI · Personal travel summary</p><h2 className="mt-1 font-serif text-xl text-text">Offline Rescue Pass</h2></div>
            <button type="button" onClick={closePreview} aria-label="Close Rescue Pass preview" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-surface-2 text-text"><X size={17}/></button>
          </div>

          <div className="mb-4 grid w-full max-w-3xl gap-3 rounded-2xl border border-border bg-surface p-4 shadow-lg sm:grid-cols-3">
            <label className="text-xs font-semibold text-muted">Trip start date<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} style={fieldStyle} className="mt-1.5 block"/></label>
            <label className="text-xs font-semibold text-muted">Trip end date<input type="date" min={startDate || undefined} value={endDate} onChange={(event) => setEndDate(event.target.value)} style={fieldStyle} className="mt-1.5 block"/></label>
            <label className="text-xs font-semibold text-muted">Your emergency contact<input type="tel" maxLength={40} value={emergencyContact} onChange={(event) => setEmergencyContact(event.target.value)} placeholder="Add a number" style={fieldStyle} className="mt-1.5 block"/></label>
          </div>

          <div style={{ width: PASS_WIDTH * scale, height: PASS_HEIGHT * scale, flexShrink: 0, overflow: "hidden", borderRadius: 8, boxShadow: "0 18px 70px rgba(0,0,0,.4)" }}>
            <div style={{ width: PASS_WIDTH, height: PASS_HEIGHT, transform: "scale(" + scale + ")", transformOrigin: "top left" }}>{card}</div>
          </div>

          <div className="my-4 flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 rounded-2xl border border-border bg-surface p-4 shadow-xl">
            <button type="button" onClick={exportPass} disabled={exporting || !qrCodeUrl} className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white disabled:opacity-50"><Download size={16}/>{exportLabel}</button>
            <button type="button" onClick={() => { void navigator.clipboard?.writeText(qrPayload); setToast("Compact pass data copied to clipboard."); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm font-semibold text-text"><ExternalLink size={15}/>Copy QR data</button>
          </div>
          <p className="mb-3 max-w-xl text-center text-[10px] leading-relaxed text-white/80">{DISCLAIMER} The QR code is self-generated and is not an official registration.</p>
        </div>
      )}

      {toast && <div className="rescue-pass-toast fixed bottom-5 left-1/2 z-[220] w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-emerald-700 bg-emerald-950 px-4 py-3 text-sm font-semibold text-white shadow-2xl" role="status" aria-live="polite"><div className="flex items-start gap-2"><ShieldCheck size={18} className="mt-0.5 shrink-0 text-emerald-300"/><div>{toast}{hasExported && <div className="mt-1 flex items-center gap-1.5 text-xs font-normal text-emerald-100"><WifiOff size={13}/>Works offline. Save this image to your gallery; it needs no internet.</div>}</div></div></div>}
    </>
  );
});

export default RescuePass;
