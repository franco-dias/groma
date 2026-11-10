import { defineConfig } from "vite";

// `npm run serve` opens index.html, a demo page that loads src/main.ts.
// `npm run build` writes one self-contained script, dist/live-inspector.js,
// with the styles and the panel markup inlined.
export default defineConfig({
  build: {
    lib: {
      entry: "src/main.ts",
      formats: ["iife"],
      // Required for the IIFE format; main.ts exports nothing, so no global is created.
      name: "LiveInspectorBundle",
      fileName: () => "live-inspector.js",
    },
    sourcemap: true,
  },
});
