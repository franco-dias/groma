/** The rows of the Asset block: a file's preview, its name, how big it is, and what can be done with it. */
import { h } from "../../dom";
import { icon } from "../../icons";
import { copyOnClick } from "../copy";

/** What a row shows: a name, a line about the size, a preview, and its buttons. */
export type AssetRow = { name: string; size?: string; preview?: HTMLElement; actions: HTMLElement[] };

export function createAssetRow({ name, size, preview, actions }: AssetRow): HTMLElement {
  const row = h("div", "asset-row");
  const info = h("div", "asset-info");
  info.append(h("span", "asset-name", name));
  if (size) info.append(h("span", "asset-size", size));
  const buttons = info.appendChild(h("div", "asset-actions"));
  buttons.append(...actions);
  row.append(...(preview ? [preview] : []), info);
  return row;
}

/** A button of a row, with its icon. */
function createButton({
  action,
  label,
  iconName,
}: {
  action: string;
  label: string;
  iconName: "copy" | "download";
}) {
  const button = h("button", "ghost-button");
  button.dataset.action = action;
  button.append(icon(iconName, 12), label);
  return button;
}

/** A button that copies `text()` when clicked. */
export function createCopyButton(copy: { action: string; label: string; text: () => string }): HTMLElement {
  const { action, label, text } = copy;
  return copyOnClick(createButton({ action, label, iconName: "copy" }), text);
}

/** A button that runs `run` when clicked. */
export function createDownloadButton(run: () => void): HTMLElement {
  const button = createButton({ action: "download", label: "Download", iconName: "download" });
  button.addEventListener("click", run);
  return button;
}
