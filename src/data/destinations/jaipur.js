// Approximate destination and place coordinates; all hotel policies and fees are illustrative DEMO values.
const demoListing = ["Demo listing"];

export default {
  id: "jaipur",
  city: "Jaipur",
  country: "India",
  lat: 26.9124,
  lon: 75.7873,
  timezone: "Asia/Kolkata",
  locale: "en-IN",
  currency: { code: "INR", symbol: "₹" },
  primaryLanguages: ["Hindi", "English"],
  hotel: {
    name: "Pink Courtyard Hotel (demo)",
    stars: 3,
    rooms: 40,
    checkIn: "14:00",
    checkOut: "11:00",
    phone: "Not configured (demo)",
    flexTiers: {
      early: [{ from: "10:00", fee: 1200 }, { from: "12:00", fee: 600 }],
      late: [{ until: "13:00", fee: 500 }, { until: "15:00", fee: 1200 }],
    },
  },
  places: [
    { id: "hawa-mahal", name: "Hawa Mahal", lat: 26.9239, lon: 75.8267, category: "heritage", tags: ["architecture", "history", "photo"], rainFriendly: false, lowCrowd: false },
    { id: "amber-fort", name: "Amber Fort", lat: 26.9855, lon: 75.8513, category: "heritage", tags: ["fort", "history", "views"], rainFriendly: false, lowCrowd: false },
    { id: "city-palace-jaipur", name: "City Palace", lat: 26.9258, lon: 75.8237, category: "museum", tags: ["royal-history", "architecture"], rainFriendly: true, lowCrowd: false },
    { id: "jantar-mantar-jaipur", name: "Jantar Mantar", lat: 26.9248, lon: 75.8246, category: "museum", tags: ["science", "heritage"], rainFriendly: false, lowCrowd: false },
    { id: "nahargarh-fort", name: "Nahargarh Fort", lat: 26.9373, lon: 75.8156, category: "viewpoint", tags: ["sunset", "views", "history"], rainFriendly: false, lowCrowd: true },
    { id: "jal-mahal", name: "Jal Mahal", lat: 26.9537, lon: 75.8463, category: "viewpoint", tags: ["lake", "photo"], rainFriendly: false, lowCrowd: false },
    { id: "albert-hall-museum", name: "Albert Hall Museum", lat: 26.9117, lon: 75.8197, category: "museum", tags: ["art", "culture", "indoors"], rainFriendly: true, lowCrowd: true },
    { id: "patrika-gate", name: "Patrika Gate", lat: 26.8258, lon: 75.8056, category: "architecture", tags: ["photo", "architecture"], rainFriendly: false, lowCrowd: true },
  ],
  experiences: [
    { id: "jaipur-walk", name: "Old City orientation walk", partner: "Pink City Walks (demo)", description: "A guided introduction to streets, architecture and local customs.", tags: demoListing },
    { id: "block-print", name: "Block-printing introduction", partner: "Rang Workshop Hosts (demo)", description: "Learn how hand-block printing works in a small-group session.", tags: demoListing },
    { id: "market-craft", name: "Craft market visit", partner: "Jaipur Craft Circle (demo)", description: "Explore craft traditions and questions to ask before purchasing.", tags: demoListing },
    { id: "cooking-jaipur", name: "Rajasthani cooking class", partner: "Home Table Jaipur (demo)", description: "A hosted introduction to regional home cooking.", tags: demoListing },
    { id: "heritage-photo", name: "Architecture photo walk", partner: "Amber Lens Guides (demo)", description: "A photography-focused walk around public heritage areas.", tags: demoListing },
    { id: "folk-music", name: "Folk music evening", partner: "Desert Notes Studio (demo)", description: "A small cultural performance proposal; schedule must be confirmed by staff.", tags: demoListing },
  ],
  dishes: [
    { id: "dal-baati-churma", name: "Dal baati churma", diet: ["vegetarian"], spiceLevel: "medium", whereToEat: "Ask the front desk for a currently open local restaurant; venue is not booked." },
    { id: "pyaaz-kachori", name: "Pyaaz kachori", diet: ["vegetarian"], spiceLevel: "medium", whereToEat: "Breakfast or snack counters; confirm oil and ingredients." },
    { id: "ghewar", name: "Ghewar", diet: ["vegetarian"], spiceLevel: "mild", whereToEat: "Sweet shops; ask about dairy and allergens." },
    { id: "laal-maas", name: "Laal maas", diet: ["meat"], spiceLevel: "hot", whereToEat: "Restaurants serving regional cuisine; ask about spice level." },
    { id: "ker-sangri", name: "Ker sangri", diet: ["vegetarian", "vegan"], spiceLevel: "medium", whereToEat: "Traditional Rajasthani menus; recipes vary by kitchen." },
    { id: "gatte-ki-sabzi", name: "Gatte ki sabzi", diet: ["vegetarian"], spiceLevel: "medium", whereToEat: "Thali restaurants; confirm dairy and gluten ingredients." },
    { id: "mirchi-vada", name: "Mirchi vada", diet: ["vegetarian", "vegan"], spiceLevel: "hot", whereToEat: "Snack stalls; ask how hot the filling is." },
    { id: "mawa-kachori", name: "Mawa kachori", diet: ["vegetarian"], spiceLevel: "mild", whereToEat: "Sweet shops; contains dairy in common recipes." },
  ],
  disruptionLabels: ["Transport delay (demo)", "Heavy rain (demo)", "Venue schedule change (demo)"],
  // DOUBLE-CHECK this local emergency number before travel.
  emergencyNumber: "112",
};
