import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CalendarClock,
  FileQuestion,
  MailCheck,
  Settings2,
  UserRound,
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
import { AnswerPanel } from "../../requests/components/AnswerPanel";
import { RequestTimeline } from "../../requests/components/RequestTimeline";
import {
  AnswerComposer,
  type AnswerInput,
} from "../components/AnswerComposer";
import { downloadDemoFile } from "../../../lib/download";
import { formatDateTime, formatDateOnly } from "../../../lib/date";
import { ROLE_LABELS } from "../../../types/auth";
import {
  canAnswerRequest,
  canDownloadAnswerDocument,
  canDownloadFilledForm,
  canSetTat,
  isStudentAffairs,
} from "../../../lib/permissions";
import type { DocRequest } from "../../../types/request";

type Busy = "send" | "edit" | "withdraw" | "document" | "filled-form" | null;

/**
 * Screen SA3 ??? Request review & answer (??5C SA3): full request review area,
 * answer composer for pending requests, edit/withdraw answer until
 * acknowledgement, and view-only state afterwards.
 */
export function SaRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { profile } = useDemoAuth();
  const { refresh } = useDocDeskData();
  const { toast } = useToast();

  const [request, setRequest] = useState<DocRequest | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");
  const [busy, setBusy] = useState<Busy>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

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
    return <Card className="p-8 text-center text-sm text-ink-500">Loading request???</Card>;
  }

  if (loadState === "notfound" || !request) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="Request not found"
        description="This request does not exist or is not visible to your account."
        action={<Button onClick={() => window.history.back()}>Go back</Button>}
      />
    );
  }

  const isSa = isStudentAffairs(profile);
  const canAnswer = isSa && canAnswerRequest(profile);
  const canSetTatHere = isSa && canSetTat(profile);
  const canDownloadDoc = canDownloadAnswerDocument(profile, request);
  const canDownloadFilled = canDownloadFilledForm(profile, request);
  const answerEditable = canAnswer && request.status === "answered";

  const fail = (error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    setFormError(message);
    toast({ title: "Action failed", description: message, variant: "error" });
  };

  const onSendAnswer = async (input: AnswerInput) => {
    setFormError(null);
    setBusy("send");
    try {
      const updated = await docDeskService.answerRequest(request.request_id, {
        message: input.message,
        document: input.document ?? null,
      });
      setRequest(updated);
      await refresh();
      toast({
        title: `Answer sent on ${updated.request_id}`,
        description: `${updated.doc_type_name} is now answered${updated.document ? " with the attached document" : ""}.`,
        variant: "success",
      });
    } catch (error) {
      fail(error, "Could not send the answer.");
    } finally {
      setBusy(null);
    }
  };

  const onEditAnswer = async (input: AnswerInput) => {
    setFormError(null);
    setBusy("edit");
    try {
      const updated = await docDeskService.updateAnswer(request.request_id, {
        message: input.message,
        document: input.document,
        remove_document: input.remove_document,
      });
      setRequest(updated);
      await refresh();
      toast({
        title: `Answer updated on ${updated.request_id}`,
        description: "The requester will see the revised response.",
        variant: "success",
      });
    } catch (error) {
      fail(error, "Could not update the answer.");
    } finally {
      setBusy(null);
    }
  };

  const onWithdrawAnswer = async () => {
    setFormError(null);
    setBusy("withdraw");
    try {
      const updated = await docDeskService.withdrawAnswer(request.request_id);
      setRequest(updated);
      await refresh();
      setWithdrawOpen(false);
      toast({
        title: `Answer withdrawn on ${updated.request_id}`,
        description: "The request returned to pending; the answer, document and any filled-in form were removed.",
        variant: "success",
      });
    } catch (error) {
      fail(error, "Could not withdraw the answer.");
      setWithdrawOpen(false);
    } finally {
      setBusy(null);
    }
  };

  const onDownloadDocument = async () => {
    setBusy("document");
    try {
      const file = await docDeskService.downloadAnswerDocument(request.request_id);
      if (file) downloadDemoFile(file);
    } catch (error) {
      fail(error, "Could not download the document.");
    } finally {
      setBusy(null);
    }
  };

  const onDownloadFilledForm = async () => {
    setBusy("filled-form");
    try {
      const file = await docDeskService.downloadFilledForm(request.request_id);
      if (file) downloadDemoFile(file);
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
          { label: "Student Affairs", to: "/sa/dashboard" },
          { label: "Requests", to: "/sa/requests" },
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
                Request review
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
                  <dt className="text-xs uppercase tracking-wide text-ink-400">Requester</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {request.requested_by_name ?? "Unknown"}
                    {request.requested_by_role ? (
                      <span className="text-ink-500">
                        {" "}
                        ?? {ROLE_LABELS[request.requested_by_role]}
                        {request.requested_by_dept
                          ? ` ?? ${request.requested_by_dept}`
                          : ""}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-400">Email</dt>
                  <dd className="mt-0.5 truncate font-medium text-ink-800">
                    {request.requested_by}
                  </dd>
                </div>
                {request.requested_by_phone_number ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-400">Phone</dt>
                    <dd className="mt-0.5 font-medium text-ink-800">
                      {request.requested_by_phone_number}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-400">Document type</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">{request.doc_type_name}</dd>
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
            />
          ) : null}

          {canAnswer && request.status === "pending" ? (
            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <MailCheck aria-hidden className="h-4 w-4 text-blue-700" />
                  Send answer
                </h2>
                <p className="text-xs text-ink-500">
                  The response is free text ??? it may communicate approval, non-issuance,
                  form instructions or collection details. The request status becomes{" "}
                  <em>answered</em>.
                </p>
              </CardHeader>
              <CardBody>
                <AnswerComposer
                  mode="create"
                  request={request}
                  busy={busy === "send"}
                  formError={formError}
                  onSubmit={onSendAnswer}
                />
              </CardBody>
            </Card>
          ) : null}

          {answerEditable ? (
            <Card>
              <CardHeader>
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <MailCheck aria-hidden className="h-4 w-4 text-blue-700" />
                  Edit answer
                </h2>
                <p className="text-xs text-ink-500">
                  You can change the message, replace or remove the document until the
                  requester acknowledges this request.
                </p>
              </CardHeader>
              <CardBody className="space-y-4">
                <AnswerComposer
                  mode="edit"
                  request={request}
                  busy={busy === "edit"}
                  formError={formError}
                  onSubmit={onEditAnswer}
                />
                <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
                  <p className="text-xs text-ink-500">
                    Withdrawing returns the request to <em>pending</em> and removes the
                    answer, its document and any filled-in form.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => setWithdrawOpen(true)}
                    disabled={busy !== null}
                  >
                    Withdraw answer
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : null}
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <h2 className="text-sm font-semibold text-ink-900">Progress</h2>
            </CardHeader>
            <CardBody>
              <RequestTimeline request={request} audience="observer" />
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
                  <p className="text-xs text-ink-500">
                    Set by {request.tat.updated_by ?? "Student Affairs"}
                  </p>
                </div>
              </CardHeader>
              <CardBody className="space-y-1">
                <p className="text-sm font-medium text-ink-800">
                  Expected by {formatDateOnly(request.tat.expected_by)}
                </p>
                {request.tat.note ? (
                  <p className="text-xs leading-5 text-ink-500">{request.tat.note}</p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                <UserRound aria-hidden className="h-4 w-4 text-primary-700" />
                Handling
              </h2>
            </CardHeader>
            <CardBody>
              {request.status === "pending" ? (
                <div className="space-y-3">
                  <p className="text-xs leading-5 text-ink-500">
                    This request is waiting for a Student Affairs response. Set a
                    turnaround expectation so the requester knows when to expect the
                    document, then answer it here.
                  </p>
                  {canSetTatHere ? (
                    <Link
                      to={`/sa/turnaround-time?request=${encodeURIComponent(request.request_id)}`}
                      className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line bg-surface px-3 text-xs font-medium text-ink-700 transition-colors hover:bg-primary-50 hover:text-primary-800"
                    >
                      <CalendarClock aria-hidden className="h-3.5 w-3.5" />
                      Set turnaround time
                    </Link>
                  ) : null}
                </div>
              ) : request.status === "answered" ? (
                <p className="text-xs leading-5 text-ink-500">
                  Waiting for the requester to acknowledge. Your answer stays editable
                  until then.
                </p>
              ) : (
                <p className="text-xs leading-5 text-ink-500">
                  The requester acknowledged this answer. The request is closed ??? view and
                  download only.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Withdraw answer confirmation (??9.2) */}
      <Modal
        open={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title={`Withdraw answer on ${request.request_id}?`}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setWithdrawOpen(false)}
              disabled={busy === "withdraw"}
            >
              Cancel
            </Button>
            <Button variant="danger" isLoading={busy === "withdraw"} onClick={onWithdrawAnswer}>
              Withdraw answer
            </Button>
          </>
        }
      >
        <p>
          This removes your answer{request.document ? ", the attached document" : ""} and any
          filled-in form from <strong>{request.doc_type_name}</strong> and returns the
          request to <strong>pending</strong>. You can send a new answer afterwards.
        </p>
      </Modal>
    </div>
  );
}
