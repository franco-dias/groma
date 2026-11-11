import { describe, expect, it } from "vitest";
import { parseGradients } from "./gradients";

describe("parseGradients", () => {
  it("reads the kind, the angle and the stops of a linear gradient", () => {
    const [gradient] = parseGradients("linear-gradient(135deg, rgb(255, 0, 0) 0%, rgb(0, 0, 255) 100%)");
    expect(gradient.description).toBe("linear 135deg");
    expect(gradient.stops).toEqual([
      { color: "rgb(255, 0, 0)", position: "0%" },
      { color: "rgb(0, 0, 255)", position: "100%" },
    ]);
  });

  it("says a linear gradient with no direction goes to the bottom", () => {
    expect(parseGradients("linear-gradient(red, blue)")[0].description).toBe("linear 180deg");
  });

  it("reads a side or corner as written", () => {
    expect(parseGradients("linear-gradient(to right, red, blue)")[0].description).toBe("linear to right");
  });

  it("reads the shape of a radial gradient", () => {
    expect(parseGradients("radial-gradient(circle at 50% 50%, red, blue)")[0].description).toBe(
      "radial circle at 50% 50%",
    );
    expect(parseGradients("radial-gradient(red, blue)")[0].description).toBe("radial ellipse");
  });

  it("reads a conic gradient", () => {
    expect(parseGradients("conic-gradient(red, blue)")[0].description).toBe("conic");
    expect(parseGradients("conic-gradient(from 90deg, red, blue)")[0].description).toBe("conic from 90deg");
  });

  it("names a repeating gradient", () => {
    expect(parseGradients("repeating-linear-gradient(45deg, red, blue 10px)")[0].description).toBe(
      "repeating linear 45deg",
    );
  });

  it("keeps a stop's two positions", () => {
    const [gradient] = parseGradients("linear-gradient(red 10% 30%, blue)");
    expect(gradient.stops).toEqual([
      { color: "red", position: "10% 30%" },
      { color: "blue", position: "" },
    ]);
  });

  it("splits colours with commas from the stops around them", () => {
    const [gradient] = parseGradients("linear-gradient(rgba(0, 0, 0, 0.5) 0%, rgb(1, 2, 3) 50%)");
    expect(gradient.stops.map(({ color }) => color)).toEqual(["rgba(0, 0, 0, 0.5)", "rgb(1, 2, 3)"]);
  });

  it("leaves out a colour hint", () => {
    const [gradient] = parseGradients("linear-gradient(red, 30%, blue)");
    expect(gradient.stops.map(({ color }) => color)).toEqual(["red", "blue"]);
  });

  it("lists each gradient layer and skips the layers that are not gradients", () => {
    const layers = parseGradients(
      'linear-gradient(red, blue), url("a.png"), radial-gradient(circle, green, white)',
    );
    expect(layers.map(({ description }) => description)).toEqual(["linear 180deg", "radial circle"]);
  });

  it("keeps the layer as CSS, to draw and to copy", () => {
    expect(parseGradients("linear-gradient(red, blue)")[0].text).toBe("linear-gradient(red, blue)");
  });

  it.each([{ value: "none" }, { value: 'url("a.png")' }, { value: "" }])(
    "finds no gradient in '$value'",
    ({ value }) => {
      expect(parseGradients(value)).toEqual([]);
    },
  );
});
