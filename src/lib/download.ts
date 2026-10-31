import type { DownloadableDemoFile } from "../services/docDeskService.types";

/**
 * Trigger a browser download for a file returned by the authenticated CampusOS
 * binary download endpoints.
 */
export function downloadFile(file: DownloadableDemoFile): void {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
