/** Class names a build tool made up, so the Specs tab can put the ones a person wrote first. */

/** Class names a build tool made up ("sc-cOPLXt", "krMpoe", "MuiBox-root-ifjwsH"). */
export function looksGenerated(className: string): boolean {
  const hash = /(?:^|-)([A-Za-z]{6})$/.exec(className)?.[1] ?? "";
  const mixedCase = /[a-z]/.test(hash) && /[A-Z]/.test(hash);
  return /^(sc|css|jss)-/.test(className) || mixedCase;
}
