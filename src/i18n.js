const DICTIONARY = {
  en: {
    lensTitle:"Atithi Lens",lensIntro:"Scan a menu, fare board or notice and translate the visible text.",targetLanguage:"Translation language",scan:"Scan",menu:"Menu",price:"Price",
    city:"City",country:"Country",currency:"Local currency (ISO code)",samplePhotos:"Try a sample photo",sampleMenu:"Generic menu",sampleFare:"Fare board",sampleNotice:"Notice sign",
    uploadPhoto:"Choose a photo",photoHelp:"JPEG, PNG or WebP. The image is resized in your browser before upload (4 MB request limit).",reading:"Reading the image…",
    detectedLanguage:"Detected language",originalText:"Text detected",translation:"Translation",imageSummary:"What it appears to say",visiblePrices:"Prices clearly visible",
    dishDetails:"Dish notes",dietGuess:"Diet estimate",spiceGuess:"Spice estimate",estimateNotice:"AI estimate, confirm with staff",disclaimer:"AI estimate. Verify locally.",
    priceRange:"Range of prices visible in this image",verdict:"Price check",fair:"Looks fair",overpriced:"Possibly overpriced",cannotTell:"Can't tell",
    priceBasis:"This is based only on legible prices in the photo, not an official rate or market quote.",speak:"Read aloud",stopSpeaking:"Stop speaking",
    voiceUnavailable:"No matching speech voice is available on this device. The text is still available to read.",askHotel:"Ask the hotel about this",requestSent:"Request sent for hotel review",
    chooseSupportedImage:"Choose a JPEG, PNG or WebP image.",imageFailed:"Image analysis is unavailable. A local fallback is shown.",timedOut:"Image analysis took too long. A local fallback is shown.",
    sampleUnavailable:"The sample photo is not installed yet; a cached example is shown instead.",noText:"No clear text could be read. Try a sharper photo with the text in focus.",
    chatTitle:"AI co-host",replyLanguage:"Reply language",detectLanguage:"Detect from my message",chatPlaceholder:"Ask about your stay…",send:"Send",sending:"Sending…",
    talkHuman:"Talk to a human",chatHint:"The AI can suggest, not confirm. Hotel staff control bookings, fees and availability.",
    requestCreated:"Your question was added to the hotel team's review queue.",
    askHotelPrice:"I’ve sent your question to the hotel team. A staff member must confirm fees, bookings and availability; nothing is charged or booked.",
    flexAcknowledgement:"I can check a demo Flex Stay option. Review the computed offer below; the hotel must confirm it.",
    emergencyNote:"This app cannot dispatch emergency services. If there is immediate danger, call the local emergency number shown by the hotel.",
    humanDemo:"A team member has not joined yet; this is a demo handoff."
  },
  hi: {
    lensTitle:"अतिथि लेंस",lensIntro:"मेन्यू, किराया बोर्ड या सूचना की तस्वीर से दिख रहा पाठ पढ़ें और अनुवाद करें।",targetLanguage:"अनुवाद की भाषा",scan:"स्कैन",menu:"मेन्यू",price:"कीमत",
    city:"शहर",country:"देश",currency:"स्थानीय मुद्रा (ISO कोड)",samplePhotos:"नमूना तस्वीर आज़माएँ",sampleMenu:"सामान्य मेन्यू",sampleFare:"किराया बोर्ड",sampleNotice:"सूचना बोर्ड",
    uploadPhoto:"तस्वीर चुनें",photoHelp:"JPEG, PNG या WebP। अपलोड से पहले तस्वीर छोटी की जाती है (अनुरोध सीमा 4 MB)।",reading:"तस्वीर पढ़ी जा रही है…",
    detectedLanguage:"पहचानी गई भाषा",originalText:"पहचाना गया पाठ",translation:"अनुवाद",imageSummary:"तस्वीर में क्या लिखा है",visiblePrices:"तस्वीर में साफ़ दिख रही कीमतें",
    dishDetails:"व्यंजन की जानकारी",dietGuess:"आहार का अनुमान",spiceGuess:"तीखेपन का अनुमान",estimateNotice:"AI का अनुमान, स्टाफ़ से पुष्टि करें",disclaimer:"AI का अनुमान। स्थानीय रूप से पुष्टि करें।",
    priceRange:"तस्वीर में दिख रही कीमतों की सीमा",verdict:"कीमत की जाँच",fair:"उचित लगती है",overpriced:"शायद ज़्यादा कीमत",cannotTell:"नहीं बता सकते",
    priceBasis:"यह केवल तस्वीर में साफ़ दिख रही कीमतों पर आधारित है, किसी आधिकारिक दर या बाज़ार भाव पर नहीं।",speak:"ज़ोर से पढ़ें",stopSpeaking:"पढ़ना रोकें",
    voiceUnavailable:"इस डिवाइस पर इस भाषा की आवाज़ उपलब्ध नहीं है। आप पाठ पढ़ सकते हैं।",askHotel:"होटल से इसके बारे में पूछें",requestSent:"होटल की समीक्षा के लिए अनुरोध भेजा गया",
    chooseSupportedImage:"JPEG, PNG या WebP तस्वीर चुनें।",imageFailed:"तस्वीर का विश्लेषण उपलब्ध नहीं है। स्थानीय वैकल्पिक परिणाम दिखाया गया है।",timedOut:"तस्वीर पढ़ने में अधिक समय लगा। स्थानीय वैकल्पिक परिणाम दिखाया गया है।",
    sampleUnavailable:"नमूना तस्वीर अभी जोड़ी नहीं गई है; इसके बदले कैश किया हुआ उदाहरण दिखाया गया है।",noText:"पाठ साफ़ नहीं पढ़ा जा सका। पाठ पर फ़ोकस करके स्पष्ट तस्वीर लें।",
    chatTitle:"AI सह-मेज़बान",replyLanguage:"जवाब की भाषा",detectLanguage:"मेरे संदेश की भाषा पहचानें",chatPlaceholder:"अपने ठहरने के बारे में पूछें…",send:"भेजें",sending:"भेज रहे हैं…",
    talkHuman:"कर्मचारी से बात करें",chatHint:"AI सुझाव दे सकता है, पुष्टि नहीं। बुकिंग, शुल्क और उपलब्धता की पुष्टि होटल स्टाफ़ करता है।",
    requestCreated:"आपका सवाल होटल टीम की समीक्षा सूची में जोड़ दिया गया।",
    askHotelPrice:"आपका सवाल होटल टीम को भेज दिया गया है। शुल्क, बुकिंग और उपलब्धता की पुष्टि स्टाफ़ करेगा; कोई भुगतान या बुकिंग नहीं हुई है।",
    flexAcknowledgement:"मैं डेमो Flex Stay विकल्प जाँच सकता हूँ। नीचे दिए गए हिसाब को देखें; होटल को इसकी पुष्टि करनी होगी।",
    emergencyNote:"यह ऐप आपातकालीन सेवाएँ नहीं भेज सकता। तत्काल खतरे में होटल द्वारा दिए गए स्थानीय आपातकालीन नंबर पर कॉल करें।",
    humanDemo:"अभी कोई कर्मचारी चैट में शामिल नहीं हुआ है; यह डेमो अनुरोध है।"
  },
  es: {
    lensTitle:"Atithi Lens",lensIntro:"Escanea un menú, un panel de tarifas o un aviso y traduce el texto visible.",targetLanguage:"Idioma de traducción",scan:"Escanear",menu:"Menú",price:"Precio",
    city:"Ciudad",country:"País",currency:"Moneda local (código ISO)",samplePhotos:"Probar una foto de muestra",sampleMenu:"Menú genérico",sampleFare:"Panel de tarifas",sampleNotice:"Aviso",
    uploadPhoto:"Elegir una foto",photoHelp:"JPEG, PNG o WebP. La imagen se reduce en el navegador antes de subirla (límite: 4 MB).",reading:"Leyendo la imagen…",
    detectedLanguage:"Idioma detectado",originalText:"Texto detectado",translation:"Traducción",imageSummary:"Qué parece decir",visiblePrices:"Precios claramente visibles",
    dishDetails:"Detalles del plato",dietGuess:"Estimación dietética",spiceGuess:"Estimación de picante",estimateNotice:"Estimación de IA; confirma con el personal",disclaimer:"Estimación de IA. Verifica localmente.",
    priceRange:"Rango de precios visibles en esta imagen",verdict:"Evaluación del precio",fair:"Parece razonable",overpriced:"Posiblemente caro",cannotTell:"No se puede determinar",
    priceBasis:"Se basa solo en los precios legibles de la foto, no en una tarifa oficial ni en una cotización del mercado.",speak:"Leer en voz alta",stopSpeaking:"Dejar de leer",
    voiceUnavailable:"Este dispositivo no tiene una voz disponible para este idioma. Puedes leer el texto.",askHotel:"Consultar esto con el hotel",requestSent:"Solicitud enviada para revisión del hotel",
    chooseSupportedImage:"Elige una imagen JPEG, PNG o WebP.",imageFailed:"El análisis no está disponible. Se muestra un resultado local alternativo.",timedOut:"El análisis tardó demasiado. Se muestra un resultado local alternativo.",
    sampleUnavailable:"La foto de muestra aún no está instalada; se muestra un ejemplo guardado en caché.",noText:"No se pudo leer el texto con claridad. Prueba una foto más nítida y enfocada.",
    chatTitle:"Copiloto de IA",replyLanguage:"Idioma de respuesta",detectLanguage:"Detectar el idioma de mi mensaje",chatPlaceholder:"Pregunta sobre tu estancia…",send:"Enviar",sending:"Enviando…",
    talkHuman:"Hablar con una persona",chatHint:"La IA puede sugerir, pero no confirmar. El personal del hotel controla las reservas, tarifas y disponibilidad.",
    requestCreated:"Tu consulta se añadió a la cola de revisión del hotel.",
    askHotelPrice:"He enviado tu consulta al hotel. El personal debe confirmar tarifas, reservas y disponibilidad; no se ha cobrado ni reservado nada.",
    flexAcknowledgement:"Puedo revisar una opción Flex Stay de demostración. Revisa el cálculo; el hotel debe confirmarlo.",
    emergencyNote:"Esta aplicación no puede enviar servicios de emergencia. Si hay peligro inmediato, llama al número local de emergencias indicado por el hotel.",
    humanDemo:"Ningún miembro del equipo se ha unido todavía; este es un traspaso de demostración."
  },
  fr: {
    lensTitle:"Atithi Lens",lensIntro:"Scannez un menu, un panneau tarifaire ou un avis et traduisez le texte visible.",targetLanguage:"Langue de traduction",scan:"Scanner",menu:"Menu",price:"Prix",
    city:"Ville",country:"Pays",currency:"Devise locale (code ISO)",samplePhotos:"Essayer une photo exemple",sampleMenu:"Menu générique",sampleFare:"Panneau tarifaire",sampleNotice:"Avis",
    uploadPhoto:"Choisir une photo",photoHelp:"JPEG, PNG ou WebP. L’image est réduite dans le navigateur avant l’envoi (limite : 4 Mo).",reading:"Lecture de l’image…",
    detectedLanguage:"Langue détectée",originalText:"Texte détecté",translation:"Traduction",imageSummary:"Ce que l’image semble indiquer",visiblePrices:"Prix clairement visibles",
    dishDetails:"Détails des plats",dietGuess:"Estimation alimentaire",spiceGuess:"Estimation du piquant",estimateNotice:"Estimation IA, à confirmer auprès du personnel",disclaimer:"Estimation IA. Vérifiez sur place.",
    priceRange:"Fourchette des prix visibles sur cette image",verdict:"Évaluation du prix",fair:"Semble raisonnable",overpriced:"Possiblement trop cher",cannotTell:"Impossible à déterminer",
    priceBasis:"Basé uniquement sur les prix lisibles de la photo, pas sur un tarif officiel ou un prix de marché.",speak:"Lire à voix haute",stopSpeaking:"Arrêter la lecture",
    voiceUnavailable:"Aucune voix correspondant à cette langue n’est disponible sur cet appareil. Le texte reste consultable.",askHotel:"Demander à l’hôtel à ce sujet",requestSent:"Demande envoyée à l’hôtel pour examen",
    chooseSupportedImage:"Choisissez une image JPEG, PNG ou WebP.",imageFailed:"L’analyse est indisponible. Un résultat local de secours est affiché.",timedOut:"L’analyse a pris trop de temps. Un résultat local de secours est affiché.",
    sampleUnavailable:"La photo exemple n’est pas encore installée ; un exemple en cache est affiché.",noText:"Le texte n’a pas pu être lu clairement. Essayez une photo plus nette et mise au point.",
    chatTitle:"Co-hôte IA",replyLanguage:"Langue de réponse",detectLanguage:"Détecter la langue de mon message",chatPlaceholder:"Posez une question sur votre séjour…",send:"Envoyer",sending:"Envoi…",
    talkHuman:"Parler à une personne",chatHint:"L’IA peut suggérer, mais pas confirmer. Le personnel de l’hôtel décide des réservations, tarifs et disponibilités.",
    requestCreated:"Votre question a été ajoutée à la file de révision de l’hôtel.",
    askHotelPrice:"J’ai transmis votre question à l’hôtel. Le personnel doit confirmer les frais, réservations et disponibilités ; rien n’a été réservé ni facturé.",
    flexAcknowledgement:"Je peux vérifier une option Flex Stay de démonstration. Consultez le calcul ci-dessous ; l’hôtel doit le confirmer.",
    emergencyNote:"Cette application ne peut pas dépêcher les services d’urgence. En cas de danger immédiat, appelez le numéro d’urgence local indiqué par l’hôtel.",
    humanDemo:"Aucun membre de l’équipe n’a encore rejoint la conversation ; il s’agit d’un transfert de démonstration."
  },
  de: {
    chatTitle:"KI-Co-Host",replyLanguage:"Antwortsprache",detectLanguage:"Sprache meiner Nachricht erkennen",chatPlaceholder:"Frage zu deinem Aufenthalt…",send:"Senden",sending:"Wird gesendet…",talkHuman:"Mit einem Menschen sprechen",
    chatHint:"Die KI kann Vorschläge machen, aber nichts bestätigen. Hotelpersonal bestätigt Buchungen, Gebühren und Verfügbarkeit.",
    noText:"Der Text ist nicht klar lesbar. Bitte mache ein schärferes Foto.",dishDetails:"Gerichte",samplePhotos:"Vorschläge",
    requestCreated:"Deine Anfrage wurde zur Prüfung an das Hotelteam weitergeleitet.",
    askHotelPrice:"Ich habe die Frage an das Hotelteam weitergeleitet. Personal muss Gebühren, Buchungen und Verfügbarkeit bestätigen; es wurde nichts gebucht oder berechnet.",
    flexAcknowledgement:"Ich kann eine Demo-Flex-Stay-Option prüfen. Bitte prüfe das angezeigte Angebot; das Hotel muss es bestätigen.",
    emergencyNote:"Diese App kann keine Rettungsdienste alarmieren. Bei unmittelbarer Gefahr rufe die örtliche Notrufnummer an.",
    humanDemo:"Das Hotelteam ist noch nicht beigetreten; dies ist eine Demo-Anfrage."
  },
  ja: {
    chatTitle:"AIコンシェルジュ",replyLanguage:"返信言語",detectLanguage:"メッセージの言語を自動検出",chatPlaceholder:"滞在について質問する…",send:"送信",sending:"送信中…",talkHuman:"スタッフに相談",
    chatHint:"AIは提案できますが確約はできません。予約、料金、空き状況はホテルスタッフが確認します。",
    noText:"文字をはっきり読み取れません。ピントの合った写真をお試しください。",dishDetails:"料理の候補",samplePhotos:"おすすめ",
    requestCreated:"ホテルスタッフの確認用にリクエストを追加しました。",
    askHotelPrice:"ホテルスタッフに質問を送りました。料金、予約、空き状況はスタッフの確認が必要です。予約や請求は行われていません。",
    flexAcknowledgement:"デモのFlex Stayオプションを確認できます。表示された内容を確認し、ホテルに最終確認してください。",
    emergencyNote:"このアプリは緊急サービスを呼び出せません。差し迫った危険がある場合は現地の緊急番号に電話してください。",
    humanDemo:"ホテルスタッフはまだチャットに参加していません。これはデモ依頼です。"
  },
  ar: {
    chatTitle:"مساعد الفندق بالذكاء الاصطناعي",replyLanguage:"لغة الرد",detectLanguage:"اكتشاف لغة رسالتي",chatPlaceholder:"اسأل عن إقامتك…",send:"إرسال",sending:"جارٍ الإرسال…",talkHuman:"التحدث إلى موظف",
    chatHint:"يمكن للذكاء الاصطناعي تقديم اقتراحات لا تأكيدها. يؤكد موظفو الفندق الحجوزات والرسوم والتوافر.",
    noText:"تعذرت قراءة النص بوضوح. جرّب صورة أوضح.",dishDetails:"أطباق مقترحة",samplePhotos:"اقتراحات",
    requestCreated:"أُضيف طلبك إلى قائمة مراجعة فريق الفندق.",
    askHotelPrice:"أرسلت سؤالك إلى فريق الفندق. يجب أن يؤكد الموظفون الرسوم والحجوزات والتوافر؛ لم يتم الحجز أو الدفع.",
    flexAcknowledgement:"يمكنني مراجعة خيار Flex Stay تجريبي. راجع العرض المعروض؛ يجب أن يؤكده الفندق.",
    emergencyNote:"لا يستطيع هذا التطبيق إرسال خدمات الطوارئ. عند وجود خطر فوري، اتصل برقم الطوارئ المحلي.",
    humanDemo:"لم ينضم أحد من فريق الفندق بعد؛ هذا طلب تجريبي."
  },
  zh: {
    chatTitle:"AI酒店助手",replyLanguage:"回复语言",detectLanguage:"自动识别我的消息语言",chatPlaceholder:"询问您的住宿…",send:"发送",sending:"发送中…",talkHuman:"联系人工",
    chatHint:"AI可以提供建议，但不能确认事项。预订、费用和可用性由酒店员工确认。",
    noText:"无法清晰读取文字。请尝试更清晰、对焦准确的照片。",dishDetails:"菜品建议",samplePhotos:"建议",
    requestCreated:"您的问题已加入酒店团队的审核队列。",
    askHotelPrice:"我已将问题发送给酒店团队。费用、预订和可用性需要员工确认；目前没有预订或收费。",
    flexAcknowledgement:"我可以查看演示版 Flex Stay 选项。请查看计算结果，最终需要酒店确认。",
    emergencyNote:"此应用无法调度紧急服务。如有紧急危险，请拨打当地紧急电话号码。",
    humanDemo:"酒店团队尚未加入聊天；这是一个演示请求。"
  }
};

