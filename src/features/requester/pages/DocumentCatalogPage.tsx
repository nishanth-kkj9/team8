import { useEffect, useState } from "react";
import { ArrowLeft, Files } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { PageHeader } from "../../../components/layout/PageHeader";
import { EmptyState } from "../../../components/ui/EmptyState";
import { DocTypeStatusBadge } from "../../../components/ui/StatusBadge";
import { docDeskService } from "../../../services/serviceProvider";
import type { DocType } from "../../../types/document";

export function DocumentCatalogPage() {
  const { docTypeId } = useParams();
  const [items, setItems] = useState<DocType[]>([]);
  const [selected, setSelected] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    if (docTypeId) {
      setSelected(null);
      void docDeskService.getDocumentType(docTypeId).then((result) => {
        if (!cancelled) setSelected(result);
      }).catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load this document type.");
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    } else {
      void (async () => {
        try {
          const all: DocType[] = [];
          const seen = new Set<string>();
          let cursor: string | undefined;
          do {
            const page = await docDeskService.listDocumentTypes({ limit: 100, ...(cursor ? { cursor } : {}) });
            all.push(...page.items);
            cursor = page.next_cursor ?? undefined;
            if (cursor && seen.has(cursor)) throw new Error("CampusOS returned a repeated document type page cursor.");
            if (cursor) seen.add(cursor);
          } while (cursor);
          if (!cancelled) setItems(all);
        } catch (reason) {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not load document types.");
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
    }
    return () => { cancelled = true; };
  }, [docTypeId]);

  if (docTypeId) {
    return <div className="space-y-6">
      <PageHeader title={selected?.name ?? "Document type details"} description="Document type information from the CampusOS catalog." crumbs={[{ label: "Student", to: "/app/dashboard" }, { label: "Document Types", to: "/app/document-types" }, { label: selected?.name ?? "Details" }]} />
      <Link to="/app/document-types" className="inline-flex h-10 items-center justify-center gap-2 rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink-700 hover:bg-primary-50 hover:text-primary-800"><ArrowLeft aria-hidden className="h-4 w-4" />Back to document types</Link>
      {loading ? <div className="rounded-card border border-line bg-surface p-6 text-sm text-ink-500">Loading document type…</div> : error ? <div role="alert" className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load document type. {error}</div> : !selected ? <EmptyState icon={Files} title="Document type not found" description="This document type may have been removed from the catalog." /> : <article className="rounded-card border border-line bg-surface p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-ink-900">{selected.name}</h2><DocTypeStatusBadge status={selected.status} /></div>
        <p className="whitespace-pre-wrap text-sm leading-6 text-ink-600">{selected.description || "No additional details are available."}</p>
        <dl className="mt-6 border-t border-line pt-4 text-sm"><dt className="text-xs uppercase tracking-wide text-ink-400">Document type ID</dt><dd className="mt-1 break-all text-ink-700">{selected.doc_type_id}</dd></dl>
      </article>}
    </div>;
  }

  return <div className="space-y-6">
    <PageHeader title="Document Types" description="Browse the document types available in the CampusOS catalog." crumbs={[{ label: "Student", to: "/app/dashboard" }, { label: "Document Types" }]} />
    {loading ? <div className="rounded-card border border-line bg-surface p-6 text-sm text-ink-500">Loading document types…</div> : error ? <div role="alert" className="rounded-card border border-red-200 bg-red-50 p-4 text-sm text-red-800">Could not load document types. {error}</div> : items.length === 0 ? <EmptyState icon={Files} title="No document types" description="No document types are currently listed in the catalog." /> : <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => <Link key={item.doc_type_id} to={`/app/document-types/${encodeURIComponent(item.doc_type_id)}`} className="rounded-card border border-line bg-surface p-5 shadow-card transition hover:border-primary-300 hover:shadow-md"><div className="mb-3 flex items-start justify-between gap-2"><h2 className="font-semibold text-ink-900">{item.name}</h2><DocTypeStatusBadge status={item.status} /></div><p className="line-clamp-3 text-sm text-ink-500">{item.description || "View this document type's details."}</p><span className="mt-4 inline-block text-sm font-medium text-primary-700">View details</span></Link>)}
    </div>}
  </div>;
}
