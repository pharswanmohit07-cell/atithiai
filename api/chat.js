import { getDestinationById } from "../src/data/destinations/index.js";
import { detectChatIntent } from "../src/lib/chatIntents.js";
import { localDisruptionAdvisory } from "../src/lib/disruptions.js";
import { detectTextLanguage, languageBase, targetLanguageTag } from "../src/i18n.js";

const GEMINI_MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "") ? process.env.GEMINI_MODEL : "gemini-2.5-flash";

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function cleanText(value, max = 300) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function resolveReplyLanguage(body, message) {
  const requested = cleanText(body.replyLanguage, 40);
  if (requested && requested.toLowerCase() !== "auto") return targetLanguageTag(languageBase(requested));
  return targetLanguageTag(detectTextLanguage(message));
}
const CHAT_COPY = {
  en: { flex: "I can check a demo Flex Stay option. Review the computed offer below; the hotel must confirm it.", human: "Use Talk to a human to create a hotel handoff. This demo cannot guarantee a live reply.", price: "I can send this question to the hotel team. A staff member must confirm fees, bookings and availability; nothing is charged or booked.", emergency: "This app cannot dispatch emergency services. If there is immediate danger, call the local emergency number.", foodLead: "From the selected destination list, consider: ", foodEmpty: "I don't have a matching dish in the selected destination list. ", foodEnd: "Confirm ingredients and allergens with the restaurant; no dish is represented as allergen-free.", experienceLead: "From the curated destination list: ", experienceEmpty: "I don't have a matching curated experience for this destination. ", experienceEnd: "These are demo listings; staff must confirm the provider, schedule, availability and price.", weather: "The latest available Open-Meteo observation for ", weatherEnd: " does not confirm venue opening, transport conditions or safety.", general: "I can help with the stay, destination ideas, food discovery or a request to the hotel team. Money, booking and availability decisions need human confirmation." },
  hi: { flex: "मैं डेमो Flex Stay विकल्प जाँच सकता हूँ। नीचे दिए गए हिसाब को देखें; होटल को इसकी पुष्टि करनी होगी।", human: "होटल टीम से संपर्क का अनुरोध करने के लिए “कर्मचारी से बात करें” चुनें। लाइव जवाब की गारंटी नहीं है।", price: "मैं यह सवाल होटल टीम को भेज सकता हूँ। शुल्क, बुकिंग और उपलब्धता की पुष्टि स्टाफ़ करेगा; कोई भुगतान या बुकिंग नहीं हुई है।", emergency: "यह ऐप आपातकालीन सेवाएँ नहीं भेज सकता। तत्काल खतरे में स्थानीय आपातकालीन नंबर पर कॉल करें।", foodLead: "चुनी हुई जगहों की सूची से ये व्यंजन देख सकते हैं: ", foodEmpty: "चुनी हुई सूची में इस सवाल से मेल खाता व्यंजन नहीं मिला। ", foodEnd: "रेस्तराँ से सामग्री और एलर्जेन की पुष्टि करें; किसी व्यंजन को एलर्जेन-मुक्त नहीं बताया जा रहा है।", experienceLead: "चुनी हुई जगहों की सूची से: ", experienceEmpty: "इस जगह के लिए कोई मेल खाता अनुभव नहीं मिला। ", experienceEnd: "ये डेमो लिस्टिंग हैं; होटल टीम प्रदाता, समय, उपलब्धता और कीमत की पुष्टि करे।", weather: "Open-Meteo का नवीनतम उपलब्ध मौसम अवलोकन ", weatherEnd: " स्थान खुला है, परिवहन उपलब्ध है या यात्रा सुरक्षित है—इसकी पुष्टि नहीं करता।", general: "मैं आपके ठहरने, स्थानीय सुझावों, भोजन या होटल टीम को अनुरोध भेजने में मदद कर सकता हूँ। भुगतान, बुकिंग और उपलब्धता की पुष्टि स्टाफ़ करेगा।" },
  es: { flex: "Puedo revisar una opción Flex Stay de demostración. Revisa el cálculo; el hotel debe confirmarlo.", human: "Usa “Hablar con una persona” para enviar una solicitud al hotel. Esta demo no garantiza una respuesta inmediata.", price: "Puedo enviar esta consulta al hotel. El personal debe confirmar tarifas, reservas y disponibilidad; no se ha cobrado ni reservado nada.", emergency: "Esta aplicación no puede enviar servicios de emergencia. Si hay peligro inmediato, llama al número local de emergencias.", foodLead: "De la lista del destino seleccionado, puedes considerar: ", foodEmpty: "No hay un plato coincidente en la lista seleccionada. ", foodEnd: "Confirma los ingredientes y alérgenos con el restaurante; ningún plato se considera libre de alérgenos.", experienceLead: "De la lista seleccionada de experiencias: ", experienceEmpty: "No hay una experiencia coincidente en la lista seleccionada. ", experienceEnd: "Son propuestas de demostración; el personal debe confirmar proveedor, horario, disponibilidad y precio.", weather: "La observación más reciente disponible de Open-Meteo para ", weatherEnd: " no confirma horarios, transporte ni seguridad del viaje.", general: "Puedo ayudarte con la estancia, ideas para visitar, comida o una solicitud al hotel. El personal debe confirmar pagos, reservas y disponibilidad." },
  fr: { flex: "Je peux vérifier une option Flex Stay de démonstration. Consultez le calcul ; l’hôtel doit le confirmer.", human: "Utilisez « Parler à une personne » pour transmettre une demande à l’hôtel. Cette démo ne garantit pas de réponse immédiate.", price: "Je peux transmettre la question à l’hôtel. Le personnel doit confirmer les frais, réservations et disponibilités ; rien n’a été réservé ni facturé.", emergency: "Cette application ne peut pas dépêcher les services d’urgence. En cas de danger immédiat, appelez le numéro d’urgence local.", foodLead: "Dans la liste de la destination, vous pouvez envisager : ", foodEmpty: "Aucun plat correspondant n’apparaît dans la liste sélectionnée. ", foodEnd: "Confirmez les ingrédients et allergènes auprès du restaurant ; aucun plat n’est garanti sans allergènes.", experienceLead: "Dans la liste d’expériences sélectionnées : ", experienceEmpty: "Aucune expérience correspondante n’apparaît dans la liste sélectionnée. ", experienceEnd: "Ce sont des propositions de démonstration ; le personnel doit confirmer le prestataire, l’horaire, la disponibilité et le prix.", weather: "La dernière observation Open-Meteo disponible pour ", weatherEnd: " ne confirme ni les ouvertures, ni les transports, ni la sécurité du trajet.", general: "Je peux vous aider pour le séjour, les idées de visite, les plats ou une demande à l’hôtel. Le personnel doit confirmer paiements, réservations et disponibilités." },
  de: { flex: "Ich kann eine Demo-Flex-Stay-Option prüfen. Bitte prüfe das angezeigte Angebot; das Hotel muss es bestätigen.", human: "Nutze „Mit einem Menschen sprechen“, um das Hotelteam anzufragen. Eine sofortige Antwort ist nicht garantiert.", price: "Ich leite die Frage an das Hotelteam weiter. Gebühren, Buchungen und Verfügbarkeit müssen bestätigt werden; es wurde nichts gebucht oder berechnet.", emergency: "Diese App kann keine Rettungsdienste alarmieren. Bei unmittelbarer Gefahr rufe die örtliche Notrufnummer an.", foodLead: "Aus der ausgewählten Zielliste kommen infrage: ", foodEmpty: "In der ausgewählten Liste wurde kein passendes Gericht gefunden. ", foodEnd: "Bitte Zutaten und Allergene im Restaurant bestätigen lassen.", experienceLead: "Aus der kuratierten Zielliste: ", experienceEmpty: "In der ausgewählten Liste wurde kein passendes Erlebnis gefunden. ", experienceEnd: "Dies sind Demo-Einträge; das Hotel muss Anbieter, Zeit, Verfügbarkeit und Preis bestätigen.", weather: "Die letzte verfügbare Open-Meteo-Beobachtung für ", weatherEnd: " bestätigt weder Öffnungszeiten noch Transport oder Reisesicherheit.", general: "Ich helfe bei Fragen zum Aufenthalt, Ausflugsideen, Essen oder einer Anfrage an das Hotel. Personal muss Zahlungen, Buchungen und Verfügbarkeit bestätigen." },
  ja: { flex: "デモのFlex Stayオプションを確認できます。表示された内容を確認し、ホテルに最終確認してください。", human: "ホテルスタッフへの依頼には「スタッフに相談」を使ってください。返信は保証されません。", price: "ホテルスタッフに質問を送れます。料金・予約・空き状況はスタッフの確認が必要です。予約や請求は行われていません。", emergency: "このアプリは緊急サービスを呼び出せません。差し迫った危険がある場合は現地の緊急番号に電話してください。", foodLead: "選択した目的地リストからの候補: ", foodEmpty: "選択したリストに該当する料理はありません。", foodEnd: "食材とアレルゲンはレストランに確認してください。", experienceLead: "選択した体験リストから: ", experienceEmpty: "該当する体験は選択リストにありません。", experienceEnd: "これはデモ情報です。提供者、時間、空き状況、料金はホテルに確認してください。", weather: "Open-Meteoの最新観測（", weatherEnd: "）は、施設の営業、交通状況、安全性を保証しません。", general: "滞在、観光の案、料理、ホテルへの依頼をお手伝いします。支払い・予約・空き状況はスタッフの確認が必要です。" },
  ar: { flex: "يمكنني مراجعة خيار Flex Stay تجريبي. راجع العرض المعروض؛ يجب أن يؤكده الفندق.", human: "استخدم «التحدث إلى موظف» لإرسال طلب للفندق. لا يمكن ضمان رد فوري.", price: "يمكنني إرسال السؤال إلى الفندق. يجب أن يؤكد الموظفون الرسوم والحجوزات والتوافر؛ لم يتم الحجز أو الدفع.", emergency: "لا يستطيع هذا التطبيق إرسال خدمات الطوارئ. عند وجود خطر فوري، اتصل برقم الطوارئ المحلي.", foodLead: "من قائمة الوجهة المحددة، يمكن التفكير في: ", foodEmpty: "لا يوجد طبق مناسب في القائمة المحددة. ", foodEnd: "يرجى تأكيد المكونات ومسببات الحساسية مع المطعم.", experienceLead: "من قائمة التجارب المختارة: ", experienceEmpty: "لا توجد تجربة مناسبة في القائمة المختارة. ", experienceEnd: "هذه اقتراحات تجريبية؛ يجب على الفندق تأكيد المزوّد والموعد والتوافر والسعر.", weather: "ملاحظة Open-Meteo الأخيرة المتاحة لـ ", weatherEnd: " لا تؤكد مواعيد الفتح أو النقل أو سلامة التنقل.", general: "يمكنني المساعدة في الإقامة أو أفكار الزيارة أو الطعام أو إرسال طلب للفندق. يجب أن يؤكد الموظفون المدفوعات والحجوزات والتوافر." },
  zh: { flex: "我可以查看演示版 Flex Stay 选项。请查看计算结果，最终需要酒店确认。", human: "使用“联系人工”向酒店团队提交请求。本演示无法保证即时回复。", price: "我可以把问题发送给酒店团队。费用、预订和可用性必须由员工确认；目前没有预订或收费。", emergency: "此应用无法调度紧急服务。如有紧急危险，请拨打当地紧急电话号码。", foodLead: "可考虑所选目的地列表中的菜品：", foodEmpty: "所选列表中没有匹配的菜品。", foodEnd: "请向餐厅确认食材和过敏原。", experienceLead: "所选体验列表中的项目：", experienceEmpty: "所选列表中没有匹配的体验。", experienceEnd: "这些是演示项目；请由酒店确认供应方、时间、可用性和价格。", weather: "Open-Meteo 对 ", weatherEnd: " 的最新观测不代表场馆开放、交通状况或出行安全。", general: "我可以帮助处理住宿问题、游览建议、食物信息或向酒店提交请求。费用、预订和可用性需要员工确认。" }
};
function fallbackReply(message, destination, rankedExperiences = [], rankedDishes = [], replyLanguage = "en") {
  const text = String(message || "").toLowerCase();
  const base = languageBase(replyLanguage);
  const copy = CHAT_COPY[base] || CHAT_COPY.en;
  const intent = detectChatIntent(message, destination.hotel);
  if (intent.type === "flex_stay_request") return copy.flex;
  if (intent.type === "human_help") return copy.human;
  if (/(emergency|urgent help|ambulance|police|fire|emergencia|urgence|notfall|緊急|طوارئ|紧急|आपातकाल)/i.test(text)) return copy.emergency + " " + destination.emergencyNumber + ".";
  if (/(price|cost|fee|charge|refund|pay|payment|booking|book|available|availability|precio|coste|tarif|prix|kosten|preis|値段|料金|价格|费用|سعر|कीमत)/i.test(text)) return copy.price;
  if (intent.type === "food_question" || /(food|dish|eat|restaurant|menu|diet|vegetarian|vegan|allerg|comida|comer|plat|manger|essen|gericht|料理|食べ|食物|餐厅|طعام|भोजन|खाना)/i.test(text)) {
    const names = rankedDishes.slice(0, 3).map((dish) => dish.name);
    return (names.length ? copy.foodLead + names.join(", ") + ". " : copy.foodEmpty) + copy.foodEnd;
  }
  if (/(experience|activity|tour|guide|partner|things to do|visit|explore|actividad|visitar|visite|activité|besuchen|ausflug|観光|体験|景点|旅游|زيارة|घूमने)/i.test(text)) {
    const names = rankedExperiences.slice(0, 3).map((experience) => experience.name);
    return (names.length ? copy.experienceLead + names.join(", ") + ". " : copy.experienceEmpty) + copy.experienceEnd;
  }
  if (/(weather|rain|wind|temperature|forecast|tiempo|météo|wetter|天気|天气|طقس|मौसम)/i.test(text)) return copy.weather + destination.city + copy.weatherEnd;
  return copy.general;
}
function normalizeAction(action, hotel) {
  if (action?.type !== "flex_stay_request" || !["early", "late"].includes(action.kind)) return null;
  const valid = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(action.time || "");
  const tiers = hotel.flexTiers[action.kind] || [];
  const defaultTime = action.kind === "early" ? (tiers[tiers.length - 1]?.from || "12:00") : (tiers[0]?.until || "13:00");
  return { type: "flex_stay_request", kind: action.kind, time: valid ? action.time : defaultTime };
}
function safePreferences(value) {
  const input = value && typeof value === "object" ? value : {};
  return { language: cleanText(input.language, 40) || "English", dietaryPreference: cleanText(input.dietaryPreference, 80) || "No preference", travelParty: cleanText(input.travelParty, 40) || "unspecified" };
}

