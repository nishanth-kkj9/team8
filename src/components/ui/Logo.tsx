import { FileText } from "lucide-react";
import { cn } from "../../lib/cn";

interface LogoProps {
  className?: string;
  /** Render only the rounded mark (collapsed sidebar). */
  markOnly?: boolean;
}

export function Logo({ className, markOnly = false }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-accent-600 text-white shadow-sm"
      >
        <FileText className="h-5 w-5" />
      </span>
      {!markOnly && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">DocDesk</span>
          <span className="text-[10px] font-medium uppercase tracking-[0.16em] opacity-70">
            CampusOS
          </span>
        </span>
      )}
    </span>
  );
}
