"use client";

import type { Profile, StudentSafe } from "@/types/profile";
import { useCurriculumCatalog } from "@/components/curriculum/curriculum-catalog-context";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { CurriculumPane } from "@/components/curriculum/curriculum-pane";
import { ProposedCurriculumPane } from "@/components/proposed-curriculum/proposed-curriculum-pane";
import { ProposedLessonsPane } from "@/components/proposed-lessons/proposed-lessons-pane";
import { ProfilePane } from "@/components/profile/profile-pane";
import { CreateCurriculumPane } from "@/components/main-pane/create-curriculum-pane";
import { LessonPane } from "@/components/main-pane/lesson-pane";

type AuthenticatedMainPaneProps = {
  profile: Profile;
  email: string;
  students: StudentSafe[];
  isStudentAccount: boolean;
  showProfileIncompleteBanner: boolean;
};

export function AuthenticatedMainPane({
  profile,
  email,
  students,
  isStudentAccount,
  showProfileIncompleteBanner,
}: AuthenticatedMainPaneProps) {
  const { view, selectedLessonEvent } = useMainPane();
  const { curricula, curriculumDetails } = useCurriculumCatalog();

  if (view === "lessons") {
    if (selectedLessonEvent) {
      return <LessonPane event={selectedLessonEvent} />;
    }

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">Lessons &amp; Calendar</h2>
        <p className="text-sm leading-7 text-muted">
          Select a lesson from the calendar above to view it here. Use the menu
          chat to ask questions or test your knowledge on the selected lesson.
        </p>
      </div>
    );
  }

  if (view === "proposed-lessons") {
    return <ProposedLessonsPane />;
  }

  if (view === "proposed-curriculum") {
    return <ProposedCurriculumPane students={students} />;
  }

  if (view === "curriculum") {
    return (
      <CurriculumPane
        curricula={curricula}
        curriculumDetails={curriculumDetails}
        students={students}
      />
    );
  }

  if (view === "profile") {
    return (
      <ProfilePane
        initialProfile={profile}
        initialEmail={email}
        initialStudents={students}
        isStudentAccount={isStudentAccount}
      />
    );
  }

  return (
    <CreateCurriculumPane
      students={students}
      showProfileIncompleteBanner={showProfileIncompleteBanner}
    />
  );
}
