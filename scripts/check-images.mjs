import { stat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const imageDir = path.join(root, "public", "images");
const required = [
  { name: "hero-bg.webp", maxBytes: 400 * 1024 },
  { name: "jaipur.webp", maxBytes: 250 * 1024 },
  { name: "ubud.webp", maxBytes: 250 * 1024 },
  { name: "lisbon.webp", maxBytes: 250 * 1024 },
  { name: "hidden-gems.webp", maxBytes: 250 * 1024 },
  { name: "local-experiences.webp", maxBytes: 250 * 1024 },
  { name: "taste-local.webp", maxBytes: 250 * 1024 },
  { name: "empty-plan.webp", maxBytes: 250 * 1024 }
];

let warnings = 0;
console.log("Optional travel illustration asset check");
for (const image of required) {
  const filename = path.join(imageDir, image.name);
  try {
    const metadata = await stat(filename);
    const header = await readFile(filename, { flag: "r" }).then((buffer) => buffer.subarray(0, 12));
    const validWebp = header.length >= 12
      && header.toString("ascii", 0, 4) === "RIFF"
      && header.toString("ascii", 8, 12) === "WEBP";
    const kb = (metadata.size / 1024).toFixed(1);
    console.log((validWebp ? "FOUND " : "INVALID WEBP ") + image.name + " · " + kb + " KB");
    if (!validWebp) {
      console.warn("WARNING: invalid WebP header for " + image.name + ".");
      warnings++;
    }
    if (metadata.size > image.maxBytes) {
      console.warn("WARNING: " + image.name + " exceeds " + Math.round(image.maxBytes / 1024) + " KB.");
      warnings++;
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.warn("WARNING: missing " + image.name + " · add it to public/images/");
      warnings++;
    } else {
      console.warn("WARNING: unreadable " + image.name + " · " + error.message);
      warnings++;
    }
  }
}
console.log(warnings ? "Image check completed with " + warnings + " warning(s); optional assets do not fail lint/build." : "All optional image assets are valid WebP files within size budgets.");
