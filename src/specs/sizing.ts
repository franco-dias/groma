/** Sizing intent, in Figma's words: a fixed size, "hug" the content, or "fill" the parent. */
import { declaredValue } from "../page-styles";

type Intent = "fixed" | "hug" | "fill";

/** "fill × hug": how the element gets its width and its height. */
export function sizingIntent(
  el: Element,
  cs: CSSStyleDeclaration,
  styles: CSSStyleDeclaration[],
): string {
  const parent = el.parentElement ? getComputedStyle(el.parentElement) : null;
  const inFlex = parent !== null && parent.display.includes("flex");
  const rowParent = inFlex && parent.flexDirection.startsWith("row");
  const grows = cs.flexGrow !== "0";
  const alignment = parent && cs.alignSelf === "auto" ? parent.alignItems : cs.alignSelf;
  const stretches = alignment === "normal" || alignment === "stretch";

  const intent = (prop: string, isMainAxis: boolean, fillsByDefault: boolean): Intent => {
    const declared = declaredValue(styles, prop);
    if (declared === "100%") return "fill";
    if (declared && declared !== "auto" && !declared.includes("content")) return "fixed";
    if (inFlex) return (isMainAxis ? grows : stretches) ? "fill" : "hug";
    return fillsByDefault ? "fill" : "hug";
  };

  // Outside flex, a block-level box takes its container's width.
  const blockLevel = ["block", "flex", "grid", "list-item", "table"].includes(cs.display);
  const width = intent("width", rowParent, blockLevel);
  const height = intent("height", inFlex && !rowParent, false);
  return `${width} × ${height}`;
}
