import React, { useMemo, useRef, useState } from "react";
import { Download, Printer, ShieldCheck } from "lucide-react";
import { useDestination } from "../context/DestinationContext.jsx";
import { useHotelContext } from "../context/HotelContext.jsx";

export default function StayPass({ guest }) {
  const { destination } = useDestination();
  const { itinerary } = useHotelContext();
  const passRef = useRef(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [guestName, setGuestName] = useState(guest?.name || "Demo guest");
  const [qrUrl, setQrUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("QR is generated locally on this device.");
  const passData = useMemo(() => ({
    v: 1,
    guest: String(guestName || "Demo guest").slice(0, 80),
    hotel: destination.hotel.name,
    destination: destination.city + ", " + destination.country,
    dates: { checkIn: startDate || null, checkOut: endDate || null },
    hotelPhone: destination.hotel.phone,
    localEmergencyNumber: destination.emergencyNumber,
    itinerary: itinerary.slice(0, 8).map((item) => String(item.title).slice(0, 90)),
    disclaimer: "Self-generated demo pass; not an official registration.",
  }), [guestName, destination, startDate, endDate, itinerary]);

  const generateQr = async () => {
    setBusy(true);
    try {
      const qrModule = await import("qrcode");
      const QRCode = qrModule.default || qrModule;
      const url = await QRCode.toDataURL(JSON.stringify(passData), { errorCorrectionLevel: "M", margin: 1, width: 240 });
      setQrUrl(url);
      setStatus("QR generated on this device. No pass data was sent to a server.");
    } catch {
      setQrUrl("");
      setStatus("QR creation is unavailable right now. The print view remains available.");
    } finally {
      setBusy(false);
    }
  };

  const exportPng = async () => {
    setBusy(true);
    setStatus("");
    try {
      if (!qrUrl) {
        const qrModule = await import("qrcode");
        const QRCode = qrModule.default || qrModule;
        const url = await QRCode.toDataURL(JSON.stringify(passData), { errorCorrectionLevel: "M", margin: 1, width: 240 });
        setQrUrl(url);
      }
      const imageModule = await import("html-to-image");
      const dataUrl = await imageModule.toPng(passRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = "stay-pass-demo.png";
      link.href = dataUrl;
      link.click();
      setStatus("Stay Pass image prepared locally. Save it for offline access.");
    } catch {
      setStatus("PNG export was unavailable; opening the print view as a fallback.");
      try { window.print(); } catch { /* Keep the fallback status visible. */ }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent-text">Stay Pass · Demo</p>
        <h2 className="mt-1 font-serif text-2xl text-text">Your stay details, in one place.</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">This is self-generated and is not an official registration or booking confirmation.</p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-muted">Guest name
          <input value={guestName} onChange={(event) => setGuestName(event.target.value.slice(0, 80))} maxLength={80} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text" />
        </label>
        <label className="text-xs font-semibold text-muted">Hotel
          <input value={destination.hotel.name} readOnly className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-text" />
        </label>
        <label className="text-xs font-semibold text-muted">Check-in date
          <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text" />
        </label>
        <label className="text-xs font-semibold text-muted">Check-out date
          <input type="date" value={endDate} min={startDate || undefined} onChange={(event) => setEndDate(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text" />
        </label>
      </div>
      <article ref={passRef} className="stay-pass-card rounded-2xl border border-border bg-white p-5 text-slate-900 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-800">Atithi AI · Stay Pass</p><h3 className="mt-2 font-serif text-2xl">{guestName || "Demo guest"}</h3><p className="mt-1 text-sm">{destination.hotel.name}</p><p className="mt-1 text-xs text-slate-600">{destination.city}, {destination.country}</p></div>
          <span className="rounded-xl bg-teal-800 p-3 text-white"><ShieldCheck size={22} /></span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 pt-4 text-sm">
          <div><p className="text-xs text-slate-500">Check-in</p><p className="font-semibold">{startDate || "Not set"}</p></div>
          <div><p className="text-xs text-slate-500">Check-out</p><p className="font-semibold">{endDate || "Not set"}</p></div>
          <div><p className="text-xs text-slate-500">Hotel phone</p><p className="font-semibold">{destination.hotel.phone}</p></div>
          <div><p className="text-xs text-slate-500">Local emergency number</p><p className="font-semibold">{destination.emergencyNumber}</p></div>
        </div>
        <div className="mt-4 border-t border-slate-200 pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Itinerary summary · Demo</p>
          {itinerary.length ? <ul className="mt-2 space-y-1 text-sm">{itinerary.slice(0, 5).map((item) => <li key={item.id}>• {item.title}</li>)}</ul> : <p className="mt-2 text-sm">No stops added yet.</p>}
        </div>
        {qrUrl ? <img src={qrUrl} alt="Self-generated Stay Pass QR code" className="mx-auto mt-4 h-40 w-40" /> : <div className="mx-auto mt-4 flex h-40 w-40 items-center justify-center rounded-xl border border-dashed border-slate-300 px-4 text-center text-xs text-slate-500">Generate a self-generated QR containing this demo summary.</div>}
        <p className="mt-2 text-center text-[10px] text-slate-500">Self-generated, not an official registration.</p>
      </article>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={generateQr} disabled={busy} className="min-h-11 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text disabled:opacity-50">Generate QR locally</button>
        <button type="button" onClick={exportPng} disabled={busy} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Download size={16} /> Export PNG</button>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm font-semibold text-text"><Printer size={16} /> Print fallback</button>
      </div>
      <p role="status" aria-live="polite" className="text-xs leading-relaxed text-muted">{status}</p>
    </section>
  );
}
