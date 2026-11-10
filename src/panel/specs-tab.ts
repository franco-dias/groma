/**
 * The Specs tab: what a developer needs to build the pinned element.
 *
 * From top to bottom: the element header (where it is, what it is, its
 * classes), then one block per subject: comparison, component, layout, box,
 * colours, typography, motion. A click on any value, token or name copies
 * it.
 *
 * The action bar above switches the unit, shows a grid, compares with
 * another element, copies a link to the element and picks a colour.
 */
import { boardPosition } from "../board";
import { config } from "../config";
import { SIDES, type Sides, sidesOf } from "../box-sides";
import { h, layoutSize } from "../dom";
import { elementName, sizeText } from "../element-name";
import { easingGlyph, icon, type Intent, intentGlyph } from "../icons";
import { elementLink } from "../link";
import { options } from "../options";
import { createStyleLookup, type StyleLookup } from "../page-styles";
import { pin, pinnedElement, rerender } from "../selection";
import { formatColor, isColorValue, tokensWithColor } from "../specs/colors";
import { componentOf, componentProps } from "../specs/component";
import { motionItems } from "../specs/motion";
import { compareSpecs, type Spec, type SpecSection, specSections } from "../specs/sections";
import { declaredTokens, hasTokens, tokenModes, tokenPath } from "../specs/tokens";
import { copiedLength, copiedSpacing, shownLength } from "../specs/units";
import { copyOnClick } from "./copy";
import { saveLayout } from "./layout";
import { part, type Tab, tabBody } from "./tab";

let header: HTMLElement;
let body: HTMLElement;
/** Whether the class list in the header shows every class. */
let classesExpanded = false;

/** Everything a block needs to know about the element it describes. */
interface Context {
  el: Element;
  cs: CSSStyleDeclaration;
  stylesOf: StyleLookup;
  sections: SpecSection[];
}

// ── small builders ─────────────────────────────────────────────

const rootFontSize = (): number =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/** A length as the tab shows it: a bare number in px, or rem. */
const shown = (value: string): string => shownLength(value, options.unit, rootFontSize());

/** What a click on that length copies: with its unit, or bare, as the page configured. */
const copied = (value: string): string =>
  copiedLength(value, options.unit, rootFontSize(), config.copyFormat);

const hundredth = (pixels: number): number => Math.round(pixels * 100) / 100;

/** A spec's value as text: colours as hex, lengths in the chosen unit. */
const shownSpec = (spec: Spec): string =>
  spec.color ? formatColor(spec.value) : shown(spec.value);

function swatch(color: string, small = false): HTMLElement {
  const chip = h("span", small ? "swatch is-small" : "swatch");
  chip.style.setProperty("--swatch", color);
  return chip;
}

/** A titled block of the tab; `note` sits at the right of the title. */
function block(title: string, note = "", className = ""): HTMLElement {
  const section = body.appendChild(h("section", `block ${className}`));
  const head = section.appendChild(h("div", "block-head"));
  head.appendChild(h("h3", "", title));
  if (note) head.appendChild(h("span", "note", note));
  return section;
}

/** A label with a value that copies on click. `wide` lets a long value wrap. */
function cell(label: string, value: string, wide = false): HTMLElement {
  const row = h("div", wide ? "wide" : "cell");
  row.appendChild(h("span", "label", label));
  copyOnClick(row.appendChild(h("span", "value", shown(value))), copied(value));
  return row;
}

/** A spec by section and name, when it has a value. */
const findSpec = ({ sections }: Context, section: string, name: string): Spec | undefined =>
  sections.find((s) => s.label === section)?.rows.find((row) => row.name === name && row.value);

// ── element header ─────────────────────────────────────────────

/** Class names a build tool made up ("sc-cOPLXt", "krMpoe", "MuiBox-root-ifjwsH"). */
function looksGenerated(className: string): boolean {
  const hash = /(?:^|-)([A-Za-z]{6})$/.exec(className)?.[1] ?? "";
  const mixedCase = /[a-z]/.test(hash) && /[A-Z]/.test(hash);
  return /^(sc|css|jss)-/.test(className) || mixedCase;
}

