/** The bridge's HTTP details: reading a capped body, answering with the same safe headers, and CORS. */

const MAX_BODY_BYTES = 1_000_000;

/** Reads a request body, or undefined when it is larger than the cap. */
export function readBody(request) {
  return new Promise((resolve) => {
    const chunks = [];
    let size = 0;
    request.on("data", (chunk) => {
      size += chunk.length;
      if (size <= MAX_BODY_BYTES) chunks.push(chunk);
    });
    request.on("end", () =>
      resolve(size <= MAX_BODY_BYTES ? Buffer.concat(chunks).toString("utf8") : undefined),
    );
    request.on("error", () => resolve(undefined));
  });
}

export function send(
  response,
  { status = 200, type = "text/plain; charset=utf-8", body = "", headers = {} },
) {
  response.writeHead(status, {
    "Content-Type": type,
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
    ...headers,
  });
  response.end(body);
}

/** Lets a page of an allowed origin read the answer, and ask first (the browser's preflight). */
export const corsHeaders = (origin) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
  "Access-Control-Max-Age": "600",
});
