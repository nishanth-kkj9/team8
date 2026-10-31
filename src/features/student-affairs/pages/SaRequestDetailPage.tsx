import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  FileQuestion,
  MailCheck,
  Settings2,
  Undo2,
  UserRound,
  XCircle,
} from "lucide-react";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useToast } from "../../../context/ToastContext";
import { docDeskService } from "../../../services/serviceProvider";
import {
  clearAdminDecision,
  setAdminDecision,
  type AdminDecision,
} from "../../../services/adminDecisions";
import { useAdminDecisions } from "../../../hooks/useAdminDecisions";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Modal } from "../../../components/ui/Modal";
import { Field, Textarea } from "../../../components/ui/Field";
import { AdminDecisionBadge, RequestStatusBadge } from "../../../components/ui/StatusBadge";
import { EmptyState } from "../../../components/ui/EmptyState";
import { AnswerPanel } from "../../requests/components/AnswerPanel";
import { RequestTimeline } from "../../requests/components/RequestTimeline";
import {
  AnswerComposer,
  type AnswerInput,
} from "../components/AnswerComposer";
import { downloadFile } from "../../../lib/download";
import { formatDateTime, formatDateOnly } from "../../../lib/date";
import { ROLE_LABELS } from "../../../types/auth";
import {
  actsAsStudentAffairs,
  canAnswerRequest,
  canDownloadAnswerDocument,
  canDownloadFilledForm,
  canSetTat,
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
  const adminDecisions = useAdminDecisions();
  const [decisionOpen, setDecisionOpen] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<AdminDecision | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

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

  const isSa = actsAsStudentAffairs(profile);
  const canAnswer = isSa && canAnswerRequest(profile);
  const canSetTatHere = isSa && canSetTat(profile);
  const canDownloadDoc = canDownloadAnswerDocument(profile, request);
  const canDownloadFilled = canDownloadFilledForm(profile, request);
  const answerEditable = canAnswer && request.status === "answered";
  const decision = adminDecisions[request.request_id] ?? null;
  const isAdmin = profile?.role === "admin";
  const canDecide = isAdmin && request.status !== "acknowledged";

  const openDecision = (next: AdminDecision) => {
    setPendingDecision(next);
    setDecisionNote(decision?.note ?? "");
    setDecisionOpen(true);
  };

  const submitDecision = () => {
    if (!pendingDecision || !profile) return;
    setAdminDecision(request.request_id, {
      decision: pendingDecision,
      note: decisionNote.trim() || undefined,
      decided_by: profile.name,
      decided_at: new Date().toISOString(),
    });
    toast({
      title: pendingDecision === "approved" ? "Request approved" : "Request rejected",
      description:
        pendingDecision === "approved"
          ? `${request.request_id} is approved by the College Main Faculty.`
          : `${request.request_id} is rejected by the College Main Faculty.`,
      variant: pendingDecision === "approved" ? "success" : "error",
    });
    setDecisionOpen(false);
    setPendingDecision(null);
    setDecisionNote("");
  };

  const undoDecision = () => {
    clearAdminDecision(request.request_id);
    toast({
      title: "Decision cleared",
      description: `${request.request_id} is awaiting a decision again.`,
      variant: "info",
    });
  };

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
      if (file) downloadFile(file);
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
      if (file) downloadFile(file);
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
          { label: "Admin", to: "/admin/dashboard" },
          { label: "Requests", to: "/admin/requests" },
          { label: request.request_id },
        ]}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            {isAdmin ? <AdminDecisionBadge decision={decision?.decision} /> : null}
          </span>
        }
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
          {isAdmin ? (
            <Card
              className={
                decision?.decision === "approved"
                  ? "border-emerald-200 bg-emerald-50/40"
                  : decision?.decision === "rejected"
                    ? "border-red-200 bg-red-50/40"
                    : "border-primary-100 bg-primary-50/50"
              }
            >
              <CardHeader>
                <h2 className="text-sm font-semibold text-ink-900">Approval decision</h2>
                <p className="text-xs text-ink-500">
                  College Main Faculty approve/reject record.
                </p>
              </CardHeader>
              <CardBody className="space-y-3">
                <AdminDecisionBadge decision={decision?.decision} />
                {decision ? (
                  <div className="space-y-1 text-xs leading-5 text-ink-600">
                    <p>
                      Decided by{" "}
                      <strong>{decision.decided_by ?? "College Main Faculty"}</strong> on{" "}
                      {formatDateTime(decision.decided_at)}.
                    </p>
                    {decision.note ? (
                      <p className="rounded-control border border-line bg-surface px-3 py-2 text-ink-700">
                        {decision.note}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-ink-600">
                    This request is waiting for the College Main Faculty to read, view
                    and approve or reject it.
                  </p>
                )}
                {canDecide ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => openDecision("approved")}
                      className="bg-emerald-700 hover:bg-emerald-800"
                    >
                      <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
                      {decision?.decision === "approved" ? "Update approval" : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => openDecision("rejected")}
                    >
                      <XCircle aria-hidden className="h-3.5 w-3.5" />
                      {decision?.decision === "rejected" ? "Update rejection" : "Reject"}
                    </Button>
                    {decision ? (
                      <Button size="sm" variant="secondary" onClick={undoDecision}>
                        <Undo2 aria-hidden className="h-3.5 w-3.5" />
                        Clear
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-xs leading-5 text-ink-500">
                    Acknowledged requests are closed, so the decision is locked.
                  </p>
                )}
              </CardBody>
            </Card>
          ) : null}

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
                      to={`/admin/turnaround-time?request=${encodeURIComponent(request.request_id)}`}
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

      <Modal
        open={decisionOpen}
        onClose={() => {
          setDecisionOpen(false);
          setPendingDecision(null);
        }}
        title={
          pendingDecision === "approved" ? "Approve this request?" : "Reject this request?"
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setDecisionOpen(false);
                setPendingDecision(null);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant={pendingDecision === "rejected" ? "danger" : "primary"}
              onClick={submitDecision}
              className={
                pendingDecision === "approved" ? "bg-emerald-700 hover:bg-emerald-800" : undefined
              }
            >
              {pendingDecision === "approved" ? (
                <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
              ) : (
                <XCircle aria-hidden className="h-3.5 w-3.5" />
              )}
              {pendingDecision === "approved" ? "Confirm approval" : "Confirm rejection"}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p>
            <strong>{request.request_id}</strong> — {request.doc_type_name} requested by{" "}
            {request.requested_by_name ?? request.requested_by}.
          </p>
          <Field
            label="Decision note (optional)"
            htmlFor="sa-decision-note"
            hint="Explain the reason for the decision for the institution record."
          >
            <Textarea
              id="sa-decision-note"
              value={decisionNote}
              onChange={(event) => setDecisionNote(event.target.value)}
              placeholder={
                pendingDecision === "approved"
                  ? "Approved. Please prepare the document."
                  : "Rejected. Reason for rejection…"
              }
              maxLength={500}
            />
          </Field>
          <p className="text-xs text-ink-500">
            This decision is stored in this browser only. The CampusOS API remains the
            source of the request lifecycle.
          </p>
        </div>
      </Modal>
    </div>
  );
}
