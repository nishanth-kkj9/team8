import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import type { DocRequest } from "../../types/request";
import { RequestStatusBadge } from "../ui/StatusBadge";
import { formatDateTime, formatDateOnly } from "../../lib/date";
import { ROLE_LABELS } from "../../types/auth";

function preview(text: string, max = 72): string {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function ReasonPreview({ reason }: { reason: string }) {
  return (
    <span title={reason} className="block max-w-[24rem] truncate text-ink-600">
      {preview(reason)}
    </span>
  );
}

interface RequestTableProps {
  requests: DocRequest[];
  /** Detail route prefix; requesters link into /app, Student Affairs into /sa. */
  detailPathPrefix?: string;
  /** SA queue view: show requester name / email / role · dept columns (§5C SA2). */
  showRequester?: boolean;
  /** Bulk-TAT selection (§5C SA2): pending rows only. Omit on other views. */
  selectable?: boolean;
  selectedIds?: ReadonlySet<string>;
  onToggleSelect?: (requestId: string) => void;
}

/**
 * Requests list (§5B R3 / §5C SA2): wide data table on desktop, compact cards
 * on mobile (§10.2). Rows link to the portal's request detail page. When
 * `selectable` is set, a leading checkbox column appears for the SA bulk-TAT
 * flow — only pending rows can be checked.
 */
export function RequestTable({
  requests,
  detailPathPrefix = "/app/requests",
  showRequester = false,
  selectable = false,
  selectedIds,
  onToggleSelect,
}: RequestTableProps) {
  const detailHref = (requestId: string) => `${detailPathPrefix}/${requestId}`;

  return (
    <>
      {/* Desktop / tablet table. overflow-x-auto (not hidden) so dense
          columns scroll inside the card instead of clipping the Actions
          column or blowing out the page (Phase 6 responsive QA). */}
      <div className="hidden overflow-x-auto rounded-card border border-line bg-surface shadow-card md:block">
        <table className="w-full min-w-[56rem] text-left text-sm">
          <thead className="border-b border-line bg-slate-50/80 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              {selectable ? (
                <th scope="col" className="w-10 px-4 py-3">
                  <span className="sr-only">Select for bulk TAT</span>
                </th>
              ) : null}
              <th scope="col" className="px-4 py-3 font-medium">Request</th>
              {showRequester ? (
                <th scope="col" className="px-4 py-3 font-medium">Requester</th>
              ) : null}
              <th scope="col" className="px-4 py-3 font-medium">Document</th>
              <th scope="col" className="px-4 py-3 font-medium">Reason</th>
              <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
              <th scope="col" className="px-4 py-3 font-medium">Expected by</th>
              <th scope="col" className="px-4 py-3 font-medium">Status</th>
              <th scope="col" className="px-4 py-3 font-medium">Updated</th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {requests.map((request) => (
              <tr key={request.request_id} className="transition-colors hover:bg-primary-50/40">
                {selectable ? (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds?.has(request.request_id) ?? false}
                      disabled={request.status !== "pending"}
                      onChange={() => onToggleSelect?.(request.request_id)}
                      aria-label={`Select ${request.request_id} for bulk TAT`}
                      className="h-3.5 w-3.5 rounded border-line accent-primary-700 disabled:opacity-40"
                    />
                  </td>
                ) : null}
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    to={detailHref(request.request_id)}
                    className="font-mono text-xs font-semibold text-primary-700 hover:underline"
                  >
                    {request.request_id}
                  </Link>
                </td>
                {showRequester ? (
                  <td className="max-w-[14rem] px-4 py-3">
                    <span className="block truncate text-sm font-medium text-ink-800">
                      {request.requested_by_name ?? "Unknown"}
                    </span>
                    <span className="block truncate text-xs text-ink-500">
                      {request.requested_by}
                    </span>
                    <span className="block truncate text-[11px] text-ink-400">
                      {request.requested_by_role
                        ? ROLE_LABELS[request.requested_by_role]
                        : ""}
                      {request.requested_by_dept
                        ? ` · ${request.requested_by_dept}`
                        : ""}
                    </span>
                  </td>
                ) : null}
                <td className="px-4 py-3 font-medium text-ink-800">
                  <Link
                    to={detailHref(request.request_id)}
                    className="hover:text-accent-700 hover:underline"
                  >
                    {request.doc_type_name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-xs">
                  <ReasonPreview reason={request.reason} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                  {formatDateTime(request.created_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                  {request.tat ? formatDateOnly(request.tat.expected_by) : "—"}
                </td>
                <td className="px-4 py-3">
                  <RequestStatusBadge status={request.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                  <span title={`Updated ${formatDateTime(request.updated_at)}`}>
                    {formatDateTime(request.updated_at)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={detailHref(request.request_id)}
                    aria-label={`View request ${request.request_id}`}
                    className="inline-flex rounded-control p-1.5 text-ink-400 transition-colors hover:bg-primary-100 hover:text-primary-800"
                  >
                    <ChevronRight aria-hidden className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2 md:hidden">
        {requests.map((request) => (
          <li key={request.request_id}>
            <Link
              to={detailHref(request.request_id)}
              className="block rounded-card border border-line bg-surface px-4 py-3 shadow-card transition-colors hover:border-accent-300"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-primary-700">
                  {request.request_id}
                </span>
                <RequestStatusBadge status={request.status} />
              </span>
              <span className="mt-1.5 block truncate text-sm font-medium text-ink-900">
                {request.doc_type_name}
              </span>
              {showRequester ? (
                <span className="mt-0.5 block truncate text-xs text-ink-500">
                  {request.requested_by_name}
                  {request.requested_by_dept ? ` · ${request.requested_by_dept}` : ""}
                </span>
              ) : null}
              <span className="mt-0.5 block truncate text-xs text-ink-500">
                {preview(request.reason, 60)}
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
                <span>Submitted {formatDateTime(request.created_at)}</span>
                {request.tat ? (
                  <span>Expected by {formatDateOnly(request.tat.expected_by)}</span>
                ) : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
