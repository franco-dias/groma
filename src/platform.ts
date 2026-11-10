/** How this machine's keyboard names its modifier keys. */

const isApple = /Mac|iPhone|iPad/.test(navigator.platform);

/** The key that turns inspect mode on. */
export const ALT_KEY = isApple ? "⌥" : "Alt";

export const SHIFT_KEY = isApple ? "⇧" : "Shift";

/** The key used with Enter to apply a content edit. */
export const COMMAND_KEY = isApple ? "⌘" : "Ctrl";
