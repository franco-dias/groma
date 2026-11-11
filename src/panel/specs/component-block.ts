/** The Component block of the Specs tab: the component the element belongs to, and the props the design gives it. */
import { h } from "../../dom";
import { icon } from "../../icons";
import { pin } from "../../selection";
import { type ComponentInfo, componentProps, findComponent } from "../../specs/component";
import { copyOnClick } from "../copy";
import { addBlock } from "./specs-block";
import type { SpecsContext } from "./specs-context";

/** The name, in a box that copies it. */
function createNameBox(component: ComponentInfo): HTMLElement {
  const name = h("div", component.inside ? "code is-inside" : "code");
  name.appendChild(h("span", "name", component.name));
  const idle = icon("copy");
  idle.classList.add("when-idle");
  const copied = icon("check");
  copied.classList.add("when-copied");
  name.appendChild(h("span", "copy-mark")).append(idle, copied);
  return copyOnClick(name, component.name);
}

/**
 * The props the design passes. Not a suggestion of code: the inspector
 * does not know which props the project's own component accepts.
 */
function createProps(component: ComponentInfo): HTMLElement[] {
  const props = componentProps(component);
  if (!props.length) return [];
  const list = h("div", "props");
  props.forEach((prop) => {
    list.append(h("span", "prop-name", prop.name), copyOnClick(h("span", "value", prop.value), prop.value));
  });
  return [h("div", "hint", "Props in this design"), list];
}

function createSource(sourcePath: string): HTMLElement {
  // The path may wrap at slashes, never inside a name.
  const folders = sourcePath.split("/");
  const file = folders.pop() ?? "";
  const source = h("div", "source");
  source.appendChild(h("span", "label", "Source"));
  const path = source.appendChild(h("span", "path"));
  folders.forEach((folder) => path.append(folder + "/", document.createElement("wbr")));
  path.appendChild(h("span", "file", file));
  copyOnClick(path, sourcePath);
  return source;
}

function createSelectRow(root: Element, element: Element): HTMLElement {
  const row = h("div", "select-row");
  const select = row.appendChild(h("button", "ghost-button"));
  select.append(icon("chevronUp", 12), "Select component");
  select.addEventListener("click", () => pin(root));
  row.appendChild(h("span", "hint", `Pinned: ${element.localName} inside it`));
  return row;
}

export function renderComponent(context: SpecsContext): void {
  const component = findComponent(context.element);
  if (!component) return;
  const section = addBlock(context, {
    title: component.inside ? "Inside component" : "Component",
    note: component.inside ? "Contains this element" : "This element",
    className: "component",
  });
  section.append(createNameBox(component), ...createProps(component));
  if (component.sourcePath) section.appendChild(createSource(component.sourcePath));
  if (component.inside && component.element) {
    section.appendChild(createSelectRow(component.element, context.element));
  }
}
