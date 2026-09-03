"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, AlertCircle, CheckCircle2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useResumeStore } from "@/stores/useResumeStore";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { apiClient } from "@/lib/api-client";
import Link from "next/link";

const ACCEPTED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
const MAX_SIZE_MB = 10;

type UploadStage = "idle" | "reading" | "identifying" | "structuring" | "done" | "error";

const STAGE_MESSAGES: Record<UploadStage, string> = {
  idle: "",
  reading: "Reading your file...",
  identifying: "Identifying sections...",
  structuring: "Structuring your experience...",
  done: "Resume parsed successfully",
  error: "Failed to parse resume",
};

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const loadParsedResume = useResumeStore((s) => s.loadParsedResume);
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const router = useRouter();

  const validateFile = (f: File): string | null => {
    if (!ACCEPTED_TYPES.includes(f.type) && !f.name.endsWith(".pdf") && !f.name.endsWith(".docx")) {
      return "Only PDF and DOCX files are accepted";
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      return `File size must be under ${MAX_SIZE_MB}MB`;
    }
    return null;
  };

  const handleFile = useCallback((f: File) => {
    const error = validateFile(f);
    if (error) {
      setErrorMessage(error);
      setFile(null);
      return;
    }
    setErrorMessage(null);
    setFile(f);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  async function handleParse() {
    if (!file) return;
    setStage("reading");
    setErrorMessage(null);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setStage("identifying");
      await new Promise((r) => setTimeout(r, 600));
      setStage("structuring");

      const result = await apiClient.parseResume(file);
      loadParsedResume(result.resume);
      setStage("done");

      setTimeout(() => {
        router.push("/build");
      }, 800);
    } catch (err: unknown) {
      setStage("error");
      const errorObj = err as { error?: { message?: string } };
      const message = errorObj?.error?.message || (err instanceof Error ? err.message : "Failed to parse resume. Please try again.");
      setErrorMessage(message);
    }
  }

  return (
    <RequireAuth>
      <header className="w-full border-b border-neutral-200 bg-neutral-0">
        <div className="content-container flex h-14 items-center justify-between">
          <Link href="/" className="typography-heading-md text-neutral-900">ResumeForge</Link>
          <nav className="flex items-center gap-6">
            <Link href="/dashboard" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Dashboard</Link>
            <Link href="/build" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Build</Link>
            <Link href="/job-description" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Job Description</Link>
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
        <div className="max-w-xl mx-auto">
          <h1 className="typography-heading-xl text-neutral-900 mb-2">Upload Resume</h1>
          <p className="typography-body-lg text-neutral-500 mb-8">
            Upload an existing resume and we will parse it into an editable format.
          </p>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={[
              "rounded-xl border-2 border-dashed p-12 flex flex-col items-center justify-center gap-4 transition-colors duration-150",
              dragOver ? "border-accent-600 bg-accent-50" : "border-neutral-300 bg-neutral-0 hover:border-neutral-400",
            ].join(" ")}
          >
            <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center">
              <Upload className="h-6 w-6 text-neutral-500" />
            </div>
            <div className="text-center">
              <p className="typography-body-lg text-neutral-700">
                Drag and drop your resume here
              </p>
              <p className="typography-body-md text-neutral-400 mt-1">
                PDF or DOCX, max {MAX_SIZE_MB}MB
              </p>
            </div>
            <label className="cursor-pointer">
              <Button variant="secondary" size="sm" type="button">
                Browse files
              </Button>
              <input
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </div>

          {file && (
            <div className="mt-6 flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-0 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-neutral-500" />
                <div>
                  <p className="typography-body-lg text-neutral-900">{file.name}</p>
                  <p className="typography-caption text-neutral-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              {stage === "done" ? (
                <CheckCircle2 className="h-5 w-5 text-success-600" />
              ) : (
                <button onClick={() => { setFile(null); setStage("idle"); }} className="text-neutral-400 hover:text-neutral-700 transition-colors duration-150">
                  Remove
                </button>
              )}
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 flex items-center gap-2 text-error-600">
              <AlertCircle className="h-4 w-4" />
              <p className="typography-body-md">{errorMessage}</p>
            </div>
          )}

          {stage !== "idle" && stage !== "error" && (
            <div className="mt-6 flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-accent-600" />
              <p className="typography-body-md text-neutral-600">{STAGE_MESSAGES[stage]}</p>
            </div>
          )}

          <div className="mt-8 flex items-center gap-4">
            <Button
              onClick={handleParse}
              disabled={!file || stage === "reading" || stage === "identifying" || stage === "structuring" || stage === "done"}
              loading={stage === "reading" || stage === "identifying" || stage === "structuring"}
            >
              Upload & Parse
            </Button>
            <Link href="/build">
              <Button variant="ghost">Start from scratch instead</Button>
            </Link>
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
