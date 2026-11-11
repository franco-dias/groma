/**
 * `gromajs mcp`: an MCP server over stdio that gives a coding agent the edits
 * the user made on the page. Messages are JSON-RPC, one per line. Nothing but
 * those messages may go to stdout; notes for the user go to stderr.
 *
 * The edits come from the bridge on `--port`. If none is listening there, the
 * server starts one in this process, so `gromajs mcp` alone is enough for an
 * app whose dev build carries the bridge script tag.
 */
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { startBridge } from "./bridge.mjs";
import { createHandler, ERRORS, failure } from "./mcp-protocol.mjs";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

async function fetchPages(port) {
  const response = await fetch(`http://127.0.0.1:${port}/__groma/edits`, {
    signal: AbortSignal.timeout(2000),
  });
  if (!response.ok) throw new Error(`port ${port} answered ${response.status}`);
  return (await response.json()).pages;
}

/**
 * Where the pages are read from: a bridge somebody else runs, else this process's own.
 * @param {{ port: number, allowOrigins: string[] }} options
 */
export function pageSource({ port, allowOrigins }) {
  let own;
  return async function readPages() {
    if (own) return own.pages();
    try {
      return await fetchPages(port);
    } catch {
      // Nothing (or nothing of ours) answers: be the bridge.
    }
    try {
      own = await startBridge({ port, allowOrigins });
      console.error(`Groma bridge listening on http://localhost:${port}/`);
    } catch (error) {
      throw new Error(`no bridge on port ${port} and could not start one (${error.code ?? error.message})`, {
        cause: error,
      });
    }
    return own.pages();
  };
}

/** Answers the lines of `input` one at a time, in order, on `output`. */
export function serve({ input, output, handle }) {
  let queue = Promise.resolve();
  const reply = async (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return output.write(JSON.stringify(failure(undefined, ERRORS.parse)) + "\n");
    }
    const answer = await handle(message);
    if (answer) output.write(JSON.stringify(answer) + "\n");
  };
  const lines = createInterface({ input });
  lines.on("line", (line) => {
    if (line.trim()) queue = queue.then(() => reply(line));
  });
  return new Promise((resolve) => lines.on("close", () => queue.then(resolve)));
}

/** @param {{ port: number, allowOrigins: string[] }} options */
export async function runMcp(options) {
  const readPages = pageSource(options);
  // Be the bridge from the start, so a page can report before the agent asks.
  await readPages().catch((error) => console.error(error.message));
  await serve({
    input: process.stdin,
    output: process.stdout,
    handle: createHandler({ version, readPages }),
  });
  process.exit(0);
}
