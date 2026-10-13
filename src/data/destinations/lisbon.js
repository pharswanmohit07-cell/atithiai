// Approximate destination and place coordinates; all hotel policies and fees are illustrative DEMO values.
const demoListing = ["Demo listing"];

const destination = {
  id: "lisbon",
  city: "Lisbon",
  country: "Portugal",
  lat: 38.7223,
  lon: -9.1393,
  timezone: "Europe/Lisbon",
  locale: "pt-PT",
  currency: { code: "EUR", symbol: "€" },
  // Illustrative only: these demo assumptions estimate commissions on approved experience inquiries.
  demoCommercials: {"averageExperienceBookingValue":40,"estimatedCommissionRate":0.12},
  primaryLanguages: ["Portuguese", "English"],
  hotel: {
    name: "Tile & Tram Hotel (demo)",
    stars: 3,
    rooms: 40,
    checkIn: "14:00",
    checkOut: "11:00",
    phone: "Not configured (demo)",
    flexTiers: {
      early: [{ from: "10:00", fee: 25 }, { from: "12:00", fee: 12 }],
      late: [{ until: "13:00", fee: 10 }, { until: "15:00", fee: 25 }],
    },
    flexCutoffs: { earlyEarliest: "10:00", lateLatest: "15:00" },
  },
  places: [
    { id: "belem-tower", name: "Belém Tower", lat: 38.6916, lon: -9.2160, category: "heritage", tags: ["history", "architecture", "river"], rainFriendly: false, lowCrowd: false },
    { id: "jeronimos-monastery", name: "Jerónimos Monastery", lat: 38.6979, lon: -9.2067, category: "heritage", tags: ["history", "architecture"], rainFriendly: true, lowCrowd: false },
    { id: "praca-do-comercio", name: "Praça do Comércio", lat: 38.7076, lon: -9.1365, category: "public-square", tags: ["river", "architecture", "walking"], rainFriendly: false, lowCrowd: false },
    { id: "sao-jorge-castle", name: "São Jorge Castle", lat: 38.7139, lon: -9.1335, category: "heritage", tags: ["history", "views"], rainFriendly: false, lowCrowd: false },
    { id: "lisbon-oceanarium", name: "Lisbon Oceanarium", lat: 38.7636, lon: -9.0939, category: "museum", tags: ["marine-life", "family", "indoors"], rainFriendly: true, lowCrowd: true },
    { id: "lx-factory", name: "LX Factory", lat: 38.7038, lon: -9.1781, category: "market", tags: ["design", "shops", "food"], rainFriendly: true, lowCrowd: false },
    { id: "time-out-market", name: "Time Out Market Lisboa", lat: 38.7063, lon: -9.1450, category: "food", tags: ["food", "indoors"], rainFriendly: true, lowCrowd: false },
    { id: "senhora-do-monte", name: "Miradouro da Senhora do Monte", lat: 38.7192, lon: -9.1326, category: "viewpoint", tags: ["views", "sunset"], rainFriendly: false, lowCrowd: true },
  ],
  experiences: [
    { id: "lisbon-neighborhood-walk", name: "Neighborhood orientation walk", partner: "Seven Hills Walks (demo)", description: "A hosted introduction to local streets, viewpoints and customs.", tags: demoListing },
    { id: "azulejo-workshop", name: "Tile-painting workshop", partner: "Blue Tile Studio (demo)", description: "A craft session inspired by traditional ceramic tile patterns.", tags: demoListing },
    { id: "pastel-workshop", name: "Baking demonstration", partner: "Lisbon Oven Hosts (demo)", description: "An introductory baking session; recipes and allergens require confirmation.", tags: demoListing },
    { id: "fado-introduction", name: "Fado music introduction", partner: "Evening Notes Lisboa (demo)", description: "A proposed music experience; venue, schedule and fees require confirmation.", tags: demoListing },
    { id: "market-food-tour", name: "Market food discovery", partner: "Table & Tide Guides (demo)", description: "A food-focused walk with diet and allergy questions checked beforehand.", tags: demoListing },
    { id: "river-photo-walk", name: "Riverside photo walk", partner: "Atlantic Frame Walks (demo)", description: "A photography walk proposal, subject to weather and access.", tags: demoListing },
  ],
  dishes: [
    { id: "bacalhau-a-bras", name: "Bacalhau à Brás", diet: ["fish"], spiceLevel: "mild", whereToEat: "Portuguese restaurants; ask about fish and egg." },
    { id: "caldo-verde", name: "Caldo verde", diet: ["varies"], spiceLevel: "mild", whereToEat: "Cafés and traditional restaurants; confirm sausage and stock." },
    { id: "sardinhas-assadas", name: "Sardinhas assadas", diet: ["fish"], spiceLevel: "mild", whereToEat: "Seafood restaurants; seasonal availability varies." },
    { id: "bifana", name: "Bifana", diet: ["meat"], spiceLevel: "mild", whereToEat: "Sandwich cafés; ask about sauces and bread allergens." },
    { id: "pastel-de-nata", name: "Pastel de nata", diet: ["vegetarian"], spiceLevel: "mild", whereToEat: "Bakeries; commonly contains dairy, egg and gluten." },
    { id: "arroz-de-marisco", name: "Arroz de marisco", diet: ["seafood"], spiceLevel: "medium", whereToEat: "Seafood restaurants; confirm shellfish ingredients." },
    { id: "acorda", name: "Açorda", diet: ["varies"], spiceLevel: "mild", whereToEat: "Portuguese restaurants; recipes may contain egg, fish or seafood." },
    { id: "feijoada", name: "Feijoada", diet: ["varies"], spiceLevel: "medium", whereToEat: "Traditional restaurants; ask which meats are included." },
  ],
  disruptionLabels: ["Transport delay (demo)", "Heavy rain (demo)", "Venue schedule change (demo)"],
  // DOUBLE-CHECK this local emergency number before travel.
  emergencyNumber: "112",
};

