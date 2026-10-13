import { getDestinationById } from "../src/data/destinations/index.js";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const VALID_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VALID_VERDICTS = ["Looks fair", "Possibly overpriced", "Can't tell"];
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

function cleanArray(value, maxItems, maxLength) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function fallbackResult(language = "English", sampleId = null) {
  return {
    summary: "A reliable price reading is unavailable. Ask the provider to confirm an itemised total.",
    visiblePrices: [],
    potentialConcerns: ["Confirm inclusions, taxes, portion or service details before paying."],
    nextStep: "Ask the provider or hotel team to confirm the itemised price in writing.",
    imageType: "other",
    priceVisible: false,
    fairPrice: {
      verdict: "Can't tell",
      roughRange: "",
      explanation: "The image alone cannot establish a fair price, and no verified destination price list is configured.",
    },
    etiquetteNote: "",
    disclaimer: "AI estimate only. No official rate or finding of overcharging is provided.",
    language,
    sampleId,
    source: "safe-fallback",
  };
}

function safeResult(parsed, destination, language, sampleId) {
  const visiblePrices = cleanArray(parsed.visiblePrices, 12, 160);
  const clearPrice = parsed.priceVisible === true && visiblePrices.some((item) => /\d/.test(item));
  const imageType = ["taxi", "menu", "receipt", "service", "other"].includes(parsed.imageType) ? parsed.imageType : "other";
  const summary = cleanText(parsed.summary, 700);
  const nextStep = cleanText(parsed.nextStep, 400);
  const concerns = cleanArray(parsed.potentialConcerns, 8, 220);
  return {
    summary: summary || "The image has been read. Confirm unclear details with the provider.",
    visiblePrices: visiblePrices,
    potentialConcerns: concerns,
    nextStep: nextStep || "Ask the provider to confirm the full itemised price.",
    imageType,
    priceVisible: clearPrice,
    fairPrice: {
      verdict: "Can't tell",
      roughRange: "",
      explanation: "No verified comparison prices are configured for " + destination.city + ". The image alone cannot establish a fair price.",
    },
    etiquetteNote: "",
    disclaimer: "AI estimate only. Not a tariff or a finding of overcharging.",
    language,
    sampleId,
    source: "ai-estimate",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST to analyse a price image." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const mimeType = cleanText(body.mimeType, 40).toLowerCase();
  const language = cleanText(body.language, 40) || "English";
  const sampleId = ["sample-taxi", "sample-menu", "sample-service"].includes(body.sampleId) ? body.sampleId : null;
  const destination = getDestinationById(cleanText(body.destinationId, 50));

  if (!VALID_MIME_TYPES.includes(mimeType)) return send(res, 400, { error: "Choose a JPEG, PNG or WebP image." });
  if (!imageBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return send(res, 400, { error: "The selected image could not be read. Please choose it again." });
  if (imageBase64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) {
    return send(res, 413, { ...fallbackResult(language, sampleId), error: "This image is larger than 3 MB. Choose a smaller image or use a sample." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 200, fallbackResult(language, sampleId));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const prompt = [
      "You are an image text reader in a hotel guest assistant. Inspect only words and prices that are clearly legible in the uploaded image.",
      "Reply in the requested language. Use the supplied city, country, currency code and primary languages only as context. Do not infer a currency from a symbol alone when uncertain.",
      "Never add or change a number, invent prices, estimate a typical range, name an unlisted business, claim a tariff is official, or accuse anyone of overcharging.",
      "Return JSON with summary, visiblePrices, potentialConcerns, nextStep, imageType, priceVisible and etiquetteNote. priceVisible is true only when an actual price is legible and copied verbatim into visiblePrices.",
      "Price fairness must remain uncertain: no verified comparison price list is supplied, so the UI will show the verdict Can't tell and no numeric range.",
      JSON.stringify({
        destination: {
          city: destination.city,
          country: destination.country,
          currency: destination.currency,
          primaryLanguages: destination.primaryLanguages,
        },
        guestLanguage: language,
        allowedDishNames: destination.dishes.map((dish) => dish.name),
        allowedExperienceNames: destination.experiences.map((experience) => experience.name),
      }),
    ].join("\n");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
            ],
          }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                summary: { type: "STRING" },
                visiblePrices: { type: "ARRAY", items: { type: "STRING" } },
                potentialConcerns: { type: "ARRAY", items: { type: "STRING" } },
                nextStep: { type: "STRING" },
                imageType: { type: "STRING", enum: ["taxi", "menu", "receipt", "service", "other"] },
                priceVisible: { type: "BOOLEAN" },
                etiquetteNote: { type: "STRING" },
              },
              required: ["summary", "visiblePrices", "potentialConcerns", "nextStep", "imageType", "priceVisible", "etiquetteNote"],
            },
          },
        }),
      },
    );
    if (!response.ok) throw new Error("Image service unavailable");
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const parsed = JSON.parse(text || "{}");
    return send(res, 200, safeResult(parsed, destination, language, sampleId));
  } catch {
    return send(res, 200, fallbackResult(language, sampleId));
  } finally {
    clearTimeout(timeout);
  }
}
