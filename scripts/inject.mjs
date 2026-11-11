/**
 * Adds the inspector's script tag to a page's HTML, without changing
 * anything else in it.
 */

/**
 * @param {string} html      The page.
 * @param {object} script
 * @param {string} script.src  Where the inspector script is served from.
 * @param {Record<string, string | undefined>} [script.settings]
 *   Settings for the script tag: `copy` becomes `data-copy`, and so on.
 * @returns {string} The page with the tag as the first thing in `<head>`, so
 *   the inspector is there before the page's own scripts run. A page with
 *   no `<head>` gets the tag at the very start.
 */
export function withInspector(html, { src, settings = {} }) {
  const attributes = Object.entries(settings)
    .filter(([, value]) => value !== undefined)
    .map(([name, value]) => ` data-${name}="${escapeAttribute(value)}"`)
    .join("");
  const tag = `<script src="${src}"${attributes}></script>`;
  const head = /<head[^>]*>/i.exec(html);
  if (!head) return tag + html;
  const at = head.index + head[0].length;
  return html.slice(0, at) + tag + html.slice(at);
}

const escapeAttribute = (value) => String(value).replaceAll("&", "&amp;").replaceAll('"', "&quot;");
