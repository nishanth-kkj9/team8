import { useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, Clock3, Inbox, MailCheck, Search, UserPlus, XCircle } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useAdminDecisions } from "../../../hooks/useAdminDecisions";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { StatCard } from "../../../components/ui/StatCard";
import { Input } from "../../../components/ui/Field";
import { Button } from "../../../components/ui/Button";
import { countByStatus } from "../../requester/pages/RequesterDashboardPage";
import { AdminDecisionBadge, RequestStatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateTime } from "../../../lib/date";
import type { DocDeskStatus } from "../../../types/request";

/** Status chips colours (??10.1): amber pending, blue answered, green acknowledged. */
const STATUS_BARS: ReadonlyArray<[DocDeskStatus, string, string]> = [
  ["pending", "Pending", "bg-amber-500"],
  ["answered", "Answered", "bg-blue-600"],
  ["acknowledged", "Acknowledged", "bg-emerald-600"],
];

/**
 * Screen A1 ??? College Main Faculty dashboard: institution-wide oversight,
 * status and approval counters, recent requests, distribution by document type
 * and a search control that hands off to the All Requests register.
 */
export function AdminDashboardPage() {
  const { profile } = useAuth();
  const { requests, docTypes, loading } = useDocDeskData();
  const adminDecisions = useAdminDecisions();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const counts = countByStatus(requests);
  const decisionCounts = useMemo(() => {
    let approved = 0;
    let rejected = 0;
    for (const request of requests) {
      const decision = adminDecisions[request.request_id]?.decision;
      if (decision === "approved") approved += 1;
      else if (decision === "rejected") rejected += 1;
    }
    return { approved, rejected, awaiting: requests.length - approved - rejected };
  }, [requests, adminDecisions]);

  const byType = useMemo(() => {
    const map = new Map<string, number>();
    for (const request of requests) {
      map.set(request.doc_type_name, (map.get(request.doc_type_name) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [requests]);

  const recent = useMemo(
    () =>
      [...requests]
        .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
        .slice(0, 5),
    [requests],
  );

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/admin/requests?q=${encodeURIComponent(query)}` : "/admin/requests");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description={`Read, view, approve or reject document requests across ${profile?.institution_name ?? "the institution"}.`}
        crumbs={[{ label: "Admin" }, { label: "Dashboard" }]}
      />

      {profile?.role === "admin" && <Link
        to="/admin/users/new"
        className="flex items-center justify-between gap-4 rounded-card border border-primary-200 bg-primary-50 p-4 text-primary-900 shadow-sm transition-colors hover:bg-primary-100"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-control bg-primary-600 text-white">
            <UserPlus className="h-5 w-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Create a campus account</span>
            <span className="block text-xs text-primary-700">Create a Student or Admin account and obtain the sign-in OTP.</span>
          </span>
        </span>
        <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-primary-600" />
      </Link>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Requests" value={counts.total} icon={Inbox} />
        <StatCard label="Pending" value={counts.pending} icon={Clock3} tone="amber" />
        <StatCard label="Answered" value={counts.answered} icon={MailCheck} tone="blue" />
        <StatCard
          label="Acknowledged"
          value={counts.acknowledged}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard label="Approved" value={decisionCounts.approved} icon={CheckCircle2} tone="emerald" />
        <StatCard label="Rejected" value={decisionCounts.rejected} icon={XCircle} tone="red" />
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Recent requests across the institution (??5D A1) */}
        <Card className="min-w-0 xl:col-span-3">
          <CardHeader className="flex-row items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-ink-900">Recent requests</h2>
            <Link
              to="/admin/requests"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:underline"
            >
              View all
              <ChevronRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardBody className="space-y-1">
            {loading && requests.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-500">Loading…</p>
            ) : recent.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-500">
                No requests have been submitted yet.
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {recent.map((request) => (
                  <li key={request.request_id}>
                    <Link
                      to={`/admin/requests/${request.request_id}`}
                      className="flex items-center gap-3 px-1 py-2.5 transition-colors hover:bg-primary-50/40"
                    >
                      <span className="w-20 shrink-0 font-mono text-xs font-semibold text-primary-700">
                        {request.request_id}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-ink-800">
                          {request.doc_type_name}
                          <span className="ml-1.5 text-xs font-normal text-ink-500">
                            ?? {request.requested_by_name ?? "Unknown"}
                          </span>
                        </span>
                        <span className="block text-[11px] text-ink-400">
                          {formatDateTime(request.created_at)}
                        </span>
                      </span>
                      <AdminDecisionBadge
                        decision={adminDecisions[request.request_id]?.decision}
                      />
                      <RequestStatusBadge status={request.status} />
                      <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-ink-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <div className="min-w-0 space-y-6 xl:col-span-2">
          {/* Search / filter hand-off (??5D A1) */}
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Search aria-hidden className="h-4 w-4 text-primary-700" />
                Find requests
              </h2>
            </CardHeader>
            <CardBody>
              <form onSubmit={onSearch} className="flex gap-2" noValidate>
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Requester, email, ID, document???"
                  aria-label="Search all requests"
                />
                <Button type="submit" variant="secondary">
                  Search
                </Button>
              </form>
              <p className="mt-2 text-xs text-ink-400">
                Searches the institution-wide register ??? results open in All Requests.
              </p>
            </CardBody>
          </Card>

          {/* Distribution by document type (??5D A1) */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink-900">
                Distribution by document type
              </h2>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {byType.length === 0 ? (
                <p className="text-sm text-ink-500">No requests yet.</p>
              ) : (
                byType.map(([name, value]) => {
                  const percent =
                    counts.total === 0 ? 0 : Math.round((value / counts.total) * 100);
                  return (
                    <div key={name} className="flex items-center gap-3 text-sm">
                      <span className="w-36 shrink-0 truncate text-ink-700" title={name}>
                        {name}
                      </span>
                      <span
                        role="img"
                        aria-label={`${name}: ${value} of ${counts.total}`}
                        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                      >
                        <span
                          className="block h-full rounded-full bg-primary-600"
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right tabular-nums text-ink-500">
                        {value}
                      </span>
                    </div>
                  );
                })
              )}
              {docTypes.length > 0 ? (
                <p className="pt-1 text-xs text-ink-400">
                  Across {docTypes.length} document types ??? see Document Details for the
                  read-only catalog.
                </p>
              ) : null}
            </CardBody>
          </Card>

          {/* Distribution by status (??5D A1) */}
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink-900">
                Distribution by status
              </h2>
            </CardHeader>
            <CardBody className="space-y-2.5">
              {counts.total === 0 ? (
                <p className="text-sm text-ink-500">No requests yet.</p>
              ) : (
                STATUS_BARS.map(([key, label, barClass]) => {
                  const value = counts[key];
                  const percent = Math.round((value / counts.total) * 100);
                  return (
                    <div key={key} className="flex items-center gap-3 text-sm">
                      <span className="w-36 shrink-0 truncate text-ink-700">{label}</span>
                      <span
                        role="img"
                        aria-label={`${label}: ${value} of ${counts.total}`}
                        className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100"
                      >
                        <span
                          className={`block h-full rounded-full ${barClass}`}
                          style={{ width: `${percent}%` }}
                        />
                      </span>
                      <span className="w-8 shrink-0 text-right tabular-nums text-ink-500">
                        {value}
                      </span>
                    </div>
                  );
                })
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-card border border-primary-100 bg-primary-50 px-4 py-3 text-xs text-primary-800">
        <Inbox aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          College Main Faculty reads and views every request and approves or rejects it
          from the request detail screen. Approve/reject decisions are stored in this
          browser; the CampusOS API still owns the pending → answered → acknowledged
          lifecycle.
        </p>
      </div>
    </div>
  );
}
