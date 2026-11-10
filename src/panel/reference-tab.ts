/**
 * The Reference tab: every shortcut and trick in one place, opened from the
 * » menu. Its content is reference.html.
 */
import { ALT_KEY, COMMAND_KEY } from "../platform";
import reference from "./reference.html?raw";
import { type Tab, tabBody } from "./tab";

const KEYS: Record<string, string> = { alt: ALT_KEY, command: COMMAND_KEY };

export const referenceTab: Tab = {
  mount(panel) {
    const body = tabBody(panel, "reference");
    body.innerHTML = reference;
    // Name the modifier keys as this keyboard does.
    for (const key of body.querySelectorAll<HTMLElement>("kbd[data-key]")) {
      key.textContent = KEYS[key.dataset.key ?? ""] ?? "";
    }
  },
  // The reference does not depend on the pinned element.
  render() {},
};
