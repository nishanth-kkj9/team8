import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FilePlus2, Inbox } from "lucide-react";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useToast } from "../../../context/ToastContext";
import { docDeskService } from "../../../services/serviceProvider";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { EmptyState } from "../../../components/ui/EmptyState";
import { RequestForm, type RequestFormValues } from "../../requests/components/RequestForm";

/**
 * Screen R2 — Request a Document (§5B R2). Submits through the mock service;
 * on success the new pending request's detail page acts as the confirmation.
 */
export function NewRequestPage() {
  const { docTypes, refresh } = useDocDeskData();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const activeTypes = useMemo(
    () => docTypes.filter((docType) => docType.status === "active"),
    [docTypes],
  );

  const onSubmit = async (values: RequestFormValues) => {
    setSubmitting(true);
    setFormError(null);
    try {
      const created = await docDeskService.createRequest(values);
      await refresh();
      toast({
        title: `Request ${created.request_id} submitted`,
        description: `${created.doc_type_name} — status: pending.`,
        variant: "success",
      });
      navigate(`/app/requests/${created.request_id}`);
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : "Could not submit the request.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Request a Document"
        description="Submit a new document request to Student Affairs. You will see its progress on your dashboard and in My Requests."
        crumbs={[{ label: "Requester portal", to: "/app/dashboard" }, { label: "Request a Document" }]}
      />

      {activeTypes.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No document types are active"
          description="Student Affairs has not made any document types available for new requests. Please check back later."
        />
      ) : (
        <Card className="max-w-2xl">
          <CardHeader>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink-900">
              <FilePlus2 aria-hidden className="h-4 w-4 text-primary-700" />
              New document request
            </h2>
            <p className="text-xs text-ink-500">
              Requests are reviewed by the Student Affairs office.
            </p>
          </CardHeader>
          <CardBody>
            <RequestForm
              docTypes={activeTypes}
              mode="create"
              showRequesterDetails
              submitLabel="Submit Request"
              submitting={submitting}
              formError={formError}
              onSubmit={onSubmit}
              onCancel={() => navigate("/app/requests")}
              idPrefix="new-request"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}
