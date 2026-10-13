// Approximate destination and place coordinates; all hotel policies and fees are illustrative DEMO values.
const demoListing = ["Demo listing"];

const destination = {
  id: "ubud",
  city: "Ubud",
  country: "Indonesia",
  lat: -8.5069,
  lon: 115.2625,
  timezone: "Asia/Makassar",
  locale: "id-ID",
  currency: { code: "IDR", symbol: "Rp" },
  // Illustrative only: these demo assumptions estimate commissions on approved experience inquiries.
  demoCommercials: {"averageExperienceBookingValue":350000,"estimatedCommissionRate":0.12},
  primaryLanguages: ["Indonesian", "Balinese", "English"],
  hotel: {
    name: "Riverside Palm Hotel (demo)",
    stars: 3,
    rooms: 40,
    checkIn: "14:00",
    checkOut: "11:00",
    phone: "Not configured (demo)",
    flexTiers: {
      early: [{ from: "10:00", fee: 150000 }, { from: "12:00", fee: 75000 }],
      late: [{ until: "13:00", fee: 60000 }, { until: "15:00", fee: 150000 }],
    },
    flexCutoffs: { earlyEarliest: "10:00", lateLatest: "15:00" },
  },
  places: [
    { id: "ubud-monkey-forest", name: "Sacred Monkey Forest Sanctuary", lat: -8.5188, lon: 115.2580, category: "nature", tags: ["forest", "wildlife", "walk"], rainFriendly: false, lowCrowd: false },
    { id: "ubud-palace", name: "Ubud Palace", lat: -8.5069, lon: 115.2625, category: "heritage", tags: ["architecture", "culture"], rainFriendly: false, lowCrowd: false },
    { id: "tegalalang-terraces", name: "Tegallalang Rice Terraces", lat: -8.4312, lon: 115.2792, category: "nature", tags: ["landscape", "photography"], rainFriendly: false, lowCrowd: false },
    { id: "goa-gajah", name: "Goa Gajah", lat: -8.5235, lon: 115.2867, category: "heritage", tags: ["archaeology", "culture"], rainFriendly: true, lowCrowd: true },
    { id: "campuhan-ridge", name: "Campuhan Ridge Walk", lat: -8.4994, lon: 115.2542, category: "nature", tags: ["walking", "views"], rainFriendly: false, lowCrowd: true },
    { id: "saraswati-temple", name: "Saraswati Temple", lat: -8.5070, lon: 115.2620, category: "heritage", tags: ["temple", "architecture"], rainFriendly: false, lowCrowd: false },
    { id: "tirta-empul", name: "Tirta Empul Temple", lat: -8.4150, lon: 115.3150, category: "heritage", tags: ["temple", "culture"], rainFriendly: false, lowCrowd: false },
    { id: "bali-bird-park", name: "Bali Bird Park", lat: -8.6001, lon: 115.2512, category: "nature", tags: ["wildlife", "family"], rainFriendly: true, lowCrowd: true },
  ],
  experiences: [
    { id: "ubud-culture-walk", name: "Ubud culture walk", partner: "Rice Path Hosts (demo)", description: "A hosted walk introducing local art and customs.", tags: demoListing },
    { id: "batik-workshop", name: "Textile craft workshop", partner: "Island Loom Studio (demo)", description: "An introductory session about regional textile techniques.", tags: demoListing },
    { id: "cooking-bali", name: "Balinese cooking class", partner: "Coconut Table (demo)", description: "A hands-on introduction to selected local recipes.", tags: demoListing },
    { id: "rice-terrace-walk", name: "Rice terrace nature walk", partner: "Green Steps Ubud (demo)", description: "A guided outdoor route proposal; weather and access must be checked.", tags: demoListing },
    { id: "wood-carving", name: "Wood-carving introduction", partner: "Ubud Craft Circle (demo)", description: "Learn about carving styles and materials from a proposed host.", tags: demoListing },
    { id: "dance-evening", name: "Traditional dance evening", partner: "Island Stage Hosts (demo)", description: "A cultural event proposal; date, venue and fees require confirmation.", tags: demoListing },
  ],
  dishes: [
    { id: "nasi-campur", name: "Nasi campur", diet: ["varies"], spiceLevel: "medium", whereToEat: "Indonesian restaurants; ask which sides are included." },
    { id: "gado-gado", name: "Gado-gado", diet: ["vegetarian"], spiceLevel: "mild", whereToEat: "Warungs serving Indonesian salads; confirm shrimp paste in sauce." },
    { id: "nasi-goreng", name: "Nasi goreng", diet: ["varies"], spiceLevel: "medium", whereToEat: "Local cafés and warungs; ask about egg, seafood and sauces." },
    { id: "sate-lilit", name: "Sate lilit", diet: ["fish", "meat"], spiceLevel: "medium", whereToEat: "Balinese restaurants; ask the host which protein is used." },
    { id: "bebek-betutu", name: "Bebek betutu", diet: ["meat"], spiceLevel: "hot", whereToEat: "Restaurants serving Balinese cooking; preparation can take time." },
    { id: "lawar", name: "Lawar", diet: ["varies"], spiceLevel: "hot", whereToEat: "Traditional food stalls; ingredients can include meat and coconut." },
    { id: "jaja-bali", name: "Jaja Bali", diet: ["vegetarian"], spiceLevel: "mild", whereToEat: "Market snack stalls; check ingredients and food handling." },
    { id: "tipat-cantok", name: "Tipat cantok", diet: ["vegetarian"], spiceLevel: "medium", whereToEat: "Local food stalls; confirm whether the sauce contains peanuts." },
  ],
  disruptionLabels: ["Transport delay (demo)", "Heavy rain (demo)", "Venue schedule change (demo)"],
  // DOUBLE-CHECK this local emergency number before travel.
  emergencyNumber: "112",
};

