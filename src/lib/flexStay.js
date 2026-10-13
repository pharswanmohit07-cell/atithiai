const timeMinutes = (value) => {
  if (typeof value !== "string" || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};
function occupancyAt(state, time) {
  const rows = Object.entries(state?.occupancyByHour || {}).map(([hour, value]) => ({ minute: timeMinutes(hour), value: Number(value) })).filter((x) => x.minute !== null && Number.isFinite(x.value)).sort((a, b) => a.minute - b.minute);
  const item = rows.filter((x) => x.minute <= timeMinutes(time)).pop() || rows[0];
  return item ? Math.max(0, Math.min(1, item.value > 1 ? item.value / 100 : item.value)) : 0.5;
}
function tierFor(kind, time, tiers) {
  const target = timeMinutes(time);
  const valid = (tiers || []).filter((x) => Number.isFinite(Number(x.fee)) && Number(x.fee) >= 0);
  if (target === null) return null;
  if (kind === "early") return valid.filter((x) => timeMinutes(x.from) !== null && timeMinutes(x.from) <= target).sort((a, b) => timeMinutes(b.from) - timeMinutes(a.from))[0] || null;
  return valid.filter((x) => timeMinutes(x.until) !== null && timeMinutes(x.until) >= target).sort((a, b) => timeMinutes(a.until) - timeMinutes(b.until))[0] || null;
}
/** Deterministic demo rules; this function never reserves a room or confirms a booking. */
export function evaluateFlexStay({ hotel, dailyState, kind, time, settings } = {}) {
  const unavailable = (reason, fee = null) => ({ status: "unavailable", fee, reason });
  if (!hotel || !dailyState || !["early", "late"].includes(kind) || timeMinutes(time) === null) return unavailable("Choose a valid local time to calculate a demo offer.");
  const checkIn = timeMinutes(hotel.checkIn || "14:00");
  const checkOut = timeMinutes(hotel.checkOut || "11:00");
  const tiers = settings?.flexTiers?.[kind] || hotel.flexTiers?.[kind] || [];
  const earliest = settings?.cutoffs?.earlyEarliest || hotel.flexCutoffs?.earlyEarliest || ([...tiers].sort((a,b) => String(a.from).localeCompare(String(b.from)))[0]?.from || "10:00");
  const latest = settings?.cutoffs?.lateLatest || hotel.flexCutoffs?.lateLatest || ([...tiers].sort((a,b) => String(b.until).localeCompare(String(a.until)))[0]?.until || "15:00");
  const target = timeMinutes(time);
  if (kind === "early" && target >= checkIn) return unavailable("Choose a time before standard check-in at " + hotel.checkIn + ".");
  if (kind === "late" && target <= checkOut) return unavailable("Choose a time after standard check-out at " + hotel.checkOut + ".");
  if (kind === "early" && target < timeMinutes(earliest)) return unavailable("Demo policy starts early check-in at " + earliest + ". The front desk can review another time.");
  if (kind === "late" && target > timeMinutes(latest)) return unavailable("Demo policy ends late check-out at " + latest + ". The front desk can review another time.");
  const tier = tierFor(kind, time, tiers);
  if (!tier) return unavailable("No demo fee tier covers " + time + ". The hotel team can review it manually.");
  const rooms = Array.isArray(dailyState.rooms) ? dailyState.rooms : [];
  const occupancy = occupancyAt(dailyState, time);
  const occText = Math.round(occupancy * 100) + "% simulated occupancy";
  let eligible = 0;
  let status = "unavailable";
  let reason = "";
  if (kind === "early") {
    eligible = rooms.filter((room) => room.readyAt && timeMinutes(room.readyAt) <= target && room.earlyEligible !== false).length;
    if (eligible >= 6 && occupancy < 0.82) status = "available";
    else if (eligible > 0 && occupancy < 0.97) status = "maybe";
    reason = eligible === 0 ? "No simulated rooms are marked ready by " + time + ". " + occText + "." : eligible + " demo rooms are marked ready by " + time + "; " + occText + ". " + (status === "available" ? "This meets the demo readiness threshold." : "A room-readiness check is needed.");
  } else {
    const buffer = Number.isFinite(Number(dailyState.cleaningBufferMinutes)) ? Number(dailyState.cleaningBufferMinutes) : 120;
    eligible = rooms.filter((room) => timeMinutes(room.nextBookingTime) !== null && (Number(room.nextBookingDayOffset || 0) > 0 || timeMinutes(room.nextBookingTime) >= target + buffer)).length;
    if (eligible >= 10 && occupancy < 0.82) status = "available";
    else if (eligible > 0 && occupancy < 0.97) status = "maybe";
    reason = eligible === 0 ? "No simulated rooms have enough turn-around time after " + time + ". " + occText + "." : eligible + " demo rooms have enough simulated turn-around time; " + occText + ". " + (status === "available" ? "This meets the demo turn-around threshold." : "A schedule check is needed.");
  }
  if (occupancy >= 0.97) status = "unavailable";
  return { status, fee: Number(tier.fee), reason: reason + " Subject to hotel confirmation; this is not a reservation." };
}
export function statusLabel(status) {
  return status === "available" ? "Available in demo model" : status === "maybe" ? "Needs a room check" : "Not offered by demo rules";
}
