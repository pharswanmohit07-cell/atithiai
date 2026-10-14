import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = [
  { name: "public/favicon.svg", type: "svg", maxBytes: 20 * 1024 },
  { name: "public/icons/icon-192.png", type: "png", maxBytes: 100 * 1024 },
  { name: "public/icons/icon-512.png", type: "png", maxBytes: 100 * 1024 }
];

const failures = [];
console.log("Required site icon check");
for (const asset of assets) {
  const filename = path.join(root, asset.name);
  try {
    const [metadata, buffer] = await Promise.all([stat(filename), readFile(filename)]);
    const valid = asset.type === "svg"
      ? buffer.toString("utf8").trimStart().startsWith("<svg") || buffer.toString("utf8").includes("<svg ")
      : buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!valid) {
      failures.push(asset.name + " has an invalid " + asset.type.toUpperCase() + " signature.");
      console.error("FAIL " + asset.name + " has an invalid signature.");
      continue;
    }
    if (metadata.size > asset.maxBytes) {
      failures.push(asset.name + " exceeds " + Math.round(asset.maxBytes / 1024) + " KB.");
      console.error("FAIL " + asset.name + " exceeds " + Math.round(asset.maxBytes / 1024) + " KB.");
      continue;
    }
    console.log("OK " + asset.name + " · " + (metadata.size / 1024).toFixed(1) + " KB");
  } catch (error) {
    failures.push(asset.name + " is missing or unreadable: " + error.message);
    console.error("FAIL " + asset.name + " is missing or unreadable.");
  }
}
if (failures.length) {
  console.error("Site icon check failed with " + failures.length + " issue(s).");
  process.exitCode = 1;
} else {
  console.log("All required site icons are present and within size limits.");
}
