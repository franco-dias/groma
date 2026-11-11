/**
 * What the page that hosts the inspector can set, so the inspector speaks
 * the project's language. Nothing here is required.
 *
 * Set it on the script tag:
 *
 *   <script src="groma.js" data-copy="sx" data-token-prefix="--ds-"></script>
 *
 * or from code: `Groma.configure({ copyFormat: "sx" })`.
 */
import { rerender } from "./selection";

export type CopyFormat = "css" | "sx";

export type Config = {
  /**
   * What a click on a length copies.
   *   "css"  `24px`, and `padding: 12px 16px` for a box side group
   *   "sx"   `24`, and `py: 12, px: 16`: the object form some styling
   *          libraries take, where a bare number means pixels
   */
  copyFormat: CopyFormat;
  /**
   * Prefixes of CSS variables that mirror a theme object. A token with one
   * of these prefixes also shows its path in that object:
   * "--ds-" turns `--ds-color-text-primary` into `color.text.primary`.
   */
  tokenPrefixes: string[];
};

const DEFAULTS: Config = { copyFormat: "css", tokenPrefixes: [] };

export const config: Config = { ...DEFAULTS };

/** Changes some settings; the rest keep their values. `configure()` alone restores the defaults. */
export function configure(changes: Partial<Config> = DEFAULTS): void {
  if (changes.copyFormat === "css" || changes.copyFormat === "sx") {
    config.copyFormat = changes.copyFormat;
  }
  if (Array.isArray(changes.tokenPrefixes)) {
    config.tokenPrefixes = changes.tokenPrefixes.filter((prefix) => prefix.startsWith("--"));
  }
  rerender();
}

/** Reads the settings from the script tag that loaded the inspector. */
export function configureFromScriptTag(): void {
  // A module script has no `currentScript`; such pages mark the tag instead.
  const tag = document.currentScript ?? document.querySelector("script[data-groma]");
  if (!(tag instanceof HTMLElement)) return;
  configure({
    // Cast: any text may be there; `configure` takes only the two formats.
    copyFormat: tag.dataset.copy as CopyFormat | undefined,
    tokenPrefixes: tag.dataset.tokenPrefix?.split(/[\s,]+/).filter(Boolean),
  });
}
