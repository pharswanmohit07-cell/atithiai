// Seeded Price Lens examples are illustrative UI fallbacks, not market quotations.
export const LENS_SAMPLE_CACHE = {
  "sample-taxi": {
    id: "sample-taxi",
    imageType: "taxi",
    summary: "This demo fare-board example illustrates the questions to ask before agreeing to a ride. It is not a real provider quote.",
    visiblePrices: [],
    potentialConcerns: ["Confirm whether the fare is per vehicle or per guest.", "Ask which stops, tolls, waiting time and luggage are included."],
    nextStep: "Ask the provider or hotel team to confirm the total price and inclusions.",
    fairPrice: { verdict: "Can't tell", roughRange: "", explanation: "This example is a cached illustration and contains no verified local price information." },
  },
  "sample-menu": {
    id: "sample-menu",
    detectedLanguage: "English",
    detectedText: "Sample soup — vegetables, broth. Sample rice bowl — ingredients vary.",
    translation: "Sample soup — vegetables, broth. Sample rice bowl — ingredients vary.",
    confidence: "medium",
    dishes: [
      { name: "Sample soup", explanation: "Illustrative menu text only. Ingredients and allergens are not confirmed.", dietGuess: "Unknown — confirm with staff", spiceGuess: "Unknown — confirm with staff" },
      { name: "Sample rice bowl", explanation: "Illustrative menu text only. Ingredients and allergens are not confirmed.", dietGuess: "May be vegetarian; confirm with staff", spiceGuess: "Unknown — confirm with staff" }
    ],
    imageType: "menu",
    summary: "This demo menu example shows how to check portion sizes, inclusions and extra charges before ordering. It is not a real restaurant menu.",
    visiblePrices: [],
    potentialConcerns: ["Confirm portion size and whether taxes are included.", "Check allergens and preparation details with the kitchen."],
    nextStep: "Confirm the exact dish, ingredients and final bill with the venue.",
    fairPrice: { verdict: "Can't tell", roughRange: "", explanation: "This example contains no verified comparison prices." },
  },
  "sample-service": {
    id: "sample-service",
    imageType: "other",
    summary: "This demo notice-sign example illustrates how to read and translate a public notice. It is illustrative and not a real venue notice.",
    visiblePrices: [],
    potentialConcerns: ["Confirm that the notice is current with the venue.", "Ask hotel staff to explain any instruction that could affect your plans."],
    nextStep: "Ask the hotel to confirm the meaning and current relevance of this notice.",
    fairPrice: { verdict: "Can't tell", roughRange: "", explanation: "This example contains no verified comparison prices." },
  },
};

export function getSeedLensResult(sampleId, language = "English") {
  const seed = LENS_SAMPLE_CACHE[sampleId];
  if (!seed) return null;
  return {
    ...seed,
    visiblePrices: [...seed.visiblePrices],
    potentialConcerns: [...seed.potentialConcerns],
    fairPrice: { ...seed.fairPrice },
    language,
    disclaimer: "AI estimate only. This demo example is not a quote or tariff.",
    sampleId,
    source: "cached-demo-result",
  };
}
