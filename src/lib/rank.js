/*
 * Pure, deterministic, explainable ranking. No model calls, network calls or mutation.
 *
 * Worked examples (with synthetic records):
 * 1) A vegan traveler asking for vegan food excludes a dish whose diet.vegan !== true,
 *    even if that dish is cheap or popular.
 * 2) A traveler with 45 free minutes excludes a 90-minute workshop; "Fits your 45-minute
 *    window" is only returned for eligible items at or below that duration.
 * 3) With avoidCrowds=true, a low-crowd hidden-gem viewpoint receives more points than
 *    a high-crowd landmark, while both stay eligible unless the traveler set a hard filter.
 */
const CATEGORY_INTERESTS = {
  nature: ["nature", "viewpoint", "garden", "forest", "walk", "landscape", "green-space"],
  food: ["food", "dish", "market", "cafe", "restaurant", "cooking", "taste", "culinary"],
  culture: ["culture", "heritage", "history", "music", "fado", "temple", "architecture", "museum"],
  craft: ["craft", "artisan", "textile", "painting", "pottery", "woodcarving", "design", "tile"],
  wellness: ["wellness", "yoga", "movement", "breathing", "quiet", "garden"],
  nightlife: ["nightlife", "evening", "music", "fado", "performance", "night"],
  quiet: ["quiet", "low-crowd", "garden", "nature", "viewpoint", "calm"]
};
const PARTY_ALIASES = {
  solo: ["solo", "independent", "traveler"],
  couple: ["couple", "couples", "two"],
  family: ["family", "families", "kids", "children"],
  friends: ["friends", "group", "solo"]
};
const validNumber = (value) => Number.isFinite(Number(value)) && value !== null && value !== "";
function clampNumber(value, fallback = null) {
  return validNumber(value) ? Math.max(0, Number(value)) : fallback;
}
function normalized(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function tagsOf(item) {
  return [
    item.category,
    item.diet ? "food" : null,
    item.title ? "experience" : null,
    ...(Array.isArray(item.tags) ? item.tags : []),
    item.name,
    item.description,
    item.localStory,
    item.whereToEat,
    item.bestTime
  ].filter(Boolean).map(normalized);
}
function matchesTime(item, time) {
  if (!time) return true;
  const value = normalized(item.bestTime);
  if (value === "any") return true;
  if (!value) return false;
  const aliases = {
    morning: ["morning", "breakfast"],
    afternoon: ["afternoon", "lunch", "snack"],
    evening: ["evening", "dinner", "snack"]
  };
  return (aliases[normalized(time)] || [normalized(time)]).includes(value);
}
function durationLimit(profile, filters, context) {
  const limits = [
    clampNumber(filters?.durationMin),
    clampNumber(context?.freeMinutes)
  ].filter((value) => value !== null && value > 0);
  if (limits.length) return Math.min(...limits);
  if (profile?.pace === "relaxed") return 120;
  if (profile?.pace === "packed") return 600;
  return 360;
}
function hardBudget(filters) {
  return clampNumber(filters?.maxBudgetLocal);
}
function fitsBudget(item, cap, kind) {
  if (cap === null) return true;
  if (kind === "dish") {
    const range = item.priceRangeLocal;
    return Array.isArray(range) && Number.isFinite(Number(range[1])) && Number(range[1]) <= cap;
  }
  const amount = kind === "experience" ? item.priceLocal : item.avgSpendLocal;
  return validNumber(amount) && Number(amount) <= cap;
}
function matchesDiet(dish, diet) {
  if (!diet || diet === "none" || diet === "any") return true;
  const key = diet === "non-veg" ? "nonVeg" : diet === "gluten-aware" ? "glutenFree" : diet;
  return dish?.diet?.[key] === true;
}
function itemCategory(item, kind) {
  if (kind === "dish") return "food";
  return item.category || "culture";
}
function interestsOf(profile) {
  return Array.isArray(profile?.interests) ? profile.interests.filter((item) => Object.hasOwn(CATEGORY_INTERESTS, item)) : [];
}
function partyFit(item, party) {
  const list = Array.isArray(item.suitsWho) ? item.suitsWho : Array.isArray(item.suits) ? item.suits : [];
  if (!list.length) return false;
  const aliases = PARTY_ALIASES[party] || [party];
  const normalizedList = list.map(normalized);
  return aliases.some((alias) => normalizedList.includes(alias));
}
function spendValue(item, kind) {
  if (kind === "dish") return Array.isArray(item.priceRangeLocal) ? (Number(item.priceRangeLocal[0]) + Number(item.priceRangeLocal[1])) / 2 : null;
  const value = kind === "experience" ? item.priceLocal : item.avgSpendLocal;
  return validNumber(value) ? Number(value) : null;
}
function scoreItem(item, kind, profile = {}, filters = {}, context = {}, spendStats = null) {
  const reasons = [];
  let score = 0;
  const category = itemCategory(item, kind);
  const time = filters?.timeOfDay || context?.timeOfDay || null;
  const limit = durationLimit(profile, filters, context);
  const duration = clampNumber(kind === "place" ? item.durationMin : item.durationMin);
  const cap = hardBudget(filters);
  const explicitDiet = filters && Object.hasOwn(filters, "diet") ? filters.diet : undefined;
  const diet = explicitDiet !== undefined ? (explicitDiet || "none") : (profile?.diet || "none");

  // Hard constraints: reject first, then score survivors.
  if (kind !== "dish" && Array.isArray(filters?.categories) && filters.categories.length && !filters.categories.includes(item.category)) return null;
  if (filters?.indoorOnly === true && kind !== "dish" && item.indoor !== true) return null;
  if (cap !== null && !fitsBudget(item, cap, kind)) return null;
  if (duration !== null && duration > limit) return null;
  if (filters?.timeOfDay && !matchesTime(item, filters.timeOfDay)) return null;
  if (kind === "dish" && !matchesDiet(item, diet)) return null;
  if (kind === "dish" && Number.isFinite(Number(filters?.maxSpiceLevel)) && filters.maxSpiceLevel !== null && Number(item.spiceLevel) > Number(filters.maxSpiceLevel)) return null;

  const tags = tagsOf(item);
  for (const interest of interestsOf(profile)) {
    const terms = CATEGORY_INTERESTS[interest];
    if (terms.some((term) => tags.some((tag) => tag.includes(term) || term.includes(tag)))) {
      score += 4;
      reasons.push("Matches your " + interest + " interest");
    }
  }
  if (kind === "dish" && diet !== "none" && matchesDiet(item, diet)) {
    score += 8;
    const dietLabels = { veg: "vegetarian", vegan: "vegan", "non-veg": "non-vegetarian", halal: "halal", "gluten-aware": "gluten-aware" };
    reasons.push("Matches your " + (dietLabels[diet] || diet) + " diet");
  }

  if (kind === "place" && item.isHiddenGem) {
    score += 4;
    reasons.push("Hidden-place pick");
  }
  const crowd = normalized(item.crowdLevel);
  const avoidCrowds = filters?.avoidCrowds === true || filters?.mood === "quiet" || (filters?.avoidCrowds == null && profile?.avoidCrowds === true);
  if (avoidCrowds && crowd === "low") {
    score += 5;
    reasons.push("Quiet at this time (estimated)");
  } else if (avoidCrowds && crowd === "high") score -= 4;

  if (profile?.pace === "relaxed") {
    if (crowd === "low") { score += 2; reasons.push("Suited to a relaxed pace"); }
    if (duration !== null && duration <= 120) score += 1;
  } else if (profile?.pace === "packed") {
    if (duration !== null && duration <= 90) { score += 2; reasons.push("A concise stop for a packed day"); }
  } else if (duration !== null && duration <= 180) score += 1;

  if (kind === "experience" && partyFit(item, profile?.travelParty)) {
    score += 3;
    reasons.push("Matches your travel party");
  }
  if (kind === "dish") {
    const spice = Number(item.spiceLevel) || 2;
    const tolerance = Number(profile?.spiceTolerance) || 2;
    if (spice <= tolerance) {
      score += 2;
      reasons.push(spice === 1 ? "Mild spice level" : spice === 2 ? "Within your spice tolerance" : "Matches your high spice tolerance");
    } else {
      score -= (spice - tolerance) * 2;
      reasons.push("Spicier than your usual preference");
    }
  }

  const spend = spendValue(item, kind);
  const dailyAmount = clampNumber(profile?.dailyBudget?.amount ?? context?.budget);
  if (spend !== null && dailyAmount !== null) {
    if (spend <= dailyAmount) {
      score += 2;
      reasons.push("Within your daily budget");
    } else score -= 2;
  } else if (spend !== null && spendStats && Number.isFinite(spendStats.low) && Number.isFinite(spendStats.high)) {
    const normalizedSpend = spendStats.high === spendStats.low ? 0.5 : (spend - spendStats.low) / (spendStats.high - spendStats.low);
    if (profile?.dailyBudget?.level === "low" && normalizedSpend <= 0.25) {
      score += 2;
      reasons.push("Lower-spend option within this pack (estimate)");
    } else if (profile?.dailyBudget?.level === "low" && normalizedSpend >= 0.75) score -= 2;
    else if (profile?.dailyBudget?.level === "medium" && normalizedSpend >= 0.25 && normalizedSpend <= 0.75) {
      score += 1;
      reasons.push("Mid-range spend estimate for this destination");
    } else if (profile?.dailyBudget?.level === "high" && normalizedSpend >= 0.75) {
      score += 1;
      reasons.push("Fits your flexible-spend preference");
    }
  }

  const rainy = /rain|storm|drizzle|shower/i.test(normalized(context?.weather?.kind || context?.weather?.condition || ""));
  if (rainy && (item.rainFriendly === true || item.indoor === true)) {
    score += 4;
    reasons.push(item.indoor === true ? "Indoor, good for rain" : "Rain-friendly option (estimated)");
  }
  if (kind === "dish" && rainy && item.warm === true) {
    score += 3;
    reasons.push("Warm dish suits rainy weather");
  }
  if (time && item.bestTime && matchesTime(item, time)) {
    score += 2;
    reasons.push("Fits your " + time + " preference");
  }
  if (Number.isFinite(Number(context?.freeMinutes)) && context.freeMinutes > 0 && duration !== null && duration <= context.freeMinutes) {
    reasons.push("Fits your " + (context.freeMinutes >= 60 ? Math.round(context.freeMinutes / 60 * 10) / 10 + "-hour window" : context.freeMinutes + "-minute window").replace(".0-hour", "-hour"));
    score += 2;
  }
  if (cap !== null) reasons.push("Within your stated local-currency budget cap");

  if (!reasons.length) reasons.push("Selected from the destination pack");
  return { ...item, itemType: kind, score, reasons: [...new Set(reasons)] };
}
function rank(items, kind, profile, filters, context) {
  if (!Array.isArray(items)) return [];
  const amounts = items.map((item) => spendValue(item, kind)).filter((value) => value !== null).sort((a, b) => a - b);
  const spendStats = amounts.length ? { low: amounts[0], high: amounts[amounts.length - 1] } : null;
  return items.map((item, index) => ({ item: scoreItem(item, kind, profile, filters || {}, context || {}, spendStats), index }))
    .filter((entry) => entry.item !== null)
    .sort((a, b) => b.item.score - a.item.score || a.index - b.index)
    .map((entry) => entry.item);
}
export function rankPlaces(places, profile = {}, filters = {}, context = {}) {
  return rank(places, "place", profile, filters, context);
}
export function rankDishes(dishes, profile = {}, filters = {}, context = {}) {
  return rank(dishes, "dish", profile, filters, context);
}
export function rankExperiences(experiences, profile = {}, filters = {}, context = {}) {
  return rank(experiences, "experience", profile, filters, context);
}
