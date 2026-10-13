import { getDestinationById } from "../src/data/destinations/index.js";
import { detectTextLanguage, languageBase, targetLanguageTag } from "../src/i18n.js";
import { isBodyTooLarge, isPlainObject } from "../src/lib/apiHardening.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-3.8-flash";
// Tried in order when the configured model is overloaded, missing or slow. Lite answers fastest.
const FALLBACK_MODELS = ["gemini-3.1-flash-lite", "gemini-3-flash-preview"];
const CHAT_MODELS = [GEMINI_MODEL, ...FALLBACK_MODELS.filter((model) => model !== GEMINI_MODEL)];
const TOTAL_BUDGET_MS = 14000;
const FIRST_ATTEMPT_MS = 6000;
const RETRYABLE_STATUS = new Set([404, 408, 429, 500, 502, 503, 504]);
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
  const hasRankedItems = rankedItems.length > 0;
  const fallback = fallbackReply(language, hasRankedItems);
  if (!process.env.GEMINI_API_KEY) return send(res, 200, { reply: fallback, source: "local-fallback", reason: "missing_api_key", language });

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let timedOut = false;
  try {
    const prompt = [
      "You are Atithi AI, a personalized travel companion for hidden places, local stories and experiences that make a destination feel personal.",
      hasRankedItems
        ? "Your task is only to phrase a helpful response using the provided rankedItems. The deterministic ranking engine already selected and ordered these items. Do not add, invent, suggest or mention any place, dish, experience, host or named venue that is not present in rankedItems."
        : "The deterministic ranker returned no suggested items. You may still answer greetings, small talk, and questions about what Atithi AI can help with. For a recommendation request, do not invent or name places, dishes, or experiences; explain that no matching items were selected and ask how to refine the request.",
      "Never invent or claim current prices, opening hours, availability, travel times, bookings, partner relationships or live crowd conditions. Costs and stories are illustrative demo content. Weather supplied as context is the only live destination feed.",
      hasRankedItems
        ? "Reply in language " + language + " (BCP-47). Keep the full reply under 70 words. Be warm, concise and transparent that these are suggestions. If no listed item answers the question, say the pack has no verified answer and recommend checking locally."
        : "Reply in language " + language + " (BCP-47), under 70 words. Respond naturally to greetings and small talk. Explain Atithi AI can help with travel preferences, itinerary planning, food and experiences. If the message asks for destination recommendations but there are no ranked items, say no matching pack items were selected and ask one clarifying question. Never invent specific recommendations.",
      "Do not repeat the full item list if a concise introduction is enough. Do not output JSON or a numbered itinerary; the client renders ranked cards separately.",
      JSON.stringify({
        intent: cleanText(body.intent, 40),
        generalConversation: !hasRankedItems,
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
    const callModel = async (model, timeLimitMs) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), Math.max(1000, timeLimitMs));
      try {
        return await fetch(
          "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": process.env.GEMINI_API_KEY },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              // Thinking tokens count against this limit, so leave room beyond the 70-word reply.
              generationConfig: { maxOutputTokens: 1024, thinkingConfig: { thinkingLevel: "LOW" } }
            })
          }
        );
      } catch (error) {
        if (controller.signal.aborted) return { aborted: true };
        throw error;
      } finally {
        clearTimeout(timer);
      }
    };
    let response = null;
    let model = GEMINI_MODEL;
    let lastStatus = 0;
    for (let index = 0; index < CHAT_MODELS.length; index += 1) {
      const remaining = deadline - Date.now();
      if (remaining < 1500) break;
      model = CHAT_MODELS[index];
      const isLast = index === CHAT_MODELS.length - 1;
      const result = await callModel(model, index === 0 && !isLast ? Math.min(FIRST_ATTEMPT_MS, remaining) : remaining);
      if (result.aborted) { timedOut = true; console.error("[api/chat] Gemini model timed out, trying next:", model); continue; }
      if (result.ok) { response = result; timedOut = false; break; }
      lastStatus = result.status;
      // Log only the provider status, never the request URL or API key.
      console.error("[api/chat] Gemini provider returned HTTP", lastStatus, "model", model);
      if (!RETRYABLE_STATUS.has(lastStatus)) break;
    }
    if (!response) {
      if (!lastStatus || timedOut) throw new Error(timedOut ? "timeout" : "No model attempt completed");
      const status = lastStatus;
      const reason = status === 400 ? "provider_http_400"
        : status === 401 ? "provider_http_401"
        : status === 403 ? "provider_http_403"
        : status === 404 ? "provider_http_404"
        : status === 429 ? "provider_http_429"
        : status >= 500 ? "provider_http_5xx"
        : "provider_http_" + status;
      return send(res, 200, { reply: fallback, source: "local-fallback", reason, language });
    }
    const payload = await response.json();
    const raw = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const reply = cleanText(raw, 1400);
    if (!reply || wordCount(reply) > 70 || mentionsUnrankedKnownItem(reply, rankedItems, destination)) throw new Error("Reply was incomplete, too long or mentioned an unranked pack item");
    return send(res, 200, { reply, source: "gemini", model, language });
  } catch (error) {
    const reason = error?.message === "timeout" ? "timeout"
      : String(error?.message || "").startsWith("Reply was incomplete") ? "response_rejected"
      : "provider_error";
    // Keep logs useful while excluding the secret, prompt, and traveler message.
    console.error("[api/chat] Gemini fallback reason:", reason);
    return send(res, 200, { reply: fallback, source: "local-fallback", reason, language });
  }
}
