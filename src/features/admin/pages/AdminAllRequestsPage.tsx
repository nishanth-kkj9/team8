import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye, Inbox, RefreshCw, SearchX, ShieldCheck } from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useAdminDecisions } from "../../../hooks/useAdminDecisions";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RequestTable } from "../../../components/requests/RequestTable";
import { Input, Select } from "../../../components/ui/Field";
import { STATUS_LABELS, type DocDeskStatus } from "../../../types/request";
import type { RequestSort } from "../../requests/components/RequestFilters";
import { cn } from "../../../lib/cn";
import { Button } from "../../../components/ui/Button";

const NEWEST_FIRST = (a: { created_at: string }, b: { created_at: string }) =>
  a.created_at < b.created_at ? 1 : -1;

const TABS: ReadonlyArray<{ value: DocDeskStatus | ""; label: string }> = [
  { value: "", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "answered", label: "Answered" },
  { value: "acknowledged", label: "Acknowledged" },
];

/**
 * Screen A2 ??? All Requests. The institution-wide request register: the
 * College Main Faculty can browse, search, filter and open each request to
 * read, view and approve or reject it. There are no create/edit controls here;
 * the decision itself is recorded on the request detail screen.
 */
/** Rows shown before the "Load more" control appears (Phase 6 pagination). */
const PAGE_SIZE = 8;

export function AdminAllRequestsPage() {
  const { requests, docTypes, loading, refresh } = useDocDeskData();
  const adminDecisions = useAdminDecisions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [docTypeId, setDocTypeId] = useState("");
  const [decisionFilter, setDecisionFilter] = useState<"all" | "approved" | "rejected" | "undecided">("all");
  const [sort, setSort] = useState<RequestSort>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const statusParam = searchParams.get("status");
  const status: DocDeskStatus | "" =
    statusParam === "pending" || statusParam === "answered" || statusParam === "acknowledged"
      ? statusParam
      : "";

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const list = requests.filter((request) => {
      if (status && request.status !== status) return false;
      if (docTypeId && request.doc_type_id !== docTypeId) return false;
      if (decisionFilter !== "all") {
        const decision = adminDecisions[request.request_id]?.decision;
        if (decisionFilter === "undecided" ? decision !== undefined : decision !== decisionFilter) {
          return false;
        }
      }
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
  }, [requests, status, docTypeId, search, sort, decisionFilter, adminDecisions]);

  const filtersActive =
    search.trim() !== "" || docTypeId !== "" || decisionFilter !== "all";

  // Pagination (Phase 6): collapse long lists behind a Load more control and
  // reset the window whenever the search/filter/sort inputs change.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [search, docTypeId, sort, status, decisionFilter]);
  const visibleRequests = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );
  const remainingCount = filtered.length - visibleRequests.length;

  const heading = status === "" ? "All Requests" : `${STATUS_LABELS[status]} Requests`;

  return (
    <div className="space-y-6">
      <PageHeader
        title={heading}
        description={
          status === "pending"
            ? "Every pending request across the institution, waiting for Student Affairs."
            : status === "answered"
              ? "Answered requests across the institution, waiting for acknowledgement or a filled-in form."
              : status === "acknowledged"
                ? "Closed requests across the institution, kept for oversight and download."
                : "Every document request across the institution, from every requester role. Approve or reject each request from its detail screen."
        }
        crumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: heading }]}
        actions={
          <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
            <RefreshCw aria-hidden className="h-4 w-4" />
            Refresh requests
          </Button>
        }
      />

      {/* Status tabs (kept in sync with the sidebar nav entries) */}
      <div role="tablist" aria-label="Filter requests by status" className="flex flex-wrap gap-1.5">
        {TABS.map((tab) => {
          const active = tab.value === status;
          return (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                // Keep ?q= (and any other params) when switching status tabs.
                const params = new URLSearchParams(searchParams);
                if (tab.value) {
                  params.set("status", tab.value);
                } else {
                  params.delete("status");
                }
                setSearchParams(params);
              }}
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

      {/* Search / filter controls (??5D A2) */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search requester name, email, request ID, document or reason???"
              aria-label="Search requests by requester, email, request ID, document or reason"
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
            value={decisionFilter}
            onChange={(event) =>
              setDecisionFilter(
                event.target.value as "all" | "approved" | "rejected" | "undecided",
              )
            }
            aria-label="Filter by admin decision"
            className="w-44"
          >
            <option value="all">All decisions</option>
            <option value="undecided">Awaiting decision</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
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
          description="Requests submitted by students, faculty and office staff will appear here for oversight."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No matching requests"
          description="No requests match the current filters."
          action={
            filtersActive ? (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setDocTypeId("");
                  setDecisionFilter("all");
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
            adminDecisions={adminDecisions}
          />
          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-50"
            >
              Load more requests
              <span className="text-xs text-ink-500">({remainingCount} remaining)</span>
            </button>
          )}
        </>
      )}

      {/* Approval reminder */}
      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <ShieldCheck aria-hidden className="h-3.5 w-3.5 shrink-0" />
        College Main Faculty can approve or reject each request. Decisions are recorded
        in this browser and shown across the Admin portal.
        <Eye aria-hidden className="ml-1 h-3.5 w-3.5 shrink-0" />
      </p>
    </div>
  );
}
