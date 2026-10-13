import { getDestinationById } from "../src/data/destinations/index.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "")
  ? process.env.GEMINI_MODEL
  : "gemini-2.5-flash";

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function cleanText(value, max = 100) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safePreferences(value) {
  const input = value && typeof value === "object" ? value : {};
  return {
    language: cleanText(input.language, 40) || "English",
    dietaryPreference: cleanText(input.dietaryPreference, 80) || "No preference",
    travelParty: cleanText(input.travelParty, 40) || "Family",
    interests: Array.isArray(input.interests) ? input.interests.filter((item) => typeof item === "string").slice(0, 8).map((item) => item.slice(0, 40)) : [],
  };
}

function localPlan(destination, preferences) {
  const scored = destination.places.map((place) => {
    const tags = Array.isArray(place.tags) ? place.tags : [];
    const interestScore = preferences.interests.reduce((sum, interest) => sum + (tags.some((tag) => tag.toLowerCase().includes(interest.toLowerCase())) ? 2 : 0), 0);
    const rainScore = ["rain", "storm", "snow"].includes(preferences.weather) && place.rainFriendly ? 4 : 0;
    const quietScore = preferences.pace === "relaxed" && place.lowCrowd ? 3 : 0;
    return { place, score: interestScore + rainScore + quietScore };
  }).sort((a, b) => b.score - a.score || a.place.name.localeCompare(b.place.name)).slice(0, 5);

  return scored.map(({ place }, index) => ({
    time: ["09:00", "10:45", "12:30", "14:30", "16:30"][index],
    title: place.name,
    desc: "Suggested destination-pack stop. Confirm current opening details locally.",
    placeId: place.id,
    tags: [...place.tags.slice(0, 4), "Demo itinerary"],
  }));
}

function verifyPlan(items, destination) {
  const allowed = new Map(destination.places.map((place) => [place.id, place]));
  const seen = new Set();
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && allowed.has(item.placeId) && !seen.has(item.placeId) && seen.add(item.placeId))
    .slice(0, 6)
    .map((item, index) => ({
      time: cleanText(item.time, 24) || ["09:00", "10:45", "12:30", "14:30", "16:30", "18:00"][index],
      title: allowed.get(item.placeId).name,
      desc: cleanText(item.desc, 240) || "Suggested stop. Confirm current opening details locally.",
      placeId: item.placeId,
      tags: Array.isArray(item.tags) ? item.tags.filter((tag) => typeof tag === "string").slice(0, 6) : allowed.get(item.placeId).tags.slice(0, 4),
    }));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST to create a suggested itinerary." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const destination = getDestinationById(cleanText(body.destinationId, 50));
  const preferences = safePreferences(body.preferences);
  preferences.weather = ["clear", "cloudy", "rain", "snow", "storm"].includes(body.weather) ? body.weather : "unknown";
  const fallback = localPlan(destination, preferences);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 200, { itinerary: fallback, source: "local-demo" });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 7000);
  try {
    const prompt = [
      "You are an itinerary assistant for a three-star hotel co-host.",
      "Reply in the guest's requested language. Create 3 to 5 suggested stops using only the exact place IDs in this destination pack. Never invent places, prices, venue hours, transport durations, partner names or availability.",
      "The destination, hotel, places, tags and policies are demo data. Only weather supplied as context may be live; do not claim any location is open or currently safe.",
      "No booking or payment is made. Staff must review any money-related request.",
      JSON.stringify({
        destination: { city: destination.city, country: destination.country, locale: destination.locale, currency: destination.currency, primaryLanguages: destination.primaryLanguages },
        preferences,
        places: destination.places.map(({ id, name, category, tags, rainFriendly, lowCrowd }) => ({ id, name, category, tags, rainFriendly, lowCrowd })),
      }),
    ].join("\n");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                itinerary: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      time: { type: "STRING" },
                      desc: { type: "STRING" },
                      placeId: { type: "STRING", enum: destination.places.map((place) => place.id) },
                      tags: { type: "ARRAY", items: { type: "STRING" } },
                    },
                    required: ["time", "desc", "placeId", "tags"],
                  },
                },
              },
              required: ["itinerary"],
            },
          },
        }),
      },
    );
    if (!response.ok) throw new Error("Itinerary service unavailable");
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const itinerary = verifyPlan(JSON.parse(text || "{}").itinerary, destination);
    if (itinerary.length < 3) throw new Error("No valid itinerary returned");
    return send(res, 200, { itinerary, source: "gemini" });
  } catch {
    return send(res, 200, { itinerary: fallback, source: "local-demo" });
  } finally {
    clearTimeout(timeout);
  }
}
