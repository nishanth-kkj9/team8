import type { DemoProfile } from "../../types/auth";
import type { DocType } from "../../types/document";
import type { DocRequest } from "../../types/request";
import type {
  AnswerRequestInput,
  BulkTatInput,
  CreateDocTypeInput,
  CreateRequestInput,
  DocDeskService,
  DocumentTypeFilters,
  DownloadableFile,
  PaginatedResponse,
  RequestFilters,
  TatInput,
  UpdateAnswerInput,
  UpdateDocTypeInput,
  UpdateRequestInput,
} from "../docDeskService.types";
import { ApiError } from "./apiErrors";
import { campusOsClient } from "./campusOsClient";

interface RawListResponse<T> {
  items: T[];
  count?: number;
  next_cursor?: string | null;
}

export class CampusOsDocDeskService implements DocDeskService {
  private currentViewer: DemoProfile | null = null;

  setViewer(profile: DemoProfile | null): void {
    this.currentViewer = profile;
  }

  getViewer(): DemoProfile | null {
    return this.currentViewer;
  }

  // --- CORE REQUEST LIFECYCLE ---

  async listRequests(filters?: RequestFilters): Promise<PaginatedResponse<DocRequest>> {
    const queryParams: Record<string, unknown> = {};
    if (filters?.status) {
      queryParams.status = filters.status;
    }
    if (filters?.doc_type_id) {
      queryParams.doc_type_id = filters.doc_type_id;
    }
    if (filters?.limit !== undefined) {
      queryParams.limit = filters.limit;
    }
    if (filters?.cursor) {
      queryParams.cursor = filters.cursor;
    }

    const response = await campusOsClient.get<RawListResponse<DocRequest>>(
      "/docdesk/requests",
      queryParams,
    );

    const items = response.items || [];
    return {
      items,
      count: response.count ?? items.length,
      next_cursor: response.next_cursor ?? null,
    };
  }

