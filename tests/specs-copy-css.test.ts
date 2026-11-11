import { beforeEach, describe, expect, it } from "vitest";
import { clipboard, getElement, inspector, page, reset, ui, wait } from "./helpers";

/** What the Copy CSS button copies for the pinned element. */
async function copiedCss(): Promise<string> {
  ui('[data-action="copy-css"]')!.click();
  await wait(20);
  return clipboard.text;
}

function pinCard(html: string): void {
  page(html);
  inspector().pin(getElement(".card"));
}

beforeEach(reset);

describe("Copy CSS", () => {
  it("copies the rules that apply and the inline style as declarations", async () => {
    pinCard(`
      <style>.card { display: flex; gap: var(--space-2); padding: 12px 16px; }</style>
      <div class="card" style="color: red">Card</div>
    `);
    expect(await copiedCss()).toBe(
      "/* div.card */\ndisplay: flex;\ngap: var(--space-2);\npadding: 12px 16px;\ncolor: red;",
    );
  });

  it("lets the later declaration win, one line per property", async () => {
    pinCard(`
      <style>.card { color: red; margin: 4px; } .card { color: blue; }</style>
      <div class="card">Card</div>
    `);
    expect(await copiedCss()).toBe("/* div.card */\nmargin: 4px;\ncolor: blue;");
  });

  it("respects !important over a later declaration", async () => {
    pinCard(`
      <style>.card { color: red !important; } .card { color: blue; }</style>
      <div class="card">Card</div>
    `);
    expect(await copiedCss()).toBe("/* div.card */\ncolor: red !important;");
  });

  it("keeps a shorthand as one line and var() as written", async () => {
    pinCard(`
      <style>.card { padding: var(--pad) 4px; border: 1px solid var(--line); }</style>
      <div class="card">Card</div>
    `);
    expect(await copiedCss()).toBe(
      "/* div.card */\npadding: var(--pad) 4px;\nborder: 1px solid var(--line);",
    );
  });

  it("leaves out a rule of a media query that does not apply now", async () => {
    pinCard(`
      <style>
        .card { width: 100px; }
        @media (max-width: 1px) { .card { width: 40px; } }
        @media (min-width: 1px) { .card { height: 30px; } }
      </style>
      <div class="card">Card</div>
    `);
    expect(await copiedCss()).toBe("/* div.card */\nwidth: 100px;\nheight: 30px;");
  });

  it("leaves out a rule for another element", async () => {
    pinCard(`
      <style>.other { color: red; }</style>
      <div class="card">Card</div>
    `);
    expect(await copiedCss()).toBe("/* div.card */");
  });

  it("copies only the comment for an element with nothing declared", async () => {
    page(`<p id="plain">Plain</p>`);
    inspector().pin(getElement("#plain"));
    expect(await copiedCss()).toBe("/* p */");
  });

  it("includes the user's own edits, which are inline styles", async () => {
    pinCard(`
      <style>.card { gap: 8px; }</style>
      <div class="card" style="display: flex">Card</div>
    `);
    const gap = ui<HTMLElement>('.body[data-for="specs"] [data-edits="gap"]')!;
    gap.dispatchEvent(new MouseEvent("dblclick", { bubbles: true, composed: true }));
    gap.textContent = "20px";
    gap.dispatchEvent(new FocusEvent("blur"));
    expect(await copiedCss()).toBe("/* div.card */\ndisplay: flex;\ngap: 20px;");
  });

  it("marks the button as copied without changing its size", async () => {
    pinCard(`<div class="card" style="color: red">Card</div>`);
    const button = ui('[data-action="copy-css"]')!;
    const before = button.getBoundingClientRect();
    await copiedCss();
    expect(button.classList.contains("is-copied")).toBe(true);
    expect(button.getBoundingClientRect().width).toBe(before.width);
  });
});