function renderHeader(el: Element): void {
  const rect = el.getBoundingClientRect();
  const board = boardPosition(el, rect)?.board;
  const parent = el.parentElement;
  const classes = Array.from(el.classList);
  const meaningful = classes.filter((name) => !looksGenerated(name));
  header.replaceChildren();

  // Where it is: board › parent › element
  const crumbs = header.appendChild(h("div", "crumbs"));
  const separator = () => crumbs.appendChild(h("span", "sep", "›")).setAttribute("aria-hidden", "true");
  if (board) {
    crumbs.appendChild(h("span", "crumb", board));
    separator();
  }
  if (parent && parent !== document.body) {
    const up = crumbs.appendChild(h("button", "crumb", elementName(parent)));
    up.title = "Pin the parent";
    up.addEventListener("click", () => pin(parent));
    separator();
  }
  crumbs.appendChild(h("span", "crumb is-current", elementName(el)));

  // What it is: tag, name, size
  const title = header.appendChild(h("div", "title-row"));
  title.appendChild(h("span", "tag-chip", el.localName));
  const name = elementName(el);
  title.appendChild(h("span", "title", name === el.localName ? (meaningful[0] ?? name) : name));
  title.appendChild(h("span", "spacer"));
  title.appendChild(h("span", "title-size", sizeText(el, rect)));

  // Its classes: the meaningful ones on one line, or every class as a chip
  if (!classes.length) return;
  const toggle = h("button", "more");
  toggle.addEventListener("click", () => {
    classesExpanded = !classesExpanded;
    renderHeader(el);
  });
  if (classesExpanded) {
    const list = header.appendChild(h("div", "class-list"));
    [...meaningful, ...classes.filter(looksGenerated)].forEach((className) => {
      const chip = h("span", "class-chip", "." + className);
      chip.classList.toggle("is-generated", looksGenerated(className));
      list.appendChild(copyOnClick(chip, className));
    });
    toggle.append("Less", icon("chevronUp", 10));
    list.appendChild(toggle);
  } else {
    const row = header.appendChild(h("div", "class-row"));
    const visible = meaningful.length ? meaningful : classes;
    row.appendChild(h("span", "classes", visible.map((className) => "." + className).join(" ")));
    const hidden = classes.length - visible.length;
    // One or two plain classes fit on the line: nothing more to show.
    if (hidden || classes.length > 2) {
      toggle.append(hidden ? `+${hidden}` : "All", icon("chevronDown", 10));
      row.appendChild(toggle);
    }
  }
}

// ── component ──────────────────────────────────────────────────

function renderComponent({ el }: Context): void {
  const component = componentOf(el);
  if (!component) return;
  const section = block(
    component.inside ? "Inside component" : "Component",
    component.inside ? "Contains this element" : "This element",
    "component",
  );

  // The name, in a box that copies it.
  const name = h("div", component.inside ? "code is-inside" : "code");
  name.appendChild(h("span", "name", component.name));
  const mark = name.appendChild(h("span", "copy-mark"));
  mark.append(icon("copy"), icon("check"));
  mark.firstElementChild!.classList.add("when-idle");
  mark.lastElementChild!.classList.add("when-copied");
  section.appendChild(copyOnClick(name, component.name));

  // The props the design passes. Not a suggestion of code: the inspector
  // does not know which props the project's own component accepts.
  const props = componentProps(component);
  if (props.length) {
    section.appendChild(h("div", "hint", "Props in this design"));
    const list = section.appendChild(h("div", "props"));
    for (const prop of props) {
      list.appendChild(h("span", "prop-name", prop.name));
      list.appendChild(copyOnClick(h("span", "value", prop.value), prop.value));
    }
  }

  if (component.sourcePath) {
    // The path may wrap at slashes, never inside a name.
    const folders = component.sourcePath.split("/");
    const file = folders.pop() ?? "";
    const source = section.appendChild(h("div", "source"));
    source.appendChild(h("span", "label", "Source"));
    const path = source.appendChild(h("span", "path"));
    folders.forEach((folder) => path.append(folder + "/", document.createElement("wbr")));
    path.appendChild(h("span", "file", file));
    copyOnClick(path, component.sourcePath);
  }

  const root = component.element;
  if (component.inside && root) {
    const row = section.appendChild(h("div", "select-row"));
    const select = row.appendChild(h("button", "ghost-button"));
    select.append(icon("chevronUp", 12), "Select component");
    select.addEventListener("click", () => pin(root));
    row.appendChild(h("span", "hint", `Pinned: ${el.localName} inside it`));
  }
}

