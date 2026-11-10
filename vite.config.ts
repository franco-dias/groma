import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

// `npm run serve` opens index.html, a demo page that loads src/main.ts.
// `npm run build` writes one self-contained script, dist/groma.js,
// with the styles and the panel markup inlined.
export default defineConfig({
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
