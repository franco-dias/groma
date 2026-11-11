/**
 * Hands the edits made with Groma on this page to the bridge of the
 * `gromajs` command, so a coding agent can read them with no copy and paste.
 * It is not part of the inspector (dist/groma.js): the command serves it, and
 * only on a page where you add it:
 *
 *   <script src="http://localhost:4777/bridge.js"></script>
 *
 * It posts to the server it was loaded from. It adds no global and changes
 * nothing on the page, and when the bridge is not there it tries a few times,
 * slowly, then waits for the next edit or for the window to get focus.
 */
// oxlint-disable-next-line max-lines-per-function -- a classic script wraps itself in a function so its names stay off the page
(() => {
  const source = document.currentScript?.src;
  const MAX_FAILURES = 3;
  let latest = "";
  let failures = 0;
  let timer;

  const post = () => {
    clearTimeout(timer);
    fetch(new URL("/__groma/edits", source), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: location.href, title: document.title, text: latest }),
    })
      // A refusal (the origin is not allowed) is final; a bridge that is not there is tried again.
      .then((response) => void (failures = response.ok ? 0 : MAX_FAILURES))
      .catch(() => {
        failures += 1;
        if (failures < MAX_FAILURES) timer = setTimeout(post, 2000 * 2 ** failures);
      });
  };

  const update = (text) => {
    latest = text;
    failures = 0;
    post();
  };

  // The copy of the page script inside Groma's canvas frame shares its parent's `Groma`: the parent reports.
  // oxlint-disable-next-line unicorn/consistent-function-scoping -- kept inside the wrapper, so no name reaches the page
  const isCanvasCopy = (groma) => {
    try {
      return window.parent !== window && window.parent.Groma === groma;
    } catch {
      return false;
    }
  };

  const start = (tries) => {
    const groma = window.Groma;
    if (!groma?.onEdits) {
      // Groma may load after this script: look for it for a few seconds.
      setTimeout(() => tries < 50 && start(tries + 1), 200);
      return;
    }
    if (isCanvasCopy(groma)) return;
    groma.onEdits(update);
    // The first report waits for the page to load, so its title is there.
    if (document.readyState === "complete") update(groma.edits());
    else addEventListener("load", () => update(groma.edits()));
    // A bridge started after the page, or restarted, learns the text when the window is used again.
    addEventListener("focus", () => (latest || failures >= MAX_FAILURES) && update(latest));
  };

  if (source) start(0);
})();
