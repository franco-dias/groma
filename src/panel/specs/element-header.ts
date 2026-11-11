/** The top of the Specs tab: where the element is, what it is, and its classes. */
import { findBoardPosition } from "../../board";
import { h } from "../../dom";
import { elementName, sizeText } from "../../element-name";
import { icon } from "../../icons";
import { pin } from "../../selection";
import { looksGenerated } from "../../specs/class-names";
import { copyOnClick } from "../copy";
import { createCopyCssButton } from "./copy-css";

/** Whether the class list in the header shows every class. */
let areClassesExpanded = false;

function createSeparator(): HTMLElement {
  const separator = h("span", "sep", "›");
  separator.setAttribute("aria-hidden", "true");
  return separator;
}

function createParentCrumb(parent: Element): HTMLElement {
  const up = h("button", "crumb", elementName(parent));
  up.title = "Pin the parent";
  up.addEventListener("click", () => pin(parent));
  return up;
}

/** Where it is: board › parent › element */
function createCrumbs(element: Element): HTMLElement {
  const crumbs = h("div", "crumbs");
  const board = findBoardPosition(element)?.board;
  const parent = element.parentElement;
  if (board) crumbs.append(h("span", "crumb", board), createSeparator());
  if (parent && parent !== parent.ownerDocument.body)
    crumbs.append(createParentCrumb(parent), createSeparator());
  crumbs.appendChild(h("span", "crumb is-current", elementName(element)));
  return crumbs;
}

/** What it is: tag, name, size */
function createTitleRow(element: Element, meaningful: string[]): HTMLElement {
  const title = h("div", "title-row");
  const name = elementName(element);
  title.append(
    h("span", "tag-chip", element.localName),
    h("span", "title", name === element.localName ? (meaningful[0] ?? name) : name),
    h("span", "spacer"),
    h("span", "title-size", sizeText(element)),
    createCopyCssButton(element),
  );
  return title;
}

/** Every class as a chip, the ones a person wrote first. */
function createClassList(classes: string[], toggle: HTMLElement): HTMLElement {
  const list = h("div", "class-list");
  const chips = [...classes.filter((name) => !looksGenerated(name)), ...classes.filter(looksGenerated)];
  chips.forEach((className) => {
    const chip = h("span", "class-chip", "." + className);
    chip.classList.toggle("is-generated", looksGenerated(className));
    list.appendChild(copyOnClick(chip, className));
  });
  toggle.append("Less", icon("chevronUp", 10));
  list.appendChild(toggle);
  return list;
}

/** The meaningful classes on one line, with a button for the rest. */
function createClassRow(classes: string[], toggle: HTMLElement): HTMLElement {
  const meaningful = classes.filter((name) => !looksGenerated(name));
  const row = h("div", "class-row");
  const visible = meaningful.length ? meaningful : classes;
  row.appendChild(h("span", "classes", visible.map((className) => "." + className).join(" ")));
  const hidden = classes.length - visible.length;
  // One or two plain classes fit on the line: nothing more to show.
  if (hidden || classes.length > 2) {
    toggle.append(hidden ? `+${hidden}` : "All", icon("chevronDown", 10));
    row.appendChild(toggle);
  }
  return row;
}

export function renderHeader(header: HTMLElement, element: Element): void {
  const classes = Array.from(element.classList);
  const meaningful = classes.filter((name) => !looksGenerated(name));
  header.replaceChildren(createCrumbs(element), createTitleRow(element, meaningful));
  if (!classes.length) return;
  const toggle = h("button", "more");
  toggle.addEventListener("click", () => {
    areClassesExpanded = !areClassesExpanded;
    renderHeader(header, element);
  });
  header.appendChild(areClassesExpanded ? createClassList(classes, toggle) : createClassRow(classes, toggle));
}
