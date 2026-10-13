const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const VALID_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const VALID_VERDICTS = ["Looks fair", "Possibly overpriced", "Can't tell"];
const VALID_IMAGE_TYPES = ["taxi", "menu", "temple", "other"];

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function cleanString(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanArray(value, maxItems, maxLength) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === "string").map((item) => cleanString(item, maxLength)).filter(Boolean).slice(0, maxItems)
    : [];
}

function visiblePriceIsClear(prices, explicitFlag) {
  return explicitFlag === true && prices.some((item) => /\d/.test(item));
}

function noOfficialRateClaims(value) {
  const prohibitedClaims = [
    /verified\s+(?:official\s+)?(?:rate|tariff)/i,
    /official\s+(?:rate|tariff)\s+(?:is|was|says|confirms|sets|equals|amounts to)/i,
    /(?:is|was|are)\s+(?:the\s+)?official\s+(?:rate|tariff)/i,
    /government[- ]approved\s+(?:price|rate|tariff)/i,
    /(?:fixed|required|guaranteed|confirmed)\s+(?:official\s+)?(?:rate|tariff)/i,
  ];
  return prohibitedClaims.every((pattern) => !pattern.test(value));
}

function fallbackResult(language = "en") {
  const hindi = language === "hi";
  return {
    summary: hindi ? "तस्वीर से भरोसेमंद कीमत पढ़ना संभव नहीं हुआ।" : "A clear price could not be read reliably from this photo.",
    visiblePrices: [],
    potentialConcerns: [hindi ? "चालक या दुकान से मदवार कुल राशि की पुष्टि करें।" : "Ask the driver or shop to confirm the itemised total."],
    nextStep: hindi ? "सहमति से पहले कीमत और क्या-क्या शामिल है, इसकी पुष्टि करें।" : "Confirm the price and inclusions before agreeing.",
    imageType: "other",
    priceVisible: false,
    fairPrice: { verdict: "Can't tell", roughRange: "", explanation: hindi ? "कोई स्पष्ट कीमत दिखाई नहीं दी; कोई सीमा नहीं दी जा रही है।" : "No clear price is visible, so no range is provided." },
    etiquetteNote: "",
    disclaimer: "AI estimate based on typical ranges. Ask the driver/shop to confirm. Not an official rate.",
  };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Use POST to analyse a price image." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const mimeType = cleanString(body.mimeType, 40).toLowerCase();
  const waypoint = cleanString(body.waypoint, 80) || "Himalayan corridor";
  const language = body.language === "hi" ? "hi" : "en";
  const personaInput = body.persona && typeof body.persona === "object" ? body.persona : {};
  const persona = {
    id: ["pilgrim", "trekker", "tourism-officer"].includes(personaInput.id) ? personaInput.id : "traveller",
    name: cleanString(personaInput.name, 60) || "Traveller",
  };
  const sampleId = ["sample-taxi", "sample-menu", "sample-temple"].includes(body.sampleId) ? body.sampleId : null;

  if (!VALID_MIME_TYPES.includes(mimeType)) {
    return send(res, 400, { error: "Supported formats are JPEG, PNG and WebP." });
  }
  if (!imageBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return send(res, 400, { error: "A valid base64 image is required." });
  }
  if (imageBase64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) {
    return send(res, 413, { error: "Image is too large. Choose a photo under 3 MB." });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return send(res, 503, { error: "Price Lens is unavailable because no Gemini vision API key is configured. Try a sample demo result or retry later." });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5500);
  try {
    const prompt = [
      "You are Atithi AI Lens, a careful visual-reading assistant for Himalayan travellers.",
      "Read only prices and words clearly visible in the supplied image. Do not invent text, prices, currency, quantities, official rates, tariff tables, current local prices, or external market facts. Respond in the requested language.",
      "Return JSON: summary (concise string), visiblePrices (only text/prices that can be read directly from the image), potentialConcerns (neutral questions to clarify, not fraud accusations), nextStep (one practical sentence), imageType (taxi/menu/temple/other), priceVisible (boolean), fairPrice (object with verdict, roughRange, explanation), and etiquetteNote (string).",
      "fairPrice.verdict MUST be exactly one of: Looks fair, Possibly overpriced, Can't tell. These are cautious impressions, not facts or findings. Never state or imply a rate is official, verified, legally required, or confirmed by a government/temple/transport authority.",
      "Set priceVisible=true only if at least one actual price is clearly legible in the image and copied into visiblePrices. If no clear price is visible, set verdict to Can't tell, roughRange to an empty string, and explain no price range can be given. Never guess prices hidden by blur, glare, cropping, or unreadable text.",
      "Only give a broad roughRange when priceVisible=true. It must be a contextual typical-range estimate with uncertainty, not a quote or official tariff. If there is not enough context to estimate responsibly, leave roughRange empty and use Can't tell.",
      "If imageType is temple, give a short general etiquetteNote about following posted rules, removing leather items or covering the head only where required, and asking temple staff when unsure. Customs vary by site; never present this as a universal rule. Otherwise etiquetteNote must be empty.",
      "Use waypoint and persona only as conversational context. Persona does not prove anything about price fairness. Do not accuse a driver or shop of overcharging based on the image alone.",
      JSON.stringify({ waypoint, persona, language, sampleId }),
    ].join("\n");

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + encodeURIComponent(apiKey),
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
                imageType: { type: "STRING", enum: VALID_IMAGE_TYPES },
                priceVisible: { type: "BOOLEAN" },
                fairPrice: {
                  type: "OBJECT",
                  properties: {
                    verdict: { type: "STRING", enum: VALID_VERDICTS },
                    roughRange: { type: "STRING" },
                    explanation: { type: "STRING" },
                  },
                  required: ["verdict", "roughRange", "explanation"],
                },
                etiquetteNote: { type: "STRING" },
              },
              required: ["summary", "visiblePrices", "potentialConcerns", "nextStep", "imageType", "priceVisible", "fairPrice", "etiquetteNote"],
            },
          },
        }),
      },
    );
    if (!response.ok) {
      return send(res, 502, { error: "Price Lens could not analyse this image right now. Ask the driver/shop to confirm an itemised price." });
    }
    const payload = await response.json();
    const responseText = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const parsed = JSON.parse(responseText || "{}");

    const visiblePrices = cleanArray(parsed.visiblePrices, 12, 160);
    const priceVisible = visiblePriceIsClear(visiblePrices, parsed.priceVisible);
    const fairInput = parsed.fairPrice && typeof parsed.fairPrice === "object" ? parsed.fairPrice : {};
    const candidateVerdict = VALID_VERDICTS.includes(fairInput.verdict) ? fairInput.verdict : "Can't tell";
    const roughRange = priceVisible ? cleanString(fairInput.roughRange, 160) : "";
    const finalVerdict = priceVisible ? candidateVerdict : "Can't tell";
    const imageType = VALID_IMAGE_TYPES.includes(parsed.imageType) ? parsed.imageType : "other";
    const safeFallback = fallbackResult(language);
    const summary = cleanString(parsed.summary, 700) || safeFallback.summary;
    const nextStep = cleanString(parsed.nextStep, 400) || safeFallback.nextStep;
    const explanation = cleanString(fairInput.explanation, 240);
    const etiquetteNote = imageType === "temple" ? cleanString(parsed.etiquetteNote, 300) : "";
    const textForClaimCheck = [summary, nextStep, explanation, roughRange, ...visiblePrices].join(" ");
    if (!noOfficialRateClaims(textForClaimCheck)) {
      return send(res, 200, { ...safeFallback, sampleId, source: "safe-fallback" });
    }

    return send(res, 200, {
      summary,
      visiblePrices,
      potentialConcerns: cleanArray(parsed.potentialConcerns, 8, 220),
      nextStep,
      imageType,
      priceVisible,
      fairPrice: {
        verdict: finalVerdict,
        roughRange,
        explanation: explanation || (language === "hi" ? "यह केवल एक अनुमान है, आधिकारिक दर नहीं।" : "This is an estimate only, not an official rate."),
      },
      etiquetteNote,
      sampleId,
      language,
      disclaimer: "AI estimate based on typical ranges. Ask the driver/shop to confirm. Not an official rate.",
      source: "vision-analysis",
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return send(res, 502, {
      error: timedOut
        ? "Price Lens took too long. Please retry or use a cached sample result."
        : "Price Lens is temporarily unavailable. No official price conclusion was made.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
