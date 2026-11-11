/**
 * While Space is held, the frame lets the pointer through to the canvas, so a
 * drag that starts over the page moves the canvas.
 *
 * Space is taken whatever has the focus, except where it types. A focused
 * button or checkbox would otherwise swallow it, and one is focused after
 * every click on it. Space released with no drag is passed on: the focused
 * control is pressed, as the key alone would have done.
 */
import { onPageCapture, onPageWindow } from "../page";
import { findCanvas } from "./canvas-state";

/** Inputs that take no text: Space presses them instead of typing in them. */
const NOT_TEXT_INPUTS = new Set([
  "checkbox",
  "radio",
  "button",
  "submit",
  "reset",
  "range",
  "color",
  "file",
  "image",
]);

/** Controls that Space presses when they have the focus. */
const PRESSED_BY_SPACE = new Set(["button", "summary", "input", "select"]);

/** A hold of the Space key: the control that had the focus, and whether a drag used the hold. */
type SpaceHold = { control?: HTMLElement; dragged: boolean };

let spaceHold: SpaceHold | undefined;

export const isSpaceHeld = (): boolean => spaceHold !== undefined;

/** A drag happened during the hold, so releasing Space presses nothing. */
export function markSpaceDragged(): void {
  if (spaceHold) spaceHold.dragged = true;
}

/** True where Space types a character: there it is never taken. */
function typesText(target: HTMLElement | undefined): boolean {
  if (!target) return false;
  if (target.isContentEditable || target.localName === "textarea") return true;
  // Cast: the local name says it is an input.
  return target.localName === "input" && !NOT_TEXT_INPUTS.has((target as HTMLInputElement).type);
}

/** Does what Space would have done to a focused control. */
function press(control: HTMLElement): void {
  if (control.localName !== "select") {
    control.click();
    return;
  }
  try {
    // Cast: the local name says it is a select.
    (control as HTMLSelectElement).showPicker();
  } catch {
    // An older browser, or one that wants a real key press: the list stays closed.
  }
}

function releaseSpace(): void {
  spaceHold = undefined;
  findCanvas()?.element.classList.remove("is-panning");
}

function holdSpace(event: KeyboardEvent): void {
  const canvas = findCanvas();
  // The real target: an event from the inspector's own UI arrives with its host as the target.
  const target = event.composedPath()[0] as HTMLElement | undefined;
  if (!canvas || event.code !== "Space" || typesText(target)) return;
  // Space would scroll the page, or press the focused control.
  event.preventDefault();
  if (spaceHold) return;
  const isPressable = PRESSED_BY_SPACE.has(target?.localName ?? "");
  spaceHold = { control: isPressable ? target : undefined, dragged: false };
  canvas.element.classList.add("is-panning");
}

function letGoOfSpace(event: KeyboardEvent): void {
  if (event.code !== "Space" || !spaceHold) return;
  // A browser presses a focused control when the key comes up.
  event.preventDefault();
  const { control, dragged } = spaceHold;
  releaseSpace();
  if (control && !dragged) press(control);
}

export function watchSpace(): void {
  // Capture: the inspector's panel keeps its own key events from the page.
  onPageCapture("keydown", holdSpace);
  onPageCapture("keyup", letGoOfSpace);
  // The keyup never arrives when the window loses focus first.
  onPageWindow("blur", releaseSpace);
}
