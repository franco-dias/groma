/**
 * The latest version of gromajs, from npm, every time the page loads.
 *
 * The page is built with the version that was latest at build time (in the
 * markup, and as window.__gromaVersion). Here npm is asked again, and if a newer
 * one is out (never an older one), every place that shows the version is updated: the pill, the
 * script tag to copy, the copy button. Groma itself, which runs on this page,
 * is then loaded at that version from the CDN.
 */
(function () {
  const built = window.__gromaVersion;

  /** True when version a is after b: npm's cache can answer with an older one for a few minutes. */
  const newer = (a, b) => {
    const [x, y] = [a, b].map((v) => v.split(".").map(Number));
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  };

  function show(version) {
    window.__gromaVersion = version;
    for (const el of document.querySelectorAll("[data-version]")) el.textContent = version;
    for (const el of document.querySelectorAll('[data-component="VersionPill"]')) {
      try {
        el.setAttribute("data-props", JSON.stringify({ ...JSON.parse(el.getAttribute("data-props")), version }));
      } catch {
        // Props that are not JSON: leave them.
      }
    }
  }

  function runGroma(version) {
    const script = document.createElement("script");
    script.src = `https://cdn.jsdelivr.net/npm/gromajs@${version}/dist/groma.js`;
    script.setAttribute("data-groma", "");
    document.body.appendChild(script);
  }

  // npm answers in well under a second; past that, the page goes on with the built version.
  const late = new Promise((resolve) => setTimeout(() => resolve(built), 2500));
  const latest = fetch("https://registry.npmjs.org/gromajs/latest")
    .then((response) => (response.ok ? response.json() : null))
    .then((data) => (data && /^\d+\.\d+\.\d+$/.test(data.version) && newer(data.version, built) ? data.version : built))
    .catch(() => built);

  Promise.race([latest, late]).then((version) => {
    if (version !== built) show(version);
    runGroma(version);
  });
})();
