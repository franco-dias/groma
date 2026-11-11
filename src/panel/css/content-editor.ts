/** The top of the All CSS tab: edits the element's text, or a form control's value. */
import { h } from "../../dom";
import { edit, removeEdit } from "../../edits/changes";
import { getContent, hasSavedContent, hasValue } from "../../edits/content-overrides";
import { CONTENT } from "../../edits/edit-values";
import { rerender } from "../../selection";

/** Elements that usually hold text directly, so editing their HTML is safe. */
const TEXT_TAGS = new Set(
  "span p h1 h2 h3 h4 h5 h6 label button a li td th caption legend figcaption blockquote cite code pre time mark strong em small b i u s".split(
    " ",
  ),
);

function createNotEditable(element: Element): HTMLElement {
  const note = h("section", "block");
  note.appendChild(
    h("span", "hint", `${element.localName} holds other elements, so its content is not editable here.`),
  );
  return note;
}

function mountEditorKeys(editor: HTMLElement, target: { element: Element; selector: string }): void {
  const { element, selector } = target;
  editor.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      edit({ selector, prop: CONTENT, value: editor.textContent ?? "", element });
      editor.blur();
      rerender();
    }
    if (event.key === "Escape") {
      editor.textContent = getContent(element);
      editor.blur();
    }
  });
}

/** Edits the element's text (or a form control's value). ⌘/Ctrl+Enter applies. */
export function createContentEditor(element: Element, selector: string): HTMLElement {
  if (!hasValue(element) && !TEXT_TAGS.has(element.localName)) return createNotEditable(element);

  const section = h("section", "block content");
  section.appendChild(h("div", "heading", hasValue(element) ? "Value" : "Content"));
  const editor = section.appendChild(h("div", "editor", getContent(element)));
  editor.contentEditable = "true";
  editor.spellcheck = false;
  const footer = section.appendChild(h("div", "footer"));
  footer.appendChild(h("span", "hint", "⌘/Ctrl ↵ to apply  ·  Esc to cancel"));
  const reset = footer.appendChild(h("button", "reset", "↩ Reset"));
  reset.hidden = !hasSavedContent(selector);

  mountEditorKeys(editor, { element, selector });
  reset.addEventListener("click", () => {
    removeEdit({ selector, prop: CONTENT, element });
    rerender();
  });
  return section;
}
