import { useMemo, useState } from "react";
import { ClipboardCheck, Download, Eye, FileText, Inbox } from "lucide-react";
import { Link } from "react-router-dom";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useToast } from "../../../context/ToastContext";
import { docDeskService } from "../../../services/serviceProvider";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Button } from "../../../components/ui/Button";
import { EmptyState } from "../../../components/ui/EmptyState";
import { downloadDemoFile } from "../../../lib/download";
import { fileKindLabel, formatFileSize } from "../../../lib/display";
import { formatDateTime } from "../../../lib/date";
import { cn } from "../../../lib/cn";
import type { StoredFileMetadata } from "../../../types/document";
import type { DocRequest } from "../../../types/request";

type Tab = "awaiting" | "returned" | "acknowledged";

const TABS: ReadonlyArray<{ value: Tab; label: string }> = [
  { value: "awaiting", label: "Awaiting requester upload" },
  { value: "returned", label: "Returned form" },
  { value: "acknowledged", label: "Acknowledged / closed" },
];

function matchesTab(request: DocRequest, tab: Tab): boolean {
  switch (tab) {
    case "awaiting":
      return request.status === "answered" && !!request.document && !request.filled_form;
    case "returned":
      return request.status === "answered" && !!request.document && !!request.filled_form;
    case "acknowledged":
      return request.status === "acknowledged";
  }
}

/**
 * Screen SA6 — Filled Form Review (§5C SA6, starred bonus). Shows answered
 * requests carrying an answer document, split by whether the requester has
 * uploaded the filled-in form back, plus acknowledged records for view /
 * download only. SA can read and download filled-in forms; upload and removal
 * stay with the requester.
 */
