/**
 * The Specs tab: what a developer needs to build the pinned element.
 *
 * From top to bottom: the element header (where it is, what it is, its
 * classes), then one block per subject: asset, comparison, component, layout, box,
 * effects, colours, typography, states, motion. A click on any value, token or name copies
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
import { part, type Tab, tabBody } from "../tab";
import { mountActionBar, updateActionBar } from "./action-bar";
import { renderAsset } from "./asset-block";
import { renderBox } from "./box-block";
import { renderColors } from "./color-block";
import { renderCompare } from "./compare-block";
import { renderComponent } from "./component-block";
import { renderEffects } from "./effects-block";
import { renderHeader } from "./element-header";
import { renderLayout } from "./layout-block";
import { renderMotion } from "./motion-block";
import { closeMenu, isMenuOpen } from "./row-menu";
import { renderStates } from "./states-block";
import { createContext } from "./specs-context";
import { renderTypography } from "./typography-block";

let header: HTMLElement;
let body: HTMLElement;

function renderSpecs(element: Element): void {
  const context = createContext(element, body);
  updateActionBar();
  renderHeader(header, element);
  const scrollTop = body.scrollTop;
  closeMenu();
  body.replaceChildren();
  renderAsset(context);
  renderCompare(context);
  renderComponent(context);
  renderLayout(context);
  renderBox(context);
  renderEffects(context);
  renderColors(context);
  renderTypography(context);
  renderStates(context);
  renderMotion(context);
  body.scrollTop = scrollTop;
}

export const specsTab: Tab = {
  mount(panel) {
    header = part(panel, ".element-header");
    body = tabBody(panel, "specs");
    // A click anywhere else in the tab, or Esc, closes a menu open under a row.
    body.addEventListener("click", closeMenu);
    body.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !isMenuOpen()) return;
      event.stopPropagation();
      closeMenu();
    });
    mountActionBar(panel);
  },
  render(element, change) {
    if (change === "pinned") body.scrollTop = 0;
    renderSpecs(element);
  },
};
