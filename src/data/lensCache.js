// Cached examples are illustrative UI fallbacks, not current signs, menus or quotations.
export const LENS_SAMPLE_CACHE = {
  "sample-taxi": {
    id:"sample-taxi", imageType:"other", detectedLanguage:"English",
    detectedText:"Fare board example. Ask whether the fare includes waiting time and tolls.",
    translation:"Fare board example. Ask whether the fare includes waiting time and tolls.",
    summary:"An illustrative fare-board example. It is not a real provider quote.",
    visiblePrices:[], potentialConcerns:["Confirm what is included before agreeing to a fare."],
    fairPrice:{verdict:"Can't tell",roughRange:"",explanation:"No visible or verified comparison price is included in this cached example."},
    confidence:"medium"
  },
  "sample-menu": {
    id:"sample-menu", imageType:"menu", detectedLanguage:"English",
    detectedText:"Sample soup — vegetables and broth. Sample rice bowl — ingredients vary.",
    translation:"Sample soup — vegetables and broth. Sample rice bowl — ingredients vary.",
    summary:"Illustrative menu text only. No real menu or ingredient list is represented.",
    dishes:[
      {name:"Sample soup",explanation:"This is an illustrative dish name, not a restaurant listing.",dietGuess:"Unknown — confirm locally",spiceGuess:"Unknown — confirm locally"},
      {name:"Sample rice bowl",explanation:"This is an illustrative dish name, not a restaurant listing.",dietGuess:"Unknown — confirm locally",spiceGuess:"Unknown — confirm locally"}
    ],
    confidence:"medium"
  },
  "sample-service": {
    id:"sample-service", imageType:"other", detectedLanguage:"English",
    detectedText:"Sample notice: Please check local signs for current instructions.",
    translation:"Sample notice: Please check local signs for current instructions.",
    summary:"Illustrative notice text only. It is not a real venue notice or instruction.",
    confidence:"medium"
  }
};

export function getSeedLensResult(sampleId, language = "en") {
  const seed=LENS_SAMPLE_CACHE[sampleId];
  if(!seed)return null;
  return {
    ...seed,
    visiblePrices:[...(seed.visiblePrices||[])],
    dishes:(seed.dishes||[]).map((dish)=>({...dish})),
    fairPrice:seed.fairPrice?{...seed.fairPrice}:undefined,
    language,
    disclaimer:"AI estimate. Verify locally.",
    sampleId,
    source:"cached-demo-result"
  };
}
