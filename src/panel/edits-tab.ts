/**
 * The Edits tab: every edit the user made to this page, on any element.
 *
 * Each edited element lists its values as before → after, with a reset per
 * line; a click on the element's name pins it. The bar above undoes and
 * redoes, shows the page without the edits, and copies the whole list as a
 * text a coding agent can apply in the source (edits/handoff.ts).
 *
 * Saved edits are not put back on a page by themselves. When the page loads
 * with edits saved on an earlier visit, a bar slides in under the tabs and
 * says how many, on every tab, with a button that applies them and one that
 * discards them. It stays away while the user looks at the original page.
 *
 * The top of the tab holds a note for the pinned element: an instruction in
 * plain words, which travels with the copied edits. The list needs no pinned
 * element, so the tab also shows while the panel is open with nothing pinned.
 */
import { h } from "../dom";
import {
  canRedo,
  canUndo,
  CONTENT,
  edit,
  type ElementEdits,
  findEdited,
  listEdits,
  NOTE,
  noteOn,
  redo,
  together,
  undo,
} from "../edits/changes";
import { formatHandoff, type HandoffElement } from "../edits/handoff";
import { isOriginalShown, missingEdits, replayOverrides, showOriginal } from "../edits/overrides";
import { config } from "../config";
import { getSelector } from "../edits/selector";
import { elementName } from "../element-name";
import { pageAddress, pageWindow } from "../page";
import { pin, pinnedElement, rerender } from "../selection";
import { tokensWithValue } from "../specs/colors";
import { componentOf } from "../specs/component";
import { copyOnClick } from "./copy";
import { part, type Tab, tabBody } from "./tab";

const MAX_TEXT = 80;

let panel: HTMLElement;
let body: HTMLElement;

/** Shows the new state everywhere: the page's sizes, the other tabs, this list. */
function refresh(): void {
  // With nothing pinned the panel does not render its tabs; this one still has a list.
  if (pinnedElement()) rerender();
  else draw(null);
}

// ── what is copied ─────────────────────────────────────────────

/**
 * The page's tokens that hold a new value. On a page that says which
 * variables are its design tokens (the token prefixes), only those count.
 */
function matchingTokens(cs: CSSStyleDeclaration, value: string): string[] {
  // A value that names a token already needs no match.
  if (value.includes("var(")) return [];
  const tokens = tokensWithValue(cs, value);
  const prefixes = config.tokenPrefixes;
  return prefixes.length ? tokens.filter((token) => prefixes.some((prefix) => token.startsWith(prefix))) : tokens;
}

/** An edited element with what a reader needs to find it in the source. */
function describe({ selector, values, note }: ElementEdits): HandoffElement {
  const el = findEdited(selector);
  const component = el && componentOf(el);
  const cs = el && getComputedStyle(el);
  // The text as shown: `textContent` would include a <style> inside the element.
  const text = ((el as HTMLElement | null)?.innerText ?? el?.textContent ?? "").replace(/\s+/g, " ").trim();
  return {
    name: el ? elementName(el) : selector.split(" > ").at(-1)!,
    selector,
    onPage: el !== null,
    component: component ?? undefined,
    // Edited content is in the list already, as before → after.
    text: values.some((value) => value.prop === CONTENT) ? undefined : text.slice(0, MAX_TEXT) || undefined,
    values: values.map(({ prop, before, after }) => ({
      prop: prop === CONTENT ? "" : prop,
      before,
      after,
      tokens: cs && prop !== CONTENT ? matchingTokens(cs, after) : [],
    })),
    note,
  };
}

function handoffText(): string {
  const view = pageWindow();
  return formatHandoff(
    { address: pageAddress().href, width: view.innerWidth, height: view.innerHeight },
    listEdits().map(describe),
  );
}

// ── the list ───────────────────────────────────────────────────

function resetButton(title: string, selector: string, prop: string): HTMLElement {
  const reset = h("button", "reset", "↩");
  reset.title = title;
  reset.addEventListener("click", () => {
    edit(selector, prop, null);
    refresh();
  });
  return reset;
}

function editedElement({ selector, values, note }: ElementEdits): HTMLElement {
  const el = findEdited(selector);
  const group = h("div", "edited");
  const head = group.appendChild(h("button", "edited-head"));
  head.append(
    h("span", "edited-name", el ? elementName(el) : "Not on the page now"),
    // The marks keep the selector reading left to right in a box that is cut at its start.
    h("span", "edited-selector", `\u200e${selector}\u200e`),
  );
  head.title = el ? "Pin this element" : selector;
  head.disabled = !el;
  head.classList.toggle("is-pinned", el !== null && el === pinnedElement());
  head.addEventListener("click", () => el?.isConnected && pin(el));

  for (const { prop, before, after } of values) {
    const row = group.appendChild(h("div", "row edit-row"));
    row.appendChild(h("span", "name", prop === CONTENT ? "content" : prop));
    const value = row.appendChild(h("span", "value"));
    if (before !== null) value.append(h("span", "before", before), h("span", "arrow", " → "));
    value.appendChild(h("span", "after", after));
    value.title = before === null ? after : `${before} → ${after}`;
    row.appendChild(resetButton("Remove this edit and put back the page's own value", selector, prop));
  }
  if (note) {
    const row = group.appendChild(h("div", "row edit-row is-note"));
    row.append(h("span", "name", "note"), h("span", "value", note));
    row.appendChild(resetButton("Remove this note", selector, NOTE));
  }
  return group;
}

