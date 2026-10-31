import type { DownloadableDemoFile } from "../services/docDeskService.types";

/**
 * Trigger a browser download for a demo file blob (??5A R5, ??8.3).
 * In the API phase, downloads will be served by the authenticated
 * `GET /requests/{id}/document` and `/filled-form` endpoints instead.
 */
export function downloadDemoFile(file: DownloadableDemoFile): void {
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
