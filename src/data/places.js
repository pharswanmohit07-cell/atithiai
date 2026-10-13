// Regional destinations for the Atithi Himalayas Trip Guardian.
// Crowd, travel-time, and spending figures are demo estimates, never live measurements.
export const PLACE_TAGS = ["local-artisan", "eco-friendly", "low-crowd", "rain-friendly", "indoor"];

export const PLACES = [
  {
    id: "robbers-cave", name: "Robber's Cave (Gucchupani)", lat: 30.375982, lon: 78.060173,
    category: "nature", tags: [], baseCrowd: 88, travelMinutes: 25, localSpendINR: 280,
    shortDesc: "A narrow limestone gorge where a stream disappears beneath the rock.",
    description: "A narrow limestone gorge where a stream disappears beneath the rock.",
    relatedInterests: ["nature", "adventure"], indoor: false, outdoor: true,
  },
  {
    id: "sahastradhara", name: "Sahastradhara", lat: 30.3853, lon: 78.1298,
    category: "nature", tags: ["eco-friendly"], baseCrowd: 84, travelMinutes: 35, localSpendINR: 320,
    shortDesc: "A spring-fed valley known for its waterfalls and limestone formations.",
    description: "A spring-fed valley known for its waterfalls and limestone formations.",
    relatedInterests: ["nature", "wellness"], indoor: false, outdoor: true,
  },
  {
    id: "mindrolling-monastery", name: "Mindrolling Monastery", lat: 30.26182, lon: 77.99732,
    category: "spiritual", tags: ["indoor", "rain-friendly"], baseCrowd: 43, travelMinutes: 30, localSpendINR: 180,
    shortDesc: "A Tibetan Buddhist monastery with a large stupa and peaceful prayer spaces.",
    description: "A Tibetan Buddhist monastery with a large stupa and peaceful prayer spaces.",
    relatedInterests: ["spiritual", "culture"], indoor: true, outdoor: false,
  },
  {
    id: "paltan-bazaar", name: "Paltan Bazaar", lat: 30.320076, lon: 78.036565,
    category: "market", tags: ["local-artisan", "indoor"], baseCrowd: 90, travelMinutes: 20, localSpendINR: 650,
    shortDesc: "A lively central market for regional snacks, clothing, and everyday local finds.",
    description: "A lively central market for regional snacks, clothing, and everyday local finds.",
    relatedInterests: ["shopping", "food", "culture"], indoor: true, outdoor: false,
  },
  {
    id: "tapkeshwar-temple", name: "Tapkeshwar Temple", lat: 30.357272, lon: 78.016677,
    category: "spiritual", tags: ["eco-friendly"], baseCrowd: 64, travelMinutes: 25, localSpendINR: 140,
    shortDesc: "A cave-side Shiva shrine beside a seasonal stream in the wooded foothills.",
    description: "A cave-side Shiva shrine beside a seasonal stream in the wooded foothills.",
    relatedInterests: ["spiritual", "culture"], indoor: false, outdoor: true,
  },
  {
    id: "forest-research-institute", name: "Forest Research Institute", lat: 30.34191, lon: 78.00152,
    category: "heritage", tags: ["indoor", "rain-friendly", "eco-friendly"], baseCrowd: 56, travelMinutes: 25, localSpendINR: 260,
    shortDesc: "A landmark forestry campus with monumental colonial-era architecture and museums.",
    description: "A landmark forestry campus with monumental colonial-era architecture and museums.",
    relatedInterests: ["culture", "nature"], indoor: true, outdoor: false,
  },
  {
    id: "malsi-deer-park", name: "Malsi Deer Park (Dehradun Zoo)", lat: 30.390086, lon: 78.072698,
    category: "nature", tags: ["eco-friendly"], baseCrowd: 72, travelMinutes: 35, localSpendINR: 300,
    shortDesc: "A small zoological park on Dehradun's northern edge in the Shivalik foothills.",
    description: "A small zoological park on Dehradun's northern edge in the Shivalik foothills.",
    relatedInterests: ["nature", "family"], indoor: false, outdoor: true,
  },
  {
    id: "mussoorie-mall-road", name: "Mussoorie Mall Road", lat: 30.45879, lon: 78.07143,
    category: "market", tags: ["local-artisan", "indoor"], baseCrowd: 95, travelMinutes: 75, localSpendINR: 950,
    shortDesc: "Mussoorie's central promenade with shops, cafés, and valley viewpoints.",
    description: "Mussoorie's central promenade with shops, cafés, and valley viewpoints.",
    relatedInterests: ["shopping", "food", "culture"], indoor: true, outdoor: false,
  },
  {
    id: "kempty-falls", name: "Kempty Falls", lat: 30.48768, lon: 78.03678,
    category: "nature", tags: ["eco-friendly"], baseCrowd: 92, travelMinutes: 95, localSpendINR: 520,
    shortDesc: "A well-known waterfall below Mussoorie; access and water conditions vary by season.",
    description: "A well-known waterfall below Mussoorie; access and water conditions vary by season.",
    relatedInterests: ["nature", "adventure"], indoor: false, outdoor: true,
  },
  {
    id: "lal-tibba", name: "Lal Tibba", lat: 30.46674, lon: 78.09505,
    category: "viewpoint", tags: ["eco-friendly"], baseCrowd: 79, travelMinutes: 90, localSpendINR: 420,
    shortDesc: "A Landour ridge viewpoint known for wide Himalayan panoramas on clear days.",
    description: "A Landour ridge viewpoint known for wide Himalayan panoramas on clear days.",
    relatedInterests: ["nature", "adventure"], indoor: false, outdoor: true,
  },
  {
    id: "george-everest", name: "George Everest House & Estate", lat: 30.45862, lon: 78.02328,
    category: "heritage", tags: ["eco-friendly"], baseCrowd: 66, travelMinutes: 85, localSpendINR: 480,
    shortDesc: "A historic estate above Mussoorie with views across the Doon and Aglar valleys.",
    description: "A historic estate above Mussoorie with views across the Doon and Aglar valleys.",
    relatedInterests: ["culture", "nature", "adventure"], indoor: false, outdoor: true,
  },
  {
    id: "sainji-corn-village", name: "Sainji Corn Village", lat: 30.505, lon: 78.0175,
    category: "village", tags: ["local-artisan", "eco-friendly", "low-crowd"], baseCrowd: 22, travelMinutes: 105, localSpendINR: 420,
    shortDesc: "A small village known for corn-hung homes and a slower, community-led visit.",
    description: "A small village known for corn-hung homes and a slower, community-led visit.",
    relatedInterests: ["culture", "nature", "food"], indoor: false, outdoor: true,
  },
  {
    id: "kimadi-ridge", name: "Kimadi Village & Ridge", lat: 30.4228, lon: 78.0402,
    category: "village", tags: ["local-artisan", "eco-friendly", "low-crowd"], baseCrowd: 16, travelMinutes: 65, localSpendINR: 260,
    shortDesc: "A quieter hillside route through small settlements and forested ridge scenery.",
    description: "A quieter hillside route through small settlements and forested ridge scenery.",
    relatedInterests: ["nature", "adventure", "culture"], indoor: false, outdoor: true,
  },
  {
    id: "jabarkhet-nature-reserve", name: "Jabarkhet Nature Reserve", lat: 30.45048, lon: 78.12505,
    category: "nature", tags: ["eco-friendly", "low-crowd", "rain-friendly"], baseCrowd: 28, travelMinutes: 100, localSpendINR: 650,
    shortDesc: "A privately managed forest reserve near Mussoorie with guided nature walks.",
    description: "A privately managed forest reserve near Mussoorie with guided nature walks.",
    relatedInterests: ["nature", "wellness", "adventure"], indoor: false, outdoor: true,
  },
];

