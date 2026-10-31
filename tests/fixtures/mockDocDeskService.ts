import type { RequesterRole } from "../../src/types/auth";
import type { DocType, StoredFileMetadata } from "../../src/types/document";
import type { DocRequest } from "../../src/types/request";
import { buildSeedRequests } from "./seedRequests";
import { buildSeedDocumentTypes } from "./seedDocumentTypes";
import {
  canViewAllRequests,
  isStudentAffairs,
} from "../../src/lib/permissions";
import {
  LIMITS,
  validateAnswerFile,
  validateFilledFormFile,
  validateReason,
  validateDocTypeName,
  validateTatDate,
} from "../../src/lib/validation";
import {
  DocDeskServiceError,
  type AnswerRequestInput,
  type BulkTatInput,
  type CreateDocTypeInput,
  type CreateRequestInput,
  type DocumentTypeFilters,
  type DownloadableDemoFile,
  type RequestFilters,
  type TatInput,
  type UpdateAnswerInput,
  type UpdateDocTypeInput,
  type UpdateRequestInput,
} from "../../src/services/docDeskService.types";
import type { DemoProfile } from "../../src/types/auth";

/*
 * Mock implementation of the DocDeskService contract.
 *
 * - Persisted to localStorage (metadata only ??? never raw File blobs).
 * - Scoped by the current demo viewer, mirroring the API's token-based
 *   visibility: requesters see their own requests, SA/Admin see all.
 * - Throws DocDeskServiceError with API-like codes so the UI can learn to
 *   react to error.code (??9.2).
 */

const STORAGE_KEY_REQUESTS = "docdesk.demo.requests.v1";
const STORAGE_KEY_DOC_TYPES = "docdesk.demo.doc-types.v1";
const STORAGE_KEY_SEED_VERSION = "docdesk.demo.seed-version.v1";
const SEED_VERSION = "1";

