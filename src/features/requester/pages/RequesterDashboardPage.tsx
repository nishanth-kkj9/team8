import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Clock3,
  FilePlus2,
  FileText,
  Inbox,
  MailCheck,
  UserRound,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { StatCard } from "../../../components/ui/StatCard";
import { RequestTable } from "../../../components/requests/RequestTable";
import { roleLine } from "../../../lib/display";
import type { DocRequest } from "../../../types/request";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const QUICK_LINKS = [
  {
    to: "/app/requests/new",
    label: "Request a Document",
    description: "Submit a new request to Student Affairs.",
    icon: FilePlus2,
  },
  {
    to: "/app/requests",
    label: "My Requests",
    description: "Track, edit and acknowledge your requests.",
    icon: FileText,
  },
  {
    to: "/app/profile",
    label: "My Profile",
    description: "Your CampusOS profile details.",
    icon: UserRound,
  },
] as const;

/**
 * Screen R1 ??? Requester dashboard (??5B R1): live status counters from the mock
 * service, primary CTA, recent requests, quick links, and TAT display.
 */
export function RequesterDashboardPage() {
  const { profile } = useAuth();
  const { requests, loading } = useDocDeskData();

  const firstName = profile?.name.split(/\s+/)[0] ?? "there";
  const counts = countByStatus(requests);
  const recent = requests.slice(0, 4);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        description="Track your document requests from submission to acknowledgement."
        crumbs={[{ label: "Requester portal" }, { label: "Dashboard" }]}
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

      <section aria-labelledby="quick-links-heading" className="space-y-3">
        <h2 id="quick-links-heading" className="text-sm font-semibold text-ink-900">
          Quick links
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUICK_LINKS.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.to}
                to={link.to}
                className="group flex items-center gap-3 rounded-card border border-line bg-surface px-4 py-3.5 shadow-card transition-colors hover:border-accent-300"
              >
                <span
                  aria-hidden
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-primary-50 text-primary-700 transition-colors group-hover:bg-accent-100 group-hover:text-accent-700"
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-ink-900">{link.label}</span>
                  <span className="block truncate text-xs text-ink-500">
                    {link.description}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className="h-4 w-4 shrink-0 text-ink-400 transition-transform group-hover:translate-x-0.5"
                />
              </Link>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="recent-requests-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="recent-requests-heading" className="text-sm font-semibold text-ink-900">
            Recent requests
          </h2>
          <Link
            to="/app/requests"
            className="text-sm font-medium text-accent-700 hover:underline"
          >
            View all in My Requests
          </Link>
        </div>
        {loading && requests.length === 0 ? (
          <Card className="p-8 text-center text-sm text-ink-500">Loading…</Card>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No requests yet"
            description="When you request a document it will appear here with its live status."
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
        ) : (
          <RequestTable requests={recent} />
        )}
      </section>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-ink-900">Demo profile</h2>
        <p className="mt-1 text-xs text-ink-500">{roleLine(profile!)}</p>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-xs uppercase tracking-wide text-ink-400">Name</dt>
            <dd className="font-medium text-ink-800">{profile?.name}</dd>
          </div>
          <div className="flex justify-between gap-4 sm:block">
            <dt className="text-xs uppercase tracking-wide text-ink-400">Email</dt>
            <dd className="truncate font-medium text-ink-800">{profile?.email_id}</dd>
          </div>
          {profile?.usn ? (
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-xs uppercase tracking-wide text-ink-400">USN</dt>
              <dd className="font-medium text-ink-800">{profile.usn}</dd>
            </div>
          ) : null}
          {profile?.dept ? (
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-xs uppercase tracking-wide text-ink-400">Department</dt>
              <dd className="font-medium text-ink-800">{profile.dept}</dd>
            </div>
          ) : null}
          {profile?.designation ? (
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-xs uppercase tracking-wide text-ink-400">Designation</dt>
              <dd className="font-medium text-ink-800">{profile.designation}</dd>
            </div>
          ) : null}
        </dl>
      </Card>
    </div>
  );
}

export function countByStatus(requests: DocRequest[]): {
  total: number;
  pending: number;
  answered: number;
  acknowledged: number;
} {
  let pending = 0;
  let answered = 0;
  let acknowledged = 0;
  for (const request of requests) {
    if (request.status === "pending") pending += 1;
    else if (request.status === "answered") answered += 1;
    else acknowledged += 1;
  }
  return { total: requests.length, pending, answered, acknowledged };
}
