import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  FileQuestion,
  PencilLine,
  Settings2,
  Trash2,
} from "lucide-react";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useToast } from "../../../context/ToastContext";
import { docDeskService } from "../../../services/serviceProvider";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { RequestStatusBadge } from "../../../components/ui/StatusBadge";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RequestForm, type RequestFormValues } from "../../requests/components/RequestForm";
import { RequestTimeline } from "../../requests/components/RequestTimeline";
import { AnswerPanel } from "../../requests/components/AnswerPanel";
import { FilledFormPanel } from "../../requests/components/FilledFormPanel";
import { downloadDemoFile } from "../../../lib/download";
import { formatDateTime, formatDateOnly } from "../../../lib/date";
import { ROLE_LABELS } from "../../../types/auth";
import {
  canAcknowledge,
  canDownloadAnswerDocument,
  canDownloadFilledForm,
  canEditOwnPendingRequest,
  canWithdrawOwnPendingRequest,
} from "../../../lib/permissions";
import type { DocRequest } from "../../../types/request";

type Busy = "edit" | "withdraw" | "acknowledge" | "document" | "filled-form" | null;

/**
 * Screens R4/R5 — Request detail & tracking (§5B R4, R5): lifecycle timeline,
 * TAT panel, answer panel with optional documents, and status-dependent
 * requester actions (edit / withdraw while pending; acknowledge when answered).
 */
