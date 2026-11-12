import { existsSync, readFileSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const command = manifest.bin.gromajs;

/** The files a script imports from beside itself, and the ones those import: `from "./inject.mjs"`. */
function localImports(file) {
  const source = readFileSync(join(root, file), "utf8");
  const direct = [...source.matchAll(/from "(\.[^"]+)"/g)].map((match) =>
    normalize(join(dirname(file), match[1])),
  );
  return [...new Set([...direct, ...direct.flatMap(localImports)])];
}

/** The files a script reads by address beside itself: `new URL("./bridge-client.js", import.meta.url)`. */
function readFiles(file) {
  const source = readFileSync(join(root, file), "utf8");
  return [...source.matchAll(/new URL\("(\.[^"]+)", import\.meta\.url\)/g)].map((match) =>
    normalize(join(dirname(file), match[1])),
  );
}

describe("the gromajs command (npx gromajs <file.html>)", () => {
  it("is a script that exists and can be run directly", () => {
    expect(existsSync(join(root, command))).toBe(true);
    expect(readFileSync(join(root, command), "utf8").startsWith("#!/usr/bin/env node")).toBe(true);
  });

  it("ships in the package with every file it imports", () => {
    const imported = [command, ...localImports(command)];
    const needed = [...imported, ...imported.flatMap(readFiles).filter((file) => file.startsWith("scripts"))];
    expect(needed).toContain("scripts/mcp-tools.mjs");
    expect(needed).toContain("scripts/bridge-client.js");
    for (const file of needed) expect(manifest.files).toContain(file);
  });

  it("ships the built inspector it serves, which it looks for in ../dist", () => {
    expect(manifest.files).toContain("dist");
    expect(readFileSync(join(root, "scripts/serve-page.mjs"), "utf8")).toContain('"..", "dist"');
  });
});
