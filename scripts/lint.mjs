import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { transform } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const extensions = new Set([".js", ".jsx", ".mjs"]);
const scanRoots = ["src", "api", "scripts"];
const candidates = [];
const failures = [];

async function walk(directory) {
  let entries;
  try { entries = await readdir(directory, { withFileTypes: true }); }
  catch (error) { if (error.code === "ENOENT") return; throw error; }
  for (const entry of entries) {
    if (["node_modules", "dist", ".git"].includes(entry.name)) continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(filename);
    else if (extensions.has(path.extname(filename))) candidates.push(filename);
  }
}
for (const folder of scanRoots) await walk(path.join(root, folder));
for (const filename of ["vite.config.js", "tailwind.config.js"]) {
  try { await access(path.join(root, filename)); candidates.push(path.join(root, filename)); }
  catch { /* Optional build configuration. */ }
}

for (const filename of candidates) {
  const source = await readFile(filename, "utf8");
  const relative = path.relative(root, filename);
  try {
    await transform(source, {
      loader: path.extname(filename) === ".jsx" ? "jsx" : "js",
      format: "esm",
      target: "es2022",
      sourcemap: false,
      sourcefile: relative
    });
  } catch (error) {
    failures.push(relative + ": " + error.message);
    continue;
  }
  const importPattern = /(?:\bfrom\s*|\bimport\s*)["']([^"']+)["']/g;
  for (const match of source.matchAll(importPattern)) {
    const specifier = match[1];
    if (!specifier.startsWith(".")) continue;
    const base = path.resolve(path.dirname(filename), specifier);
    const possibilities = [
      base,
      ...[".js", ".jsx", ".mjs", ".json", ".css"].map((extension) => base + extension),
      ...["index.js", "index.jsx", "index.mjs"].map((name) => path.join(base, name))
    ];
    let found = false;
    for (const candidate of possibilities) {
      try { await access(candidate); found = true; break; }
      catch { /* Try the next extension. */ }
    }
    if (!found) failures.push(relative + ': unresolved import "' + specifier + '"');
  }
}

const readSource = (filename) => readFile(path.join(root, filename), "utf8");
const app = await readSource("src/App.jsx");
const router = await readSource("src/AppRouter.jsx");
const main = await readSource("src/main.jsx");
const destinationContext = await readSource("src/context/DestinationContext.jsx");
const travelContext = await readSource("src/context/TravelContext.jsx");
const profileContext = await readSource("src/context/ProfileContext.jsx");
const profileTab = await readSource("src/components/ProfileTab.jsx");
const registry = await readSource("src/data/destinations/index.js");
const chat = await readSource("api/chat.js");
const intent = await readSource("api/intent.js");
const rankSource = await readSource("src/lib/rank.js");
const lens = await readSource("api/lens.js");
const planTab = await readSource("src/components/PlanTab.jsx");
const demoControls = await readSource("src/components/DemoControls.jsx");
const planApi = await readSource("api/plan.js");

