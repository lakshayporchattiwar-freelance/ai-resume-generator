"use client";

import Link from "next/link";
import { Sparkles, Upload, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth";

const FEATURES = [
  {
    numeral: "1",
    title: "ATS-Optimized Scoring",
    description: "Get a precise compatibility score against any job description with actionable recommendations.",
  },
  {
    numeral: "2",
    title: "AI-Powered Rewriting",
    description: "Improve summaries, bullet points, and achievements with guardrail-validated AI assistance.",
  },
  {
    numeral: "3",
    title: "Professional Export",
    description: "Export ATS-safe PDF and DOCX files with clean formatting that passes automated screening.",
  },
];

const STEPS = [
  { numeral: "1", label: "Build your resume" },
  { numeral: "2", label: "Add a job description" },
  { numeral: "3", label: "Get your ATS score" },
  { numeral: "4", label: "Export and apply" },
];

export default function LandingPage() {
  const { user, loading, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";

  return (
    <>
      <header className="w-full border-b border-neutral-200 bg-neutral-0">
        <div className="content-container flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-neutral-900">
            <span className="typography-heading-md">ResumeForge</span>
          </Link>
          <nav className="flex items-center gap-6">
            {user ? (
              <>
                <Link href="/dashboard" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">
                  Dashboard
                </Link>
                <Link href="/build" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">
                  Build
                </Link>
                <Link href="/upload" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">
                  Upload
                </Link>
                <Link href="/preview" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">
                  Preview
                </Link>
                <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
                  <span className="typography-label text-neutral-600">{displayName}</span>
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">
                  Sign In
                </Link>
                <Link href="/login">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="content-container pt-24 pb-24">
          <div className="max-w-2xl">
            <h1 className="typography-display text-neutral-900 mb-6">
              Build resumes that pass the screen, <span className="text-accent-600">powered by AI</span>
            </h1>
            <p className="typography-body-lg text-neutral-500 mb-10 max-w-lg">
              Create, optimize, and tailor your resume for any job description. Get an ATS compatibility score and export professional documents.
            </p>
            <div className="flex items-center gap-4">
              <Link href={user ? "/dashboard" : "/login"}>
                <Button size="lg" className="group">
                  {user ? "Go to Dashboard" : "Create Resume"}
                  <ArrowRight className="h-4 w-4 transition-transform duration-150 group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href={user ? "/upload" : "/login"}>
                <Button variant="secondary" size="lg">
                  <Upload className="h-4 w-4" />
                  Upload Existing
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="bg-neutral-50 border-t border-neutral-200">
          <div className="content-container py-24">
            <h2 className="typography-heading-xl text-neutral-900 mb-12">
              Precision tools for professionals
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {FEATURES.map((feature) => (
                <div key={feature.numeral} className="rounded-xl border border-neutral-200 bg-neutral-0 p-6">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 mb-4">
                    <span className="typography-heading-lg text-neutral-800">{feature.numeral}</span>
                  </div>
                  <h3 className="typography-heading-md text-neutral-900 mb-2">{feature.title}</h3>
                  <p className="typography-body-md text-neutral-500">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="content-container py-24">
          <h2 className="typography-heading-xl text-neutral-900 mb-12">How it works</h2>
          <div className="flex items-start gap-12">
            {STEPS.map((step, i) => (
              <div key={step.numeral} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100">
                  <span className="typography-heading-lg text-neutral-800">{step.numeral}</span>
                </div>
                <div>
                  <p className="typography-body-lg text-neutral-700">{step.label}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-neutral-400 mt-3 shrink-0 hidden md:block" />
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 bg-neutral-50">
        <div className="content-container py-12">
          <div className="flex items-center justify-between">
            <span className="typography-body-md text-neutral-500">ResumeForge</span>
            <div className="flex items-center gap-6">
              <Link href={user ? "/dashboard" : "/login"} className="typography-body-md text-neutral-500 hover:text-neutral-700 transition-colors duration-150">
                Dashboard
              </Link>
              <Link href={user ? "/build" : "/login"} className="typography-body-md text-neutral-500 hover:text-neutral-700 transition-colors duration-150">
                Build
              </Link>
              <Link href={user ? "/upload" : "/login"} className="typography-body-md text-neutral-500 hover:text-neutral-700 transition-colors duration-150">
                Upload
              </Link>
              <Link href={user ? "/job-description" : "/login"} className="typography-body-md text-neutral-500 hover:text-neutral-700 transition-colors duration-150">
                Job Description
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
