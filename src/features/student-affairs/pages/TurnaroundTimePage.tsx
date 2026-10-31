import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { CalendarClock, CalendarPlus, ListChecks, TriangleAlert } from "lucide-react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useDocDeskData } from "../../../context/DocDeskDataContext";
import { useDemoAuth } from "../../../context/DemoAuthContext";
import { useToast } from "../../../context/ToastContext";
import { canSetTat } from "../../../lib/permissions";
import { docDeskService } from "../../../services/serviceProvider";
import { PageHeader } from "../../../components/layout/PageHeader";
import { Card, CardBody, CardHeader } from "../../../components/ui/Card";
import { Button } from "../../../components/ui/Button";
import { Field, Input, Select, Textarea } from "../../../components/ui/Field";
import { Modal } from "../../../components/ui/Modal";
import { EmptyState } from "../../../components/ui/EmptyState";
import { LIMITS, validateTatDate } from "../../../lib/validation";
import { dateOnlyFromToday, formatDateOnly, formatDateTime, todayDateOnly } from "../../../lib/date";
import { cn } from "../../../lib/cn";

const DEFAULT_DATE = () => dateOnlyFromToday(7);

/**
 * Screen SA5 ??? Turnaround Time management (??5C SA5, starred bonus).
 *
 * Single panel: pick a pending request, set `expected_by` (YYYY-MM-DD, not
 * before today) and an optional note. Bulk panel: select 1???100 distinct
 * pending requests and apply one date/note to all of them through the
 * all-or-nothing bulk mock operation ??? if any selection is invalid, nothing
 * is updated.
 *
 * Deep links: `?request=DRQ-???` preselects the single panel (from SA3's
 * "Set TAT" button); `?selected=a,b,c` preselects the bulk panel (from SA2's
 * queue checkboxes).
 */
