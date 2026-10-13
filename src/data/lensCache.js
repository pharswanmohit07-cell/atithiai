// Illustrative, cached demo interpretations. These are not live readings of the sample images.
export const LENS_SAMPLE_CACHE = {
  "sample-menu": {
    whatIsThis: "A sample menu with familiar dishes and a few ingredient details to confirm.",
    detectedLanguage: "English",
    translation: "Vegetable thali — rice, lentils, seasonal vegetables and flatbread. Ask whether dairy is used and whether the thali includes refills.",
    explanation: "A thali is a meal served with several items together. Components and portion sizes vary by restaurant; names alone cannot confirm every ingredient.",
    dishes: [
      { name: "Vegetable thali", explanation: "A set meal that may include rice, dal, vegetables, and roti. Ask about ghee, curd, and shared cooking surfaces.", dietGuess: "Vegetarian-looking; confirm ingredients", spiceGuess: "Mild to hot; varies by kitchen" },
      { name: "Aloo paratha", explanation: "Flatbread filled with potato, often served with curd or pickle. It may be cooked with ghee or butter.", dietGuess: "May contain dairy; ask staff", spiceGuess: "Usually mild to medium" },
      { name: "Masala chai", explanation: "Tea simmered with milk and spices in many local preparations; recipes differ.", dietGuess: "Usually contains dairy unless requested otherwise", spiceGuess: "Aromatic, not usually chilli-hot" }
    ],
    tips: ["Ask which ingredients are included rather than relying on the dish name.", "If you have an allergy, explain it clearly and ask about shared cookware."],
    confidence: "medium"
  },
  "sample-sign": {
    whatIsThis: "A generic local notice sign with an instruction for visitors.",
    detectedLanguage: "English",
    translation: "Please follow the marked entrance and keep the passage clear. Ask staff if any instruction is unclear.",
    explanation: "Signs may reflect site-specific customs, crowd flow, or safety rules. The meaning depends on where the sign is posted, so treat this example as a demonstration rather than a real local instruction.",
    tips: ["Follow current signs at the actual site.", "Ask before photographing people or restricted areas."],
    confidence: "low"
  },
  "sample-transport": {
    whatIsThis: "A generic local transport board showing a route and a fare field.",
    detectedLanguage: "English",
    translation: "Check the route, destination, and fare conditions before boarding. The sample does not establish an official or current rate.",
    explanation: "Local transport fares may depend on route, vehicle type, distance, time, luggage, and whether the price is per person or per vehicle. A board alone may not explain every extra charge.",
    tips: ["Confirm the destination and total price before starting.", "Ask whether the amount is per passenger or for the whole vehicle.", "Check whether tolls, luggage, or waiting time cost extra."],
    transport: { summary: "Confirm route, vehicle, inclusions, and total amount with the operator.", priceNote: null, verdict: "Can't tell" },
    confidence: "low"
  }
};

export function getSeedLensResult(sampleId) {
  const result = LENS_SAMPLE_CACHE[sampleId];
  if (!result) return null;
  return {
    ...result,
    tips: [...(result.tips || [])],
    dishes: result.dishes ? result.dishes.map((dish) => ({ ...dish })) : undefined,
    transport: result.transport ? { ...result.transport } : undefined
  };
}
