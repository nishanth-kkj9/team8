import type { DocumentTypeStatus } from "../../types/document";
import { STATUS_LABELS, type DocDeskStatus } from "../../types/request";
import type { AdminDecision } from "../../services/adminDecisions";
import { cn } from "../../lib/cn";

/*
 * Status chips never rely on colour alone ??? the status text is always shown
 * (??10.2). API statuses: pending / answered / acknowledged.
 */

const REQUEST_STYLES: Record<DocDeskStatus, { chip: string; dot: string }> = {
  pending: { chip: "border-amber-200 bg-amber-50 text-amber-800", dot: "bg-amber-500" },
  answered: { chip: "border-blue-200 bg-blue-50 text-blue-800", dot: "bg-blue-500" },
  acknowledged: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
  },
};

export function RequestStatusBadge({ status }: { status: DocDeskStatus }) {
  const style = REQUEST_STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style.chip,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {STATUS_LABELS[status]}
    </span>
  );
}

const DECISION_STYLES: Record<AdminDecision, { chip: string; dot: string; label: string }> = {
  approved: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800",
    dot: "bg-emerald-500",
    label: "Approved",
  },
  rejected: {
    chip: "border-red-200 bg-red-50 text-red-700",
    dot: "bg-red-500",
    label: "Rejected",
  },
};

export function AdminDecisionBadge({
  decision,
}: {
  decision: AdminDecision | null | undefined;
}) {
  if (!decision) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs font-medium text-ink-400">
        Awaiting decision
      </span>
    );
  }
  const style = DECISION_STYLES[decision];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        style.chip,
      )}
    >
      <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

const TYPE_STYLES: Record<DocumentTypeStatus, string> = {
  active: "border-emerald-200 bg-emerald-50 text-emerald-800",
  archived: "border-slate-200 bg-slate-100 text-slate-600",
};

export function DocTypeStatusBadge({ status }: { status: DocumentTypeStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
        TYPE_STYLES[status],
      )}
    >
      <span
        aria-hidden
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "active" ? "bg-emerald-500" : "bg-slate-400",
        )}
      />
      {status}
    </span>
  );
}
