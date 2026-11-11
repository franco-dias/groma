/** What the canvas remembers between visits: whether it was on, and the frame's size. */
import { readStore, writeStore } from "../edits/storage";
import { DEFAULT_SIZE, getSize, isCanvasOn } from "./canvas-state";
import { clampSize, type Size } from "./view";

const STORE_KEY = "__groma_canvas";

type Saved = { on: boolean; width: number; height: number };

export function saveCanvas(): void {
  writeStore(STORE_KEY, { on: isCanvasOn(), ...getSize() } satisfies Saved);
}

export function readSavedSize(): Size {
  const { width, height } = readStore<Saved>(STORE_KEY);
  return width && height ? clampSize({ width, height }) : DEFAULT_SIZE;
}

/** True when the user left the canvas on. */
export const wasCanvasOn = (): boolean => readStore<Saved>(STORE_KEY).on === true;
