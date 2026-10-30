import { useCallback, useEffect, useRef, useState } from "react";
import type { DocDeskStatus, DocRequest } from "../types/request";
import { docDeskService } from "../services/serviceProvider";

export interface PaginatedRequestsFilters {
  status?: DocDeskStatus | "";
  doc_type_id?: string;
  mine?: boolean;
}

export function usePaginatedRequests(filters: PaginatedRequestsFilters) {
  const [items, setItems] = useState<DocRequest[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sequence token prevents race conditions and stale response overwrites
  const seqRef = useRef(0);

  const loadInitial = useCallback(async () => {
    const currentSeq = ++seqRef.current;
    setLoading(true);
    setError(null);
    try {
      const res = await docDeskService.listRequests({
        status: filters.status ? filters.status : undefined,
        doc_type_id: filters.doc_type_id ? filters.doc_type_id : undefined,
        mine: filters.mine,
        limit: 25,
      });

      if (currentSeq === seqRef.current) {
        setItems(res.items);
        setTotalCount(res.count);
        setNextCursor(res.next_cursor);
      }
    } catch (err) {
      if (currentSeq === seqRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load requests");
      }
    } finally {
      if (currentSeq === seqRef.current) {
        setLoading(false);
      }
    }
  }, [filters.status, filters.doc_type_id, filters.mine]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    const currentSeq = seqRef.current;
    setLoadingMore(true);
    try {
      const res = await docDeskService.listRequests({
        status: filters.status ? filters.status : undefined,
        doc_type_id: filters.doc_type_id ? filters.doc_type_id : undefined,
        mine: filters.mine,
        cursor: nextCursor,
        limit: 25,
      });

      if (currentSeq === seqRef.current) {
        // Deduplicate records when appending pages
        setItems((prev) => {
          const seen = new Set(prev.map((r) => r.request_id));
          const newItems = res.items.filter((r) => !seen.has(r.request_id));
          return [...prev, ...newItems];
        });
        setTotalCount(res.count);
        setNextCursor(res.next_cursor);
      }
    } catch (err) {
      if (currentSeq === seqRef.current) {
        setError(err instanceof Error ? err.message : "Failed to load more requests");
      }
    } finally {
      if (currentSeq === seqRef.current) {
        setLoadingMore(false);
      }
    }
  }, [nextCursor, loadingMore, filters.status, filters.doc_type_id, filters.mine]);

  return {
    items,
    totalCount,
    nextCursor,
    hasMore: nextCursor !== null,
    loading,
    loadingMore,
    error,
    refresh: loadInitial,
    loadMore,
  };
}
