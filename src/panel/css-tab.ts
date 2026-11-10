/**
 * The All CSS tab: every computed property of the pinned element.
 *
 * Values are editable. An edit is applied to the page at once, saved, and
 * replayed on the next load (see edits/overrides.ts). The top of the tab
 * edits the element's text or form value.
 */
import { h } from "../dom";
import {
  applyContent,
  applyStyle,
  getContent,
  hasSavedContent,
  hasValue,
  restoreContent,
  restoreStyle,
  saveContent,
  savedStyles,
  saveStyle,
} from "../edits/overrides";
import { getSelector } from "../edits/selector";
import { options } from "../options";
import { syncOutlines } from "../outlines";
import { rerender, type SelectionChange } from "../selection";
import { isColorValue } from "../specs/colors";
import { CSS_GROUPS, DEFAULT_VALUES } from "./css-properties";
import { part, type Tab, tabBody } from "./tab";

interface CssRow {
  name: string;
  value: string;
  /** The value is the property's default. */
  dimmed?: boolean;
  /** The user edited this property. */
  overridden?: boolean;
  /** Listed under "Custom styles", the user's edits. */
  custom?: boolean;
}

let body: HTMLElement;
/** The row the user was moving to when an edit caused a re-render. */
let focusAfterRender = "";

// ── read-only groups ───────────────────────────────────────────

function elementRows(el: Element): CssRow[] {
  return [
    { name: "tag", value: el.localName },
    { name: "id", value: el.id ? "#" + el.id : "—" },
    { name: "classes", value: Array.from(el.classList).join(" ") || "—" },
  ];
}

function rectRows(el: Element): CssRow[] {
  const rect = el.getBoundingClientRect();
  return (["top", "right", "bottom", "left", "width", "height"] as const).map((name) => ({
    name,
    value: rect[name].toFixed(2) + "px",
  }));
}

function variableRows(cs: CSSStyleDeclaration): CssRow[] {
  return Array.from(cs)
    .filter((prop) => prop.startsWith("--"))
    .map((name) => ({ name, value: cs.getPropertyValue(name).trim() }));
}

// ── rows ───────────────────────────────────────────────────────

function rowShell(row: CssRow): { rowEl: HTMLElement; valueEl: HTMLElement } {
  const rowEl = h("div", "row");
  rowEl.classList.toggle("is-overridden", !!row.overridden);
  rowEl.classList.toggle("is-dimmed", !!row.dimmed && !row.overridden);
  rowEl.appendChild(h("span", "name", row.name));
  if (isColorValue(row.value)) {
    rowEl.appendChild(h("span", "swatch")).style.setProperty("--swatch", row.value);
  }
  const valueEl = rowEl.appendChild(h("span", "value", row.value || "—"));
  valueEl.title = row.value;
  return { rowEl, valueEl };
}

const readOnlyRow = (row: CssRow): HTMLElement => rowShell(row).rowEl;

/**
 * A row whose value can be typed over.
 *   Enter or blur   save        Escape   cancel
 *   ↑ / ↓           change a number by 1 (Shift: 10, Alt: 0.1), applied live
 */
function editableRow(row: CssRow, el: Element, selector: string): HTMLElement {
  const { rowEl, valueEl } = rowShell(row);
  let shown = row.value;
  let overridden = !!row.overridden;
  let nudged = false;

  valueEl.contentEditable = "true";
  valueEl.spellcheck = false;
  valueEl.dataset.row = (row.custom ? "custom:" : "") + row.name;

  /** Saves and applies a value. An empty value removes the edit. */
  const commit = (value: string) => {
    if (value) {
      saveStyle(selector, row.name, value);
      applyStyle(el, row.name, value);
      overridden = true;
      shown = value;
    } else if (overridden) {
      saveStyle(selector, row.name, null);
      restoreStyle(el, row.name);
    }
  };

  valueEl.addEventListener("focus", () => {
    if (!shown) valueEl.textContent = "";
  });
  valueEl.addEventListener("blur", (e) => {
    const typed = (valueEl.textContent ?? "").trim();
    if (typed === shown && !nudged) {
      valueEl.textContent = shown || "—";
      return;
    }
    if (typed !== shown) commit(typed);
    const next = e.relatedTarget;
    focusAfterRender = next instanceof HTMLElement ? (next.dataset.row ?? "") : "";
    rerender();
  });
  valueEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      valueEl.blur();
    }
    if (e.key === "Escape") {
      valueEl.textContent = shown;
      valueEl.blur();
    }
    const number = /^(-?\d*\.?\d+)(.*)/.exec(valueEl.textContent ?? "");
    if (number && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
      e.preventDefault();
      const step = e.shiftKey ? 10 : e.altKey ? 0.1 : 1;
      const next = parseFloat(number[1]) + (e.key === "ArrowUp" ? step : -step);
      const decimals = step === 0.1 || number[1].includes(".") ? 1 : 0;
      valueEl.textContent = next.toFixed(decimals) + number[2];
      commit(valueEl.textContent);
      nudged = true;
    }
  });

  if (overridden) {
    const reset = rowEl.appendChild(h("button", "reset", "↩"));
    reset.title = "Reset to the page's own value";
    reset.addEventListener("click", () => {
      commit("");
      rerender();
    });
  }
  return rowEl;
}

