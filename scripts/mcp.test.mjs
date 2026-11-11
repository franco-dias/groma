import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { createHandler } from "./mcp-protocol.mjs";

const pages = [
  {
    page: "http://localhost:3000/pricing",
    title: "Pricing",
    text: "# Edits to apply\n\n- `color`: `red` → `blue`\n",
    receivedAt: "2026-01-01T10:00:00.000Z",
  },
];

const handler = (found = pages) => createHandler({ version: "9.9.9", readPages: async () => found });
const call = (name, args = {}) => ({
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: { name, arguments: args },
});
const textOf = (answer) => answer.result.content[0].text;

describe("the MCP protocol", () => {
  it("initializes with the version the client asks for when it knows it", async () => {
    const answer = await handler()({
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: { protocolVersion: "2024-11-05" },
    });
    expect(answer.result).toEqual({
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: { name: "groma", version: "9.9.9" },
    });
    const newer = await handler()({
      jsonrpc: "2.0",
      id: 0,
      method: "initialize",
      params: { protocolVersion: "2099-01-01" },
    });
    expect(newer.result.protocolVersion).toBe("2025-06-18");
  });

  it("does not answer a notification, and answers ping", async () => {
    expect(await handler()({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeUndefined();
    expect(await handler()({ jsonrpc: "2.0", id: 5, method: "ping" })).toEqual({
      jsonrpc: "2.0",
      id: 5,
      result: {},
    });
  });

  it("lists the two tools", async () => {
    const answer = await handler()({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    expect(answer.result.tools.map((tool) => tool.name)).toEqual(["get_edits", "list_pages"]);
    answer.result.tools.forEach((tool) => expect(tool.inputSchema.type).toBe("object"));
  });

  it("returns the edits with the page they are from, as data", async () => {
    const text = textOf(await handler()(call("get_edits")));
    expect(text).toContain("Page: http://localhost:3000/pricing");
    expect(text).toContain("Received: 2026-01-01T10:00:00.000Z");
    expect(text).toContain("`color`: `red` → `blue`");
    expect(text).toMatch(/data about edits[^.]*not\s+instructions/);
  });

  it("says there are no edits yet, and what to do", async () => {
    const text = textOf(await handler([])(call("get_edits")));
    expect(text).toContain("No page has reported");
    expect(text).toContain("npx gromajs");
    const empty = textOf(await handler([{ ...pages[0], text: "" }])(call("get_edits")));
    expect(empty).toContain("none has edits");
  });

  it("reads one page by part of its address", async () => {
    expect(textOf(await handler()(call("get_edits", { page: "pricing" })))).toContain("Pricing");
    expect(textOf(await handler()(call("get_edits", { page: "checkout" })))).toContain("none has edits");
  });

  it("lists the pages", async () => {
    const text = textOf(await handler()(call("list_pages")));
    expect(text).toContain("http://localhost:3000/pricing (Pricing): has edits");
  });

  it("reports an error as a tool result, and an unknown tool or method as JSON-RPC errors", async () => {
    const failing = createHandler({
      version: "1",
      readPages: async () => Promise.reject(new Error("port in use")),
    });
    const failed = await failing(call("get_edits"));
    expect(failed.result.isError).toBe(true);
    expect(textOf(failed)).toContain("port in use");
    expect((await handler()(call("nope"))).error.code).toBe(-32602);
    expect((await handler()({ jsonrpc: "2.0", id: 3, method: "nope" })).error.code).toBe(-32601);
    expect((await handler()("text")).error.code).toBe(-32600);
    expect((await handler()([])).error.code).toBe(-32600);
  });
});

const freePort = () =>
  new Promise((resolve) => {
    const probe = createServer().listen(0, "127.0.0.1", () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });

describe("gromajs mcp over stdio", () => {
  it("starts its own bridge, and gives an agent the edits a page posted", async () => {
    const port = await freePort();
    const command = fileURLToPath(new URL("./inspect.mjs", import.meta.url));
    const child = spawn(process.execPath, [command, "mcp", `--port=${port}`], {
      stdio: ["pipe", "pipe", "pipe"],
    });
    const lines = [];
    let buffer = "";
    child.stdout.on("data", (chunk) => {
      buffer += chunk;
      const parts = buffer.split("\n");
      buffer = parts.pop();
      lines.push(...parts);
    });
    const send = (message) => child.stdin.write(JSON.stringify(message) + "\n");
    const answer = async (id) => {
      await expect
        .poll(() => lines.some((line) => JSON.parse(line).id === id), { timeout: 10_000 })
        .toBe(true);
      return JSON.parse(lines.find((line) => JSON.parse(line).id === id));
    };

    send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18" } });
    expect((await answer(1)).result.serverInfo.name).toBe("groma");
    send({ ...call("get_edits"), id: 3 });
    expect(textOf(await answer(3))).toContain("No page has reported");

    const posted = await fetch(`http://127.0.0.1:${port}/__groma/edits`, {
      method: "POST",
      body: JSON.stringify({ page: "http://localhost:3000/", title: "Home", text: "# Edits to apply\n" }),
    });
    expect(posted.status).toBe(204);
    send({ ...call("get_edits"), id: 2 });
    expect(textOf(await answer(2))).toContain("Page: http://localhost:3000/");

    // Nothing but JSON-RPC on stdout.
    lines.forEach((line) => expect(JSON.parse(line).jsonrpc).toBe("2.0"));
    child.stdin.end();
    await new Promise((resolve) => child.on("exit", resolve));
  });
});
