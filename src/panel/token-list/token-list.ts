/**
 * The page's design tokens, listed under a field of the Specs tab while the
 * user types a value: a swatch for a colour, the token's name, its value. A
 * click, or the arrow keys and Enter, writes `var(--token)` in place of the
 * text. The tokens that hold the field's value come first, then those whose
 * name contains what was typed; at most eight are shown.
 *
 * The list sits in the tab's own scroll area, so it moves with the field and
 * is never cut at the bottom of the panel: it opens above the field when
 * there is no room below.
 */
import { h } from "../../dom";
import { type Fit, findFit, rankTokens, type TokenChoice } from "../../specs/suggest";
import { findFieldTokens, type LengthReading, makeHolds } from "./field-tokens";
import { placeList } from "./list-placement";
import { fillItems, markActive } from "./token-items";

export type TokenList = {
  /** Shows the tokens for the text now in the field. */
  update(text: string): void;
  /** Hides the list until the next `update`. */
  close(): void;
  /** Moves the highlight; from none, down picks the first and up the last. */
  move(step: 1 | -1): void;
  /** Whether the list is showing. */
  readonly isOpen: boolean;
  /** The name of the token the keys are on, or undefined. */
  readonly chosen: string | undefined;
};

export type TokenListOptions = {
  prop: string;
  /** The pinned element: its tokens are the variables it can see. */
  computedStyle: CSSStyleDeclaration;
  field: HTMLElement;
  /** The tab's scroll area, which holds the list. */
  host: HTMLElement;
  /** What the field held when it opened: not yet a search. */
  opened: string;
  length: LengthReading;
  pick: (name: string) => void;
};

/** What the list shows now. */
type ListState = { shown: TokenChoice[]; active: number; isClosed: boolean };

/** Everything the list's functions work on. */
type TokenListContext = {
  options: TokenListOptions;
  fit: Fit;
  tokens: TokenChoice[];
  holds: (text: string) => (value: string) => boolean;
  list: HTMLElement;
  state: ListState;
};

function createListElement(): HTMLElement {
  const list = h("div", "token-list");
  list.setAttribute("role", "listbox");
  // A press on the list must not take the focus from the field: the field would apply and close.
  list.addEventListener("mousedown", (event) => event.preventDefault());
  return list;
}

function nextActive(state: ListState, step: 1 | -1): number {
  const count = state.shown.length;
  if (state.active >= 0) return (state.active + step + count) % count;
  return step === 1 ? 0 : count - 1;
}

function showTokens({ options, fit, tokens, holds, list, state }: TokenListContext, text: string): void {
  state.isClosed = false;
  const typed = text === options.opened ? "" : text;
  state.shown = rankTokens(tokens, { typed, holds: holds(text) });
  state.active = -1;
  fillItems(list, { shown: state.shown, fit, pick: options.pick });
  if (!state.shown.length) {
    list.remove();
    return;
  }
  options.host.appendChild(list);
  placeList(list, options);
}

function moveActive({ list, state }: TokenListContext, step: 1 | -1): void {
  if (!state.shown.length) return;
  state.active = nextActive(state, step);
  markActive(list, state.active);
}

const isListOpen = ({ state, list }: TokenListContext): boolean => !state.isClosed && list.isConnected;

function createContext(options: TokenListOptions): TokenListContext | undefined {
  const fit = findFit(options.prop);
  const tokens = fit && findFieldTokens(options.computedStyle, fit);
  if (!fit || !tokens?.length) return undefined;
  const holds = makeHolds(fit, options.length);
  const state = { shown: [], active: -1, isClosed: false };
  return { options, fit, tokens, holds, list: createListElement(), state };
}

/**
 * A list for a field that edits `prop`, or undefined when that property takes
 * no tokens or the page has none of the right kind (and of the page's token
 * prefixes, when it set some).
 */
export function createTokenList(options: TokenListOptions): TokenList | undefined {
  const context = createContext(options);
  if (!context) return undefined;
  showTokens(context, options.opened);
  return {
    update: (text) => showTokens(context, text),
    close() {
      context.state.isClosed = true;
      context.list.remove();
    },
    move: (step) => moveActive(context, step),
    get isOpen() {
      return isListOpen(context);
    },
    get chosen() {
      const { active, shown } = context.state;
      return active >= 0 && isListOpen(context) ? shown[active].name : undefined;
    },
  };
}