  async getRequest(requestId: string): Promise<DocRequest | null> {
    try {
      return await campusOsClient.get<DocRequest>(
        `/docdesk/requests/${encodeURIComponent(requestId)}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async createRequest(input: CreateRequestInput): Promise<DocRequest> {
    return campusOsClient.post<DocRequest>("/docdesk/requests", {
      doc_type_id: input.doc_type_id,
      reason: input.reason,
    });
  }

  async updatePendingRequest(
    requestId: string,
    input: UpdateRequestInput,
  ): Promise<DocRequest> {
    const body: Record<string, unknown> = {};
    if (input.doc_type_id !== undefined) body.doc_type_id = input.doc_type_id;
    if (input.reason !== undefined) body.reason = input.reason;

    return campusOsClient.patch<DocRequest>(
      `/docdesk/requests/${encodeURIComponent(requestId)}`,
      body,
    );
  }

  async withdrawPendingRequest(requestId: string): Promise<void> {
    await campusOsClient.delete<void>(
      `/docdesk/requests/${encodeURIComponent(requestId)}`,
    );
  }

  async answerRequest(
    requestId: string,
    input: AnswerRequestInput,
  ): Promise<DocRequest> {
    const form = new FormData();
    form.append("message", input.message);
    if (input.document) {
      form.append("document", input.document);
    }

    return campusOsClient.postForm<DocRequest>(
      `/docdesk/requests/${encodeURIComponent(requestId)}/answer`,
      form,
    );
  }

  async updateAnswer(
    requestId: string,
    input: UpdateAnswerInput,
  ): Promise<DocRequest> {
    const form = new FormData();
    let hasField = false;

    if (input.message !== undefined && input.message !== null) {
      form.append("message", input.message);
      hasField = true;
    }
    if (input.document) {
      form.append("document", input.document);
      hasField = true;
    }
    if (input.remove_document) {
      form.append("remove_document", "true");
      hasField = true;
    }

    if (!hasField) {
      throw new ApiError(400, "VALIDATION_ERROR", "Answer update requires at least one field to change.");
    }

    return campusOsClient.patchForm<DocRequest>(
      `/docdesk/requests/${encodeURIComponent(requestId)}/answer`,
      form,
    );
  }

  async withdrawAnswer(requestId: string): Promise<DocRequest> {
    return campusOsClient.delete<DocRequest>(
      `/docdesk/requests/${encodeURIComponent(requestId)}/answer`,
    );
  }

  async acknowledgeRequest(requestId: string): Promise<DocRequest> {
    return campusOsClient.post<DocRequest>(
      `/docdesk/requests/${encodeURIComponent(requestId)}/acknowledge`,
    );
  }

  // --- DOCUMENT TYPES (STARRED BONUS) ---

  async listDocumentTypes(filters?: DocumentTypeFilters): Promise<PaginatedResponse<DocType>> {
    const queryParams: Record<string, unknown> = {};
    if (filters?.status) {
      queryParams.status = filters.status;
    }
    if (filters?.limit !== undefined) {
      queryParams.limit = filters.limit;
    }
    if (filters?.cursor) {
      queryParams.cursor = filters.cursor;
    }

    const response = await campusOsClient.get<RawListResponse<DocType>>(
      "/docdesk/doc-types",
      queryParams,
    );

    const items = response.items || [];
    return {
      items,
      count: response.count ?? items.length,
      next_cursor: response.next_cursor ?? null,
    };
  }

  async getDocumentType(docTypeId: string): Promise<DocType | null> {
    try {
      return await campusOsClient.get<DocType>(
        `/docdesk/doc-types/${encodeURIComponent(docTypeId)}`,
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      throw err;
    }
  }

  async createDocumentType(input: CreateDocTypeInput): Promise<DocType> {
    return campusOsClient.post<DocType>("/docdesk/doc-types", {
      name: input.name,
      description: input.description,
    });
  }

  async updateDocumentType(
    docTypeId: string,
    input: UpdateDocTypeInput,
  ): Promise<DocType> {
    const body: Record<string, unknown> = {};
    if (input.name !== undefined) body.name = input.name;
    if (input.description !== undefined) body.description = input.description;
    if (input.status !== undefined) body.status = input.status;

    return campusOsClient.patch<DocType>(
      `/docdesk/doc-types/${encodeURIComponent(docTypeId)}`,
      body,
    );
  }

  async deleteDocumentType(docTypeId: string): Promise<void> {
    await campusOsClient.delete<void>(
      `/docdesk/doc-types/${encodeURIComponent(docTypeId)}`,
    );
  }

  // --- TURNAROUND TIME (STARRED BONUS) ---

  async setTat(requestId: string, input: TatInput): Promise<DocRequest> {
    return campusOsClient.put<DocRequest>(
      `/docdesk/requests/${encodeURIComponent(requestId)}/tat`,
      {
        expected_by: input.expected_by,
        note: input.note,
      },
    );
  }

  async setBulkTat(input: BulkTatInput): Promise<DocRequest[]> {
    const response = await campusOsClient.post<RawListResponse<DocRequest> | DocRequest[]>(
      "/docdesk/requests/bulk-tat",
      {
        request_ids: input.request_ids,
        expected_by: input.expected_by,
        note: input.note,
      },
    );

    if (Array.isArray(response)) {
      return response;
    }
    return response.items || [];
  }

  // --- FILE WORKFLOW (STARRED BONUS) ---

  async downloadAnswerDocument(
    requestId: string,
  ): Promise<DownloadableFile | null> {
    try {
      const { blob, filename } = await campusOsClient.downloadFile(
        `/docdesk/requests/${encodeURIComponent(requestId)}/document`,
        `document-${requestId}.pdf`,
      );
      return {
        filename,
        content_type: blob.type || "application/octet-stream",
        size_bytes: blob.size,
        blob,
      };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 409)) {
        return null;
      }
      throw err;
    }
  }

  async uploadFilledForm(
    requestId: string,
    file: File,
  ): Promise<DocRequest> {
    const form = new FormData();
    form.append("file", file);

    return campusOsClient.putForm<DocRequest>(
      `/docdesk/requests/${encodeURIComponent(requestId)}/filled-form`,
      form,
    );
  }

  async downloadFilledForm(
    requestId: string,
  ): Promise<DownloadableFile | null> {
    try {
      const { blob, filename } = await campusOsClient.downloadFile(
        `/docdesk/requests/${encodeURIComponent(requestId)}/filled-form`,
        `filled-form-${requestId}.pdf`,
      );
      return {
        filename,
        content_type: blob.type || "application/octet-stream",
        size_bytes: blob.size,
        blob,
      };
    } catch (err) {
      if (err instanceof ApiError && (err.status === 404 || err.status === 409)) {
        return null;
      }
      throw err;
    }
  }

  async removeFilledForm(requestId: string): Promise<DocRequest> {
    return campusOsClient.delete<DocRequest>(
      `/docdesk/requests/${encodeURIComponent(requestId)}/filled-form`,
    );
  }
}

export const campusOsDocDeskService = new CampusOsDocDeskService();
