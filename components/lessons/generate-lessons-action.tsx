"use client";

import { useState } from "react";
import type { ProposedCurriculum } from "@/types/curriculum";
import type { ProposedLessonPlan } from "@/types/lesson";
import { useProposedLessons } from "@/components/proposed-lessons/proposed-lessons-context";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { Button } from "@/components/ui/button";

type GenerateLessonsActionProps = {
  studentId: string;
  source: "current_topic" | "proposed_curriculum";
  standardId?: string;
  proposedCurriculum?: ProposedCurriculum;
  label?: string;
  size?: "sm" | "md";
};

export function GenerateLessonsAction({
  studentId,
  source,
  standardId,
  proposedCurriculum,
  label = "Generate lessons with AI",
  size = "sm",
}: GenerateLessonsActionProps) {
  const { setDraftPlan } = useProposedLessons();
  const { openProposedLessons } = useMainPane();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/lessons/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          source,
          standardId,
          proposedCurriculum,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 422 && data.error === "missing_api_key") {
        throw new Error(
          data.message ??
            "Add OPENAI_API_KEY to .env.local, or add a per-student key in Profile.",
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ??
            data.message ??
            "Could not generate lessons. Run migration 006 in Supabase if you have not yet.",
        );
      }

      setDraftPlan(data.draft as ProposedLessonPlan);
      openProposedLessons();
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "Could not generate lessons.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        size={size}
        disabled={isGenerating}
        onClick={() => void handleGenerate()}
      >
        {isGenerating ? "Generating…" : label}
      </Button>
      {error ? (
        <p className="rounded-md bg-danger-soft px-2 py-1.5 text-xs text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
