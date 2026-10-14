/*
 * Pure local helpers for flexible check-in/check-out planning. No AI, network, or storage.
 *
 * Worked examples:
 * 1) arrival 10:00, check-in 14:00 -> earlyGapMin 240, hasEarlyGap true.
 * 2) check-out 11:00, departure 15:30 -> lateGapMin 270, hasLateGap true.
 * 3) arrival 15:00, check-in 14:00 -> earlyGapMin 0; a request never implies availability.
 */
const LANGUAGES = new Set(["en", "hi", "es", "fr", "pt", "id"]);

function parseTime(value) {
  if (typeof value !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return null;
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function zeroGaps() {
  return { earlyGapMin: 0, lateGapMin: 0, hasEarlyGap: false, hasLateGap: false };
}

function positiveGap(start, end, { allowOvernight = false } = {}) {
  if (start == null || end == null) return 0;
  if (end > start) return end - start;
  if (end === start) return 0;
  if (allowOvernight && start >= 18 * 60 && end <= 6 * 60) return (1440 - start) + end;
  return 0;
}

export function computeGaps({ arrival = "", checkIn = "14:00", checkOut = "11:00", departure = "" } = {}) {
  const values = [arrival, checkIn || "14:00", checkOut || "11:00", departure];
  if (values.some((value) => value !== "" && parseTime(value) === null)) return zeroGaps();

  const arrivalMinutes = arrival ? parseTime(arrival) : null;
  const checkInMinutes = parseTime(checkIn || "14:00");
  const checkOutMinutes = parseTime(checkOut || "11:00");
  const departureMinutes = departure ? parseTime(departure) : null;
  const earlyGapMin = arrivalMinutes == null ? 0 : positiveGap(arrivalMinutes, checkInMinutes, { allowOvernight: true });
  const lateGapMin = departureMinutes == null ? 0 : positiveGap(checkOutMinutes, departureMinutes, { allowOvernight: true });
  return {
    earlyGapMin,
    lateGapMin,
    hasEarlyGap: earlyGapMin > 0,
    hasLateGap: lateGapMin > 0
  };
}

const HOTEL_DRAFTS = {
  en: {
    early: (time) => "Hello, is early check-in at " + time + " possible, and is there a fee? Thank you.",
    late: (time) => "Hello, is late check-out until " + time + " possible, and is there a fee? Thank you."
  },
  hi: {
    early: (time) => "नमस्ते, क्या " + time + " बजे जल्दी चेक-इन संभव है, और क्या इसके लिए कोई शुल्क है? धन्यवाद।",
    late: (time) => "नमस्ते, क्या " + time + " बजे तक देर से चेक-आउट संभव है, और क्या इसके लिए कोई शुल्क है? धन्यवाद।"
  },
  es: {
    early: (time) => "Hola, ¿sería posible hacer el registro de entrada temprano a las " + time + " y tendría algún coste? Muchas gracias.",
    late: (time) => "Hola, ¿sería posible hacer el registro de salida más tarde, hasta las " + time + ", y tendría algún coste? Muchas gracias."
  },
  fr: {
    early: (time) => "Bonjour, serait-il possible d’arriver et de faire l’enregistrement à " + time + ", et y aurait-il des frais ? Merci beaucoup.",
    late: (time) => "Bonjour, serait-il possible de quitter la chambre plus tard, jusqu’à " + time + " et y aurait-il des frais ? Merci beaucoup."
  },
  pt: {
    early: (time) => "Olá, seria possível fazer o check-in antecipado às " + time + " e haveria alguma taxa? Muito obrigado/a.",
    late: (time) => "Olá, seria possível fazer o check-out tardio até às " + time + " e haveria alguma taxa? Muito obrigado/a."
  },
  id: {
    early: (time) => "Halo, apakah check-in lebih awal pada pukul " + time + " memungkinkan, dan apakah ada biaya? Terima kasih.",
    late: (time) => "Halo, apakah check-out lebih lambat sampai pukul " + time + " memungkinkan, dan apakah ada biaya? Terima kasih."
  }
};

function safeText(value, maximum = 120) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, maximum) : "";
}

