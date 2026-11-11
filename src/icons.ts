/** The inspector's icons: stroke drawings on a 24px grid, sized where they are used. */

const SVG_NS = "http://www.w3.org/2000/svg";

/** The drawing inside each icon's `<svg>`. */
const ICONS = {
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  chevronUp: '<path d="m18 15-6-6-6 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  file:
    '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>' +
    '<path d="M14 2v4a2 2 0 0 0 2 2h4"/>',
  warning:
    '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>' +
    '<path d="M12 9v4M12 17h.01"/>',
  inspect: '<circle cx="12" cy="12" r="8"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
} as const;

/** Sizing-intent glyphs, drawn on a 12px grid. */
const INTENT_GLYPHS = {
  fixed: '<path d="M2 6h8M2 3.5v5M10 3.5v5"/>',
  hug: '<path d="M1.5 3.5 4 6 1.5 8.5M10.5 3.5 8 6l2.5 2.5M6 3v6"/>',
  fill: '<path d="M1.5 6h9M4 3.5 1.5 6 4 8.5M8 3.5 10.5 6 8 8.5"/>',
} as const;

/**
 * Where a flex container puts its items, drawn on a 16px grid for items laid
 * out in a row: an edge and two items. The stylesheet turns them for the
 * other axis, so one set serves both.
 */
const FLEX_GLYPHS = {
  row: '<path d="M2 8h12M10 4l4 4-4 4"/>',
  start: '<path d="M2 2v12M5 6h8M5 10h5"/>',
  center: '<path d="M8 2v12M4 6h8M5.5 10h5"/>',
  end: '<path d="M14 2v12M3 6h8M6 10h5"/>',
  between: '<path d="M2 2v12M14 2v12M4.5 5v6M11.5 5v6"/>',
  around: '<path d="M2 2v12M14 2v12M5.5 5v6M10.5 5v6"/>',
  evenly: '<path d="M2 2v12M14 2v12M6.5 5v6M9.5 5v6"/>',
  stretch: '<path d="M2 2v12M14 2v12M5 6h6M5 10h6"/>',
} as const;

export type FlexGlyph = keyof typeof FLEX_GLYPHS;

export const flexGlyph = (name: FlexGlyph): SVGSVGElement => svg(FLEX_GLYPHS[name], { size: 14, grid: 16 });

export type IconName = keyof typeof ICONS;
export type Intent = keyof typeof INTENT_GLYPHS;

/** The size an icon is shown at, and the grid it is drawn on. */
type IconGrid = { size: number; grid: number };

function svg(drawing: string, { size, grid }: IconGrid): SVGSVGElement {
  const element = document.createElementNS(SVG_NS, "svg");
  element.setAttribute("class", "icon");
  element.setAttribute("width", String(size));
  element.setAttribute("height", String(size));
  element.setAttribute("viewBox", `0 0 ${grid} ${grid}`);
  element.innerHTML = drawing;
  return element;
}

export const icon = (name: IconName, size = 14): SVGSVGElement => svg(ICONS[name], { size, grid: 24 });

export const intentGlyph = (intent: Intent): SVGSVGElement =>
  svg(INTENT_GLYPHS[intent], { size: 12, grid: 12 });

/**
 * A 16px easing curve with its axes, for a CSS timing function given as its
 * four cubic-bezier numbers.
 */
export function easingGlyph([x1, y1, x2, y2]: number[]): SVGSVGElement {
  const curve = `M2 14C${curveX(x1)} ${curveY(y1)} ${curveX(x2)} ${curveY(y2)} 14 2`;
  return svg(`<path d="M2 2v12h12" opacity="0.4"/><path d="${curve}"/>`, { size: 16, grid: 16 });
}

const curveX = (progress: number): number => 2 + 12 * progress;
const curveY = (progress: number): number => 14 - 12 * progress;
