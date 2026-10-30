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
  DownloadableDemoFile,
  RequestFilters,
  TatInput,
  UpdateAnswerInput,
  UpdateDocTypeInput,
  UpdateRequestInput,
} from "../docDeskService.types";
import { ApiError } from "./apiErrors";
import { campusOsClient } from "./campusOsClient";

interface ListResponse<T> {
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

  // --- CORE REQUEST LIFECYCLE (PHASE B3) ---

  async listRequests(filters?: RequestFilters): Promise<DocRequest[]> {
    const queryParams: Record<string, unknown> = {};
    if (filters?.status) {
      queryParams.status = filters.status;
    }
    if (filters?.doc_type_id) {
      queryParams.doc_type_id = filters.doc_type_id;
    }
    if (filters?.mine !== undefined) {
      queryParams.mine = filters.mine;
    }

    const response = await campusOsClient.get<ListResponse<DocRequest>>(
      "/docdesk/requests",
      queryParams,
    );
    return response.items || [];
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
    return campusOsClient.patch<DocRequest>(
      `/docdesk/requests/${encodeURIComponent(requestId)}`,
      {
        doc_type_id: input.doc_type_id,
        reason: input.reason,
      },
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
    if (input.message !== undefined) {
      form.append("message", input.message);
    }
    if (input.document) {
      form.append("document", input.document);
    }
    if (input.remove_document) {
      form.append("remove_document", "true");
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
      {},
    );
  }

  // --- DOCUMENT TYPES & TAT & FILES (PHASE B4) ---

  async listDocumentTypes(filters?: DocumentTypeFilters): Promise<DocType[]> {
    const queryParams: Record<string, unknown> = {};
    if (filters?.status) {
      queryParams.status = filters.status;
    }

    const response = await campusOsClient.get<ListResponse<DocType>>(
      "/docdesk/doc-types",
      queryParams,
    );
    return response.items || [];
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
    return campusOsClient.patch<DocType>(
      `/docdesk/doc-types/${encodeURIComponent(docTypeId)}`,
      {
        name: input.name,
        description: input.description,
        status: input.status,
      },
    );
  }

  async deleteDocumentType(docTypeId: string): Promise<void> {
    await campusOsClient.delete<void>(
      `/docdesk/doc-types/${encodeURIComponent(docTypeId)}`,
    );
  }

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
    const response = await campusOsClient.post<ListResponse<DocRequest>>(
      "/docdesk/requests/bulk-tat",
      {
        request_ids: input.request_ids,
        expected_by: input.expected_by,
        note: input.note,
      },
    );
    return response.items || [];
  }

  async downloadAnswerDocument(
    requestId: string,
  ): Promise<DownloadableDemoFile | null> {
    try {
      const { blob, filename } = await campusOsClient.downloadFile(
        `/docdesk/requests/${encodeURIComponent(requestId)}/document`,
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
  ): Promise<DownloadableDemoFile | null> {
    try {
      const { blob, filename } = await campusOsClient.downloadFile(
        `/docdesk/requests/${encodeURIComponent(requestId)}/filled-form`,
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

  async resetDemoData(): Promise<void> {
    // No-op for real CampusOS API backend
  }
}

export const campusOsDocDeskService = new CampusOsDocDeskService();
