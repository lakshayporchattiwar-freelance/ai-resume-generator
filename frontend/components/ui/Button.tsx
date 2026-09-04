"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Loader2, Sparkles } from "lucide-react";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "ai";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent-600 text-white hover:bg-accent-700 focus-visible:ring-accent-600",
  secondary:
    "bg-neutral-0 text-neutral-800 border border-neutral-300 hover:bg-neutral-50 hover:border-neutral-400",
  ghost:
    "bg-transparent text-neutral-700 hover:bg-neutral-100",
  danger:
    "bg-error-600 text-white hover:bg-red-700",
  ai:
    "bg-accent-600 text-white hover:bg-accent-700 rounded-full",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px]",
  md: "h-11 px-4 text-[13px]",
  lg: "h-12 px-6 text-[13px]",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, icon, className = "", children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:pointer-events-none",
          variantClasses[variant],
          sizeClasses[size],
          className,
        ].join(" ")}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : variant === "ai" ? (
          <Sparkles className="h-4 w-4" />
        ) : icon ? (
          icon
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button, type ButtonProps };
