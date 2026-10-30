import { FlaskConical } from "lucide-react";
import { cn } from "../../lib/cn";

/** Subtle "Demo data" label (§0.11) — clarifies that nothing hits a real server. */
export function DemoChip({ className }: { className?: string }) {
  return (
    <span
      title="Demo build — all data is mock data stored in this browser only"
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800",
        className,
      )}
    >
      <FlaskConical aria-hidden className="h-3 w-3" />
      Demo data
    </span>
  );
}
