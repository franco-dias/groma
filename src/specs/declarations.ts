/** Declarations as text: split a CSS list at its top-level separators, and write a block of declarations to copy. */

const CLOSERS: Record<string, string> = { "(": ")", '"': '"', "'": "'" };

/**
 * `text` cut at each `separator` that is not inside parentheses or quotes,
 * trimmed, with empty parts dropped. One function for the commas of a shadow
 * list and the semicolons of a declaration block.
 */
export function splitTopLevel(text: string, separator: string): string[] {
  const parts: string[] = [];
  const open: string[] = [];
  let start = 0;
  [...text].forEach((character, index) => {
    if (open.at(-1) === character) open.pop();
    else if (open.at(-1) !== '"' && open.at(-1) !== "'" && Object.hasOwn(CLOSERS, character))
      open.push(CLOSERS[character]);
    if (character !== separator || open.length) return;
    parts.push(text.slice(start, index));
    start = index + 1;
  });
  parts.push(text.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

/** The element's name as a comment, then one declaration per line, ready to paste into a stylesheet. */
export function cssBlock({ name, cssText }: { name: string; cssText: string }): string {
  const lines = splitTopLevel(cssText, ";").map((declaration) => `${declaration};`);
  return [`/* ${name} */`, ...lines].join("\n");
}
