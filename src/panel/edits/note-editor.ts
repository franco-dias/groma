/** The note on the pinned element: an instruction in plain words, copied with the edits. */
import { h } from "../../dom";
import { edit, removeEdit } from "../../edits/changes";
import { noteOn } from "../../edits/edit-records";
import { NOTE } from "../../edits/edit-values";
import { getSelector } from "../../edits/selector";
import { elementName } from "../../element-name";

/** Saves the note, or removes it when `text` is empty. */
function saveNote(target: { selector: string; element: Element }, text: string): void {
  const note = { selector: target.selector, prop: NOTE, element: target.element };
  if (text) edit({ ...note, value: text });
  else removeEdit(note);
}

function createNoteField(selector: string): HTMLElement {
  const editor = h("div", "note-field", noteOn(selector));
  editor.contentEditable = "plaintext-only";
  editor.spellcheck = false;
  editor.dataset.placeholder = "Say what should change here, in your own words";
  editor.setAttribute("aria-label", "Note on this element");
  return editor;
}

/** A note on the pinned element, saved when the field is left; `onChange` runs after it is saved. */
export function createNoteEditor(element: Element, onChange: () => void): HTMLElement {
  const selector = getSelector(element);
  const section = h("section", "block note-block");
  section.appendChild(h("div", "heading", `Note on ${elementName(element)}`));
  const editor = section.appendChild(createNoteField(selector));
  section.appendChild(h("span", "hint", "Saved when you click away. It is copied with your edits."));
  editor.addEventListener("blur", () => {
    const text = (editor.textContent ?? "").trim();
    if (text === noteOn(selector)) return;
    saveNote({ selector, element }, text);
    onChange();
  });
  editor.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    editor.textContent = noteOn(selector);
    editor.blur();
  });
  return section;
}
