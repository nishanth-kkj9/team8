import { MailCheck } from "lucide-react";
import type { DocRequest } from "../../../types/request";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { formatDateTime } from "../../../lib/date";
import { FileMetadataCard } from "./FileMetadataCard";

interface AnswerPanelProps {
  request: DocRequest;
  onDownloadDocument?: () => void;
  downloadingDocument?: boolean;
  onDownloadFilledForm?: () => void;
  downloadingFilledForm?: boolean;
  /** Hide the returned filled-form row when a dedicated R6 panel renders it. */
  showFilledForm?: boolean;
}

/**
 * Answer & document panel (??5B R5): the Student Affairs response message,
 * responder details, and the optional answer document / returned filled-in
 * form as metadata cards with download actions. The message is always
 * present; documents are optional.
 */
export function AnswerPanel({
  request,
  onDownloadDocument,
  downloadingDocument = false,
  onDownloadFilledForm,
  downloadingFilledForm = false,
  showFilledForm = true,
}: AnswerPanelProps) {
  const answer = request.answer;
  if (!answer) return null;

  const wasEdited = !!answer.updated_at && answer.updated_at !== answer.answered_at;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700"
        >
          <MailCheck className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Answer from Student Affairs</h2>
          <p className="text-xs text-ink-500">
            {answer.answered_by_name ?? "Student Affairs"} ??{" "}
            {answer.answered_at ? formatDateTime(answer.answered_at) : ""}
            {wasEdited ? ` ?? edited ${answer.updated_at ? formatDateTime(answer.updated_at) : ""}` : ""}
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="whitespace-pre-wrap text-sm leading-6 text-ink-700">{answer.message}</p>

        {request.document ? (
          <FileMetadataCard
            label="Answer document"
            file={request.document}
            onDownload={onDownloadDocument}
            downloading={downloadingDocument}
          />
        ) : (
          <p className="rounded-control border border-dashed border-line bg-slate-50/60 px-3 py-2 text-xs text-ink-500">
            No document was attached to this answer.
          </p>
        )}

        {showFilledForm && request.filled_form ? (
          <FileMetadataCard
            label="Filled-in form (returned)"
            file={request.filled_form}
            onDownload={onDownloadFilledForm}
            downloading={downloadingFilledForm}
          />
        ) : null}
      </CardBody>
    </Card>
  );
}
