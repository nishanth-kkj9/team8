import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/cn";

type Tone = "primary" | "amber" | "blue" | "emerald" | "red";

const TONE_CLASSES: Record<Tone, string> = {
  primary: "bg-primary-50 text-primary-700",
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  emerald: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-700",
};

interface StatCardProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: Tone;
}

export function StatCard({ label, value, icon: Icon, tone = "primary" }: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-card border border-line bg-surface p-5 shadow-card">
      <span
        aria-hidden
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-control",
          TONE_CLASSES[tone],
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-2xl font-semibold tabular-nums leading-tight text-ink-900">
          {value}
        </span>
        <span className="truncate text-xs font-medium uppercase tracking-wide text-ink-500">
          {label}
        </span>
      </span>
    </div>
  );
}
