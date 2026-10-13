const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function cleanString(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return send(res, 405, { error: "Use POST to analyse a price image." });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const mimeType = cleanString(body.mimeType, 40).toLowerCase();
  const waypoint = cleanString(body.waypoint, 80) || "Himalayan corridor";
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
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
    return send(res, 503, {
      error: "Price Lens is unavailable because no Gemini vision API key is configured. No price analysis was produced.",
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const prompt = [
      "You are Atithi AI Price Lens, a careful visual reading assistant for Himalayan travellers.",
      "Read only the text and prices visible in the supplied image. Do not invent text, prices, item quantities, currency, or local market-rate comparisons.",
      "Return JSON with summary (one concise string), visiblePrices (an array of strings copied from visible text), potentialConcerns (an array of useful neutral questions to ask, not fraud accusations), and nextStep (one practical sentence).",
      "Never claim a price is fair, unfair, overpriced, a scam, or illegal based on this image alone. Do not use external/current price data. If text is unreadable, state that clearly in summary and keep visiblePrices empty.",
      "Use the selected corridor waypoint only as context, not as evidence about current prices.",
      JSON.stringify({ waypoint }),
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
              },
              required: ["summary", "visiblePrices", "potentialConcerns", "nextStep"],
            },
          },
        }),
      },
    );
    if (!response.ok) {
      return send(res, 502, { error: "Price Lens could not analyse this image right now. Keep the original quote and ask for an itemised price." });
    }
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const parsed = JSON.parse(text || "{}");
    if (typeof parsed.summary !== "string" || typeof parsed.nextStep !== "string" || !Array.isArray(parsed.visiblePrices) || !Array.isArray(parsed.potentialConcerns)) {
      throw new Error("Invalid Price Lens response");
    }
    return send(res, 200, {
      summary: cleanString(parsed.summary, 700) || "The visible text could not be read clearly.",
      visiblePrices: parsed.visiblePrices.map((item) => cleanString(item, 160)).filter(Boolean).slice(0, 12),
      potentialConcerns: parsed.potentialConcerns.map((item) => cleanString(item, 220)).filter(Boolean).slice(0, 8),
      nextStep: cleanString(parsed.nextStep, 500) || "Ask the seller for a clear, itemised quote before agreeing.",
      disclaimer: "Image reading only; no market price was verified.",
    });
  } catch (error) {
    const timedOut = error?.name === "AbortError";
    return send(res, 502, {
      error: timedOut
        ? "Price Lens timed out. Keep the displayed price and ask for an itemised quote."
        : "Price Lens is temporarily unavailable. No price conclusion was made.",
    });
  } finally {
    clearTimeout(timeout);
  }
}
