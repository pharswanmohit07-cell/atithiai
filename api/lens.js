export const config = { api: { bodyParser: { sizeLimit: "6mb" } } };

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const VALID_MODES = new Set(["menu", "sign", "transport", "general"]);
const VALID_LANGUAGES = new Set(["en", "hi", "es", "fr", "de", "pt", "id", "ja", "zh", "ar"]);
const VALID_VERDICTS = ["Looks fair", "Possibly overpriced", "Can't tell"];
const MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-2.5-flash";

const LANG = {
  en: { what: "I couldn't read this image reliably.", explanation: "The text may be blurred, cropped, or context-dependent. Try a clearer photo and confirm important details with local staff.", tip: "Ask local staff to confirm anything important before acting." },
  hi: { what: "मैं इस तस्वीर को भरोसेमंद तरीके से पढ़ नहीं पाया।", explanation: "पाठ धुंधला, कटा हुआ या संदर्भ पर निर्भर हो सकता है। साफ़ तस्वीर लें और ज़रूरी जानकारी स्थानीय कर्मचारियों से पक्की करें।", tip: "किसी ज़रूरी बात पर अमल करने से पहले स्थानीय कर्मचारियों से पुष्टि करें।" },
  es: { what: "No pude leer esta imagen con fiabilidad.", explanation: "El texto puede estar borroso, recortado o depender del contexto. Prueba con una foto más clara y confirma los detalles importantes con el personal local.", tip: "Confirma los detalles importantes con el personal local antes de actuar." },
  fr: { what: "Je n’ai pas pu lire cette image de manière fiable.", explanation: "Le texte peut être flou, coupé ou dépendre du contexte. Essayez une photo plus nette et confirmez les détails importants auprès du personnel local.", tip: "Vérifiez les détails importants auprès du personnel local." },
  de: { what: "Ich konnte dieses Bild nicht zuverlässig lesen.", explanation: "Der Text ist möglicherweise unscharf, abgeschnitten oder kontextabhängig. Versuchen Sie ein klareres Foto und bestätigen Sie wichtige Angaben beim Personal vor Ort.", tip: "Bestätigen Sie wichtige Angaben vor Ort, bevor Sie handeln." },
  pt: { what: "Não consegui ler esta imagem com segurança.", explanation: "O texto pode estar desfocado, cortado ou depender do contexto. Tente uma foto mais nítida e confirme detalhes importantes com a equipe local.", tip: "Confirme detalhes importantes com a equipe local antes de agir." },
  id: { what: "Saya tidak dapat membaca gambar ini dengan yakin.", explanation: "Teks mungkin buram, terpotong, atau bergantung pada konteks. Coba foto yang lebih jelas dan pastikan detail penting kepada petugas setempat.", tip: "Pastikan detail penting kepada petugas setempat sebelum bertindak." },
  ja: { what: "画像を確実に読み取れませんでした。", explanation: "文字がぼやけている、切れている、または文脈に左右される可能性があります。より鮮明な写真を試し、重要な点は現地のスタッフに確認してください。", tip: "重要な内容は行動する前に現地スタッフへ確認してください。" },
  zh: { what: "无法可靠地识别这张图片。", explanation: "文字可能模糊、被裁切或需要结合上下文理解。请尝试拍摄更清晰的照片，并向当地工作人员确认重要信息。", tip: "采取行动前，请向当地工作人员确认重要信息。" },
  ar: { what: "تعذّرت قراءة الصورة بشكل موثوق.", explanation: "قد يكون النص ضبابيًا أو مقصوصًا أو يعتمد على السياق. جرّب صورة أوضح وتأكد من التفاصيل المهمة لدى الموظفين المحليين.", tip: "تحقق من التفاصيل المهمة لدى الموظفين المحليين قبل التصرف." }
};

