import { useMemo, useState } from "react";
import { Files, SearchX, ShieldCheck } from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { PageHeader } from "../../../components/layout/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { DocTypeStatusBadge } from "../../../components/ui/StatusBadge";
import { formatDateOnly } from "../../../lib/date";
import { cn } from "../../../lib/cn";
import { Button } from "../../../components/ui/Button";
import type { DocumentTypeStatus } from "../../../types/document";

type Filter = "all" | DocumentTypeStatus;

/**
 * Admin "Document Details" (??4.4 item 3) ??? the document type catalog in
 * read-only. Admin can browse active and archived types; create / edit /
 * archive / restore / delete stay with Student Affairs (??5C SA4) and the API
 * rejects any Admin mutation with 403.
 */
export function AdminDocumentTypesPage() {
  const { docTypes, loading, error, refresh } = useDocDeskData();
  const [filter, setFilter] = useState<Filter>("all");

  const counts = useMemo(
    () => ({
      all: docTypes.length,
      active: docTypes.filter((t) => t.status === "active").length,
      archived: docTypes.filter((t) => t.status === "archived").length,
    }),
    [docTypes],
  );

  const filtered = useMemo(
    () => (filter === "all" ? docTypes : docTypes.filter((t) => t.status === filter)),
    [docTypes, filter],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Details"
        description="The catalog of documents requesters can ask for ??? read-only for Admin. Curation (add, edit, archive, restore, delete) belongs to Student Affairs."
        crumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Document Details" }]}
      />

      <div role="tablist" aria-label="Filter document types by status" className="flex flex-wrap gap-1.5">
        {(
          [
            { value: "all" as Filter, label: "All" },
            { value: "active" as Filter, label: "Active" },
            { value: "archived" as Filter, label: "Archived" },
          ]
        ).map((tab) => {
          const active = tab.value === filter;
          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(tab.value)}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary-700 bg-primary-700 text-white shadow-sm"
                  : "border-line bg-surface text-ink-600 hover:border-primary-300 hover:text-primary-800",
              )}
            >
              {tab.label}
              <span className={cn("ml-1.5 text-xs", active ? "text-primary-100" : "text-ink-400")}>
                {counts[tab.value]}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <div role="alert" className="flex flex-col gap-3 rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Could not load document types. {error}</span>
          <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
            {loading ? "Retrying…" : "Retry"}
          </Button>
        </div>
      ) : null}

      {error ? null : loading && docTypes.length === 0 ? (
        <div className="rounded-card border border-line bg-surface p-8 text-center text-sm text-ink-500 shadow-card">
          Loading document types???
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Files}
          title={filter === "archived" ? "No archived types" : "No document types"}
          description={
            filter === "archived"
              ? "Nothing is archived right now ??? every type is requestable."
              : "Document types created by Student Affairs will appear here."
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-line bg-surface shadow-card">
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead className="border-b border-line bg-slate-50/80 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th scope="col" className="px-4 py-3 font-medium">Name</th>
                <th scope="col" className="px-4 py-3 font-medium">Description</th>
                <th scope="col" className="px-4 py-3 font-medium">Status</th>
                <th scope="col" className="px-4 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((docType) => (
                <tr key={docType.doc_type_id} className="transition-colors hover:bg-primary-50/40">
                  <td className="px-4 py-3 font-medium text-ink-900">
                    {docType.name}
                    {docType.created_by ? (
                      <span className="block text-[11px] font-normal text-ink-400">
                        by {docType.created_by}
                      </span>
                    ) : null}
                  </td>
                  <td className="max-w-[26rem] px-4 py-3 text-xs text-ink-600">
                    {docType.description ?? <span className="text-ink-400">???</span>}
                  </td>
                  <td className="px-4 py-3">
                    <DocTypeStatusBadge status={docType.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                    {docType.created_at ? formatDateOnly(docType.created_at) : "???"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-xs text-ink-400">
        <ShieldCheck aria-hidden className="h-3.5 w-3.5 shrink-0" />
        Read-only view ??? no document type actions are available to Admin.
        {filter === "all" && docTypes.length === 0 && !loading ? (
          <SearchX aria-hidden className="ml-1 h-3.5 w-3.5 shrink-0" />
        ) : null}
      </p>
    </div>
  );
}
