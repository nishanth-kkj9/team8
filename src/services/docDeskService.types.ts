import type { DemoProfile } from "../types/auth";
import type { DocType, DocumentTypeStatus } from "../types/document";
import type { DocDeskStatus, DocRequest } from "../types/request";

/**
 * Standard paginated response envelope from CampusOS APIs.
 */
export interface PaginatedResponse<T> {
  items: T[];
  count: number;
  next_cursor: string | null;
}

/** API-shaped error retained by the isolated legacy mock used in service tests. */
export class DocDeskServiceError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "DocDeskServiceError";
  }
}

export interface RequestFilters {
  status?: DocDeskStatus;
  doc_type_id?: string;
  /** true -> only the viewer's own requests (mirrors API query mine=true). */
  mine?: boolean;
  limit?: number;
  cursor?: string;
}

export interface DocumentTypeFilters {
  status?: DocumentTypeStatus;
  limit?: number;
  cursor?: string;
}

export interface CreateRequestInput {
  doc_type_id: string;
  reason: string;
}

export interface UpdateRequestInput {
  doc_type_id?: string;
  reason?: string;
}

export interface AnswerRequestInput {
  message: string;
  document?: File | null;
}

export interface UpdateAnswerInput {
  message?: string;
  document?: File | null;
  remove_document?: boolean;
}

export interface TatInput {
  /** Date-only string YYYY-MM-DD; cannot be before today. */
  expected_by: string;
  note?: string;
}

export interface BulkTatInput {
  request_ids: string[];
  expected_by: string;
  note?: string;
}

export interface CreateDocTypeInput {
  name: string;
  description?: string;
}

export interface UpdateDocTypeInput {
  name?: string;
  description?: string;
  status?: DocumentTypeStatus;
}

/** Binary download payload from authenticated document endpoints. */
export interface DownloadableFile {
  filename: string;
  content_type: string;
  size_bytes: number;
  blob: Blob;
}

export type DownloadableDemoFile = DownloadableFile;

/**
 * Service contract for all DocDesk data operations against CampusOS API endpoints.
 */
export interface DocDeskService {
  setViewer(profile: DemoProfile | null): void;
  getViewer(): DemoProfile | null;

  // Requests
  listRequests(filters?: RequestFilters): Promise<PaginatedResponse<DocRequest>>;
  getRequest(requestId: string): Promise<DocRequest | null>;
  createRequest(input: CreateRequestInput): Promise<DocRequest>;
  updatePendingRequest(requestId: string, input: UpdateRequestInput): Promise<DocRequest>;
  withdrawPendingRequest(requestId: string): Promise<void>;
  answerRequest(requestId: string, input: AnswerRequestInput): Promise<DocRequest>;
  updateAnswer(requestId: string, input: UpdateAnswerInput): Promise<DocRequest>;
  withdrawAnswer(requestId: string): Promise<DocRequest>;
  acknowledgeRequest(requestId: string): Promise<DocRequest>;

  // Document types
  listDocumentTypes(filters?: DocumentTypeFilters): Promise<PaginatedResponse<DocType>>;
  getDocumentType(docTypeId: string): Promise<DocType | null>;
  createDocumentType(input: CreateDocTypeInput): Promise<DocType>;
  updateDocumentType(docTypeId: string, input: UpdateDocTypeInput): Promise<DocType>;
  deleteDocumentType(docTypeId: string): Promise<void>;

  // Turnaround time (TAT)
  setTat(requestId: string, input: TatInput): Promise<DocRequest>;
  setBulkTat(input: BulkTatInput): Promise<DocRequest[]>;

  // Files
  downloadAnswerDocument(requestId: string): Promise<DownloadableFile | null>;
  uploadFilledForm(requestId: string, file: File): Promise<DocRequest>;
  downloadFilledForm(requestId: string): Promise<DownloadableFile | null>;
  removeFilledForm(requestId: string): Promise<DocRequest>;
}
