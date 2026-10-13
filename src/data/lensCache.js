// Seeded, illustrative fallbacks used only when a sample-photo scan cannot complete.
// These are estimates for demo UX, not official rates or current market quotations.
export const LENS_SAMPLE_CACHE = {
  "sample-taxi": {
    id: "sample-taxi",
    imageType: "taxi",
    language: "en",
    summary: "The sample fare board appears to list fares between corridor towns. The listed amounts are readable, but inclusions, vehicle type, return fare and waiting charges are not shown.",
    visiblePrices: ["Rishikesh to Devprayag — ₹1,200", "Rishikesh to Srinagar — ₹1,500", "Rishikesh to Rudraprayag — ₹2,200"],
    potentialConcerns: ["Ask whether the amount is per vehicle or per passenger.", "Confirm tolls, parking, return travel and waiting charges before agreeing."],
    nextStep: "Ask the driver to confirm the destination, inclusions and total amount before the trip starts.",
    fairPrice: { verdict: "Can't tell", roughRange: "₹900–₹1,600 for the example leg; varies by vehicle, season and inclusions", explanation: "The image alone cannot establish a fair fare; the range is illustrative only." },
  },
  "sample-menu": {
    id: "sample-menu",
    imageType: "menu",
    language: "en",
    summary: "The sample menu appears to list a veg thali at ₹180, aloo paratha at ₹90, tea at ₹30 and rajma rice at ₹140. Taxes, portion sizes and serving details are not visible.",
    visiblePrices: ["Veg thali — ₹180", "Aloo paratha (2 pcs) — ₹90", "Tea — ₹30", "Rajma rice — ₹140"],
    potentialConcerns: ["Ask whether taxes are included.", "Confirm portion size and any extra charges before ordering."],
    nextStep: "Confirm the item, serving size and final bill amount with the shop before ordering.",
    fairPrice: { verdict: "Looks fair", roughRange: "About ₹150–₹250 for a simple veg thali in many casual eateries; local prices vary", explanation: "This is a broad, non-official typical-range estimate, not a verified local price." },
  },
  "sample-temple": {
    id: "sample-temple",
    imageType: "temple",
    language: "en",
    summary: "The sample notice appears to ask visitors to follow entry instructions, remove leather items and cover their head where required. It does not show a clear fee or price.",
    visiblePrices: [],
    potentialConcerns: ["Ask temple staff about any entry, photography or offering rules that are unclear.", "Follow current posted instructions at the site."],
    nextStep: "Read the onsite notice and ask temple staff if a rule or fee is unclear.",
    fairPrice: { verdict: "Can't tell", roughRange: null, explanation: "No clear price is visible in this sample, so no price range is estimated." },
    etiquetteNote: "Follow posted customs: remove leather items and cover your head where required. Practices vary by temple; ask staff if unsure.",
  },
};

export function getSeedLensResult(sampleId, language = "en") {
  const seed = LENS_SAMPLE_CACHE[sampleId];
  if (!seed) return null;
  const result = { ...seed, visiblePrices: [...seed.visiblePrices], potentialConcerns: [...seed.potentialConcerns], fairPrice: { ...seed.fairPrice } };
  if (language !== "hi") return result;
  const hindi = {
    "sample-taxi": {
      summary: "नमूना किराया बोर्ड में पहाड़ी क्षेत्र के कस्बों के बीच किराये दिखते हैं। राशि पढ़ी जा सकती है, लेकिन वाहन का प्रकार, वापसी और प्रतीक्षा शुल्क स्पष्ट नहीं हैं।",
      potentialConcerns: ["पूछें कि किराया पूरे वाहन के लिए है या प्रति यात्री।", "यात्रा से पहले टोल, पार्किंग, वापसी और प्रतीक्षा शुल्क की पुष्टि करें।"],
      nextStep: "यात्रा शुरू होने से पहले चालक से गंतव्य, शामिल खर्च और कुल राशि की पुष्टि करें।",
      explanation: "केवल तस्वीर से उचित किराया तय नहीं किया जा सकता; यह केवल एक सांकेतिक अनुमान है।",
    },
    "sample-menu": {
      summary: "नमूना मेन्यू में वेज थाली ₹180, आलू पराठा ₹90, चाय ₹30 और राजमा चावल ₹140 दिखते हैं। टैक्स और मात्रा स्पष्ट नहीं हैं।",
      potentialConcerns: ["पूछें कि टैक्स शामिल है या नहीं।", "ऑर्डर से पहले परोसने की मात्रा और अतिरिक्त शुल्क की पुष्टि करें।"],
      nextStep: "ऑर्डर करने से पहले दुकान से आइटम, मात्रा और अंतिम बिल की पुष्टि करें।",
      explanation: "यह सामान्य, गैर-आधिकारिक अनुमान है; स्थानीय कीमत सत्यापित नहीं है।",
    },
    "sample-temple": {
      summary: "नमूना सूचना-पट पर प्रवेश निर्देश मानने, जहाँ आवश्यक हो चमड़े की वस्तुएँ हटाने और सिर ढकने की बात दिखती है। कोई स्पष्ट शुल्क नहीं दिखता।",
      potentialConcerns: ["प्रवेश, फोटोग्राफी या चढ़ावे के नियम स्पष्ट न हों तो मंदिर कर्मचारियों से पूछें।", "स्थल पर लगे वर्तमान निर्देशों का पालन करें।"],
      nextStep: "स्थल पर सूचना पढ़ें और नियम या शुल्क अस्पष्ट हो तो मंदिर कर्मचारियों से पूछें।",
      explanation: "इस नमूने में कोई स्पष्ट कीमत नहीं दिखती, इसलिए कोई मूल्य-सीमा नहीं दी गई है।",
    },
  }[sampleId];
  if (hindi) {
    result.language = "hi";
    result.summary = hindi.summary;
    result.potentialConcerns = hindi.potentialConcerns;
    result.nextStep = hindi.nextStep;
    result.fairPrice.explanation = hindi.explanation;
  }
  return result;
}
