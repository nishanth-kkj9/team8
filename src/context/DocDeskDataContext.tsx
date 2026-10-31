import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { DocType } from "../types/document";
import type { DocRequest } from "../types/request";
import type {
  DocumentTypeFilters,
  PaginatedResponse,
  RequestFilters,
} from "../services/docDeskService.types";
import { docDeskService } from "../services/serviceProvider";
import { useDemoAuth } from "./DemoAuthContext";

interface DocDeskDataContextValue {
  /** Initial or aggregated requests for dashboard overviews. */
  requests: DocRequest[];
  docTypes: DocType[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  fetchRequestsPage: (filters?: RequestFilters) => Promise<PaginatedResponse<DocRequest>>;
  fetchDocTypesPage: (filters?: DocumentTypeFilters) => Promise<PaginatedResponse<DocType>>;
}

const DocDeskDataContext = createContext<DocDeskDataContextValue | null>(null);

/**
 * Shared production data context. Communicates with CampusOS APIs via docDeskService.
 */
export function DocDeskDataProvider({ children }: { children: ReactNode }) {
  const { profile } = useDemoAuth();
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadSequence = useRef(0);

  const fetchRequestsPage = useCallback(
    async (filters?: RequestFilters): Promise<PaginatedResponse<DocRequest>> => {
      return docDeskService.listRequests(filters);
    },
    [],
  );

  const fetchDocTypesPage = useCallback(
    async (filters?: DocumentTypeFilters): Promise<PaginatedResponse<DocType>> => {
      return docDeskService.listDocumentTypes(filters);
    },
    [],
  );

  const refresh = useCallback(async () => {
    const sequence = ++loadSequence.current;
    if (!profile) {
      setRequests([]);
      setDocTypes([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      docDeskService.setViewer(profile);
      const loadAll = async <T extends { request_id?: string; doc_type_id?: string }>(
        load: (cursor?: string) => Promise<PaginatedResponse<T>>,
        key: (item: T) => string,
      ) => {
        const rows = new Map<string, T>();
        const seenCursors = new Set<string>();
        let cursor: string | undefined;
        do {
          const page = await load(cursor);
          page.items.forEach((item) => rows.set(key(item), item));
          cursor = page.next_cursor ?? undefined;
          if (cursor && seenCursors.has(cursor)) throw new Error("CampusOS returned a repeated page cursor.");
          if (cursor) seenCursors.add(cursor);
        } while (cursor);
        return [...rows.values()];
      };
      const [allRequests, allDocTypes] = await Promise.all([
        loadAll((cursor) => docDeskService.listRequests({ limit: 100, ...(cursor ? { cursor } : {}) }), (r) => r.request_id),
        loadAll((cursor) => docDeskService.listDocumentTypes({ limit: 100, ...(cursor ? { cursor } : {}) }), (t) => t.doc_type_id),
      ]);
      if (sequence === loadSequence.current) {
        setRequests(allRequests as DocRequest[]);
        setDocTypes(allDocTypes as DocType[]);
      }
    } catch (err) {
      if (sequence === loadSequence.current) setError(err instanceof Error ? err.message : "Failed to load CampusOS data.");
    } finally {
      if (sequence === loadSequence.current) setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({
      requests,
      docTypes,
      loading,
      error,
      refresh,
      fetchRequestsPage,
      fetchDocTypesPage,
    }),
    [requests, docTypes, loading, error, refresh, fetchRequestsPage, fetchDocTypesPage],
  );

  return (
    <DocDeskDataContext.Provider value={value}>
      {children}
    </DocDeskDataContext.Provider>
  );
}

export function useDocDeskData(): DocDeskDataContextValue {
  const ctx = useContext(DocDeskDataContext);
  if (!ctx) {
    throw new Error("useDocDeskData must be used within DocDeskDataProvider");
  }
  return ctx;
}
