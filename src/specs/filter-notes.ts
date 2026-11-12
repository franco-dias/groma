/**
 * What a filter function does, in one sentence for the Effects block, so a
 * value like `blur 16px` says what it is for: to the element itself
 * (`filter`) or to what shows through it from behind (`backdrop-filter`).
 */

/** Each known function's sentence; `{target}` is what it works on. */
const NOTES: Record<string, string> = {
  blur: "Blurs {target}",
  brightness: "Changes the brightness of {target}",
  contrast: "Changes the contrast of {target}",
  grayscale: "Takes the color out of {target}",
  "hue-rotate": "Shifts the hues of {target}",
  invert: "Inverts the colors of {target}",
  opacity: "Fades {target}",
  saturate: "Changes the saturation of {target}",
  sepia: "Tints {target} sepia",
  "drop-shadow": "Casts a shadow the shape of {target}",
};

/** The sentence for function `name` of property `prop`; "" for one it does not know (an SVG `url()` filter). */
export function describeFilter(name: string, prop: string): string {
  const note = Object.hasOwn(NOTES, name) ? NOTES[name] : "";
  const target = prop === "backdrop-filter" ? "what is behind the element" : "the element";
  return note.replace("{target}", target);
}
