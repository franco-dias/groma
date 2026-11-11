/**
 * The inspect lock: inspect mode kept on without holding Alt. The launcher
 * pill and the panel's "Edit text inline" switch both turn it on and off, and
 * each shows what the other did.
 */
type LockListener = (isLocked: boolean) => void;

const listeners: LockListener[] = [];
let isLocked = false;

export const isInspectLocked = (): boolean => isLocked;

/** Calls `listener` each time the lock goes on or off. */
export function onInspectLock(listener: LockListener): void {
  listeners.push(listener);
}

function setLock(isOn: boolean): void {
  if (isOn === isLocked) return;
  isLocked = isOn;
  listeners.forEach((listener) => listener(isLocked));
}

export const lockInspect = (): void => setLock(true);

export const unlockInspect = (): void => setLock(false);
