/** Whether a token holds what a field holds: the same colour, length, shadow, time, timing function or transition. */
import { sameColor } from "../../specs/colors";
import { parseShadows, type Shadow } from "../../specs/effects";
import { easingKey, timeInMilliseconds, transitionKey } from "../../specs/motion-values";
import { type Fit, lengthInPixels } from "../../specs/suggest";

/** What a field's text means for a length: the page's root font size, and what a bare number is. */
export type LengthReading = { rootFontSize: number; bareUnit: "px" | "rem" };

/** Two lengths in pixels closer than this are the same length. */
const SAME_LENGTH_TOLERANCE_PX = 0.01;

/** The text a field holds, the text of a token, and how to read a length in either. */
type Pair = { typed: string; token: string; reading: LengthReading };

function sameLength({ typed, token, reading }: Pair): boolean {
  const asTyped = lengthInPixels(typed, reading);
  const asToken = lengthInPixels(token, { rootFontSize: reading.rootFontSize });
  const isSame =
    asTyped !== undefined && asToken !== undefined && Math.abs(asTyped - asToken) < SAME_LENGTH_TOLERANCE_PX;
  return typed.trim() === token || isSame;
}

/** A bare zero is a length, and a missing spread is zero. */
const lengthKey = (length = "0px"): string => (length === "0" ? "0px" : length);

const lengthsOf = (shadow: Shadow): string[] =>
  [shadow.x, shadow.y, shadow.blur, shadow.spread].map(lengthKey);

function sameShadow(first: Shadow, second: Shadow): boolean {
  return (
    first.inset === second.inset &&
    lengthsOf(first).join() === lengthsOf(second).join() &&
    sameColor(first.color, second.color)
  );
}

function sameShadows({ typed, token }: Pair): boolean {
  const [fromTyped, fromToken] = [parseShadows(typed), parseShadows(token)];
  return (
    fromTyped.length > 0 &&
    fromTyped.length === fromToken.length &&
    fromTyped.every((shadow, index) => sameShadow(shadow, fromToken[index]))
  );
}

const SAME: Record<Fit, (pair: Pair) => boolean> = {
  color: ({ typed, token }) => sameColor(typed, token),
  length: sameLength,
  shadow: sameShadows,
  time: ({ typed, token }) => {
    const time = timeInMilliseconds(typed);
    return time !== undefined && time === timeInMilliseconds(token);
  },
  easing: ({ typed, token }) => easingKey(typed) === easingKey(token),
  transition: ({ typed, token }) => transitionKey(typed) === transitionKey(token),
};

/** Whether a token's value is what the text says, for a field of this kind. */
export function makeHolds(fit: Fit, reading: LengthReading): (text: string) => (value: string) => boolean {
  return (typed) => (token) => SAME[fit]({ typed, token, reading });
}
