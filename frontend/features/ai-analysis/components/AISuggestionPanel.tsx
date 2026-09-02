"use client";

import { useState } from "react";
import { Sparkles, Check, X, Pencil, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { apiClient } from "@/lib/api-client";
import { useJobDescriptionStore } from "@/stores/useJobDescriptionStore";
import type { ActionType, AIGenerationResult } from "@/types/analysis";

interface AISuggestionPanelProps {
  actionType: ActionType;
  sourceContent?: string;
  sourceBullets?: string[];
  onAccept?: (content: string) => void;
  onAcceptBullets?: (bullets: string[]) => void;
  onDiscard?: () => void;
  onClose?: () => void;
  label?: string;
}

function AISuggestionPanel({
  actionType,
  sourceContent,
  sourceBullets,
  onAccept,
  onAcceptBullets,
  onDiscard,
  onClose,
  label = "Improve with AI",
}: AISuggestionPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AIGenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [editedBullets, setEditedBullets] = useState<string[]>([]);
  const jdAnalysis = useJobDescriptionStore((s) => s.analysis);
  const jdJobTitle = useJobDescriptionStore((s) => s.input.job_title);

  const hasSource = (sourceContent && sourceContent.trim().length > 0) || (sourceBullets && sourceBullets.length > 0);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const response = await apiClient.aiGenerate({
        action_type: actionType,
        source_content: sourceContent,
        source_bullets: sourceBullets,
        job_description_analysis: jdAnalysis || undefined,
      });
      setResult(response);
      setEditedContent(response.generated_content || "");
      setEditedBullets(response.generated_bullets || []);
    } catch (e: unknown) {
      const errorObj = e as { error?: { message?: string } };
      const message = errorObj?.error?.message || (e instanceof Error ? e.message : "AI generation failed. Please try again.");
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function handleAccept() {
    if (result?.generated_bullets && result.generated_bullets.length > 0 && onAcceptBullets) {
      onAcceptBullets(editing ? editedBullets : result.generated_bullets);
    } else if (result?.generated_content && onAccept) {
      onAccept(editing ? editedContent : result.generated_content);
    }
    setResult(null);
    setEditing(false);
  }

  function handleDiscard() {
    setResult(null);
    setEditing(false);
    onDiscard?.();
  }

  if (!hasSource) {
    return (
      <div className="flex items-center gap-2">
        <span className="typography-body-md text-neutral-400">Add content first to enable AI suggestions</span>
      </div>
    );
  }

  if (result) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 mt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-600" />
            <span className="typography-label text-neutral-700">AI Suggestion</span>
            {jdJobTitle && (
              <Badge variant="info">Tailored to: {jdJobTitle}</Badge>
            )}
          </div>
          {result.warning_message && (
            <Badge variant="warning">
              <AlertTriangle className="h-3 w-3" />
              Guardrail warning
            </Badge>
          )}
        </div>

        {result.generated_content && (
          editing ? (
            <textarea
              value={editedContent}
              onChange={(e) => setEditedContent(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 bg-neutral-0 p-3 typography-body-lg text-neutral-900 min-h-[80px] resize-y focus:border-accent-600 focus:outline-none focus:ring-[3px] focus:ring-accent-100"
            />
          ) : (
            <p className="typography-body-lg text-neutral-700 whitespace-pre-wrap mb-3">
              {result.generated_content}
            </p>
          )
        )}

        {result.generated_bullets && result.generated_bullets.length > 0 && (
          editing ? (
            <div className="flex flex-col gap-2">
              {editedBullets.map((bullet, i) => (
                <textarea
                  key={i}
                  value={bullet}
                  onChange={(e) => {
                    const updated = [...editedBullets];
                    updated[i] = e.target.value;
                    setEditedBullets(updated);
                  }}
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-0 px-3 py-2 typography-body-lg text-neutral-900 resize-y min-h-[40px] focus:border-accent-600 focus:outline-none focus:ring-[3px] focus:ring-accent-100"
                />
              ))}
            </div>
          ) : (
            <ul className="flex flex-col gap-1.5 mb-3">
              {result.generated_bullets.map((bullet, i) => (
                <li key={i} className="typography-body-lg text-neutral-700 pl-4 relative before:absolute before:left-0 before:top-2.5 before:h-1.5 before:w-1.5 before:rounded-full before:bg-neutral-400">
                  {bullet}
                </li>
              ))}
            </ul>
          )
        )}

        <div className="flex items-center gap-3 mt-4">
          <Button size="sm" onClick={handleAccept}>
            <Check className="h-3.5 w-3.5" />
            Accept
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(!editing)}>
            <Pencil className="h-3.5 w-3.5" />
            {editing ? "Stop editing" : "Edit"}
          </Button>
          <Button size="sm" variant="ghost" onClick={handleDiscard}>
            <X className="h-3.5 w-3.5" />
            Discard
          </Button>
        </div>

        {result.warning_message && (
          <p className="typography-body-md text-warning-600 mt-3">{result.warning_message}</p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-accent-600" />
        <span className="typography-body-md text-neutral-500">Generating suggestion...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-3 mt-2">
        <span className="typography-body-md text-error-600">{error}</span>
        <Button size="sm" variant="ghost" onClick={handleGenerate}>
          <RotateCcw className="h-3.5 w-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <Button variant="ai" size="sm" onClick={handleGenerate}>
      {label}
    </Button>
  );
}

export { AISuggestionPanel };
