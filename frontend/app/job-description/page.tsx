"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Upload, AlertCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/TextInput";
import { TextArea } from "@/components/ui/TextArea";
import { Badge } from "@/components/ui/Badge";
import { useJobDescriptionStore } from "@/stores/useJobDescriptionStore";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

type TabValue = "paste" | "upload";

export default function JobDescriptionPage() {
  const [tab, setTab] = useState<TabValue>("paste");
  const [file, setFile] = useState<File | null>(null);
  const input = useJobDescriptionStore((s) => s.input);
  const setInput = useJobDescriptionStore((s) => s.setInput);
  const isLoading = useJobDescriptionStore((s) => s.isLoading);
  const error = useJobDescriptionStore((s) => s.error);
  const setAnalysis = useJobDescriptionStore((s) => s.setAnalysis);
  const setLoading = useJobDescriptionStore((s) => s.setLoading);
  const setError = useJobDescriptionStore((s) => s.setError);
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const router = useRouter();

  const hasContent = tab === "paste"
    ? (input.raw_text?.trim()?.length || 0) > 0
    : file !== null;

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      if (tab === "paste") {
        const result = await apiClient.analyzeJobDescriptionText(
          input.raw_text || "",
          input.job_title,
          input.company_name
        );
        setAnalysis(result);
      } else if (file) {
        setInput({ source_type: "uploaded_file" });
        const result = await apiClient.analyzeJobDescriptionFile(
          file,
          input.job_title,
          input.company_name
        );
        setAnalysis(result);
      }
      router.push("/analysis");
    } catch (err: unknown) {
      const errorObj = err as { error?: { message?: string } };
      const message = errorObj?.error?.message || (err instanceof Error ? err.message : "Analysis failed. Please try again.");
      setError(message);
    }
  }

  return (
    <>
      <header className="w-full border-b border-neutral-200 bg-neutral-0">
        <div className="content-container flex h-14 items-center justify-between">
          <Link href="/" className="typography-heading-md text-neutral-900">ResumeForge</Link>
          <nav className="flex items-center gap-6">
            <Link href="/build" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Build</Link>
            <Link href="/analysis" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Analysis</Link>
            <Link href="/preview" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Preview</Link>
            <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
              <span className="typography-label text-neutral-600">{displayName}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="content-container py-16">
        <div className="max-w-2xl mx-auto">
          <h1 className="typography-heading-xl text-neutral-900 mb-2">Job Description</h1>
          <p className="typography-body-lg text-neutral-500 mb-8">
            Paste or upload a job description to analyze keyword requirements and optimize your resume.
          </p>

          <div className="rounded-xl border border-neutral-200 bg-neutral-0 p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <TextInput
                label="Job Title"
                value={input.job_title || ""}
                onChange={(e) => setInput({ job_title: e.target.value })}
                placeholder="Software Engineer"
              />
              <TextInput
                label="Company Name"
                value={input.company_name || ""}
                onChange={(e) => setInput({ company_name: e.target.value })}
                placeholder="Acme Corp"
              />
            </div>

            <div className="mb-6">
              <div className="inline-flex rounded-lg bg-neutral-100 p-1">
                <button
                  onClick={() => setTab("paste")}
                  className={[
                    "rounded-md px-4 py-1.5 typography-label transition-colors duration-150",
                    tab === "paste"
                      ? "bg-neutral-0 text-neutral-900 border border-neutral-200"
                      : "text-neutral-500 hover:text-neutral-700",
                  ].join(" ")}
                >
                  Paste Text
                </button>
                <button
                  onClick={() => setTab("upload")}
                  className={[
                    "rounded-md px-4 py-1.5 typography-label transition-colors duration-150",
                    tab === "upload"
                      ? "bg-neutral-0 text-neutral-900 border border-neutral-200"
                      : "text-neutral-500 hover:text-neutral-700",
                  ].join(" ")}
                >
                  Upload File
                </button>
              </div>
            </div>

            {tab === "paste" ? (
              <TextArea
                label="Job Description"
                value={input.raw_text || ""}
                onChange={(e) => setInput({ raw_text: e.target.value, source_type: "pasted_text" })}
                placeholder="Paste the full job description here..."
                rows={10}
                maxLength={20000}
              />
            ) : (
              <div className="rounded-lg border border-dashed border-neutral-300 p-8 flex flex-col items-center gap-3">
                <Upload className="h-6 w-6 text-neutral-400" />
                <p className="typography-body-md text-neutral-500">PDF or DOCX, max 10MB</p>
                <label className="cursor-pointer">
                  <Button variant="secondary" size="sm" type="button">Browse files</Button>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) setFile(f);
                    }}
                  />
                </label>
                {file && (
                  <p className="typography-caption text-neutral-600">{file.name}</p>
                )}
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 text-error-600">
                <AlertCircle className="h-4 w-4" />
                <p className="typography-body-md">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-4 mt-6 pt-6 border-t border-neutral-200">
              <Button
                variant="ai"
                onClick={handleAnalyze}
                disabled={!hasContent || isLoading}
                loading={isLoading}
              >
                Analyze Job Description
              </Button>
              <Button variant="ghost" onClick={() => router.push("/analysis")}>
                Skip for Now
              </Button>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
