/**
 * The Specs tab: what a developer needs to build the pinned element.
 *
 * Each row is a name, a value and, where the design uses them, design
 * tokens. A click copies the value or the token. The toolbar switches the
 * unit, shows a grid, compares with another element, copies a link to the
 * element and picks a colour from the screen.
 */
import { elementLabel, h } from "../dom";
import { elementLink } from "../link";
import { options } from "../options";
import { createStyleLookup, type StyleLookup } from "../page-styles";
import { pinnedElement, rerender } from "../selection";
import { formatColor, tokensWithColor } from "../specs/colors";
import { type Spec, specDifferences, specSections } from "../specs/sections";
import { declaredTokens, hasTokens, themePath, tokenModes } from "../specs/tokens";
import { inUnit, sxValue } from "../specs/units";
import { copyOnClick } from "./copy";
import { saveLayout } from "./layout";
import { part, type Tab, tabBody } from "./tab";

let body: HTMLElement;

// ── toolbar ────────────────────────────────────────────────────

const NEXT_GRID_STEP: Record<number, number> = { 0: 4, 4: 8, 8: 0 };

function mountToolbar(panel: HTMLElement): void {
  const unit = part(panel, '[data-action="unit"]');
  const grid = part(panel, '[data-action="grid"]');
  const compare = part(panel, '[data-action="compare"]');
  const pick = part(panel, '[data-action="pick"]');

  const showStates = () => {
    unit.textContent = options.unit;
    grid.textContent = options.gridStep ? `grid ${options.gridStep}` : "grid off";
    grid.classList.toggle("is-on", options.gridStep > 0);
    compare.textContent = options.compareWith ? "comparing ✕" : "compare";
    compare.classList.toggle("is-on", options.compareWith !== null);
  };
  /** Runs a toolbar action, then shows its effect everywhere. */
  const on = (button: HTMLElement, action: () => void | Promise<void>) => {
    button.addEventListener("click", async () => {
      await action();
      showStates();
      rerender();
    });
  };

  on(unit, () => {
    options.unit = options.unit === "px" ? "rem" : "px";
    saveLayout(panel);
  });
  on(grid, () => {
    options.gridStep = NEXT_GRID_STEP[options.gridStep];
  });
  on(compare, () => {
    options.compareWith = options.compareWith ? null : pinnedElement();
  });
  on(pick, async () => {
    try {
      options.pickedColor = (await new window.EyeDropper!().open()).sRGBHex;
    } catch {
      // The user pressed Escape.
    }
  });
  pick.hidden = !window.EyeDropper;
  copyOnClick(part(panel, '[data-action="link"]'), () => {
    const pinned = pinnedElement();
    return pinned ? elementLink(pinned) : location.href;
  });
  showStates();
}

// ── rows ───────────────────────────────────────────────────────

const rootFontSize = (): number =>
  parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/** A spec's value as the tab shows it. */
function shownValue(spec: Spec): string {
  if (spec.color) return formatColor(spec.value);
  return spec.props ? inUnit(spec.value, options.unit, rootFontSize()) : spec.value;
}

/** Everything a row needs to know about the element it describes. */
interface RowContext {
  el: Element;
  cs: CSSStyleDeclaration;
  stylesOf: StyleLookup;
  pageHasTokens: boolean;
}

function specRow(spec: Spec, context: RowContext): HTMLElement {
  const value = shownValue(spec);
  const row = h("div", "row spec");
  row.appendChild(h("span", "name", spec.name));
  if (spec.color) row.appendChild(h("span", "swatch")).style.background = spec.value;
  const copied = spec.color ? value : sxValue(spec.name, value, options.unit);
  copyOnClick(row.appendChild(h("span", "value", value)), copied);
  row.appendChild(tokenChips(spec, context));
  return row;
}

/** The chips beside a value: a note, the design tokens, or a colour's nearest tokens. */
function tokenChips(spec: Spec, { el, cs, stylesOf, pageHasTokens }: RowContext): HTMLElement {
  const chips = h("span", "tokens");
  const chip = (text: string, kind = ""): HTMLElement =>
    chips.appendChild(h("span", `token ${kind}`, text));

  if (spec.note) chip(spec.note, "is-similar");

  const declared = declaredTokens(el, spec.props ?? [], stylesOf);
  for (const token of declared) {
    const path = themePath(token);
    if (path) copyOnClick(chip(path), path);
    copyOnClick(chip(token, path ? "is-similar" : ""), token);
    const modes = tokenModes(token).map(([scope, value]) => `${scope} ${value}`);
    if (modes.length) chips.appendChild(h("span", "modes", modes.join("  ·  ")));
  }

  // A colour the design wrote by hand: say which tokens have that colour, or that none does.
  if (spec.color && !declared.length && pageHasTokens) {
    const similar = tokensWithColor(cs, spec.value);
    for (const token of similar.slice(0, 2)) {
      const similarChip = chip("= " + token, "is-similar");
      similarChip.title = "A token with the same colour; the design does not reference it here";
      copyOnClick(similarChip, token);
    }
    if (similar.length > 2) chip(`+${similar.length - 2}`, "is-similar");
    if (!similar.length) chip("no token", "is-missing");
  }
  return chips;
}

// ── tab ────────────────────────────────────────────────────────

function renderSpecs(el: Element): void {
  const cs = getComputedStyle(el);
  const stylesOf = createStyleLookup();
  const context: RowContext = { el, cs, stylesOf, pageHasTokens: hasTokens(cs) };
  const label = (text: string) => body.appendChild(h("div", "label", text));
  const addSection = (title: string, specs: Spec[]) => {
    const rows = specs.filter((spec) => spec.value);
    if (!rows.length) return;
    label(title);
    rows.forEach((spec) => body.appendChild(specRow(spec, context)));
  };

  body.replaceChildren();
  label(el.localName + (el.id ? "#" + el.id : ""));
  if (el.classList.length) {
    body.appendChild(specRow({ name: "classes", value: Array.from(el.classList).join(" ") }, context));
  }

  const sections = specSections(el, cs, stylesOf);
  sections.forEach((section) => addSection(section.label, section.rows));

  if (options.pickedColor) {
    addSection("Picked colour", [{ name: "picked", value: options.pickedColor, color: true }]);
  }

  const baseline = options.compareWith;
  if (baseline && baseline !== el && baseline.isConnected) {
    const baselineSections = specSections(baseline, getComputedStyle(baseline), stylesOf);
    const differences = specDifferences(baselineSections, sections, shownValue);
    label((differences.length ? "Differs from " : "Same specs as ") + elementLabel(baseline));
    differences.forEach((spec) => body.appendChild(specRow(spec, context)));
  }

  body.appendChild(
    h("div", "hint-line", "Click a value or token to copy it · Alt + hover another element to measure"),
  );
}

export const specsTab: Tab = {
  mount(panel) {
    body = tabBody(panel, "specs");
    mountToolbar(panel);
  },
  render: renderSpecs,
};
