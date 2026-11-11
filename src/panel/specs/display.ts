/** Lengths and colours the way the Specs tab shows them and the way a click copies them. */
import { config } from "../../config";
import { options } from "../../options";
import { pageDocument } from "../../page";
import { formatColor } from "../../specs/colors";
import type { Spec } from "../../specs/spec";
import { copiedLength, type LengthCopy, type LengthDisplay, shownLength } from "../../specs/units";

export const rootFontSize = (): number =>
  parseFloat(getComputedStyle(pageDocument().documentElement).fontSize) || 16;

export const lengthDisplay = (): LengthDisplay => ({ unit: options.unit, rootFontSize: rootFontSize() });

export const lengthCopy = (): LengthCopy => ({ ...lengthDisplay(), format: config.copyFormat });

/** A length as the tab shows it: a bare number in px, or rem. */
export const shown = (value: string): string => shownLength(value, lengthDisplay());

/**
 * A length as a field of the Specs tab holds it: in rem when the tab shows
 * rem, and otherwise as the CSS has it, with its unit.
 */
export const fieldLength = (value: string): string =>
  options.unit === "rem" ? shownLength(value, lengthDisplay()) : value;

/** What a click on that length copies: with its unit, or bare, as the page configured. */
export const copied = (value: string): string => copiedLength(value, lengthCopy());

/** A spec's value as text: colours as hex, lengths in the chosen unit. */
export const shownSpec = (spec: Spec): string => (spec.color ? formatColor(spec.value) : shown(spec.value));
