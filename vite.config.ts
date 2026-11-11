import { playwright } from "@vitest/browser-playwright";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

/**
 * The inspector's markup (`*.html?raw`) goes into the script as text. Its
 * comments and indentation are for the people who edit it: they are left out
 * of the script. A run of white space becomes one space, which a browser
 * shows the same; the tests run on this markup too.
 */
const leanMarkup = (): Plugin => ({
  name: "groma-lean-markup",
  transform(code, id) {
    // Vite has turned the file into `export default "<its text>"`.
    const text = /^export default (".*")\s*;?\s*$/s.exec(code)?.[1];
    if (!id.endsWith(".html?raw") || !text) return undefined;
    const markup = (JSON.parse(text) as string)
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\s+/g, " ")
      .trim();
    // oxlint-disable-next-line unicorn/no-null -- Rollup reads `map: null` as "no source map for this change"
    return { code: `export default ${JSON.stringify(markup)}`, map: null };
  },
});

export default defineConfig({
  plugins: [leanMarkup()],
  build: {
    lib: {
      entry: "src/main.ts",
      formats: ["iife"],
      // Required for the IIFE format; main.ts exports nothing, so no global is created.
      name: "GromaBundle",
      fileName: () => "groma.js",
    },
    sourcemap: true,
  },
  test: {
    projects: [
      {
        // Pure logic, next to the code it tests. Runs in Node.
        extends: true,
        test: { name: "unit", include: ["src/**/*.test.ts", "scripts/**/*.test.mjs"] },
      },
      {
        // Behaviour on a real page: layout, computed styles, events.
        // Runs headless in the Chrome installed on this machine.
        extends: true,
        test: {
          name: "browser",
          include: ["tests/**/*.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright({ launchOptions: { channel: "chrome" } }),
            instances: [{ browser: "chromium" }],
            viewport: { width: 1280, height: 800 },
            screenshotFailures: false,
          },
        },
      },
    ],
  },
});
