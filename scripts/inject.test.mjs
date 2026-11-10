import { describe, expect, it } from "vitest";
import { withInspector } from "./inject.mjs";

describe("withInspector", () => {
  it("puts the script first in <head>, before the page's own scripts", () => {
    const html = '<!doctype html><html><head lang="en"><script src="app.js"></script></head></html>';
    expect(withInspector(html, "/inspector.js")).toBe(
      '<!doctype html><html><head lang="en"><script src="/inspector.js"></script><script src="app.js"></script></head></html>',
    );
  });

  it("works on a page with no <head>", () => {
    expect(withInspector("<p>hi</p>", "/inspector.js")).toBe(
      '<script src="/inspector.js"></script><p>hi</p>',
    );
  });

  it("passes settings as data attributes and skips the ones not given", () => {
    const tag = withInspector("", "/i.js", { copy: "sx", "token-prefix": "--ds-", other: undefined });
    expect(tag).toBe('<script src="/i.js" data-copy="sx" data-token-prefix="--ds-"></script>');
  });

  it("escapes attribute values", () => {
    expect(withInspector("", "/i.js", { copy: 'a"b' })).toContain('data-copy="a&quot;b"');
  });
});
