/** Transitions and animations of an element, one item per property. */

export type MotionItem = {
  /** The transitioned property, or the animation's name. */
  property: string;
  duration: string;
  /** The timing function as CSS writes it. */
  easing: string;
  /** The same timing function as cubic-bezier numbers, for drawing its curve. */
  curve: number[];
};

const KEYWORD_CURVES: Record<string, number[]> = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  "ease-in": [0.42, 0, 1, 1],
  "ease-out": [0, 0, 0.58, 1],
  "ease-in-out": [0.42, 0, 0.58, 1],
};

/** "ease-in" or "cubic-bezier(0.4, 0, 0.2, 1)" as four numbers; a straight line for the rest. */
export function easingCurve(easing: string): number[] {
  const numbers = /^cubic-bezier\((.+)\)$/.exec(easing)?.[1].split(",").map(Number);
  return numbers?.length === 4 ? numbers : (KEYWORD_CURVES[easing] ?? KEYWORD_CURVES.linear);
}

/** Splits a CSS list on the commas that are not inside parentheses. */
const listItems = (value: string): string[] => value.split(/,\s*(?![^(]*\))/);

/** The parallel lists CSS keeps for properties, durations and easings. */
type MotionLists = { properties: string; durations: string; easings: string };

/** Pairs up the parallel lists; a shorter list repeats. */
function pairUp({ properties, durations, easings }: MotionLists): MotionItem[] {
  const durationList = listItems(durations);
  const easingList = listItems(easings);
  return listItems(properties)
    .map((property, index) => {
      const easing = easingList[index % easingList.length];
      return {
        property,
        duration: durationList[index % durationList.length],
        easing,
        curve: easingCurve(easing),
      };
    })
    .filter((item) => /[1-9]/.test(item.duration));
}

export function motionItems(computedStyle: CSSStyleDeclaration): MotionItem[] {
  const transitions = pairUp({
    properties: computedStyle.transitionProperty,
    durations: computedStyle.transitionDuration,
    easings: computedStyle.transitionTimingFunction,
  });
  if (computedStyle.animationName === "none") return transitions;
  const animations = pairUp({
    properties: computedStyle.animationName,
    durations: computedStyle.animationDuration,
    easings: computedStyle.animationTimingFunction,
  });
  return [...transitions, ...animations];
}
