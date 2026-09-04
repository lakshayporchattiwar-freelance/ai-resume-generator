"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Menu, X, LogOut } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/build", label: "Build" },
  { href: "/upload", label: "Upload" },
  { href: "/job-description", label: "Job Description" },
  { href: "/analysis", label: "Analysis" },
  { href: "/preview", label: "Preview" },
];

function Header() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;

  return (
    <header className="w-full border-b border-neutral-200 bg-neutral-0">
      <div className="content-container flex h-14 items-center justify-between">
        <Link href="/" className="typography-heading-md text-neutral-900">
          ResumeForge
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "typography-label transition-colors duration-150",
                  isActive ? "text-neutral-900" : "text-neutral-600 hover:text-neutral-900",
                ].join(" ")}
              >
                {item.label}
              </Link>
            );
          })}
          <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-6 w-6 rounded-full bg-accent-100 flex items-center justify-center">
                <span className="text-xs font-medium text-accent-600">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <span className="typography-label text-neutral-600">{displayName}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>

        <button
          className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors duration-150"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-neutral-200 bg-neutral-0">
          <div className="content-container flex flex-col py-3">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={[
                    "typography-body-lg py-2.5 px-3 rounded-lg transition-colors duration-150",
                    isActive ? "bg-accent-50 text-neutral-900" : "text-neutral-600 hover:bg-neutral-50",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-neutral-200 px-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-accent-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-accent-600">{displayName.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <span className="typography-label text-neutral-600 flex-1">{displayName}</span>
              <Button variant="ghost" size="sm" onClick={() => { setMobileOpen(false); signOut(); }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export { Header };
