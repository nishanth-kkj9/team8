import type { DownloadableFile } from "../services/docDeskService.types";

/**
 * Triggers a browser download for a downloaded file blob with its authoritative filename.
 */
export function downloadFile(file: DownloadableFile): void {
  if (typeof window === "undefined" || !window.URL || !window.document) {
    return;
  }
  const url = URL.createObjectURL(file.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = file.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export const downloadDemoFile = downloadFile;