// ── compare ────────────────────────────────────────────────────

function stopComparing(): void {
  options.compareWith = null;
  rerender();
}

/** One side of a difference: a swatch for colours, then the value. */
function compareSide(spec: Spec | undefined, className: string): HTMLElement {
  const side = h("span", `side ${className}`);
  if (!spec?.value) {
    side.textContent = "none";
  } else {
    if (spec.color) side.appendChild(swatch(spec.value, true));
    side.append(shownSpec(spec));
  }
  return side;
}

/** A is the baseline (pinned when compare started); B is the element pinned now. */
function renderCompare(context: Context): void {
  const baseline = options.compareWith;
  if (!baseline?.isConnected) return;
  const section = block("Compare");
  const stop = section.firstElementChild!.appendChild(h("button", "ghost-button"));
  stop.append(icon("close", 12), "Stop", h("kbd", "", "Esc"));
  stop.addEventListener("click", stopComparing);

  const who = (letter: string, el: Element, role: string) => {
    const row = section.appendChild(h("div", "who"));
    row.appendChild(h("span", letter === "A" ? "letter" : "letter is-b", letter));
    row.appendChild(h("span", "name", elementName(el)));
    row.appendChild(h("span", "board", boardPosition(el, el.getBoundingClientRect())?.board ?? ""));
    row.appendChild(h("span", "spacer"));
    row.appendChild(h("span", "hint", role));
  };
  who("A", baseline, "Baseline");
  if (baseline === context.el) {
    section.appendChild(h("div", "compare-summary", "Pin another element to compare it with A."));
    return;
  }
  who("B", context.el, "Pinned");

  const baselineSections = specSections(baseline, getComputedStyle(baseline), context.stylesOf);
  const { differences, identical } = compareSpecs(baselineSections, context.sections);
  const count = differences.length === 1 ? "1 difference" : `${differences.length} differences`;
  section.appendChild(h("div", "compare-summary", `${count} · ${identical} identical`));
  for (const difference of differences) {
    const row = section.appendChild(h("div", "compare-row"));
    row.appendChild(h("span", "label", difference.name));
    row.append(
      compareSide(difference.before, "is-before"),
      icon("arrow"),
      compareSide(difference.after, "is-after"),
    );
  }
}

// ── layout ─────────────────────────────────────────────────────

function sizeRow(el: Element, intents: string): HTMLElement {
  const row = h("div", "size-row");
  row.appendChild(h("span", "label", "Size"));
  const size = sizeText(el);
  copyOnClick(row.appendChild(h("span", "value", size)), size);
  row.appendChild(h("span", "spacer"));

  // "fill × hug": each word with its glyph; the height glyph is turned 90°.
  const [width, height] = intents.split(" × ") as Intent[];
  const list = row.appendChild(h("span", "intents"));
  const intent = (word: Intent, className: string) => {
    const item = list.appendChild(h("span", `intent ${className}`));
    item.append(intentGlyph(word), word);
  };
  intent(width, "is-width");
  list.appendChild(h("span", "", "×"));
  intent(height, "is-height");
  return row;
}

/** Tokens a non-colour value is declared with, as "Gap  --spacing-4" lines. */
function tokenNotes(context: Context, specs: [label: string, spec: Spec | undefined][]): HTMLElement[] {
  return specs.flatMap(([label, spec]) =>
    declaredTokens(context.el, spec?.props ?? [], context.stylesOf).map((token) => {
      const row = h("div", "wide");
      row.appendChild(h("span", "label", label));
      const path = tokenPath(token, config.tokenPrefixes);
      copyOnClick(row.appendChild(h("span", "token-note", path || token)), path || token);
      return row;
    }),
  );
}

