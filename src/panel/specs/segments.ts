/** A row of exclusive choices in the panel (px | rem, HEX | RGB | HSL): marks the chosen one and reports a click. */
import { rerender } from "../../selection";

/** What a row of exclusive choices reads, and does when one is chosen. */
type Choices = { current: () => string; choose: (value: string) => void };

/** Marks the choice equal to `current()`; a click chooses and redraws. */
export function mountSegments(group: HTMLElement, { current, choose }: Choices): void {
  const segments = Array.from(group.querySelectorAll<HTMLElement>(".segment"));
  const show = (): void => {
    segments.forEach((segment) => {
      segment.setAttribute("aria-checked", String(segment.dataset.value === current()));
    });
    group.classList.toggle("is-on", group.querySelector('.is-on[aria-checked="true"]') !== null);
  };
  segments.forEach((segment) => {
    segment.addEventListener("click", () => {
      choose(segment.dataset.value ?? "");
      show();
      rerender();
    });
  });
  show();
}