export function buildRequestDraft({ kind = "early", time = "", hotelName = "", travelerName = "", language = "en" } = {}) {
  const selectedKind = kind === "late" ? "late" : "early";
  const safeTime = parseTime(time) !== null ? time : (selectedKind === "early" ? "14:00" : "11:00");
  const lang = LANGUAGES.has(language) ? language : "en";
  const hotel = safeText(hotelName, 120);
  const traveler = safeText(travelerName, 80);
  const greeting = HOTEL_DRAFTS[lang][selectedKind](safeTime);
  const prefix = hotel ? (lang === "hi" ? hotel + " जी, " : hotel + ", ") : "";
  const signature = traveler ? (lang === "en" ? "\n\nThank you,\n" + traveler : "\n\n" + traveler) : "";
  return (prefix + greeting + signature).slice(0, 500);
}

const HUMAN_DRAFTS = {
  en: {
    hotel: (city) => "Hello, I am planning a visit to " + city + ". Could you please explain the available arrival or departure options and any applicable fees or conditions? Thank you.",
    host: (host, experience, city) => "Hello " + host + ", I am interested in " + experience + " in " + city + ". Could you share the activity details, timing, accessibility information and any applicable fees? Thank you."
  },
  hi: {
    hotel: (city) => "नमस्ते, मैं " + city + " की यात्रा की योजना बना रहा/रही हूँ। क्या आप आगमन या प्रस्थान के उपलब्ध विकल्पों और लागू शुल्क या शर्तों के बारे में बता सकते हैं? धन्यवाद।",
    host: (host, experience, city) => "नमस्ते " + host + ", मुझे " + city + " में " + experience + " में रुचि है। क्या आप गतिविधि, समय, पहुँच-संबंधी जानकारी और किसी लागू शुल्क के बारे में बता सकते हैं? धन्यवाद।"
  },
  es: {
    hotel: (city) => "Hola, estoy planeando visitar " + city + ". ¿Podrían explicarme las opciones disponibles para la llegada o la salida y cualquier tarifa o condición aplicable? Gracias.",
    host: (host, experience, city) => "Hola " + host + ", me interesa " + experience + " en " + city + ". ¿Podrías compartir detalles, horarios, accesibilidad y posibles tarifas? Muchas gracias."
  },
  fr: {
    hotel: (city) => "Bonjour, je prépare un voyage à " + city + ". Pourriez-vous m’expliquer les options possibles à l’arrivée ou au départ ainsi que les frais ou conditions éventuels ? Merci.",
    host: (host, experience, city) => "Bonjour " + host + ", je m’intéresse à " + experience + " à " + city + ". Pourriez-vous préciser l’activité, les horaires, l’accessibilité et les frais éventuels ? Merci."
  },
  pt: {
    hotel: (city) => "Olá, estou a planear uma visita a " + city + ". Poderia explicar as opções disponíveis para a chegada ou saída e quaisquer taxas ou condições aplicáveis? Obrigado/a.",
    host: (host, experience, city) => "Olá " + host + ", tenho interesse em " + experience + " em " + city + ". Pode partilhar detalhes, horários, acessibilidade e eventuais taxas? Obrigado/a."
  },
  id: {
    hotel: (city) => "Halo, saya berencana mengunjungi " + city + ". Bisakah Anda menjelaskan pilihan waktu kedatangan atau keberangkatan serta biaya atau ketentuan yang berlaku? Terima kasih.",
    host: (host, experience, city) => "Halo " + host + ", saya tertarik pada " + experience + " di " + city + ". Bisakah Anda memberi informasi tentang kegiatan, waktu, aksesibilitas, dan biaya yang mungkin berlaku? Terima kasih."
  }
};

export function buildHumanDraft({ kind = "hotel", hostName = "there", experienceTitle = "this experience", destinationCity = "the destination", language = "en" } = {}) {
  const lang = LANGUAGES.has(language) ? language : "en";
  const city = safeText(destinationCity, 80) || "the destination";
  const host = safeText(hostName, 100) || "there";
  const experience = safeText(experienceTitle, 120) || "this experience";
  return (kind === "host"
    ? HUMAN_DRAFTS[lang].host(host, experience, city)
    : HUMAN_DRAFTS[lang].hotel(city)).slice(0, 500);
}

export function detectHumanHelpIntent(value) {
  const message = String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(person|human|real person|staff|front desk|manager|complaint|complain|problem|issue|booking problem|reservation problem|help me|customer service|someone|refund|no show|wrong booking|persona|alguien|problema|queja|reclamacion|recepcion|ayuda humana|ayuda|probleme|reclamation|plainte|personne|aide|problema|reclamacao|reclamação|pessoa|ajuda|atendimento|orang|manusia|staf|keluhan|masalah|bantuan|orang sungguhan)\b/.test(message)
    || /मदद|शिकायत|किसी से बात|व्यक्ति|समस्या|बुकिंग समस्या/.test(String(value || ""));
}
