import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { CalendarClock, Inbox, ListChecks, SearchX, X } from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { useToast } from "../../../context/ToastContext";
import { canSetTat } from "../../../lib/permissions";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RequestTable } from "../../../components/requests/RequestTable";
import { Input, Select } from "../../../components/ui/Field";
import { LIMITS } from "../../../lib/validation";
import { STATUS_LABELS, type DocDeskStatus } from "../../../types/request";
import type { RequestSort } from "../../requests/components/RequestFilters";
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
 * Screen SA2 ??? Request queue (??5C SA2): institution-wide list with status
 * tabs (mirrored in the sidebar's All/Pending/Answered entries), search across
 * requester name / email / request ID / document, and doc-type + sort filters.
 */
/** Rows shown before the "Load more" control appears (Phase 6 pagination). */
const PAGE_SIZE = 8;

export function SaQueuePage() {
  const { requests, docTypes, loading } = useDocDeskData();
  const { profile } = useDemoAuth();
  const { toast } = useToast();
  const canSetTatHere = canSetTat(profile);
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [docTypeId, setDocTypeId] = useState("");
  const [sort, setSort] = useState<RequestSort>("newest");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const statusParam = searchParams.get("status");
  const status: DocDeskStatus | "" =
    statusParam === "pending" || statusParam === "answered" || statusParam === "acknowledged"
      ? statusParam
      : "";

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
      if (status && request.status !== status) return false;
      if (docTypeId && request.doc_type_id !== docTypeId) return false;
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
  }, [requests, status, docTypeId, search, sort]);

  const filtersActive = search.trim() !== "" || docTypeId !== "";

  // Pagination (Phase 6): collapse long lists behind a Load more control and
  // reset the window whenever the search/filter/sort inputs change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, docTypeId, sort, status]);
  const visibleRequests = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const remainingCount = filtered.length - visibleRequests.length;
  const selectedShown = filtered.filter((r) => selectedIds.has(r.request_id)).length;

  const heading =
    status === "" ? "All Requests" : `${STATUS_LABELS[status]} Requests`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={heading}
        description={
          status === "pending"
            ? "Pending applications waiting for an Admin response."
            : status === "answered"
              ? "Requests that have been answered and are waiting for acknowledgement or a filled-in form."
              : status === "acknowledged"
                ? "Closed requests the requester has acknowledged. View and download only."
                : "Every document request across the institution, from every requester role."
        }
        crumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: heading }]}
        actions={
          <Link
            to="/admin/requests?status=pending"
            className="inline-flex h-10 items-center rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-50"
          >
            Open pending queue
          </Link>
        }
      />

      {/* Status tabs (kept in sync with the sidebar nav entries) */}
      <div role="tablist" aria-label="Filter queue by status" className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => {
          const active = tab.value === status;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatusTab(tab.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary-700 bg-primary-700 text-white shadow-sm"
                  : "border-line bg-surface text-ink-600 hover:border-primary-300 hover:text-primary-800",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search requester name, email, request ID or document???"
              aria-label="Search requests by requester, email, request ID or document"
            />
          </div>
          <Select
            value={docTypeId}
            onChange={(event) => setDocTypeId(event.target.value)}
            aria-label="Filter by document type"
            className="w-48"
          >
            <option value="">All document types</option>
            {[...docTypes]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((docType) => (
                <option key={docType.doc_type_id} value={docType.doc_type_id}>
                  {docType.name}
                </option>
              ))}
          </Select>
          <Select
            value={sort}
            onChange={(event) => setSort(event.target.value as RequestSort)}
            aria-label="Sort requests"
            className="w-44"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="expected">By expected date</option>
          </Select>
        </div>
      </Card>

      {loading && requests.length === 0 ? (
        <Card className="p-8 text-center text-sm text-ink-500">Loading requests???</Card>
      ) : requests.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No requests yet"
          description="Requests submitted by students, faculty and office staff will appear here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching requests"
          description="No requests match the current tab, search and filters."
          action={
            filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDocTypeId("");
                }}
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
            Showing {visibleRequests.length} of {filtered.length} matching ??{" "}
            {requests.length} total
          </p>
          <RequestTable
            requests={visibleRequests}
            detailPathPrefix="/admin/requests"
            showRequester
            selectable={status === "pending" && canSetTatHere}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
          />
          {remainingCount > 0 && (
            <Button
              variant="ghost"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              Load more requests
              <span className="text-xs text-ink-500">({remainingCount} remaining)</span>
            </Button>
          )}
        </>
      )}

      {/* Bulk-TAT selection bar (??5C SA2: checkbox selection for bulk TAT, pending only) */}
      {status === "pending" && canSetTatHere && selectedIds.size > 0 ? (
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
              navigate(`/admin/turnaround-time?selected=${encodeURIComponent([...selectedIds].join(","))}`)
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
