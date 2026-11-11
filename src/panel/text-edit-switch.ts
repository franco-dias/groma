/**
 * The switch at the foot of the panel, "Edit text inline (lock inspecting)".
 * It is there on every tab so the feature is found: a double-click on the
 * page is not something a user tries unasked. Checking it locks inspect mode
 * on, as the launcher pill does; while locked, a double-click on text on the
 * page edits it. The switch and the pill always show the same state.
 */
import { isInspectLocked, lockInspect, onInspectLock, unlockInspect } from "../overlay/inspect-lock";
import { part } from "./tab";

export function mountTextEditSwitch(panel: HTMLElement): void {
  const box = part<HTMLInputElement>(panel, '[data-option="text-edit"]');
  box.checked = isInspectLocked();
  onInspectLock((isLocked) => {
    box.checked = isLocked;
  });
  box.addEventListener("change", () => (box.checked ? lockInspect() : unlockInspect()));
}
