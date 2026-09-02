"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FileText } from "lucide-react";

const NAV_ITEMS = [
  { href: "/build", label: "Build" },
  { href: "/job-description", label: "Job Description" },
  { href: "/analysis", label: "Analysis" },
  { href: "/preview", label: "Preview" },
];

function Header() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-neutral-200 bg-neutral-0">
      <div className="content-container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-neutral-900">
          <FileText className="h-5 w-5 text-accent-600" />
          <span className="typography-heading-md">ResumeForge</span>
        </Link>
        <nav className="flex items-center gap-8" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "relative typography-label py-4 transition-colors duration-150",
                  isActive ? "text-neutral-900" : "text-neutral-600 hover:text-neutral-900",
                ].join(" ")}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent-600" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

export { Header };
