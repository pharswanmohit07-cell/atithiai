/**
 * Deterministic disruption helpers.
 * Live events can only be derived from the destination's Open-Meteo weather payload.
 * Demo transport, closure, and flight events are intentionally generated elsewhere.
 */
export const WEATHER_DISRUPTION_TYPES = new Set(["rain", "storm", "heat"]);
const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };

function affectedOutdoorPlaces(destination) {
  return (destination?.places || []).filter((place) => place.rainFriendly !== true).map((place) => place.id);
}

export function deriveLiveWeatherDisruptions(destination, weather) {
  if (!destination || !weather || weather.source !== "live" || weather.destinationId !== destination.id) return [];
  const affectedPlaceIds = affectedOutdoorPlaces(destination);
  const detectedAt = new Date().toISOString();
  const events = [];
  const precipitation = Number(weather.precipitationMm);
  const wind = Number(weather.windKmh);
  const temperature = Number(weather.temperatureC);
  const isRain = weather.kind === "rain" || (Number.isFinite(precipitation) && precipitation >= 0.5);
  const isStorm = weather.kind === "storm" || (Number.isFinite(wind) && wind >= 50);
  if (isRain) {
    events.push({
      id: "weather-" + destination.id + "-rain",
      type: "rain",
      title: "Rain may affect outdoor plans",
      severity: Number.isFinite(precipitation) && precipitation >= 5 ? "high" : "medium",
      affectedPlaceIds,
      source: "live",
      detectedAt,
    });
  }
  if (isStorm) {
    events.push({
      id: "weather-" + destination.id + "-storm",
      type: "storm",
      title: weather.kind === "storm" ? "Thunderstorm conditions reported" : "High winds may affect outdoor plans",
      severity: weather.kind === "storm" || (Number.isFinite(wind) && wind >= 65) ? "high" : "medium",
      affectedPlaceIds,
      source: "live",
      detectedAt,
    });
  }
  if (Number.isFinite(temperature) && temperature >= 38) {
    events.push({
      id: "weather-" + destination.id + "-heat",
      type: "heat",
      title: "Extreme heat may affect outdoor plans",
      severity: temperature >= 42 ? "high" : "medium",
      affectedPlaceIds,
      source: "live",
      detectedAt,
    });
  }
  return events;
}

