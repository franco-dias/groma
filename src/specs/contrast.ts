/**
 * The contrast between a text colour and what is behind it, and the WCAG
 * level that ratio meets, for the Text colour row of the Specs tab.
 */
import { readRgba, type Rgba } from "./color-format";

export type WcagLevel = "AAA" | "AA" | "Fails AA";

/** The background of one element on the way up from the text: its colour, and whether an image or gradient covers it. */
export type Layer = { color: string; hasImage: boolean };

export type TextSize = { fontSize: number; fontWeight: number };

export type Contrast = { kind: "ratio"; ratio: number; level: WcagLevel } | { kind: "image" };

const CANVAS: Rgba = { red: 255, green: 255, blue: 255, alpha: 1 };
const LARGE_PX = 24;
const LARGE_BOLD_PX = 18.66;
const BOLD_WEIGHT = 700;

function channelLuminance(channel: number): number {
  const unit = channel / 255;
  return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
}

function luminance({ red, green, blue }: Rgba): number {
  return 0.2126 * channelLuminance(red) + 0.7152 * channelLuminance(green) + 0.0722 * channelLuminance(blue);
}

function contrastRatio(first: Rgba, second: Rgba): number {
  const [lighter, darker] = [luminance(first), luminance(second)].toSorted((one, other) => other - one);
  return (lighter + 0.05) / (darker + 0.05);
}

/** `top` painted over an opaque `bottom`. */
function compositeOver(top: Rgba, bottom: Rgba): Rgba {
  const mix = (above: number, below: number): number => above * top.alpha + below * (1 - top.alpha);
  return {
    red: mix(top.red, bottom.red),
    green: mix(top.green, bottom.green),
    blue: mix(top.blue, bottom.blue),
    alpha: 1,
  };
}

export const isLargeText = ({ fontSize, fontWeight }: TextSize): boolean =>
  fontSize >= LARGE_PX || (fontSize >= LARGE_BOLD_PX && fontWeight >= BOLD_WEIGHT);

/** Normal text needs 4.5 for AA and 7 for AAA; large text needs 3 and 4.5. */
export function wcagLevel({ ratio, isLarge }: { ratio: number; isLarge: boolean }): WcagLevel {
  const [aa, aaa] = isLarge ? [3, 4.5] : [4.5, 7];
  if (ratio >= aaa) return "AAA";
  return ratio >= aa ? "AA" : "Fails AA";
}

/** "4.52 : 1". The level is judged on the exact ratio, not on this text. */
export const formatRatio = (ratio: number): string => `${Number(ratio.toFixed(2))} : 1`;

/** The layers that show, nearest first: up to the first opaque colour or the first image. */
function visibleLayers(layers: Layer[]): Layer[] {
  const last = layers.findIndex(({ color, hasImage }) => hasImage || readRgba(color)?.alpha === 1);
  return last < 0 ? layers : layers.slice(0, last + 1);
}

/** What is behind the text, or undefined when a layer's colour cannot be read. */
function backdropOf(layers: Layer[]): Rgba | undefined {
  const colors = layers.map(({ color }) => readRgba(color));
  if (colors.includes(undefined)) return undefined;
  return colors.reduceRight<Rgba>((below, above) => (above ? compositeOver(above, below) : below), CANVAS);
}

/**
 * The contrast of `text` against the backgrounds behind it, nearest first.
 * Translucent layers are composited over the next one down, and the page's
 * canvas counts as white. Over an image the ratio cannot be known.
 * shortcut: `opacity`, blend modes and elements painted behind the text
 * without being its ancestors are ignored; read the pixels if a page needs it.
 */
export function contrastOf(request: { text: string; layers: Layer[]; size: TextSize }): Contrast | undefined {
  const layers = visibleLayers(request.layers);
  if (layers.some(({ hasImage }) => hasImage)) return { kind: "image" };
  const text = readRgba(request.text);
  const backdrop = backdropOf(layers);
  if (!text || !backdrop) return undefined;
  const ratio = contrastRatio(compositeOver(text, backdrop), backdrop);
  return { kind: "ratio", ratio, level: wcagLevel({ ratio, isLarge: isLargeText(request.size) }) };
}