// Staff-curated demo metadata; prices and durations are illustrative estimates, not provider quotes.
const experienceDetails = {
  "ubud-culture-walk": {
    "durationMinutes": 90,
    "price": 180000,
    "category": "walking tour",
    "rainFriendly": false,
    "lowCrowd": true,
    "suits": [
      "family",
      "couple",
      "solo",
      "seniors"
    ],
    "hostNote": "Ayu at our front desk recommends this gentle introduction to Ubud's art and local customs."
  },
  "batik-workshop": {
    "durationMinutes": 120,
    "price": 250000,
    "category": "craft workshop",
    "rainFriendly": true,
    "lowCrowd": true,
    "suits": [
      "family",
      "couple",
      "solo",
      "seniors"
    ],
    "hostNote": "Ayu likes this indoor, hands-on option for a relaxed rainy afternoon."
  },
  "cooking-bali": {
    "durationMinutes": 150,
    "price": 320000,
    "category": "food workshop",
    "rainFriendly": true,
    "lowCrowd": true,
    "suits": [
      "family",
      "couple",
      "solo"
    ],
    "hostNote": "Our team recommends asking about ingredients before joining this local-cooking introduction."
  },
  "rice-terrace-walk": {
    "durationMinutes": 180,
    "price": 220000,
    "category": "nature walk",
    "rainFriendly": false,
    "lowCrowd": false,
    "suits": [
      "couple",
      "solo",
      "friends"
    ],
    "hostNote": "Ayu recommends checking rain and trail conditions with the hotel before considering this walk."
  },
  "wood-carving": {
    "durationMinutes": 120,
    "price": 280000,
    "category": "craft workshop",
    "rainFriendly": true,
    "lowCrowd": true,
    "suits": [
      "couple",
      "solo",
      "seniors"
    ],
    "hostNote": "Our front desk team likes this quieter craft-focused idea; details and provider still need checking."
  },
  "dance-evening": {
    "durationMinutes": 100,
    "price": 200000,
    "category": "performance",
    "rainFriendly": true,
    "lowCrowd": false,
    "suits": [
      "family",
      "couple",
      "solo",
      "seniors"
    ],
    "hostNote": "Ayu suggests checking the date and venue with us before planning an evening around it."
  }
};
const dishDetails = {
  "nasi-campur": {
    "price": 45000,
    "dietaryTags": [],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "gado-gado": {
    "price": 35000,
    "dietaryTags": [
      "vegetarian"
    ],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": false
  },
  "nasi-goreng": {
    "price": 40000,
    "dietaryTags": [],
    "timeOfDay": [
      "breakfast",
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "sate-lilit": {
    "price": 55000,
    "dietaryTags": [
      "non-veg"
    ],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "bebek-betutu": {
    "price": 75000,
    "dietaryTags": [
      "non-veg"
    ],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "lawar": {
    "price": 50000,
    "dietaryTags": [
      "non-veg"
    ],
    "timeOfDay": [
      "lunch",
      "dinner"
    ],
    "warmInRain": true
  },
  "jaja-bali": {
    "price": 18000,
    "dietaryTags": [
      "vegetarian"
    ],
    "timeOfDay": [
      "snack",
      "anytime"
    ],
    "warmInRain": false
  },
  "tipat-cantok": {
    "price": 30000,
    "dietaryTags": [
      "vegetarian"
    ],
    "timeOfDay": [
      "lunch",
      "snack"
    ],
    "warmInRain": false
  }
};
destination.experiences = destination.experiences.map((experience) => ({ ...experience, ...(experienceDetails[experience.id] || {}) }));
destination.dishes = destination.dishes.map((dish) => ({ ...dish, ...(dishDetails[dish.id] || {}), dietaryTags: dishDetails[dish.id]?.dietaryTags || [], halal: false, glutenAware: false }));
export default destination;
