import { detectTextLanguage, languageBase, targetLanguageTag } from "../src/i18n.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-2.5-flash";
const INTENTS = new Set(["find_place", "find_food", "find_experience", "plan_day", "help", "other"]);
const CATEGORIES = new Set(["viewpoint", "market", "cafe", "culture", "nature", "craft", "wellness"]);
const DIETS = new Set(["veg", "vegan", "non-veg", "halal", "gluten-aware", "none"]);
const TIMES = new Set(["morning", "afternoon", "evening"]);

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function cleanText(value, max = 1200) {
  return typeof value === "string" ? value.trim().replace(/\u0000/g, "").slice(0, max) : "";
}
function parseJson(raw) {
  if (typeof raw !== "string" || !raw.trim()) return null;
  const normalized = raw.trim().replace(/^\x60{3}(?:json)?\s*/i, "").replace(/\s*\x60{3}$/, "");
  try {
    const parsed = JSON.parse(normalized);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
  } catch {
    const first = normalized.indexOf("{"), last = normalized.lastIndexOf("}");
    if (first < 0 || last <= first) return null;
    try {
      const parsed = JSON.parse(normalized.slice(first, last + 1));
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch { return null; }
  }
}
function nullableNumber(value, max = 1e9) {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.min(num, max) : null;
}
function nullableText(value, max = 100) {
  if (value === null || value === undefined || value === "") return null;
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}
function languageTag(value, message) {
  const input = cleanText(value, 45).replace(/_/g, "-");
  if (input && input.toLowerCase() !== "auto") {
    try { return Intl.getCanonicalLocales(input)[0] || targetLanguageTag("en"); } catch { /* Detect below. */ }
  }
  return targetLanguageTag(detectTextLanguage(message));
}
export function extractIntentFallback(text, languages = []) {
  const value = String(text || "").toLowerCase();
  let intent = "other";
  if (/\b(plan|itinerary|day plan|organize my day|today's plan|plan my day|planear|itinéraire|itinerario|日程|行程|योजना)\b/i.test(value)) intent = "plan_day";
  else if (/\b(food|dish|eat|menu|restaurant|recipe|vegan|vegetarian|spicy|foodie|comida|comer|plat|manger|essen|食べ物|料理|भोजन|खाना|طعام)\b/i.test(value)) intent = "find_food";
  else if (/\b(experience|workshop|class|guided|guide|local host|activity|activities|craft|tour|experiencia|atelier|activité|erlebnis|体験|体验|अनुभव|تجربة)\b/i.test(value)) intent = "find_experience";
  else if (/\b(help|support|emergency|lost|language|translate|can you help|ayuda|aide|hilfe|助け|帮助|मदद|مساعدة)\b/i.test(value)) intent = "help";
  else if (/\b(place|places|visit|see|hidden|hidden gem|quiet|crowded|nearby|viewpoint|museum|market|park|find|where|qué ver|visitar|lieu|visiter|ort|besuchen|場所|哪里|जगह|स्थान|مكان)\b/i.test(value)) intent = "find_place";

  const categories = [];
  const matches = [
    ["nature", /\b(nature|park|forest|garden|walk|hike|landscape|naturaleza|jardin|natur|自然|प्रकृति)\b/i],
    ["market", /\b(market|bazaar|flea|shopping|mercado|marché|markt|市場|बाज़ार|سوق)\b/i],
    ["culture", /\b(culture|history|heritage|museum|temple|music|histoire|geschichte|文化|इतिहास|ثقافة)\b/i],
    ["craft", /\b(craft|artisan|pottery|textile|tile|painting|woodcarving|ceramics|artesanía|artisanat|kunsthandwerk|工芸|शिल्प|حرفة)\b/i],
    ["viewpoint", /\b(view|viewpoint|sunset|overlook|miradouro|mirador|belvedere|aussicht|眺め|नज़ारा|إطلالة)\b/i],
    ["cafe", /\b(cafe|café|coffee|tea|coffee shop|coffeehouse|café|咖啡|कैफ़े)\b/i],
    ["wellness", /\b(wellness|yoga|spa|massage|relax|meditate|bienestar|bien-être|wohlbefinden|ウェルネス|आराम|استرخاء)\b/i]
  ];
  for (const [category, pattern] of matches) if (pattern.test(value) && CATEGORIES.has(category)) categories.push(category);
  if (/\b(food|dish|eat|menu|restaurant|comida|plat|manger|essen|料理|भोजन|खाना|طعام)\b/i.test(value)) categories.push("market", "cafe");
  let diet = null;
  if (/\bvegan\b|vegan[oa]s?|veganismo|विगन|ويغان/i.test(value)) diet = "vegan";
  else if (/\bvegetarian\b|\bveg\b|vegetariano|végétarien|vegetarisch|शाकाहारी/i.test(value)) diet = "veg";
  else if (/\bhalal\b|حلال/i.test(value)) diet = "halal";
  else if (/gluten[- ]?(free|aware)|sin gluten|sans gluten|glutenfrei|ग्लूटेन/i.test(value)) diet = "gluten-aware";
  else if (/\bnon[- ]?veg(etarian)?\b|meat eater|carnivor|मांसाहारी/i.test(value)) diet = "non-veg";

  const budgetMatch = value.match(/(?:under|below|less than|max(?:imum)?|budget of|up to|menor de|menos de|moins de|unter|bis zu|以内|के अंदर)\s*(?:₹|€|\$|£|¥|rp\.?\s*)?([\d][\d.,]*)/i);
  let maxBudgetLocal = null;
  if (budgetMatch) {
    const normalized = budgetMatch[1].replace(/,(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
    const amount = Number(normalized);
    if (Number.isFinite(amount) && amount > 0) maxBudgetLocal = Math.min(amount, 1e9);
  }
  let timeOfDay = null;
  if (/\b(morning|breakfast|sunrise|mañana|matin|morgens|朝|सुबह|صباح)\b/i.test(value)) timeOfDay = "morning";
  else if (/\b(afternoon|lunch|noon|tarde|après-midi|nachmittag|午後|दोपहर|بعد الظهر)\b/i.test(value)) timeOfDay = "afternoon";
  else if (/\b(evening|night|sunset|dinner|noche|soir|abend|夜|शाम|مساء)\b/i.test(value)) timeOfDay = "evening";
  const durationMatch = value.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h\b|minutes?|mins?|m\b|horas?|heures?|stunden?|時間|分钟|मिनट|घंटे)/i);
  let durationMin = null;
  if (durationMatch) {
    const token = durationMatch[0].toLowerCase();
    const amount = Number(durationMatch[1]);
    durationMin = /hour|hr|\bh\b|hora|heure|stunde|時間|घंटे/.test(token) ? amount * 60 : amount;
  }
  let mood = null;
  if (/\b(quiet|calm|peaceful|relaxed|slow|tranquil|tranquille|ruhig|静か|शांत|هادئ)\b/i.test(value)) mood = "quiet";
  else if (/\b(adventur|active|packed|energetic|aventura|aventure|abenteuer|冒険|रोमांच)\b/i.test(value)) mood = "adventurous";
  const avoidCrowds = /\b(avoid crowds|less crowded|not crowded|quiet|crowd-free|sin multitudes|peu de monde|menschenmengen vermeiden|混雑を避け|भीड़ से बच|تجنب الازدحام)\b/i.test(value) ? true : null;
  const indoorOnly = /\b(indoors?|indoor only|inside|rainy day|rainy|rain|wet weather|à l'intérieur|drinnen|屋内|अंदर|داخلي)\b/i.test(value) ? true : null;
  return {
    intent,
    filters: { categories: [...new Set(categories)], diet, maxBudgetLocal, timeOfDay, mood, avoidCrowds, indoorOnly, durationMin },
    language: targetLanguageTag(detectTextLanguage(text) || languageBase(languages[0] || "en"))
  };
}
function normalizeIntent(parsed, text, languages = []) {
  const fallback = extractIntentFallback(text, languages);
  const input = parsed && typeof parsed === "object" ? parsed : {};
  const filters = input.filters && typeof input.filters === "object" ? input.filters : {};
  const language = languageTag(input.language, text);
  const filterDiet = filters.diet === null
    ? fallback.filters.diet
    : DIETS.has(filters.diet) ? filters.diet : fallback.filters.diet;
  const modelCategories = Array.isArray(filters.categories)
    ? [...new Set(filters.categories.filter((value) => typeof value === "string" && CATEGORIES.has(value)))].slice(0, CATEGORIES.size)
    : [];
  return {
    intent: INTENTS.has(input.intent) ? input.intent : fallback.intent,
    filters: {
      categories: modelCategories.length ? modelCategories : fallback.filters.categories,
      diet: filterDiet,
      maxBudgetLocal: nullableNumber(filters.maxBudgetLocal) ?? fallback.filters.maxBudgetLocal,
      timeOfDay: TIMES.has(filters.timeOfDay) ? filters.timeOfDay : fallback.filters.timeOfDay,
      mood: nullableText(filters.mood, 60) ?? fallback.filters.mood,
      avoidCrowds: typeof filters.avoidCrowds === "boolean" ? filters.avoidCrowds : fallback.filters.avoidCrowds,
      indoorOnly: typeof filters.indoorOnly === "boolean" ? filters.indoorOnly : fallback.filters.indoorOnly,
      durationMin: nullableNumber(filters.durationMin, 1440) ?? fallback.filters.durationMin
    },
    language: language || fallback.language
  };
}
function intentSchema() {
  return {
    type: "OBJECT",
    properties: {
      intent: { type: "STRING", enum: [...INTENTS] },
      filters: {
        type: "OBJECT",
        properties: {
          categories: { type: "ARRAY", items: { type: "STRING", enum: [...CATEGORIES] } },
          diet: { type: "STRING", nullable: true },
          maxBudgetLocal: { type: "NUMBER", nullable: true },
          timeOfDay: { type: "STRING", enum: [...TIMES], nullable: true },
          mood: { type: "STRING", nullable: true },
          avoidCrowds: { type: "BOOLEAN", nullable: true },
          indoorOnly: { type: "BOOLEAN", nullable: true },
          durationMin: { type: "NUMBER", nullable: true }
        },
        required: ["categories", "diet", "maxBudgetLocal", "timeOfDay", "mood", "avoidCrowds", "indoorOnly", "durationMin"]
      },
      language: { type: "STRING" }
    },
    required: ["intent", "filters", "language"]
  };
}
export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST to interpret a travel request." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const text = cleanText(body.text, 1200);
  const languages = Array.isArray(body.languages) ? body.languages.filter((item) => typeof item === "string").slice(0, 3).map((item) => cleanText(item, 24)) : [];
  if (!text) return send(res, 200, extractIntentFallback("", languages));
  const fallback = extractIntentFallback(text, languages);
  if (!process.env.GEMINI_API_KEY) return send(res, 200, fallback);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const prompt = [
      "You are a travel-message intent parser. Extract meaning only; do not recommend or rank anything.",
      "Return only one JSON object with exactly intent, filters and language. Preserve unknown filter values as null; return categories from the permitted list only. Never invent facts or items.",
      "Detect the language used in the traveler's text as a BCP-47 language tag, even when it is not in the traveler's stated preferred language list.",
      JSON.stringify({
        text, city: cleanText(body.city, 100), country: cleanText(body.country, 100),
        currency: cleanText(body.currency, 12), languages,
        allowedCategories: [...CATEGORIES], allowedDiets: [...DIETS], allowedTimes: [...TIMES]
      })
    ].join("\n");
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(process.env.GEMINI_API_KEY),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: intentSchema(),
            temperature: 0,
            maxOutputTokens: 600
          }
        })
      }
    );
    if (!response.ok) throw new Error("Intent service unavailable");
    const payload = await response.json();
    const modelText = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const parsed = parseJson(modelText || "");
    return send(res, 200, normalizeIntent(parsed, text, languages));
  } catch {
    return send(res, 200, fallback);
  } finally {
    clearTimeout(timeout);
  }
}
