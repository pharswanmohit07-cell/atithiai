import { languageBase } from "../src/i18n.js";

export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const VALID_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const VALID_MODES = new Set(["general", "menu", "price"]);
const VALID_VERDICTS = new Set(["Looks fair", "Possibly overpriced", "Can't tell"]);
const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-2.5-flash";

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function cleanText(value, max = 300) {
  return typeof value === "string" ? value.trim().replace(/\u0000/g, "").slice(0, max) : "";
}
function safeLanguageTag(value) {
  const candidate = cleanText(value, 45).replace(/_/g, "-");
  if (!candidate || !/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(candidate)) return "en";
  try { return Intl.getCanonicalLocales(candidate)[0] || "en"; } catch { return "en"; }
}
function safeCurrency(value) {
  const candidate = cleanText(value, 20).toUpperCase();
  return /^[A-Z]{3}$/.test(candidate) ? candidate : "";
}
function inferMimeType(base64) {
  try {
    const bytes = Buffer.from(base64.slice(0, 64), "base64");
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
    if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
    if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "image/webp";
  } catch { /* Invalid base64 is rejected by the handler. */ }
  return "";
}
function fallbackCopy(language) {
  const base = languageBase(language);
  const copies = {
    en: ["No clear text could be read from this image. Try a sharper photo with the text in focus.", "AI estimate. Verify locally."],
    hi: ["इस तस्वीर से कोई स्पष्ट पाठ नहीं पढ़ा जा सका। पाठ पर फ़ोकस करके साफ़ तस्वीर लें।", "AI का अनुमान। स्थानीय रूप से पुष्टि करें।"],
    es: ["No se pudo leer texto con claridad. Prueba una foto más nítida y enfocada.", "Estimación de IA. Verifica localmente."],
    fr: ["Aucun texte clair n’a pu être lu. Essayez une photo plus nette et mise au point.", "Estimation IA. Vérifiez sur place."]
  };
  return copies[base] || copies.en;
}
function fallbackResult(context) {
  const fallback = fallbackCopy(context.targetLanguage);
  const common = {
    mode: context.mode, detectedLanguage: "unknown", detectedText: "",
    translation: fallback[0], confidence: "low", disclaimer: fallback[1],
    source: "safe-fallback", city: context.city, country: context.country, currency: context.currency
  };
  if (context.mode === "menu") {
    return { ...common, summary: fallback[0], dishes: [], estimateNotice: "AI estimate — confirm locally" };
  }
  if (context.mode === "price") {
    return { ...common, summary: fallback[0], visiblePrices: [], roughRange: "", rangeLow: null, rangeHigh: null, verdict: "Can't tell", explanation: "The image does not provide a clear, verifiable comparison. No official rate is claimed." };
  }
  return { ...common, summary: fallback[0] };
}
function cleanArray(value, maxItems = 16, maxLength = 240) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "string").map((item) => cleanText(item, maxLength)).filter(Boolean).slice(0, maxItems);
}
function safeJsonParse(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const normalized = raw.trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  try {
    const direct = JSON.parse(normalized);
    return direct && typeof direct === "object" ? direct : null;
  } catch {
    const first = normalized.indexOf("{"), last = normalized.lastIndexOf("}");
    if (first < 0 || last <= first) return null;
    try {
      const parsed = JSON.parse(normalized.slice(first, last + 1));
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch { return null; }
  }
}
function getVisibleAmounts(lines) {
  const values = [];
  for (const line of lines) {
    const matches = String(line).match(/(?:₹|₨|Rs\.?|INR|€|\$|£|¥|￥|Rp\.?|IDR|₩|฿|₫|₱|RM|AED|SAR|CNY|EUR|USD|GBP)?\s*\d[\d.,\s]*(?:\d)?/gi) || [];
    for (const raw of matches) {
      let value = raw.replace(/[^\d.,]/g, "").trim().replace(/\s+/g, "");
      if (!value) continue;
      if (value.includes(",") && value.includes(".")) {
        const decimalPosition = Math.max(value.lastIndexOf(","), value.lastIndexOf("."));
        const trailing = value.length - decimalPosition - 1;
        value = trailing === 1 || trailing === 2
          ? value.slice(0, decimalPosition).replace(/[.,]/g, "") + "." + value.slice(decimalPosition + 1)
          : value.replace(/[.,]/g, "");
      } else if (value.includes(",") || value.includes(".")) {
        const separator = value.includes(",") ? "," : ".";
        const chunks = value.split(separator);
        value = chunks.length > 1 && chunks[chunks.length - 1].length === 3
          ? chunks.join("")
          : chunks.slice(0, -1).join("") + "." + chunks[chunks.length - 1];
      }
      const numeric = Number(value);
      if (Number.isFinite(numeric) && numeric >= 0 && numeric <= 1e12 && !values.some((old) => Math.abs(old - numeric) < 0.000001)) values.push(numeric);
    }
  }
  return values;
}
function currencyMismatch(lines, localCurrency) {
  const text = lines.join(" ").toUpperCase();
  const known = [
    ["INR", /₹|\bINR\b|\bRS\.?\s*\d/i], ["IDR", /₨|\bIDR\b|\bRP\.?\s*\d/i],
    ["EUR", /€|\bEUR\b/], ["GBP", /£|\bGBP\b/], ["JPY", /\bJPY\b/], ["CNY", /\bCNY\b|元/],
    ["KRW", /₩|\bKRW\b/], ["THB", /฿|\bTHB\b/], ["VND", /₫|\bVND\b/], ["PHP", /₱|\bPHP\b/],
    ["AED", /\bAED\b|د\.إ/], ["SAR", /\bSAR\b/], ["MYR", /\bMYR\b|RM\s*\d/i], ["USD", /\bUSD\b/]
  ];
  for (const [code, pattern] of known) if (pattern.test(text)) return code !== localCurrency;
  if (text.includes("$")) return true;
  if (text.includes("¥") || text.includes("￥")) return true;
  return false;
}
function formatCurrencyRange(low, high, currency, locale) {
  try {
    const formatter = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: ["IDR", "JPY", "KRW", "VND", "CLP"].includes(currency) ? 0 : 2 });
    return low === high ? formatter.format(low) : formatter.format(low) + " – " + formatter.format(high);
  } catch {
    return low === high ? String(low) + " " + currency : String(low) + "–" + String(high) + " " + currency;
  }
}
function safeCommon(parsed, context) {
  const result = {
    mode: context.mode,
    detectedLanguage: cleanText(parsed.detectedLanguage, 60) || "unknown",
    detectedText: cleanText(parsed.detectedText, 3500),
    translation: cleanText(parsed.translation, 3500),
    summary: cleanText(parsed.summary, 900),
    confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "low",
    disclaimer: "AI estimate. Verify locally.", source: "ai-estimate",
    city: context.city, country: context.country, currency: context.currency
  };
  if (!result.detectedText || !result.translation) result.confidence = "low";
  return result;
}
function safeResult(parsed, context) {
  const common = safeCommon(parsed, context);
  if (context.mode === "menu") {
    const dishes = Array.isArray(parsed.dishes) ? parsed.dishes.filter((dish) => dish && typeof dish === "object").slice(0, 16).map((dish) => ({
      name: cleanText(dish.name, 120),
      explanation: cleanText(dish.explanation, 420),
      dietGuess: cleanText(dish.dietGuess, 120) || "Unknown — verify locally",
      spiceGuess: cleanText(dish.spiceGuess, 80) || "Unknown — confirm with staff"
    })).filter((dish) => dish.name) : [];
    return { ...common, summary: common.summary || "Menu text was read. Verify ingredients and allergens locally.", dishes, estimateNotice: "AI estimate, confirm with staff" };
  }
  if (context.mode === "price") {
    const visiblePrices = cleanArray(parsed.visiblePrices, 20, 200);
    const amounts = getVisibleAmounts(visiblePrices);
    const foreignCurrency = currencyMismatch(visiblePrices, context.currency);
    const low = amounts.length && !foreignCurrency ? Math.min(...amounts) : null;
    const high = amounts.length && !foreignCurrency ? Math.max(...amounts) : null;
    const validVerdict = VALID_VERDICTS.has(parsed.verdict) ? parsed.verdict : "Can't tell";
    const verdict = !foreignCurrency && parsed.comparisonVisible === true && amounts.length >= 2 ? validVerdict : "Can't tell";
    return {
      ...common,
      summary: common.summary || "Only clearly visible price text is considered. Verify the final total locally.",
      visiblePrices, roughRange: low == null ? "" : formatCurrencyRange(low, high, context.currency, context.locale),
      rangeLow: low, rangeHigh: high, verdict,
      explanation: foreignCurrency
        ? "The visible price appears to use a different or ambiguous currency. It is shown verbatim above and is not converted because no verified exchange rate is connected."
        : cleanText(parsed.explanation, 500) || "This is a cautious image-only estimate, not an official rate or a verified local market comparison."
    };
  }
  return { ...common, summary: common.summary || common.translation || fallbackCopy(context.targetLanguage)[0] };
}
function schemaForMode(mode) {
  const base = {
    detectedLanguage: { type: "STRING" }, detectedText: { type: "STRING" },
    translation: { type: "STRING" }, summary: { type: "STRING" },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] }
  };
  if (mode === "menu") return {
    type: "OBJECT", properties: { ...base, dishes: { type: "ARRAY", items: { type: "OBJECT", properties: {
      name: { type: "STRING" }, explanation: { type: "STRING" }, dietGuess: { type: "STRING" }, spiceGuess: { type: "STRING" }
    }, required: ["name", "explanation", "dietGuess", "spiceGuess"] } } },
    required: ["detectedLanguage", "detectedText", "translation", "summary", "confidence", "dishes"]
  };
  if (mode === "price") return {
    type: "OBJECT", properties: { ...base, visiblePrices: { type: "ARRAY", items: { type: "STRING" } },
      verdict: { type: "STRING", enum: ["Looks fair", "Possibly overpriced", "Can't tell"] },
      comparisonVisible: { type: "BOOLEAN" }, explanation: { type: "STRING" } },
    required: ["detectedLanguage", "detectedText", "translation", "summary", "confidence", "visiblePrices", "verdict", "comparisonVisible", "explanation"]
  };
  return { type: "OBJECT", properties: base, required: ["detectedLanguage", "detectedText", "translation", "summary", "confidence"] };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST to analyse an image." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  let imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64.trim() : "";
  let mimeType = cleanText(body.mimeType, 40).toLowerCase();
  const dataUrlMatch = imageBase64.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/s);
  if (dataUrlMatch) {
    if (!mimeType) mimeType = dataUrlMatch[1];
    imageBase64 = dataUrlMatch[2];
  }
  imageBase64 = imageBase64.replace(/\s/g, "");
  if (!mimeType) mimeType = inferMimeType(imageBase64);
  const mode = VALID_MODES.has(body.mode) ? body.mode : "general";
  const targetLanguage = safeLanguageTag(body.targetLanguage || body.language || "en");
  const context = {
    mode, targetLanguage,
    city: cleanText(body.city, 100), country: cleanText(body.country, 100),
    currency: safeCurrency(body.currency), locale: safeLanguageTag(body.locale || targetLanguage)
  };
  if (!VALID_MIME_TYPES.has(mimeType)) return send(res, 400, { error: "Choose a JPEG, PNG or WebP image." });
  if (!context.currency) return send(res, 400, { error: "Enter a valid three-letter local currency code, such as INR, EUR or JPY." });
  if (!imageBase64 || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) return send(res, 400, { error: "The selected image could not be read. Please choose it again." });
  if (imageBase64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) return send(res, 200, fallbackResult(context));
  if (!process.env.GEMINI_API_KEY) return send(res, 200, fallbackResult(context));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const prompt = [
      "You are Atithi Lens, a careful image text reader and translator for travellers anywhere in the world.",
      "Read only text visibly present. Detect the original language and translate readable text into the target language whose BCP-47 tag is " + targetLanguage + ". For blurry, cropped or ambiguous text, use low confidence and say what is unclear.",
      "Never invent text, ingredients, currency, price figures, fees, local tariffs, official exchange rates, legal rules, opening hours or business details. City, country and currency are user-provided context, not proof that the image is from that location. Preserve visible numbers and units.",
      "Mode: " + mode + ". Context: " + JSON.stringify({ city: context.city, country: context.country, localCurrency: context.currency, locale: context.locale }),
      mode === "general"
        ? "For general mode, provide detectedText exactly as legible, translation, a concise neutral summary and confidence."
        : mode === "menu"
          ? "For menu mode, return dishes only when a dish name is legible. Translate visible descriptions but do not invent ingredients. dietGuess and spiceGuess must be hedged and may say unknown. Every dish assessment is an AI estimate and must be confirmed with staff."
          : "For price mode, visiblePrices must contain only clearly legible price labels copied from the image. Never add a price that is not visibly shown. The server formats visible amounts in the supplied local currency only when currency interpretation is clear. Choose Looks fair or Possibly overpriced only if the image itself shows a clear comparable reference price for the same thing; otherwise choose Can't tell. Never claim an official rate or verified market comparison.",
      "Return only JSON matching the provided schema. Prefer empty text and low confidence to guessing."
    ].join("\n");
    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(process.env.GEMINI_API_KEY), {
      method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }] }],
        generationConfig: { responseMimeType: "application/json", responseSchema: schemaForMode(mode), temperature: 0.2, maxOutputTokens: mode === "menu" ? 1800 : 1300 }
      })
    });
    if (!response.ok) throw new Error("Image service unavailable");
    const payload = await response.json();
    const modelText = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const parsed = safeJsonParse(modelText || "");
    if (!parsed) throw new Error("Invalid model JSON");
    return send(res, 200, safeResult(parsed, context));
  } catch {
    return send(res, 200, fallbackResult(context));
  } finally {
    clearTimeout(timeout);
  }
}
