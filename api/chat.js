import { getDestinationById } from "../src/data/destinations/index.js";
import { detectTextLanguage, languageBase, targetLanguageTag } from "../src/i18n.js";
import { isBodyTooLarge, isPlainObject } from "./_shared.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-2.5-flash";
const ITEM_TYPES = new Set(["place", "experience", "dish"]);
function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function cleanText(value, max = 400) {
  return typeof value === "string" ? value.trim().replace(/\u0000/g, "").slice(0, max) : "";
}
function safeLanguage(value, message) {
  const candidate = cleanText(value, 45).replace(/_/g, "-");
  if (candidate && candidate.toLowerCase() !== "auto") {
    try { return Intl.getCanonicalLocales(candidate)[0] || targetLanguageTag("en"); } catch { /* Detect from the actual message. */ }
  }
  return targetLanguageTag(detectTextLanguage(message));
}
function canonicalItems(value, destination) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const ref of value.slice(0, 5)) {
    if (!ref || !ITEM_TYPES.has(ref.itemType) || typeof ref.id !== "string") continue;
    const collection = ref.itemType === "place" ? destination.places : ref.itemType === "experience" ? destination.experiences : destination.dishes;
    const source = collection.find((item) => item.id === ref.id);
    if (!source) continue;
    const uniqueKey = ref.itemType + ":" + ref.id;
    if (seen.has(uniqueKey)) continue;
    seen.add(uniqueKey);
    const title = ref.itemType === "experience" ? source.title : source.name;
    result.push({
      id: source.id,
      itemType: ref.itemType,
      title,
      category: source.category || (ref.itemType === "dish" ? "food" : ref.itemType),
      story: source.localStory || source.description || "",
      ...(ref.itemType === "place" ? { avgSpendLocal: Number(source.avgSpendLocal) || 0, durationMin: source.durationMin, bestTime: source.bestTime } : {}),
      ...(ref.itemType === "experience" ? { hostName: source.hostName, priceLocal: source.priceLocal, durationMin: source.durationMin } : {}),
      ...(ref.itemType === "dish" ? { priceRangeLocal: source.priceRangeLocal, diet: source.diet, spiceLevel: source.spiceLevel } : {}),
      score: Number.isFinite(Number(ref.score)) ? Number(ref.score) : 0,
      reasons: Array.isArray(ref.reasons) ? ref.reasons.filter((reason) => typeof reason === "string").slice(0, 6).map((reason) => cleanText(reason, 120)).filter(Boolean) : []
    });
  }
  return result;
}
const FALLBACKS = {
  en: "I interpreted your request using your travel preferences. These are the closest matches from the selected destination pack; stories and spending estimates are demo content, so verify details locally.",
  hi: "मैंने आपकी यात्रा की पसंद के अनुसार अनुरोध समझा है। ये चुने हुए डेस्टिनेशन पैक से मिलते-जुलते सुझाव हैं; कहानियाँ और खर्च के अनुमान डेमो हैं, इसलिए स्थानीय रूप से पुष्टि करें।",
  es: "He interpretado tu petición según tus preferencias de viaje. Estas son las opciones más cercanas del destino seleccionado; las historias y los gastos son demostrativos, así que verifica los detalles localmente.",
  fr: "J’ai interprété votre demande selon vos préférences de voyage. Voici les options les plus proches de la sélection choisie ; les histoires et dépenses sont des exemples, à vérifier sur place.",
  de: "Ich habe deine Anfrage anhand deiner Reisevorlieben interpretiert. Dies sind passende Optionen aus der ausgewählten Destination; Geschichten und Kosten sind Demo-Inhalte und sollten vor Ort geprüft werden.",
  ja: "旅行の好みに基づいてリクエストを解釈しました。選択した目的地パックから近い候補を示します。物語や費用はデモ情報のため、現地で確認してください。",
  ar: "فسّرت طلبك وفق تفضيلات سفرك. هذه أقرب الخيارات من حزمة الوجهة المحددة؛ القصص والتكاليف أمثلة تجريبية، لذا تحقق من التفاصيل محليًا.",
  zh: "我已根据你的旅行偏好理解了请求。以下是所选目的地包中较匹配的选项；故事和花费为演示内容，请在当地确认详情。",
  pt: "Interpretei seu pedido com base nas preferências de viagem. Estas são as opções mais próximas do destino selecionado; histórias e gastos são conteúdo de demonstração, então confirme os detalhes localmente.",
  id: "Saya menafsirkan permintaan berdasarkan preferensi perjalanan Anda. Berikut pilihan yang paling sesuai dari paket destinasi ini; cerita dan biaya adalah konten demo, jadi verifikasi detail secara lokal."
};
const NO_RESULTS = {
  en: "I couldn't find a suitable option in this destination pack with those constraints. Try relaxing one filter and verify details locally.",
  hi: "इन शर्तों के अनुसार इस डेस्टिनेशन पैक में उपयुक्त विकल्प नहीं मिला। कोई फ़िल्टर बदलकर स्थानीय रूप से पुष्टि करें।",
  es: "No encontré una opción adecuada con esos criterios. Prueba a flexibilizar un filtro y verifica los detalles localmente.",
  fr: "Aucune option adaptée n’a été trouvée avec ces critères. Essayez d’assouplir un filtre et vérifiez sur place.",
  de: "Mit diesen Bedingungen wurde keine passende Option gefunden. Lockere einen Filter und prüfe die Details vor Ort.",
  ja: "指定した条件に合う候補がありません。条件を一つ緩めて、詳細を現地で確認してください。",
  ar: "لم أجد خيارًا مناسبًا بهذه الشروط. خفف أحد المرشحات وتحقق من التفاصيل محليًا.",
  zh: "没有找到符合这些条件的选项。请放宽一个筛选条件，并在当地确认详情。",
  pt: "Não encontrei uma opção adequada com esses critérios. Tente flexibilizar um filtro e confirme os detalhes localmente.",
  id: "Tidak ada pilihan yang sesuai dengan kriteria tersebut. Coba longgarkan satu filter dan verifikasi detail secara lokal."
};
function mentionsUnrankedKnownItem(reply, rankedItems, destination) {
  const allowed = new Set(rankedItems.map((item) => cleanText(item.title, 160).toLowerCase()));
  const known = [
    ...destination.places.map((item) => item.name),
    ...destination.experiences.map((item) => item.title),
    ...destination.dishes.map((item) => item.name)
  ];
  const normalizedReply = String(reply || "").toLocaleLowerCase();
  return known.some((name) => {
    const normalizedName = cleanText(name, 160).toLocaleLowerCase();
    return normalizedName.length > 2 && normalizedReply.includes(normalizedName) && !allowed.has(normalizedName);
  });
}
function wordCount(value) { return String(value || "").trim().split(/\s+/).filter(Boolean).length; }
function fallbackReply(language, hasItems = true) {
  const base = languageBase(language);
  if (!hasItems) return NO_RESULTS[base] || NO_RESULTS.en;
  return FALLBACKS[base] || FALLBACKS.en;
}
export default async function handler(req, res) {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return send(res, 405, { error: "Use POST to send a travel question." }); }
  if (isBodyTooLarge(req, req.body, 24 * 1024)) return send(res, 413, { error: "Request is too large. Shorten your travel question and try again." });
  const body = isPlainObject(req.body) ? req.body : {};
  const message = cleanText(body.message, 1200);
  const destination = getDestinationById(cleanText(body.destinationId, 50));
  if (!message) return send(res, 200, { reply: fallbackReply("en"), source: "local-fallback" });
  const language = safeLanguage(body.replyLanguage, message);
  const rankedItems = canonicalItems(body.rankedItems, destination);
  const fallback = fallbackReply(language, rankedItems.length > 0);
  if (!rankedItems.length) return send(res, 200, { reply: fallbackReply(language, false), source: "local-fallback", language });
  if (!process.env.GEMINI_API_KEY) return send(res, 200, { reply: fallback, source: "local-fallback", language });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const prompt = [
      "You are Atithi AI, a personalized travel companion for hidden places, local stories and experiences that make a destination feel personal.",
      "Your task is only to phrase a helpful response using the provided rankedItems. The deterministic ranking engine already selected and ordered these items. Do not add, invent, suggest or mention any place, dish, experience, host or named venue that is not present in rankedItems.",
      "Never invent or claim current prices, opening hours, availability, travel times, bookings, partner relationships or live crowd conditions. Costs and stories are illustrative demo content. Weather supplied as context is the only live destination feed.",
      "Reply in language " + language + " (BCP-47). Keep the full reply under 70 words. Be warm, concise and transparent that these are suggestions. If no listed item answers the question, say the pack has no verified answer and recommend checking locally.",
      "Do not repeat the full item list if a concise introduction is enough. Do not output JSON or a numbered itinerary; the client renders ranked cards separately.",
      JSON.stringify({
        travelerMessage: message,
        travelerPreferences: isPlainObject(body.profile) ? {
          interests: Array.isArray(body.profile.interests) ? body.profile.interests.filter((item) => typeof item === "string").slice(0, 7).map((item) => cleanText(item, 30)) : [],
          diet: cleanText(body.profile.diet, 30),
          pace: cleanText(body.profile.pace, 20),
          travelParty: cleanText(body.profile.travelParty, 20),
          avoidCrowds: body.profile.avoidCrowds === true,
          languages: Array.isArray(body.profile.languages) ? body.profile.languages.filter((item) => typeof item === "string").slice(0, 3).map((item) => cleanText(item, 12)) : [],
          dailyBudget: isPlainObject(body.profile.dailyBudget) ? {
            level: cleanText(body.profile.dailyBudget.level, 12),
            amount: Number.isFinite(Number(body.profile.dailyBudget.amount)) ? Math.max(0, Math.min(1e12, Number(body.profile.dailyBudget.amount))) : null,
            currencyCode: /^[A-Z]{3}$/.test(cleanText(body.profile.dailyBudget.currencyCode, 3).toUpperCase()) ? cleanText(body.profile.dailyBudget.currencyCode, 3).toUpperCase() : null
          } : null
        } : {},
        destination: {
          city: destination.city,
          country: destination.country,
          currency: destination.currency.code,
          languages: destination.primaryLanguages
        },
        liveWeather: body.weather && body.weather.source === "live" ? {
          condition: cleanText(body.weather.condition, 50),
          kind: cleanText(body.weather.kind, 30)
        } : null,
        rankedItems
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
          generationConfig: { temperature: 0.25, maxOutputTokens: 320 }
        })
      }
    );
    if (!response.ok) throw new Error("Chat service unavailable");
    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const reply = cleanText(raw, 1400);
    if (!reply || wordCount(reply) > 70 || mentionsUnrankedKnownItem(reply, rankedItems, destination)) throw new Error("Reply was incomplete, too long or mentioned an unranked pack item");
    return send(res, 200, { reply, source: "gemini", language });
  } catch {
    return send(res, 200, { reply: fallback, source: "local-fallback", language });
  } finally {
    clearTimeout(timeout);
  }
}