// ── content editor ─────────────────────────────────────────────

/** Elements that usually hold text directly, so editing their HTML is safe. */
const TEXT_TAGS = new Set(
  "span p h1 h2 h3 h4 h5 h6 label button a li td th caption legend figcaption blockquote cite code pre time mark strong em small b i u s".split(
    " ",
  ),
);

/** Edits the element's text (or a form control's value). ⌘/Ctrl+Enter applies. */
function contentEditor(el: Element, selector: string): HTMLElement {
  if (!hasValue(el) && !TEXT_TAGS.has(el.localName)) {
    const note = h("section", "block");
    note.appendChild(h("span", "hint", `${el.localName} holds other elements, so its content is not editable here.`));
    return note;
  }

  const section = h("section", "block content");
  section.appendChild(h("div", "heading", hasValue(el) ? "Value" : "Content"));
  const editor = section.appendChild(h("div", "editor", getContent(el)));
  editor.contentEditable = "true";
  editor.spellcheck = false;
  const footer = section.appendChild(h("div", "footer"));
  footer.appendChild(h("span", "hint", "⌘/Ctrl ↵ to apply  ·  Esc to cancel"));
  const reset = footer.appendChild(h("button", "reset", "↩ Reset"));
  reset.hidden = !hasSavedContent(selector);

  editor.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const content = editor.textContent ?? "";
      applyContent(el, content);
      saveContent(selector, content);
      reset.hidden = false;
      editor.blur();
    }
    if (e.key === "Escape") {
      editor.textContent = getContent(el);
      editor.blur();
    }
  });
  reset.addEventListener("click", () => {
    saveContent(selector, null);
    restoreContent(el);
    rerender();
  });
  return section;
}

// ── tab ────────────────────────────────────────────────────────

function renderCss(el: Element, change: SelectionChange): void {
  // A new element starts at the top; an edit keeps the list where it was.
  const scrollTop = change === "pinned" ? 0 : body.scrollTop;
  const selector = getSelector(el);
  const saved = savedStyles(selector);
  const cs = getComputedStyle(el);
  const addSection = (title: string, rows: HTMLElement[], labelClass = "") => {
    if (!rows.length) return;
    body.appendChild(h("div", `heading ${labelClass}`, title));
    body.append(...rows);
  };
  const matchesSearch = (row: CssRow) =>
    !options.search || row.name.toLowerCase().includes(options.search);
  const editable = (row: CssRow) => editableRow(row, el, selector);

  body.replaceChildren(contentEditor(el, selector));

  const custom = Object.entries(saved).map(([name, value]) => ({
    name,
    value,
    overridden: true,
    custom: true,
  }));
  addSection("Your edits", custom.map(editable), "is-custom");
  if (custom.length) body.appendChild(h("div", "divider"));

  addSection("Element", elementRows(el).filter(matchesSearch).map(readOnlyRow));
  addSection("Rect", rectRows(el).filter(matchesSearch).map(readOnlyRow));
  for (const group of CSS_GROUPS) {
    const rows = group.props
      .map((name): CssRow => {
        const computed = cs.getPropertyValue(name).trim();
        const overridden = saved[name] !== undefined;
        return {
          name,
          value: overridden ? saved[name] : computed,
          dimmed: DEFAULT_VALUES[name] === computed,
          overridden,
        };
      })
      .filter((row) => row.value && matchesSearch(row))
      .filter((row) => !(options.hideDefaults && row.dimmed && !row.overridden));
    addSection(group.label, rows.map(editable));
  }
  addSection("CSS Variables", variableRows(cs).filter(matchesSearch).map(editable));

  body.scrollTop = scrollTop;
  if (focusAfterRender) {
    const row = CSS.escape(focusAfterRender);
    focusAfterRender = "";
    // After the browser finishes moving focus to the row that was just replaced.
    setTimeout(() => body.querySelector<HTMLElement>(`[data-row="${row}"]`)?.focus());
  }
}

function mountControls(panel: HTMLElement): void {
  const search = part<HTMLInputElement>(panel, ".search input");
  const setSearch = (query: string) => {
    search.value = query;
    options.search = query.toLowerCase().trim();
    rerender();
  };
  search.addEventListener("input", () => setSearch(search.value));
  search.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setSearch("");
  });
  part(panel, ".clear").addEventListener("click", () => setSearch(""));

  part<HTMLInputElement>(panel, '[data-option="hideDefaults"]').addEventListener("change", (e) => {
    options.hideDefaults = (e.target as HTMLInputElement).checked;
    rerender();
  });
  part<HTMLInputElement>(panel, '[data-option="highlightPinned"]').addEventListener("change", (e) => {
    options.highlightPinned = (e.target as HTMLInputElement).checked;
    syncOutlines();
  });
}

export const cssTab: Tab = {
  mount(panel) {
    body = tabBody(panel, "css");
    mountControls(panel);
  },
  render: renderCss,
};
