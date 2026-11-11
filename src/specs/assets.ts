/** The files an element shows (an image, a background), named and described as text, for the Asset block of the Specs tab. */
import { splitTopLevel } from "./declarations";

/** A size in board pixels. */
export type Size = { width: number; height: number };

const URL_LAYER = /^url\(\s*(["']?)(.*)\1\s*\)$/s;
/** Within this of a whole number, a ratio is that number. */
const RATIO_TOLERANCE = 0.02;
const DATA_IMAGE = /^data:image\/([\w.+-]+)/i;

function decodeName(name: string): string {
  try {
    return decodeURIComponent(name);
  } catch {
    // A broken escape (%E0%A4%A): the name as it is.
    return name;
  }
}

/** The last part of the address's path, decoded; "embedded" for a data URL. */
export function fileNameOf(url: string): string {
  if (url.startsWith("data:")) return "embedded";
  try {
    const { pathname, host } = new URL(url);
    return decodeName(pathname.split("/").findLast(Boolean) ?? "") || host;
  } catch {
    // Not an address: show it as it is.
    return url;
  }
}

/** What a download is saved as: the file's name, or `image.png` for a data URL. */
export function downloadName(url: string): string {
  if (!url.startsWith("data:")) return fileNameOf(url);
  const subtype = DATA_IMAGE.exec(url)?.[1];
  if (!subtype) return "image";
  return `image.${subtype.startsWith("svg") ? "svg" : subtype}`;
}

/** "2×" when the file is a whole number (2 or more) of times bigger than it is shown, the same on both axes. */
export function ratioNote({ natural, shown }: { natural: Size; shown: Size }): string {
  if (!shown.width || !shown.height) return "";
  const [across, down] = [natural.width / shown.width, natural.height / shown.height];
  const whole = Math.round(across);
  const isClean =
    whole >= 2 && Math.abs(across - whole) < RATIO_TOLERANCE && Math.abs(down - whole) < RATIO_TOLERANCE;
  return isClean ? `${whole}×` : "";
}

/** The addresses of the `url(...)` layers of a `background-image` value, first layer first. */
export function urlsIn(backgroundImage: string): string[] {
  return splitTopLevel(backgroundImage, ",").flatMap((layer) => URL_LAYER.exec(layer)?.[2] ?? []);
}
