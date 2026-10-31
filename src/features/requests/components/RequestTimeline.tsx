import { CheckCircle2, CircleDashed, Clock3, FilePlus2, MailCheck } from "lucide-react";
import type { DocRequest } from "../../../types/request";
import { formatDateTime, formatDateOnly } from "../../../lib/date";
import { cn } from "../../../lib/cn";

/**
 * Status timeline for the request detail page (??5B R4):
 * Pending ??? Answered ??? Acknowledged, with TAT expectation on the pending leg.
 * `audience` picks the voice: requesters read "your acknowledgement", while
 * Student Affairs / Admin read the neutral "requester acknowledgement".
 */
export function RequestTimeline({
  request,
  audience = "requester",
}: {
  request: DocRequest;
  audience?: "requester" | "observer";
}) {
  const steps = [
    {
      key: "submitted",
      label: "Request submitted",
      state: "done" as const,
      when: formatDateTime(request.created_at),
      detail: request.requested_by_name ? `By ${request.requested_by_name}` : undefined,
      icon: FilePlus2,
    },
    {
      key: "answered",
      label: request.answer ? "Answered by Student Affairs" : "Waiting for Student Affairs",
      state: request.answer
        ? ("done" as const)
        : request.status === "pending"
          ? ("current" as const)
          : ("future" as const),
      when: request.answer?.answered_at
        ? formatDateTime(request.answer.answered_at)
        : request.tat
          ? `Expected by ${formatDateOnly(request.tat.expected_by)}`
          : undefined,
      detail: request.answer?.answered_by_name,
      icon: request.answer ? MailCheck : Clock3,
    },
    {
      key: "acknowledged",
      label: request.acknowledged_at
        ? "Acknowledged ??? request closed"
        : request.status === "answered"
          ? audience === "requester"
            ? "Waiting for your acknowledgement"
            : "Waiting for requester acknowledgement"
          : "Acknowledged",
      state: request.acknowledged_at
        ? ("done" as const)
        : request.status === "answered"
          ? ("current" as const)
          : ("future" as const),
      when: request.acknowledged_at ? formatDateTime(request.acknowledged_at) : undefined,
      detail: undefined,
      icon: request.acknowledged_at ? CheckCircle2 : CircleDashed,
    },
  ];

  const stateStyles = {
    done: "bg-emerald-100 text-emerald-700",
    current: "bg-amber-100 text-amber-700",
    future: "bg-slate-100 text-slate-400",
  } as const;

  return (
    <ol className="relative space-y-5">
      {steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <li key={step.key} className="relative flex gap-3">
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[13px] top-7 h-[calc(100%-4px)] w-px bg-line"
              />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                stateStyles[step.state],
              )}
            >
              <Icon className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <p className="text-sm font-medium text-ink-800">{step.label}</p>
              {step.when ? <p className="text-xs text-ink-500">{step.when}</p> : null}
              {step.detail ? <p className="text-xs text-ink-400">{step.detail}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
