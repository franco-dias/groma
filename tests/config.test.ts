import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { config, configureFromScriptTag } from "../src/config";
import { clipboard, el, inspector, page, reset, ui, wait } from "./helpers";

let tag: HTMLScriptElement;

/** The script tag that loads the inspector, as a page would write it. */
function scriptTag(attributes: Record<string, string>): void {
  tag = document.createElement("script");
  tag.type = "text/plain";
  tag.dataset.groma = "";
  Object.assign(tag.dataset, attributes);
  document.head.appendChild(tag);
  configureFromScriptTag();
}

beforeEach(() => {
  reset();
  page(`<div class="card" style="padding: 12px 16px">Card</div>`);
});
afterEach(() => tag?.remove());

describe("configuration", () => {
  it("defaults to CSS and no token prefix, for any project", () => {
    expect(config).toEqual({ copyFormat: "css", tokenPrefixes: [] });
  });

  it("is read from the script tag", () => {
    scriptTag({ copy: "sx", tokenPrefix: "--ds-, --theme-" });
    expect(config).toEqual({ copyFormat: "sx", tokenPrefixes: ["--ds-", "--theme-"] });
  });

  it("ignores values it does not know", () => {
    scriptTag({ copy: "yaml", tokenPrefix: "ds-" });
    expect(config).toEqual({ copyFormat: "css", tokenPrefixes: [] });
  });

  it("can be changed from code, one setting at a time, and restored", () => {
    inspector().configure({ copyFormat: "sx" });
    inspector().configure({ tokenPrefixes: ["--ds-"] });
    expect(config).toEqual({ copyFormat: "sx", tokenPrefixes: ["--ds-"] });

    inspector().configure();
    expect(config).toEqual({ copyFormat: "css", tokenPrefixes: [] });
  });

  it("applies to the open panel at once", async () => {
    inspector().pin(el(".card"));
    inspector().configure({ copyFormat: "sx" });
    ui(".box-padding > .box-name")!.click();
    await wait(20);
    expect(clipboard.text).toBe("py: 12, px: 16");
  });
});
