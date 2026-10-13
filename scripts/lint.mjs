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
    else if (extensions.has(path.extname(entry.name))) candidates.push(filename);
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
    const possibilities = [base, ...[".js", ".jsx", ".mjs", ".json", ".css"].map((ext) => base + ext), ...["index.js", "index.jsx", "index.mjs"].map((item) => path.join(base, item))];
    let found = false;
    for (const candidate of possibilities) {
      try { await access(candidate); found = true; break; }
      catch { /* Try the next extension. */ }
    }
    if (!found) failures.push(relative + ': unresolved import "' + specifier + '"');
  }
}

const app = await readFile(path.join(root, "src", "App.jsx"), "utf8");
const router = await readFile(path.join(root, "src", "AppRouter.jsx"), "utf8");
const context = await readFile(path.join(root, "src", "context", "DestinationContext.jsx"), "utf8");
const travel = await readFile(path.join(root, "src", "context", "TravelContext.jsx"), "utf8");
const registry = await readFile(path.join(root, "src", "data", "destinations", "index.js"), "utf8");
const chat = await readFile(path.join(root, "api", "chat.js"), "utf8");
const lens = await readFile(path.join(root, "api", "lens.js"), "utf8");
const expectedTabs = ["home", "discover", "plan", "lens", "chat", "profile"];
const checks = [
  [expectedTabs.every((tab) => app.includes('id: "' + tab + '"')), "The six traveler tabs must be present."],
  [router.includes('path="/"') && router.includes("AtithiAI"), "The traveler app must be the root route."],
  [context.includes("useDestination") && context.includes("api.open-meteo.com"), "Destination state must use pack coordinates for live weather."],
  [context.includes("Intl.NumberFormat") && context.includes("destination.currency.code"), "Currency formatting must use the selected pack."],
  [travel.includes("setItinerary([])") && travel.includes("makeWelcome(destination)"), "Destination changes must reset travel state."],
  [registry.includes("jaipur") && registry.includes("ubud") && registry.includes("lisbon"), "The destination registry must expose all three packs."],
  [chat.includes("GEMINI_API_KEY") && chat.includes("destination.places") && chat.includes("local-fallback"), "Chat must use the server key, selected pack and fallback."],
  [lens.includes("MAX_IMAGE_BYTES") && lens.includes("safeJsonParse") && lens.includes("safe-fallback"), "Lens must preserve the image bound, safe parsing and fallback."]
];
for (const [passed, message] of checks) if (!passed) failures.push(message);

const modulePath = pathToFileURL(path.join(root, "src", "data", "destinations", "index.js"));
const packModule = await import(modulePath);
for (const pack of packModule.DESTINATIONS) {
  const prefix = "destination pack " + pack.id;
  if (pack.places?.length !== 12) failures.push(prefix + " must include twelve places.");
  if (pack.experiences?.length !== 6) failures.push(prefix + " must include six experiences.");
  if (pack.dishes?.length !== 10) failures.push(prefix + " must include ten dishes.");
  if (!pack.currency?.code || !pack.locale || !pack.timezone || !pack.emergencyNumber) failures.push(prefix + " is missing locale data.");
  if ((pack.places || []).some((place) => !place.id || !place.name || !place.localStory || !place.category || !place.bestTime || !Array.isArray(place.tags))) failures.push(prefix + " contains an incomplete place.");
}
if (failures.length) {
  console.error("Source checks failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exitCode = 1;
} else {
  console.log("Source checks passed for " + candidates.length + " JavaScript/JSX files and all three destination packs.");
}
