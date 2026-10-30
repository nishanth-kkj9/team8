import type { DemoProfile } from "../types/auth";
import type { DocType, DocumentTypeStatus } from "../types/document";
import type { DocDeskStatus, DocRequest } from "../types/request";

/**
 * The service contract every DocDesk data operation goes through
 * (ARCHITECTURE.md §7.3). Phase 1 implements it with mock data; the later API
 * phase implements the same contract against the real CampusOS endpoints and
 * swaps the provider in `serviceProvider.ts`.
 */

export interface RequestFilters {
  status?: DocDeskStatus;
  doc_type_id?: string;
  /** true → only the viewer's own requests (mirrors the API's mine=true). */
  mine?: boolean;
}

export interface DocumentTypeFilters {
  status?: DocumentTypeStatus;
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

/** Demo stand-in for a file served by the future download endpoints. */
export interface DownloadableDemoFile {
  filename: string;
  content_type: string;
  size_bytes: number;
  blob: Blob;
}

/**
 * Machine-readable error so the UI can react to `error.code` instead of
 * parsing human-readable text (ARCHITECTURE.md §9.2).
 */
export class DocDeskServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "DocDeskServiceError";
    this.status = status;
    this.code = code;
  }
}

export interface DocDeskService {
  /**
   * Demo-layer concern: tells the mock service who is "signed in" so it can
   * scope data the way the real API would via the auth token. A real service
   * replaces this with token handling.
   */
  setViewer(profile: DemoProfile | null): void;

  listRequests(filters?: RequestFilters): Promise<DocRequest[]>;
  getRequest(requestId: string): Promise<DocRequest | null>;
  createRequest(input: CreateRequestInput): Promise<DocRequest>;
  updatePendingRequest(requestId: string, input: UpdateRequestInput): Promise<DocRequest>;
  withdrawPendingRequest(requestId: string): Promise<void>;
  answerRequest(requestId: string, input: AnswerRequestInput): Promise<DocRequest>;
  updateAnswer(requestId: string, input: UpdateAnswerInput): Promise<DocRequest>;
  withdrawAnswer(requestId: string): Promise<DocRequest>;
  acknowledgeRequest(requestId: string): Promise<DocRequest>;

  listDocumentTypes(filters?: DocumentTypeFilters): Promise<DocType[]>;
  createDocumentType(input: CreateDocTypeInput): Promise<DocType>;
  updateDocumentType(docTypeId: string, input: UpdateDocTypeInput): Promise<DocType>;
  deleteDocumentType(docTypeId: string): Promise<void>;

  setTat(requestId: string, input: TatInput): Promise<DocRequest>;
  setBulkTat(input: BulkTatInput): Promise<DocRequest[]>;

  downloadAnswerDocument(requestId: string): Promise<DownloadableDemoFile | null>;
  uploadFilledForm(requestId: string, file: File): Promise<DocRequest>;
  downloadFilledForm(requestId: string): Promise<DownloadableDemoFile | null>;
  removeFilledForm(requestId: string): Promise<DocRequest>;

  /** Demo-layer concern: restore the original seed data. */
  resetDemoData(): Promise<void>;
}
