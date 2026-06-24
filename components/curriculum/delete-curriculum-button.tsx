"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurriculumCatalog } from "@/components/curriculum/curriculum-catalog-context";
import { useCurrentTopic } from "@/components/current-topic/current-topic-context";
import { requestCalendarRefresh } from "@/lib/ui/app-events";
import { Button } from "@/components/ui/button";

type DeleteCurriculumButtonProps = {
  curriculumId: string;
  curriculumTitle: string;
  onDeleted?: () => void;
};

export function DeleteCurriculumButton({
  curriculumId,
  curriculumTitle,
  onDeleted,
}: DeleteCurriculumButtonProps) {
  const router = useRouter();
  const { removeCurriculum } = useCurriculumCatalog();
  const { currentTopic, clearTopic } = useCurrentTopic();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${curriculumTitle}"?\n\nThis removes the curriculum, its standards, related lessons, and calendar events. This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/curriculum/${curriculumId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete curriculum.");
      }

      if (currentTopic?.curriculumId === curriculumId) {
        await clearTopic();
      }

      removeCurriculum(curriculumId);
      requestCalendarRefresh();
      router.refresh();
      onDeleted?.();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Could not delete curriculum.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="secondary"
        disabled={isDeleting}
        onClick={() => void handleDelete()}
        className="border-danger/40 text-danger hover:bg-danger-soft"
      >
        {isDeleting ? "Deleting curriculum…" : "Delete curriculum"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
