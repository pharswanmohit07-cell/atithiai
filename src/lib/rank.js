/**
 * Pure, deterministic ranking helpers. They only reorder records supplied by a destination pack.
 */
const partyAliases = {
  family: ["family", "families", "kids", "children"],
  couple: ["couple", "romantic", "two"],
  solo: ["solo", "independent", "single"],
  seniors: ["seniors", "senior", "older travellers", "accessible", "easy pace"],
  friends: ["friends", "group"],
  business: ["business", "work"],
};
function includesParty(experience, partyType) {
  const tags = Array.isArray(experience?.suits) ? experience.suits.map((value) => String(value).toLowerCase()) : [];
  const key = String(partyType || "").toLowerCase();
  const wanted = partyAliases[key] || [key];
  return tags.some((tag) => wanted.some((term) => term && (tag === term || tag.includes(term) || term.includes(tag))));
}
function isRain(weatherKind) {
  return /rain|drizzle|shower|storm|wet/i.test(String(weatherKind || ""));
}
export function rankExperiences(experiences = [], options = {}) {
  const { partyType = "Family", freeTimeMinutes = 240, weatherKind = "unknown", lowCrowdPreference = false } = options;
  const rainy = isRain(weatherKind);
  return (Array.isArray(experiences) ? experiences : [])
    .filter((item) => item && typeof item.id === "string")
    .map((experience, index) => {
      const duration = Math.max(0, Number(experience.durationMinutes) || 0);
      let score = 0;
      const reasons = [];
      if (includesParty(experience, partyType)) { score += 4; reasons.push("suits your travel party"); }
      if (freeTimeMinutes > 0 && duration > 0 && duration <= freeTimeMinutes) { score += 3; reasons.push("fits your available time"); }
      else if (duration > freeTimeMinutes && freeTimeMinutes > 0) score -= 5;
      if (rainy && experience.rainFriendly === true) { score += 5; reasons.push("rain-friendly option"); }
      if (lowCrowdPreference && experience.lowCrowd === true) { score += 3; reasons.push("tagged as a quieter option"); }
      if (!rainy && experience.rainFriendly === true) score += 1;
      return { ...experience, rankScore: score, rankReason: reasons.length ? reasons.join(" · ") : "Selected from the destination pack using your preferences", _rankIndex: index };
    })
    .sort((a, b) => b.rankScore - a.rankScore || a._rankIndex - b._rankIndex)
    .map(({ _rankIndex, ...item }) => item);
}
function normalizedDietTags(dish) {
  const raw = Array.isArray(dish?.dietaryTags) ? dish.dietaryTags : (Array.isArray(dish?.diet) ? dish.diet : []);
  return raw.map((value) => String(value).toLowerCase());
}
function dietMatches(dish, requestedDiet) {
  const diet = String(requestedDiet || "any").toLowerCase();
  if (!diet || diet === "any" || diet === "all" || diet === "no preference") return true;
  if (diet === "veg" || diet === "vegetarian") return normalizedDietTags(dish).some((tag) => ["vegetarian", "veg"].includes(tag));
  if (diet === "vegan") return normalizedDietTags(dish).includes("vegan") || dish.vegan === true;
  if (diet === "non-veg" || diet === "non-vegetarian") return normalizedDietTags(dish).some((tag) => ["meat", "fish", "seafood", "non-veg", "nonvegetarian"].includes(tag));
  if (diet === "halal") return dish.halal === true;
  if (diet === "gluten-aware") return dish.glutenAware === true;
  return normalizedDietTags(dish).includes(diet);
}
function timeMatches(dish, timeOfDay) {
  const time = String(timeOfDay || "any").toLowerCase();
  if (!time || time === "any" || time === "all") return true;
  const tags = Array.isArray(dish?.timeOfDay) ? dish.timeOfDay.map((value) => String(value).toLowerCase()) : [];
  return tags.includes(time) || tags.includes("anytime");
}
export function rankDishes(dishes = [], options = {}) {
  const { diet = "any", spice = "any", timeOfDay = "any", weatherKind = "unknown" } = options;
  const spiceOrder = { mild: 1, medium: 2, hot: 3 };
  const maxSpice = spiceOrder[String(spice || "").toLowerCase()];
  const rainy = isRain(weatherKind);
  return (Array.isArray(dishes) ? dishes : [])
    .filter((dish) => dish && typeof dish.id === "string" && dietMatches(dish, diet) && timeMatches(dish, timeOfDay) && (!maxSpice || (spiceOrder[String(dish.spiceLevel || "").toLowerCase()] || 3) <= maxSpice))
    .map((dish, index) => {
      let score = 0;
      const reasons = [];
      if (dietMatches(dish, diet) && diet !== "any") { score += 5; reasons.push("matches the selected diet tag"); }
      if (maxSpice && (spiceOrder[String(dish.spiceLevel || "").toLowerCase()] || 3) <= maxSpice) { score += 2; reasons.push("within your spice preference"); }
      if (timeMatches(dish, timeOfDay)) { score += timeOfDay === "any" ? 0 : 3; if (timeOfDay !== "any") reasons.push("tagged for this time of day"); }
      if (rainy && dish.warmInRain === true) { score += 4; reasons.push("a warm dish to consider in rainy weather"); }
      return { ...dish, rankScore: score, rankReason: reasons.length ? reasons.join(" · ") : (rainy ? "A destination-pack option; confirm recipe and availability" : "A destination-pack option for you"), _rankIndex: index };
    })
    .sort((a, b) => b.rankScore - a.rankScore || a._rankIndex - b._rankIndex)
    .map(({ _rankIndex, ...item }) => item);
}
