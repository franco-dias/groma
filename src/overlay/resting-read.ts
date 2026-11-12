/**
 * An element pinned with a click is read with the pointer on it, so the
 * panel shows what its `:hover` rules give it: the hover colour, not the
 * colour the element has at rest. When the pointer leaves the pinned element
 * and the transitions that started have ended, the panel reads it again.
 */
import { isElement, onPageCapture } from "../page";
import { isOwn } from "../root";
import { findPinnedElement, rerender } from "../selection";
import { isTextEditing } from "./text-edit";

/** A transition ends; an animation may run for good. */
const isTransition = (animation: Animation): boolean => "transitionProperty" in animation;

const nextFrame = (): Promise<unknown> => new Promise(requestAnimationFrame);

/** Resolves when the transitions the element is in have ended or were cancelled. */
function whenTransitionsEnd(element: Element): Promise<unknown> {
  const transitions = element.getAnimations().filter(isTransition);
  return Promise.allSettled(transitions.map((transition) => transition.finished));
}

/** A value open in the panel, or text being typed on the page: reading again would take it from the user. */
const isUserTyping = (): boolean => isOwn(document.activeElement) || isTextEditing();

async function readAtRest(left: Element): Promise<void> {
  // The leave starts the transitions back; they are there from the next frame.
  await nextFrame();
  await whenTransitionsEnd(left);
  if (findPinnedElement() === left && left.isConnected && !isUserTyping()) rerender();
}

const isInside = (pinned: Element, node: unknown): boolean => isElement(node) && pinned.contains(node);

function leave(event: MouseEvent): void {
  const pinned = findPinnedElement();
  if (!pinned || !isInside(pinned, event.target) || isInside(pinned, event.relatedTarget)) return;
  void readAtRest(pinned);
}

/** Starts watching for the pointer leaving the pinned element. */
export function startRestingRead(): void {
  onPageCapture("mouseout", leave);
}
