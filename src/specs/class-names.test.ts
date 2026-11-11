import { describe, expect, it } from "vitest";
import { looksGenerated } from "./class-names";

describe("looksGenerated", () => {
  it("spots the names styling libraries make up", () => {
    expect(looksGenerated("sc-cOPLXt")).toBe(true);
    expect(looksGenerated("css-1x2y3z")).toBe(true);
    expect(looksGenerated("krMpoe")).toBe(true);
    expect(looksGenerated("MuiBox-root-ifjwsH")).toBe(true);
  });

  it("keeps the names a person wrote", () => {
    expect(looksGenerated("card")).toBe(false);
    expect(looksGenerated("btn-primary")).toBe(false);
    expect(looksGenerated("header")).toBe(false);
  });
});