export function SaFilledFormsPage() {
  const { requests } = useDocDeskData();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("returned");
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const counts = useMemo(
    () =>
      Object.fromEntries(
        TABS.map(({ value }) => [value, requests.filter((r) => matchesTab(r, value)).length]),
      ) as Record<Tab, number>,
    [requests],
  );

  const rows = useMemo(() => requests.filter((r) => matchesTab(r, tab)), [requests, tab]);

  const onDownload = async (request: DocRequest, kind: "document" | "filled-form") => {
    const key = `${request.request_id}:${kind}`;
    setBusyKey(key);
    try {
      const file =
        kind === "document"
          ? await docDeskService.downloadAnswerDocument(request.request_id)
          : await docDeskService.downloadFilledForm(request.request_id);
      if (file) {
        downloadDemoFile(file);
      } else {
        toast({
          title: "Nothing to download",
          description: "That file is no longer attached to the request.",
          variant: "info",
        });
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Could not download the file.",
        variant: "error",
      });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Filled Forms to Review"
        description="Requests answered with an attached form. Review returned filled-in forms, or follow up on ones still waiting for the requester."
        crumbs={[{ label: "Student Affairs", to: "/sa/dashboard" }, { label: "Filled Forms to Review" }]}
      />

      {/* Filters (§5C SA6) */}
      <div role="tablist" aria-label="Filter filled forms by stage" className="flex flex-wrap gap-1.5">
        {TABS.map(({ value, label }) => {
          const active = value === tab;
          return (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary-700 bg-primary-700 text-white shadow-sm"
                  : "border-line bg-surface text-ink-600 hover:border-primary-300 hover:text-primary-800",
              )}
            >
              {label}
              <span className={cn("ml-1.5 text-xs", active ? "text-primary-100" : "text-ink-400")}>
                {counts[value]}
              </span>
            </button>
          );
        })}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={tab === "returned" ? ClipboardCheck : Inbox}
          title={
            tab === "awaiting"
              ? "Nothing waiting on requesters"
              : tab === "returned"
                ? "No returned forms right now"
                : "No acknowledged records yet"
          }
          description={
            tab === "awaiting"
              ? "Answer a request with an attached document and it will appear here until the requester uploads the filled-in form."
              : tab === "returned"
                ? "When requesters upload filled-in forms, they land here for review and download."
                : "Acknowledged requests with their documents remain available here for view and download."
          }
          action={
            tab === "returned" ? (
              <Link
                to="/sa/requests?status=answered"
                className="inline-flex h-10 items-center rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-50"
              >
                Open answered queue
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table — scrolls horizontally inside the card when the
              viewport is narrow instead of clipping the download actions. */}
          <div className="hidden overflow-x-auto rounded-card border border-line bg-surface shadow-card md:block">
            <table className="w-full min-w-[52rem] text-left text-sm">
              <thead className="border-b border-line bg-slate-50/80 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Request</th>
                  <th scope="col" className="px-4 py-3 font-medium">Requester</th>
                  <th scope="col" className="px-4 py-3 font-medium">Answer document</th>
                  <th scope="col" className="px-4 py-3 font-medium">Filled-in form</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last update</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((request) => (
                  <tr key={request.request_id} className="transition-colors hover:bg-primary-50/40">
                    <td className="px-4 py-3">
                      <Link
                        to={`/sa/requests/${request.request_id}`}
                        className="font-mono text-xs font-semibold text-primary-700 hover:underline"
                      >
                        {request.request_id}
                      </Link>
                      <span className="block text-xs text-ink-600">{request.doc_type_name}</span>
                    </td>
                    <td className="max-w-[12rem] px-4 py-3">
                      <span className="block truncate text-sm font-medium text-ink-800">
                        {request.requested_by_name ?? "Unknown"}
                      </span>
                      <span className="block truncate text-xs text-ink-500">{request.requested_by}</span>
                    </td>
                    <td className="px-4 py-3">
                      {request.document ? (
                        <FileCell
                          file={request.document}
                          busy={busyKey === `${request.request_id}:document`}
                          onDownload={() => onDownload(request, "document")}
                        />
                      ) : (
                        <span className="text-xs text-ink-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {request.filled_form ? (
                        <FileCell
                          file={request.filled_form}
                          busy={busyKey === `${request.request_id}:filled-form`}
                          onDownload={() => onDownload(request, "filled-form")}
                          uploadedLabel={
                            request.updated_at ? `uploaded ${formatDateTime(request.updated_at)}` : undefined
                          }
                        />
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                          Waiting for requester
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                      {formatDateTime(request.updated_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/sa/requests/${request.request_id}`}
                        aria-label={`View request ${request.request_id}`}
                        className="inline-flex items-center gap-1 rounded-control px-2 py-1 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
                      >
                        <Eye aria-hidden className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {rows.map((request) => (
              <li key={request.request_id} className="rounded-card border border-line bg-surface px-4 py-3 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <Link
                    to={`/sa/requests/${request.request_id}`}
                    className="font-mono text-xs font-semibold text-primary-700 hover:underline"
                  >
                    {request.request_id}
                  </Link>
                  <span className="truncate text-xs text-ink-500">{request.requested_by_name ?? "Unknown"}</span>
                </div>
                <p className="mt-1 text-sm font-medium text-ink-900">{request.doc_type_name}</p>
                <div className="mt-2 space-y-2">
                  {request.document ? (
                    <FileCell
                      file={request.document}
                      busy={busyKey === `${request.request_id}:document`}
                      onDownload={() => onDownload(request, "document")}
                    />
                  ) : null}
                  {request.filled_form ? (
                    <FileCell
                      file={request.filled_form}
                      busy={busyKey === `${request.request_id}:filled-form`}
                      onDownload={() => onDownload(request, "filled-form")}
                      uploadedLabel={
                        request.updated_at ? `uploaded ${formatDateTime(request.updated_at)}` : undefined
                      }
                    />
                  ) : (
                    <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                      Waiting for requester
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Filename + type + size with a download affordance (§5C SA6 details). */
function FileCell({
  file,
  busy,
  onDownload,
  uploadedLabel,
}: {
  file: StoredFileMetadata;
  busy: boolean;
  onDownload: () => void;
  uploadedLabel?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <FileText aria-hidden className="h-3.5 w-3.5 shrink-0 text-primary-700" />
        <span className="min-w-0 max-w-[12rem] truncate text-xs font-medium text-ink-800" title={file.filename}>
          {file.filename}
        </span>
      </div>
      <p className="text-[11px] text-ink-400">
        {fileKindLabel(file.content_type)} · {formatFileSize(file.size_bytes)}
        {uploadedLabel ? ` · ${uploadedLabel}` : ""}
      </p>
      <Button variant="secondary" size="sm" onClick={onDownload} isLoading={busy}>
        {!busy && <Download aria-hidden className="h-3 w-3" />}
        Download
      </Button>
    </div>
  );
}
