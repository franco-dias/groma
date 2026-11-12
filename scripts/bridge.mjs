/**
 * The bridge: a page with Groma posts the text of its edits here, and an
 * agent reads it (over HTTP, or through the MCP server in mcp.mjs).
 *
 *   POST /__groma/edits       { page, title, text } from the page
 *   GET  /__groma/edits       { pages: [{ page, title, text, receivedAt }] }
 *   GET  /__groma/edits.txt   the same as plain text
 *   GET  /__groma/bridge.js   the script a page loads to post its edits
 *
 * Safety: only 127.0.0.1 listens, only a local origin (or one allowed with
 * `--allow-origin`) may post, only a local Host name is answered, the body
 * is capped and nothing is written to disk. See bridge-origin.mjs.
 */
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { isAllowedOrigin, isLocalHost } from "./bridge-origin.mjs";
import { createStore, parseReport } from "./bridge-store.mjs";
import { corsHeaders, readBody, send } from "./bridge-http.mjs";
import { pagesText } from "./bridge-text.mjs";

/** Where every part of the bridge lives. */
export const BRIDGE_PREFIX = "/__groma/";
/** Shared by `gromajs <file>`, `gromajs bridge` and `gromajs mcp`, so they agree without being told. */
export const DEFAULT_PORT = 4777;
const CLIENT = new URL("./bridge-client.js", import.meta.url);

/** What a route works with: the request and response, the store, and the CORS headers for this origin. */
async function postEdits({ request, response, store, headers }) {
  const body = await readBody(request);
  if (body === undefined) return send(response, { status: 413, headers });
  const report = parseReport(body);
  if (!report) return send(response, { status: 400, headers });
  store.save(report);
  return send(response, { status: 204, headers });
}

const json = ({ response, store, headers }) =>
  send(response, { type: "application/json", body: JSON.stringify({ pages: store.pages() }), headers });

const ROUTES = {
  "GET edits": json,
  "GET edits.txt": ({ response, store, headers }) =>
    send(response, { body: pagesText(store.pages()), headers }),
  "POST edits": postEdits,
  "OPTIONS edits": ({ response, headers }) => send(response, { status: 204, headers }),
  "GET bridge.js": async ({ response }) =>
    send(response, { type: "text/javascript; charset=utf-8", body: await readFile(CLIENT) }),
};

/** The route for a request, or undefined when the bridge has none (the address may be a file of the page). */
function routeOf({ method, url }) {
  const { pathname } = new URL(url, "http://localhost");
  if (!pathname.startsWith(BRIDGE_PREFIX)) return undefined;
  const key = `${method} ${pathname.slice(BRIDGE_PREFIX.length)}`;
  return Object.hasOwn(ROUTES, key) ? ROUTES[key] : undefined;
}

/** Whether the request may be answered: from this machine's name, and from an origin that is allowed. */
function isWelcome({ headers }, allowOrigins) {
  const { origin, host } = headers;
  return isLocalHost(host) && (origin === undefined || isAllowedOrigin(origin, allowOrigins));
}

async function handleBridge(context) {
  const { request, response, allowOrigins } = context;
  const route = routeOf(request);
  if (!route) return false;
  if (!isWelcome(request, allowOrigins)) {
    send(response, { status: 403 });
    return true;
  }
  const { origin } = request.headers;
  await route({ ...context, headers: origin === undefined ? {} : corsHeaders(origin) });
  return true;
}

/**
 * The bridge's part of a server. `handle` answers `true` when the request was
 * the bridge's, and `false` when it is for the rest of the server.
 * @param {{ allowOrigins?: string[] }} [options]
 */
export function createBridge({ allowOrigins = [] } = {}) {
  const store = createStore();
  return {
    pages: store.pages,
    /** @returns {Promise<boolean>} */
    handle: (request, response) => handleBridge({ request, response, store, allowOrigins }),
  };
}

/**
 * Serves only the bridge, on 127.0.0.1. Resolves with the running bridge, or
 * rejects with the server's error (`EADDRINUSE` when the port is taken).
 * @param {{ port?: number, allowOrigins?: string[] }} [options]
 */
export function startBridge({ port = DEFAULT_PORT, allowOrigins = [] } = {}) {
  const bridge = createBridge({ allowOrigins });
  const server = createServer(async (request, response) => {
    // The script tag a user adds to an app: http://localhost:<port>/bridge.js
    if (request.url === "/bridge.js") request.url = BRIDGE_PREFIX + "bridge.js";
    const isHandled = await bridge.handle(request, response).catch(() => false);
    if (!isHandled) send(response, { status: 404 });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () =>
      resolve({ ...bridge, close: () => server.close(), port: server.address().port }),
    );
  });
}