function renderLayout(context: Context): void {
  const { el, cs } = context;
  const onBoard = boardPosition(el, el.getBoundingClientRect());
  const section = block("Layout", onBoard ? "X, Y on board" : "");
  section.appendChild(sizeRow(el, findSpec(context, "Layout", "size")?.note ?? "hug × hug"));

  const spec = (sectionName: string, name: string) => findSpec(context, sectionName, name);
  const isFlex = cs.display.includes("flex");
  const cells: [label: string, value: string | undefined, spec?: Spec][] = [
    ["X", onBoard ? String(onBoard.x) : ""],
    ["Y", onBoard ? String(onBoard.y) : ""],
    ["Display", cs.display],
    ["Direction", isFlex ? cs.flexDirection + (cs.flexWrap === "nowrap" ? "" : " wrap") : ""],
    ["Align", spec("Layout", "align")?.value],
    ["Justify", spec("Layout", "justify")?.value],
    ["Gap", spec("Layout", "gap")?.value, spec("Layout", "gap")],
    ["Radius", spec("Shape", "radius")?.value, spec("Shape", "radius")],
    ["Border", spec("Shape", "border")?.value, spec("Shape", "border")],
    ["Opacity", spec("Shape", "opacity")?.value, spec("Shape", "opacity")],
    ["Stroke", spec("Icon", "stroke width")?.value, spec("Icon", "stroke width")],
  ];
  const grid = section.appendChild(h("div", "grid2"));
  cells.forEach(([label, value]) => value && grid.appendChild(cell(label, value)));

  // Values too long for half a row
  const wide: [label: string, spec: Spec | undefined][] = [
    ["Position", spec("Layout", "position")],
    ["Columns", spec("Layout", "columns")],
    ["Shadow", spec("Shape", "shadow")],
    ["Gradient", spec("Shape", "gradient")],
  ];
  wide.forEach(([label, row]) => row && section.appendChild(cell(label, row.value, true)));

  const tokenised = [
    ...cells.map(([label, , row]): [string, Spec | undefined] => [label, row]),
    ...wide,
  ];
  section.append(...tokenNotes(context, tokenised));
}

// ── box ────────────────────────────────────────────────────────

/** The four numbers of one ring, each on its own side; a click copies it. */
function boxSides(box: HTMLElement, sides: Sides): void {
  for (const side of SIDES) {
    const value = `${hundredth(sides[side])}px`;
    box.appendChild(copyOnClick(h("span", `box-side is-${side}`, shown(value)), copied(value)));
  }
}

/** Margin around padding around the content size, as nested boxes. */
function renderBox({ el, cs }: Context): void {
  const margin = sidesOf(cs, "margin");
  const padding = sidesOf(cs, "padding");
  const border = sidesOf(cs, "border");
  const size = layoutSize(el, el.getBoundingClientRect());
  const contentWidth = size.width - padding.left - padding.right - border.left - border.right;
  const contentHeight = size.height - padding.top - padding.bottom - border.top - border.bottom;
  const spacing = (name: "margin" | "padding", sides: Sides) =>
    copiedSpacing(
      name,
      SIDES.map((side) => hundredth(sides[side])),
      options.unit,
      rootFontSize(),
      config.copyFormat,
    );

  const section = block("Box");
  const marginBox = section.appendChild(h("div", "box-margin"));
  const marginName = copyOnClick(h("span", "box-name", "margin"), () => spacing("margin", margin));
  marginName.title = "Click to copy all four sides";
  marginBox.appendChild(marginName);
  boxSides(marginBox, margin);

  const paddingBox = marginBox.appendChild(h("div", "box-padding"));
  const paddingName = copyOnClick(h("span", "box-name", "padding"), () =>
    spacing("padding", padding),
  );
  paddingName.title = "Click to copy all four sides";
  paddingBox.appendChild(paddingName);
  boxSides(paddingBox, padding);

  const content = `${hundredth(contentWidth)} × ${hundredth(contentHeight)}`;
  paddingBox.appendChild(h("div", "box-content", content));
}

// ── colours ────────────────────────────────────────────────────

