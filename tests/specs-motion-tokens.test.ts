import { beforeEach, describe, expect, it } from "vitest";
import { all, doubleClick, getElement, inspector, page, reset, texts, typeOver, ui } from "./helpers";

const TOKENS = `--shadow-md: 0 4px 12px rgb(0 0 0 / 0.2); --shadow-lg: 0 12px 32px rgb(0 0 0 / 0.3);
  --duration-fast: 150ms; --duration-slow: 0.4s; --ease-out: cubic-bezier(0, 0, 0.2, 1); --ease-std: ease;
  --transition-base: all 150ms ease; --gap: 8px; --brand: #2f6bff;`;

function pinCard(style: string, head = `#fixture { ${TOKENS} }`): void {
  page(`<style>${head}</style><div class="card" style="width: 120px; height: 40px; ${style}">Card</div>`);
  inspector().pin(getElement(".card"));
}

/** Types `text` in a field that is open, as the keyboard would. */
function type(field: HTMLElement, text: string): void {
  field.textContent = text;
  field.dispatchEvent(new InputEvent("input", { bubbles: true, composed: true }));
}

/** Opens a field and searches the tokens by their dashes, which every name has. */
function openAndSearch(field: Element): void {
  doubleClick(field);
  type(field as HTMLElement, "--");
}

const offered = (): string[] => all(".token-list .token-item").map((item) => item.dataset.token!);

/** The shadow drawn on a token chip, which sits on its ::after. */
const drawn = (chip: Element): string => getComputedStyle(chip, "::after").boxShadow;

const rows = (): HTMLElement[] => all(".motion-row");

const group = (label: string): HTMLElement =>
  all(".effects .effect-group").find((node) => node.querySelector(".effect-label")?.textContent === label)!;

const inline = (property: string): string => getElement(".card").style.getPropertyValue(property);

const TWO = "transition: opacity 200ms ease-in, transform 300ms ease-out";

beforeEach(reset);

describe("shadow tokens", () => {
  it("are offered on the Shadow label, the tokens that equal the value first, and nothing else", () => {
    pinCard("box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3)");
    const label = group("Shadow").querySelector<HTMLElement>(".effect-label")!;
    doubleClick(label);
    expect(offered()).toEqual(["--shadow-lg"]);
    type(label, "--");
    expect(offered()).toEqual(["--shadow-lg", "--shadow-md"]);
  });

  it("are drawn as a small square with the shadow, and tell apart by it", () => {
    pinCard("box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2)");
    openAndSearch(group("Shadow").querySelector(".effect-label")!);
    const chips = all(".token-list .shadow-chip");
    expect(chips).toHaveLength(2);
    expect(drawn(chips[0])).not.toBe(drawn(chips[1]));
    expect(drawn(chips[0])).not.toBe("none");
  });

  it("write var(--name), and the page shows that shadow", () => {
    pinCard("box-shadow: 0 12px 32px rgba(0, 0, 0, 0.3)");
    openAndSearch(group("Shadow").querySelector(".effect-label")!);
    ui<HTMLElement>('.token-item[data-token="--shadow-md"]')!.click();
    expect(inline("box-shadow")).toBe("var(--shadow-md)");
    expect(getComputedStyle(getElement(".card")).boxShadow).toBe("rgba(0, 0, 0, 0.2) 0px 4px 12px 0px");
  });

  it("are offered for a text shadow too", () => {
    page(
      `<style>#fixture { ${TOKENS} }</style><p class="card" style="margin: 0; text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2)">T</p>`,
    );
    inspector().pin(getElement(".card"));
    openAndSearch(group("Text shadow").querySelector(".effect-label")!);
    expect(offered()).toEqual(["--shadow-lg", "--shadow-md"]);
  });

  it("are named when a hand-written shadow equals one", () => {
    pinCard("box-shadow: 0 4px 12px 0 rgba(0, 0, 0, 0.2)");
    expect(texts(".effects .effect-token")).toEqual(["matches token --shadow-md"]);
  });

  it("are named, as the Layout block names them, when the element declares one", () => {
    pinCard("box-shadow: var(--shadow-md)");
    expect(texts(".effects .token-note")).toEqual(["--shadow-md"]);
    expect(texts(".effects .effect-token")).toEqual([]);
  });

  it("are not named for a shadow no token has", () => {
    pinCard("box-shadow: 1px 1px 1px red");
    expect(texts(".effects .effect-token")).toEqual([]);
  });
});

