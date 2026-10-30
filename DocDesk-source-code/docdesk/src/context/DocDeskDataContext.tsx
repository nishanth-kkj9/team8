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
import { docDeskService } from "../services/serviceProvider";
import { useDemoAuth } from "./DemoAuthContext";

interface DocDeskDataContextValue {
  /** Requests scoped to the signed-in demo profile (own vs. all). */
  requests: DocRequest[];
  docTypes: DocType[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DocDeskDataContext = createContext<DocDeskDataContextValue | null>(null);

/**
 * Shared demo data state (ARCHITECTURE.md §7.2). Pages read from this context
 * and mutate through `docDeskService`, then call `refresh()` — they never
 * touch seed arrays or localStorage directly.
 */
export function DocDeskDataProvider({ children }: { children: ReactNode }) {
  const { profile } = useDemoAuth();
  const [requests, setRequests] = useState<DocRequest[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const [requestList, docTypeList] = await Promise.all([
        docDeskService.listRequests(),
        docDeskService.listDocumentTypes(),
      ]);
      setRequests(requestList);
      setDocTypes(docTypeList);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load demo data.");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ requests, docTypes, loading, error, refresh }),
    [requests, docTypes, loading, error, refresh],
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