export function getCrowd(place, { isWeekend = false, isHoliday = false } = {}) {
  if (!place || !Number.isFinite(Number(place.baseCrowd))) return 50;
  const weekendAdjustment = isWeekend ? 12 : 0;
  const holidayAdjustment = isHoliday ? 18 : 0;
  return Math.max(0, Math.min(100, Math.round(Number(place.baseCrowd) + weekendAdjustment + holidayAdjustment)));
}

export function getCrowdLevel(crowdScore) {
  if (crowdScore < 35) return "Low";
  if (crowdScore < 65) return "Medium";
  return "High";
}

export function getNearestPlaces(place, candidates = PLACES, limit = 2) {
  if (!place) return [];
  const distanceKm = (a, b) => {
    const toRadians = (value) => (value * Math.PI) / 180;
    const dLat = toRadians(b.lat - a.lat);
    const dLon = toRadians(b.lon - a.lon);
    const first = Math.sin(dLat / 2) ** 2;
    const second = Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * Math.sin(dLon / 2) ** 2;
    return 6371 * 2 * Math.atan2(Math.sqrt(first + second), Math.sqrt(1 - first - second));
  };
  return candidates
    .filter((candidate) => candidate.id !== place.id)
    .map((candidate) => ({ ...candidate, distanceKm: distanceKm(place, candidate) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}
