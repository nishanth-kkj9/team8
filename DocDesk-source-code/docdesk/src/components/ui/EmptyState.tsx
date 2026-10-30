import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-card border border-dashed border-line bg-surface/60 px-6 py-12 text-center">
      <span
        aria-hidden
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600"
      >
        <Icon className="h-6 w-6" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-ink-900">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
