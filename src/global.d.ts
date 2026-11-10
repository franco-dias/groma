import type { LiveInspectorApi } from "./main";

declare global {
  interface Window {
    LiveInspector?: LiveInspectorApi;
    /** Chromium's screen colour picker; missing in other browsers. */
    EyeDropper?: new () => { open(): Promise<{ sRGBHex: string }> };
  }
}
