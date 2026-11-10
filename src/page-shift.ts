/**
 * Push mode: the side panel takes its width out of the page instead of
 * covering it.
 *
 * The page is shifted by one inline margin on <html>, which narrows everything
 * laid out in normal flow. The page's own value is remembered and put back
 * when the panel closes or the user switches to float mode.
 *
 * What this cannot do: elements fixed to the right edge of the window, layouts
 * sized in `vw`, and media queries still see the full window width.
 */

interface Original {
  /** The inline margin the page had set, and its priority. */
  inline: string;
  priority: string;
  /** The margin the page had before the panel (from any stylesheet), in pixels. */
  base: number;
}

let original: Original | null = null;

/** Makes `width` pixels of room on the right of the page. */
export function shiftPage(width: number): void {
  if (width <= 0) {
    restorePage();
    return;
  }
  const root = document.documentElement;
  original ??= {
    inline: root.style.getPropertyValue("margin-right"),
    priority: root.style.getPropertyPriority("margin-right"),
    base: parseFloat(getComputedStyle(root).marginRight) || 0,
  };
  // "important", so a page rule written the same way cannot undo the shift.
  root.style.setProperty("margin-right", `${original.base + width}px`, "important");
}

/** Gives the page back the margin it had. */
export function restorePage(): void {
  if (!original) return;
  document.documentElement.style.setProperty("margin-right", original.inline, original.priority);
  original = null;
}