function coordinates(place) {
  const lat = Number(place?.lat);
  const lon = Number(place?.lon);
  return Number.isFinite(lat) && Number.isFinite(lon) ? { lat, lon } : null;
}
function distanceKm(a, b) {
  const first = coordinates(a);
  const second = coordinates(b);
  if (!first || !second) return Number.POSITIVE_INFINITY;
  const rad = (value) => value * Math.PI / 180;
  const dLat = rad(second.lat - first.lat);
  const dLon = rad(second.lon - first.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(first.lat)) * Math.cos(rad(second.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function disruptionAffectsPlan(disruption, itinerary = []) {
  if (!disruption) return false;
  if (["flight_delay", "strike"].includes(disruption.type)) return true;
  const affected = new Set(Array.isArray(disruption.affectedPlaceIds) ? disruption.affectedPlaceIds : []);
  return itinerary.some((stop) => affected.has(stop.placeId || stop.id));
}

export function rankDisruptionAlternatives({ destination, itinerary = [], disruption, weatherKind = "unknown", limit = 2 } = {}) {
  if (!destination || !disruption) return [];
  const places = Array.isArray(destination.places) ? destination.places : [];
  const affectedIds = new Set(Array.isArray(disruption.affectedPlaceIds) ? disruption.affectedPlaceIds : []);
  const itineraryIds = new Set(itinerary.map((stop) => stop.placeId || stop.id));
  const impactedStops = itinerary
    .filter((stop) => affectedIds.has(stop.placeId || stop.id))
    .map((stop) => places.find((place) => place.id === (stop.placeId || stop.id)))
    .filter(Boolean);
  const reference = impactedStops[0] || { lat: destination.lat, lon: destination.lon };
  const rainOrWeather = ["rain", "storm", "heat"].includes(disruption.type) || /rain|storm|drizzle|shower|wet/i.test(String(weatherKind));
  return places
    .filter((place) => !affectedIds.has(place.id))
    .filter((place) => !itineraryIds.has(place.id) || affectedIds.has(place.id))
    .map((place, index) => {
      let score = 0;
      const reasons = [];
      if (place.rainFriendly === true) {
        score += rainOrWeather ? 8 : 3;
        reasons.push("rain-friendly");
      }
      if (place.lowCrowd === true) {
        score += 4;
        reasons.push("estimated quieter place");
      }
      if (["heat", "storm"].includes(disruption.type) && place.rainFriendly) score += 2;
      return { ...place, score, distanceKm: distanceKm(reference, place), reason: reasons.length ? reasons.join(" and ") : "a nearby destination-pack alternative", _index: index };
    })
    .sort((a, b) => b.score - a.score || a.distanceKm - b.distanceKm || a._index - b._index)
    .slice(0, Math.max(0, limit))
    .map(({ _index, ...place }) => place);
}

export function makeDemoDisruption({ type, destination, itinerary = [], now = new Date() } = {}) {
  if (!destination || !["strike", "closure", "flight_delay"].includes(type)) return null;
  const itineraryIds = itinerary.map((stop) => stop.placeId || stop.id).filter(Boolean);
  const outdoorIds = affectedOutdoorPlaces(destination);
  let affectedPlaceIds = [];
  let title = "";
  let severity = "medium";
  if (type === "strike") {
    affectedPlaceIds = itineraryIds.length ? itineraryIds : outdoorIds.slice(0, 4);
    title = "Transport strike reported (demo)";
    severity = "high";
  } else if (type === "closure") {
    const target = itineraryIds[0] || destination.places[0]?.id;
    affectedPlaceIds = target ? [target] : [];
    title = "Attraction closure (demo)";
    severity = "medium";
  } else {
    title = "Flight delay reported (demo)";
    severity = "high";
  }
  return {
    id: "demo-" + type + "-" + destination.id + "-" + now.getTime(),
    type,
    title,
    severity,
    affectedPlaceIds,
    source: "demo",
    detectedAt: now.toISOString(),
  };
}

export function localDisruptionAdvisory({ disruption, alternatives = [], city, language = "English" } = {}) {
  const names = alternatives.slice(0, 2).map((place) => place.name).filter(Boolean);
  const picks = names.length ? names.join(" or ") : "a quieter or indoor option from the destination pack";
  const key = String(language || "English").toLowerCase();
  let message;
  if (/hindi|हिन्दी|हिंदी/.test(key)) {
    message = "मौजूदा सूचना आपकी योजनाओं को प्रभावित कर सकती है। " + (names.length ? picks + " पर विचार करें। " : "डेस्टिनेशन पैक में कोई उपयुक्त विकल्प देखें। ") + "ये केवल सुझाव हैं; यात्रा की स्थिति या उपलब्धता की पुष्टि होटल से करें।";
  } else if (/spanish|español/.test(key)) {
    message = "Esta situación puede afectar sus planes. Considere " + picks + ". Son sugerencias del destino, no datos de tráfico ni disponibilidad en tiempo real; consulte al hotel antes de cambiar sus planes.";
  } else if (/french|français/.test(key)) {
    message = "Cette situation peut modifier vos plans. Envisagez " + picks + ". Ce sont des suggestions du guide de destination, pas des informations routières ou de disponibilité en direct ; vérifiez avec l’hôtel.";
  } else if (/indonesian|bahasa/.test(key)) {
    message = "Situasi ini mungkin memengaruhi rencana Anda. Pertimbangkan " + picks + ". Ini adalah saran dari paket destinasi, bukan informasi lalu lintas atau ketersediaan langsung; silakan konfirmasi dengan hotel.";
  } else if (/portuguese|português/.test(key)) {
    message = "Esta situação pode afetar os seus planos. Considere " + picks + ". São sugestões do destino, não dados de trânsito ou disponibilidade em tempo real; confirme os detalhes com o hotel.";
  } else {
    message = "This update may affect your plans in " + (city || "the destination") + ". Consider " + picks + ". These are destination-pack suggestions, not live traffic, flight, road or venue-availability data. Please check conditions and confirm any changes with the hotel team.";
  }
  return message.split(/\s+/).slice(0, 50).join(" ");
}

export function disruptionSeverityRank(severity) {
  return severityOrder[String(severity || "").toLowerCase()] || 0;
}

export function replaceAffectedItineraryStop(itinerary = [], disruption, replacement) {
  const affectedIds = new Set(Array.isArray(disruption?.affectedPlaceIds) ? disruption.affectedPlaceIds : []);
  const next = [];
  let replaced = false;
  for (const stop of itinerary) {
    const id = stop.placeId || stop.id;
    if (affectedIds.has(id) && !replaced) {
      next.push({ id: replacement.id, placeId: replacement.id, title: replacement.name, note: "Disruption Care alternative · destination-pack suggestion", order: next.length + 1 });
      replaced = true;
    } else {
      next.push({ ...stop, order: next.length + 1 });
    }
  }
  if (!replaced) next.unshift({ id: replacement.id, placeId: replacement.id, title: replacement.name, note: "Disruption Care alternative · destination-pack suggestion", order: 1 });
  return next.map((stop, index) => ({ ...stop, order: index + 1 }));
}
