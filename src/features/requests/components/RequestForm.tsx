import { useState, type FormEvent } from "react";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { LIMITS, validateReason } from "../../../lib/validation";
import { Button } from "../../../components/ui/Button";
import { Field, Select, Textarea } from "../../../components/ui/Field";
import type { DocType } from "../../../types/document";

export interface RequestFormValues {
  doc_type_id: string;
  reason: string;
}

interface RequestFormProps {
  /** Active document types offered in the dropdown (§5B R2). */
  docTypes: DocType[];
  mode: "create" | "edit";
  initial?: Partial<RequestFormValues>;
  submitLabel: string;
  submitting?: boolean;
  formError?: string | null;
  onSubmit: (values: RequestFormValues) => void | Promise<void>;
  onCancel?: () => void;
  /** Unique input id prefix so the create page and edit modal never collide. */
  idPrefix?: string;
  /** Create mode shows the read-only requester details block (§5B R2). */
  showRequesterDetails?: boolean;
}

/**
 * Shared request form for creating a request and editing a pending one
 * (§9.1: active document type required; reason 5–1,000 characters).
 */
export function RequestForm({
  docTypes,
  mode,
  initial,
  submitLabel,
  submitting = false,
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

  const selectedType = docTypes.find((t) => t.doc_type_id === docTypeId);
  const reasonLength = reason.length;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const next: { doc_type_id?: string; reason?: string } = {};
    if (!docTypeId) {
      next.doc_type_id = "Select the document type you need.";
    }
    const reasonError = validateReason(reason);
    if (reasonError) {
      next.reason = reasonError;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await onSubmit({ doc_type_id: docTypeId, reason });
  };

  return (
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

      <Field
        label="Document type"
        htmlFor={`${idPrefix}-doc-type`}
        required
        error={errors.doc_type_id}
        hint={selectedType?.description}
      >
        <Select
          id={`${idPrefix}-doc-type`}
          name="doc_type_id"
          value={docTypeId}
          onChange={(event) => setDocTypeId(event.target.value)}
          invalid={!!errors.doc_type_id}
        >
          <option value="" disabled>
            Select a document type…
          </option>
          {docTypes.map((docType) => (
            <option key={docType.doc_type_id} value={docType.doc_type_id}>
              {docType.name}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Reason"
        htmlFor={`${idPrefix}-reason`}
        required
        error={errors.reason}
        hint={`${reasonLength} / ${LIMITS.reasonMax} characters${
          mode === "edit" ? " — only the document type and reason can change while a request is pending." : ""
        }`}
      >
        <Textarea
          id={`${idPrefix}-reason`}
          name="reason"
          value={reason}
          maxLength={LIMITS.reasonMax}
          onChange={(event) => setReason(event.target.value)}
          invalid={!!errors.reason}
          placeholder="Explain why you need this document (5–1,000 characters)…"
          rows={5}
        />
      </Field>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" isLoading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
