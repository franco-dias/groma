/** The Compare block of the Specs tab: the pinned element against the one that was pinned when compare started. */
import { findBoardPosition } from "../../board";
import { h } from "../../dom";
import { elementName } from "../../element-name";
import { icon } from "../../icons";
import { options } from "../../options";
import { rerender } from "../../selection";
import { compareSpecs } from "../../specs/compare-specs";
import { specSections } from "../../specs/sections";
import type { Spec } from "../../specs/spec";
import { shownSpec } from "./display";
import { addBlock, createSmallSwatch } from "./specs-block";
import type { SpecsContext } from "./specs-context";

export function stopComparing(): void {
  options.compareWith = undefined;
  rerender();
}

/** One side of a difference: a swatch for colours, then the value. */
function createSide(spec: Spec | undefined, className: string): HTMLElement {
  const side = h("span", `side ${className}`);
  if (!spec?.value) {
    side.textContent = "none";
    return side;
  }
  if (spec.color) side.appendChild(createSmallSwatch(spec.value));
  side.append(shownSpec(spec));
  return side;
}

/** A is the baseline (pinned when compare started); B is the element pinned now. */
type Who = { letter: "A" | "B"; element: Element; role: string };

function createWho({ letter, element, role }: Who): HTMLElement {
  const row = h("div", "who");
  row.append(
    h("span", letter === "A" ? "letter" : "letter is-b", letter),
    h("span", "name", elementName(element)),
    h("span", "board", findBoardPosition(element)?.board ?? ""),
    h("span", "spacer"),
    h("span", "hint", role),
  );
  return row;
}

function createStopButton(): HTMLElement {
  const stop = h("button", "ghost-button");
  stop.append(icon("close", 12), "Stop", h("kbd", "", "Esc"));
  stop.addEventListener("click", stopComparing);
  return stop;
}

function createDifferences(baseline: Element, context: SpecsContext): HTMLElement[] {
  const baselineSections = specSections({
    element: baseline,
    computedStyle: getComputedStyle(baseline),
    stylesOf: context.stylesOf,
  });
  const { differences, identical } = compareSpecs(baselineSections, context.sections);
  const count = differences.length === 1 ? "1 difference" : `${differences.length} differences`;
  const rows = differences.map((difference) => {
    const row = h("div", "compare-row");
    row.appendChild(h("span", "label", difference.name));
    row.append(
      createSide(difference.before, "is-before"),
      icon("arrow"),
      createSide(difference.after, "is-after"),
    );
    return row;
  });
  return [h("div", "compare-summary", `${count} · ${identical} identical`), ...rows];
}

export function renderCompare(context: SpecsContext): void {
  const baseline = options.compareWith;
  if (!baseline?.isConnected) return;
  const section = addBlock(context, { title: "Compare", action: createStopButton() });
  section.appendChild(createWho({ letter: "A", element: baseline, role: "Baseline" }));
  if (baseline === context.element) {
    section.appendChild(h("div", "compare-summary", "Pin another element to compare it with A."));
    return;
  }
  section.appendChild(createWho({ letter: "B", element: context.element, role: "Pinned" }));
  section.append(...createDifferences(baseline, context));
}
