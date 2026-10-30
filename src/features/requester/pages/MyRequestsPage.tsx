import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, FileText, Loader2, SearchX } from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RequestTable } from "../../../components/requests/RequestTable";
import {
  RequestFilters,
  type RequestSort,
} from "../../requests/components/RequestFilters";
import { usePaginatedRequests } from "../../../hooks/usePaginatedRequests";
import type { DocDeskStatus, DocRequest } from "../../../types/request";

const NEWEST_FIRST = (a: DocRequest, b: DocRequest) =>
  a.created_at < b.created_at ? 1 : -1;

/**
 * Screen R3 — My Requests (§5B R3): requester's own requests with server-side
 * cursor pagination, document-type & status filters, text search across loaded records,
 * and newest/oldest/expected-date sorting.
 */
export function MyRequestsPage() {
  const { docTypes } = useDocDeskData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DocDeskStatus | "">("");
  const [docTypeId, setDocTypeId] = useState("");
  const [sort, setSort] = useState<RequestSort>("newest");

  const {
    items: requests,
    totalCount,
    hasMore,
    loading,
    loadingMore,
    loadMore,
  } = usePaginatedRequests({
    status,
    doc_type_id: docTypeId,
  });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = requests.filter((request) => {
      if (
        query &&
        !request.request_id.toLowerCase().includes(query) &&
        !request.doc_type_name.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });

    switch (sort) {
      case "oldest":
        return list.sort((a, b) => -NEWEST_FIRST(a, b));
      case "expected":
        return list.sort((a, b) => {
          if (a.tat && b.tat) {
            return a.tat.expected_by < b.tat.expected_by ? -1 : 1;
          }
          if (a.tat) return -1;
          if (b.tat) return 1;
          return NEWEST_FIRST(a, b);
        });
      default:
        return list.sort(NEWEST_FIRST);
    }
  }, [requests, search, sort]);

  const filtersActive = search.trim() !== "" || status !== "" || docTypeId !== "";

  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setDocTypeId("");
    setSort("newest");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Requests"
        description="All document requests you have submitted, with their live status in the pending → answered → acknowledged lifecycle."
        crumbs={[{ label: "Requester portal", to: "/app/dashboard" }, { label: "My Requests" }]}
        actions={
          <Link
            to="/app/requests/new"
            className="inline-flex h-10 items-center gap-2 rounded-control bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-800"
          >
            <FilePlus2 aria-hidden className="h-4 w-4" />
            Request a Document
          </Link>
        }
      />

      <Card className="p-4">
        <RequestFilters
          search={search}
          onSearchChange={setSearch}
          status={status}
          onStatusChange={setStatus}
          docTypeId={docTypeId}
          onDocTypeIdChange={setDocTypeId}
          sort={sort}
          onSortChange={setSort}
          docTypes={docTypes}
        />
      </Card>

      {loading && requests.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-500">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-primary-600" />
          Loading your requests from CampusOS…
        </Card>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No requests yet"
          description="When you submit a document request it will appear here with its live status."
          action={
            <Link
              to="/app/requests/new"
              className="inline-flex h-10 items-center gap-2 rounded-control bg-primary-700 px-4 text-sm font-medium text-white transition-colors hover:bg-primary-800"
            >
              <FilePlus2 aria-hidden className="h-4 w-4" />
              Request a Document
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching requests"
          description="No requests match the current search query."
          action={
            filtersActive ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex h-10 items-center rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-50"
              >
                Clear filters
              </button>
            ) : undefined
          }
        />
      ) : (
        <>
          <p className="text-xs text-ink-500" aria-live="polite">
            Showing {filtered.length} loaded records · {totalCount} total in CampusOS
          </p>
          <RequestTable requests={filtered} />
          {hasMore && (
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-line bg-surface px-6 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-50 disabled:opacity-60"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                Load more requests
              </button>
            </div>
          )}
          {!hasMore && requests.length > 0 && (
            <p className="text-center text-xs text-ink-400">All requests loaded.</p>
          )}
        </>
      )}
    </div>
  );
}
