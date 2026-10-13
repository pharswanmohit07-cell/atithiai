export function isBodyTooLarge(req, body, maxBytes) {
  const declaredLength = Number(req.headers?.["content-length"] ?? req.headers?.["Content-Length"]);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) return true;
  try {
    const serialized = typeof body === "string" ? body : JSON.stringify(body ?? {});
    return new TextEncoder().encode(serialized || "").byteLength > maxBytes;
  } catch {
    return true;
  }
}

export function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