function clean(value, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function baseLanguage(value) {
  const candidate = clean(value, 20).toLowerCase().split("-")[0];
  return VALID_LANGUAGES.has(candidate) ? candidate : "en";
}
// safe-fallback responses intentionally keep the HTTP status at 200 for provider failures.
function fallback(language, mode) {
  const copy = LANG[language] || LANG.en;
  const result = {
    whatIsThis: copy.what,
    detectedLanguage: "unknown",
    translation: null,
    explanation: copy.explanation,
    tips: [copy.tip],
    confidence: "low"
  };
  if (mode === "menu") result.dishes = [];
  if (mode === "transport") result.transport = { summary: copy.what, priceNote: null, verdict: "Can't tell" };
  return result;
}
function send(res, status, value) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  return res.end(JSON.stringify(value));
}
function safeJsonParse(text) {
  if (typeof text !== "string") return null;
  const cleaned = text.trim().replace(/^\uFEFF/, "").replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/i, "");
  try { return JSON.parse(cleaned); } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first < 0 || last <= first) return null;
    try { return JSON.parse(cleaned.slice(first, last + 1)); } catch { return null; }
  }
}
function normalize(payload, language, mode, profileDiet) {
  if (!payload || typeof payload !== "object") return fallback(language, mode);
  const safeText = (value, max = 500) => clean(value, max);
  const detectedLanguage = safeText(payload.detectedLanguage, 80) || "unknown";
  const translation = typeof payload.translation === "string" && payload.translation.trim() ? safeText(payload.translation, 4000) : null;
  const explanation = safeText(payload.explanation, 800).split(/\s+/).slice(0, 69).join(" ") || LANG[language].explanation;
  const tips = Array.isArray(payload.tips) ? payload.tips.filter((x) => typeof x === "string").map((x) => clean(x, 180)).filter(Boolean).slice(0, 3) : [];
  const confidence = ["low", "medium", "high"].includes(payload.confidence) ? payload.confidence : "low";
  const result = {
    whatIsThis: safeText(payload.whatIsThis, 700) || LANG[language].what,
    detectedLanguage,
    translation,
    explanation,
    tips: tips.length ? tips : [LANG[language].tip],
    confidence
  };
  if (mode === "menu") {
    result.dishes = (Array.isArray(payload.dishes) ? payload.dishes : []).slice(0, 12).map((dish) => {
      const name = safeText(dish?.name, 120);
      let dishExplanation = safeText(dish?.explanation, 260);
      const dietGuess = safeText(dish?.dietGuess, 100) || "Unclear — ask staff";
      if (profileDiet && profileDiet !== "none" && /may conflict|may not match|unclear|unknown/i.test(dietGuess + " " + dishExplanation)) {
        if (!/may not match your diet, ask staff/i.test(dishExplanation)) dishExplanation = (dishExplanation ? dishExplanation + " " : "") + "May not match your diet, ask staff.";
      }
      return { name: name || "Unclear dish name", explanation: dishExplanation || "Ingredients are uncertain; ask staff.", dietGuess, spiceGuess: safeText(dish?.spiceGuess, 80) || "Unclear" };
    }).filter((dish) => dish.name);
  }
  if (mode === "transport") {
    const transport = payload.transport && typeof payload.transport === "object" ? payload.transport : {};
    const verdict = VALID_VERDICTS.includes(transport.verdict) ? transport.verdict : "Can't tell";
    result.transport = {
      summary: safeText(transport.summary, 500) || LANG[language].what,
      priceNote: typeof transport.priceNote === "string" && transport.priceNote.trim() ? safeText(transport.priceNote, 260) : null,
      verdict
    };
    if (verdict === "Can't tell") result.transport.priceNote = result.transport.priceNote || null;
  }
  return result;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, fallback("en", "general"));
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const rawLanguage = clean(body.targetLanguage, 35);
  const language = baseLanguage(rawLanguage);
  const mode = VALID_MODES.has(body.mode) ? body.mode : "general";
  const imageBase64 = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const city = clean(body.city, 100);
  const country = clean(body.country, 100);
  const currency = /^[A-Z]{3}$/.test(clean(body.currency, 3).toUpperCase()) ? clean(body.currency, 3).toUpperCase() : "";
  const profileDiet = clean(body.profileDiet, 40).toLowerCase();
  if (!imageBase64 || imageBase64.startsWith("data:") || !/^[A-Za-z0-9+/]+={0,2}$/.test(imageBase64)) {
    return send(res, 400, { error: "Send a JPEG image as base64 without the data: prefix." });
  }
  if (imageBase64.length > Math.ceil(MAX_IMAGE_BYTES * 4 / 3) + 8) {
    return send(res, 413, { error: "Image is too large. Choose a photo under 4 MB." });
  }
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return send(res, 200, fallback(language, mode));

  const controller = new AbortController();
  // Keep provider work bounded; the client has its own shorter sample timeout.
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const prompt = [
      "You are Atithi Lens, a cautious travel companion helping travellers interpret unfamiliar menus, signs, and local transport details.",
      "Analyze only the supplied JPEG. Preserve context, warnings, units, names, conditions, and uncertainty. Never invent text, prices, ingredients, routes, rules, official rates, or facts not visible or reasonably inferable.",
      "Respond in the target language whose BCP-47 tag is supplied. detectedLanguage should name the source language in its own language or a common English name. translation is a natural, context-preserving translation of visible text, or null if no readable text.",
      "explanation must be under 70 words and include cultural or practical context only when reasonably supported. tips must contain at most 3 concise etiquette/practical tips.",
      "For menu mode, list only identifiable dishes. dietGuess must be cautious (e.g. vegetarian-looking, may contain meat/egg/dairy, unclear—ask staff); spiceGuess must be cautious. If profileDiet could conflict or ingredients are unclear, explicitly say 'may not match your diet, ask staff'. Do not infer allergy safety.",
      "For transport mode, summarize visible route/fare/vehicle/conditions. Never claim an official rate. Mention a price or price range only if a price is clearly visible in the image; never invent prices. Only use 'Looks fair' or 'Possibly overpriced' when the visible price and legible context permit a cautious impression; otherwise use 'Can't tell'. A verdict is not a verified fare.",
      "Output JSON only, no markdown, with keys: whatIsThis:string, detectedLanguage:string, translation:string|null, explanation:string, tips:string[], confidence:'low'|'medium'|'high'. Include dishes:[{name,explanation,dietGuess,spiceGuess}] only for menu mode. Include transport:{summary,priceNote:string|null,verdict:'Looks fair'|'Possibly overpriced'|'Can't tell'} only for transport mode.",
      JSON.stringify({ targetLanguage: rawLanguage || language, mode, city, country, currency, profileDiet })
    ].join("\n");
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }, { inline_data: { mime_type: "image/jpeg", data: imageBase64 } }] }],
        // The prompt defines mode-specific fields; normalize() validates the returned JSON shape.
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });
    if (!response.ok) return send(res, 200, fallback(language, mode));
    let providerPayload = null;
    try { providerPayload = await response.json(); } catch { return send(res, 200, fallback(language, mode)); }
    const responseText = providerPayload?.candidates?.[0]?.content?.parts?.find((part) => typeof part.text === "string")?.text;
    const parsed = safeJsonParse(responseText);
    if (!parsed) return send(res, 200, fallback(language, mode));
    return send(res, 200, normalize(parsed, language, mode, profileDiet));
  } catch {
    return send(res, 200, fallback(language, mode));
  } finally {
    clearTimeout(timer);
  }
}
