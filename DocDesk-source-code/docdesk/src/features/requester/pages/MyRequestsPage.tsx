import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FilePlus2, FileText, SearchX } from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RequestTable } from "../../../components/requests/RequestTable";
import {
  RequestFilters,
  type RequestSort,
} from "../../requests/components/RequestFilters";
import type { DocDeskStatus, DocRequest } from "../../../types/request";

const NEWEST_FIRST = (a: DocRequest, b: DocRequest) =>
  a.created_at < b.created_at ? 1 : -1;

/** Rows shown before the "Load more" control appears (Phase 6 pagination). */
const PAGE_SIZE = 8;

/**
 * Screen R3 — My Requests (§5B R3): own requests only (scoped by the service),
 * with search by request ID / document name, status + document type filters,
 * newest/oldest/expected-date sorting, and empty states with a CTA.
 */
export function MyRequestsPage() {
  const { requests, docTypes, loading } = useDocDeskData();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<DocDeskStatus | "">("");
  const [docTypeId, setDocTypeId] = useState("");
  const [sort, setSort] = useState<RequestSort>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

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
      if (status && request.status !== status) return false;
      if (docTypeId && request.doc_type_id !== docTypeId) return false;
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
  }, [requests, search, status, docTypeId, sort]);

  const filtersActive = search.trim() !== "" || status !== "" || docTypeId !== "";

  // Pagination (Phase 6): collapse long lists behind a Load more control and
  // reset the window whenever the search/filter/sort inputs change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, status, docTypeId, sort]);
  const visibleRequests = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const remainingCount = filtered.length - visibleRequests.length;

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
        <Card className="p-8 text-center text-sm text-ink-500">Loading your requests…</Card>
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
          description="No requests match the current search and filters."
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
            Showing {visibleRequests.length} of {filtered.length} matching ·{" "}
            {requests.length} total
          </p>
          <RequestTable requests={visibleRequests} />
          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-50 sm:w-auto"
            >
              Load more requests
              <span className="text-xs text-ink-500">({remainingCount} remaining)</span>
            </button>
          )}
        </>
      )}
    </div>
  );
}
