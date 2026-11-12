/**
 * `gromajs <file.html>`: serves the file's folder on localhost (so the page's
 * own relative files load) and adds the built inspector, and the bridge
 * client, to that one page. The file itself is not edited.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { BRIDGE_PREFIX, createBridge } from "./bridge.mjs";
import { CONTENT_TYPES } from "./content-types.mjs";
import { withInspector } from "./inject.mjs";

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");

/** A file under `folder`, or undefined when the path tries to leave it. */
function inside(folder, relativePath) {
  const target = resolve(folder, "." + relativePath);
  return target === folder || target.startsWith(folder + sep) ? target : undefined;
}

/** What to answer for an address: the inspector's files, the page (with the inspector added), or a file beside the page. */
function responder({ page, flags }) {
  const root = dirname(page);
  const settings = { copy: flags.copy, "token-prefix": flags["token-prefix"] };
  const tags = { src: BRIDGE_PREFIX + "groma.js", settings, bridge: BRIDGE_PREFIX + "bridge.js" };
  return async function respond(pathname) {
    if (pathname === "/") return { status: 302, location: "/" + encodeURIComponent(basename(page)) };
    const fromInspector = pathname.startsWith(BRIDGE_PREFIX);
    const folder = fromInspector ? dist : root;
    const target = inside(
      folder,
      "/" + (fromInspector ? pathname.slice(BRIDGE_PREFIX.length) : pathname.slice(1)),
    );
    if (!target) return { status: 403 };
    const body = await readFile(target);
    const type = CONTENT_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream";
    return target === page ? { body: withInspector(body.toString("utf8"), tags), type } : { body, type };
  };
}

async function answer({ request, response, bridge, respond }) {
  if (await bridge.handle(request, response).catch(() => false)) return;
  try {
    const { pathname } = new URL(request.url, "http://localhost");
    const { status = 200, location, body, type } = await respond(decodeURIComponent(pathname));
    response.writeHead(status, {
      ...(location && { Location: location }),
      ...(type && { "Content-Type": type }),
      "Cache-Control": "no-store",
    });
    response.end(body);
  } catch (error) {
    const missing = error.code === "ENOENT" || error.code === "EISDIR";
    response.writeHead(missing ? 404 : 500);
    response.end();
  }
}

/** @param {{ file: string, flags: Record<string, string | boolean | undefined>, allowOrigins: string[] }} options */
export function servePage({ file, flags, allowOrigins }) {
  const page = resolve(file);
  if (!existsSync(page)) return Promise.reject(new Error(`No such file: ${page}`));
  if (!existsSync(join(dist, "groma.js")))
    return Promise.reject(new Error("Build the inspector first: npm run build"));
  const context = { bridge: createBridge({ allowOrigins }), respond: responder({ page, flags }) };
  const server = createServer((request, response) => answer({ request, response, ...context }));
  return listen(server, { flags, name: basename(page) });
}

function announce({ flags, name }) {
  const url = `http://localhost:${flags.port}/`;
  console.log(`Inspecting ${name} at ${url}`);
  console.log("Hold Alt over the page, or click the Inspect pill. Ctrl+C stops the server.");
  console.log(
    `Edits are available to an agent at ${url}__groma/edits (MCP: npx gromajs mcp --port=${flags.port}).`,
  );
  if (!flags["no-open"]) open(url);
}

/** Listens on this machine only. */
function listen(server, { flags, name }) {
  return new Promise((resolveStart, reject) => {
    server.once("error", (error) => {
      reject(
        new Error(
          error.code === "EADDRINUSE" ? `Port ${flags.port} is in use. Try --port=<another>.` : error.message,
        ),
      );
    });
    server.listen(Number(flags.port), "127.0.0.1", () => {
      announce({ flags, name });
      resolveStart(server);
    });
  });
}

function open(url) {
  const opener = { darwin: "open", win32: "start" }[process.platform] ?? "xdg-open";
  spawn(opener, [url], { stdio: "ignore", shell: process.platform === "win32", detached: true })
    .on("error", () => {}) // No opener on this machine: the URL is printed above.
    .unref();
}
