/** How the bridge writes the pages it heard from as plain text, for `GET /__groma/edits.txt` and the MCP tools. */

/** The lines that say which page a text is from, and when it came. */
export const pageHeader = ({ page, title, receivedAt }) =>
  [`Page: ${page}`, ...(title ? [`Title: ${title}`] : []), `Received: ${receivedAt}`].join("\n");

/** Every page that has edits, each under its header. Empty when none has. */
export const pagesText = (pages) =>
  pages
    .filter(({ text }) => text)
    .map((report) => `${pageHeader(report)}\n\n${report.text}`)
    .join("\n---\n\n");
