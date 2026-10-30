/**
 * Client-side validation limits and file rules, mirroring the CampusOS API
 * contract (ARCHITECTURE.md §8.3, §9.1). Keep these in sync with the API.
 */
import { todayDateOnly } from "./date";

export const LIMITS = {
  reasonMin: 5,
  reasonMax: 1000,
  answerMessageMin: 1,
  answerMessageMax: 2000,
  docTypeNameMin: 3,
  docTypeNameMax: 80,
  maxFileBytes: 10 * 1024 * 1024, // 10 MB
  bulkTatMin: 1,
  bulkTatMax: 100,
} as const;

/** Answer documents: PDF or Word .docx. */
const ANSWER_DOCUMENT_RULES: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
};

/** Filled-in forms: PDF, Word .docx, JPEG or PNG. */
const FILLED_FORM_RULES: Record<string, string> = {
  ...ANSWER_DOCUMENT_RULES,
  "image/jpeg": ".jpg",
  "image/png": ".png",
};

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function fileExtension(filename: string): string {
  const index = filename.lastIndexOf(".");
  return index === -1 ? "" : filename.slice(index).toLowerCase();
}

function formatBytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

function checkFile(
  file: File,
  rules: Record<string, string>,
  label: string,
): string | null {
  if (file.size > LIMITS.maxFileBytes) {
    return `${label} must be 10 MB or smaller (selected file is ${formatBytes(file.size)}).`;
  }
  const typeOk = file.type in rules;
  const extOk = Object.values(rules).includes(fileExtension(file.name));
  if (!typeOk && !extOk) {
    const allowed = Object.values(rules).join(", ");
    return `${label} must be one of: ${allowed}.`;
  }
  return null;
}

/** Returns an error message, or null when the answer document is acceptable. */
export function validateAnswerFile(file: File): string | null {
  return checkFile(file, ANSWER_DOCUMENT_RULES, "Answer document");
}

/** Returns an error message, or null when the filled-in form is acceptable. */
export function validateFilledFormFile(file: File): string | null {
  return checkFile(file, FILLED_FORM_RULES, "Filled-in form");
}

/** TAT dates must be YYYY-MM-DD and not before today (Asia/Kolkata). */
export function validateTatDate(expectedBy: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expectedBy)) {
    return "Expected-by date must use the YYYY-MM-DD format.";
  }
  if (expectedBy < todayDateOnly()) {
    return "Expected-by date cannot be before today.";
  }
  return null;
}

export function validateReason(reason: string): string | null {
  const trimmed = reason.trim();
  if (trimmed.length < LIMITS.reasonMin) {
    return `Reason must be at least ${LIMITS.reasonMin} characters.`;
  }
  if (trimmed.length > LIMITS.reasonMax) {
    return `Reason must be at most ${LIMITS.reasonMax} characters.`;
  }
  return null;
}

export function validateDocTypeName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < LIMITS.docTypeNameMin || trimmed.length > LIMITS.docTypeNameMax) {
    return `Name must be ${LIMITS.docTypeNameMin}–${LIMITS.docTypeNameMax} characters.`;
  }
  return null;
}
