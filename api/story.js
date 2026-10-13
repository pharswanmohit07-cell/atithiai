import { getDestinationById } from "../src/data/destinations/index.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "")
  ? process.env.GEMINI_MODEL
  : "gemini-2.5-flash";

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function cleanText(value, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function localCaption(context) {
  const guest = context.guestName || "Guest";
  const city = context.destination.city;
  const first = context.highlights[0] || "a new discovery";
  const second = context.highlights[1] || "a thoughtful moment";
  return [
    guest + "'s stay in " + city + " is taking shape, one small discovery at a time.",
    "From " + first + " to " + second + ", this is a trip to remember.",
  ];
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST to prepare a stay caption." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const destination = getDestinationById(cleanText(body.destinationId, 50));
  const context = {
    guestName: cleanText(body.guestName, 80) || "Guest",
    language: cleanText(body.language, 40) || "English",
    destination: { city: destination.city, country: destination.country },
    highlights: Array.isArray(body.highlights) ? body.highlights.filter((item) => typeof item === "string").slice(0, 3).map((item) => cleanText(item, 90)).filter(Boolean) : [],
  };
  const fallback = localCaption(context);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 200, { lines: fallback, source: "local" });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const prompt = [
      "Write two concise, warm stay-journal lines for a hotel guest.",
      "Reply in the requested language. Use only the supplied destination and itinerary highlights; do not claim an activity happened unless it appears in highlights.",
      "Do not invent partner names, bookings, prices, events or verified claims. All supplied places are demonstration ideas.",
      JSON.stringify(context),
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
              properties: { line1: { type: "STRING" }, line2: { type: "STRING" } },
              required: ["line1", "line2"],
            },
          },
        }),
      },
    );
    if (!response.ok) throw new Error("Caption service unavailable");
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const parsed = JSON.parse(text || "{}");
    const lines = [cleanText(parsed.line1), cleanText(parsed.line2)];
    if (lines.some((line) => !line)) throw new Error("Caption was incomplete");
    return send(res, 200, { lines, source: "gemini" });
  } catch {
    return send(res, 200, { lines: fallback, source: "local" });
  } finally {
    clearTimeout(timeout);
  }
}
