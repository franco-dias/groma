import { describe, expect, it } from "vitest";
import { downloadName, fileNameOf, ratioNote, urlsIn } from "./assets";

describe("fileNameOf", () => {
  it.each([
    { url: "https://example.com/img/logo@2x.png?v=3#top", name: "logo@2x.png" },
    { url: "https://example.com/a%20b.png", name: "a b.png" },
    { url: "https://example.com/", name: "example.com" },
    { url: "https://example.com/dir/", name: "dir" },
    { url: "blob:https://example.com/3f2a", name: "3f2a" },
    { url: "https://example.com/%E0%A4%A.png", name: "%E0%A4%A.png" },
    { url: "not a url", name: "not a url" },
  ])("names $url as $name", ({ url, name }) => {
    expect(fileNameOf(url)).toBe(name);
  });

  it("says a data URL is embedded", () => {
    expect(fileNameOf("data:image/png;base64,iVBORw0KGgo=")).toBe("embedded");
  });
});

describe("downloadName", () => {
  it("keeps the file's name", () => {
    expect(downloadName("https://example.com/img/logo.png")).toBe("logo.png");
  });

  it.each([
    { url: "data:image/png;base64,iVBOR", name: "image.png" },
    { url: "data:image/svg+xml;utf8,<svg/>", name: "image.svg" },
    { url: "data:image/jpeg;base64,/9j/", name: "image.jpeg" },
    { url: "data:text/plain,hi", name: "image" },
  ])("gives $url the name $name", ({ url, name }) => {
    expect(downloadName(url)).toBe(name);
  });
});

describe("ratioNote", () => {
  it("names a clean whole ratio on both axes", () => {
    expect(ratioNote({ natural: { width: 600, height: 400 }, shown: { width: 300, height: 200 } })).toBe(
      "2×",
    );
    expect(ratioNote({ natural: { width: 900, height: 600 }, shown: { width: 300, height: 200 } })).toBe(
      "3×",
    );
  });

  it("says nothing for the same size, a smaller image, or a ratio that is not clean", () => {
    expect(ratioNote({ natural: { width: 300, height: 200 }, shown: { width: 300, height: 200 } })).toBe("");
    expect(ratioNote({ natural: { width: 150, height: 100 }, shown: { width: 300, height: 200 } })).toBe("");
    expect(ratioNote({ natural: { width: 1200, height: 800 }, shown: { width: 300, height: 200 } })).toBe(
      "4×",
    );
    expect(ratioNote({ natural: { width: 1000, height: 800 }, shown: { width: 300, height: 200 } })).toBe("");
  });

  it("says nothing when the axes disagree or nothing is shown", () => {
    expect(ratioNote({ natural: { width: 600, height: 400 }, shown: { width: 300, height: 100 } })).toBe("");
    expect(ratioNote({ natural: { width: 600, height: 400 }, shown: { width: 0, height: 0 } })).toBe("");
  });
});

describe("urlsIn", () => {
  it("lists the url() layers of a background-image, quoted or not", () => {
    expect(
      urlsIn('url("https://a.test/x.png"), linear-gradient(red, blue), url(https://a.test/y.png)'),
    ).toEqual(["https://a.test/x.png", "https://a.test/y.png"]);
  });

  it("keeps a comma inside a data URL", () => {
    expect(urlsIn('url("data:image/gif;base64,R0lG")')).toEqual(["data:image/gif;base64,R0lG"]);
  });

  it("finds none in none or a gradient", () => {
    expect(urlsIn("none")).toEqual([]);
    expect(urlsIn("linear-gradient(red, blue)")).toEqual([]);
  });
});
