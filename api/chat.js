import { getDestinationById } from "../src/data/destinations/index.js";
import { detectChatIntent } from "../src/lib/chatIntents.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-2.5-flash";

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function cleanText(value, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function fallbackReply(message, destination) {
  const text = String(message || "").toLowerCase();
  const intent = detectChatIntent(message, destination.hotel);
  if (intent.type === "flex_stay_request") return "I can calculate a demo Flex Stay offer for you. Please review the on-screen result; the hotel must confirm it.";
  if (intent.type === "human_help") return "Use Talk to a human to create an urgent handoff request. This demo cannot guarantee a live reply.";
  if (/(price|cost|fee|charge|refund|pay|payment|booking|book|available|availability)/i.test(text)) return "I can send this to the hotel team. Staff must confirm fees, bookings and availability before any commitment. Nothing is charged or booked by this assistant.";
  if (/(emergency|urgent help|ambulance|police|fire)/i.test(text)) return "If there is immediate danger, call the local emergency number " + destination.emergencyNumber + ". This demo cannot dispatch help.";
  if (intent.type === "food_question" || /(food|dish|eat|restaurant|menu|diet|vegetarian|vegan|allerg)/i.test(text)) return "The " + destination.city + " destination pack includes illustrative local dishes. Confirm ingredients, allergens, venue details and final prices with the hotel team or restaurant.";
  if (/(experience|activity|tour|guide|partner|things to do|visit|explore)/i.test(text)) return "The destination pack includes illustrative experiences. These are Demo listings, not confirmed partners or bookings; staff must confirm provider, schedule, availability and price.";
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
export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST to send a chat message." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const message = cleanText(body.message, 1200);
  if (!message) return send(res, 400, { error: "Please enter a message." });

  const destination = getDestinationById(cleanText(body.destinationId, 50));
  const intent = detectChatIntent(message, destination.hotel);
  if (intent.type === "flex_stay_request") {
    return send(res, 200, { reply: "I’ll calculate a demo timing offer. Review the offer below; the hotel must confirm the final result.", action: intent, source: "local-intent" });
  }
  const fallback = fallbackReply(message, destination);
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
          experiences: destination.experiences.map(({ id, name, description, tags }) => ({ id, name, description, tags })),
          dishes: destination.dishes.map(({ id, name, diet, spiceLevel }) => ({ id, name, diet, spiceLevel })),
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
    return send(res, 200, { reply, action: normalizeAction(parsed.action, destination.hotel), source: "gemini" });
  } catch {
    return send(res, 200, { reply: fallback, action: null, source: "local-fallback" });
  } finally {
    clearTimeout(timeout);
  }
}
