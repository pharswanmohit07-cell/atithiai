// Seeded Price Lens examples are illustrative UI fallbacks, not market quotations.
export const LENS_SAMPLE_CACHE = {
  "sample-taxi": {
    id: "sample-taxi",
    imageType: "taxi",
    summary: "This demo fare-board example illustrates the questions to ask before agreeing to a ride. It is not a real provider quote.",
    visiblePrices: [],
    potentialConcerns: ["Confirm whether the fare is per vehicle or per guest.", "Ask which stops, tolls, waiting time and luggage are included."],
    nextStep: "Ask the provider or hotel team to confirm the total price and inclusions.",
    fairPrice: { verdict: "Can't tell", roughRange: "", explanation: "This example contains no verified comparison prices." },
  },
  "sample-menu": {
    id: "sample-menu",
    imageType: "menu",
    summary: "This demo menu example shows how to check portion sizes, inclusions and extra charges before ordering. It is not a real restaurant menu.",
    visiblePrices: [],
    potentialConcerns: ["Confirm portion size and whether taxes are included.", "Check allergens and preparation details with the kitchen."],
    nextStep: "Confirm the exact dish, ingredients and final bill with the venue.",
    fairPrice: { verdict: "Can't tell", roughRange: "", explanation: "This example contains no verified comparison prices." },
  },
  "sample-service": {
    id: "sample-service",
    imageType: "service",
    summary: "This demo service quote illustrates how to request an itemised price before committing. It is not a real service provider quote.",
    visiblePrices: [],
    potentialConcerns: ["Ask what is included and which conditions can change the total.", "Check cancellation and timing terms with the provider."],
    nextStep: "Ask hotel staff to verify the provider, final price and conditions before agreeing.",
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
