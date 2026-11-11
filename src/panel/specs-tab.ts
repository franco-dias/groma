/**
 * The Specs tab: what a developer needs to build the pinned element.
 *
 * From top to bottom: the element header (where it is, what it is, its
 * classes), then one block per subject: comparison, component, layout, box,
 * colours, typography, motion. A click on any value, token or name copies
 * it. A double-click on a value that is one CSS property (a size, a side of
 * the box, a colour, a font size) turns it into a field: the edit is made on
 * the page like one from the All CSS tab, and is listed in the Edits tab.
 * Values that cannot be edited are dimmed. Beside the size, each axis says
 * whether it is fixed, hugs its content or fills its parent; a click on the
 * word changes it. A flex container shows its direction and where it puts
 * its items, along and across that direction, as buttons to click; a grid
 * shows where it puts each item in its cell the same way, and its columns
 * and rows one by one, to count, resize and add.
 *
 * The action bar above switches the unit, shows a grid, compares with
 * another element, copies a link to the element and picks a colour.
 */
import { boardPosition } from "../board";
import { config } from "../config";
import { SIDES, type Sides, sidesOf } from "../box-sides";
import { h, layoutSize } from "../dom";
import { edit, together } from "../edits/changes";
import { isValidStyle, savedStyles } from "../edits/overrides";
import { getSelector } from "../edits/selector";
import { elementName, sizeText } from "../element-name";
import { easingGlyph, type FlexGlyph, flexGlyph, icon, type Intent, intentGlyph } from "../icons";
import { declaredValue } from "../page-styles";
import { type Axis, sizingContext, sizingDeclarations } from "../specs/sizing";
import { formatTracks, parseTracks, trackIntent, trackSize, tracksMatch, usedTracks } from "../specs/tracks";
import { elementLink } from "../link";
import { options } from "../options";
import { onPage, pageAddress, pageDocument } from "../page";
import { createStyleLookup, type StyleLookup } from "../page-styles";
import { pin, pinnedElement, rerender } from "../selection";
import { formatColor, isColorValue, tokensWithColor } from "../specs/colors";
import { componentOf, componentProps } from "../specs/component";
import { motionItems } from "../specs/motion";
import { compareSpecs, type Spec, type SpecSection, specSections } from "../specs/sections";
import { declaredTokens, hasTokens, tokenModes, tokenPath } from "../specs/tokens";
import { compactSides, copiedLength, copiedSpacing, nudged, shownLength } from "../specs/units";
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
  parseFloat(getComputedStyle(pageDocument().documentElement).fontSize) || 16;

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

/** The pinned element's selector and saved edits, for the values that can be edited. */
let pinned: { el: Element; selector: string; saved: Record<string, string> };

/**
 * Makes a value editable: a double-click turns it into a field that holds
 * `value`, the CSS value of `prop`.
 *   Enter or blur   apply       Escape   cancel
 *   ↑ / ↓           change a number by 1 (Shift: 10, Alt: 0.1), applied live
 * An empty field removes the edit. A bare number is taken as pixels where
 * the property wants a length, since that is how the tab shows lengths.
 *
 * With `whole`, the field holds one part of the property (a track of a grid)
 * and `whole` gives the property's value for what was typed.
 */
