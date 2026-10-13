// Three-day illustrative corridor itinerary using approximate waypoints from corridor.js.
// Times are planning placeholders; road duration, access, permits and altitude risk vary.
export const CORRIDOR_ITINERARY = [
  {
    id: "day1-rishikesh", day: 1, dayLabel: "DAY 1 · RIVER CORRIDOR",
    time: "07:30 AM", waypointId: "rishikesh", title: "Rishikesh",
    desc: "Start after checking forecasts and current route advisories. Keep the first stop flexible.",
    location: "Ganges corridor", lat: 30.0869, lon: 78.2676, elevationM: 340,
  },
  {
    id: "day1-devprayag", day: 1, dayLabel: "DAY 1 · RIVER CORRIDOR",
    time: "10:00 AM", waypointId: "devprayag", title: "Devprayag",
    desc: "Pause at the confluence area; use marked access and respect local restrictions.",
    location: "Confluence area", lat: 30.1465, lon: 78.5980, elevationM: 475,
  },
  {
    id: "day1-srinagar", day: 1, dayLabel: "DAY 1 · RIVER CORRIDOR",
    time: "12:30 PM", waypointId: "srinagar-garhwal", title: "Srinagar Garhwal",
    desc: "Take a planned break and reassess weather, daylight and road conditions.",
    location: "Garhwal corridor", lat: 30.2230, lon: 78.7830, elevationM: 560,
  },
  {
    id: "day1-rudraprayag", day: 1, dayLabel: "DAY 1 · RIVER CORRIDOR",
    time: "03:30 PM", waypointId: "rudraprayag", title: "Rudraprayag",
    desc: "End the first leg with time to rest and check the next day's local advisories.",
    location: "Confluence town", lat: 30.2844, lon: 78.9814, elevationM: 895,
  },
  {
    id: "day2-guptkashi", day: 2, dayLabel: "DAY 2 · UPHILL APPROACH",
    time: "08:00 AM", waypointId: "guptkashi", title: "Guptkashi",
    desc: "Move onward only if road and weather conditions permit; keep a conservative schedule.",
    location: "Kedarnath approach", lat: 30.5240, lon: 79.0770, elevationM: 1319,
  },
  {
    id: "day2-sonprayag", day: 2, dayLabel: "DAY 2 · UPHILL APPROACH",
    time: "11:00 AM", waypointId: "sonprayag", title: "Sonprayag",
    desc: "Confirm current vehicle access, queue arrangements and official instructions locally.",
    location: "Access checkpoint", lat: 30.6240, lon: 78.9880, elevationM: 1829,
  },
  {
    id: "day2-gaurikund", day: 2, dayLabel: "DAY 2 · UPHILL APPROACH",
    time: "01:30 PM", waypointId: "gaurikund", title: "Gaurikund",
    desc: "Use as a decision point, not a promise to proceed; follow official trail and weather guidance.",
    location: "Trailhead area", lat: 30.6500, lon: 79.0230, elevationM: 1982,
  },
  {
    id: "day3-kedarnath", day: 3, dayLabel: "DAY 3 · HIGH ALTITUDE",
    time: "As officially advised", waypointId: "kedarnath", title: "Kedarnath",
    desc: "High-altitude destination. Follow current official access guidance, pace yourself and seek help for concerning symptoms.",
    location: "High-altitude destination", lat: 30.7352, lon: 79.0669, elevationM: 3583,
  },
];
