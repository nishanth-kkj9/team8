import { useMemo, useState, type FormEvent } from "react";
import {
  Archive,
  ArchiveRestore,
  FilePlus2,
  Files,
  PencilLine,
  SearchX,
  Trash2,
} from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useToast } from "../../../context/ToastContext";
import { docDeskService } from "../../../services/serviceProvider";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Button } from "../../../components/ui/Button";
import { Field, Input, Textarea } from "../../../components/ui/Field";
import { Modal } from "../../../components/ui/Modal";
import { EmptyState } from "../../../components/ui/EmptyState";
import { DocTypeStatusBadge } from "../../../components/ui/StatusBadge";
import { LIMITS, validateDocTypeName } from "../../../lib/validation";
import { formatDateOnly } from "../../../lib/date";
import { cn } from "../../../lib/cn";
import type { DocType, DocumentTypeStatus } from "../../../types/document";

type Filter = "all" | DocumentTypeStatus;
type Busy = "create" | "update" | "status" | "delete" | null;

/**
 * Screen SA4 ??? Document Type Manager (??5C SA4, starred bonus). Student Affairs
 * curates the requestable catalog: add, edit, archive, restore and delete.
 * Archived types disappear from requester dropdowns but existing requests keep
 * their stored document label.
 */
export function DocumentTypesPage() {
  const { docTypes, refresh } = useDocDeskData();
  const { toast } = useToast();

  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState<Busy>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DocType | null>(null);
  const [deleting, setDeleting] = useState<DocType | null>(null);

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

  const fail = (error: unknown, fallback: string) => {
    toast({
      title: "Action failed",
      description: error instanceof Error ? error.message : fallback,
      variant: "error",
    });
  };

  const onToggleStatus = async (docType: DocType) => {
    const nextStatus: DocumentTypeStatus =
      docType.status === "active" ? "archived" : "active";
    setBusy("status");
    try {
      await docDeskService.updateDocumentType(docType.doc_type_id, {
        status: nextStatus,
      });
      await refresh();
      toast({
        title: `"${docType.name}" ${nextStatus === "archived" ? "archived" : "restored"}`,
        description:
          nextStatus === "archived"
            ? "It no longer appears in new request forms. Existing requests are unaffected."
            : "It is requestable again and appears in new request forms.",
        variant: "success",
      });
    } catch (error) {
      fail(error, "Could not change the document type status.");
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async () => {
    if (!deleting) return;
    setBusy("delete");
    try {
      await docDeskService.deleteDocumentType(deleting.doc_type_id);
      await refresh();
      toast({
        title: `"${deleting.name}" deleted`,
        description: "The document type was removed from the catalog.",
        variant: "success",
      });
      setDeleting(null);
    } catch (error) {
      fail(error, "Could not delete the document type.");
      setDeleting(null);
    } finally {
      setBusy(null);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const openEdit = (docType: DocType) => {
    setEditing(docType);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Document Types"
        description="The catalog of documents requesters can ask for. Archived types are hidden from new requests until restored."
        crumbs={[
          { label: "Student Affairs", to: "/sa/dashboard" },
          { label: "Document Types" },
        ]}
        actions={
          <Button onClick={openCreate} disabled={busy !== null}>
            <FilePlus2 aria-hidden className="h-4 w-4" />
            Add document type
          </Button>
        }
      />

      {/* Active / Archived filters (??5C SA4) */}
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

      {filtered.length === 0 ? (
        <EmptyState
          icon={Files}
          title={filter === "archived" ? "No archived types" : "No document types"}
          description={
            filter === "archived"
              ? "Nothing is archived right now ??? every type is requestable."
              : "Add the first document type so requesters can submit requests."
          }
          action={
            filter === "all" ? (
              <Button variant="secondary" onClick={openCreate} disabled={busy !== null}>
                <FilePlus2 aria-hidden className="h-4 w-4" />
                Add document type
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table ??? scrolls horizontally inside the card when the
              viewport is narrow instead of clipping row actions. */}
          <div className="hidden overflow-x-auto rounded-card border border-line bg-surface shadow-card md:block">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line bg-slate-50/80 text-xs uppercase tracking-wide text-ink-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Name</th>
                  <th scope="col" className="px-4 py-3 font-medium">Description</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Created</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Actions</th>
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
                    <td className="max-w-[22rem] px-4 py-3 text-xs text-ink-600">
                      {docType.description ?? <span className="text-ink-400">???</span>}
                    </td>
                    <td className="px-4 py-3">
                      <DocTypeStatusBadge status={docType.status} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-ink-500">
                      {docType.created_at ? formatDateOnly(docType.created_at) : "???"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(docType)}
                          disabled={busy !== null}
                        >
                          <PencilLine aria-hidden className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => onToggleStatus(docType)}
                          disabled={busy !== null}
                        >
                          {docType.status === "active" ? (
                            <>
                              <Archive aria-hidden className="h-3.5 w-3.5" />
                              Archive
                            </>
                          ) : (
                            <>
                              <ArchiveRestore aria-hidden className="h-3.5 w-3.5" />
                              Restore
                            </>
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => setDeleting(docType)}
                          disabled={busy !== null}
                        >
                          <Trash2 aria-hidden className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <ul className="space-y-2 md:hidden">
            {filtered.map((docType) => (
              <li
                key={docType.doc_type_id}
                className="rounded-card border border-line bg-surface px-4 py-3 shadow-card"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink-900">{docType.name}</span>
                  <DocTypeStatusBadge status={docType.status} />
                </div>
                {docType.description ? (
                  <p className="mt-1 text-xs leading-5 text-ink-500">{docType.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button variant="secondary" size="sm" onClick={() => openEdit(docType)} disabled={busy !== null}>
                    <PencilLine aria-hidden className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onToggleStatus(docType)} disabled={busy !== null}>
                    {docType.status === "active" ? (
                      <>
                        <Archive aria-hidden className="h-3.5 w-3.5" />
                        Archive
                      </>
                    ) : (
                      <>
                        <ArchiveRestore aria-hidden className="h-3.5 w-3.5" />
                        Restore
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    onClick={() => setDeleting(docType)}
                    disabled={busy !== null}
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Create / edit modal (??5C SA4 validation: name 3???80, unique; description optional).
          The `key` remounts the form with fresh state whenever the target changes. */}
      <DocTypeFormModal
        key={formOpen ? `open-${editing?.doc_type_id ?? "new"}` : "closed"}
        open={formOpen}
        editing={editing}
        busy={busy === "create" || busy === "update"}
        existingNames={docTypes.map((t) => t.name)}
        onClose={() => setFormOpen(false)}
        onSaved={async (saved, mode) => {
          await refresh();
          setFormOpen(false);
          toast({
            title: mode === "create" ? `"${saved.name}" added` : `"${saved.name}" updated`,
            description:
              mode === "create"
                ? "It is active and appears in requester dropdowns immediately."
                : "The document type details were saved.",
            variant: "success",
          });
        }}
        onFail={fail}
        onBusyChange={setBusy}
      />

      {/* Delete confirmation (??9.2) */}
      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title={`Delete "${deleting?.name ?? ""}"?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)} disabled={busy === "delete"}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={busy === "delete"} onClick={onDelete}>
              Delete type
            </Button>
          </>
        }
      >
        <p>
          This permanently removes the document type from the catalog. New requests
          will no longer be able to select it.
        </p>
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-ink-500">
          <SearchX aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Existing requests keep their stored document label, so history stays
          readable. If you only want to hide it from new requests, archive it instead.
        </p>
      </Modal>
    </div>
  );
}

/** Add / edit form. The parent passes a `key` so this remounts with fresh state
    whenever the modal is opened for a different document type. */
function DocTypeFormModal({
  open,
  editing,
  busy,
  existingNames,
  onClose,
  onSaved,
  onFail,
  onBusyChange,
}: {
  open: boolean;
  editing: DocType | null;
  busy: boolean;
  existingNames: string[];
  onClose: () => void;
  onSaved: (saved: DocType, mode: "create" | "update") => void | Promise<void>;
  onFail: (error: unknown, fallback: string) => void;
  onBusyChange: (busy: Busy) => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [errors, setErrors] = useState<{ name?: string }>({});

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nameError = validateDocTypeName(name);
    const trimmed = name.trim().toLowerCase();
    if (
      !nameError &&
      existingNames.some(
        (existing) =>
          existing.toLowerCase() === trimmed &&
          existing.toLowerCase() !== (editing?.name ?? "").toLowerCase(),
      )
    ) {
      setErrors({ name: `A document type named "${name.trim()}" already exists.` });
      return;
    }
    if (nameError) {
      setErrors({ name: nameError });
      return;
    }
    setErrors({});
    onBusyChange(editing ? "update" : "create");
    try {
      const saved = editing
        ? await docDeskService.updateDocumentType(editing.doc_type_id, {
            name: name.trim(),
            description: description.trim() || undefined,
          })
        : await docDeskService.createDocumentType({
            name: name.trim(),
            description: description.trim() || undefined,
          });
      await onSaved(saved, editing ? "update" : "create");
    } catch (error) {
      onFail(error, "Could not save the document type.");
    } finally {
      onBusyChange(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Edit "${editing.name}"` : "Add document type"}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" form="doc-type-form" isLoading={busy}>
            {editing ? "Save changes" : "Add type"}
          </Button>
        </>
      }
    >
      <form id="doc-type-form" onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field
          label="Name"
          htmlFor="doc-type-name"
          required
          error={errors.name}
          hint={
            errors.name
              ? undefined
              : `${LIMITS.docTypeNameMin}???${LIMITS.docTypeNameMax} characters, unique across the catalog.`
          }
        >
          <Input
            id="doc-type-name"
            value={name}
            maxLength={LIMITS.docTypeNameMax}
            onChange={(event) => setName(event.target.value)}
            invalid={!!errors.name}
            placeholder="e.g. Character Certificate"
            autoFocus
          />
        </Field>
        <Field
          label="Description"
          htmlFor="doc-type-description"
          hint="Optional ??? shown to requesters next to the type in dropdown hints."
        >
          <Textarea
            id="doc-type-description"
            value={description}
            maxLength={300}
            rows={3}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="e.g. Issued for visa and bank account purposes."
          />
        </Field>
      </form>
    </Modal>
  );
}