function editable<T extends HTMLElement>(
  node: T,
  prop: string,
  value: string,
  whole?: (typed: string) => string,
): T {
  const { el, selector, saved } = pinned;
  const text = node.textContent;
  let editing = false;
  node.classList.add("is-editable");
  node.classList.toggle("is-edited", prop in saved);
  node.title = "Click to copy · double-click to edit";
  node.dataset.edits = prop;

  const commit = (typed: string, nudge = false): boolean => {
    // "24", or "12 16" for the sides of a box: every bare number gets its unit.
    const inPixels = typed.replace(/(?<![\w.#-])(-?\d*\.?\d+)(?![\w.%])/g, "$1px");
    const [asTyped, asPixels] = [typed, inPixels].map((text) => (whole ? whole(text) : text));
    const value = typed && !isValidStyle(prop, asTyped) && isValidStyle(prop, asPixels) ? asPixels : asTyped;
    return edit(selector, prop, value || null, el, nudge);
  };
  // What the field holds: the saved edit as it was typed, or the page's value.
  const held = whole ? value : (saved[prop] ?? value);
  const stop = () => {
    editing = false;
    node.contentEditable = "false";
    node.classList.remove("is-editing");
  };

  node.addEventListener("dblclick", () => {
    if (editing) return;
    editing = true;
    node.textContent = held;
    node.contentEditable = "plaintext-only";
    node.spellcheck = false;
    node.classList.add("is-editing");
    node.focus();
    try {
      getSelection()?.selectAllChildren(node);
    } catch {
      // The field is still focused; the user selects by hand.
    }
  });
  // While it is a field, a click places the caret: it does not copy.
  node.addEventListener(
    "click",
    (e) => {
      if (editing) e.stopImmediatePropagation();
    },
    true,
  );
  node.addEventListener("blur", () => {
    if (!editing) return;
    const typed = (node.textContent ?? "").trim();
    stop();
    if (typed !== held) commit(typed);
    rerender();
  });
  node.addEventListener("keydown", (e) => {
    if (!editing) return;
    if (e.key === "Enter") {
      e.preventDefault();
      node.blur();
    }
    if (e.key === "Escape") {
      // Not the page's Escape, and not the end of a comparison.
      e.stopPropagation();
      stop();
      node.textContent = text;
      // Arrow keys may have changed the page already: show what is there now.
      rerender();
    }
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
    const next = nudged(node.textContent ?? "", e.key === "ArrowUp" ? 1 : -1, step);
    if (next === null) return;
    e.preventDefault();
    if (commit(next, true)) node.textContent = next;
  });
  return node;
}

/**
 * A label with a value that copies on click. `wide` lets a long value wrap.
 * With `prop`, the CSS property the value is, a double-click edits it.
 */
function cell(label: string, value: string, wide = false, prop = ""): HTMLElement {
  const row = h("div", wide ? "wide" : "cell");
  row.appendChild(h("span", "label", label));
  const node = copyOnClick(row.appendChild(h("span", "value", shown(value))), copied(value));
  if (prop) editable(node, prop, value);
  // Dimmed, so the values a double-click edits stand out beside it.
  else node.classList.add("is-readonly");
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
  const board = boardPosition(el)?.board;
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
  if (parent && parent !== parent.ownerDocument.body) {
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
  title.appendChild(h("span", "title-size", sizeText(el)));

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
    row.appendChild(h("span", "board", boardPosition(el)?.board ?? ""));
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

const INTENTS: [intent: Intent, meaning: string][] = [
  ["fixed", "a set size"],
  ["hug", "as big as its content"],
  ["fill", "as big as its parent allows"],
];

/**
 * Gives an axis of the pinned element a sizing intent. It may take two
 * properties (in a flex parent, filling is growing or stretching); they are
 * one step to undo. A property that already has the value is left alone.
 */
function setIntent({ el, cs, stylesOf }: Context, axis: Axis, intent: Intent): void {
  const { selector, saved } = pinned;
  const now = (prop: string): string =>
    prop === axis ? declaredValue(stylesOf(el), prop) || "auto" : cs.getPropertyValue(prop);
  const declarations = sizingDeclarations(axis, intent, cs.getPropertyValue(axis), sizingContext(el, axis))
    .filter(([prop, value]) => prop in saved || now(prop) !== value);
  together(() => declarations.forEach(([prop, value]) => edit(selector, prop, value, el)));
  rerender();
}

interface MenuItem {
  value: string;
  glyph: SVGSVGElement;
  /** Said after the value, muted: what it means, or the property it sets. */
  hint: string;
  checked: boolean;
  pick: () => void;
}

/** The small menu open under a row of the tab, if any. One at a time. */
let openMenu: HTMLElement | null = null;

function closeMenu(): void {
  openMenu?.remove();
  openMenu = null;
}

/** Opens a menu of choices under `row`; asked again for the same menu, closes it. */
function toggleMenu(row: HTMLElement, name: string, items: MenuItem[]): void {
  const reopen = openMenu?.dataset.menu !== name;
  closeMenu();
  if (!reopen) return;
  const menu = h("div", "row-menu");
  menu.setAttribute("role", "menu");
  menu.dataset.menu = name;
  for (const { value, glyph, hint, checked, pick } of items) {
    const item = menu.appendChild(h("button", "more-item"));
    item.setAttribute("role", "menuitemradio");
    item.setAttribute("aria-checked", String(checked));
    item.dataset.value = value;
    const check = icon("check", 12);
    check.classList.add("check");
    item.append(check, glyph, value, h("span", "hint", hint));
    item.addEventListener("click", pick);
  }
  openMenu = row.appendChild(menu);
}

function sizeRow(context: Context, intents: string): HTMLElement {
  const { el, cs } = context;
  const row = h("div", "size-row");
  row.appendChild(h("span", "label", "Size"));
  // One value to copy, "444 × 382", made of two to edit. The fields hold the
  // CSS width and height, which leave out padding and border on an element
  // sized by its content box; the size shown is the whole box.
  const size = sizeText(el);
  const [width, height] = size.split(" × ");
  const value = copyOnClick(row.appendChild(h("span", "value")), size);
  const widthField = editable(h("span", "", width), "width", cs.width);
  const heightField = editable(h("span", "", height), "height", cs.height);
  value.append(widthField, h("span", "times", " × "), heightField);
  if (cs.boxSizing === "content-box") {
    // Said only where it surprises: the field will not hold the number shown.
    const title = "Click to copy · double-click to edit. content-box: the CSS value leaves out padding and border";
    widthField.title = heightField.title = title;
  }
  row.appendChild(h("span", "spacer"));

  // "fill × hug": each word with its glyph; the height glyph is turned 90°.
  const [widthIntent, heightIntent] = intents.split(" × ") as Intent[];
  const list = row.appendChild(h("span", "intents"));
  const intent = (word: Intent, axis: Axis) => {
    const item = list.appendChild(h("button", `intent is-${axis}`));
    const chevron = icon("chevronDown", 10);
    chevron.classList.add("chevron");
    item.append(intentGlyph(word), word, chevron);
    item.title = `How the ${axis} is set. Click to change it`;
    item.setAttribute("aria-haspopup", "menu");
    item.addEventListener("click", (e) => {
      // The body's click closes the menu (see `mount`): this one opens it.
      e.stopPropagation();
      toggleMenu(
        row,
        axis,
        INTENTS.map(([value, hint]) => ({
          value,
          glyph: intentGlyph(value),
          hint,
          checked: value === word,
          // The intent it has already: nothing to set, even where the element
          // has it by default and no declaration says so.
          pick: () => (value === word ? rerender() : setIntent(context, axis, value)),
        })),
      );
    });
  };
  intent(widthIntent, "width");
  list.appendChild(h("span", "", "×"));
  intent(heightIntent, "height");
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

/** One choice of a flex control: its drawing, and the values of the property it stands for. */
type FlexChoice = [glyph: FlexGlyph, value: string, ...alsoWhen: string[]];

interface FlexControl {
  label: string;
  prop: string;
  /** Said beside the buttons, so "align" and "justify" are never a guess. */
  axis: string;
  choices: FlexChoice[];
  /** Values that share one last button, which opens them as a menu. */
  more?: FlexChoice[];
}

/** Start, centre, end or stretch: where a container puts an item on one axis. */
const PLACES: FlexChoice[] = [
  ["start", "start", "flex-start", "left"],
  ["center", "center"],
  ["end", "end", "flex-end", "right"],
  ["stretch", "stretch", "normal", "legacy"],
];

/** A grid places each item inside its cell, on both axes. */
const GRID_CONTROLS: FlexControl[] = [
  { label: "Justify", prop: "justify-items", axis: "across each cell", choices: PLACES },
  { label: "Align", prop: "align-items", axis: "down each cell", choices: PLACES },
];

const FLEX_CONTROLS: FlexControl[] = [
  { label: "Direction", prop: "flex-direction", axis: "", choices: [["row", "row"], ["row", "column"]] },
  {
    label: "Justify",
    prop: "justify-content",
    axis: "along the direction",
    choices: [
      ["start", "flex-start", "normal", "start", "left"],
      ["center", "center"],
      ["end", "flex-end", "end", "right"],
    ],
    // Ways to share out the space between the items: one button, three values.
    more: [
      ["between", "space-between"],
      ["around", "space-around"],
      ["evenly", "space-evenly"],
    ],
  },
  {
    label: "Align",
    prop: "align-items",
    axis: "across the direction",
    choices: [
      ["start", "flex-start", "start"],
      ["center", "center"],
      ["end", "flex-end", "end"],
      ["stretch", "stretch", "normal"],
    ],
  },
];

/**
 * A flex container's direction and where it puts its items, as buttons: the
 * drawings are turned to the container's direction, so each shows what it
 * does on the page. The ways to share out the space (`space-between`,
 * `space-around`, `space-evenly`) are a menu behind one button, each named
 * with the property it sets. A value no button stands for (`baseline`) is
 * shown after them, to edit as text.
 *
 * A grid has the same buttons for where each item sits in its cell.
 */
function flexControls({ cs }: Context, isGrid: boolean): HTMLElement {
  const { el, selector } = pinned;
  const controls = h("div", "flex-controls");
  // A grid's drawings are never turned: across is always the inline axis.
  controls.classList.toggle("is-column", !isGrid && cs.flexDirection.startsWith("column"));
  for (const { label, prop, axis, choices, more } of isGrid ? GRID_CONTROLS : FLEX_CONTROLS) {
    const now = cs.getPropertyValue(prop);
    const row = controls.appendChild(h("div", "cell flex-control"));
    row.dataset.prop = prop;
    const name = row.appendChild(h("span", "label", label));
    name.title = axis ? `${prop}: where the items sit ${axis}` : prop;
    const group = row.appendChild(h("div", "segmented"));
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", label);
    let shown = false;
    for (const [glyph, value, ...alsoWhen] of choices) {
      // "row-reverse" is a row: the buttons choose the axis, not its sense.
      const checked = [value, ...alsoWhen].includes(now) || (prop === "flex-direction" && now.startsWith(value));
      shown ||= checked;
      const button = group.appendChild(h("button", "segment"));
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(checked));
      button.setAttribute("aria-label", value);
      button.title = `${prop}: ${value}`;
      button.dataset.value = value;
      button.appendChild(flexGlyph(glyph));
      button.addEventListener("click", () => {
        if (!checked) edit(selector, prop, value, el);
        rerender();
      });
    }
    if (more) {
      const current = more.find(([, value]) => value === now);
      shown ||= current !== undefined;
      const button = group.appendChild(h("button", "segment"));
      button.setAttribute("aria-haspopup", "menu");
      button.setAttribute("aria-checked", String(current !== undefined));
      button.setAttribute("aria-label", "Share out the space");
      button.title = `${prop}: ${current?.[1] ?? more.map(([, value]) => value).join(", ")}`;
      button.dataset.value = "more";
      button.appendChild(flexGlyph(current?.[0] ?? more[0][0]));
      button.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleMenu(
          row,
          prop,
          more.map(([glyph, value]) => ({
            value,
            glyph: flexGlyph(glyph),
            hint: prop,
            checked: value === now,
            pick: () => {
              edit(selector, prop, value, el);
              rerender();
            },
          })),
        );
      });
    }
    if (!shown) editable(copyOnClick(row.appendChild(h("span", "value", now)), now), prop, now);
    if (prop === "flex-direction" && cs.flexWrap !== "nowrap") row.appendChild(h("span", "hint", cs.flexWrap));
    if (axis) row.appendChild(h("span", "hint", axis));
  }
  return controls;
}

/** "span 2" or "1 / 3": the columns or rows a grid item takes; "" when the grid decides. */
const placement = (cs: CSSStyleDeclaration, prop: string): string =>
  cs.getPropertyValue(prop).replace(/^auto( \/ auto)?$/, "").replace(/ \/ auto$/, "");

/** More equal tracks than this are shown as one size, "each". */
const MANY_TRACKS = 4;

const TRACK_INTENTS: [intent: Intent, meaning: string][] = [
  ["fixed", "a set size"],
  ["hug", "auto: as big as its content"],
  ["fill", "1fr: a share of the space left"],
];

/**
 * The columns or the rows of a grid: how many there are, with − and + to
 * drop or repeat the last one, then each track's size. A double-click on a
 * size edits it; the drawing before it says whether the track is fixed, hugs
 * or fills, and a click changes that. Every change is one edit of the whole
 * list.
 *
 * A list that is not one size per track (`auto-fill`, named lines) is one
 * value to edit as text, beside the number of tracks the browser laid out.
 * Rows are shown only when the page declares them.
 */
function tracksRow({ el, cs, stylesOf }: Context, prop: string): HTMLElement | null {
  const { selector } = pinned;
  const isRows = prop.endsWith("rows");
  const noun = isRows ? "row" : "column";
  const declared = declaredValue(stylesOf(el), prop);
  const computed = cs.getPropertyValue(prop);
  const used = usedTracks(computed);
  // Tracks the grid makes by itself are not the design's to count: its rows,
  // and the one column of a grid that declares none. (Several columns with no
  // declaration to read come from a stylesheet of another site.)
  const undeclared = !declared || declared === "none";
  if (undeclared && (isRows || used.length < 2)) return null;

  const row = h("div", "wide tracks");
  row.dataset.prop = prop;
  row.appendChild(h("span", "label", isRows ? "Rows" : "Columns"));
  const parsed = parseTracks(declared);
  const tracks = parsed && tracksMatch(parsed, used, isRows) ? parsed : null;
  if (!tracks) {
    const text = undeclared ? computed : declared;
    editable(copyOnClick(row.appendChild(h("span", "value", text)), text), prop, text);
    row.appendChild(h("span", "hint", `${used.length} laid out`));
    return row;
  }

  const set = (next: string[]) => {
    edit(selector, prop, formatTracks(next), el);
    rerender();
  };
  const list = row.appendChild(h("div", "track-list"));
  const stepper = list.appendChild(h("span", "stepper"));
  const step = (sign: string, label: string, next: string[]) => {
    const button = stepper.appendChild(h("button", "step", sign));
    button.title = button.ariaLabel = label;
    button.disabled = !next.length;
    button.addEventListener("click", () => set(next));
  };
  step("−", `Remove the last ${noun}`, tracks.slice(0, -1));
  stepper.appendChild(h("span", "track-count", String(tracks.length)));
  step("+", `Add a ${noun} like the last one`, [...tracks, tracks.at(-1)!]);

  // Many equal tracks (a 12-column grid) are one size to read and to change.
  const each = tracks.length > MANY_TRACKS && tracks.every((track) => track === tracks[0]);
  (each ? tracks.slice(0, 1) : tracks).forEach((track, i) => {
    const chip = list.appendChild(h("span", "track"));
    // What a change to this size gives the list: every track, or this one.
    const withSize = (size: string): string[] =>
      each ? tracks.map(() => size) : tracks.toSpliced(i, 1, ...(size ? [size] : []));
    const now = trackIntent(track);
    const intent = chip.appendChild(h("button", "intent"));
    intent.appendChild(intentGlyph(now));
    intent.title = intent.ariaLabel = `This ${noun} is ${now === "fixed" ? "fixed" : now === "hug" ? "hugging" : "filling"}. Click to change it`;
    intent.setAttribute("aria-haspopup", "menu");
    intent.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleMenu(
        row,
        `${prop}:${i}`,
        TRACK_INTENTS.map(([value, hint]) => ({
          value,
          glyph: intentGlyph(value),
          hint,
          checked: value === now,
          pick: () => (value === now ? rerender() : set(withSize(trackSize(value, used[i])))),
        })),
      );
    });
    // A size inside a function keeps its unit: "minmax(100, 1fr)" is not CSS.
    const plain = !track.includes("(");
    const size = copyOnClick(chip.appendChild(h("span", "value", plain ? shown(track) : track)), plain ? copied(track) : track);
    // An emptied field takes the track away.
    editable(size, prop, track, (typed) => formatTracks(withSize(typed)));
    size.dataset.track = String(i);
    if (each) chip.appendChild(h("span", "hint", "each"));
  });
  return row;
}

function renderLayout(context: Context): void {
  const { el, cs } = context;
  const onBoard = boardPosition(el);
  const section = block("Layout", onBoard ? "X, Y on board" : "");
  section.appendChild(sizeRow(context, findSpec(context, "Layout", "size")?.note ?? "hug × hug"));

  const spec = (sectionName: string, name: string) => findSpec(context, sectionName, name);
  const isFlex = cs.display.includes("flex");
  // The last item is the CSS property a double-click edits. A value made of
  // several properties (the position on the board, a border's widths and
  // style, "absolute · top 8px") has none, and only copies.
  const cells: [label: string, value: string | undefined, spec?: Spec, prop?: string][] = [
    ["X", onBoard ? String(onBoard.x) : ""],
    ["Y", onBoard ? String(onBoard.y) : ""],
    ["Display", cs.display, undefined, "display"],
    ["Gap", spec("Layout", "gap")?.value, spec("Layout", "gap"), "gap"],
    // Where a grid item is placed, when it is not left to the grid.
    ["Column", placement(cs, "grid-column"), undefined, "grid-column"],
    ["Row", placement(cs, "grid-row"), undefined, "grid-row"],
    ["Radius", spec("Shape", "radius")?.value, spec("Shape", "radius"), "border-radius"],
    ["Border", spec("Shape", "border")?.value, spec("Shape", "border")],
    ["Opacity", spec("Shape", "opacity")?.value, spec("Shape", "opacity"), "opacity"],
    ["Stroke", spec("Icon", "stroke width")?.value, spec("Icon", "stroke width"), "stroke-width"],
  ];
  const grid = section.appendChild(h("div", "grid2"));
  cells.forEach(([label, value, , prop]) => value && grid.appendChild(cell(label, value, false, prop)));
  const isGrid = cs.display.includes("grid");
  if (isFlex || isGrid) section.appendChild(flexControls(context, isGrid));
  if (isGrid) {
    section.append(...["grid-template-columns", "grid-template-rows"].flatMap((prop) => tracksRow(context, prop) ?? []));
  }

  // Values too long for half a row
  const wide: [label: string, spec: Spec | undefined, prop?: string][] = [
    ["Position", spec("Layout", "position")],
    ["Shadow", spec("Shape", "shadow"), "box-shadow"],
    ["Gradient", spec("Shape", "gradient"), "background-image"],
  ];
  wide.forEach(([label, row, prop]) => row && section.appendChild(cell(label, row.value, true, prop)));

  const tokenised = [
    ...cells.map(([label, , row]): [string, Spec | undefined] => [label, row]),
    ...wide.map(([label, row]): [string, Spec | undefined] => [label, row]),
  ];
  section.append(...tokenNotes(context, tokenised));
}

// ── box ────────────────────────────────────────────────────────

/** The four numbers of one ring, each on its own side; a click copies it, a double-click edits it. */
function boxSides(box: HTMLElement, name: "margin" | "padding", sides: Sides): void {
  for (const side of SIDES) {
    const value = `${hundredth(sides[side])}px`;
    const node = copyOnClick(h("span", `box-side is-${side}`, shown(value)), copied(value));
    box.appendChild(editable(node, `${name}-${side}`, value));
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

  // Which box `width` and `height` set: it explains a size field that holds
  // less than the size shown, and it can be changed like any other value.
  /** The name of a ring: a click copies its four sides, a double-click edits them at once. */
  const ringName = (name: "margin" | "padding", sides: Sides): HTMLElement => {
    const node = copyOnClick(h("span", "box-name", name), () => spacing(name, sides));
    editable(node, name, compactSides(SIDES.map((side) => `${hundredth(sides[side])}px`)));
    node.title = "Click to copy all four sides · double-click to edit them at once";
    return node;
  };

  const section = block("Box", cs.boxSizing);
  // An element the page has just removed has no styles, and so no note.
  const sizing = section.querySelector<HTMLElement>(".note");
  if (sizing) editable(copyOnClick(sizing, cs.boxSizing), "box-sizing", cs.boxSizing);
  const marginBox = section.appendChild(h("div", "box-margin"));
  marginBox.appendChild(ringName("margin", margin));
  boxSides(marginBox, "margin", margin);

  const paddingBox = marginBox.appendChild(h("div", "box-padding"));
  paddingBox.appendChild(ringName("padding", padding));
  boxSides(paddingBox, "padding", padding);

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
function colorRow(spec: Spec, role: string, context: Context, prop = ""): HTMLElement {
  const { el, cs, stylesOf } = context;
  const row = h("div", "token-row");
  const copies = <T extends HTMLElement>(node: T, text: string) => copyOnClick(node, text, row);
  const [hex, alpha = "100%"] = formatColor(spec.value).split(" ");

  const line = row.appendChild(h("div", "token-line"));
  line.appendChild(swatch(spec.value));
  const value = line.appendChild(copies(h("span", "value", hex), hex));
  // The field holds the hex; a translucent colour keeps its alpha as rgba().
  if (prop) editable(value, prop, alpha === "100%" ? hex : spec.value);
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

/** Each colour of an element, with the CSS property a double-click on it edits. */
const COLOR_ROLES: [section: string, name: string, role: string, prop: string][] = [
  ["Shape", "background", "Background", "background-color"],
  ["Shape", "border color", "Border", "border-color"],
  ["Text", "color", "Text", "color"],
  ["Icon", "fill", "Fill", "fill"],
  ["Icon", "stroke", "Stroke", "stroke"],
];

function renderColors(context: Context): void {
  const rows = COLOR_ROLES.flatMap(([section, name, role, prop]) => {
    const spec = findSpec(context, section, name);
    return spec ? [colorRow(spec, role, context, prop)] : [];
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
  // The first family is shown and copied; the field holds the whole list.
  const familyCell = section.appendChild(cell("Family", family));
  editable(part(familyCell, ".value"), "font-family", cs.fontFamily);

  const text = (name: string) => findSpec(context, "Text", name)?.value;
  const cells: [label: string, value: string | undefined, prop: string][] = [
    ["Weight", cs.fontWeight, "font-weight"],
    ["Size", cs.fontSize, "font-size"],
    ["Line", cs.lineHeight, "line-height"],
    ["Tracking", text("spacing"), "letter-spacing"],
    ["Transform", text("transform"), "text-transform"],
    ["Align", text("align"), "text-align"],
    ["Decoration", text("decoration"), "text-decoration-line"],
  ];
  const grid = section.appendChild(h("div", "grid2"));
  cells.forEach(([label, value, prop]) => value && grid.appendChild(cell(label, value, false, prop)));
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
  onPage("keydown", (e) => {
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
    return pinned ? elementLink(pinned) : pageAddress().href;
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
  const selector = getSelector(el);
  pinned = { el, selector, saved: savedStyles(selector) };

  renderActionStates();
  renderHeader(el);
  const scrollTop = body.scrollTop;
  closeMenu();
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
    // A click anywhere else in the tab, or Esc, closes a menu open under a row.
    body.addEventListener("click", closeMenu);
    body.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !openMenu) return;
      e.stopPropagation();
      closeMenu();
    });
    mountActionBar(panel);
  },
  render(el, change) {
    if (change === "pinned") body.scrollTop = 0;
    renderSpecs(el);
  },
};
