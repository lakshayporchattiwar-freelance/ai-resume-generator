"use client";

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
}

function ProgressIndicator({ currentStep, totalSteps, labels }: ProgressIndicatorProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }, (_, i) => {
        const step = i + 1;
        const isCompleted = step < currentStep;
        const isCurrent = step === currentStep;
        return (
          <div key={step} className="flex items-center gap-1">
            <div
              className={[
                "h-2 flex-1 rounded-full transition-colors duration-150 ease-out",
                isCompleted ? "bg-accent-600" : isCurrent ? "bg-accent-600/50" : "bg-neutral-200",
              ].join(" ")}
              style={{ minWidth: 32 }}
              role="progressbar"
              aria-valuenow={isCompleted ? 100 : isCurrent ? 50 : 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={labels?.[i] || `Step ${step}`}
            />
            {labels && (
              <span className={[
                "typography-caption hidden sm:block",
                isCurrent ? "text-accent-600" : isCompleted ? "text-neutral-500" : "text-neutral-400",
              ].join(" ")}>
                {labels[i]}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={[
        "h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-accent-600",
        className,
      ].join(" ")}
      role="status"
      aria-label="Loading"
    />
  );
}

function LoadingOverlay({ message }: { message?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-neutral-0/80 rounded-xl">
      <Spinner className="h-8 w-8" />
      {message && <p className="typography-body-md text-neutral-600">{message}</p>}
    </div>
  );
}

export { ProgressIndicator, Spinner, LoadingOverlay };