/** Brief latency so async states behave realistically without artificial delays. */
const MOCK_LATENCY_MS = 120;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class MockDocDeskService {
  private viewer: DemoProfile | null = null;
  private requests: DocRequest[] = [];
  private docTypes: DocType[] = [];
  private loaded = false;

  /** Session-only object URLs (never persisted to localStorage). */
  private readonly sessionFileUrls = new Map<string, string>();

  setViewer(profile: DemoProfile | null): void {
    this.viewer = profile;
  }

  // ---------------------------------------------------------------- storage

  private ensureLoaded(): void {
    if (this.loaded) return;
    const version = localStorage.getItem(STORAGE_KEY_SEED_VERSION);
    const storedRequests = localStorage.getItem(STORAGE_KEY_REQUESTS);
    const storedDocTypes = localStorage.getItem(STORAGE_KEY_DOC_TYPES);
    if (version === SEED_VERSION && storedRequests && storedDocTypes) {
      try {
        this.requests = JSON.parse(storedRequests) as DocRequest[];
        this.docTypes = JSON.parse(storedDocTypes) as DocType[];
        this.loaded = true;
        return;
      } catch {
        // Corrupt storage ??? fall through and reseed.
      }
    }
    this.reseed();
  }

  private reseed(): void {
    this.requests = buildSeedRequests();
    this.docTypes = buildSeedDocumentTypes();
    this.persist();
    this.loaded = true;
  }

  private persist(): void {
    // Object URLs die with the session, so they are never persisted ??? metadata
    // only (??7.2: no raw file blobs in localStorage; URLs are re-created by
    // upload and downloads are served through demoDownload()).
    const stripUrls = (request: DocRequest): DocRequest => ({
      ...request,
      document: request.document
        ? { ...request.document, url: undefined }
        : undefined,
      filled_form: request.filled_form
        ? { ...request.filled_form, url: undefined }
        : undefined,
    });
    localStorage.setItem(
      STORAGE_KEY_REQUESTS,
      JSON.stringify(this.requests.map(stripUrls)),
    );
    localStorage.setItem(STORAGE_KEY_DOC_TYPES, JSON.stringify(this.docTypes));
    localStorage.setItem(STORAGE_KEY_SEED_VERSION, SEED_VERSION);
  }

  async resetDemoData(): Promise<void> {
    await delay(MOCK_LATENCY_MS);
    this.sessionFileUrls.clear();
    this.reseed();
  }

  // ---------------------------------------------------------------- helpers

  private requireViewer(): DemoProfile {
    if (!this.viewer) {
      throw new DocDeskServiceError(
        401,
        "UNAUTHENTICATED",
        "Sign in before using DocDesk.",
      );
    }
    return this.viewer;
  }

  private findRequest(requestId: string): DocRequest {
    this.ensureLoaded();
    const request = this.requests.find((r) => r.request_id === requestId);
    if (!request) {
      throw new DocDeskServiceError(
        404,
        "NOT_FOUND",
        `Request ${requestId} was not found.`,
      );
    }
    return request;
  }

  /** Visibility mirrors the API: SA/Admin can view all, requesters only their own. */
  private assertCanView(request: DocRequest): void {
    const viewer = this.requireViewer();
    if (canViewAllRequests(viewer)) return;
    if (request.requested_by !== viewer.email_id) {
      throw new DocDeskServiceError(
        404,
        "NOT_FOUND",
        `Request ${request.request_id} was not found.`,
      );
    }
  }

  private nextRequestId(): string {
    const numbers = this.requests
      .map((r) => Number.parseInt(r.request_id.replace(/^DRQ-/, ""), 10))
      .filter((n) => Number.isFinite(n));
    const next = (numbers.length > 0 ? Math.max(...numbers) : 1000) + 1;
    return `DRQ-${next}`;
  }

  /** Mock IDs are generated here, inside the service, so they can be removed at API integration (??6). */
  private fileToMetadata(file: File): StoredFileMetadata {
    const file_id = `file-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    const url = URL.createObjectURL(file);
    this.sessionFileUrls.set(file_id, url);
    return {
      file_id,
      filename: file.name,
      content_type: file.type || "application/octet-stream",
      size_bytes: file.size,
      url,
    };
  }

  private touch(request: DocRequest, patch: Partial<DocRequest>): DocRequest {
    const updated: DocRequest = {
      ...request,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    this.requests = this.requests.map((r) =>
      r.request_id === updated.request_id ? updated : r,
    );
    this.persist();
    return { ...updated };
  }

  private demoDownload(
    request: DocRequest,
    file: StoredFileMetadata,
  ): DownloadableDemoFile {
    // Object URLs die with the session; downloads always serve a clearly
    // labelled demo placeholder instead of pretending to be the real file.
    const text = [
      "DocDesk demo file placeholder",
      "==============================",
      `Request:     ${request.request_id}`,
      `File:        ${file.filename}`,
      `Content:     ${file.content_type}`,
      `Size:        ${file.size_bytes} bytes`,
      "",
      "This is a frontend-only demo build. During API integration the real",
      "file will be served by the authenticated download endpoints:",
      "  GET /api/v1/docdesk/requests/{id}/document",
      "  GET /api/v1/docdesk/requests/{id}/filled-form",
    ].join("\n");
    return {
      filename: `${file.filename}.demo.txt`,
      content_type: "text/plain",
      size_bytes: text.length,
      blob: new Blob([text], { type: "text/plain" }),
    };
  }

  // --------------------------------------------------------------- requests

  async listRequests(filters: RequestFilters = {}): Promise<DocRequest[]> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    this.ensureLoaded();
    let scoped = canViewAllRequests(viewer)
      ? [...this.requests]
      : this.requests.filter((r) => r.requested_by === viewer.email_id);
    if (filters.status) {
      scoped = scoped.filter((r) => r.status === filters.status);
    }
    if (filters.doc_type_id) {
      scoped = scoped.filter((r) => r.doc_type_id === filters.doc_type_id);
    }
    // Lists are newest-first (API behaviour, ??8.3).
    return [...scoped].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  async getRequest(requestId: string): Promise<DocRequest | null> {
    await delay(MOCK_LATENCY_MS);
    try {
      const request = this.findRequest(requestId);
      this.assertCanView(request);
      return { ...request };
    } catch (error) {
      if (
        error instanceof DocDeskServiceError &&
        (error.status === 404 || error.status === 401)
      ) {
        return null;
      }
      throw error;
    }
  }

  async createRequest(input: CreateRequestInput): Promise<DocRequest> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    if (viewer.role === "admin") {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Admin is read-only in DocDesk.",
      );
    }
    const reasonError = validateReason(input.reason);
    if (reasonError) {
      throw new DocDeskServiceError(422, "VALIDATION_ERROR", reasonError);
    }
    this.ensureLoaded();
    const docType = this.docTypes.find(
      (t) => t.doc_type_id === input.doc_type_id,
    );
    if (!docType) {
      throw new DocDeskServiceError(404, "NOT_FOUND", "Document type not found.");
    }
    if (docType.status !== "active") {
      throw new DocDeskServiceError(
        409,
        "DOC_TYPE_ARCHIVED",
        `"${docType.name}" is archived and cannot be requested.`,
      );
    }
    const now = new Date().toISOString();
    const request: DocRequest = {
      request_id: this.nextRequestId(),
      doc_type_id: docType.doc_type_id,
      doc_type_name: docType.name,
      reason: input.reason.trim(),
      status: "pending",
      requested_by: viewer.email_id,
      requested_by_name: viewer.name,
      requested_by_role: viewer.role as RequesterRole, // admin already rejected above
      requested_by_dept: viewer.dept,
      requested_by_phone_number: viewer.phone_number,
      created_at: now,
      updated_at: now,
    };
    this.requests = [request, ...this.requests];
    this.persist();
    return { ...request };
  }

  async updatePendingRequest(
    requestId: string,
    input: UpdateRequestInput,
  ): Promise<DocRequest> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    const request = this.findRequest(requestId);
    if (request.requested_by !== viewer.email_id) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "You can only edit your own requests.",
      );
    }
    if (request.status !== "pending") {
      throw new DocDeskServiceError(
        409,
        "REQUEST_NOT_PENDING",
        "Only pending requests can be edited.",
      );
    }
    const patch: Partial<DocRequest> = {};
    if (input.reason !== undefined) {
      const reasonError = validateReason(input.reason);
      if (reasonError) {
        throw new DocDeskServiceError(422, "VALIDATION_ERROR", reasonError);
      }
      patch.reason = input.reason.trim();
    }
    if (input.doc_type_id !== undefined && input.doc_type_id !== request.doc_type_id) {
      this.ensureLoaded();
      const docType = this.docTypes.find(
        (t) => t.doc_type_id === input.doc_type_id,
      );
      if (!docType) {
        throw new DocDeskServiceError(404, "NOT_FOUND", "Document type not found.");
      }
      if (docType.status !== "active") {
        throw new DocDeskServiceError(
          409,
          "DOC_TYPE_ARCHIVED",
          `"${docType.name}" is archived and cannot be requested.`,
        );
      }
      patch.doc_type_id = docType.doc_type_id;
      patch.doc_type_name = docType.name;
    }
    return this.touch(request, patch);
  }

  async withdrawPendingRequest(requestId: string): Promise<void> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    const request = this.findRequest(requestId);
    if (request.requested_by !== viewer.email_id) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "You can only withdraw your own requests.",
      );
    }
    if (request.status !== "pending") {
      throw new DocDeskServiceError(
        409,
        "REQUEST_NOT_PENDING",
        "Only pending requests can be withdrawn.",
      );
    }
    // The API's DELETE withdraws the request; no "withdrawn" status exists.
    this.requests = this.requests.filter((r) => r.request_id !== requestId);
    this.persist();
  }

  // ---------------------------------------------------------------- answers

  async answerRequest(
    requestId: string,
    input: AnswerRequestInput,
  ): Promise<DocRequest> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    if (!isStudentAffairs(viewer)) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only Student Affairs can answer requests.",
      );
    }
    const request = this.findRequest(requestId);
    if (request.status === "answered") {
      throw new DocDeskServiceError(
        409,
        "ALREADY_ANSWERED",
        "This request already has an answer. Edit or withdraw it instead.",
      );
    }
    if (request.status !== "pending") {
      throw new DocDeskServiceError(
        409,
        "ALREADY_ACKNOWLEDGED",
        "Acknowledged requests cannot be answered.",
      );
    }
    const message = input.message.trim();
    if (
      message.length < LIMITS.answerMessageMin ||
      message.length > LIMITS.answerMessageMax
    ) {
      throw new DocDeskServiceError(
        422,
        "VALIDATION_ERROR",
        `Answer message must be ${LIMITS.answerMessageMin}–${LIMITS.answerMessageMax} characters.`,
      );
    }
    if (input.document) {
      const fileError = validateAnswerFile(input.document);
      if (fileError) {
        throw new DocDeskServiceError(422, "VALIDATION_ERROR", fileError);
      }
    }
    const now = new Date().toISOString();
    return this.touch(request, {
      status: "answered",
      answer: {
        message,
        answered_by: viewer.email_id,
        answered_by_name: viewer.name,
        answered_at: now,
      },
      document: input.document ? this.fileToMetadata(input.document) : undefined,
    });
  }

  async updateAnswer(
    requestId: string,
    input: UpdateAnswerInput,
  ): Promise<DocRequest> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    if (!isStudentAffairs(viewer)) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only Student Affairs can edit answers.",
      );
    }
    const request = this.findRequest(requestId);
    if (request.status === "pending" || !request.answer) {
      throw new DocDeskServiceError(
        409,
        "NOT_ANSWERED",
        "This request has no answer to edit yet.",
      );
    }
    if (request.status === "acknowledged") {
      throw new DocDeskServiceError(
        409,
        "ALREADY_ACKNOWLEDGED",
        "Acknowledged requests can no longer be changed.",
      );
    }
    const patch: Partial<DocRequest> = {
      answer: {
        ...request.answer,
        updated_at: new Date().toISOString(),
      },
    };
    if (input.message !== undefined) {
      const message = input.message.trim();
      if (
        message.length < LIMITS.answerMessageMin ||
        message.length > LIMITS.answerMessageMax
      ) {
        throw new DocDeskServiceError(
          422,
          "VALIDATION_ERROR",
          `Answer message must be ${LIMITS.answerMessageMin}–${LIMITS.answerMessageMax} characters.`,
        );
      }
      patch.answer = { ...patch.answer, message };
    }
    if (input.remove_document) {
      patch.document = undefined;
    } else if (input.document) {
      const fileError = validateAnswerFile(input.document);
      if (fileError) {
        throw new DocDeskServiceError(422, "VALIDATION_ERROR", fileError);
      }
      patch.document = this.fileToMetadata(input.document);
    }
    return this.touch(request, patch);
  }

  async withdrawAnswer(requestId: string): Promise<DocRequest> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    if (!isStudentAffairs(viewer)) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only Student Affairs can withdraw answers.",
      );
    }
    const request = this.findRequest(requestId);
    if (request.status === "pending" || !request.answer) {
      throw new DocDeskServiceError(
        409,
        "NOT_ANSWERED",
        "This request has no answer to withdraw.",
      );
    }
    if (request.status === "acknowledged") {
      throw new DocDeskServiceError(
        409,
        "ALREADY_ACKNOWLEDGED",
        "Acknowledged requests can no longer be changed.",
      );
    }
    // Withdrawing an answer returns the request to pending and removes the
    // answer, its document and any filled-in form (??2.2).
    return this.touch(request, {
      status: "pending",
      answer: undefined,
      document: undefined,
      filled_form: undefined,
    });
  }

  async acknowledgeRequest(requestId: string): Promise<DocRequest> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    const request = this.findRequest(requestId);
    if (request.requested_by !== viewer.email_id) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only the requester can acknowledge this request.",
      );
    }
    if (request.status === "pending") {
      throw new DocDeskServiceError(
        409,
        "NOT_ANSWERED",
        "Only answered requests can be acknowledged.",
      );
    }
    if (request.status === "acknowledged") {
      throw new DocDeskServiceError(
        409,
        "ALREADY_ACKNOWLEDGED",
        "This request is already acknowledged.",
      );
    }
    const now = new Date().toISOString();
    return this.touch(request, {
      status: "acknowledged",
      acknowledged_at: now,
    });
  }

  // ----------------------------------------------------------- doc types

  async listDocumentTypes(
    filters: DocumentTypeFilters = {},
  ): Promise<DocType[]> {
    await delay(MOCK_LATENCY_MS);
    this.requireViewer();
    this.ensureLoaded();
    let list = [...this.docTypes];
    if (filters.status) {
      list = list.filter((t) => t.status === filters.status);
    }
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createDocumentType(input: CreateDocTypeInput): Promise<DocType> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    if (!isStudentAffairs(viewer)) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only Student Affairs can manage document types.",
      );
    }
    this.ensureLoaded();
    const nameError = validateDocTypeName(input.name);
    if (nameError) {
      throw new DocDeskServiceError(422, "VALIDATION_ERROR", nameError);
    }
    const name = input.name.trim();
    if (
      this.docTypes.some((t) => t.name.toLowerCase() === name.toLowerCase())
    ) {
      throw new DocDeskServiceError(
        409,
        "ALREADY_EXISTS",
        `A document type named "${name}" already exists.`,
      );
    }
    const now = new Date().toISOString();
    const docType: DocType = {
      doc_type_id: `dt-${Date.now().toString(36)}`,
      name,
      description: input.description?.trim() || undefined,
      status: "active",
      created_by: viewer.name,
      created_at: now,
      updated_at: now,
    };
    this.docTypes = [...this.docTypes, docType];
    this.persist();
    return { ...docType };
  }

  async updateDocumentType(
    docTypeId: string,
    input: UpdateDocTypeInput,
  ): Promise<DocType> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    if (!isStudentAffairs(viewer)) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only Student Affairs can manage document types.",
      );
    }
    this.ensureLoaded();
    const docType = this.docTypes.find((t) => t.doc_type_id === docTypeId);
    if (!docType) {
      throw new DocDeskServiceError(404, "NOT_FOUND", "Document type not found.");
    }
    const patch: Partial<DocType> = {};
    if (input.name !== undefined) {
      const nameError = validateDocTypeName(input.name);
      if (nameError) {
        throw new DocDeskServiceError(422, "VALIDATION_ERROR", nameError);
      }
      const name = input.name.trim();
      if (
        this.docTypes.some(
          (t) =>
            t.doc_type_id !== docTypeId &&
            t.name.toLowerCase() === name.toLowerCase(),
        )
      ) {
        throw new DocDeskServiceError(
          409,
          "ALREADY_EXISTS",
          `A document type named "${name}" already exists.`,
        );
      }
      patch.name = name;
    }
    if (input.description !== undefined) {
      patch.description = input.description.trim() || undefined;
    }
    if (input.status !== undefined) {
      patch.status = input.status;
    }
    const updated: DocType = {
      ...docType,
      ...patch,
      updated_at: new Date().toISOString(),
    };
    this.docTypes = this.docTypes.map((t) =>
      t.doc_type_id === docTypeId ? updated : t,
    );
    this.persist();
    return { ...updated };
  }

  async deleteDocumentType(docTypeId: string): Promise<void> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    if (!isStudentAffairs(viewer)) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only Student Affairs can manage document types.",
      );
    }
    this.ensureLoaded();
    if (!this.docTypes.some((t) => t.doc_type_id === docTypeId)) {
      throw new DocDeskServiceError(404, "NOT_FOUND", "Document type not found.");
    }
    this.docTypes = this.docTypes.filter((t) => t.doc_type_id !== docTypeId);
    this.persist();
  }

  // ------------------------------------------------------------------ TAT

  async setTat(requestId: string, input: TatInput): Promise<DocRequest> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    if (!isStudentAffairs(viewer)) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only Student Affairs can set turnaround time.",
      );
    }
    const request = this.findRequest(requestId);
    if (request.status !== "pending") {
      throw new DocDeskServiceError(
        409,
        "REQUEST_NOT_PENDING",
        "TAT can only be set on pending requests.",
      );
    }
    const dateError = validateTatDate(input.expected_by);
    if (dateError) {
      throw new DocDeskServiceError(422, "VALIDATION_ERROR", dateError);
    }
    const now = new Date().toISOString();
    return this.touch(request, {
      tat: {
        expected_by: input.expected_by,
        note: input.note?.trim() || undefined,
        updated_by: viewer.name,
        updated_at: now,
      },
    });
  }

  async setBulkTat(input: BulkTatInput): Promise<DocRequest[]> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    if (!isStudentAffairs(viewer)) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only Student Affairs can set turnaround time.",
      );
    }
    // Duplicate IDs are ignored (API behaviour); the frontend prevents them too.
    const ids = [...new Set(input.request_ids)];
    if (ids.length < LIMITS.bulkTatMin || ids.length > LIMITS.bulkTatMax) {
      throw new DocDeskServiceError(
        422,
        "VALIDATION_ERROR",
        `Select between ${LIMITS.bulkTatMin} and ${LIMITS.bulkTatMax} requests.`,
      );
    }
    const dateError = validateTatDate(input.expected_by);
    if (dateError) {
      throw new DocDeskServiceError(422, "VALIDATION_ERROR", dateError);
    }
    this.ensureLoaded();
    // All-or-nothing: validate every selection before touching any record.
    const targets: DocRequest[] = [];
    for (const id of ids) {
      const request = this.requests.find((r) => r.request_id === id);
      if (!request) {
        throw new DocDeskServiceError(
          404,
          "NOT_FOUND",
          `Request ${id} was not found. No requests were updated.`,
        );
      }
      if (request.status !== "pending") {
        throw new DocDeskServiceError(
          409,
          "REQUEST_NOT_PENDING",
          `${request.request_id} is ${request.status}, not pending. No requests were updated.`,
        );
      }
      targets.push(request);
    }
    const now = new Date().toISOString();
    const note = input.note?.trim() || undefined;
    const updatedIds = new Set(targets.map((t) => t.request_id));
    this.requests = this.requests.map((r) => {
      if (!updatedIds.has(r.request_id)) return r;
      return {
        ...r,
        tat: {
          expected_by: input.expected_by,
          note,
          updated_by: viewer.name,
          updated_at: now,
        },
        updated_at: now,
      };
    });
    this.persist();
    return this.requests
      .filter((r) => updatedIds.has(r.request_id))
      .map((r) => ({ ...r }));
  }

  // ---------------------------------------------------------------- files

  async downloadAnswerDocument(
    requestId: string,
  ): Promise<DownloadableDemoFile | null> {
    await delay(MOCK_LATENCY_MS);
    const request = this.findRequest(requestId);
    this.assertCanView(request);
    if (!request.document) return null;
    return this.demoDownload(request, request.document);
  }

  async uploadFilledForm(requestId: string, file: File): Promise<DocRequest> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    const request = this.findRequest(requestId);
    if (request.requested_by !== viewer.email_id) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only the requester can upload the filled-in form.",
      );
    }
    if (request.status === "pending") {
      throw new DocDeskServiceError(
        409,
        "NOT_ANSWERED",
        "Filled-in forms need an answered request with an attached document.",
      );
    }
    if (request.status === "acknowledged") {
      throw new DocDeskServiceError(
        409,
        "ALREADY_ACKNOWLEDGED",
        "The filled-in form is locked after acknowledgement.",
      );
    }
    if (!request.document) {
      throw new DocDeskServiceError(
        409,
        "NO_DOCUMENT",
        "Upload a filled-in form only after Student Affairs attaches a document.",
      );
    }
    const fileError = validateFilledFormFile(file);
    if (fileError) {
      throw new DocDeskServiceError(422, "VALIDATION_ERROR", fileError);
    }
    return this.touch(request, {
      filled_form: this.fileToMetadata(file),
    });
  }

  async downloadFilledForm(
    requestId: string,
  ): Promise<DownloadableDemoFile | null> {
    await delay(MOCK_LATENCY_MS);
    const request = this.findRequest(requestId);
    this.assertCanView(request);
    if (!request.filled_form) return null;
    return this.demoDownload(request, request.filled_form);
  }

  async removeFilledForm(requestId: string): Promise<DocRequest> {
    await delay(MOCK_LATENCY_MS);
    const viewer = this.requireViewer();
    const request = this.findRequest(requestId);
    if (request.requested_by !== viewer.email_id) {
      throw new DocDeskServiceError(
        403,
        "FORBIDDEN",
        "Only the requester can remove the filled-in form.",
      );
    }
    if (request.status === "acknowledged") {
      throw new DocDeskServiceError(
        409,
        "ALREADY_ACKNOWLEDGED",
        "The filled-in form cannot be removed after acknowledgement.",
      );
    }
    if (request.status !== "answered") {
      throw new DocDeskServiceError(
        409,
        "NOT_ANSWERED",
        "There is no filled-in form to remove.",
      );
    }
    if (!request.filled_form) {
      throw new DocDeskServiceError(
        404,
        "NOT_FOUND",
        "There is no filled-in form on this request.",
      );
    }
    return this.touch(request, { filled_form: undefined });
  }
}

export const mockDocDeskService = new MockDocDeskService();