/** ":root, .light" -> "light"; ".dark" -> "dark"; ":root" -> "default". */
function scopeName(selector: string): string {
  const name = /([\w-]+)["'\]]*\s*$/.exec(selector)?.[1] ?? selector;
  return name === "root" ? "default" : name;
}

/**
 * A colour with its design token, in the order a developer reads it: the
 * resolved value, the theme path (what goes into `sx`), the CSS variable,
 * then the value in each theme. Every line copies on its own.
 */
function colorRow(spec: Spec, role: string, context: Context): HTMLElement {
  const { el, cs, stylesOf } = context;
  const row = h("div", "token-row");
  const copies = <T extends HTMLElement>(node: T, text: string) => copyOnClick(node, text, row);
  const [hex, alpha = "100%"] = formatColor(spec.value).split(" ");

  const line = row.appendChild(h("div", "token-line"));
  line.appendChild(swatch(spec.value));
  line.appendChild(copies(h("span", "value", hex), hex));
  if (isColorValue(hex)) line.appendChild(h("span", "alpha", alpha));

  const declared = declaredTokens(el, spec.props ?? [], stylesOf);
  const similar = declared.length || !hasTokens(cs) ? [] : tokensWithColor(cs, spec.value);
  const missing = !declared.length && !similar.length && hasTokens(cs);
  if (similar.length) line.appendChild(h("span", "badge", "Matches token"));
  if (missing) {
    const badge = line.appendChild(h("span", "badge is-warn"));
    badge.append(icon("warning", 10), "No token");
    row.classList.add("is-missing");
  }

  line.appendChild(h("span", "spacer"));
  const slot = line.appendChild(h("span", "role"));
  slot.appendChild(h("span", "name", role));
  slot.appendChild(h("span", "copy-hint")).append(icon("copy", 12), "Copy");
  slot.appendChild(h("span", "copied")).append(icon("check", 12), "Copied");

  for (const token of declared) {
    const path = tokenPath(token, config.tokenPrefixes);
    if (path) row.appendChild(copies(h("div", "theme-path", path), path));
    row.appendChild(copies(h("div", path ? "css-var is-secondary" : "css-var", token), token));
    const modes = tokenModes(token);
    if (modes.length) row.appendChild(modesLine(modes, cs.getPropertyValue(token).trim()));
  }
  // A colour the design wrote by hand that happens to equal a token.
  similar.slice(0, 2).forEach((token) => {
    row.appendChild(copies(h("div", "css-var is-secondary", token), token));
  });
  if (missing) row.appendChild(h("div", "warn-text", "Hard-coded value. No token has this colour."));
  return row;
}

/** The token's value in each theme; the theme the page is using stands out. */
function modesLine(modes: [scope: string, value: string][], current: string): HTMLElement {
  const line = h("div", "modes");
  for (const [scope, value] of modes) {
    const mode = line.appendChild(h("span", value === current ? "mode is-active" : "mode"));
    if (isColorValue(value)) mode.appendChild(swatch(value, true));
    mode.append(value, h("span", "scope", scopeName(scope)));
    copyOnClick(mode, value);
  }
  return line;
}

const COLOR_ROLES: [section: string, name: string, role: string][] = [
  ["Shape", "background", "Background"],
  ["Shape", "border color", "Border"],
  ["Text", "color", "Text"],
  ["Icon", "fill", "Fill"],
  ["Icon", "stroke", "Stroke"],
];

function renderColors(context: Context): void {
  const rows = COLOR_ROLES.flatMap(([section, name, role]) => {
    const spec = findSpec(context, section, name);
    return spec ? [colorRow(spec, role, context)] : [];
  });
  if (options.pickedColor) {
    rows.push(colorRow({ name: "picked", value: options.pickedColor, color: true }, "Picked", context));
  }
  if (!rows.length) return;
  block("Colors").appendChild(h("div", "token-rows")).append(...rows);
}

// ── typography ─────────────────────────────────────────────────

function renderTypography(context: Context): void {
  const { cs } = context;
  const font = findSpec(context, "Text", "font");
  if (!font) return;
  const section = block("Typography");
  const family = cs.fontFamily.split(",")[0].replaceAll('"', "");
  section.appendChild(cell("Family", family));

  const text = (name: string) => findSpec(context, "Text", name)?.value;
  const cells: [label: string, value: string | undefined][] = [
    ["Weight", cs.fontWeight],
    ["Size", cs.fontSize],
    ["Line", cs.lineHeight],
    ["Tracking", text("spacing")],
    ["Transform", text("transform")],
    ["Align", text("align")],
    ["Decoration", text("decoration")],
  ];
  const grid = section.appendChild(h("div", "grid2"));
  cells.forEach(([label, value]) => value && grid.appendChild(cell(label, value)));
  section.append(...tokenNotes(context, [["Font", font]]));
}

// ── motion ─────────────────────────────────────────────────────

function renderMotion({ cs }: Context): void {
  const items = motionItems(cs);
  if (!items.length) return;
  const section = block("Motion");
  for (const item of items) {
    const row = section.appendChild(h("div", "motion-row"));
    row.appendChild(easingGlyph(item.curve));
    row.appendChild(h("span", "property", item.property));
    row.appendChild(h("span", "duration", item.duration));
    row.appendChild(h("span", "easing", item.easing));
    row.title = "Click to copy";
    copyOnClick(row, `${item.property} ${item.duration} ${item.easing}`);
  }
}

// ── action bar ─────────────────────────────────────────────────

/** A row of exclusive choices; marks the one equal to `current()`. */
function segmented(group: HTMLElement, current: () => string, choose: (value: string) => void) {
  const segments = Array.from(group.querySelectorAll<HTMLElement>(".segment"));
  const show = () => {
    segments.forEach((segment) => {
      segment.setAttribute("aria-checked", String(segment.dataset.value === current()));
    });
    group.classList.toggle("is-on", group.querySelector('.is-on[aria-checked="true"]') !== null);
  };
  segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      choose(segment.dataset.value ?? "");
      show();
      rerender();
    });
  });
  show();
}

