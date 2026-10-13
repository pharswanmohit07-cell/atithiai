// The waypoint coordinates and elevations below are approximate planning values,
// not navigational guarantees. Verify route access, closures and local advice before travel.
export const DEFAULT_CORRIDOR_WAYPOINT_ID = "rudraprayag";

export const CORRIDOR_WAYPOINTS = [
  { id: "rishikesh", name: "Rishikesh", lat: 30.0869, lon: 78.2676, elevationM: 340, segment: "Day 1", desc: "Gateway town on the Ganges; begin with a route and weather check." },
  { id: "devprayag", name: "Devprayag", lat: 30.1465, lon: 78.5980, elevationM: 475, segment: "Day 1", desc: "Confluence stop; allow time for local road and parking conditions." },
  { id: "srinagar-garhwal", name: "Srinagar Garhwal", lat: 30.2230, lon: 78.7830, elevationM: 560, segment: "Day 1", desc: "Garhwal corridor town and practical resupply stop." },
  { id: "rudraprayag", name: "Rudraprayag", lat: 30.2844, lon: 78.9814, elevationM: 895, segment: "Day 1", desc: "Confluence town and the default weather observation waypoint." },
  { id: "guptkashi", name: "Guptkashi", lat: 30.5240, lon: 79.0770, elevationM: 1319, segment: "Day 2", desc: "Higher foothill stop; reassess conditions before continuing uphill." },
  { id: "sonprayag", name: "Sonprayag", lat: 30.6240, lon: 78.9880, elevationM: 1829, segment: "Day 2", desc: "Road and onward-journey checkpoint; confirm current access locally." },
  { id: "gaurikund", name: "Gaurikund", lat: 30.6500, lon: 79.0230, elevationM: 1982, segment: "Day 2", desc: "High-altitude trailhead area; follow official operating and safety guidance." },
  { id: "kedarnath", name: "Kedarnath", lat: 30.7352, lon: 79.0669, elevationM: 3583, segment: "Day 3", desc: "High-altitude destination; acclimatisation, official advisories and personal health matter." },
];

// DEMO DATA ONLY. These are illustrative village-area ideas, not verified properties,
// partner inventory, availability, prices quoted by hosts, or bookable homestays.
// Coordinates/elevations and spend estimates are approximate; no booking is possible.
export const DEMO_HOMESTAYS = [
  {
    id: "demo-byasi-village",
    name: "Byasi riverside village area",
    lat: 30.0420, lon: 78.4220, elevationM: 430,
    localSpendINR: 650, tags: ["community-led", "local-food", "river-corridor"],
    nearbyWaypointId: "rishikesh",
    shortDesc: "Illustrative village-stop idea along the river corridor.",
    listingStatus: "DEMO LISTING",
  },
  {
    id: "demo-pundal-ridge",
    name: "Pundal ridge village area",
    lat: 30.1650, lon: 78.6700, elevationM: 720,
    localSpendINR: 700, tags: ["local-food", "slow-travel", "hill-village"],
    nearbyWaypointId: "devprayag",
    shortDesc: "Illustrative quiet-ridge visit idea; no specific host or property is represented.",
    listingStatus: "DEMO LISTING",
  },
  {
    id: "demo-khirsu-forest",
    name: "Khirsu forest village area",
    lat: 30.2170, lon: 78.8900, elevationM: 1700,
    localSpendINR: 800, tags: ["forest", "local-food", "low-crowd"],
    nearbyWaypointId: "srinagar-garhwal",
    shortDesc: "Illustrative forest-side community visit idea; confirm access and local conditions.",
    listingStatus: "DEMO LISTING",
  },
  {
    id: "demo-ukhimath-trail",
    name: "Ukhimath trail village area",
    lat: 30.5170, lon: 79.2000, elevationM: 1311,
    localSpendINR: 850, tags: ["trail-culture", "local-food", "slow-travel"],
    nearbyWaypointId: "guptkashi",
    shortDesc: "Illustrative cultural-stop idea in the wider Kedarnath approach region.",
    listingStatus: "DEMO LISTING",
  },
  {
    id: "demo-saari-village",
    name: "Saari village area",
    lat: 30.5790, lon: 79.1050, elevationM: 1950,
    localSpendINR: 900, tags: ["village-walk", "local-food", "low-crowd"],
    nearbyWaypointId: "sonprayag",
    shortDesc: "Illustrative village-walk idea; not a real accommodation listing.",
    listingStatus: "DEMO LISTING",
  },
  {
    id: "demo-triyuginarayan",
    name: "Triyuginarayan village area",
    lat: 30.6300, lon: 79.2150, elevationM: 1980,
    localSpendINR: 950, tags: ["heritage", "local-food", "community-led"],
    nearbyWaypointId: "gaurikund",
    shortDesc: "Illustrative heritage-and-village stop idea; no rooms or bookings are offered.",
    listingStatus: "DEMO LISTING",
  },
];