/** A note on the pinned element, saved when the field is left. */
function noteEditor(el: Element): HTMLElement {
  const selector = getSelector(el);
  const section = h("section", "block note-block");
  section.appendChild(h("div", "heading", `Note on ${elementName(el)}`));
  const editor = section.appendChild(h("div", "note-field", noteOn(selector)));
  editor.contentEditable = "plaintext-only";
  editor.spellcheck = false;
  editor.dataset.placeholder = "Say what should change here, in your own words";
  editor.setAttribute("aria-label", "Note on this element");
  section.appendChild(h("span", "hint", "Saved when you click away. It is copied with your edits."));
  editor.addEventListener("blur", () => {
    const text = (editor.textContent ?? "").trim();
    if (text === noteOn(selector)) return;
    edit(selector, NOTE, text || null, el);
    refresh();
  });
  editor.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    editor.textContent = noteOn(selector);
    editor.blur();
  });
  return section;
}

function draw(el: Element | null): void {
  const scrollTop = body.scrollTop;
  const edits = listEdits();
  body.replaceChildren();
  if (el) body.appendChild(noteEditor(el));
  if (edits.length) {
    const count = edits.reduce((sum, item) => sum + item.values.length + (item.note ? 1 : 0), 0);
    const heading = body.appendChild(h("div", "heading edits-heading", "On this page"));
    heading.appendChild(h("span", "count", String(count)));
    body.append(...edits.map(editedElement));
  } else {
    const empty = body.appendChild(h("div", "edits-empty"));
    empty.append(
      h("b", "", "No edits yet"),
      h("span", "hint", "Change a value in the All CSS tab, or write a note on an element. Everything you change on this page is listed here, ready to copy."),
    );
  }
  body.scrollTop = scrollTop;

  part<HTMLButtonElement>(panel, '[data-action="undo"]').disabled = !canUndo();
  part<HTMLButtonElement>(panel, '[data-action="redo"]').disabled = !canRedo();
  part<HTMLButtonElement>(panel, '[data-action="copy-edits"]').disabled = !edits.length;
  const original = part<HTMLButtonElement>(panel, '[data-action="original"]');
  original.disabled = !edits.some((item) => item.values.length);
  original.setAttribute("aria-pressed", String(isOriginalShown()));

  // Not while the user chose to look at the page without the edits.
  const missing = isOriginalShown() ? 0 : missingEdits().length;
  part(panel, ".apply-bar").classList.toggle("is-off", !missing);
  // The text stays while the bar slides out.
  if (missing) {
    part(panel, ".apply-text").textContent =
      missing === 1 ? "1 saved edit is not on the page" : `${missing} saved edits are not on the page`;
  }
}

const isTyping = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement && (target.isContentEditable || target.matches("input, textarea"));

function mountControls(): void {
  const step = (move: () => void) => () => {
    move();
    refresh();
  };
  part(panel, '[data-action="undo"]').addEventListener("click", step(undo));
  part(panel, '[data-action="redo"]').addEventListener("click", step(redo));
  part(panel, '[data-action="original"]').addEventListener(
    "click",
    step(() => showOriginal(!isOriginalShown())),
  );
  copyOnClick(part(panel, '[data-action="copy-edits"]'), handoffText);
  part(panel, '[data-action="apply-edits"]').addEventListener(
    "click",
    step(() => {
      showOriginal(false);
      replayOverrides();
    }),
  );

  // Discards the edits the bar counts, and leaves those that are on the page.
  // They are removed like any edit: one step, which undo brings back.
  part(panel, '[data-action="discard-edits"]').addEventListener(
    "click",
    step(() => {
      const missing = missingEdits();
      together(() => missing.forEach(([selector, prop]) => edit(selector, prop ?? CONTENT, null)));
    }),
  );

  // ⌘/Ctrl + Z in the panel, outside a field: a field undoes its own typing.
  panel.addEventListener("keydown", (e) => {
    if (!(e.metaKey || e.ctrlKey) || e.code !== "KeyZ" || isTyping(e.target)) return;
    e.preventDefault();
    step(e.shiftKey ? redo : undo)();
  });
}

export const editsTab: Tab = {
  mount(el) {
    panel = el;
    body = tabBody(el, "edits");
    mountControls();
  },
  render: draw,
  renderUnpinned: () => draw(null),
};