function mountActionBar(panel: HTMLElement): void {
  segmented(
    part(panel, '[data-option="unit"]'),
    () => options.unit,
    (value) => {
      options.unit = value === "rem" ? "rem" : "px";
      saveLayout(panel);
    },
  );
  segmented(
    part(panel, '[data-option="grid"]'),
    () => String(options.gridStep),
    (value) => {
      options.gridStep = Number(value);
    },
  );

  const compare = part(panel, '[data-action="compare"]');
  const showCompare = () => compare.setAttribute("aria-pressed", String(options.compareWith !== null));
  compare.addEventListener("click", () => {
    options.compareWith = options.compareWith ? null : pinnedElement();
    rerender();
  });
  // Esc ends a comparison, wherever the focus is on the page.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && options.compareWith) stopComparing();
  });

  const pick = part(panel, '[data-action="pick"]');
  pick.hidden = !window.EyeDropper;
  pick.addEventListener("click", async () => {
    pick.setAttribute("aria-pressed", "true");
    try {
      options.pickedColor = (await new window.EyeDropper!().open()).sRGBHex;
    } catch {
      // The user pressed Escape.
    }
    pick.setAttribute("aria-pressed", "false");
    rerender();
  });

  copyOnClick(part(panel, '[data-action="link"]'), () => {
    const pinned = pinnedElement();
    return pinned ? elementLink(pinned) : location.href;
  });

  renderActionStates = showCompare;
}

/** Brings the action bar in line with the options; set once the bar is mounted. */
let renderActionStates = (): void => {};

// ── tab ────────────────────────────────────────────────────────

function renderSpecs(el: Element): void {
  const cs = getComputedStyle(el);
  const stylesOf = createStyleLookup();
  const context: Context = { el, cs, stylesOf, sections: specSections(el, cs, stylesOf) };

  renderActionStates();
  renderHeader(el);
  const scrollTop = body.scrollTop;
  body.replaceChildren();
  renderCompare(context);
  renderComponent(context);
  renderLayout(context);
  renderBox(context);
  renderColors(context);
  renderTypography(context);
  renderMotion(context);
  body.scrollTop = scrollTop;
}

export const specsTab: Tab = {
  mount(panel) {
    header = part(panel, ".element-header");
    body = tabBody(panel, "specs");
    mountActionBar(panel);
  },
  render(el, change) {
    if (change === "pinned") body.scrollTop = 0;
    renderSpecs(el);
  },
};
