// Simulated operating data only; never use this as live room inventory.
function buildRooms({ readyAt10 = 6, readyAt12 = 13, lateBusy = 24 } = {}) {
  const times = ["12:30", "13:30", "14:00", "15:00", "16:00", "17:30", "18:00"];
  return Array.from({ length: 40 }, (_, index) => ({
    roomId: String(101 + index),
    readyAt: index < readyAt10 ? (index % 2 ? "10:30" : "10:00") : index < readyAt12 ? (index % 2 ? "12:00" : "11:00") : "14:00",
    nextBookingTime: times[index % times.length],
    nextBookingDayOffset: index < lateBusy ? 0 : (index % 3 === 0 ? 1 : 2),
    earlyEligible: index % 11 !== 0,
  }));
}
const states = {
  jaipur: { label: "DEMO weekday profile", cleaningBufferMinutes: 120, rooms: buildRooms({ readyAt10: 8, readyAt12: 16, lateBusy: 25 }), occupancyByHour: { "09:00": 0.62, "10:00": 0.66, "11:00": 0.70, "12:00": 0.74, "13:00": 0.78, "14:00": 0.76, "15:00": 0.73, "16:00": 0.70, "17:00": 0.68, "18:00": 0.71 } },
  ubud: { label: "DEMO weekday profile", cleaningBufferMinutes: 120, rooms: buildRooms({ readyAt10: 5, readyAt12: 13, lateBusy: 29 }), occupancyByHour: { "09:00": 0.70, "10:00": 0.74, "11:00": 0.78, "12:00": 0.82, "13:00": 0.85, "14:00": 0.83, "15:00": 0.81, "16:00": 0.79, "17:00": 0.80, "18:00": 0.82 } },
  lisbon: { label: "DEMO weekday profile", cleaningBufferMinutes: 120, rooms: buildRooms({ readyAt10: 7, readyAt12: 15, lateBusy: 23 }), occupancyByHour: { "09:00": 0.58, "10:00": 0.62, "11:00": 0.65, "12:00": 0.69, "13:00": 0.71, "14:00": 0.69, "15:00": 0.67, "16:00": 0.65, "17:00": 0.66, "18:00": 0.68 } },
};
export function getDailyHotelState(destinationId) {
  const state = states[destinationId] || states.jaipur;
  return { label: state.label, cleaningBufferMinutes: state.cleaningBufferMinutes, rooms: state.rooms.map((room) => ({ ...room })), occupancyByHour: { ...state.occupancyByHour } };
}
export const HOTEL_STATE = Object.freeze({ jaipur: getDailyHotelState("jaipur"), ubud: getDailyHotelState("ubud"), lisbon: getDailyHotelState("lisbon") });