describe("the Motion block", () => {
  it("offers time tokens on one transition's duration and changes that entry only", () => {
    pinCard(TWO);
    openAndSearch(rows()[1].querySelector(".duration")!);
    expect(offered()).toEqual(["--duration-fast", "--duration-slow"]);
    expect(all(".token-list .token-value").map((value) => value.textContent)).toEqual(["150ms", "0.4s"]);

    ui<HTMLElement>('.token-item[data-token="--duration-fast"]')!.click();
    expect(inline("transition-duration")).toBe("200ms, var(--duration-fast)");
    expect(getComputedStyle(getElement(".card")).transitionDuration).toBe("0.2s, 0.15s");
    expect(getComputedStyle(getElement(".card")).transitionProperty).toBe("opacity, transform");
    expect(getComputedStyle(getElement(".card")).transitionTimingFunction).toBe("ease-in, ease-out");
  });

  it("offers the token equal to the duration first", () => {
    pinCard(TWO.replace("300ms", "400ms"));
    doubleClick(rows()[1].querySelector(".duration")!);
    expect(offered()).toEqual(["--duration-slow"]);
  });

  it("types a duration over one entry as one edit of the whole list", () => {
    pinCard(TWO);
    const duration = rows()[0].querySelector<HTMLElement>(".duration")!;
    doubleClick(duration);
    typeOver(duration, "1s");
    expect(inline("transition-duration")).toBe("1s, 300ms");
    expect(rows()[0].querySelector(".duration")!.classList.contains("is-edited")).toBe(true);
  });

  it("offers easing tokens on the easing, with the curve drawn, and changes that entry only", () => {
    pinCard(TWO);
    openAndSearch(rows()[0].querySelector(".easing")!);
    expect(offered()).toEqual(["--ease-out", "--ease-std"]);
    expect(all(".token-list .token-item svg")).toHaveLength(2);

    ui<HTMLElement>('.token-item[data-token="--ease-out"]')!.click();
    expect(inline("transition-timing-function")).toBe("var(--ease-out), ease-out");
    expect(getComputedStyle(getElement(".card")).transitionTimingFunction).toBe(
      "cubic-bezier(0, 0, 0.2, 1), ease-out",
    );
  });

  it("pads a list the page gave short to one entry per transition", () => {
    pinCard("transition-property: opacity, transform; transition-duration: 200ms");
    openAndSearch(rows()[1].querySelector(".duration")!);
    ui<HTMLElement>('.token-item[data-token="--duration-slow"]')!.click();
    expect(inline("transition-duration")).toBe("200ms, var(--duration-slow)");
  });

  it("edits the whole transition as text on the Transition label, offering transition tokens", () => {
    pinCard(TWO);
    const label = ui<HTMLElement>(".transition-label")!;
    openAndSearch(label);
    expect(label.isContentEditable).toBe(true);
    expect(offered()).toEqual(["--transition-base"]);

    ui<HTMLElement>('.token-item[data-token="--transition-base"]')!.click();
    expect(inline("transition")).toBe("var(--transition-base)");
    expect(getComputedStyle(getElement(".card")).transitionProperty).toBe("all");
  });

  it("offers the transition token that does what the element's transition does first", () => {
    pinCard("transition: all 0.15s ease 0s", `#fixture { ${TOKENS} --transition-slow: all 1s ease; }`);
    const label = ui<HTMLElement>(".transition-label")!;
    doubleClick(label);
    expect(offered()).toEqual(["--transition-base"]);
    type(label, "--");
    expect(offered()).toEqual(["--transition-base", "--transition-slow"]);
  });

  it("still copies the row on a click", async () => {
    pinCard(TWO);
    rows()[0].click();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(rows()[0].classList.contains("is-copied")).toBe(true);
  });

  it("names the token the element declares a duration, an easing or a transition with", () => {
    pinCard(
      "transition-property: opacity; transition-duration: var(--duration-fast); transition-timing-function: var(--ease-out)",
    );
    expect(texts(".motion-notes .token-note")).toEqual(["--duration-fast", "--ease-out"]);
    expect(texts(".motion-notes .label")).toEqual(["Duration", "Easing"]);
  });

  it("names the token of a declared transition shorthand", () => {
    pinCard("transition: opacity var(--duration-fast) ease");
    expect(texts(".motion-notes .token-note")).toEqual(["--duration-fast"]);
    expect(texts(".motion-notes .label")).toEqual(["Transition"]);
  });

  it("leaves an animation read-only", () => {
    pinCard(
      "animation: spin 1s linear infinite",
      `#fixture { ${TOKENS} } @keyframes spin { to { transform: rotate(1turn); } }`,
    );
    expect(rows()).toHaveLength(1);
    expect(rows()[0].querySelector(".duration")!.classList.contains("is-editable")).toBe(false);
    expect(ui(".transition-label")).toBeNull();
  });

  it("offers no list on a page with no such tokens", () => {
    pinCard(TWO, "");
    openAndSearch(rows()[0].querySelector(".duration")!);
    expect(ui(".token-list")).toBeNull();
    openAndSearch(rows()[0].querySelector(".easing")!);
    expect(ui(".token-list")).toBeNull();
    openAndSearch(ui(".transition-label")!);
    expect(ui(".token-list")).toBeNull();
  });

  it("respects the page's token prefixes", () => {
    inspector().configure({ tokenPrefixes: ["--ds-"] });
    pinCard(TWO, `#fixture { ${TOKENS} --ds-duration: 100ms; }`);
    openAndSearch(rows()[0].querySelector(".duration")!);
    expect(offered()).toEqual(["--ds-duration"]);
  });

  it("lists at most eight", () => {
    const many = Array.from({ length: 12 }, (_, index) => `--time-${index}: ${index + 1}00ms;`).join(" ");
    pinCard(TWO, `#fixture { ${many} }`);
    openAndSearch(rows()[0].querySelector(".duration")!);
    expect(offered()).toHaveLength(8);
  });

  it("fits a panel 320px wide with no sideways scroll", () => {
    pinCard(TWO + "; transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1), steps(4, jump-start)");
    ui(".panel")!.style.width = "320px";
    const body = ui('.body[data-for="specs"]')!;
    openAndSearch(rows()[0].querySelector(".duration")!);
    expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
  });
});
