/**
 * The MCP protocol, by hand: JSON-RPC 2.0 messages in, answers out.
 * Handles initialize, notifications/initialized, ping, tools/list and
 * tools/call, which is all a client needs from a server of tools.
 */
import { callTool, TOOLS } from "./mcp-tools.mjs";

const LATEST = "2025-06-18";
const SUPPORTED = [LATEST, "2025-03-26", "2024-11-05"];

export const ERRORS = {
  parse: { code: -32700, message: "Parse error" },
  invalid: { code: -32600, message: "Invalid request" },
  noMethod: { code: -32601, message: "Method not found" },
  noTool: { code: -32602, message: "Unknown tool" },
};

// JSON-RPC answers a message it could not read with an id of null.
// oxlint-disable-next-line unicorn/no-null -- the protocol's own value
export const failure = (id, error) => ({ jsonrpc: "2.0", id: id ?? null, error });

const text = (value, isError) => ({ content: [{ type: "text", text: value }], ...(isError && { isError }) });

/** A tool's answer; a bridge that cannot be read is the tool's error, not the protocol's. */
async function callSafely({ name, arguments: args } = {}, readPages) {
  if (!TOOLS.some((tool) => tool.name === name)) return undefined;
  try {
    return text(callTool(name, { pages: await readPages(), args, now: Date.now() }));
  } catch (error) {
    return text(`Groma could not read the edits: ${error.message}`, true);
  }
}

const initialize =
  (version) =>
  ({ protocolVersion }) => ({
    protocolVersion: SUPPORTED.includes(protocolVersion) ? protocolVersion : LATEST,
    capabilities: { tools: {} },
    serverInfo: { name: "groma", version },
  });

const isMessage = (message) =>
  Boolean(message) &&
  typeof message === "object" &&
  !Array.isArray(message) &&
  typeof message.method === "string";

/**
 * @param {{ version: string, readPages: () => Promise<object[]> }} server
 * @returns {(message: unknown) => Promise<object | undefined>}  Answers a message; undefined for a notification.
 */
export function createHandler({ version, readPages }) {
  const methods = {
    initialize: initialize(version),
    ping: () => ({}),
    "tools/list": () => ({ tools: TOOLS }),
    "tools/call": (params) => callSafely(params, readPages),
  };
  return async function handle(message) {
    if (!isMessage(message)) return failure(message?.id, ERRORS.invalid);
    const { id, method, params } = message;
    // A message with no id is a notification: it gets no answer.
    if (id === undefined) return undefined;
    if (!Object.hasOwn(methods, method)) return failure(id, ERRORS.noMethod);
    const result = await methods[method](params ?? {});
    return result === undefined ? failure(id, ERRORS.noTool) : { jsonrpc: "2.0", id, result };
  };
}
