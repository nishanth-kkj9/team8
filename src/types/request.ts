import type { RequesterRole } from "./auth";
import type { StoredFileMetadata } from "./document";

/**
 * The only valid DocDesk request statuses (ARCHITECTURE.md §0.5).
 * Never introduce approved / rejected / under_processing / document_ready.
 */
export type DocDeskStatus = "pending" | "answered" | "acknowledged";

export interface RequestTat {
  /** Date-only string, YYYY-MM-DD. */
  expected_by: string;
  note?: string;
  updated_by?: string;
  updated_at?: string;
}

export interface RequestAnswer {
  message: string;
  answered_by?: string;
  answered_by_name?: string;
  answered_at?: string;
  updated_at?: string;
}

export interface DocRequest {
  request_id: string;
  doc_type_id: string;
  doc_type_name: string;
  reason: string;
  status: DocDeskStatus;
  tat?: RequestTat;
  answer?: RequestAnswer;
  document?: StoredFileMetadata;
  filled_form?: StoredFileMetadata;
  acknowledged_at?: string;
  /** The requester's email — used as the ownership key in demo filtering. */
  requested_by: string;
  requested_by_name?: string;
  requested_by_role?: RequesterRole;
  requested_by_dept?: string;
  requested_by_phone_number?: string;
  created_at: string;
  updated_at: string;
}

export const DOCDESK_STATUSES: readonly DocDeskStatus[] = [
  "pending",
  "answered",
  "acknowledged",
];

export const STATUS_LABELS: Record<DocDeskStatus, string> = {
  pending: "Pending",
  answered: "Answered",
  acknowledged: "Acknowledged",
};