const expectedTabs = ["home", "discover", "plan", "lens", "chat", "profile"];
const checks = [
  [expectedTabs.every((tab) => app.includes('id: "' + tab + '"')), "The six traveler tabs must be present."],
  [router.includes('path="/"') && router.includes("AtithiAI") && !router.includes('path="/admin"'), "The traveler app must be the root route without an admin route."],
  [main.includes("<ProfileProvider>") && main.includes("<TravelProvider>"), "Profile and travel contexts must be registered."],
  [profileContext.includes("localStorage") && profileContext.includes("JSON.parse") && profileContext.includes("onboardingComplete"), "Traveler profile must use safe persisted JSON and remember onboarding completion."],
  [profileTab.includes("ProfileOnboarding") && profileTab.includes("onTouchStart") && profileTab.includes("Skip for now"), "The profile onboarding must have four guided cards, swipe handling and skip."],
  [destinationContext.includes("api.open-meteo.com") && destinationContext.includes("destination.lat") && destinationContext.includes("destination.timezone"), "Live weather must use the selected destination pack."],
  [destinationContext.includes("Intl.NumberFormat") && destinationContext.includes("destination.currency.code"), "Currency formatting must use the selected pack."],
  [travelContext.includes("setItinerary([])") && travelContext.includes("makeWelcome(destination)"), "Destination changes must reset active itinerary and chat."],
  [registry.includes("jaipur") && registry.includes("ubud") && registry.includes("lisbon"), "The destination registry must expose all three demo packs."],
  [app.includes('/api/intent') && app.includes("rankPlaces") && app.includes("rankDishes") && app.includes("rankExperiences"), "Chat must parse intent and use deterministic ranking."],
  [intent.includes('req.method !== "POST"') && intent.includes('responseMimeType: "application/json"') && intent.includes("6500") && intent.includes("extractIntentFallback"), "Intent API must be POST-only, JSON mode, timed and have a friendly fallback."],
  [chat.includes("rankedItems") && chat.includes("wordCount(reply) > 70") && chat.includes("GEMINI_API_KEY") && chat.includes("const NO_RESULTS"), "Chat phrasing must be restricted to ranked items, under 70 words and safe when no items match."],
  [rankSource.includes("export function rankPlaces") && rankSource.includes("export function rankDishes") && rankSource.includes("export function rankExperiences") && rankSource.includes("reasons"), "All three pure ranking functions must return explainable reasons."],
  [lens.includes("MAX_IMAGE_BYTES") && lens.includes("safeJsonParse") && lens.includes("safe-fallback"), "Lens must preserve its image bound, safe parsing and fallback."],
  [app.includes('<PlanTab/>') && app.includes('removeItineraryStop={removeItineraryStop}'), "Plan tab must use the adaptive itinerary component and expose stop removal from Discover."],
  [planTab.includes("rankPlaces") && planTab.includes("rankDishes") && planTab.includes("rankExperiences") && planTab.includes("STOP_TARGETS") && planTab.includes("scheduleStops"), "Plan generation must use all deterministic rankers and pace-aware scheduling."],
  [planTab.includes('"Planned", "Done", "Skipped"') && planTab.includes("Share my day") && planTab.includes("Reset plan") && planTab.includes("rough estimate"), "Plan UI must have statuses, sharing, reset and labeled rough travel estimates."],
  [travelContext.includes("PLAN_PREFIX") && travelContext.includes("PLAN_META_PREFIX") && travelContext.includes("JSON.parse") && travelContext.includes("setActiveDisruption"), "Plan and disruption state must persist safely in the traveler context."],
  [demoControls.includes("Alt+R") && demoControls.includes("Simulate closure") && demoControls.includes("Simulate transport strike") && demoControls.includes("DEMO EVENT"), "Disruption simulations must be behind the demo query flag and tagged as demo."],
  [planTab.includes("api/plan") && planTab.includes("5000") && planTab.includes("split(/\\s+/") && planApi.includes('req.method !== "POST"') && planApi.includes("responseMimeType: \"application/json\"") && planApi.includes("4500"), "Plan advisory must be POST-only, limited to 45 words and use a short timeout with fallback."]
];
for (const [passed, message] of checks) if (!passed) failures.push(message);

const registryModule = await import(pathToFileURL(path.join(root, "src", "data", "destinations", "index.js")));
for (const pack of registryModule.DESTINATIONS) {
  const prefix = "destination pack " + pack.id;
  if (pack.places?.length !== 12) failures.push(prefix + " must include twelve places.");
  if (pack.experiences?.length !== 6) failures.push(prefix + " must include six experiences.");
  if (pack.dishes?.length !== 10) failures.push(prefix + " must include ten dishes.");
  if (!pack.currency?.code || !pack.locale || !pack.timezone || !pack.emergencyNumber) failures.push(prefix + " is missing locale data.");
  if ((pack.places || []).some((place) => !place.id || !place.name || !place.localStory || !place.category || !place.bestTime || !Array.isArray(place.tags))) failures.push(prefix + " contains an incomplete place.");
}