export const LANGUAGE_OPTIONS = Object.freeze([
  { code: "en", tag: "en", label: "English" },
  { code: "hi", tag: "hi-IN", label: "हिन्दी" },
  { code: "es", tag: "es-ES", label: "Español" },
  { code: "fr", tag: "fr-FR", label: "Français" },
  { code: "de", tag: "de-DE", label: "Deutsch" },
  { code: "ja", tag: "ja-JP", label: "日本語" },
  { code: "ar", tag: "ar", label: "العربية" },
  { code: "zh", tag: "zh-CN", label: "中文" }
]);

export function languageBase(value) {
  if (typeof value !== "string" || !value.trim()) return "en";
  const candidate = value.trim().replace(/_/g, "-");
  try {
    const base = (Intl.getCanonicalLocales(candidate)[0] || "en").split("-")[0].toLowerCase();
    return LANGUAGE_OPTIONS.some((item) => item.code === base) ? base : "en";
  } catch {
    const base = candidate.split("-")[0].toLowerCase();
    return LANGUAGE_OPTIONS.some((item) => item.code === base) ? base : "en";
  }
}

export function targetLanguageTag(code) {
  const item = LANGUAGE_OPTIONS.find((option) => option.code === languageBase(code));
  return item ? item.tag : "en";
}

