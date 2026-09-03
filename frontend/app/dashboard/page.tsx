"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, FileText, Clock, LogOut, Trash2, Upload, Sparkles, BarChart3, FileDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useResumeStore } from "@/stores/useResumeStore";
import { useJobDescriptionStore } from "@/stores/useJobDescriptionStore";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { loadResumesFromSupabase, deleteResumeFromSupabase } from "@/lib/supabase/data";
import { formatDate } from "@/lib/utils/helpers";

interface SavedResume {
  id: string;
  personal_details: { full_name?: string; professional_title?: string };
  source: string;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [loading, setLoading] = useState(true);
  const resetResume = useResumeStore((s) => s.resetResume);
  const resume = useResumeStore((s) => s.resume);
  const jdAnalysis = useJobDescriptionStore((s) => s.analysis);
  const scoreResult = useAnalysisStore((s) => s.scoreResult);

  const hasActiveResume = resume.personal_details?.full_name?.trim() || resume.experience?.length || resume.education?.length || resume.projects?.length;

  useEffect(() => {
    async function load() {
      setLoading(true);
      const loaded = await loadResumesFromSupabase();
      setResumes(loaded as unknown as SavedResume[]);
      setLoading(false);
    }
    load();
  }, []);

  async function handleDelete(resumeId: string) {
    const ok = await deleteResumeFromSupabase(resumeId);
    if (ok) {
      setResumes((prev) => prev.filter((r) => r.id !== resumeId));
    }
  }

  function handleNewResume() {
    resetResume();
  }

  return (
    <RequireAuth>
      <header className="w-full border-b border-neutral-200 bg-neutral-0">
        <div className="content-container flex h-14 items-center justify-between">
          <Link href="/" className="typography-heading-md text-neutral-900">ResumeForge</Link>
          <nav className="flex items-center gap-6">
            <Link href="/build" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Build</Link>
            <Link href="/upload" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Upload</Link>
            <Link href="/job-description" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Job Description</Link>
            <Link href="/preview" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Preview</Link>
            <div className="flex items-center gap-3 pl-4 border-l border-neutral-200">
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
              ) : (
                <div className="h-6 w-6 rounded-full bg-accent-100 flex items-center justify-center">
                  <span className="text-xs font-medium text-accent-700">{displayName.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <span className="typography-label text-neutral-600">{displayName}</span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </nav>
        </div>
      </header>

      <main className="content-container py-12">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10">
            <h1 className="typography-heading-xl text-neutral-900 mb-2">
              Welcome back, {displayName}
            </h1>
            <p className="typography-body-lg text-neutral-500">
              Create, optimize, and tailor your resume for any job description.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
            <Link href="/build" onClick={handleNewResume} className="block">
              <Card className="hover:border-accent-300 hover:shadow-sm transition-all duration-150 h-full">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent-50 flex items-center justify-center shrink-0">
                    <Plus className="h-5 w-5 text-accent-600" />
                  </div>
                  <div>
                    <h3 className="typography-heading-md text-neutral-900 mb-1">Create Resume</h3>
                    <p className="typography-body-md text-neutral-500">Build from scratch with AI assistance</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/upload" className="block">
              <Card className="hover:border-accent-300 hover:shadow-sm transition-all duration-150 h-full">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                    <Upload className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="typography-heading-md text-neutral-900 mb-1">Upload Resume</h3>
                    <p className="typography-body-md text-neutral-500">Parse an existing PDF or DOCX</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/job-description" className="block">
              <Card className="hover:border-accent-300 hover:shadow-sm transition-all duration-150 h-full">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="typography-heading-md text-neutral-900 mb-1">Analyze JD</h3>
                    <p className="typography-body-md text-neutral-500">Add a job description for ATS scoring</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>

          {hasActiveResume && (
            <div className="mb-10">
              <h2 className="typography-heading-lg text-neutral-900 mb-4">Current Session</h2>
              <Card>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-accent-50 flex items-center justify-center">
                      <FileText className="h-5 w-5 text-accent-600" />
                    </div>
                    <div>
                      <h3 className="typography-heading-md text-neutral-900">
                        {resume.personal_details?.full_name || "Untitled Resume"}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        {jdAnalysis && (
                          <Badge variant="info">JD Added</Badge>
                        )}
                        {scoreResult && (
                          <Badge variant={scoreResult.overall_score >= 75 ? "success" : scoreResult.overall_score >= 50 ? "warning" : "error"}>
                            Score: {scoreResult.overall_score}/100
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/build">
                      <Button variant="secondary" size="sm">Edit</Button>
                    </Link>
                    <Link href="/analysis">
                      <Button variant="secondary" size="sm">
                        <BarChart3 className="h-3.5 w-3.5" />
                        Score
                      </Button>
                    </Link>
                    <Link href="/preview">
                      <Button size="sm">
                        <FileDown className="h-3.5 w-3.5" />
                        Export
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="typography-heading-lg text-neutral-900">Saved Resumes</h2>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-accent-600" />
              </div>
            )}

            {!loading && resumes.length === 0 && (
              <Card className="text-center py-12">
                <FileText className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
                <h3 className="typography-heading-lg text-neutral-700 mb-2">No saved resumes yet</h3>
                <p className="typography-body-md text-neutral-500 mb-6">
                  Create your first resume or upload an existing one to get started.
                </p>
                <div className="flex items-center justify-center gap-4">
                  <Link href="/build">
                    <Button onClick={handleNewResume}>Create Resume</Button>
                  </Link>
                  <Link href="/upload">
                    <Button variant="secondary">Upload Resume</Button>
                  </Link>
                </div>
              </Card>
            )}

            {!loading && resumes.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {resumes.map((resumeItem) => (
                  <Card key={resumeItem.id} className="hover:border-neutral-300 transition-colors duration-150">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="typography-heading-md text-neutral-900">
                          {resumeItem.personal_details?.full_name || "Untitled Resume"}
                        </h3>
                        {resumeItem.personal_details?.professional_title && (
                          <p className="typography-body-md text-neutral-500">{resumeItem.personal_details.professional_title}</p>
                        )}
                      </div>
                      <Badge variant={resumeItem.source === "uploaded" ? "info" : "neutral"}>
                        {resumeItem.source === "uploaded" ? "Uploaded" : "Created"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 text-neutral-400 mb-4">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="typography-caption">Updated {formatDate(resumeItem.updated_at?.split("T")[0] || "")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href="/build" className="flex-1">
                        <Button variant="secondary" size="sm" className="w-full">Edit</Button>
                      </Link>
                      <Link href="/preview" className="flex-1">
                        <Button variant="ghost" size="sm" className="w-full">Preview</Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(resumeItem.id)}>
                        <Trash2 className="h-4 w-4 text-neutral-400" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </RequireAuth>
  );
}
