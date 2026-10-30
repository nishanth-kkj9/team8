export type DocumentTypeStatus = "active" | "archived";

export interface DocType {
  doc_type_id: string;
  name: string;
  description?: string;
  status: DocumentTypeStatus;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoredFileMetadata {
  file_id: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  url?: string;
}
