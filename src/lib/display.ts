import type { DemoProfile } from "../types/auth";
import { ROLE_LABELS } from "../types/auth";

/** Two-letter initials for avatars. */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/** Show only the two DocDesk account types: Student and Admin. */
export function roleLine(profile: DemoProfile): string {
  const label = ROLE_LABELS[profile.role];
  if (profile.role !== "student") return label;
  return profile.usn ? `${label} · ${profile.usn}` : label;
}

const FILE_KINDS: Record<string, string> = {
  "application/pdf": "PDF document",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    "Word document",
  "image/jpeg": "JPEG image",
  "image/png": "PNG image",
  "text/plain": "Text file",
};

/** Human label for a stored file's content type (??5A R5: show type/size). */
export function fileKindLabel(contentType: string): string {
  return FILE_KINDS[contentType] ?? contentType;
}

/** "184 KB", "1.2 MB" ??? sizes in file metadata cards. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
