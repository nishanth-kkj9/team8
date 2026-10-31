import { Link } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Files,
  Inbox,
  MailCheck,
  AlertTriangle,
} from "lucide-react";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { PageHeader } from "../../../components/layout/PageHeader";
import { RequestStatusBadge } from "../../../components/ui/StatusBadge";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { StatCard } from "../../../components/ui/StatCard";
import { countByStatus } from "../../requester/pages/RequesterDashboardPage";
import { formatDateOnly, formatDateTime, todayDateOnly, dateOnlyFromToday } from "../../../lib/date";
import { actsAsStudentAffairs } from "../../../lib/permissions";
import type { DocRequest } from "../../../types/request";

const NEWEST_FIRST = (a: { created_at: string }, b: { created_at: string }) =>
  a.created_at < b.created_at ? 1 : -1;

function QueueRow({ request }: { request: DocRequest }) {
  return (
    <li>
      <Link
        to={`/admin/requests/${request.request_id}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-line px-3 py-2.5 transition-colors hover:border-accent-300 hover:bg-primary-50/40"
      >
        <span className="font-mono text-xs font-semibold text-primary-700">
          {request.request_id}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-ink-800">
            {request.doc_type_name}
          </span>
          <span className="block truncate text-xs text-ink-500">
            {request.requested_by_name} ?? {request.requested_by_dept ?? request.requested_by_role}
          </span>
        </span>
        <RequestStatusBadge status={request.status} />
      </Link>
    </li>
  );
}

function AttentionRow({
  request,
  tone,
  note,
}: {
  request: DocRequest;
  tone: "amber" | "blue" | "emerald";
  note: string;
}) {
  const toneStyles = {
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-800 border-emerald-200",
  } as const;
  return (
    <li>
      <Link
        to={`/admin/requests/${request.request_id}`}
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-control border border-line px-3 py-2.5 transition-colors hover:border-accent-300 hover:bg-primary-50/40"
      >
        <span className="font-mono text-xs font-semibold text-primary-700">
          {request.request_id}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs text-ink-600">
          {request.doc_type_name} ?? {request.requested_by_name}
        </span>
        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${toneStyles[tone]}`}>
          {note}
        </span>
      </Link>
    </li>
  );
}

/**
 * Screen SA1 ??? Student Affairs dashboard (??5C SA1): institution-wide counters,
 * operational panels (latest pending, TAT attention, awaiting-requester,
 * returned forms, recent responses) and quick actions.
 */
