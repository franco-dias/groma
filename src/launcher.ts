/**
 * The launcher: a pill at the bottom right that says the inspector is there.
 * Click it to lock inspect mode on, so hovering and clicking work without
 * holding Alt; click its ✕ or press Esc to turn the lock off. The panel's
 * "Edit text inline" switch is the same lock, and the pill shows it.
 */
import { h } from "./dom";
import { icon } from "./icons";
import { lockInspect, onInspectLock, unlockInspect } from "./overlay/inspect-lock";
import { onPage } from "./page";
import { ALT_KEY } from "./platform";
import { mount, whenBodyExists } from "./root";

export function startLauncher(): void {
  whenBodyExists(mountLauncher);
}

function mountLauncher(): void {
  const { pill, off } = createPill();
  // The panel's switch locks and unlocks too: the pill shows either.
  onInspectLock((isLocked) => pill.classList.toggle("is-locked", isLocked));
  pill.addEventListener("click", lockInspect);
  off.addEventListener("click", (event) => {
    event.stopPropagation();
    unlockInspect();
  });
  onPage("keydown", (event) => {
    if (event.key === "Escape") unlockInspect();
  });
}

function createPill(): { pill: HTMLElement; off: HTMLElement } {
  const pill = mount(h("div", "launcher"));
  pill.setAttribute("role", "button");
  pill.title = "Lock inspect mode on";
  const hold = h("span", "hold", "hold");
  hold.appendChild(h("kbd", "", ALT_KEY));
  const off = h("button", "off");
  off.setAttribute("aria-label", "Turn off inspect");
  off.appendChild(icon("close", 12));
  pill.append(
    icon("inspect"),
    h("span", "", "Inspect"),
    h("span", "dot", "·"),
    hold,
    h("span", "locked", "Locked on"),
    off,
  );
  return { pill, off };
}
