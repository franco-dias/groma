/**
 * "Try it here": the landing page runs Groma itself. A click on the button
 * shows how to start; holding the key then says what to do next, and letting
 * it go before that hint is gone asks for the key again. Devices
 * with only touch have no key to hold: Groma does not run there, and the page
 * shows the npm button instead.
 */
(function () {
  // The page marks <html> on Apple keyboards (see STYLES in content.py).
  const isApple = document.documentElement.classList.contains("is-mac");
  const KEY = isApple ? "⌥ Option" : "Alt";
  const pt = document.documentElement.lang === "pt-BR";
  const START = pt ? `Segure <kbd>${KEY}</kbd> para começar!` : `Hold <kbd>${KEY}</kbd> to get started!`;
  const NEXT = pt ? "Agora passe o mouse em qualquer coisa e clique para fixar." : "Now hover anything, and click to pin it.";
  let hint = null;
  let hideTimer = 0;
  let button = null;

  function place(button) {
    const r = button.getBoundingClientRect();
    // Centred under the button, but never past the edge of a narrow screen.
    const half = hint.offsetWidth / 2;
    const centre = Math.min(Math.max(r.left + r.width / 2, half + 12), innerWidth - half - 12);
    hint.style.left = `${centre + scrollX}px`;
    hint.style.setProperty("--arrow", `${r.left + r.width / 2 - centre}px`);
    hint.style.top = `${r.bottom + 14 + scrollY}px`;
  }

  function show(button, html, hideAfter) {
    if (!hint) {
      hint = document.body.appendChild(document.createElement("div"));
      hint.className = "try-hint";
      hint.setAttribute("role", "status");
    }
    hint.innerHTML = html;
    place(button);
    // Restart the entrance animation each time.
    hint.classList.remove("is-shown");
    void hint.offsetWidth;
    hint.classList.add("is-shown");
    clearTimeout(hideTimer);
    if (hideAfter) hideTimer = setTimeout(() => hint.classList.remove("is-shown"), hideAfter);
    follow();
  }

  /** Keeps the hint under the button while it shows: Groma's panel pushes the page aside. */
  function follow() {
    if (!hint?.classList.contains("is-shown") || !button) return;
    place(button);
    requestAnimationFrame(follow);
  }

  let waitingForKey = false;

  // Delegated: the page's runtime may re-render the button.
  document.addEventListener("click", (e) => {
    const target = e.target.closest?.("[data-try-it]");
    if (!target) return;
    button = target;
    waitingForKey = true;
    show(button, START);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Alt" || !waitingForKey || !button) return;
    waitingForKey = false;
    show(button, NEXT, 3200);
  });

  document.addEventListener("keyup", (e) => {
    if (e.key !== "Alt" || waitingForKey || !button || !hint?.classList.contains("is-shown")) return;
    waitingForKey = true;
    show(button, START);
  });
  // The keyup never arrives when the window loses focus with the key down.
  addEventListener("blur", () => {
    if (!waitingForKey && button && hint?.classList.contains("is-shown")) {
      waitingForKey = true;
      show(button, START);
    }
  });

})();