const intentModule = await import(pathToFileURL(path.join(root, "api", "intent.js")));
const lisbonPack = registryModule.DESTINATIONS.find((pack) => pack.id === "lisbon");
const jaipurPack = registryModule.DESTINATIONS.find((pack) => pack.id === "jaipur");
const selectedCurrencyBudget = intentModule.extractIntentFallback(
  "under " + lisbonPack.currency.symbol + "10",
  [],
  lisbonPack.currency.symbol
).filters.maxBudgetLocal;
const mismatchedCurrencyBudget = intentModule.extractIntentFallback(
  "under " + jaipurPack.currency.symbol + "10",
  [],
  lisbonPack.currency.symbol
).filters.maxBudgetLocal;
if (selectedCurrencyBudget !== 10 || mismatchedCurrencyBudget !== null) {
  failures.push("Intent fallback must interpret budget amounts only with the selected destination pack currency symbol.");
}

const rank = await import(pathToFileURL(path.join(root, "src", "lib", "rank.js")));
const veganResults = rank.rankDishes([
  { id: "vegan", name: "Vegan dish", diet: { veg: true, vegan: true, nonVeg: false, halal: null, glutenFree: true }, spiceLevel: 1, priceRangeLocal: [10, 20], durationMin: 15 },
  { id: "meat", name: "Meat dish", diet: { veg: false, vegan: false, nonVeg: true, halal: null, glutenFree: true }, spiceLevel: 2, priceRangeLocal: [10, 20], durationMin: 15 }
], { diet: "vegan", spiceTolerance: 2 }, {}, { freeMinutes: 60 });
if (veganResults.length !== 1 || veganResults[0].id !== "vegan") failures.push("Ranking hard constraint failed: vegan diet must exclude non-vegan dishes.");
const budgetResults = rank.rankPlaces([
  { id: "under-cap", name: "Affordable place", category: "nature", avgSpendLocal: 15, durationMin: 30, bestTime: "morning", tags: [] },
  { id: "over-cap", name: "Expensive place", category: "nature", avgSpendLocal: 50, durationMin: 30, bestTime: "morning", tags: [] }
], {}, { maxBudgetLocal: 20 }, { freeMinutes: 60 });
if (budgetResults.length !== 1 || budgetResults[0].id !== "under-cap") failures.push("Ranking hard constraint failed: explicit budget cap must exclude costly items.");
const indoorResults = rank.rankPlaces([
  { id: "inside", name: "Indoor gallery", category: "culture", indoor: true, durationMin: 30, avgSpendLocal: 10, bestTime: "any", tags: [] },
  { id: "outside", name: "Outdoor overlook", category: "viewpoint", indoor: false, durationMin: 30, avgSpendLocal: 0, bestTime: "any", tags: [] }
], {}, { indoorOnly: true }, { freeMinutes: 60 });
if (indoorResults.length !== 1 || indoorResults[0].id !== "inside") failures.push("Ranking hard constraint failed: indoor-only must exclude outdoor places.");
const durationResults = rank.rankExperiences([
  { id: "long", title: "Long experience", durationMin: 90, priceLocal: 50, category: "craft", suitsWho: [] },
  { id: "short", title: "Short experience", durationMin: 40, priceLocal: 10, category: "craft", suitsWho: [] }
], {}, {}, { freeMinutes: 60 });
if (durationResults.length !== 1 || durationResults[0].id !== "short" || !Array.isArray(durationResults[0].reasons) || typeof durationResults[0].score !== "number") {
  failures.push("Ranking hard constraint failed: item duration must fit available time and output score/reasons.");
}
const timeResults = rank.rankPlaces([
  { id: "morning", name: "Morning place", category: "nature", avgSpendLocal: 10, durationMin: 30, bestTime: "morning", tags: [] },
  { id: "unknown-time", name: "Unknown time", category: "nature", avgSpendLocal: 10, durationMin: 30, bestTime: "", tags: [] },
  { id: "evening", name: "Evening place", category: "nature", avgSpendLocal: 10, durationMin: 30, bestTime: "evening", tags: [] }
], {}, { timeOfDay: "morning" }, { freeMinutes: 60 });
if (timeResults.length !== 1 || timeResults[0].id !== "morning") {
  failures.push("Ranking hard constraint failed: explicit time windows must exclude mismatched and unknown-time items.");
}

if (failures.length) {
  console.error("Source checks failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exitCode = 1;
} else {
  console.log("Source checks passed for " + candidates.length + " JavaScript/JSX files, ranking examples and all three destination packs.");
}
