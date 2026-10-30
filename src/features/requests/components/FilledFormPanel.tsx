import { useRef, useState, type ChangeEvent } from "react";
import { CloudUpload, FileUp, Lock, TriangleAlert } from "lucide-react";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useToast } from "../../../context/ToastContext";
import { docDeskService } from "../../../services/serviceProvider";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { FileMetadataCard } from "./FileMetadataCard";
import { validateFilledFormFile } from "../../../lib/validation";
import { downloadDemoFile } from "../../../lib/download";
import {
  canDownloadFilledForm,
  canRemoveFilledForm,
  canUploadFilledForm,
} from "../../../lib/permissions";
import type { DocRequest } from "../../../types/request";

type Busy = "upload" | "remove" | "download" | null;

/**
 * Screen R6 — Filled-in Form upload (§5B R6). Lives on the requester's request
 * detail page once the request is answered. Upload / replace / download /
 * remove are only enabled while the API's lifecycle conditions hold: the
 * request is `answered`, an answer document exists, and it is not yet
 * acknowledged. Unmet conditions render an explanatory disabled state instead
 * of a dead upload button.
 */
export function FilledFormPanel({
  request,
  onUpdated,
  disabled = false,
}: {
  request: DocRequest;
  /** Called with the refreshed request after upload/remove succeeds. */
  onUpdated: (updated: DocRequest) => void;
  /** Parent detail page is running another action. */
  disabled?: boolean;
}) {
  const { profile } = useDemoAuth();
  const { refresh } = useDocDeskData();
  const { toast } = useToast();

  const [busy, setBusy] = useState<Busy>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canUpload = canUploadFilledForm(profile, request);
  const canRemove = canRemoveFilledForm(profile, request);
  const canDownload = canDownloadFilledForm(profile, request);
  const isAcknowledged = request.status === "acknowledged";
  const replacing = !!request.filled_form;

  const onFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    event.target.value = ""; // allow re-selecting the same file later
    if (!selected) return;

    // Client-side file-type / size gate (mirrors the API: PDF, DOCX, JPEG,
    // PNG; max 10 MB). The mock service re-validates.
    const error = validateFilledFormFile(selected);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);
    setBusy("upload");
    try {
      const updated = await docDeskService.uploadFilledForm(
        request.request_id,
        selected,
      );
      onUpdated(updated);
      await refresh();
      toast({
        title: replacing
          ? "Filled-in form replaced"
          : "Filled-in form uploaded",
        description: `${updated.request_id} now carries "${selected.name}". Student Affairs can review it under Filled Forms to Review.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Upload failed",
        description: err instanceof Error ? err.message : "Could not upload the filled-in form.",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const onRemove = async () => {
    setBusy("remove");
    try {
      const updated = await docDeskService.removeFilledForm(request.request_id);
      onUpdated(updated);
      await refresh();
      setRemoveOpen(false);
      toast({
        title: "Filled-in form removed",
        description: `You can upload a new filled-in form on ${updated.request_id} before acknowledging it.`,
        variant: "success",
      });
    } catch (err) {
      toast({
        title: "Remove failed",
        description: err instanceof Error ? err.message : "Could not remove the filled-in form.",
        variant: "error",
      });
      setRemoveOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const onDownload = async () => {
    setBusy("download");
    try {
      const file = await docDeskService.downloadFilledForm(request.request_id);
      if (file) downloadDemoFile(file);
    } catch (err) {
      toast({
        title: "Download failed",
        description: err instanceof Error ? err.message : "Could not download the filled-in form.",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const actionLocked = disabled || busy !== null;

  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <span
          aria-hidden
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-50 text-accent-700"
        >
          <FileUp className="h-4 w-4" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Filled-in form</h2>
          <p className="text-xs text-ink-500">
            Upload the completed form Student Affairs asked you to fill in.
          </p>
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        {/* Explanatory disabled states — never a dead upload button (§5B R6). */}
        {request.status === "pending" ? (
          <p className="rounded-control border border-dashed border-line bg-slate-50/60 px-3 py-2.5 text-xs leading-5 text-ink-500">
            This request is still pending. Once Student Affairs answers it with an
            attached document, you can upload the filled-in form here.
          </p>
        ) : isAcknowledged && !request.filled_form ? (
          <p className="rounded-control border border-dashed border-line bg-slate-50/60 px-3 py-2.5 text-xs leading-5 text-ink-500">
            No filled-in form was uploaded before this request was acknowledged.
          </p>
        ) : request.status === "answered" && !request.document ? (
          <p className="rounded-control border border-dashed border-line bg-slate-50/60 px-3 py-2.5 text-xs leading-5 text-ink-500">
            Student Affairs answered this request without an attached document. A
            filled-in form can only be uploaded once the answer includes the form to
            complete.
          </p>
        ) : null}

        {request.filled_form ? (
          <FileMetadataCard
            label="Current filled-in form"
            icon={FileUp}
            file={request.filled_form}
            onDownload={canDownload ? onDownload : undefined}
            downloading={busy === "download"}
          />
        ) : null}

        {canUpload ? (
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              id="filled-form-upload"
              type="file"
              accept=".pdf,.docx,.jpg,.jpeg,.png,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
              onChange={onFileChange}
              aria-label="Upload filled-in form (PDF, DOCX, JPEG or PNG up to 10 MB)"
              className="sr-only"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={actionLocked}
                isLoading={busy === "upload"}
              >
                {!busy && <CloudUpload aria-hidden className="h-3.5 w-3.5" />}
                {replacing ? "Replace filled-in form" : "Upload filled-in form"}
              </Button>
              {canRemove ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    setFileError(null);
                    setRemoveOpen(true);
                  }}
                  disabled={actionLocked}
                >
                  Remove
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-ink-500">
              {replacing
                ? "Uploading again replaces the current file — the previous upload is discarded."
                : "PDF, Word (.docx), JPEG or PNG · max 10 MB."}
              {!isAcknowledged ? " You can still replace or remove it before acknowledging." : ""}
            </p>
            {fileError ? (
              <p role="alert" className="flex items-start gap-1.5 text-xs text-red-600">
                <TriangleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {fileError}
              </p>
            ) : null}
          </div>
        ) : isAcknowledged && request.filled_form ? (
          <p className="flex items-start gap-1.5 text-xs leading-5 text-ink-500">
            <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
            This request is acknowledged — the filled-in form is kept for records and
            can no longer be replaced or removed.
          </p>
        ) : null}
      </CardBody>

      {/* Remove confirmation (§9.2) */}
      <Modal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        title="Remove the filled-in form?"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRemoveOpen(false)}
              disabled={busy === "remove"}
            >
              Cancel
            </Button>
            <Button variant="danger" isLoading={busy === "remove"} onClick={onRemove}>
              Remove form
            </Button>
          </>
        }
      >
        <p>
          This removes <strong>{request.filled_form?.filename}</strong> from{" "}
          <strong>{request.request_id}</strong>. Student Affairs will no longer see a
          returned form — you can upload a replacement any time before acknowledging
          the request.
        </p>
      </Modal>
    </Card>
  );
}