export function TurnaroundTimePage() {
  const { requests, refresh } = useDocDeskData();
  const { profile } = useDemoAuth();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  const pending = useMemo(
    () => requests.filter((request) => request.status === "pending"),
    [requests],
  );

  // -- single panel ---------------------------------------------------------
  const [singleId, setSingleId] = useState<string>(() => searchParams.get("request") ?? "");
  const [singleDate, setSingleDate] = useState(DEFAULT_DATE);
  const [singleNote, setSingleNote] = useState("");
  const [singleError, setSingleError] = useState<string | null>(null);
  const [savingSingle, setSavingSingle] = useState(false);

  const singleRequest = pending.find((r) => r.request_id === singleId) ?? null;
  const singleRequestId = singleRequest?.request_id ?? "";

  // Keep fields in sync with the selected request (prefill an existing TAT).
  // Keying on the resolved request id ??? not the raw singleId ??? also covers
  // deep links on a cold load, where `requests` arrives after first render.
  useEffect(() => {
    if (!singleRequestId || !singleRequest) return;
    setSingleDate(singleRequest.tat?.expected_by ?? DEFAULT_DATE());
    setSingleNote(singleRequest.tat?.note ?? "");
    setSingleError(null);
  }, [singleRequestId]); // eslint-disable-line react-hooks/exhaustive-deps -- singleRequest derives from singleRequestId

  // React to a fresh ?request= deep link while the page is already mounted.
  useEffect(() => {
    const fromUrl = searchParams.get("request");
    if (fromUrl) setSingleId(fromUrl);
  }, [searchParams]);

  const onSaveSingle = async (event: FormEvent) => {
    event.preventDefault();
    if (!singleRequest) {
      setSingleError("Select a pending request first.");
      return;
    }
    const dateError = validateTatDate(singleDate);
    if (dateError) {
      setSingleError(dateError);
      return;
    }
    setSingleError(null);
    setSavingSingle(true);
    try {
      const updated = await docDeskService.setTat(singleRequest.request_id, {
        expected_by: singleDate,
        note: singleNote.trim() || undefined,
      });
      await refresh();
      toast({
        title: `TAT set on ${updated.request_id}`,
        description: `Expected by ${formatDateOnly(singleDate)}. The requester sees this on the request detail page.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Could not set TAT",
        description: error instanceof Error ? error.message : "The TAT update failed.",
        variant: "error",
      });
    } finally {
      setSavingSingle(false);
    }
  };

  // -- bulk panel -----------------------------------------------------------
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set<string>());
  const [bulkDate, setBulkDate] = useState(DEFAULT_DATE);
  const [bulkNote, setBulkNote] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [applyingBulk, setApplyingBulk] = useState(false);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  const selectedCount = selectedIds.size;
  const allSelected = pending.length > 0 && pending.every((r) => selectedIds.has(r.request_id));
  const someSelected = selectedCount > 0 && !allSelected;

  // Apply `?selected=a,b,c` deep links. Runs both on a fresh mount and when
  // the pending list arrives after the first render (CampusOS data loads
  // asynchronously, so the queue is empty on a cold deep link).
  useEffect(() => {
    if (pending.length === 0) return;
    const fromUrl = searchParams.get("selected");
    if (!fromUrl) return;
    const ids = fromUrl
      .split(",")
      .map((id) => id.trim())
      .filter((id) => pending.some((r) => r.request_id === id));
    setSelectedIds(new Set(ids.slice(0, LIMITS.bulkTatMax)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-apply only when the URL selection or the queue itself changes
  }, [searchParams, pending.length]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  if (!canSetTat(profile)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const toggleOne = (requestId: string) => {
    setBulkError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(requestId)) {
        next.delete(requestId);
      } else {
        if (next.size >= LIMITS.bulkTatMax) {
          setBulkError(`You can select up to ${LIMITS.bulkTatMax} requests at once.`);
          return prev;
        }
        next.add(requestId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setBulkError(null);
    setSelectedIds(() => {
      if (allSelected) return new Set<string>();
      return new Set(pending.slice(0, LIMITS.bulkTatMax).map((r) => r.request_id));
    });
  };

  const onApplyBulk = async () => {
    if (selectedCount < LIMITS.bulkTatMin) {
      setBulkError(`Select at least ${LIMITS.bulkTatMin} request.`);
      setConfirmOpen(false);
      return;
    }
    const dateError = validateTatDate(bulkDate);
    if (dateError) {
      setBulkError(dateError);
      setConfirmOpen(false);
      return;
    }
    setBulkError(null);
    setApplyingBulk(true);
    try {
      const updated = await docDeskService.setBulkTat({
        request_ids: [...selectedIds],
        expected_by: bulkDate,
        note: bulkNote.trim() || undefined,
      });
      await refresh();
      setSelectedIds(new Set());
      setBulkNote("");
      setConfirmOpen(false);
      toast({
        title: `TAT set on ${updated.length} ${updated.length === 1 ? "request" : "requests"}`,
        description: `All selected pending requests now expect delivery by ${formatDateOnly(bulkDate)}.`,
        variant: "success",
      });
    } catch (error) {
      // All-or-nothing: CampusOS rejects the whole batch when any
      // selection is invalid, so no record is partially updated (??5C SA5).
      setConfirmOpen(false);
      toast({
        title: "Bulk TAT rejected ??? nothing was updated",
        description: error instanceof Error ? error.message : "The bulk update failed.",
        variant: "error",
      });
    } finally {
      setApplyingBulk(false);
    }
  };

  if (pending.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Turnaround Time"
          description="Set expected-by dates so requesters know when to expect their documents."
          crumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Turnaround Time" }]}
        />
        <EmptyState
          icon={CalendarClock}
          title="No pending requests"
          description="TAT can only be set on pending requests. When new requests arrive, set their expected-by date here."
          action={
            <Link
              to="/admin/requests?status=pending"
              className="inline-flex h-10 items-center rounded-control border border-line bg-surface px-4 text-sm font-medium text-ink-700 transition-colors hover:bg-primary-50"
            >
              Open pending queue
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Turnaround Time"
        description="Set expected-by dates for single requests or in bulk. Only pending requests may receive a TAT."
          crumbs={[{ label: "Admin", to: "/admin/dashboard" }, { label: "Turnaround Time" }]}
      />

      <div className="grid gap-6 xl:grid-cols-5">
        {/* Single TAT panel */}
        <Card className="min-w-0 self-start xl:col-span-2">
          <CardHeader className="flex-row items-center gap-2">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"
            >
              <CalendarPlus className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Single request TAT</h2>
              <p className="text-xs text-ink-500">Pick one pending request and set its expected-by date.</p>
            </div>
          </CardHeader>
          <CardBody>
            <form onSubmit={onSaveSingle} noValidate className="space-y-4">
              <Field label="Pending request" htmlFor="tat-request" required>
                <Select
                  id="tat-request"
                  value={singleId}
                  onChange={(event) => setSingleId(event.target.value)}
                >
                  <option value="">Select a pending request???</option>
                  {pending.map((request) => (
                    <option key={request.request_id} value={request.request_id}>
                      {request.request_id} ?? {request.requested_by_name ?? "Unknown"} ??? {request.doc_type_name}
                    </option>
                  ))}
                </Select>
              </Field>

              {singleRequest ? (
                <div className="rounded-control border border-line bg-slate-50/60 px-3 py-2.5 text-xs leading-5 text-ink-600">
                  <p className="font-medium text-ink-800">
                    {singleRequest.request_id} ?? {singleRequest.doc_type_name}
                  </p>
                  <p className="mt-0.5">
                    {singleRequest.requested_by_name ?? "Unknown"}
                    {singleRequest.requested_by_dept ? ` ?? ${singleRequest.requested_by_dept}` : ""} ??
                    submitted {formatDateTime(singleRequest.created_at)}
                  </p>
                  {singleRequest.tat ? (
                    <p className="mt-1 text-amber-700">
                      Current TAT: expected by {formatDateOnly(singleRequest.tat.expected_by)}
                      {singleRequest.tat.note ? ` ??? ???${singleRequest.tat.note}???` : ""} (saving replaces it)
                    </p>
                  ) : (
                    <p className="mt-1 text-ink-400">No TAT set yet.</p>
                  )}
                </div>
              ) : null}

              <Field
                label="Expected by"
                htmlFor="tat-date"
                required
                error={singleError ?? undefined}
                hint={singleError ? undefined : "YYYY-MM-DD ?? cannot be before today."}
              >
                <Input
                  id="tat-date"
                  type="date"
                  value={singleDate}
                  min={todayDateOnly()}
                  onChange={(event) => {
                    setSingleDate(event.target.value);
                    setSingleError(null);
                  }}
                  invalid={!!singleError}
                />
              </Field>

              <Field label="Note" htmlFor="tat-note" hint="Optional ??? shown to the requester with the expected date.">
                <Textarea
                  id="tat-note"
                  value={singleNote}
                  rows={3}
                  maxLength={300}
                  onChange={(event) => setSingleNote(event.target.value)}
                  placeholder="e.g. Registrar signatures usually take two working days."
                />
              </Field>

              <div className="flex justify-end">
                <Button type="submit" disabled={!singleRequest} isLoading={savingSingle}>
                  Save TAT
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        {/* Bulk TAT panel */}
        <Card className="min-w-0 xl:col-span-3">
          <CardHeader className="flex-row items-center gap-2">
            <span
              aria-hidden
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700"
            >
              <ListChecks className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink-900">Bulk TAT</h2>
              <p className="text-xs text-ink-500">
                Select 1???{LIMITS.bulkTatMax} pending requests and apply one expected-by date to all.
                The update is all-or-nothing.
              </p>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Pending request table with checkboxes ??? overflow-x-auto keeps
                the page free of horizontal blowout on narrow desktops. */}
            <div className="overflow-x-auto rounded-control border border-line">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="border-b border-line bg-slate-50/80 text-xs uppercase tracking-wide text-ink-500">
                  <tr>
                    <th scope="col" className="w-10 px-3 py-2.5">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all pending requests for bulk TAT"
                        className="h-3.5 w-3.5 rounded border-line accent-primary-700"
                      />
                    </th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Request</th>
                    <th scope="col" className="hidden px-3 py-2.5 font-medium sm:table-cell">Requester</th>
                    <th scope="col" className="px-3 py-2.5 font-medium">Expected by</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {pending.map((request) => (
                    <tr
                      key={request.request_id}
                      className={cn(
                        "transition-colors",
                        selectedIds.has(request.request_id) ? "bg-primary-50/60" : "hover:bg-primary-50/30",
                      )}
                    >
                      <td className="px-3 py-2.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(request.request_id)}
                          onChange={() => toggleOne(request.request_id)}
                          aria-label={`Select ${request.request_id} for bulk TAT`}
                          className="h-3.5 w-3.5 rounded border-line accent-primary-700"
                        />
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          to={`/admin/requests/${request.request_id}`}
                          className="font-mono text-xs font-semibold text-primary-700 hover:underline"
                        >
                          {request.request_id}
                        </Link>
                        <span className="block max-w-[12rem] truncate text-xs text-ink-600" title={request.doc_type_name}>
                          {request.doc_type_name}
                        </span>
                      </td>
                      <td className="hidden px-3 py-2.5 text-xs text-ink-600 sm:table-cell">
                        {request.requested_by_name ?? "Unknown"}
                        <span className="block text-[11px] text-ink-400">{request.requested_by}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-xs">
                        {request.tat ? (
                          <span className="text-amber-700">{formatDateOnly(request.tat.expected_by)}</span>
                        ) : (
                          <span className="text-ink-400">???</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <p className="font-medium text-ink-700" aria-live="polite">
                {selectedCount} of {pending.length} selected
                <span className="ml-1 font-normal text-ink-400">(1???{LIMITS.bulkTatMax} allowed)</span>
              </p>
              {selectedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds(new Set());
                    setBulkError(null);
                  }}
                  className="text-primary-700 hover:underline"
                >
                  Clear selection
                </button>
              ) : null}
            </div>

            <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
              <Field
                label="Expected by (all selected)"
                htmlFor="bulk-tat-date"
                required
                error={bulkError ?? undefined}
              >
                <Input
                  id="bulk-tat-date"
                  type="date"
                  value={bulkDate}
                  min={todayDateOnly()}
                  onChange={(event) => {
                    setBulkDate(event.target.value);
                    setBulkError(null);
                  }}
                  invalid={!!bulkError}
                />
              </Field>
              <Field label="Note (optional)" htmlFor="bulk-tat-note">
                <Input
                  id="bulk-tat-note"
                  value={bulkNote}
                  maxLength={300}
                  onChange={(event) => setBulkNote(event.target.value)}
                  placeholder="e.g. Batch processing week of the 15th."
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-3">
              {bulkError ? (
                <p role="alert" className="flex items-center gap-1.5 text-xs text-red-600">
                  <TriangleAlert aria-hidden className="h-3.5 w-3.5 shrink-0" />
                  {bulkError}
                </p>
              ) : null}
              <Button
                onClick={() => setConfirmOpen(true)}
                disabled={selectedCount < LIMITS.bulkTatMin || selectedCount > LIMITS.bulkTatMax}
              >
                Set TAT for Selected
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Bulk confirmation summary (??5C SA5) */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Set TAT for ${selectedCount} ${selectedCount === 1 ? "request" : "requests"}?`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={applyingBulk}>
              Cancel
            </Button>
            <Button isLoading={applyingBulk} onClick={onApplyBulk}>
              Apply to {selectedCount} selected
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <p>
            Every selected pending request will be expected by{" "}
            <strong>{formatDateOnly(bulkDate)}</strong>
            {bulkNote.trim() ? (
              <>
                {" "}with the note ???<span className="italic">{bulkNote.trim()}</span>???
              </>
            ) : null}
            .
          </p>
          <div className="max-h-40 overflow-y-auto rounded-control border border-line bg-slate-50/60 px-3 py-2">
            <ul className="space-y-1 font-mono text-xs text-ink-600">
              {[...selectedIds].map((id) => (
                <li key={id}>{id}</li>
              ))}
            </ul>
          </div>
          <p className="flex items-start gap-1.5 text-xs leading-5 text-ink-500">
            <TriangleAlert aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
            All-or-nothing: if any selected request is no longer pending, the whole batch
            is rejected and no record is updated.
          </p>
        </div>
      </Modal>
    </div>
  );
}