export function languageName(code) {
  const item = LANGUAGE_OPTIONS.find((option) => option.code === code || option.tag === code);
  return item ? item.label : (typeof code === "string" && code ? code : "English");
}

export function getDefaultLanguage() {
  return languageBase(typeof navigator !== "undefined" && navigator.language ? navigator.language : "en");
}

export function detectTextLanguage(value) {
  const text = typeof value === "string" ? value : "";
  if (/[\u0900-\u097F]/.test(text)) return "hi";
  if (/[\u0600-\u06FF\u0750-\u077F]/.test(text)) return "ar";
  if (/[\u3040-\u30FF]/.test(text)) return "ja";
  if (/[\u4E00-\u9FFF]/.test(text)) return "zh";
  const lower = text.toLowerCase();
  if (/[ñ¿¡]/.test(lower) || /\b(que|por favor|gracias|dónde|cuánto|necesito|hola)\b/.test(lower)) return "es";
  if (/[àâçéèêëîïôùûüÿœ]/.test(lower) || /\b(bonjour|merci|combien|où|je|vous|avec|pour)\b/.test(lower)) return "fr";
  if (/\b(der|die|das|und|ich|bitte|danke|wo|wie viel)\b/.test(lower)) return "de";
  return "en";
}

export function t(key, language = getDefaultLanguage()) {
  const base = languageBase(language);
  return (DICTIONARY[base] && DICTIONARY[base][key]) || DICTIONARY.en[key] || key;
}

export function readLanguagePreference(storageKey, fallbackToBrowser = true) {
  try {
    const saved = localStorage.getItem(storageKey);
    if (saved && LANGUAGE_OPTIONS.some((item) => item.code === saved)) return saved;
  } catch {
    // Use browser detection when storage is unavailable.
  }
  return fallbackToBrowser ? getDefaultLanguage() : "en";
}

export function storeLanguagePreference(storageKey, code) {
  try {
    if (LANGUAGE_OPTIONS.some((item) => item.code === code)) localStorage.setItem(storageKey, code);
  } catch {
    // Keep the language in component state if storage is blocked.
  }
}
