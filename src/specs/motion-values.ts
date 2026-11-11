/**
 * What a transition's values are, read as text: a time, a timing function, a
 * whole transition. The Specs tab uses it to offer the page's tokens of that
 * kind under a field, and to tell whether a token holds what a field holds.
 */
import { splitTopLevel } from "./declarations";
import { KEYWORD_CURVES } from "./motion";

const TIME = /^[+-]?(\d+\.?\d*|\.\d+)(ms|s)$/i;
const EASING_FUNCTION = /^(cubic-bezier|steps|linear)\(.+\)$/;
const EASING_KEYWORDS = new Set([...Object.keys(KEYWORD_CURVES), "step-start", "step-end"]);

/** A single time: `150ms`, `0.2s`. A length, a bare number or a list is not one. */
export const isTimeValue = (value: string): boolean => TIME.test(value.trim());

/** `150ms` and `0.15s` are 150; undefined for anything that is not a time. */
export function timeInMilliseconds(value: string): number | undefined {
  const parts = TIME.exec(value.trim());
  if (!parts) return undefined;
  // Rounded: 0.15 × 1000 is not exactly 150.
  return Math.round(parseFloat(parts[0]) * (parts[2].toLowerCase() === "s" ? 1000 : 1) * 1000) / 1000;
}

/** A timing function: a keyword, or `cubic-bezier()`, `steps()` or `linear()`. */
export function isEasingValue(value: string): boolean {
  const text = value.trim().toLowerCase();
  return EASING_KEYWORDS.has(text) || EASING_FUNCTION.test(text);
}

/** One entry of a transition: it has a time, and something besides the time. */
function isTransitionEntry(entry: string): boolean {
  const tokens = splitTopLevel(entry, " ");
  return tokens.some(isTimeValue) && tokens.some((token) => !isTimeValue(token));
}

/** A whole transition (`all 150ms ease`, a list of them): it contains a time and is not only times. */
export function isTransitionValue(value: string): boolean {
  const entries = splitTopLevel(value, ",");
  return entries.length > 0 && entries.every(isTransitionEntry);
}

/** The same key for the same timing function in any spelling: `ease` and its `cubic-bezier()` agree. */
export function easingKey(value: string): string {
  const text = value.trim().toLowerCase();
  const numbers = /^cubic-bezier\((.+)\)$/.exec(text)?.[1].split(",").map(Number);
  const curve = numbers?.length === 4 ? numbers : undefined;
  const keyword = Object.hasOwn(KEYWORD_CURVES, text) ? KEYWORD_CURVES[text] : undefined;
  return (curve ?? keyword)?.join(",") ?? text.replace(/\s+/g, " ");
}

function entryKey(entry: string): string {
  const tokens = splitTopLevel(entry, " ");
  const [duration = 0, delay = 0] = tokens.filter(isTimeValue).map(timeInMilliseconds);
  const easing = tokens.find(isEasingValue) ?? "ease";
  const property = tokens.find((token) => !isTimeValue(token) && !isEasingValue(token)) ?? "all";
  return [property, duration, easingKey(easing), delay].join("|");
}

/** The same key for two transitions that do the same, whatever the units and the defaults they leave out. */
export const transitionKey = (value: string): string => splitTopLevel(value, ",").map(entryKey).join(";");