export function RequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { profile } = useDemoAuth();
  const { docTypes, refresh } = useDocDeskData();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [request, setRequest] = useState<DocRequest | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");

  const [busy, setBusy] = useState<Busy>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [acknowledgeOpen, setAcknowledgeOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadState("loading");
    setRequest(null);
    docDeskService
      .getRequest(requestId ?? "")
      .then((found) => {
        if (cancelled) return;
        if (found) {
          setRequest(found);
          setLoadState("ready");
        } else {
          setLoadState("notfound");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState("notfound");
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  if (loadState === "loading") {
    return <Card className="p-8 text-center text-sm text-ink-500">Loading request…</Card>;
  }

  if (loadState === "notfound" || !request) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Request not found"
        description="This request does not exist or is not visible to your account."
        action={
          <Button onClick={() => navigate("/app/requests")}>Back to My Requests</Button>
        }
      />
    );
  }

  const canEdit = canEditOwnPendingRequest(profile, request);
  const canWithdraw = canWithdrawOwnPendingRequest(profile, request);
  const canAck = canAcknowledge(profile, request);
  const canDownloadDoc = canDownloadAnswerDocument(profile, request);
  const canDownloadFilled = canDownloadFilledForm(profile, request);
  const docTypeDescription = docTypes.find(
    (docType) => docType.doc_type_id === request.doc_type_id,
  )?.description;

  const fail = (error: unknown, fallback: string) => {
    setActionError(error instanceof Error ? error.message : fallback);
    toast({
      title: "Action failed",
      description: error instanceof Error ? error.message : fallback,
      variant: "error",
    });
  };

  const onEditSubmit = async (values: RequestFormValues) => {
    setActionError(null);
    setBusy("edit");
    try {
      const updated = await docDeskService.updatePendingRequest(request.request_id, values);
      setRequest(updated);
      await refresh();
      setEditOpen(false);
      toast({
        title: `Request ${updated.request_id} updated`,
        description: "Your pending request was saved with the new details.",
        variant: "success",
      });
    } catch (error) {
      fail(error, "Could not update the request.");
    } finally {
      setBusy(null);
    }
  };

  const onWithdraw = async () => {
    setActionError(null);
    setBusy("withdraw");
    try {
      await docDeskService.withdrawPendingRequest(request.request_id);
      await refresh();
      setWithdrawOpen(false);
      toast({
        title: `Request ${request.request_id} withdrawn`,
        description: "The pending request was removed from your list.",
        variant: "success",
      });
      navigate("/app/requests");
    } catch (error) {
      fail(error, "Could not withdraw the request.");
      setWithdrawOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const onAcknowledge = async () => {
    setActionError(null);
    setBusy("acknowledge");
    try {
      const updated = await docDeskService.acknowledgeRequest(request.request_id);
      setRequest(updated);
      await refresh();
      setAcknowledgeOpen(false);
      toast({
        title: `Request ${updated.request_id} acknowledged`,
        description: "Thanks for confirming — this request is now closed.",
        variant: "success",
      });
    } catch (error) {
      fail(error, "Could not acknowledge the request.");
      setAcknowledgeOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const onDownloadDocument = async () => {
    setActionError(null);
    setBusy("document");
    try {
      const file = await docDeskService.downloadAnswerDocument(request.request_id);
      if (file) {
        downloadDemoFile(file);
      } else {
        toast({
          title: "No document attached",
          description: "This answer has no document to download.",
          variant: "info",
        });
      }
    } catch (error) {
      fail(error, "Could not download the document.");
    } finally {
      setBusy(null);
    }
  };

  const onDownloadFilledForm = async () => {
    setActionError(null);
    setBusy("filled-form");
    try {
      const file = await docDeskService.downloadFilledForm(request.request_id);
      if (file) {
        downloadDemoFile(file);
      } else {
        toast({
          title: "No filled-in form",
          description: "There is no filled-in form on this request yet.",
          variant: "info",
        });
      }
    } catch (error) {
      fail(error, "Could not download the filled-in form.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={request.request_id}
        description={request.doc_type_name}
        crumbs={[
          { label: "Requester portal", to: "/app/dashboard" },
          { label: "My Requests", to: "/app/requests" },
          { label: request.request_id },
        ]}
        actions={<RequestStatusBadge status={request.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <Settings2 aria-hidden className="h-4 w-4 text-primary-700" />
                Request details
              </h2>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <h3 className="text-xs font-medium uppercase tracking-wide text-ink-400">
                  Reason
                </h3>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-ink-800">
                  {request.reason}
                </p>
              </div>
              <dl className="grid gap-x-6 gap-y-3 border-t border-line pt-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-400">Document type</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {request.doc_type_name}
                    {docTypeDescription ? (
                      <span className="block text-xs font-normal text-ink-500">
                        {docTypeDescription}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-400">Requester</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {request.requested_by_name ?? "You"}
                    {request.requested_by_role ? (
                      <span className="text-ink-500">
                        {" "}
                        · {ROLE_LABELS[request.requested_by_role]}
                        {request.requested_by_dept ? ` · ${request.requested_by_dept}` : ""}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-400">Submitted</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {formatDateTime(request.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-400">Last updated</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {formatDateTime(request.updated_at)}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          {request.answer ? (
            <AnswerPanel
              request={request}
              onDownloadDocument={canDownloadDoc ? onDownloadDocument : undefined}
              downloadingDocument={busy === "document"}
              onDownloadFilledForm={canDownloadFilled ? onDownloadFilledForm : undefined}
              downloadingFilledForm={busy === "filled-form"}
              showFilledForm={false}
            />
          ) : null}

          {/* Screen R6 — filled-in form upload / replace / download / remove */}
          <FilledFormPanel
            request={request}
            onUpdated={setRequest}
            disabled={busy !== null}
          />
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink-900">Progress</h2>
            </CardHeader>
            <CardBody>
              <RequestTimeline request={request} />
            </CardBody>
          </Card>

          {request.tat ? (
            <Card className="border-amber-200">
              <CardHeader className="flex-row items-center gap-2">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"
                >
                  <CalendarClock className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-semibold text-ink-900">Turnaround time</h2>
                  <p className="text-xs text-ink-500">Set by {request.tat.updated_by ?? "Student Affairs"}</p>
                </div>
              </CardHeader>
              <CardBody className="space-y-1">
                <p className="text-sm font-medium text-ink-800">
                  Expected by {formatDateOnly(request.tat.expected_by)}
                </p>
                {request.tat.note ? (
                  <p className="text-xs leading-5 text-ink-500">{request.tat.note}</p>
                ) : null}
                {request.tat.updated_at ? (
                  <p className="text-xs text-ink-400">
                    Updated {formatDateTime(request.tat.updated_at)}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink-900">Actions</h2>
            </CardHeader>
            <CardBody className="space-y-2">
              {request.status === "pending" && canEdit ? (
                <>
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setActionError(null);
                      setEditOpen(true);
                    }}
                    disabled={busy !== null}
                  >
                    <PencilLine aria-hidden className="h-4 w-4" />
                    Edit request
                  </Button>
                  {canWithdraw ? (
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={() => {
                        setActionError(null);
                        setWithdrawOpen(true);
                      }}
                      disabled={busy !== null}
                    >
                      <Trash2 aria-hidden className="h-4 w-4" />
                      Withdraw request
                    </Button>
                  ) : null}
                  <p className="pt-1 text-xs leading-5 text-ink-500">
                    Pending requests can be edited or withdrawn until Student Affairs answers.
                  </p>
                </>
              ) : null}

              {request.status === "answered" && canAck ? (
                <>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setActionError(null);
                      setAcknowledgeOpen(true);
                    }}
                    disabled={busy !== null}
                  >
                    <CheckCircle2 aria-hidden className="h-4 w-4" />
                    Acknowledge answer
                  </Button>
                  <p className="pt-1 text-xs leading-5 text-ink-500">
                    Acknowledging confirms you have received this answer
                    {request.document ? " and its document" : ""}. The request closes
                    afterwards and can no longer be changed.
                  </p>
                </>
              ) : null}

              {request.status === "acknowledged" ? (
                <p className="text-xs leading-5 text-ink-500">
                  This request is closed. You can still review the answer and download its
                  documents above.
                </p>
              ) : null}

              {actionError ? (
                <p role="alert" className="text-xs text-red-600">
                  {actionError}
                </p>
              ) : null}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Edit pending request */}
      <Modal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title={`Edit request ${request.request_id}`}
      >
        <EditForm
          request={request}
          busy={busy === "edit"}
          formError={actionError}
          onSubmit={onEditSubmit}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Withdraw confirmation (§9.2) */}
      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title={`Withdraw request ${request.request_id}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setWithdrawOpen(false)} disabled={busy === "withdraw"}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={busy === "withdraw"} onClick={onWithdraw}>
              Withdraw request
            </Button>
          </>
        }
      >
        <p>
          This permanently removes your pending request for{" "}
          <strong>{request.doc_type_name}</strong> from DocDesk. This cannot be undone —
          if you still need the document you will have to submit a new request.
        </p>
      </Modal>

      {/* Acknowledge confirmation (§9.2) */}
      <Modal
        open={acknowledgeOpen}
        onClose={() => setAcknowledgeOpen(false)}
        title={`Acknowledge request ${request.request_id}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAcknowledgeOpen(false)} disabled={busy === "acknowledge"}>
              Cancel
            </Button>
            <Button isLoading={busy === "acknowledge"} onClick={onAcknowledge}>
              Acknowledge
            </Button>
          </>
        }
      >
        <p>
          Confirm you have received Student Affairs' answer
          {request.document ? " and its attached document" : ""} for{" "}
          <strong>{request.doc_type_name}</strong>. The request will be marked{" "}
          <strong>acknowledged</strong> and closed — no further changes are possible
          afterwards.
        </p>
      </Modal>
    </div>
  );
}

/** Inner form so the modal remounts with fresh state each time it opens. */
function EditForm({
  request,
  busy,
  formError,
  onSubmit,
  onCancel,
}: {
  request: DocRequest;
  busy: boolean;
  formError: string | null;
  onSubmit: (values: RequestFormValues) => void;
  onCancel: () => void;
}) {
  const { docTypes } = useDocDeskData();
  const activeTypes = useMemo(
    () => docTypes.filter((docType) => docType.status === "active"),
    [docTypes],
  );
  return (
    <RequestForm
      docTypes={activeTypes}
      mode="edit"
      idPrefix={`edit-${request.request_id}`}
      initial={{ doc_type_id: request.doc_type_id, reason: request.reason }}
      submitLabel="Save changes"
      submitting={busy}
      formError={formError}
      onSubmit={onSubmit}
      onCancel={onCancel}
    />
  );
}