// Staff-curated demo metadata; prices and durations are illustrative estimates, not provider quotes.
const experienceDetails = {
  "lisbon-neighborhood-walk": {
    "durationMinutes": 100,
    "price": 22,
    "category": "walking tour",
    "rainFriendly": false,
    "lowCrowd": false,
    "suits": [
      "family",
      "couple",
      "solo",
      "seniors"
    ],
    "hostNote": "Maria from our front desk recommends this for getting oriented to the hills and neighbourhoods."
  },
  "azulejo-workshop": {
    "durationMinutes": 120,
    "price": 35,
    "category": "craft workshop",
    "rainFriendly": true,
    "lowCrowd": true,
    "suits": [
      "family",
      "couple",
      "solo",
      "seniors"
    ],
    "hostNote": "Our team likes this indoor craft idea for guests who want a slower, creative afternoon."
  },
  "pastel-workshop": {
    "durationMinutes": 90,
    "price": 28,
    "category": "food workshop",
    "rainFriendly": true,
    "lowCrowd": true,
    "suits": [
      "family",
      "couple",
      "solo"
    ],
    "hostNote": "Maria suggests confirming ingredients and allergens with the provider before considering this baking demo."
  },
  "fado-introduction": {
    "durationMinutes": 100,
    "price": 30,
    "category": "music",
    "rainFriendly": true,
    "lowCrowd": false,
    "suits": [
      "couple",
      "solo",
      "seniors"
    ],
    "hostNote": "Our front desk team recommends checking the event date, venue and final price first."
  },
  "market-food-tour": {
    "durationMinutes": 120,
    "price": 32,
    "category": "food tour",
    "rainFriendly": true,
    "lowCrowd": false,
    "suits": [
      "couple",
      "solo",
      "friends"
    ],
    "hostNote": "Maria recommends sharing dietary requirements before anyone makes a plan for this food-focused walk."
  },
  "river-photo-walk": {
    "durationMinutes": 90,
    "price": 24,
    "category": "photography",
    "rainFriendly": false,
    "lowCrowd": true,
    "suits": [
      "couple",
      "solo",
      "friends"
    ],
    "hostNote": "Our team likes this photo-walk idea in fair weather; confirm the route and schedule first."
  }
};
const dishDetails = {
  "bacalhau-a-bras": {
    "price": 15,
    "dietaryTags": [
      "non-veg"
    ],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "caldo-verde": {
    "price": 7,
    "dietaryTags": [],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "sardinhas-assadas": {
    "price": 16,
    "dietaryTags": [
      "non-veg"
    ],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "bifana": {
    "price": 8,
    "dietaryTags": [
      "non-veg"
    ],
    "timeOfDay": [
      "breakfast",
      "lunch",
      "snack"
    ],
    "warmInRain": true
  },
  "pastel-de-nata": {
    "price": 2,
    "dietaryTags": [
      "vegetarian"
    ],
    "timeOfDay": [
      "breakfast",
      "snack",
      "anytime"
    ],
    "warmInRain": false
  },
  "arroz-de-marisco": {
    "price": 20,
    "dietaryTags": [
      "non-veg"
    ],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "acorda": {
    "price": 13,
    "dietaryTags": [],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "feijoada": {
    "price": 14,
    "dietaryTags": [],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  }
};
destination.experiences = destination.experiences.map((experience) => ({ ...experience, ...(experienceDetails[experience.id] || {}) }));
destination.dishes = destination.dishes.map((dish) => ({ ...dish, ...(dishDetails[dish.id] || {}), dietaryTags: dishDetails[dish.id]?.dietaryTags || [], halal: false, glutenAware: false }));
export default destination;
