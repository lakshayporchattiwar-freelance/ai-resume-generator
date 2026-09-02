"use client";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
  onClick?: () => void;
  selected?: boolean;
}

function Card({ children, className = "", interactive, onClick, selected }: CardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-neutral-200 bg-neutral-0 p-6",
        interactive && "cursor-pointer transition-shadow duration-150 ease-out hover:elevation-1",
        selected && "border-accent-600 ring-[3px] ring-accent-100",
        className,
      ].join(" ")}
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") onClick?.(); } : undefined}
    >
      {children}
    </div>
  );
}

function CardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={["mb-4", className].join(" ")}>{children}</div>;
}

function CardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={className}>{children}</div>;
}

export { Card, CardHeader, CardContent };