export function SaDashboardPage() {
  const { profile } = useDemoAuth();
  const { requests, loading } = useDocDeskData();
  const isSaDesk = actsAsStudentAffairs(profile);

  const counts = countByStatus(requests);
  const firstName = profile?.name.split(/\s+/)[0] ?? "there";

  const pending = requests.filter((r) => r.status === "pending");
  const latestPending = [...pending].sort(NEWEST_FIRST).slice(0, 5);

  // Frontend-derived TAT attention (??5C SA1: no API "overdue" field exists).
  const today = todayDateOnly();
  const soonCutoff = dateOnlyFromToday(3);
  const tatAttention = pending
    .filter((r) => r.tat && r.tat.expected_by <= soonCutoff)
    .sort((a, b) => (a.tat!.expected_by < b.tat!.expected_by ? -1 : 1));

  const awaitingRequester = requests.filter(
    (r) => r.status === "answered" && !!r.document && !r.filled_form,
  );
  const returnedForms = requests.filter(
    (r) => r.status === "answered" && !!r.document && !!r.filled_form,
  );

  const recentResponses = requests
    .filter((r) => r.answer)
    .sort((a, b) =>
      (a.answer!.answered_at ?? "") < (b.answer!.answered_at ?? "") ? 1 : -1,
    )
    .slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin dashboard"
        description={
          isSaDesk
            ? `Welcome, ${firstName} ??? institution-wide document request operations.`
            : `Welcome, ${firstName} ??? read every request and maintain the document-type catalog.`
        }
        crumbs={[
          { label: "Admin" },
          { label: "Dashboard" },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Requests" value={counts.total} icon={Inbox} />
        <StatCard label="Pending" value={counts.pending} icon={Clock3} tone="amber" />
        <StatCard label="Answered" value={counts.answered} icon={MailCheck} tone="blue" />
        <StatCard
          label="Acknowledged"
          value={counts.acknowledged}
          icon={CheckCircle2}
          tone="emerald"
        />
      </div>

      <section aria-labelledby="sa-quick-actions" className="space-y-3">
        <h2 id="sa-quick-actions" className="text-sm font-semibold text-ink-900">
          Quick actions
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              to: "/admin/requests?status=pending",
              label: "Open Pending Queue",
              description: `${counts.pending} waiting for a response`,
              icon: ClipboardCheck,
            },
            {
              to: "/admin/document-types",
              label: "Manage Document Types",
              description: "Catalog of requestable documents",
              icon: Files,
            },
            {
              to: "/admin/turnaround-time",
              label: "Set TAT",
              description: "Expected-by dates for pending requests",
              icon: CalendarClock,
            },
          ].filter((action) => isSaDesk || action.to !== "/admin/turnaround-time").map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.to}
                to={action.to}
                className="group flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-accent-300"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-700 transition-colors group-hover:bg-accent-100 group-hover:text-accent-700"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink-900">{action.label}</span>
                  <span className="block truncate text-xs text-ink-500">{action.description}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* min-w-0 keeps truncated quote text from inflating this grid
            item's min-content width and blowing out the layout (??Phase 6). */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <section aria-labelledby="sa-latest-pending" className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 id="sa-latest-pending" className="text-sm font-semibold text-ink-900">
                Latest pending requests
              </h2>
              <Link
                to="/admin/requests?status=pending"
                className="text-sm font-medium text-accent-700 hover:underline"
              >
                Open pending queue
              </Link>
            </div>
            {loading && requests.length === 0 ? (
              <Card className="p-8 text-center text-sm text-ink-500">Loading demo data???</Card>
            ) : latestPending.length === 0 ? (
              <Card className="p-8 text-center text-sm text-ink-500">
                Nothing pending ??? every request has been answered.
              </Card>
            ) : (
              <ul className="space-y-2">
                {latestPending.map((request) => (
                  <QueueRow key={request.request_id} request={request} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="sa-recent-responses" className="space-y-3">
            <h2 id="sa-recent-responses" className="text-sm font-semibold text-ink-900">
              Recent responses
            </h2>
            {recentResponses.length === 0 ? (
              <Card className="p-6 text-center text-sm text-ink-500">
                No answers have been sent yet.
              </Card>
            ) : (
              <ul className="space-y-2">
                {recentResponses.map((request) => (
                  <li key={request.request_id}>
                    <Link
                      to={`/admin/requests/${request.request_id}`}
                      className="block rounded-control border border-line px-3 py-2.5 transition-colors hover:border-accent-300 hover:bg-primary-50/40"
                    >
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="font-mono text-xs font-semibold text-primary-700">
                          {request.request_id}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm text-ink-800">
                          {request.doc_type_name} ?? {request.requested_by_name}
                        </span>
                        <span className="text-xs text-ink-400">
                          {request.answer!.answered_at
                            ? formatDateTime(request.answer!.answered_at)
                            : ""}
                        </span>
                        <RequestStatusBadge status={request.status} />
                      </span>
                      <span className="mt-1 block truncate text-xs text-ink-500">
                        ???{request.answer!.message}???
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <section aria-labelledby="sa-needs-attention" className="space-y-3">
          <h2 id="sa-needs-attention" className="text-sm font-semibold text-ink-900">
            Needs attention
          </h2>
          {isSaDesk ? (
            <Card>
              <CardHeader className="flex-row items-center gap-2">
                <AlertTriangle aria-hidden className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                  TAT due soon / overdue
                </h3>
              </CardHeader>
              <CardBody>
                {tatAttention.length === 0 ? (
                  <p className="text-xs text-ink-500">
                    No pending requests are due within 3 days.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {tatAttention.map((request) => (
                      <AttentionRow
                        key={request.request_id}
                        request={request}
                        tone={request.tat!.expected_by < today ? "amber" : "blue"}
                        note={
                          request.tat!.expected_by < today
                            ? `Overdue ??? was due ${formatDateOnly(request.tat!.expected_by)}`
                            : `Due ${formatDateOnly(request.tat!.expected_by)}`
                        }
                      />
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <MailCheck aria-hidden className="h-4 w-4 text-blue-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Waiting for requester
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-xs text-ink-500">
                Answered with a document, no filled-in form yet:{" "}
                <strong className="text-ink-800">{awaitingRequester.length}</strong>
              </p>
              {awaitingRequester.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {awaitingRequester.slice(0, 3).map((request) => (
                    <AttentionRow
                      key={request.request_id}
                      request={request}
                      tone="blue"
                      note="Awaiting form"
                    />
                  ))}
                </ul>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center gap-2">
              <ClipboardCheck aria-hidden className="h-4 w-4 text-emerald-600" />
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-500">
                Returned forms to review
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-xs text-ink-500">
                Requesters returned a filled-in form:{" "}
                <strong className="text-ink-800">{returnedForms.length}</strong>
              </p>
              {returnedForms.length > 0 ? (
                <ul className="mt-2 space-y-2">
                  {returnedForms.slice(0, 3).map((request) => (
                    <AttentionRow
                      key={request.request_id}
                      request={request}
                      tone="emerald"
                      note="Form returned"
                    />
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-ink-400">
                  Returned forms are listed under Filled Forms to Review.
                </p>
              )}
            </CardBody>
          </Card>
        </section>
      </div>

      <div className="flex items-start gap-2 rounded-card border border-primary-100 bg-primary-50 px-4 py-3 text-xs text-primary-800">
        <Inbox aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          Student Affairs ??? DocDesk processing desk. You are signed in as {profile?.name}
          {profile && actsAsStudentAffairs(profile)
            ? " ??? office staff in Student Affairs, the central processing role. Answer requests from the queue or a request page."
            : "."}
        </p>
      </div>
    </div>
  );
}
