/**
 * "Copy edits": the user's edits as one Markdown text, written for a coding
 * agent (or a person) who will make the same changes in the source.
 *
 * It describes what changed on the page, before → after, and how to find
 * each element. It does not say which line of which file to write: only the
 * project knows that.
 */

export interface HandoffValue {
  /** A CSS property, or "" for the element's content. */
  prop: string;
  /** Null when the value the page had is not known. */
  before: string | null;
  after: string;
  /** Design tokens of the page that hold the new value. */
  tokens: string[];
}

export interface HandoffElement {
  name: string;
  selector: string;
  /** False when the page no longer has the element. */
  onPage: boolean;
  component?: { name: string; sourcePath?: string; inside: boolean };
  /** The start of the element's text, to search the source for. */
  text?: string;
  values: HandoffValue[];
  note: string;
}

export interface HandoffPage {
  address: string;
  width: number;
  height: number;
}

const MAX_TOKENS = 3;
/**
 * Inline code on one line. A value that holds backticks gets a longer fence,
 * as Markdown asks, so the reader sees where the value ends.
 */
function code(text: string): string {
  const line = text.replace(/\s*\n\s*/g, " ");
  const longest = Math.max(0, ...(line.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  return longest ? `${fence} ${line} ${fence}` : fence + line + fence;
}

/** A note keeps its lines. More than one line is quoted, so nothing in it reads as a heading of this text. */
function noteLines(note: string): string[] {
  const lines = note.split("\n").map((line) => line.trim());
  return lines.length === 1 ? [`Note: ${lines[0]}`] : ["Note:", ...lines.map((line) => (line ? `> ${line}` : ">"))];
}

function valueLine({ prop, before, after, tokens }: HandoffValue): string {
  // Content is quoted as JSON, so line breaks and quotes in it stay on one line.
  const show = prop ? code : (text: string) => JSON.stringify(text);
  const change = before === null ? `${show(after)} (the value before is not known)` : `${show(before)} → ${show(after)}`;
  const names = tokens.slice(0, MAX_TOKENS).map(code).join(", ");
  return `- ${prop ? code(prop) : "Content"}: ${change}${names ? ` (matches ${names})` : ""}`;
}

function elementLines(element: HandoffElement, index: number): string[] {
  const { component } = element;
  const lines = [`## ${index + 1}. ${element.name}`, "", `- Selector: ${code(element.selector)}`];
  if (component) {
    const source = component.sourcePath ? ` (${code(component.sourcePath)})` : "";
    lines.push(`- ${component.inside ? "Inside component" : "Component"}: ${code(component.name)}${source}`);
  }
  if (element.text) lines.push(`- Text: ${JSON.stringify(element.text)}`);
  if (!element.onPage) lines.push("- The page did not have this element when the edits were copied.");
  if (element.values.length) lines.push("", "Edits:", ...element.values.map(valueLine));
  if (element.note) lines.push("", ...noteLines(element.note));
  return lines;
}

/** The whole text that "Copy edits" puts on the clipboard. */
export function formatHandoff(page: HandoffPage, elements: HandoffElement[]): string {
  return [
    "# Edits to apply",
    "",
    "These edits were made on the live page with Groma. Each line shows the value the page had and the value it should have. " +
      "The selectors describe the rendered page, not the source files. " +
      "Where one of the page's CSS variables holds a new value, it is named after the value: " +
      "use it when it is the right token for that property.",
    "",
    `- Page: ${page.address}`,
    `- Viewport: ${page.width} × ${page.height}`,
    ...elements.flatMap((element, index) => ["", ...elementLines(element, index)]),
    "",
  ].join("\n");
}
