import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { transform } from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceExtensions = new Set([".js", ".jsx", ".mjs"]);
const checkedRoots = ["src", "api", "scripts"];
const rootFiles = ["vite.config.js", "tailwind.config.js"];
const candidates = [];

async function walk(directory) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute);
    else if (sourceExtensions.has(path.extname(entry.name))) candidates.push(absolute);
  }
}

for (const name of checkedRoots) await walk(path.join(root, name));
for (const name of rootFiles) {
  try {
    await access(path.join(root, name));
    candidates.push(path.join(root, name));
  } catch {
    // Optional root config; the main source tree is still validated.
  }
}

const failures = [];
for (const filename of candidates) {
  const source = await readFile(filename, "utf8");
  const relative = path.relative(root, filename);
  try {
    await transform(source, {
      loader: path.extname(filename) === ".jsx" ? "jsx" : "js",
      format: "esm",
      target: "es2022",
      sourcemap: false,
      sourcefile: relative,
    });
  } catch (error) {
    failures.push(`${relative}: ${error.message}`);
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
      ...["index.js", "index.jsx", "index.mjs"].map((name) => path.join(base, name)),
    ];
    let found = false;
    for (const possibility of possibilities) {
      try {
        await access(possibility);
        found = true;
        break;
      } catch {
        // Try the next conventional file extension.
      }
    }
    if (!found) failures.push(`${relative}: unresolved local import "${specifier}"`);
  }
}

const appPath = path.join(root, "src", "App.jsx");
const routerPath = path.join(root, "src", "AppRouter.jsx");
const planPath = path.join(root, "api", "plan.js");
const appSource = await readFile(appPath, "utf8");
const routerSource = await readFile(routerPath, "utf8");
const planSource = await readFile(planPath, "utf8");
const requiredChecks = [
  [appSource.includes("useAuth()"), "Guest/admin app must use AuthContext."],
  [!appSource.includes("GUEST."), "Hardcoded GUEST identity references must be removed."],
  [appSource.includes('fetch("/api/chat"'), "Concierge chat must call /api/chat."],
  [routerSource.includes('path="/staff-login"') && routerSource.includes('path="/admin"'), "Guest/staff routes must be registered."],
  [routerSource.includes("ProtectedRoute") && routerSource.includes("RoleRoute"), "Protected role guards must be present."],
  [planSource.includes("places.slice(0,15)") && planSource.includes("function verify("), "Itinerary generation must whitelist supplied places."],
];
for (const [passed, message] of requiredChecks) if (!passed) failures.push(message);

if (failures.length) {
  console.error("Atithi AI source checks failed:");
  for (const failure of failures) console.error(" - " + failure);
  process.exitCode = 1;
} else {
  console.log(`Atithi AI source checks passed for ${candidates.length} JavaScript/JSX files.`);
}
