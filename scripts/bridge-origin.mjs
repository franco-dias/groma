/**
 * Which web pages may hand edits to the bridge, and which Host names reach it.
 *
 * Any web site can make your browser send a request to localhost, so the
 * bridge answers only pages served from this machine, plus the origins the
 * user allowed with `--allow-origin`. Without this, any site could put text
 * in front of a coding agent.
 */

const parse = (value) => {
  try {
    return new URL(value);
  } catch {
    return undefined;
  }
};

/** localhost, 127.0.0.1, [::1] and any name under .localhost. */
export const isLocalHostname = (hostname) =>
  hostname === "localhost" ||
  hostname.endsWith(".localhost") ||
  hostname === "127.0.0.1" ||
  hostname === "[::1]";

/** "https://staging.example.com/app" → "https://staging.example.com"; undefined for anything that is not an origin. */
export const normalizeOrigin = (value) => {
  const url = parse(value);
  return url && url.origin !== "null" ? url.origin : undefined;
};

/**
 * Whether a page with this `Origin` header may post. "null" is what a
 * file:// page sends (a sandboxed frame of a web site sends it too: see the
 * limits in docs/usage.md).
 */
export function isAllowedOrigin(origin, allowed = []) {
  if (origin === "null") return true;
  const url = parse(origin);
  if (!url || url.origin !== origin) return false;
  return isLocalHostname(url.hostname) || allowed.includes(origin);
}

/** Whether a `Host` header names this machine: a page that reaches the bridge through another name (DNS rebinding) is turned away. */
export function isLocalHost(host = "") {
  const url = parse("http://" + host);
  const isPlain = url && !url.username && !url.password && url.pathname === "/" && !url.search;
  return Boolean(isPlain) && isLocalHostname(url.hostname);
}
