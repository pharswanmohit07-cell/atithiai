const FLAG_KEY = "atithi-demo-use-cached-results";
const CACHE_PREFIX = "atithi-demo-response-v1:";

export function isCachedDemoMode() {
  try { return localStorage.getItem(FLAG_KEY) === "true"; } catch { return false; }
}

export function setCachedDemoMode(enabled) {
  try { localStorage.setItem(FLAG_KEY, enabled ? "true" : "false"); } catch { /* This preference is optional. */ }
}

function cacheKey(url, init = {}) {
  const method = String(init.method || "GET").toUpperCase();
  const body = typeof init.body === "string" ? init.body : "";
  const input = method + "|" + String(url) + "|" + body;
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash = Math.imul(hash ^ input.charCodeAt(index), 16777619);
  }
  return CACHE_PREFIX + (hash >>> 0).toString(36);
}

export async function demoFetch(url, init = {}) {
  const key = cacheKey(url, init);
  if (isCachedDemoMode()) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        return new Response(saved, {
          status: 200,
          headers: { "Content-Type": "application/json; charset=utf-8", "X-Atithi-Cache": "demo" }
        });
      }
    } catch { /* Fall through to the friendly caller-side fallback. */ }
    throw new Error("No cached demo result is available for this request.");
  }

  const response = await fetch(url, init);
  const contentType = response.headers.get("content-type") || "";
  if (response.ok && contentType.includes("application/json")) {
    try {
      const payload = await response.clone().json();
      const serialized = JSON.stringify(payload);
      if (serialized.length <= 100_000) localStorage.setItem(key, serialized);
    } catch { /* Caching is best-effort and never blocks the live request. */ }
  }
  return response;
}
