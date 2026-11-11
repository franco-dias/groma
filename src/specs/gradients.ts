/**
 * The gradients of a `background-image`, read apart for the Effects block of
 * the Specs tab: its kind and direction or shape, and its stops. A layer that
 * is an image (`url(...)`) is not a gradient and is left out.
 */
import { splitTopLevel } from "./declarations";

export type GradientStop = { color: string; position: string };

export type Gradient = {
  /** "linear 135deg", "radial circle", "conic". */
  description: string;
  stops: GradientStop[];
  /** The layer as CSS, to draw a preview with and to copy. */
  text: string;
};

const GRADIENT = /^(repeating-)?(linear|radial|conic)-gradient\((.*)\)$/is;
/** What a gradient says when it says nothing about its direction or shape. */
const DEFAULT_CONFIG: Record<string, string> = { linear: "180deg", radial: "ellipse", conic: "" };
/** A first item that sets direction or shape, where a colour stop would have a colour first. */
const CONFIG = /^([+-]?[\d.]|to\s|circle|ellipse|closest-|farthest-|at\s|from\s)/i;
const POSITION = /^[+-]?(\d+\.?\d*|\.\d+)[a-z%]*$|^calc\(/i;

function toStop(item: string): GradientStop {
  const tokens = splitTopLevel(item, " ");
  const firstPosition = tokens.findIndex((token, index) => index > 0 && POSITION.test(token));
  const split = firstPosition < 0 ? tokens.length : firstPosition;
  return { color: tokens.slice(0, split).join(" "), position: tokens.slice(split).join(" ") };
}

/** A bare length or percentage between two stops is a hint, not a stop. */
const isStop = (item: string, index: number): boolean => index === 0 || !POSITION.test(item);

function toGradient(layer: string): Gradient | undefined {
  const parts = GRADIENT.exec(layer);
  if (!parts) return undefined;
  const [, repeating = "", kind, inside] = parts;
  const items = splitTopLevel(inside, ",");
  const hasConfig = CONFIG.test(items[0] ?? "");
  const config = (hasConfig ? items[0] : DEFAULT_CONFIG[kind]).trim();
  const stops = items
    .slice(hasConfig ? 1 : 0)
    .filter(isStop)
    .map(toStop);
  const prefix = repeating ? "repeating " : "";
  return { description: `${prefix}${kind} ${config}`.trim(), stops, text: layer };
}

/** The gradients among the layers of a `background-image` value, first layer first. */
export function parseGradients(value: string): Gradient[] {
  return splitTopLevel(value, ",").flatMap((layer) => toGradient(layer) ?? []);
}
