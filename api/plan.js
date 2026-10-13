import { isBodyTooLarge, isPlainObject } from "../src/lib/apiHardening.js";

const MODEL = /^[A-Za-z0-9._-]+$/.test(process.env.GEMINI_MODEL || "")
  ? process.env.GEMINI_MODEL
  : "gemini-3.8-flash";
const LANGUAGES = new Set(["en", "hi", "es", "fr", "de", "ja", "ar", "zh", "pt", "id"]);

function send(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}
function cleanString(value, max = 180) {
  return typeof value === "string" ? value.trim().replace(/\u0000/g, "").slice(0, max) : "";
}
function fallback(language, affectedTitle, demo) {
  const lang = String(language || "en").split(/[-_]/)[0].toLowerCase();
  const name = cleanString(affectedTitle, 100) || "one stop";
  const content = {
    en: "Conditions may affect " + name + ". Consider the alternative and check official local guidance before setting out. This is a planning suggestion, not a live closure or transport report.",
    hi: name + " पर परिस्थितियों का असर हो सकता है। विकल्प पर विचार करें और निकलने से पहले आधिकारिक स्थानीय जानकारी जाँचें। यह योजना सुझाव है, लाइव बंदी या परिवहन रिपोर्ट नहीं।",
    es: "Las condiciones pueden afectar " + name + ". Considera la alternativa y consulta información oficial local antes de salir. Es una sugerencia de planificación, no un aviso real de cierre o transporte.",
    fr: "Les conditions peuvent affecter " + name + ". Envisagez l’alternative et vérifiez les informations locales officielles avant de partir. Ceci est un conseil de planification, pas une alerte réelle.",
    de: "Die Bedingungen können " + name + " beeinflussen. Prüfe die Alternative und offizielle lokale Hinweise vor dem Aufbruch. Dies ist ein Planungshinweis, keine echte Sperrungs- oder Verkehrsmeldung.",
    pt: "As condições podem afetar " + name + ". Considere a alternativa e confirme informações oficiais locais antes de sair. Isto é uma sugestão de planeamento, não um alerta real.",
    id: "Kondisi dapat memengaruhi " + name + ". Pertimbangkan alternatif dan periksa informasi resmi setempat sebelum berangkat. Ini saran perencanaan, bukan laporan penutupan atau transportasi langsung.",
    ja: name + "は状況の影響を受ける可能性があります。代替案を検討し、出発前に公式の現地情報を確認してください。これは計画上の提案で、実際の閉鎖や交通情報ではありません。",
    ar: "قد تؤثر الظروف على " + name + ". فكّر في البديل وتحقق من الإرشادات المحلية الرسمية قبل الانطلاق. هذه نصيحة للتخطيط وليست تقريرًا مباشرًا عن الإغلاق أو النقل.",
    zh: name + "可能受到当前情况影响。请考虑下方替代方案，并在出发前查看当地官方信息。这是行程建议，不是实时封闭或交通报告。"
  };
  const result = content[LANGUAGES.has(lang) ? lang : "en"];
  return demo ? result.replace(/conditions|Las condiciones|Les conditions|Die Bedingungen|As condições|Kondisi/i, "Simulated event: conditions") : result;
}
function parseJson(text) {
  try {
    const value = JSON.parse(String(text || "").trim());
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  } catch { return null; }
}
function wordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return send(res, 405, { error: "Use POST to request a travel advisory.", advisory: "" });
  }
  if (isBodyTooLarge(req, req.body, 24 * 1024)) return send(res, 413, { error: "Request is too large. Shorten the planning request and try again.", advisory: "" });
  const body = isPlainObject(req.body) ? req.body : {};
  if (body.mode !== "advisory") return send(res, 200, { advisory: fallback(body.language, body.affectedStop?.title, body.disruption?.source === "demo") });

  const languageInput = cleanString(body.language, 45).replace(/_/g, "-");
  let language = "en";
  try { language = Intl.getCanonicalLocales(languageInput || "en")[0]; } catch { language = "en"; }
  const type = ["rain", "storm", "heat", "closure", "strike"].includes(body.disruption?.type) ? body.disruption.type : "rain";
  const severity = ["low", "moderate", "high"].includes(body.disruption?.severity) ? body.disruption.severity : "moderate";
  const source = body.disruption?.source === "live" ? "live" : "demo";
  const destination = {
    city: cleanString(body.destination?.city, 80),
    country: cleanString(body.destination?.country, 80)
  };
  const affectedStop = {
    title: cleanString(body.affectedStop?.title, 120),
    category: cleanString(body.affectedStop?.category, 60)
  };
  const alternatives = Array.isArray(body.alternatives) ? body.alternatives.slice(0, 2).map((item) => ({
    title: cleanString(item?.title, 120),
    category: cleanString(item?.category, 60),
    indoor: item?.indoor === true,
    rainFriendly: item?.rainFriendly === true
  })) : [];
  const weather = source === "live" && body.weather && typeof body.weather === "object" ? {
    condition: cleanString(body.weather.condition, 50),
    temperatureC: Number.isFinite(Number(body.weather.temperatureC)) ? Number(body.weather.temperatureC) : null,
    windKmh: Number.isFinite(Number(body.weather.windKmh)) ? Number(body.weather.windKmh) : null
  } : null;
  const safeFallback = fallback(language, affectedStop.title, source === "demo");
  const key = process.env.GEMINI_API_KEY;
  if (!key || !affectedStop.title) return send(res, 200, { advisory: safeFallback });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);
  try {
    const prompt = [
      "Write one calm travel advisory of at most 45 words in language " + language + ".",
      "You are only phrasing structured facts; do not decide the itinerary and do not invent facts.",
      "Never claim real road closures, venue closures, strikes, transport disruption, traffic or opening hours.",
      source === "demo" ? "This is a DEMO EVENT: clearly call it simulated." : "This is destination weather from Open-Meteo only; do not imply closure information.",
      "Destination: " + destination.city + ", " + destination.country + ".",
      "Event type: " + type + ". Severity: " + severity + ".",
      "Affected stop: " + affectedStop.title + " (" + affectedStop.category + ").",
      "Available alternatives: " + JSON.stringify(alternatives) + ".",
      "Weather facts: " + JSON.stringify(weather) + ".",
      'Return JSON only: {"advisory":"..."}'
    ].join("\n");
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties: { advisory: { type: "STRING" } }, required: ["advisory"] }, maxOutputTokens: 180, thinkingConfig: { thinkingLevel: "low" } }
        })
      }
    );
    if (!response.ok) return send(res, 200, { advisory: safeFallback });
    const result = await response.json();
    const output = result?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n") || "";
    const parsed = parseJson(output);
    const advisory = cleanString(parsed?.advisory, 600);
    if (!advisory || wordCount(advisory) > 45) return send(res, 200, { advisory: safeFallback });
    return send(res, 200, { advisory });
  } catch {
    return send(res, 200, { advisory: safeFallback });
  } finally {
    clearTimeout(timeout);
  }
}
