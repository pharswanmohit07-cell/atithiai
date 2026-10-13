import { getCrowd } from "../data/places.js";

const TIMES = ["09:00 AM", "10:45 AM", "12:30 PM", "02:30 PM", "04:30 PM", "07:00 PM"];

export function scorePlan(places, preferences = {}, weather = "sunny") {
  const interests = Array.isArray(preferences.interests) ? preferences.interests : [];
  const style = String(preferences.travelStyle || "couple").toLowerCase();
  const pace = String(preferences.pace || "balanced").toLowerCase();
  const diet = String(preferences.dietaryPreference || "No preference").toLowerCase();
  const rainy = String(weather).toLowerCase().includes("rain");
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;
  const visitFlags = { isWeekend, isHoliday: false };

  const ranked = (Array.isArray(places) ? places : []).slice(0, 15).map((place) => {
    const related = Array.isArray(place.relatedInterests) ? place.relatedInterests : [];
    const tags = Array.isArray(place.tags) ? place.tags : [];
    let score = related.reduce((sum, interest) => sum + (interests.includes(interest) ? 5 : 0), 0);
    if (interests.includes("nature") && tags.includes("eco-friendly")) score += 2;
    if (interests.includes("shopping") && tags.includes("local-artisan")) score += 5;
    if (interests.includes("wellness") && tags.includes("low-crowd")) score += 3;
    if (["family", "couple", "solo", "friends"].includes(style) && (related.includes(style) || place.category === "village")) score += 2;
    if (pace === "relaxed" && tags.includes("low-crowd")) score += 4;
    if (pace === "packed" && Number(place.travelMinutes) <= 35) score += 3;
    const estimatedCrowd = getCrowd(place, visitFlags);
    score += Math.max(0, 40 - estimatedCrowd) / 8;
    if (rainy) {
      if (place.indoor || tags.includes("indoor") || tags.includes("rain-friendly")) score += 18;
      if (place.outdoor) score -= 12;
    }
    if (diet !== "no preference" && place.category === "food") {
      const options = Array.isArray(place.dietary) ? place.dietary.map((item) => item.toLowerCase()) : [];
      score += options.includes(diet) ? 3 : -4;
    }
    return { place, score };
  }).sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name));

  const limit = pace === "relaxed" ? 4 : pace === "packed" ? 6 : 5;
  const selected = [];
  const categoryCounts = {};
  for (const item of ranked) {
    if (selected.length >= limit) break;
    const place = item.place;
    if ((categoryCounts[place.category] || 0) >= 2) continue;
    selected.push(place);
    categoryCounts[place.category] = (categoryCounts[place.category] || 0) + 1;
  }
  return selected.map((place, index) => ({
    time: TIMES[index] || "Later today",
    title: place.name,
    desc: place.shortDesc || place.description,
    placeId: place.id,
    tags: [...new Set([...(place.tags || []), place.category])].slice(0, 5),
  }));
}
