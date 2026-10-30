import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "../../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "subtle";
type Size = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-primary-700 text-white shadow-sm hover:bg-primary-800 active:bg-primary-900",
  secondary:
    "border border-line bg-surface text-ink-700 hover:bg-primary-50 hover:text-primary-800",
  ghost: "text-ink-500 hover:bg-primary-50 hover:text-primary-800",
  danger: "bg-red-600 text-white shadow-sm hover:bg-red-700",
  subtle: "bg-primary-50 text-primary-800 hover:bg-primary-100",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "h-8 gap-1.5 px-3 text-xs",
  md: "h-10 gap-2 px-4 text-sm",
  lg: "h-11 gap-2 px-5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      type = "button",
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-control font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        )}
        {...rest}
      >
        {isLoading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
        {children}
      </button>
    );
  },
);
