const MAX_SUGGESTIONS = 20;

function safeField(value, limit) {
  return typeof value === "string" ? value.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, limit) : "";
}

function storageKey(destinationId) {
  return "atithi-local-suggestions:" + String(destinationId || "unknown").slice(0, 40);
}

export function readLocalSuggestions(destinationId) {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(destinationId)) || "[]");
    return Array.isArray(value)
      ? value.filter((item) => item && typeof item === "object" && item.destinationId === destinationId).slice(0, MAX_SUGGESTIONS)
      : [];
  } catch {
    return [];
  }
}

export function saveLocalSuggestion(destinationId, input = {}) {
  const name = safeField(input.name, 100);
  const area = safeField(input.area, 120);
  const details = safeField(input.details, 700);
  if (!destinationId || !name || !area || !details) return { ok: false, reason: "missing-fields" };
  const suggestion = {
    id: Date.now().toString(36),
    name,
    area,
    details,
    destinationId: String(destinationId).slice(0, 40),
    createdAt: new Date().toISOString(),
    status: "Thanks, a local curator would review this (demo)"
  };
  try {
    const current = readLocalSuggestions(destinationId);
    localStorage.setItem(storageKey(destinationId), JSON.stringify([suggestion, ...current].slice(0, MAX_SUGGESTIONS)));
    return { ok: true, suggestion };
  } catch {
    return { ok: false, reason: "storage-unavailable" };
  }
}
