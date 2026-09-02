"use client";

import { forwardRef, type TextareaHTMLAttributes, useState } from "react";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const [touched, setTouched] = useState(false);
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    const showError = touched && error;

    return (
      <div className="flex flex-col gap-2">
        {label && (
          <label htmlFor={inputId} className="typography-label text-neutral-700">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={[
            "w-full rounded-lg border bg-neutral-0 px-3 py-3 typography-body-lg text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 ease-out resize-y min-h-[88px]",
            showError
              ? "border-error-600"
              : "border-neutral-300 focus:border-accent-600 focus:outline-none focus:ring-[3px] focus:ring-accent-100",
            props.disabled && "bg-neutral-100 cursor-not-allowed",
            className,
          ].join(" ")}
          onBlur={(e) => {
            setTouched(true);
            props.onBlur?.(e);
          }}
          aria-invalid={showError ? "true" : undefined}
          aria-describedby={showError ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {showError && (
          <p id={`${inputId}-error`} className="typography-body-md text-error-600">
            {error}
          </p>
        )}
        {!showError && helperText && (
          <p id={`${inputId}-helper`} className="typography-body-md text-neutral-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TextArea.displayName = "TextArea";

export { TextArea, type TextAreaProps };
