import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Inbox, Loader2, SearchX, ShieldCheck } from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RequestTable } from "../../../components/requests/RequestTable";
import { Input, Select } from "../../../components/ui/Field";
import { STATUS_LABELS, type DocDeskStatus } from "../../../types/request";
import type { RequestSort } from "../../requests/components/RequestFilters";
import { usePaginatedRequests } from "../../../hooks/usePaginatedRequests";
import { cn } from "../../../lib/cn";

const NEWEST_FIRST = (a: { created_at: string }, b: { created_at: string }) =>
  a.created_at < b.created_at ? 1 : -1;

const TABS: ReadonlyArray<{ value: DocDeskStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "answered", label: "Answered" },
  { value: "acknowledged", label: "Acknowledged" },
];

/**
 * Screen A2 — All Requests (§5D, read-only). The institution-wide request
 * register: Admin can browse, search and filter everything with server-side
 * pagination, and open the read-only detail view.
 */
export function AdminAllRequestsPage() {
  const { docTypes } = useDocDeskData();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [docTypeId, setDocTypeId] = useState("");
  const [sort, setSort] = useState<RequestSort>("newest");

  const statusParam = searchParams.get("status");
  const status: DocDeskStatus | "" =
    statusParam === "pending" || statusParam === "answered" || statusParam === "acknowledged"
      ? statusParam
      : "";

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
        !request.doc_type_name.toLowerCase().includes(query) &&
        !(request.requested_by_name ?? "").toLowerCase().includes(query) &&
        !request.requested_by.toLowerCase().includes(query) &&
        !request.reason.toLowerCase().includes(query)
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
          if (a.tat && b.tat) return a.tat.expected_by < b.tat.expected_by ? -1 : 1;
          if (a.tat) return -1;
          if (b.tat) return 1;
          return NEWEST_FIRST(a, b);
        });
      default:
        return list.sort(NEWEST_FIRST);
    }
  }, [requests, search, sort]);

  const filtersActive = search.trim() !== "" || docTypeId !== "";

  const clearFilters = () => {
    setSearch("");
    setDocTypeId("");
    setSort("newest");
  };

  const heading = status === "" ? "All Requests" : `${STATUS_LABELS[status]} Requests`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={heading}
        description={
          status === "pending"
            ? "Pending document requests awaiting Student Affairs processing."
            : status === "answered"
              ? "Requests answered by Student Affairs, awaiting requester acknowledgement or form return."
              : status === "acknowledged"
                ? "Completed and acknowledged document requests across the institution."
                : "Institution-wide document request register. Read-only oversight across all statuses."
        }
        crumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: "All Requests" }]}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs font-medium text-ink-600">
            <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-primary-700" />
            Read-only oversight
          </span>
        }
      />

      {/* Status tabs */}
      <div className="border-b border-line">
        <nav aria-label="Status queue tabs" className="-mb-px flex gap-2">
          {TABS.map((tab) => {
            const active = status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  if (tab.value) {
                    setSearchParams({ status: tab.value });
                  } else {
                    setSearchParams({});
                  }
                }}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "border-accent-600 text-primary-800"
                    : "border-transparent text-ink-500 hover:border-line hover:text-ink-800",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Filter and search bar */}
      <Card className="p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2">
            <Input
              id="admin-queue-search"
              placeholder="Search by ID, document, requester name, email, or reason…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            id="admin-queue-doc-type"
            value={docTypeId}
            onChange={(e) => setDocTypeId(e.target.value)}
          >
            <option value="">All document types</option>
            {docTypes.map((dt) => (
              <option key={dt.doc_type_id} value={dt.doc_type_id}>
                {dt.name}
              </option>
            ))}
          </Select>
          <Select
            id="admin-queue-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as RequestSort)}
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="expected">Turnaround target</option>
          </Select>
        </div>
        {filtersActive && (
          <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-xs text-ink-500">
            <span>Filtering loaded records</span>
            <button
              type="button"
              onClick={clearFilters}
              className="font-medium text-primary-700 hover:underline"
            >
              Reset filters
            </button>
          </div>
        )}
      </Card>

      {/* Table & states */}
      {loading && requests.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-500">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-primary-600" />
          Loading request register from CampusOS…
        </Card>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={status ? `No ${STATUS_LABELS[status].toLowerCase()} requests` : "Register is clear"}
          description={
            status
              ? `There are currently no requests with status "${STATUS_LABELS[status]}".`
              : "No document requests found across the institution."
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching requests"
          description="Try relaxing your search terms or clearing the document type filter."
          action={
            <Button variant="ghost" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <>
          <p className="text-xs text-ink-500" aria-live="polite">
            Showing {filtered.length} loaded records · {totalCount} total in CampusOS
          </p>
          <RequestTable
            requests={filtered}
            detailPathPrefix="/admin/requests"
            showRequester
          />
          {hasMore && (
            <div className="pt-2 text-center">
              <Button
                variant="ghost"
                onClick={() => void loadMore()}
                disabled={loadingMore}
              >
                {loadingMore && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Load more requests
              </Button>
            </div>
          )}
          {!hasMore && requests.length > 0 && (
            <p className="text-center text-xs text-ink-400">All requests in this register view have been loaded.</p>
          )}
        </>
      )}
    </div>
  );
}
