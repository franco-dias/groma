#!/usr/bin/env node
/**
 * Opens an HTML file with the inspector attached, without editing the file.
 * This is the `gromajs` command of the npm package:
 *
 *   npx gromajs path/to/design.html
 *   npx gromajs design.html --copy=sx --token-prefix=--ds- --port=4777 --no-open
 *
 * In this repo, `npm run inspect -- <file.html>` builds the inspector first
 * and then runs the same script.
 *
 * It serves the file's folder on localhost (so the page's own relative
 * files load) and adds the built inspector script to that one page.
 */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { basename, dirname, extname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { CONTENT_TYPES } from "./content-types.mjs";
import { withInspector } from "./inject.mjs";

const USAGE = `Usage: npx gromajs <file.html> [options]

  --copy=css|sx          what a click on a length copies (default: css)
  --token-prefix=<p>     show a theme path for tokens with this prefix
  --port=<number>        port to serve on (default: 4777)
  --no-open              do not open the browser
  -h, --help             show this help`;

function readArguments() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        copy: { type: "string" },
        "token-prefix": { type: "string" },
        port: { type: "string", default: "4777" },
        "no-open": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (error) {
    // An option this command does not have.
    return fail(`${error.message}\n\n${USAGE}`);
  }
}

const { values: flags, positionals } = readArguments();
if (flags.help) {
  console.log(USAGE);
  process.exit(0);
}

const [file] = positionals;
if (!file) fail(USAGE);
const page = resolve(file);
if (!existsSync(page)) fail(`No such file: ${page}`);

const dist = join(dirname(fileURLToPath(import.meta.url)), "..", "dist");
if (!existsSync(join(dist, "groma.js"))) fail("Build the inspector first: npm run build");

const root = dirname(page);
/** The inspector is served under a path no design file is likely to use. */
const INSPECTOR_PATH = "/__groma/";

function fail(message) {
  console.error(message);
  process.exit(1);
}

/** A file under `folder`, or undefined when the path tries to leave it. */
function inside(folder, relativePath) {
  const target = resolve(folder, "." + relativePath);
  return target === folder || target.startsWith(folder + sep) ? target : undefined;
}

async function respond(pathname) {
  if (pathname === "/") return { status: 302, location: "/" + encodeURIComponent(basename(page)) };

  const fromInspector = pathname.startsWith(INSPECTOR_PATH);
  const target = fromInspector
    ? inside(dist, "/" + pathname.slice(INSPECTOR_PATH.length))
    : inside(root, pathname);
  if (!target) return { status: 403 };

  const body = await readFile(target);
  const type = CONTENT_TYPES[extname(target).toLowerCase()] ?? "application/octet-stream";
  if (target !== page) return { body, type };
  const settings = { copy: flags.copy, "token-prefix": flags["token-prefix"] };
  const html = withInspector(body.toString("utf8"), { src: INSPECTOR_PATH + "groma.js", settings });
  return { body: html, type };
}

const server = createServer(async (request, response) => {
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
});

server.on("error", (error) => {
  fail(error.code === "EADDRINUSE" ? `Port ${flags.port} is in use. Try --port=<another>.` : error.message);
});

// Only this machine can reach the server.
server.listen(Number(flags.port), "127.0.0.1", () => {
  const url = `http://localhost:${flags.port}/`;
  console.log(`Inspecting ${basename(page)} at ${url}`);
  console.log("Hold Alt over the page, or click the Inspect pill. Ctrl+C stops the server.");
  if (flags["no-open"]) return;
  const opener = { darwin: "open", win32: "start" }[process.platform] ?? "xdg-open";
  spawn(opener, [url], { stdio: "ignore", shell: process.platform === "win32", detached: true })
    .on("error", () => {}) // No opener on this machine: the URL is printed above.
    .unref();
});
