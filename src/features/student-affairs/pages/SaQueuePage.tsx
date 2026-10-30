import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, Inbox, ListChecks, Loader2, SearchX, X } from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useToast } from "../../../context/ToastContext";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RequestTable } from "../../../components/requests/RequestTable";
import { Input, Select } from "../../../components/ui/Field";
import { LIMITS } from "../../../lib/validation";
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
 * Screen SA2 — Request queue (§5C SA2): institution-wide list with status
 * tabs, cursor pagination, text search, doc-type + sort filters, and bulk TAT selection.
 */
export function SaQueuePage() {
  const { docTypes } = useDocDeskData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [docTypeId, setDocTypeId] = useState("");
  const [sort, setSort] = useState<RequestSort>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  const setStatusTab = (value: DocDeskStatus | "") => {
    setSelectedIds(new Set()); // selection is only meaningful on the pending tab
    if (value) {
      setSearchParams({ status: value });
    } else {
      setSearchParams({});
    }
  };

  const toggleSelect = (requestId: string) => {
    let atLimit = false;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else if (next.size < LIMITS.bulkTatMax) {
        next.add(requestId);
      } else {
        atLimit = true;
      }
      return next;
    });
    if (atLimit) {
      toast({
        title: "Selection limit reached",
        description: `Bulk TAT accepts up to ${LIMITS.bulkTatMax} requests at once.`,
        variant: "error",
      });
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = requests.filter((request) => {
      if (
        query &&
        !request.request_id.toLowerCase().includes(query) &&
        !request.doc_type_name.toLowerCase().includes(query) &&
        !(request.requested_by_name ?? "").toLowerCase().includes(query) &&
        !request.requested_by.toLowerCase().includes(query)
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

  const selectedShown = filtered.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Processing Queue"
        description="Review incoming requests, answer with official documents, and set turnaround targets."
        crumbs={[{ label: "Student Affairs", to: "/sa/dashboard" }, { label: "Queue" }]}
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
                onClick={() => setStatusTab(tab.value)}
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
              id="sa-queue-search"
              placeholder="Search by ID, document, requester name or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            id="sa-queue-doc-type"
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
            id="sa-queue-sort"
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
          Loading request queue from CampusOS…
        </Card>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={status ? `No ${STATUS_LABELS[status].toLowerCase()} requests` : "Queue is clear"}
          description={
            status
              ? `There are currently no requests with status "${STATUS_LABELS[status]}".`
              : "No document requests found in the system."
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
            detailPathPrefix="/sa/requests"
            showRequester
            selectable={status === "pending"}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
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
            <p className="text-center text-xs text-ink-400">All requests in this view have been loaded.</p>
          )}
        </>
      )}

      {/* Bulk-TAT selection bar */}
      {status === "pending" && selectedIds.size > 0 ? (
        <div
          role="region"
          aria-label="Bulk TAT selection"
          className="sticky bottom-4 z-30 flex flex-wrap items-center gap-3 rounded-card border border-primary-200 bg-surface px-4 py-3 shadow-pop"
        >
          <ListChecks aria-hidden className="h-4 w-4 shrink-0 text-primary-700" />
          <p className="flex-1 text-sm text-ink-700">
            <span className="font-semibold">{selectedIds.size}</span> of {selectedShown} shown pending
            request{selectedIds.size === 1 ? "" : "s"} selected for a shared expected-by date.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedIds(new Set())}
          >
            <X aria-hidden className="h-3.5 w-3.5" />
            Clear
          </Button>
          <Button
            size="sm"
            onClick={() =>
              navigate(`/sa/turnaround-time?selected=${encodeURIComponent([...selectedIds].join(","))}`)
            }
          >
            <CalendarClock aria-hidden className="h-3.5 w-3.5" />
            Set TAT for selected
          </Button>
        </div>
      ) : null}
    </div>
  );
}
