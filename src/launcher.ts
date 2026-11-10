/**
 * The launcher: a pill at the bottom right that says the inspector is there.
 * Click it to lock inspect mode on, so hovering and clicking work without
 * holding Alt; click its ✕ or press Esc to turn the lock off.
 */
import { h } from "./dom";
import { icon } from "./icons";
import { setInspectLock } from "./overlay/hover";
import { onPage } from "./page";
import { ALT_KEY } from "./platform";
import { mount, whenBodyExists } from "./root";

export function startLauncher(): void {
  whenBodyExists(() => {
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

    const setLocked = (locked: boolean) => {
      pill.classList.toggle("is-locked", locked);
      setInspectLock(locked);
    };
    pill.addEventListener("click", () => setLocked(true));
    off.addEventListener("click", (e) => {
      e.stopPropagation();
      setLocked(false);
    });
    onPage("keydown", (e) => {
      if (e.key === "Escape") setLocked(false);
    });
  });
}
