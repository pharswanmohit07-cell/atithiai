import { getDestinationById } from "../src/data/destinations/index.js";
import { detectChatIntent } from "../src/lib/chatIntents.js";
import { localDisruptionAdvisory } from "../src/lib/disruptions.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-2.5-flash";

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function cleanText(value, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function fallbackReply(message, destination, rankedExperiences = [], rankedDishes = []) {
  const text = String(message || "").toLowerCase();
  const intent = detectChatIntent(message, destination.hotel);
  if (intent.type === "flex_stay_request") return "I can calculate a demo Flex Stay offer for you. Please review the on-screen result; the hotel must confirm it.";
  if (intent.type === "human_help") return "Use Talk to a human to create an urgent handoff request. This demo cannot guarantee a live reply.";
  if (/(price|cost|fee|charge|refund|pay|payment|booking|book|available|availability)/i.test(text)) return "I can send this to the hotel team. Staff must confirm fees, bookings and availability before any commitment. Nothing is charged or booked by this assistant.";
  if (/(emergency|urgent help|ambulance|police|fire)/i.test(text)) return "If there is immediate danger, call the local emergency number " + destination.emergencyNumber + ". This demo cannot dispatch help.";
  if (intent.type === "food_question" || /(food|dish|eat|restaurant|menu|diet|vegetarian|vegan|allerg)/i.test(text)) { const names = rankedDishes.slice(0, 3).map((dish) => dish.name); return (names.length ? "From the selected destination-pack list, consider: " + names.join(", ") + ". " : "No matching destination-pack dishes were supplied for this question. ") + "Confirm ingredients and allergens with the restaurant; no dish is represented as allergen-free."; }
  if (/(experience|activity|tour|guide|partner|things to do|visit|explore)/i.test(text)) { const names = rankedExperiences.slice(0, 3).map((experience) => experience.name); return (names.length ? "From the curated destination-pack list: " + names.join(", ") + ". " : "No curated experiences were supplied for this destination. ") + "These are demo listings; staff must confirm provider, schedule, availability and price."; }
  if (/(weather|rain|wind|temperature|forecast)/i.test(text)) return "The app displays the latest available Open-Meteo observation for " + destination.city + ". Weather does not confirm venue opening, transport conditions or safety.";
  return "I can help with a stay in " + destination.city + ", destination-pack places, food discovery or a request to the hotel team. Money, booking and availability decisions stay with a person.";
}
function normalizeAction(action, hotel) {
  if (action?.type !== "flex_stay_request" || !["early", "late"].includes(action.kind)) return null;
  const valid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(action.time || "");
  const tiers = hotel.flexTiers[action.kind] || [];
  const defaultTime = action.kind === "early" ? (tiers[tiers.length - 1]?.from || "12:00") : (tiers[0]?.until || "13:00");
  return { type: "flex_stay_request", kind: action.kind, time: valid ? action.time : defaultTime };
}
function safePreferences(value) {
  const input = value && typeof value === "object" ? value : {};
  return { language: cleanText(input.language, 40) || "English", dietaryPreference: cleanText(input.dietaryPreference, 80) || "No preference", travelParty: cleanText(input.travelParty, 40) || "unspecified" };
}

async function handleDisruptionAdvisory(body, destination, res) {
  const weatherTypes = new Set(["rain", "storm", "heat"]);
  const demoTypes = new Set(["strike", "closure", "flight_delay"]);
  const incoming = body.disruption && typeof body.disruption === "object" ? body.disruption : {};
  const type = [...weatherTypes, ...demoTypes].includes(incoming.type) ? incoming.type : null;
  if (!type) return send(res, 200, { reply: localDisruptionAdvisory({ city: destination.city, language: cleanText(body.language, 50) || "English", alternatives: [] }), source: "local-fallback" });
  const source = incoming.source === "live" && weatherTypes.has(type) ? "live" : "demo";
  const validPlaces = new Set((destination.places || []).map((place) => place.id));
  const affectedPlaceIds = Array.isArray(incoming.affectedPlaceIds) ? Array.from(new Set(incoming.affectedPlaceIds.filter((id) => typeof id === "string" && validPlaces.has(id)))).slice(0, 30) : [];
  const alternatives = (Array.isArray(body.alternativePlaceIds) ? body.alternativePlaceIds : [])
    .filter((id) => typeof id === "string" && validPlaces.has(id))
    .slice(0, 2)
    .map((id) => destination.places.find((place) => place.id === id))
    .filter(Boolean)
    .map(({ id, name, category, rainFriendly, lowCrowd }) => ({ id, name, category, rainFriendly, lowCrowd }));
  const titleByType = {
    rain: "Rain may affect outdoor plans",
    storm: "Weather may affect outdoor plans",
    heat: "Heat may affect outdoor plans",
    strike: "Transport interruption (demo)",
    closure: "Attraction closure (demo)",
    flight_delay: "Flight delay (demo)",
  };
  const disruption = {
    type,
    title: titleByType[type],
    severity: ["low", "medium", "high", "critical"].includes(incoming.severity) ? incoming.severity : "medium",
    source,
    affectedPlaceIds,
    detectedAt: typeof incoming.detectedAt === "string" ? incoming.detectedAt.slice(0, 40) : "",
  };
  const language = cleanText(body.language, 50) || "English";
  const fallback = localDisruptionAdvisory({ disruption, alternatives, city: destination.city, language });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 200, { reply: fallback, source: "local-fallback" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2600);
  try {
    const prompt = [
      "Write one calm, practical guest advisory in at most 50 words and in the requested language.",
      "Use only the structured disruption and destination-pack alternatives in the JSON. Mention only alternative names present in that list; do not invent venues, prices, partners, routes, schedules or booking status.",
      "Never claim access to live road, transport, flight, or venue-opening data. The only live feed in this application is the destination's Open-Meteo weather observation; strike, closure and flight-delay events are explicitly demo events.",
      "Do not suggest that a driver, airline, venue or hotel has been contacted. Do not promise safety or availability.",
      JSON.stringify({ language, city: destination.city, disruption, alternatives }),
    ].join("\n");
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 120 } }),
      },
    );
    if (!response.ok) throw new Error("Advisory service unavailable");
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const reply = cleanText(text, 1600).split(/\s+/).slice(0, 50).join(" ");
    return send(res, 200, { reply: reply || fallback, source: reply ? "gemini" : "local-fallback" });
  } catch {
    return send(res, 200, { reply: fallback, source: "local-fallback" });
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST to send a chat message." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const message = cleanText(body.message, 1200);
  if (!message && body.mode !== "disruption_advisory") return send(res, 400, { error: "Please enter a message." });

  const destination = getDestinationById(cleanText(body.destinationId, 50));
  if (body.mode === "disruption_advisory") return handleDisruptionAdvisory(body, destination, res);
  const intent = detectChatIntent(message, destination.hotel);
  if (intent.type === "flex_stay_request") {
    return send(res, 200, { reply: "I’ll calculate a demo timing offer. Review the offer below; the hotel must confirm the final result.", action: intent, source: "local-intent" });
  }
  const experienceIds = Array.isArray(body.rankedExperienceIds) ? body.rankedExperienceIds.filter((id) => typeof id === "string").slice(0, 5) : [];
  const dishIds = Array.isArray(body.rankedDishIds) ? body.rankedDishIds.filter((id) => typeof id === "string").slice(0, 5) : [];
  const hostNoteById = new Map((Array.isArray(body.rankedHostNotes) ? body.rankedHostNotes : []).filter((item) => item && typeof item.id === "string").map((item) => [item.id, cleanText(item.hostNote, 300)]));
  const rankedExperiences = experienceIds.map((id) => destination.experiences.find((item) => item.id === id)).filter(Boolean).map((item) => ({ id: item.id, name: item.name, partner: item.partner, description: item.description, category: item.category, durationMinutes: item.durationMinutes, price: item.price, hostNote: hostNoteById.get(item.id) || item.hostNote || "" }));
  const rankedDishes = dishIds.map((id) => destination.dishes.find((item) => item.id === id)).filter(Boolean).map((item) => ({ id: item.id, name: item.name, diet: item.diet, spiceLevel: item.spiceLevel, price: item.price, whereToEat: item.whereToEat }));
  const fallback = fallbackReply(message, destination, rankedExperiences, rankedDishes);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 200, { reply: fallback, action: null, source: "local-fallback" });

  const preferences = safePreferences(body.preferences);
  const rawGuest = body.guest && typeof body.guest === "object" ? body.guest : {};
  const guest = { name: cleanText(rawGuest.name, 80) || "Guest", persona: ["Guest (Family)", "Guest (Solo)"].includes(rawGuest.persona) ? rawGuest.persona : "Guest" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const prompt = [
      "You are Atithi AI, a warm AI co-host for a three-star hotel.",
      "Answer in the guest's language, or concise English if uncertain. Never invent places, partners, policy, bookings or actions.",
      "For experience or food recommendations, ONLY use rankedExperiences and rankedDishes from the provided context. Never add a name, partner, price, ingredient, duration, venue or availability that is not in the corresponding list. If a list is empty, say the curated list has no match and suggest asking hotel staff.",
      "Classify an early check-in or late check-out request into action {type:flex_stay_request,kind:early|late,time:HH:mm}. This action only routes the request.",
      "Never state or imply a price, fee, availability, room readiness, occupancy conclusion or quote. The frontend deterministic Flex Stay engine computes the offer from separate demo room and fee data. Do not calculate or paraphrase an offer.",
      "For a Flex Stay intent, give only a neutral acknowledgement asking the guest to review the on-screen offer. Never claim a booking or approval occurred.",
      "Hotel and listing details are DEMO; only weather is live. Human staff control money, bookings and availability.",
      JSON.stringify({
        message,
        guest,
        preferences,
        hotel: {
          checkIn: destination.hotel.checkIn,
          checkOut: destination.hotel.checkOut,
          earlyTimes: (destination.hotel.flexTiers.early || []).map((tier) => tier.from),
          lateTimes: (destination.hotel.flexTiers.late || []).map((tier) => tier.until),
        },
        destination: {
          city: destination.city,
          country: destination.country,
          currency: destination.currency.code,
          primaryLanguages: destination.primaryLanguages,
          places: destination.places.map(({ id, name, category, tags }) => ({ id, name, category, tags })),
          rankedExperiences,
          rankedDishes,
        },
      }),
    ].join("\n");

    const responseSchema = {
      type: "OBJECT",
      properties: {
        reply: { type: "STRING" },
        action: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["none", "flex_stay_request"] },
            kind: { type: "STRING", enum: ["early", "late"] },
            time: { type: "STRING" },
          },
          required: ["type", "kind", "time"],
        },
      },
      required: ["reply", "action"],
    };
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema },
        }),
      },
    );
    if (!response.ok) throw new Error("AI service unavailable");
    const payload = await response.json();
    const modelText = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const parsed = JSON.parse(modelText || "{}");
    const reply = cleanText(parsed.reply, 1600);
    if (!reply) throw new Error("Empty model answer");
    const action = normalizeAction(parsed.action, destination.hotel);
    const safeReply = action
      ? "I can check a demo Flex Stay option. Review the computed offer below; the hotel must confirm it."
      : reply;
    return send(res, 200, { reply: safeReply, action, source: "gemini" });
  } catch {
    return send(res, 200, { reply: fallback, action: null, source: "local-fallback" });
  } finally {
    clearTimeout(timeout);
  }
}
