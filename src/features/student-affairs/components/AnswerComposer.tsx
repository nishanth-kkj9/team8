import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Paperclip, Send, X } from "lucide-react";
import { LIMITS, validateAnswerFile } from "../../../lib/validation";
import { Button } from "../../../components/ui/Button";
import { Field, Textarea } from "../../../components/ui/Field";
import { FileMetadataCard } from "../../requests/components/FileMetadataCard";
import { formatFileSize } from "../../../lib/display";
import type { DocRequest } from "../../../types/request";

/**
 * Optional response templates (§5C SA3). Message presets only — they never
 * change the request's API status, which always becomes `answered`.
 */
const RESPONSE_TEMPLATES: ReadonlyArray<{ label: string; text: string }> = [
  {
    label: "Approved",
    text: "Your request is approved. Please find the document attached.",
  },
  {
    label: "Cannot be issued",
    text: "The requested document cannot be issued because …",
  },
  {
    label: "Fill and return",
    text: "Please complete the attached form and upload the filled-in form back here.",
  },
  {
    label: "Ready for collection",
    text: "Your document is ready for collection at the Student Affairs counter (Mon–Fri, 10 AM–4 PM).",
  },
];

export interface AnswerInput {
  message: string;
  document?: File;
  remove_document?: boolean;
}

interface AnswerComposerProps {
  mode: "create" | "edit";
  request: DocRequest;
  busy: boolean;
  formError: string | null;
  onSubmit: (input: AnswerInput) => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Answer composer (§5C SA3): required message (1–2,000 characters with
 * counter), optional answer document (PDF/DOCX, max 10 MB) and — in edit
 * mode — replacement or removal of the previously attached document.
 */
export function AnswerComposer({
  mode,
  request,
  busy,
  formError,
  onSubmit,
  onCancel,
}: AnswerComposerProps) {
  const [message, setMessage] = useState(request.answer?.message ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [removeDocument, setRemoveDocument] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = ""; // allow re-selecting the same file later
    if (!selected) {
      setFile(null);
      return;
    }
    const error = validateAnswerFile(selected);
    if (error) {
      setFileError(error);
      setFile(null);
      return;
    }
    setFileError(null);
    setFile(selected);
    setRemoveDocument(false);
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (
      trimmed.length < LIMITS.answerMessageMin ||
      trimmed.length > LIMITS.answerMessageMax
    ) {
      setMessageError(
        `Response message must be ${LIMITS.answerMessageMin}–${LIMITS.answerMessageMax} characters.`,
      );
      return;
    }
    setMessageError(null);
    await onSubmit({
      message: trimmed,
      document: file ?? undefined,
      remove_document:
        mode === "edit" && !file && removeDocument && !!request.document
          ? true
          : undefined,
    });
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

      {mode === "create" ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-ink-400">
            Response templates
          </p>
          <div className="flex flex-wrap gap-1.5">
            {RESPONSE_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => {
                  setMessage(template.text);
                  setMessageError(null);
                }}
                disabled={busy}
                className="rounded-full border border-line bg-slate-50 px-3 py-1 text-xs text-ink-600 transition-colors hover:border-accent-300 hover:bg-accent-50 hover:text-accent-800 disabled:opacity-50"
              >
                {template.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <Field
        label="Response message"
        htmlFor="answer-message"
        required
        error={messageError ?? undefined}
        hint={
          messageError
            ? undefined
            : `${message.trim().length} / ${LIMITS.answerMessageMax} characters`
        }
      >
        <Textarea
          id="answer-message"
          value={message}
          maxLength={LIMITS.answerMessageMax}
          onChange={(event) => setMessage(event.target.value)}
          invalid={!!messageError}
          rows={6}
          placeholder="Write the response the requester will see. An answer may approve, explain non-issuance, give form instructions or collection details…"
        />
      </Field>

      <div className="space-y-2">
        <input
          ref={fileInputRef}
          id="answer-document"
          type="file"
          accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={onFileChange}
          aria-label="Attach answer document (optional, PDF or DOCX up to 10 MB)"
          className="sr-only"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
          >
            <Paperclip aria-hidden className="h-3.5 w-3.5" />
            {mode === "edit" && request.document
              ? "Replace document"
              : file
                ? "Choose another file"
                : "Attach document (optional)"}
          </Button>
          <span className="text-xs text-ink-400">PDF or DOCX, max 10 MB</span>
        </div>

        {file ? (
          <div className="flex items-center gap-2 rounded-control border border-accent-200 bg-accent-50 px-3 py-2 text-xs text-accent-900">
            <Paperclip aria-hidden className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-medium" title={file.name}>
              {file.name}
            </span>
            <span className="shrink-0 text-accent-700">{formatFileSize(file.size)}</span>
            <button
              type="button"
              aria-label="Remove selected file"
              onClick={clearFile}
              disabled={busy}
              className="rounded p-0.5 hover:bg-accent-100 disabled:opacity-50"
            >
              <X aria-hidden className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {fileError ? (
          <p role="alert" className="text-xs text-red-600">
            {fileError}
          </p>
        ) : null}

        {mode === "edit" && request.document ? (
          <>
            <FileMetadataCard label="Currently attached document" file={request.document} />
            <label className="flex w-fit items-center gap-2 text-xs text-ink-600">
              <input
                type="checkbox"
                checked={removeDocument}
                disabled={busy || !!file}
                onChange={(event) => setRemoveDocument(event.target.checked)}
                className="h-3.5 w-3.5 rounded border-line accent-red-600"
              />
              Remove the attached document when saving
            </label>
          </>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" isLoading={busy}>
          {!busy && <Send aria-hidden className="h-4 w-4" />}
          {mode === "create" ? "Send Answer" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
