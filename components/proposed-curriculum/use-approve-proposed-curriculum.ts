"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { CurriculumDetail, ProposedCurriculum } from "@/types/curriculum";
import { useCurriculumCatalog } from "@/components/curriculum/curriculum-catalog-context";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { useProposedCurriculum } from "@/components/proposed-curriculum/proposed-curriculum-context";
import { resolveActiveStudentId } from "@/lib/students/access";
import type { StudentSafe } from "@/types/profile";

type UseApproveProposedCurriculumOptions = {
  students: StudentSafe[];
  selectedStudentIds: string[];
  currentTopicStudentId?: string | null;
};

export function useApproveProposedCurriculum({
  students,
  selectedStudentIds,
  currentTopicStudentId,
}: UseApproveProposedCurriculumOptions) {
  const router = useRouter();
  const { upsertSavedCurriculum } = useCurriculumCatalog();
  const { openCurriculumWithId } = useMainPane();
  const { clearProposedCurriculum } = useProposedCurriculum();
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const activeStudentId = resolveActiveStudentId(
    students,
    selectedStudentIds,
    currentTopicStudentId,
  );

  const approveProposedCurriculum = useCallback(
    async (curriculum: ProposedCurriculum) => {
      if (!activeStudentId) {
        setError("Select a student in Menu → Lesson Planner Options first.");
        return false;
      }

      setIsBuilding(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await fetch("/api/curriculum/build-from-chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: activeStudentId,
            proposedCurriculum: curriculum,
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
              "Could not save curriculum plan. Run migration 007 in Supabase if you have not yet.",
          );
        }

        const { result } = data as {
          result?: {
            curriculumId: string;
            standardsCount: number;
            ksasCount: number;
            lessonsCount: number;
            curriculumDetail?: CurriculumDetail;
          };
        };

        if (!result?.curriculumId) {
          throw new Error("Could not save curriculum plan.");
        }

        if (result.curriculumDetail) {
          upsertSavedCurriculum(result.curriculumDetail);
        }

        setSuccess(
          `Approved ${result.standardsCount} standard(s), generated ${result.ksasCount} KSA(s), and scheduled ${result.lessonsCount} lesson(s) for the first week.`,
        );
        clearProposedCurriculum();
        openCurriculumWithId(result.curriculumId);
        router.refresh();
        return true;
      } catch (buildError) {
        setError(
          buildError instanceof Error
            ? buildError.message
            : "Could not approve proposed standards.",
        );
        return false;
      } finally {
        setIsBuilding(false);
      }
    },
    [
      activeStudentId,
      clearProposedCurriculum,
      openCurriculumWithId,
      router,
      upsertSavedCurriculum,
    ],
  );

  return {
    activeStudentId,
    approveProposedCurriculum,
    isBuilding,
    error,
    success,
    setError,
    setSuccess,
  };
}
