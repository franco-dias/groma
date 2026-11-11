import type { GromaApi } from "./main";

declare global {
  // oxlint-disable-next-line typescript/consistent-type-definitions -- Window is extended by declaration merging
  interface Window {
    Groma?: GromaApi;
    /** Chromium's screen colour picker; missing in other browsers. */
    EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
  }
}
