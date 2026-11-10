/** Transitions and animations of an element, one item per property. */

export interface MotionItem {
  /** The transitioned property, or the animation's name. */
  property: string;
  duration: string;
  /** The timing function as CSS writes it. */
  easing: string;
  /** The same timing function as cubic-bezier numbers, for drawing its curve. */
  curve: number[];
}

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

/** Pairs up the parallel lists CSS keeps for properties, durations and easings. */
function zip(properties: string, durations: string, easings: string): MotionItem[] {
  const durationList = listItems(durations);
  const easingList = listItems(easings);
  return listItems(properties)
    .map((property, i) => {
      const easing = easingList[i % easingList.length];
      return {
        property,
        duration: durationList[i % durationList.length],
        easing,
        curve: easingCurve(easing),
      };
    })
    .filter((item) => /[1-9]/.test(item.duration));
}

export function motionItems(cs: CSSStyleDeclaration): MotionItem[] {
  const transitions = zip(cs.transitionProperty, cs.transitionDuration, cs.transitionTimingFunction);
  const animations =
    cs.animationName === "none"
      ? []
      : zip(cs.animationName, cs.animationDuration, cs.animationTimingFunction);
  return [...transitions, ...animations];
}
