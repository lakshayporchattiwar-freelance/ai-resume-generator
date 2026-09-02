"use client";

import { forwardRef, type InputHTMLAttributes, useState } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
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
        <input
          ref={ref}
          id={inputId}
          className={[
            "h-11 w-full rounded-lg border bg-neutral-0 px-3 typography-body-lg text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 ease-out",
            showError
              ? "border-error-600 focus:border-error-600 focus:ring-0"
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

TextInput.displayName = "TextInput";

export { TextInput, type TextInputProps };
