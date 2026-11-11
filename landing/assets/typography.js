/**
 * Typography: every text on the page is one, so Groma names it and lists its props.
 *
 * Any element that holds text of its own (and is not already another component)
 * gets data-component="Typography" with three props worked out from the styles it
 * really has:
 *   variant  display, h2, h3, stat, lead, body, body-sm, caption, overline, code, keycap
 *   color    the name of its color token (text-primary, accent-soft…), or gradient
 *   effects  gradient, sweep, mono, uppercase, glow: whatever applies
 *
 * It runs again when the page re-renders part of itself.
 */
(function () {
  const SOURCE = "src/components/Typography.tsx";
  const SKIP = new Set(["SCRIPT", "STYLE", "SVG", "svg", "VIDEO", "TEMPLATE", "GROMA-INSPECTOR", "BUTTON", "A"]);

  /** Color token names by computed rgb(), read from the variables on :root. */
  const names = new Map();
  function readTokens() {
    const probe = document.body.appendChild(document.createElement("i"));
    const root = getComputedStyle(document.documentElement);
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (rule.selectorText !== ":root") continue;
        for (const prop of rule.style) {
          if (!prop.startsWith("--color-")) continue;
          probe.style.color = root.getPropertyValue(prop).trim();
          const rgb = getComputedStyle(probe).color;
          if (!names.has(rgb)) names.set(rgb, prop.slice("--color-".length));
        }
      }
    }
    probe.remove();
  }

  function variant(el, cs) {
    const size = parseFloat(cs.fontSize);
    const mono = /mono/i.test(cs.fontFamily);
    if (el.tagName === "H1") return "display";
    if (el.tagName === "H2") return "h2";
    if (el.tagName === "H3") return "h3";
    if (el.tagName === "KBD") return "keycap";
    if (el.tagName === "CODE" || el.closest("code, .code")) return "code";
    if (size >= 32) return "stat";
    if (size >= 18) return "lead";
    if (cs.textTransform === "uppercase") return "overline";
    if (size >= 15) return "body";
    if (size >= 13) return mono ? "label" : "body-sm";
    return "caption";
  }

  function props(el) {
    const cs = getComputedStyle(el);
    const gradient = cs.backgroundClip === "text" || cs.webkitBackgroundClip === "text";
    const effects = [];
    if (gradient || el.querySelector(".g")) effects.push("gradient");
    if (/sweep/.test(cs.animationName) || el.querySelector(".sweep")) effects.push("sweep");
    if (/mono/i.test(cs.fontFamily)) effects.push("mono");
    if (cs.textTransform === "uppercase") effects.push("uppercase");
    if (cs.textShadow && cs.textShadow !== "none") effects.push("glow");
    const out = {
      variant: variant(el, cs),
      color: gradient || el.querySelector(".g") ? "gradient" : names.get(cs.color) || "inherit",
      weight: Number(cs.fontWeight),
    };
    if (effects.length) out.effects = effects.join(" + ");
    return out;
  }

  /** True for an element with text of its own, not only inside its children. */
  const ownText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());

  function tag(scope) {
    for (const el of scope.querySelectorAll("*")) {
      if (SKIP.has(el.tagName) || el.closest("svg, groma-inspector") || el.hasAttribute("data-component")) continue;
      if (!ownText(el) && !(el.matches("h1, h2") && el.textContent.trim())) continue;
      // A heading made of styled spans is one Typography, not one per span.
      if (el.parentElement?.closest("h1, h2")?.hasAttribute("data-component")) continue;
      el.setAttribute("data-component", "Typography");
      el.setAttribute("data-source", SOURCE);
      el.setAttribute("data-props", JSON.stringify(props(el)));
    }
  }

  function start() {
    readTokens();
    tag(document.body);
    // The page's runtime renders some parts later and re-renders others.
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; tag(document.body); });
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }
  if (document.readyState === "complete") start();
  else addEventListener("load", start);
})();
