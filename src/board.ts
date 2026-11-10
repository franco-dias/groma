/** Artboards: the frames a design page lays its screens out on. */
import { type Box, scaleOf } from "./dom";

/**
 * A Claude Design export stage, a design-canvas card, or any element a page
 * marks with `data-artboard`.
 */
const BOARD_SELECTOR = ".sa-stage, .dc-card, [data-artboard]";

/** The artboard that contains `el`, if any. */
export function boardOf(el: Element): Element | null {
  return el.parentElement?.closest(BOARD_SELECTOR) ?? null;
}

export interface BoardPosition {
  /** "x 64 · y 216", in the board's own pixels at any zoom. */
  text: string;
  /** The board's name, when the page labels it. */
  board: string;
}

/** Where an element sits on its artboard. */
export function boardPosition(el: Element, rect: Box): BoardPosition | null {
  const board = boardOf(el);
  if (!board) return null;
  const boardRect = board.getBoundingClientRect();
  const scale = scaleOf(board, boardRect);
  const tenth = (value: number) => Math.round(value * 10) / 10;
  const x = tenth((rect.left - boardRect.left) / scale.x);
  const y = tenth((rect.top - boardRect.top) / scale.y);
  return {
    text: `x ${x} · y ${y}`,
    board: board.closest("[aria-label]")?.getAttribute("aria-label") ?? "",
  };
}
