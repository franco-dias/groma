#!/usr/bin/env node
/**
 * The `gromajs` command of the npm package:
 *
 *   npx gromajs path/to/design.html            inspect a file (serve-page.mjs)
 *   npx gromajs design.html --copy=sx --token-prefix=--ds- --port=4777 --no-open
 *   npx gromajs bridge [--port=4777]           only the bridge, for an app on its own dev server
 *   npx gromajs mcp [--port=4777]              the MCP server for a coding agent
 *
 * In this repo, `npm run inspect -- <file.html>` builds the inspector first
 * and then runs the same script. Every page served by the command also hands
 * its edits to the bridge (bridge.mjs), so an agent reads them live.
 */
import { parseArgs } from "node:util";
import { DEFAULT_PORT, startBridge } from "./bridge.mjs";
import { normalizeOrigin } from "./bridge-origin.mjs";
import { runMcp } from "./mcp.mjs";
import { servePage } from "./serve-page.mjs";

const USAGE = `Usage: npx gromajs <file.html> [options]
       npx gromajs bridge [--port=<number>] [--allow-origin=<origin>]
       npx gromajs mcp [--port=<number>] [--allow-origin=<origin>]

  --copy=css|sx            what a click on a length copies (default: css)
  --token-prefix=<p>       show a theme path for tokens with this prefix
  --port=<number>          port to serve on (default: ${DEFAULT_PORT})
  --allow-origin=<origin>  let a page of this origin hand edits to the bridge
                           (repeatable; localhost pages are always allowed)
  --no-open                do not open the browser
  -h, --help               show this help`;

function fail(message) {
  console.error(message);
  process.exit(1);
}

function readArguments() {
  try {
    return parseArgs({
      allowPositionals: true,
      options: {
        copy: { type: "string" },
        "token-prefix": { type: "string" },
        port: { type: "string", default: String(DEFAULT_PORT) },
        "allow-origin": { type: "string", multiple: true, default: [] },
        "no-open": { type: "boolean", default: false },
        help: { type: "boolean", short: "h", default: false },
      },
    });
  } catch (error) {
    // An option this command does not have.
    return fail(`${error.message}\n\n${USAGE}`);
  }
}

/** The origins to allow, as origins; stops with a message for one that is not. */
function readOrigins(values) {
  return values.map(
    (value) =>
      normalizeOrigin(value) ??
      fail(`--allow-origin needs an origin like https://staging.example.com, not "${value}"`),
  );
}

async function run() {
  const { values: flags, positionals } = readArguments();
  if (flags.help) return console.log(USAGE);
  const [command] = positionals;
  const port = Number(flags.port);
  const allowOrigins = readOrigins(flags["allow-origin"]);
  if (command === "mcp") return runMcp({ port, allowOrigins });
  if (command === "bridge") {
    await startBridge({ port, allowOrigins });
    const tag = `<script src="http://localhost:${port}/bridge.js"></script>`;
    return console.log(
      `Groma bridge on http://localhost:${port}/\nAdd this tag to your app's dev build, next to the Groma script:\n\n  ${tag}\n`,
    );
  }
  if (!command) return fail(USAGE);
  return servePage({ file: command, flags, allowOrigins });
}

run().catch((error) =>
  fail(error.code === "EADDRINUSE" ? "That port is in use. Try --port=<another>." : error.message),
);
