import type { GromaApi } from "./main";

declare global {
  interface Window {
    Groma?: GromaApi;
    /** Chromium's screen colour picker; missing in other browsers. */
    EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
  }
}
