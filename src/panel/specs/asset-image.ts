/** The Asset block's row for an `<img>`: a preview drawn from the pixels the page already loaded, its sizes, its address. */
import { h, layoutSize } from "../../dom";
import { mount } from "../../root";
import { downloadName, fileNameOf, ratioNote } from "../../specs/assets";
import { type AssetRow, createAssetRow, createCopyButton, createDownloadButton } from "./asset-rows";

/** The longest side of the preview. */
const PREVIEW_PX = 48;

/** The image drawn small on a canvas: from the page's own decoded pixels, so nothing is fetched. */
function createPreview(image: HTMLImageElement): HTMLElement | undefined {
  const { naturalWidth, naturalHeight } = image;
  if (!naturalWidth || !naturalHeight) return undefined;
  const scale = PREVIEW_PX / Math.max(naturalWidth, naturalHeight);
  const canvas = h("canvas");
  canvas.width = Math.max(1, Math.round(naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(naturalHeight * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  const frame = h("div", "asset-preview");
  frame.appendChild(canvas);
  return frame;
}

/** "1200 × 800 shown at 300 × 200 · 2×", the shown size in board pixels. */
function sizeText(image: HTMLImageElement): string {
  const shown = layoutSize(image, image.getBoundingClientRect());
  const natural = { width: image.naturalWidth, height: image.naturalHeight };
  const note = ratioNote({ natural, shown });
  const head = natural.width ? `${natural.width} × ${natural.height} shown at` : "shown at";
  return `${head} ${shown.width} × ${shown.height}${note ? ` · ${note}` : ""}`;
}

/** The anchor lives in the inspector for the click, then goes. A cross-origin file may open instead of saving. */
function download(url: string): void {
  const anchor = mount(h("a"));
  anchor.href = url;
  anchor.download = downloadName(url);
  anchor.click();
  anchor.remove();
}

export function createImageRow(image: HTMLImageElement): HTMLElement {
  const url = image.currentSrc;
  const row: AssetRow = {
    name: fileNameOf(url),
    size: sizeText(image),
    preview: createPreview(image),
    actions: [
      createCopyButton({ action: "copy-address", label: "Copy address", text: () => url }),
      createDownloadButton(() => download(url)),
    ],
  };
  return createAssetRow(row);
}
