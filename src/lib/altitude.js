const RISK_ORDER = ["low", "moderate", "high"];

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function personaNeedsExtraCaution(persona) {
  return persona?.id === "pilgrim"
    || (normalizeNumber(persona?.age, 0) >= 60
      && Array.isArray(persona?.healthTags)
      && persona.healthTags.includes("BP"));
}

export function getAdvisory({ elevation, ascentPerDay = 0, persona = null } = {}) {
  const currentElevation = Math.max(0, normalizeNumber(elevation, 0));
  const dailyAscent = Math.max(0, normalizeNumber(ascentPerDay, 0));
  let level = currentElevation < 2500 ? "low" : currentElevation <= 3500 ? "moderate" : "high";
  const reasons = [];
  const actions = [];

  if (level === "low") {
    reasons.push("Current waypoint is below 2,500 m; elevation-based risk starts low in this rule set.");
  } else if (level === "moderate") {
    reasons.push("Current waypoint is between 2,500 m and 3,500 m, where altitude-related symptoms deserve attention.");
  } else {
    reasons.push("Current waypoint is above 3,500 m, so altitude-related caution is high in this rule set.");
  }

  if (currentElevation > 3000 && dailyAscent > 500) {
    reasons.push(`The itinerary's estimated between-day sleeping elevation gain is ${Math.round(dailyAscent)} m/day above 3,000 m, exceeding the ~500 m/day caution guideline.`);
    actions.push("Consider a rest/acclimatization day before further ascent, and review the plan with a clinician or local authority.");
  } else if (currentElevation > 3000) {
    reasons.push("At elevations above 3,000 m, keep the ascent gradual and watch for symptoms.");
  }

  if (dailyAscent > 0) {
    reasons.push(`Largest estimated sleeping-elevation gain between itinerary days: ${Math.round(dailyAscent)} m/day.`);
  } else {
    reasons.push("No between-day sleeping-elevation gain could be derived from the current itinerary.");
  }

  if (personaNeedsExtraCaution(persona)) {
    const originalLevel = level;
    level = RISK_ORDER[Math.min(RISK_ORDER.length - 1, RISK_ORDER.indexOf(level) + 1)];
    if (level !== originalLevel) {
      reasons.push(`Pilgrim profile (${persona?.age ?? 62} years, BP demo tag) raises displayed caution from ${originalLevel} to ${level}; this is a conservative interface modifier, not an individual medical assessment.`);
    } else {
      reasons.push(`Pilgrim profile (${persona?.age ?? 62} years, BP demo tag) adds extra caution; the displayed level is already at the high maximum. This is not an individual medical assessment.`);
    }
    actions.push("Use a gentler pace, take breaks, and seek personal medical advice before continuing to higher elevations.");
  }

  if (level === "high") {
    actions.push("Pause before ascending further and check with a clinician and local authorities; seek urgent help for severe or worsening symptoms.");
  } else if (level === "moderate") {
    actions.push("Take regular breaks, ascend gradually, and follow local and doctor guidance.");
  } else {
    actions.push("Continue to monitor how you feel and follow local authority and doctor advice.");
  }

  return { level, reasons, actions };
}

export function getSleepingAscentPerDay({ itinerary = [], waypoints = [] } = {}) {
  const elevationById = new Map(waypoints.map((waypoint) => [waypoint.id, Number(waypoint.elevationM)]));
  const dayEnds = new Map();

  for (const item of itinerary) {
    const waypointId = item.waypointId || item.placeId;
    const elevation = Number.isFinite(Number(item.elevationM))
      ? Number(item.elevationM)
      : elevationById.get(waypointId);
    if (!Number.isFinite(elevation)) continue;
    const dayKey = item.day ?? item.dayLabel ?? "day-1";
    dayEnds.set(String(dayKey), { day: normalizeNumber(item.day, dayEnds.size + 1), elevation });
  }

  const orderedDays = [...dayEnds.entries()]
    .sort((a, b) => a[1].day - b[1].day);
  let largestAscent = 0;
  for (let index = 1; index < orderedDays.length; index += 1) {
    const gain = orderedDays[index][1].elevation - orderedDays[index - 1][1].elevation;
    largestAscent = Math.max(largestAscent, gain);
  }
  return Math.max(0, Math.round(largestAscent));
}
