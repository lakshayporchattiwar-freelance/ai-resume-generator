"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, FileText, Clock, LogOut, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth";
import { useResumeStore } from "@/stores/useResumeStore";
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
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [loading, setLoading] = useState(true);
  const resetResume = useResumeStore((s) => s.resetResume);

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
    <>
      <header className="w-full border-b border-neutral-200 bg-neutral-0">
        <div className="content-container flex h-14 items-center justify-between">
          <Link href="/" className="typography-heading-md text-neutral-900">ResumeForge</Link>
          <nav className="flex items-center gap-6">
            <Link href="/build" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Build</Link>
            <Link href="/upload" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Upload</Link>
            <Link href="/job-description" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Job Description</Link>
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
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="typography-heading-xl text-neutral-900 mb-2">My Resumes</h1>
              <p className="typography-body-lg text-neutral-500">
                Your saved resumes are stored securely and available across sessions.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/build">
                <Button onClick={handleNewResume}>
                  <Plus className="h-4 w-4" />
                  New Resume
                </Button>
              </Link>
              <Link href="/upload">
                <Button variant="secondary">
                  Upload
                </Button>
              </Link>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-accent-600" />
            </div>
          )}

          {!loading && resumes.length === 0 && (
            <Card className="text-center py-16">
              <FileText className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
              <h3 className="typography-heading-lg text-neutral-700 mb-2">No resumes yet</h3>
              <p className="typography-body-md text-neutral-500 mb-6">
                Create your first resume or upload an existing one to get started.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link href="/build">
                  <Button>Create Resume</Button>
                </Link>
                <Link href="/upload">
                  <Button variant="secondary">Upload Resume</Button>
                </Link>
              </div>
            </Card>
          )}

          {!loading && resumes.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {resumes.map((resume) => (
                <Card key={resume.id} className="hover:border-neutral-300 transition-colors duration-150">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="typography-heading-md text-neutral-900">
                        {resume.personal_details?.full_name || "Untitled Resume"}
                      </h3>
                      {resume.personal_details?.professional_title && (
                        <p className="typography-body-md text-neutral-500">{resume.personal_details.professional_title}</p>
                      )}
                    </div>
                    <Badge variant={resume.source === "uploaded" ? "info" : "neutral"}>
                      {resume.source === "uploaded" ? "Uploaded" : "Created"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-neutral-400 mb-4">
                    <Clock className="h-3.5 w-3.5" />
                    <span className="typography-caption">Updated {formatDate(resume.updated_at?.split("T")[0] || "")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href="/build" className="flex-1">
                      <Button variant="secondary" size="sm" className="w-full">Edit</Button>
                    </Link>
                    <Link href="/preview" className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full">Preview</Button>
                    </Link>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(resume.id)}>
                      <Trash2 className="h-4 w-4 text-neutral-400" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
