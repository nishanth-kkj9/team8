import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { cn } from "../../lib/cn";

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

/** Labelled form field with helper text and inline validation (??9.2). */
export function Field({ label, htmlFor, hint, error, required, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink-700">
        {label} {required ? <span className="text-red-600">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-500">{hint}</p>
      ) : null}
    </div>
  );
}

const CONTROL_BASE =
  "w-full rounded-control border bg-surface px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/50 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-ink-400";

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }
>(function Input({ className, invalid, ...rest }, ref) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(CONTROL_BASE, invalid ? "border-red-400" : "border-line", className)}
      {...rest}
    />
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }
>(function Textarea({ className, invalid, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_BASE,
        "min-h-[96px] resize-y",
        invalid ? "border-red-400" : "border-line",
        className,
      )}
      {...rest}
    />
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }
>(function Select({ className, invalid, ...rest }, ref) {
  return (
    <select
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        CONTROL_BASE,
        "cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23667085%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_0.6rem_center] bg-no-repeat pr-9",
        invalid ? "border-red-400" : "border-line",
        className,
      )}
      {...rest}
    />
  );
});
