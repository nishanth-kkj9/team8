import { Download, FileText, type LucideIcon } from "lucide-react";
import type { StoredFileMetadata } from "../../../types/document";
import { Button } from "../../../components/ui/Button";
import { fileKindLabel, formatFileSize } from "../../../lib/display";

interface FileMetadataCardProps {
  label: string;
  file: StoredFileMetadata;
  icon?: LucideIcon;
  onDownload?: () => void;
  downloading?: boolean;
}

/** Attachment card showing filename / type / size with a download action (§5B R5). */
export function FileMetadataCard({
  label,
  file,
  icon: Icon = FileText,
  onDownload,
  downloading = false,
}: FileMetadataCardProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-control border border-line bg-slate-50/60 px-3 py-2.5">
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-100 text-primary-700"
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-ink-800" title={file.filename}>
          {file.filename}
        </span>
        <span className="block text-xs text-ink-500">
          {label} · {fileKindLabel(file.content_type)} · {formatFileSize(file.size_bytes)}
        </span>
      </span>
      {onDownload ? (
        <Button variant="secondary" size="sm" onClick={onDownload} isLoading={downloading}>
          {!downloading && <Download aria-hidden className="h-3.5 w-3.5" />}
          Download
        </Button>
      ) : null}
    </div>
  );
}
