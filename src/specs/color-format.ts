/**
 * Writes a color as hex, rgb or hsl, for the Colors block of the Specs tab
 * and for what a click on a color copies.
 */

export type ColorFormat = "hex" | "rgb" | "hsl";

export type Rgba = { red: number; green: number; blue: number; alpha: number };

/** A format read back from storage; anything else is hex. */
export function toColorFormat(stored: unknown): ColorFormat {
  if (stored === "rgb" || stored === "hsl") return stored;
  return "hex";
}

const RGB_PATTERN = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:\s*[,/]\s*([\d.]+)(%?))?\s*\)$/;
const HEX_PATTERN = /^#([\da-f]{3}|[\da-f]{6})$/i;

function readRgb(value: string): Rgba | undefined {
  const parts = RGB_PATTERN.exec(value.trim());
  if (!parts) return undefined;
  const [red, green, blue] = parts.slice(1, 4).map(Number);
  const alpha = parts[4] === undefined ? 1 : Number(parts[4]) / (parts[5] ? 100 : 1);
  return { red, green, blue, alpha };
}

function readHex(value: string): Rgba | undefined {
  const digits = HEX_PATTERN.exec(value.trim())?.[1];
  if (!digits) return undefined;
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
  const [red, green, blue] = [0, 2, 4].map((start) => parseInt(full.slice(start, start + 2), 16));
  return { red, green, blue, alpha: 1 };
}

/** The channels of a color written as hex or rgb, or undefined for any other spelling. */
export const readRgba = (value: string): Rgba | undefined => readRgb(value) ?? readHex(value);

const percent = (alpha: number): string => `${Math.round(alpha * 100)}%`;

type Unit = { red: number; green: number; blue: number };

/** Degrees round the color wheel; zero for a grey, which has no hue. */
function hueOf({ red, green, blue }: Unit): number {
  const max = Math.max(red, green, blue);
  const spread = max - Math.min(red, green, blue);
  if (!spread) return 0;
  if (max === red) return (60 * ((green - blue) / spread) + 360) % 360;
  return max === green ? 60 * ((blue - red) / spread + 2) : 60 * ((red - green) / spread + 4);
}

function toHsl(color: Rgba): [hue: number, saturation: number, lightness: number] {
  const unit = { red: color.red / 255, green: color.green / 255, blue: color.blue / 255 };
  const max = Math.max(unit.red, unit.green, unit.blue);
  const min = Math.min(unit.red, unit.green, unit.blue);
  const lightness = (max + min) / 2;
  if (max === min) return [0, 0, lightness * 100];
  const saturation = (max - min) / (1 - Math.abs(2 * lightness - 1));
  return [hueOf(unit), saturation * 100, lightness * 100];
}

function writeHex(color: Rgba): string {
  const channels = [color.red, color.green, color.blue].map((channel) =>
    channel.toString(16).padStart(2, "0"),
  );
  return "#" + channels.join("").toUpperCase();
}

const slashAlpha = (alpha: number): string => (alpha < 1 ? ` / ${percent(alpha)}` : "");

function writeAs(color: Rgba, format: ColorFormat): string {
  if (format === "rgb") return `rgb(${color.red} ${color.green} ${color.blue}${slashAlpha(color.alpha)})`;
  if (format === "hsl") {
    const [hue, saturation, lightness] = toHsl(color).map(Math.round);
    return `hsl(${hue} ${saturation}% ${lightness}%${slashAlpha(color.alpha)})`;
  }
  return writeHex(color) + (color.alpha < 1 ? ` ${percent(color.alpha)}` : "");
}

/**
 * The color as shown: `#2F6BFF` (with ` 50%` after it when translucent),
 * `rgb(47 107 255 / 50%)` or `hsl(223 100% 59% / 50%)`. A color written
 * some other way (oklch) is returned as it is.
 */
export function formatColorAs(value: string, format: ColorFormat): string {
  const color = readRgba(value);
  return color ? writeAs(color, format) : value;
}

/**
 * The color split for a row: the text that is shown and copied and, for hex,
 * its alpha as a separate part (`100%` when opaque). rgb and hsl carry their
 * alpha inside the text. A color that cannot be read has the text only.
 */
export function colorParts(value: string, format: ColorFormat): { text: string; alpha?: string } {
  const color = readRgba(value);
  if (!color) return { text: value };
  if (format !== "hex") return { text: writeAs(color, format) };
  return { text: writeHex(color), alpha: percent(color.alpha) };
}