async function handleDisruptionAdvisory(body, destination, res) {
  const weatherTypes = new Set(["rain", "storm", "heat"]);
  const demoTypes = new Set(["strike", "closure", "flight_delay"]);
  const incoming = body.disruption && typeof body.disruption === "object" ? body.disruption : {};
  const type = [...weatherTypes, ...demoTypes].includes(incoming.type) ? incoming.type : null;
  if (!type) return send(res, 200, { reply: localDisruptionAdvisory({ city: destination.city, language: cleanText(body.language, 50) || "English", alternatives: [] }), source: "local-fallback" });
  const source = incoming.source === "live" && weatherTypes.has(type) ? "live" : "demo";
  const validPlaces = new Set((destination.places || []).map((place) => place.id));
  const affectedPlaceIds = Array.isArray(incoming.affectedPlaceIds) ? Array.from(new Set(incoming.affectedPlaceIds.filter((id) => typeof id === "string" && validPlaces.has(id)))).slice(0, 30) : [];
  const alternatives = (Array.isArray(body.alternativePlaceIds) ? body.alternativePlaceIds : [])
    .filter((id) => typeof id === "string" && validPlaces.has(id))
    .slice(0, 2)
    .map((id) => destination.places.find((place) => place.id === id))
    .filter(Boolean)
    .map(({ id, name, category, rainFriendly, lowCrowd }) => ({ id, name, category, rainFriendly, lowCrowd }));
  const titleByType = {
    rain: "Rain may affect outdoor plans",
    storm: "Weather may affect outdoor plans",
    heat: "Heat may affect outdoor plans",
    strike: "Transport interruption (demo)",
    closure: "Attraction closure (demo)",
    flight_delay: "Flight delay (demo)",
  };
  const disruption = {
    type,
    title: titleByType[type],
    severity: ["low", "medium", "high", "critical"].includes(incoming.severity) ? incoming.severity : "medium",
    source,
    affectedPlaceIds,
    detectedAt: typeof incoming.detectedAt === "string" ? incoming.detectedAt.slice(0, 40) : "",
  };
  const language = cleanText(body.language, 50) || "English";
  const fallback = localDisruptionAdvisory({ disruption, alternatives, city: destination.city, language });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 200, { reply: fallback, source: "local-fallback" });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2600);
  try {
    const prompt = [
      "Write one calm, practical guest advisory in at most 50 words and in the requested language.",
      "Use only the structured disruption and destination-pack alternatives in the JSON. Mention only alternative names present in that list; do not invent venues, prices, partners, routes, schedules or booking status.",
      "Never claim access to live road, transport, flight, or venue-opening data. The only live feed in this application is the destination's Open-Meteo weather observation; strike, closure and flight-delay events are explicitly demo events.",
      "Do not suggest that a driver, airline, venue or hotel has been contacted. Do not promise safety or availability.",
      JSON.stringify({ language, city: destination.city, disruption, alternatives }),
    ].join("\n");
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 120 } }),
      },
    );
    if (!response.ok) throw new Error("Advisory service unavailable");
    const payload = await response.json();
    const text = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const reply = cleanText(text, 1600).split(/\s+/).slice(0, 50).join(" ");
    return send(res, 200, { reply: reply || fallback, source: reply ? "gemini" : "local-fallback" });
  } catch {
    return send(res, 200, { reply: fallback, source: "local-fallback" });
  } finally {
    clearTimeout(timeout);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST to send a chat message." });
  const body = req.body && typeof req.body === "object" ? req.body : {};
  const message = cleanText(body.message, 1200);
  if (!message && body.mode !== "disruption_advisory") return send(res, 400, { error: "Please enter a message." });

  const destination = getDestinationById(cleanText(body.destinationId, 50));
  if (body.mode === "disruption_advisory") return handleDisruptionAdvisory(body, destination, res);
  const replyLanguage = resolveReplyLanguage(body, message);
  const intent = detectChatIntent(message, destination.hotel);
  if (intent.type === "flex_stay_request") {
    return send(res, 200, { reply: fallbackReply(message, destination, [], [], replyLanguage), action: intent, source: "local-intent" });
  }
  const experienceIds = Array.isArray(body.rankedExperienceIds) ? body.rankedExperienceIds.filter((id) => typeof id === "string").slice(0, 5) : [];
  const dishIds = Array.isArray(body.rankedDishIds) ? body.rankedDishIds.filter((id) => typeof id === "string").slice(0, 5) : [];
  const hostNoteById = new Map((Array.isArray(body.rankedHostNotes) ? body.rankedHostNotes : []).filter((item) => item && typeof item.id === "string").map((item) => [item.id, cleanText(item.hostNote, 300)]));
  const rankedExperiences = experienceIds.map((id) => destination.experiences.find((item) => item.id === id)).filter(Boolean).map((item) => ({ id: item.id, name: item.name, partner: item.partner, description: item.description, category: item.category, durationMinutes: item.durationMinutes, price: item.price, hostNote: hostNoteById.get(item.id) || item.hostNote || "" }));
  const rankedDishes = dishIds.map((id) => destination.dishes.find((item) => item.id === id)).filter(Boolean).map((item) => ({ id: item.id, name: item.name, diet: item.diet, spiceLevel: item.spiceLevel, price: item.price, whereToEat: item.whereToEat }));
  const fallback = fallbackReply(message, destination, rankedExperiences, rankedDishes, replyLanguage);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return send(res, 200, { reply: fallback, action: null, source: "local-fallback" });

  const preferences = safePreferences(body.preferences);
  const rawGuest = body.guest && typeof body.guest === "object" ? body.guest : {};
  const guest = { name: cleanText(rawGuest.name, 80) || "Guest", persona: ["Guest (Family)", "Guest (Solo)"].includes(rawGuest.persona) ? rawGuest.persona : "Guest" };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6500);
  try {
    const prompt = [
      "You are Atithi AI, a warm AI co-host for a three-star hotel.",
      "If replyLanguage is provided, answer in exactly that language. Otherwise detect the language of the guest message and reply in that same language, including languages not spoken in this destination. Do not default to English when the message is clearly in another language. Never invent places, partners, policy, bookings or actions.",
      "For experience or food recommendations, ONLY use rankedExperiences and rankedDishes from the provided context. Never add a name, partner, price, ingredient, duration, venue or availability that is not in the corresponding list. If a list is empty, say the curated list has no match and suggest asking hotel staff.",
      "Classify an early check-in or late check-out request into action {type:flex_stay_request,kind:early|late,time:HH:mm}. This action only routes the request.",
      "Never state or imply a price, fee, availability, room readiness, occupancy conclusion or quote. The frontend deterministic Flex Stay engine computes the offer from separate demo room and fee data. Do not calculate or paraphrase an offer.",
      "For a Flex Stay intent, give only a neutral acknowledgement asking the guest to review the on-screen offer. Never claim a booking or approval occurred.",
      "Hotel and listing details are DEMO; only weather is live. Human staff control money, bookings and availability.",
      JSON.stringify({
        message,
        replyLanguage: cleanText(body.replyLanguage, 40) === "auto" ? "" : replyLanguage,
        guest,
        preferences,
        hotel: {
          checkIn: destination.hotel.checkIn,
          checkOut: destination.hotel.checkOut,
          earlyTimes: (destination.hotel.flexTiers.early || []).map((tier) => tier.from),
          lateTimes: (destination.hotel.flexTiers.late || []).map((tier) => tier.until),
        },
        destination: {
          city: destination.city,
          country: destination.country,
          currency: destination.currency.code,
          primaryLanguages: destination.primaryLanguages,
          places: destination.places.map(({ id, name, category, tags }) => ({ id, name, category, tags })),
          rankedExperiences,
          rankedDishes,
        },
      }),
    ].join("\n");

    const responseSchema = {
      type: "OBJECT",
      properties: {
        reply: { type: "STRING" },
        action: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING", enum: ["none", "flex_stay_request"] },
            kind: { type: "STRING", enum: ["early", "late"] },
            time: { type: "STRING" },
          },
          required: ["type", "kind", "time"],
        },
      },
      required: ["reply", "action"],
    };
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + GEMINI_MODEL + ":generateContent?key=" + encodeURIComponent(apiKey),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema },
        }),
      },
    );
    if (!response.ok) throw new Error("AI service unavailable");
    const payload = await response.json();
    const modelText = payload?.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text;
    const parsed = JSON.parse(modelText || "{}");
    const reply = cleanText(parsed.reply, 1600);
    if (!reply) throw new Error("Empty model answer");
    const action = normalizeAction(parsed.action, destination.hotel);
    const safeReply = action ? fallbackReply(message, destination, rankedExperiences, rankedDishes, replyLanguage) : reply;
    return send(res, 200, { reply: safeReply, action, source: "gemini" });
  } catch {
    return send(res, 200, { reply: fallback, action: null, source: "local-fallback" });
  } finally {
    clearTimeout(timeout);
  }
}
