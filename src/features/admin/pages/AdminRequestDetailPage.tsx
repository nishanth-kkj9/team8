import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  Download,
  FileQuestion,
  FileUp,
  MailCheck,
  Settings2,
  ShieldCheck,
  Undo2,
  XCircle,
} from "lucide-react";
import { useDemoAuth } from "../../../context/DemoAuthContext";
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
import { RequestTimeline } from "../../requests/components/RequestTimeline";
import { AnswerPanel } from "../../requests/components/AnswerPanel";
import { FileMetadataCard } from "../../requests/components/FileMetadataCard";
import { downloadFile } from "../../../lib/download";
import { formatDateTime, formatDateOnly } from "../../../lib/date";
import { ROLE_LABELS } from "../../../types/auth";
import {
  canDecideRequest,
  canDownloadAnswerDocument,
  canDownloadFilledForm,
} from "../../../lib/permissions";
import type { DocRequest } from "../../../types/request";

type Busy = "document" | "filled-form" | null;

/**
 * Screen A3 ??? Request Details. College Main Faculty (Admin) can inspect the
 * full record and download files, and can approve or reject the request. The
 * decision is stored as a frontend-only overlay because the CampusOS API keeps
 * Admin read-only and returns 403 for any DocDesk mutation.
 */
export function AdminRequestDetailPage() {
  const { requestId } = useParams<{ requestId: string }>();
  const { profile } = useDemoAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const adminDecisions = useAdminDecisions();

  const [request, setRequest] = useState<DocRequest | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");
  const [busy, setBusy] = useState<Busy>(null);
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
        action={<Button onClick={() => navigate("/admin/requests")}>Back to All Requests</Button>}
      />
    );
  }

  const canDownloadDoc = canDownloadAnswerDocument(profile, request);
  const canDownloadFilled = canDownloadFilledForm(profile, request);
  const decision = adminDecisions[request.request_id] ?? null;
  const canDecide = canDecideRequest(profile, request);

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

  const onDownloadDocument = async () => {
    setBusy("document");
    try {
      const file = await docDeskService.downloadAnswerDocument(request.request_id);
      if (file) {
        downloadFile(file);
      } else {
        toast({
          title: "No document attached",
          description: "This answer has no document to download.",
          variant: "info",
        });
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Could not download the document.",
        variant: "error",
      });
    } finally {
      setBusy(null);
    }
  };

  const onDownloadFilledForm = async () => {
    setBusy("filled-form");
    try {
      const file = await docDeskService.downloadFilledForm(request.request_id);
      if (file) {
        downloadFile(file);
      } else {
        toast({
          title: "No filled-in form",
          description: "There is no filled-in form on this request.",
          variant: "info",
        });
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Could not download the filled-in form.",
        variant: "error",
      });
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
          { label: "All Requests", to: "/admin/requests" },
          { label: request.request_id },
        ]}
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <RequestStatusBadge status={request.status} />
            <AdminDecisionBadge decision={decision?.decision} />
            {canDecide ? (
              <>
                <Button
                  size="sm"
                  onClick={() => openDecision("approved")}
                  className="bg-emerald-700 hover:bg-emerald-800"
                >
                  <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => openDecision("rejected")}
                >
                  <XCircle aria-hidden className="h-3.5 w-3.5" />
                  Reject
                </Button>
              </>
            ) : null}
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
                  <dt className="text-xs uppercase tracking-wide text-ink-400">Requester</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">
                    {request.requested_by_name ?? "Unknown"}
                    {request.requested_by_role ? (
                      <span className="text-ink-500">
                        {" "}
                        ?? {ROLE_LABELS[request.requested_by_role]}
                        {request.requested_by_dept ? ` ?? ${request.requested_by_dept}` : ""}
                      </span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-ink-400">Email</dt>
                  <dd className="mt-0.5 font-medium text-ink-800">{request.requested_by}</dd>
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
                {request.acknowledged_at ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-ink-400">
                      Acknowledged
                    </dt>
                    <dd className="mt-0.5 font-medium text-ink-800">
                      {formatDateTime(request.acknowledged_at)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardBody>
          </Card>

          {request.answer ? (
            <AnswerPanel
              request={request}
              onDownloadDocument={canDownloadDoc ? onDownloadDocument : undefined}
              downloadingDocument={busy === "document"}
              showFilledForm={false}
            />
          ) : (
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
                  <p className="text-xs text-ink-500">Not yet answered.</p>
                </div>
              </CardHeader>
              <CardBody>
                <p className="rounded-control border border-dashed border-line bg-slate-50/60 px-3 py-2 text-xs text-ink-500">
                  Student Affairs has not responded to this request yet.
                </p>
              </CardBody>
            </Card>
          )}

          {/* Filled-form metadata ??? read-only with download (??5D A3) */}
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
                  Returned by the requester, when present.
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-3">
              {request.filled_form ? (
                <FileMetadataCard
                  label="Filled-in form"
                  icon={FileUp}
                  file={request.filled_form}
                  onDownload={canDownloadFilled ? onDownloadFilledForm : undefined}
                  downloading={busy === "filled-form"}
                />
              ) : (
                <p className="rounded-control border border-dashed border-line bg-slate-50/60 px-3 py-2 text-xs text-ink-500">
                  {request.status === "answered" && request.document
                    ? "The requester has not uploaded a filled-in form yet."
                    : "No filled-in form on this request."}
                </p>
              )}
            </CardBody>
          </Card>
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
                {request.tat.updated_at ? (
                  <p className="text-xs text-ink-400">
                    Updated {formatDateTime(request.tat.updated_at)}
                  </p>
                ) : null}
              </CardBody>
            </Card>
          ) : null}

          <Card
            className={
              decision?.decision === "approved"
                ? "border-emerald-200 bg-emerald-50/40"
                : decision?.decision === "rejected"
                  ? "border-red-200 bg-red-50/40"
                  : "border-primary-100 bg-primary-50/50"
            }
          >
            <CardBody className="space-y-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                <ShieldCheck aria-hidden className="h-4 w-4 text-primary-700" />
                Approval decision
              </h2>
              <AdminDecisionBadge decision={decision?.decision} />
              {decision ? (
                <div className="space-y-1 text-xs leading-5 text-ink-600">
                  <p>
                    Decided by <strong>{decision.decided_by ?? "College Main Faculty"}</strong>{" "}
                    on {formatDateTime(decision.decided_at)}.
                  </p>
                  {decision.note ? (
                    <p className="rounded-control border border-line bg-surface px-3 py-2 text-ink-700">
                      {decision.note}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs leading-5 text-ink-600">
                  This request is waiting for the College Main Faculty to read, view and
                  approve or reject it.
                </p>
              )}

              {canDecide ? (
                <div className="flex flex-wrap gap-2 pt-1">
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
                      Clear decision
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

          <Card>
            <CardBody className="space-y-2">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-ink-900">
                <Download aria-hidden className="h-4 w-4 text-primary-700" />
                Files
              </h2>
              {request.document || request.filled_form ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {request.document && canDownloadDoc ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onDownloadDocument}
                      isLoading={busy === "document"}
                    >
                      {!busy && <Download aria-hidden className="h-3.5 w-3.5" />}
                      Answer document
                    </Button>
                  ) : null}
                  {request.filled_form && canDownloadFilled ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={onDownloadFilledForm}
                      isLoading={busy === "filled-form"}
                    >
                      {!busy && <Download aria-hidden className="h-3.5 w-3.5" />}
                      Filled-in form
                    </Button>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs leading-5 text-ink-500">
                  No answer document or filled-in form is available yet.
                </p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

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
            htmlFor="decision-note"
            hint="Explain the reason for the decision for the institution record."
          >
            <Textarea
              id="decision-note"
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
