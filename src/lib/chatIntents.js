const PHRASES = {
  early: ["early check in", "early check-in", "check in early", "check-in early", "check me in early", "arrive early", "entrada temprana", "check-in anticipado", "registrarme temprano", "llegar antes", "arrivée anticipée", "arriver plus tôt", "enregistrement anticipé", "जल्दी चेक इन", "जल्दी चेक-इन", "समय से पहले चेक-इन", "कमरा जल्दी मिल सकता"],
  late: ["late check out", "late check-out", "check out late", "check-out late", "stay until evening", "stay till evening", "leave in the evening", "salida tardía", "salir más tarde", "quedarme hasta la noche", "départ tardif", "rester jusqu'au soir", "देर से चेक आउट", "शाम तक रुकना", "शाम तक ठहरना"],
  food: ["food", "dish", "eat", "restaurant", "menu", "vegetarian", "vegan", "allergy", "comida", "plato", "comer", "restaurante", "menú", "nourriture", "plat", "manger", "खाना", "भोजन", "शाकाहारी", "मेन्यू", "रेस्तरां"],
  help: ["talk to a human", "human please", "need a person", "front desk", "help", "someone help", "ayuda", "necesito ayuda", "hablar con una persona", "aide", "j'ai besoin d'aide", "parler à une personne", "मदद", "सहायता", "किसी इंसान से बात", "फ्रंट डेस्क"],
};
function normalize(value) { return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[’‘]/g, "'"); }
function has(text, phrases) { return phrases.some((phrase) => text.includes(normalize(phrase))); }
function defaultTime(kind, hotel) {
  const tiers = [...(hotel?.flexTiers?.[kind] || [])].sort((a, b) => String(kind === "early" ? a.from : a.until).localeCompare(String(kind === "early" ? b.from : b.until)));
  return !tiers.length ? (kind === "early" ? "12:00" : "13:00") : (kind === "early" ? tiers[tiers.length - 1].from : tiers[0].until);
}
function extractTime(text, kind) {
  if (/\b(evening|tonight|night|noche|soir|शाम)\b/.test(text)) return "18:00";
  if (/\b(noon|midday|mediodia|midi|दोपहर)\b/.test(text)) return "12:00";
  const match = text.match(/(?:\bat\s*|\buntil\s*|\bby\s*|\baround\s*|\ba las\s*|\bvers\s*|\bà\s*|\bतक\s*|\bकरीब\s*)?(\d{1,2})(?::(\d{2})|\.(\d{2}))?\s*(a\.?m\.?|p\.?m\.?|am|pm)?/i);
  if (!match) return null;
  let hour = Number(match[1]); const minute = Number(match[2] || match[3] || 0); const suffix = String(match[4] || "").toLowerCase().replace(/\./g, "");
  if (hour > 23 || minute > 59 || (suffix && hour > 12)) return null;
  if (suffix === "pm" && hour < 12) hour += 12;
  if (suffix === "am" && hour === 12) hour = 0;
  if (!suffix && kind === "late" && hour >= 1 && hour <= 8) hour += 12;
  if (!suffix && kind === "early" && hour >= 1 && hour <= 2) hour += 12;
  return String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
}
export function detectChatIntent(message, hotel) {
  const text = normalize(message);
  if (has(text, PHRASES.early) || /\b(check.?in|arrive)\s+(early|earlier)\b/.test(text) || /\bearly\s+(check.?in|arrival)\b/.test(text)) return { type: "flex_stay_request", kind: "early", time: extractTime(text, "early") || defaultTime("early", hotel) };
  if (has(text, PHRASES.late) || /\b(late|later)\s+(check.?out|departure)\b/.test(text) || /\b(stay|leave|check.?out)\b.{0,30}\b(evening|later|late)\b/.test(text)) return { type: "flex_stay_request", kind: "late", time: extractTime(text, "late") || defaultTime("late", hotel) };
  if (has(text, PHRASES.food)) return { type: "food_question" };
  if (has(text, PHRASES.help)) return { type: "human_help" };
  return { type: "none" };
}
export const CHAT_INTENT_PHRASES = PHRASES;
