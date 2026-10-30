import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
    if (!profile) {
      setRequests([]);
      setDocTypes([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      docDeskService.setViewer(profile);
      const [reqPage, dtPage] = await Promise.all([
        docDeskService.listRequests({ limit: 100 }),
        docDeskService.listDocumentTypes({ limit: 100 }),
      ]);
      setRequests(reqPage.items);
      setDocTypes(dtPage.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load CampusOS data.");
    } finally {
      setLoading(false);
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
