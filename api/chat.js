import { getDestinationById } from "../src/data/destinations/index.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "")
  ? process.env.GEMINI_MODEL
  : "gemini-2.5-flash";

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function cleanText(value, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function fallbackReply(message, destination) {
  const text = String(message || "").toLowerCase();
  if (/(price|cost|fee|charge|refund|pay|payment|booking|book|available|availability)/i.test(text)) {
    return "I can send this to the hotel team. Staff must confirm every fee, booking and availability before any commitment. Nothing is charged or booked by this assistant.";
  }
  if (/(emergency|urgent help|ambulance|police|fire)/i.test(text)) {
    return "If there is immediate danger, call the local emergency number " + destination.emergencyNumber + ". This demo cannot dispatch help; I can also log an urgent request for hotel staff.";
  }
  if (/(food|dish|eat|restaurant|menu|diet|vegetarian|vegan|allerg)/i.test(text)) {
    const examples = destination.dishes.slice(0, 3).map((dish) => dish.name).join(", ");
    return "The " + destination.city + " destination pack includes dishes such as " + examples + ". Confirm ingredients, allergens, current venue details and final prices with the hotel team or restaurant.";
  }
  if (/(experience|activity|tour|guide|partner|things to do|visit|explore)/i.test(text)) {
    const examples = destination.experiences.slice(0, 3).map((item) => item.name).join(", ");
    return "The destination pack includes illustrative experiences such as " + examples + ". These are Demo listings, not confirmed partners or bookings; staff must confirm provider, schedule, availability and price.";
  }
  if (/(weather|rain|wind|temperature|forecast)/i.test(text)) {
    return "The app displays the latest available Open-Meteo observation for " + destination.city + ". Weather does not confirm venue opening, transport conditions or safety.";
  }
  const places = destination.places.slice(0, 3).map((place) => place.name).join(", ");
  return "I can help with a stay in " + destination.city + ", suggest destination-pack places such as " + places + ", or send a request to the hotel team. Any money, booking or availability decision stays with a person.";
}

function safePreferences(value) {
  const input = value && typeof value === "object" ? value : {};
  return {
    language: cleanText(input.language, 40) || "English",
    dietaryPreference: cleanText(input.dietaryPreference, 80) || "No preference",
    travelParty: cleanText(input.travelParty, 40) || "unspecified",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST to send a chat message." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const message = cleanText(body.message, 1200);
  if (!message) return send(res, 400, { error: "Please enter a message." });

  const destination = getDestinationById(cleanText(body.destinationId, 50));
  const fallback = fallbackReply(message, destination);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 200, { reply: fallback, source: "local-fallback" });

  const preferences = safePreferences(body.preferences);
  const guestInput = body.guest && typeof body.guest === "object" ? body.guest : {};
  const guest = {
    name: cleanText(guestInput.name, 80) || "Guest",
    persona: ["Guest (Family)", "Guest (Solo)"].includes(guestInput.persona) ? guestInput.persona : "Guest",
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const prompt = [
      "You are Atithi AI, an AI co-host for a three-star hotel in a tourist destination.",
      "Answer in the language the guest used in their message. If you cannot confidently identify it, use concise English.",
      "Use only the destination's supplied city, country, currency, languages, places, experiences and dishes. Never invent a place, partner, price, fee, policy, booking, availability, opening hour or action.",
      "All hotel, partner and price information supplied here is DEMO content. Only weather is live, and no weather observation is included in this message.",
      "Humans control all money-related decisions. Never charge, refund, book, confirm availability, offer a final price or claim a staff action occurred. Offer to create a request for a human to review.",
      "Keep the answer clear, warm and concise. Do not provide medical, legal or emergency dispatch claims.",
      JSON.stringify({
        message,
        guest,
        preferences,
        destination: {
          city: destination.city,
          country: destination.country,
          currency: destination.currency,
          primaryLanguages: destination.primaryLanguages,
          hotel: { name: destination.hotel.name, stars: destination.hotel.stars, checkIn: destination.hotel.checkIn, checkOut: destination.hotel.checkOut },
          places: destination.places.map(({ id, name, category, tags }) => ({ id, name, category, tags })),
          experiences: destination.experiences.map(({ id, name, partner, description, tags }) => ({ id, name, partner, description, tags })),
          dishes: destination.dishes.map(({ id, name, diet, spiceLevel }) => ({ id, name, diet, spiceLevel })),
        },
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
              properties: { reply: { type: "STRING" } },
              required: ["reply"],
            },
          },
        }),
      },
    );
    if (!response.ok) throw new Error("AI service unavailable");
    const payload = await response.json();
    const modelText = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const parsed = JSON.parse(modelText || "{}");
    const reply = cleanText(parsed.reply, 1600);
    if (!reply) throw new Error("Empty model answer");
    return send(res, 200, { reply, source: "gemini" });
  } catch {
    return send(res, 200, { reply: fallback, source: "local-fallback" });
  } finally {
    clearTimeout(timeout);
  }
}
