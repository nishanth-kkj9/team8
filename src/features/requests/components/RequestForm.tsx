import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { LIMITS, validateReason } from "../../../lib/validation";
import { Button } from "../../../components/ui/Button";
import { Field, Textarea } from "../../../components/ui/Field";
import type { DocType } from "../../../types/document";

export interface RequestFormValues {
  doc_type_id: string;
  reason: string;
}

interface RequestFormProps {
  /** Active document types offered in the selection buttons (??5B R2). */
  docTypes: DocType[];
  mode: "create" | "edit";
  initial?: Partial<RequestFormValues>;
  submitLabel: string;
  submitting?: boolean;
  submitDisabled?: boolean;
  documentTypesLoading?: boolean;
  documentTypesError?: string | null;
  documentTypeDisabled?: boolean;
  onRetryDocumentTypes?: () => void;
  formError?: string | null;
  onSubmit: (values: RequestFormValues) => void | Promise<void>;
  onCancel?: () => void;
  /** Unique input id prefix so the create page and edit modal never collide. */
  idPrefix?: string;
  /** Create mode shows the read-only requester details block (??5B R2). */
  showRequesterDetails?: boolean;
}

/**
 * Shared request form for creating a request and editing a pending one
 * (??9.1: active document type required; reason 5???1,000 characters).
 */
export function RequestForm({
  docTypes,
  mode,
  initial,
  submitLabel,
  submitting = false,
  submitDisabled = false,
  documentTypesLoading = false,
  documentTypesError = null,
  documentTypeDisabled = false,
  onRetryDocumentTypes,
  formError = null,
  onSubmit,
  onCancel,
  idPrefix = "request-form",
  showRequesterDetails = false,
}: RequestFormProps) {
  const { profile } = useDemoAuth();
  const [docTypeId, setDocTypeId] = useState(initial?.doc_type_id ?? "");
  const [reason, setReason] = useState(initial?.reason ?? "");
  const [errors, setErrors] = useState<{ doc_type_id?: string; reason?: string }>({});

  const activeDocTypes = docTypes.filter((type) => type.status === "active");
  const selectedType = activeDocTypes.find((t) => t.doc_type_id === docTypeId);
  const reasonLength = reason.length;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: { doc_type_id?: string; reason?: string } = {};
    if (!selectedType || selectedType.status !== "active") {
      next.doc_type_id = "Select the document type you need.";
    }
    const reasonError = validateReason(reason);
    if (reasonError) {
      next.reason = reasonError;
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || !selectedType || selectedType.status !== "active") return;
    await onSubmit({ doc_type_id: selectedType.doc_type_id, reason: reason.trim() });
  };

  return (
    <div className="space-y-4">
      {documentTypesLoading ? (
        <div role="status" className="flex items-center gap-2 rounded-control border border-line bg-slate-50/60 p-3 text-sm text-ink-500">
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          Loading active document types…
        </div>
      ) : null}
      {documentTypesError ? (
        <div role="alert" className="space-y-3 rounded-control border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <p className="flex items-start gap-2"><AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />{documentTypesError}</p>
          {onRetryDocumentTypes ? (
            <Button type="button" variant="secondary" onClick={onRetryDocumentTypes} disabled={submitting}>
              <RefreshCw aria-hidden className="h-4 w-4" /> Retry
            </Button>
          ) : null}
        </div>
      ) : null}
      {mode === "create" && !documentTypesLoading && !documentTypesError && activeDocTypes.length === 0 ? (
        <div role="status" className="rounded-control border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-medium">No active document types are currently available.</p>
          <p className="mt-1">Please contact Admin.</p>
        </div>
      ) : null}
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
      {formError ? (
        <div
          role="alert"
          className="rounded-control border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {formError}
        </div>
      ) : null}

      {showRequesterDetails && profile ? (
        <fieldset className="rounded-control border border-line bg-slate-50/60 px-4 py-3">
          <legend className="px-1 text-xs font-medium uppercase tracking-wide text-ink-500">
            Requester details
          </legend>
          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-400">Name</dt>
              <dd className="font-medium text-ink-800">{profile.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-400">Email</dt>
              <dd className="truncate font-medium text-ink-800">{profile.email_id}</dd>
            </div>
            {profile.role === "student" && profile.usn ? (
              <div>
                <dt className="text-xs text-ink-400">USN</dt>
                <dd className="font-medium text-ink-800">{profile.usn}</dd>
              </div>
            ) : null}
            {profile.dept ? (
              <div>
                <dt className="text-xs text-ink-400">Department</dt>
                <dd className="font-medium text-ink-800">{profile.dept}</dd>
              </div>
            ) : null}
          </dl>
        </fieldset>
      ) : null}

      <fieldset
        id={`${idPrefix}-doc-type`}
        aria-describedby={errors.doc_type_id ? `${idPrefix}-doc-type-error` : selectedType?.description ? `${idPrefix}-doc-type-hint` : undefined}
        aria-invalid={!!errors.doc_type_id || undefined}
        className="flex flex-col gap-2"
      >
        <legend className="text-sm font-medium text-ink-700">
          Document type <span className="text-red-600">*</span>
        </legend>
        <div role="group" aria-label="Available document types" className="grid gap-2 sm:grid-cols-2">
          {activeDocTypes.map((type) => {
            const selected = docTypeId === type.doc_type_id;
            return (
              <button
                key={type.doc_type_id}
                type="button"
                aria-pressed={selected}
                disabled={submitting || documentTypeDisabled}
                onClick={() => {
                  setDocTypeId(type.doc_type_id);
                  if (errors.doc_type_id) setErrors((current) => ({ ...current, doc_type_id: undefined }));
                }}
                className={`min-h-11 rounded-control border px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-primary-700 bg-primary-700 text-white" : "border-line bg-white text-ink-900 hover:border-primary-400 hover:bg-primary-50"}`}
              >
                {type.name}
              </button>
            );
          })}
        </div>
        {errors.doc_type_id ? <p id={`${idPrefix}-doc-type-error`} role="alert" className="text-xs text-red-600">{errors.doc_type_id}</p> : null}
        {selectedType?.description ? <p id={`${idPrefix}-doc-type-hint`} className="text-xs text-ink-500">{selectedType.description}</p> : null}
      </fieldset>

      <Field
        label="Reason for requesting this document"
        htmlFor={`${idPrefix}-reason`}
        required
        error={errors.reason}
        hint={`${reasonLength} / ${LIMITS.reasonMax} characters${
          mode === "edit" ? " Only the document type and reason can change while a request is pending." : ""
        }`}
      >
        <Textarea
          id={`${idPrefix}-reason`}
          name="reason"
          value={reason}
          maxLength={LIMITS.reasonMax}
          onChange={(event) => {
            setReason(event.target.value);
            if (errors.reason) setErrors((current) => ({ ...current, reason: undefined }));
          }}
          invalid={!!errors.reason}
          placeholder="Explain why you need this document..."
          rows={5}
          disabled={submitting}
          aria-describedby={`${idPrefix}-reason-count`}
        />
        <span id={`${idPrefix}-reason-count`} className="text-xs text-ink-500" aria-live="polite">
          {reasonLength} / {LIMITS.reasonMax}
        </span>
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
        <Button
          type="submit"
          isLoading={submitting}
          disabled={submitDisabled || (mode === "create" && (!selectedType || selectedType.status !== "active"))}
        >
          {submitLabel}
        </Button>
      </div>
      </form>
    </div>
  );
}
