import { request } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { startBridge } from "./bridge.mjs";
import { isAllowedOrigin, isLocalHost, normalizeOrigin } from "./bridge-origin.mjs";

const running = [];
afterEach(() => running.splice(0).forEach((bridge) => bridge.close()));

async function start(options = {}) {
  const bridge = await startBridge({ port: 0, ...options });
  running.push(bridge);
  return { ...bridge, url: `http://127.0.0.1:${bridge.port}` };
}

const report = { page: "http://localhost:3000/pricing", title: "Pricing", text: "# Edits to apply\n" };

const submit = (url, { body, headers = {} }) =>
  fetch(`${url}/__groma/edits`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
const post = (url, body) => submit(url, { body });
const postFrom = (Origin) => (url, body) => submit(url, { body, headers: { Origin } });

const pagesOf = async (url) => (await (await fetch(`${url}/__groma/edits`)).json()).pages;

describe("the origin rule", () => {
  it.each([
    "http://localhost:3000",
    "https://localhost",
    "http://127.0.0.1:5173",
    "http://[::1]:8080",
    "http://app.localhost:3000",
    "null",
  ])("lets %s post", (origin) => expect(isAllowedOrigin(origin)).toBe(true));

  it.each([
    "https://evil.example",
    "http://localhost.evil.example",
    "http://127.0.0.1.evil.example",
    "http://evillocalhost",
    "http://localhost:3000/path",
    "not an origin",
    "",
  ])("turns %s away", (origin) => expect(isAllowedOrigin(origin)).toBe(false));

  it("lets an origin the user allowed post, and only that one", () => {
    const allowed = ["https://staging.example.com"];
    expect(isAllowedOrigin("https://staging.example.com", allowed)).toBe(true);
    expect(isAllowedOrigin("https://staging.example.com:8443", allowed)).toBe(false);
    expect(isAllowedOrigin("http://staging.example.com", allowed)).toBe(false);
  });

  it("reads an allowed origin from an address, and refuses text that is not one", () => {
    expect(normalizeOrigin("https://staging.example.com/app?x=1")).toBe("https://staging.example.com");
    expect(normalizeOrigin("staging")).toBeUndefined();
  });

  it("answers only Host names of this machine", () => {
    expect(["localhost:4777", "127.0.0.1:4777", "[::1]:4777", "a.localhost"].every(isLocalHost)).toBe(true);
    const others = ["evil.example", "localhost.evil.example", "evil.example/@localhost", "", undefined];
    expect(others.some(isLocalHost)).toBe(false);
  });
});

describe("the bridge", () => {
  it("keeps what a page posts and answers it as JSON and as text", async () => {
    const { url } = await start();
    expect((await post(url, report)).status).toBe(204);

    const [saved] = await pagesOf(url);
    expect(saved).toMatchObject(report);
    expect(Date.parse(saved.receivedAt)).not.toBeNaN();

    const text = await (await fetch(`${url}/__groma/edits.txt`)).text();
    expect(text).toContain("Page: http://localhost:3000/pricing");
    expect(text).toContain("# Edits to apply");
  });

  it("keeps the latest text of a page, most recent page first", async () => {
    const { url } = await start();
    await post(url, report);
    await post(url, { ...report, page: "http://localhost:3000/other", text: "other" });
    await post(url, { ...report, text: "newer" });
    expect((await pagesOf(url)).map(({ page, text }) => [page, text])).toEqual([
      ["http://localhost:3000/pricing", "newer"],
      ["http://localhost:3000/other", "other"],
    ]);
  });

  it("serves the script a page loads, as the tag `bridge.js` and under the prefix", async () => {
    const { url } = await start();
    const responses = await Promise.all(
      ["/bridge.js", "/__groma/bridge.js"].map((path) => fetch(url + path)),
    );
    expect(responses.map((response) => response.headers.get("content-type"))).toEqual([
      expect.stringContaining("javascript"),
      expect.stringContaining("javascript"),
    ]);
    expect(await responses[1].text()).toContain("/__groma/edits");
  });

  it("refuses a post from a web site, stores nothing, and gives it no CORS permission", async () => {
    const { url } = await start();
    const response = await postFrom("https://evil.example")(url, report);
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
    expect(await pagesOf(url)).toEqual([]);
  });

  it("accepts a post from a local origin and answers CORS for it", async () => {
    const { url } = await start();
    const response = await postFrom("http://localhost:3000")(url, report);
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
  });

  it("accepts a post from an origin the user allowed, and from a file (null)", async () => {
    const { url } = await start({ allowOrigins: ["https://staging.example.com"] });
    expect((await postFrom("https://staging.example.com")(url, report)).status).toBe(204);
    expect((await postFrom("null")(url, report)).status).toBe(204);
  });

  it("answers the browser's preflight only for an allowed origin", async () => {
    const { url } = await start();
    const ask = (Origin) => fetch(`${url}/__groma/edits`, { method: "OPTIONS", headers: { Origin } });
    const allowed = await ask("http://localhost:3000");
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-headers")).toBe("Content-Type");
    expect(allowed.headers.get("access-control-allow-private-network")).toBe("true");
    expect((await ask("https://evil.example")).status).toBe(403);
  });

  it("does not hand the edits to a web site that reads them", async () => {
    const { url } = await start();
    await post(url, report);
    const read = await fetch(`${url}/__groma/edits`, { headers: { Origin: "https://evil.example" } });
    expect(read.status).toBe(403);
  });

  it("turns away a Host name that is not this machine (DNS rebinding)", async () => {
    const { port } = await start();
    const status = await new Promise((resolve) => {
      const headers = { Host: "evil.example" };
      request({ port, host: "127.0.0.1", path: "/__groma/edits", headers }, (response) => {
        response.resume();
        resolve(response.statusCode);
      }).end();
    });
    expect(status).toBe(403);
  });

  it("refuses a body that is too large or not a report", async () => {
    const { url } = await start();
    expect((await post(url, { ...report, text: "x".repeat(1_100_000) })).status).toBe(413);
    expect((await post(url, "not json")).status).toBe(400);
    expect((await post(url, { page: "", text: "x" })).status).toBe(400);
    expect((await post(url, { page: "p", text: 3 })).status).toBe(400);
    expect(await pagesOf(url)).toEqual([]);
  });

  it("does not answer anything else", async () => {
    const { url } = await start();
    expect((await fetch(`${url}/`)).status).toBe(404);
    expect((await fetch(`${url}/__groma/other`)).status).toBe(404);
  });

  it("keeps a limited number of pages", async () => {
    const { url } = await start();
    const posts = Array.from({ length: 55 }, (_, index) => ({
      ...report,
      page: `http://localhost/${index}`,
    }));
    await posts.reduce((done, body) => done.then(() => post(url, body)), Promise.resolve());
    const pages = await pagesOf(url);
    expect(pages).toHaveLength(50);
    expect(pages[0].page).toBe("http://localhost/54");
  });
});
