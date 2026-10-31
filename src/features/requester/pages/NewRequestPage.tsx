import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FilePlus2 } from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { useToast } from "../../../context/ToastContext";
import { ApiError } from "../../../services/api/apiErrors";
import { docDeskService } from "../../../services/serviceProvider";
import type { DocType } from "../../../types/document";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { RequestForm, type RequestFormValues } from "../../requests/components/RequestForm";
import { loadActiveDocTypes } from "../utils/loadActiveDocTypes";

function describeSubmitError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return error instanceof Error
      ? `Could not reach CampusOS. Check your connection and try again. (${error.message})`
      : "Could not submit your request. Please try again.";
  }

  const details = Array.isArray(error.details)
    ? error.details
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const detail = item as Record<string, unknown>;
            return [detail.field, detail.message].filter(Boolean).join(": ");
          }
          return "";
        })
        .filter(Boolean)
        .join(" ")
    : error.details && typeof error.details === "object"
      ? Object.values(error.details as Record<string, unknown>)
          .filter((value): value is string => typeof value === "string")
          .join(" ")
      : typeof error.details === "string"
        ? error.details
        : "";

  switch (error.status) {
    case 400: return `CampusOS rejected the request: ${error.message}${details ? ` ${details}` : ""}`;
    case 403: return "Your account is not permitted to create this request.";
    case 404: return `The selected document type or request endpoint was not found: ${error.message}`;
    case 409: return `This request conflicts with the current records: ${error.message}`;
    case 422: return `Please check the request details: ${details || error.message}`;
    case 429: return error.retryAfterSeconds !== undefined
      ? `Too many requests. Please retry in ${error.retryAfterSeconds} seconds.`
      : error.message;
    default:
      if (error.status >= 500) return `CampusOS is temporarily unavailable. Your entered values remain on this page; you can retry. (${error.message})`;
      return `${error.message}${details ? ` ${details}` : ""}`;
  }
}

export function NewRequestPage() {
  const { refresh } = useDocDeskData();
  const { signOut } = useDemoAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const isStudentAffairs = location.pathname.startsWith("/admin/");
  const routeBase = isStudentAffairs ? "/sa" : "/app";
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const [formError, setFormError] = useState<string | null>(null);
  const submitLock = useRef(false);

  const loadDocTypes = useCallback(async (signal: AbortSignal) => {
    setTypesLoading(true);
    setTypesError(null);
    setDocTypes([]);
    try {
      if (!signal.aborted) {
        const loaded = await loadActiveDocTypes(docDeskService, () => signal.aborted);
        if (!signal.aborted) setDocTypes(loaded);
      }
    } catch (error) {
      if (!signal.aborted) {
        setTypesError(error instanceof Error
          ? `Could not load active document types from CampusOS. ${error.message}`
          : "Could not load active document types from CampusOS.");
      }
    } finally {
      if (!signal.aborted) setTypesLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadDocTypes(controller.signal);
    return () => controller.abort();
  }, [loadDocTypes, retry]);

  useEffect(() => {
    if (retrySeconds <= 0) return;
    const timer = window.setTimeout(() => setRetrySeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [retrySeconds]);

  const onSubmit = async (values: RequestFormValues) => {
    if (submitLock.current || retrySeconds > 0) return;
    submitLock.current = true;
    setSubmitting(true);
    setFormError(null);
    try {
      const selectedType = docTypes.find(
        (type) => type.doc_type_id === values.doc_type_id && type.status === "active",
      );
      if (!selectedType) {
        setFormError("Select an active document type before submitting.");
        return;
      }

      const created = await docDeskService.createRequest({
        doc_type_id: selectedType.doc_type_id,
        reason: values.reason.trim(),
      });
      if (!created.request_id) {
        throw new Error("CampusOS confirmed the request but did not return a request ID.");
      }
      if (created.status !== "pending") {
        throw new Error(`CampusOS created ${created.request_id} with unexpected status ${created.status}.`);
      }

      toast({
        title: `Request ${created.request_id} submitted`,
        description: `Status: ${created.status}.`,
        variant: "success",
      });
      await refresh();
      navigate(`${routeBase}/requests/${encodeURIComponent(created.request_id)}`);
    } catch (error) {
      if (error instanceof ApiError && error.status === 429 && error.retryAfterSeconds !== undefined) {
        setRetrySeconds(error.retryAfterSeconds);
      }
      if (error instanceof ApiError && error.status === 401) {
        signOut();
        navigate("/login", { replace: true, state: { from: `${routeBase}/requests/new` } });
        return;
      }
      setFormError(describeSubmitError(error));
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request a Document"
        description="Submit your document request directly to CampusOS. Admin can view it, and Student Affairs provides the response."
        crumbs={[{ label: isStudentAffairs ? "Student Affairs" : "Requester portal", to: `${routeBase}/dashboard` }, { label: "Request a Document" }]}
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
            <FilePlus2 aria-hidden className="h-4 w-4 text-primary-700" />
            New Document Request
          </h2>
          <p className="text-xs text-ink-500">Your request is visible in the Admin request list. Student Affairs handles the response.</p>
        </CardHeader>
        <CardBody>
          <RequestForm
            docTypes={docTypes}
            mode="create"
            showRequesterDetails
            documentTypesLoading={typesLoading}
            documentTypesError={typesError}
            onRetryDocumentTypes={() => setRetry((value) => value + 1)}
            documentTypeDisabled={typesLoading || !!typesError}
            submitLabel={retrySeconds > 0 ? `Retry in ${retrySeconds}s` : "Submit Request"}
            submitting={submitting}
            submitDisabled={retrySeconds > 0 || typesLoading || !!typesError || !docTypes.some((type) => type.status === "active")}
            formError={formError}
            onSubmit={onSubmit}
            onCancel={() => navigate(`${routeBase}/requests`)}
            idPrefix="new-request"
          />
        </CardBody>
      </Card>
    </div>
  );
}
