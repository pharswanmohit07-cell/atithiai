const MAX_REQUEST_BYTES = 6 * 1024 * 1024;

export function bridgeVercelHandler(apiHandler, routeName) {
  return async function netlifyRequestHandler(request) {
    try {
      let body = {};
      if (request.method !== "GET" && request.method !== "HEAD") {
        const rawBody = await request.text();
        if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BYTES) {
          return Response.json({ error: "Request is too large. Reduce its size and retry." }, { status: 413 });
        }
        if (rawBody) {
          try { body = JSON.parse(rawBody); } catch { body = rawBody; }
        }
      }
      const url = new URL(request.url);
      const req = {
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body,
        url: url.pathname + url.search,
        query: Object.fromEntries(url.searchParams.entries())
      };
      let statusCode = 200;
      let responseBody = "";
      const responseHeaders = {};
      const res = {
        status(code) { statusCode = Number(code) || 200; return this; },
        setHeader(name, value) { responseHeaders[String(name).toLowerCase()] = String(value); return this; },
        end(value = "") { responseBody = value == null ? "" : String(value); }
      };
      await apiHandler(req, res);
      if (!responseHeaders["content-type"]) responseHeaders["content-type"] = "application/json; charset=utf-8";
      responseHeaders["cache-control"] = "no-store";
      return new Response(responseBody, { status: statusCode, headers: responseHeaders });
    } catch (error) {
      console.error("[netlify/" + routeName + "] handler failed:", error instanceof Error ? error.name : "UnknownError");
      return Response.json({ error: "The API request failed. Please retry." }, { status: 500 });
    }
  };
}
