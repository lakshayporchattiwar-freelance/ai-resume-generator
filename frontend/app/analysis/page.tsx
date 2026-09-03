"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, XCircle, ArrowRight, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useAnalysisStore } from "@/stores/useAnalysisStore";
import { useResumeStore } from "@/stores/useResumeStore";
import { useJobDescriptionStore } from "@/stores/useJobDescriptionStore";
import { useAuth } from "@/lib/auth";
import { apiClient } from "@/lib/api-client";
import { getScoreColor, getScoreBgTint } from "@/lib/utils/helpers";
import Link from "next/link";
import type { SubScores, Recommendation } from "@/types/analysis";

function ScoreRing({ score }: { score: number }) {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;
  const colorClass = score >= 75 ? "text-success-600" : score >= 50 ? "text-warning-600" : "text-error-600";
  const strokeColor = score >= 75 ? "#16A34A" : score >= 50 ? "#D97706" : "#DC2626";

  useEffect(() => {
    let start = 0;
    const duration = 550;
    const startTime = performance.now();
    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="128" height="128" viewBox="0 0 128 128">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="#E4E4E7" strokeWidth="8" />
        <circle
          cx="64" cy="64" r={radius} fill="none"
          stroke={strokeColor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 64 64)"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`typography-heading-xl ${colorClass}`}>{displayScore}</span>
        <span className="typography-caption text-neutral-500">of 100</span>
      </div>
    </div>
  );
}

function SubScoreBar({ label, score }: { label: string; score: number }) {
  const color = score >= 75 ? "bg-success-600" : score >= 50 ? "bg-warning-600" : "bg-error-600";
  const textColor = score >= 75 ? "text-success-600" : score >= 50 ? "text-warning-600" : "text-error-600";

  return (
    <div className="flex items-center gap-4">
      <span className="typography-body-md text-neutral-600 w-44 shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-neutral-200">
        <div
          className={`h-2 rounded-full ${color} transition-all duration-500 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`typography-label ${textColor} w-10 text-right`}>{score}</span>
    </div>
  );
}

function RecommendationRow({ rec }: { rec: Recommendation }) {
  const priorityVariant = rec.priority === "high" ? "error" : rec.priority === "medium" ? "warning" : "neutral";
  return (
    <div className="flex items-start gap-3 py-3 border-b border-neutral-200 last:border-0">
      <Badge variant={priorityVariant} className="shrink-0 mt-0.5">{rec.priority}</Badge>
      <p className="typography-body-md text-neutral-700 flex-1">{rec.message}</p>
      {rec.related_section && (
        <Link href={`/build`} className="typography-label text-accent-600 hover:text-accent-700 shrink-0">
          Edit
        </Link>
      )}
    </div>
  );
}

function KeywordList({ title, keywords, variant }: { title: string; keywords: string[]; variant: "success" | "error" | "warning" }) {
  if (keywords.length === 0) return null;
  return (
    <div>
      <h3 className="typography-label text-neutral-600 mb-2">{title} ({keywords.length})</h3>
      <div className="flex flex-wrap gap-1.5">
        {keywords.map((kw) => (
          <Badge key={kw} variant={variant}>{kw}</Badge>
        ))}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  const scoreResult = useAnalysisStore((s) => s.scoreResult);
  const isLoading = useAnalysisStore((s) => s.isLoading);
  const error = useAnalysisStore((s) => s.error);
  const isStale = useAnalysisStore((s) => s.isStale);
  const setScoreResult = useAnalysisStore((s) => s.setScoreResult);
  const setLoading = useAnalysisStore((s) => s.setLoading);
  const setError = useAnalysisStore((s) => s.setError);
  const resume = useResumeStore((s) => s.resume);
  const jdAnalysis = useJobDescriptionStore((s) => s.analysis);
  const { user, signOut } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const router = useRouter();

  async function handleScore() {
    if (!jdAnalysis) {
      router.push("/job-description");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await apiClient.scoreResume(resume, jdAnalysis);
      setScoreResult(result);
    } catch (err: unknown) {
      const errorObj = err as { error?: { message?: string } };
      const message = errorObj?.error?.message || (err instanceof Error ? err.message : "Scoring failed. Please try again.");
      setError(message);
    }
  }

  const hasJd = jdAnalysis !== null;

  return (
    <>
      <header className="w-full border-b border-neutral-200 bg-neutral-0">
        <div className="content-container flex h-14 items-center justify-between">
          <Link href="/" className="typography-heading-md text-neutral-900">ResumeForge</Link>
          <nav className="flex items-center gap-6">
            <Link href="/build" className="typography-label text-neutral-600 hover:text-neutral-900 transition-colors duration-150">Build</Link>
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
        <div className="max-w-3xl mx-auto">
          <h1 className="typography-heading-xl text-neutral-900 mb-2">ATS Score</h1>
          <p className="typography-body-lg text-neutral-500 mb-8">
            Analyze your resume against the job description to find compatibility.
          </p>

          {!hasJd && (
            <Card className="text-center py-12">
              <p className="typography-body-lg text-neutral-600 mb-4">
                Add a job description first to enable scoring.
              </p>
              <Link href="/job-description">
                <Button>Add Job Description</Button>
              </Link>
            </Card>
          )}

          {hasJd && !scoreResult && (
            <Card className="text-center py-12">
              <p className="typography-body-lg text-neutral-600 mb-4">
                {isStale && scoreResult
                  ? "Your resume has changed. Re-analyze to get an updated score."
                  : "Analyze your resume against the job description."}
              </p>
              <Button onClick={handleScore} loading={isLoading}>
                Analyze My Resume
              </Button>
              {error && (
                <div className="mt-4 flex items-center justify-center gap-2 text-error-600">
                  <AlertCircle className="h-4 w-4" />
                  <p className="typography-body-md">{error}</p>
                </div>
              )}
            </Card>
          )}

          {scoreResult && (
            <div className="flex flex-col gap-8">
              <Card>
                <div className="flex items-start gap-8">
                  <ScoreRing score={scoreResult.overall_score} />
                  <div className="flex-1 flex flex-col gap-4 pt-2">
                    <div>
                      <h2 className="typography-heading-lg text-neutral-900 mb-1">Overall Score</h2>
                      <p className="typography-body-md text-neutral-500">
                        {scoreResult.overall_score >= 75
                          ? "Your resume is well-aligned with this job."
                          : scoreResult.overall_score >= 50
                          ? "Some areas need improvement."
                          : "Significant improvements recommended."}
                      </p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <SubScoreBar label="Keyword Coverage" score={scoreResult.sub_scores.keyword_coverage} />
                      <SubScoreBar label="Skills Alignment" score={scoreResult.sub_scores.skills_alignment} />
                      <SubScoreBar label="Experience Relevance" score={scoreResult.sub_scores.experience_relevance} />
                      <SubScoreBar label="Formatting" score={scoreResult.sub_scores.formatting_compatibility} />
                    </div>
                  </div>
                </div>
              </Card>

              <div>
                <h2 className="typography-heading-lg text-neutral-900 mb-4">Keywords</h2>
                <div className="flex flex-col gap-4">
                  <KeywordList title="Matched" keywords={scoreResult.matched_keywords} variant="success" />
                  <KeywordList title="Missing Required" keywords={scoreResult.missing_required_keywords} variant="error" />
                  <KeywordList title="Missing Preferred" keywords={scoreResult.missing_preferred_keywords} variant="warning" />
                </div>
              </div>

              <div>
                <h2 className="typography-heading-lg text-neutral-900 mb-4">Recommendations</h2>
                <div className="rounded-xl border border-neutral-200 bg-neutral-0 divide-y divide-neutral-200">
                  {scoreResult.recommendations.length === 0 ? (
                    <p className="typography-body-md text-neutral-500 p-6">No recommendations. Your resume looks good.</p>
                  ) : (
                    scoreResult.recommendations.map((rec, i) => (
                      <RecommendationRow key={i} rec={rec} />
                    ))
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Link href="/build">
                  <Button variant="secondary">Edit Resume</Button>
                </Link>
                {isStale && (
                  <Button variant="ghost" onClick={handleScore} loading={isLoading}>
                    Re-analyze
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
