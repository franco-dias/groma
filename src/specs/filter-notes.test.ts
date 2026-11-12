import { describe, expect, it } from "vitest";
import { describeFilter } from "./filter-notes";

describe("describeFilter", () => {
  it("says what a function does to the element, or to what is behind it", () => {
    expect(describeFilter("blur", "filter")).toBe("Blurs the element");
    expect(describeFilter("blur", "backdrop-filter")).toBe("Blurs what is behind the element");
    expect(describeFilter("grayscale", "filter")).toBe("Takes the color out of the element");
    expect(describeFilter("drop-shadow", "filter")).toBe("Casts a shadow the shape of the element");
  });

  it("says nothing for a function it does not know, such as an SVG filter", () => {
    expect(describeFilter("url", "filter")).toBe("");
  });
});
