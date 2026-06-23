"use client";

import type { CurriculumDetail, CurriculumSummary } from "@/types/curriculum";
import type { Profile, StudentSafe } from "@/types/profile";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { CurriculumPane } from "@/components/curriculum/curriculum-pane";
import { ProposedCurriculumPane } from "@/components/proposed-curriculum/proposed-curriculum-pane";
import { ProfilePane } from "@/components/profile/profile-pane";
import { CompleteProfileBanner } from "@/components/profile/complete-profile-banner";
import { LessonPane } from "@/components/main-pane/lesson-pane";

type AuthenticatedMainPaneProps = {
  profile: Profile;
  email: string;
  students: StudentSafe[];
  isStudentAccount: boolean;
  showProfileIncompleteBanner: boolean;
  curricula: CurriculumSummary[];
  curriculumDetails: CurriculumDetail[];
};

export function AuthenticatedMainPane({
  profile,
  email,
  students,
  isStudentAccount,
  showProfileIncompleteBanner,
  curricula,
  curriculumDetails,
}: AuthenticatedMainPaneProps) {
  const { view, selectedLessonEvent } = useMainPane();

  if (view === "lesson" && selectedLessonEvent) {
    return <LessonPane event={selectedLessonEvent} />;
  }

  if (view === "proposed-curriculum") {
    return <ProposedCurriculumPane />;
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
    <>
      <CompleteProfileBanner show={showProfileIncompleteBanner} />
      <div className="mx-auto max-w-2xl space-y-4">
        <h2 className="text-2xl font-semibold text-foreground">
          Welcome to MicroSchool Lesson Planner
        </h2>
        <p className="text-sm leading-7 text-muted">
          MicroSchool helps parents and teachers plan personalized lessons for
          each student.
        </p>
        <div className="rounded-lg border border-border bg-surface p-4 text-sm leading-7 text-foreground">
          <p className="font-medium">How to use the app shell</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
            <li>
              <strong className="text-foreground">Menu</strong> (left): lesson
              planner options and AI chat.
            </li>
            <li>
              <strong className="text-foreground">Calendar</strong> (top right):
              month/week/day views; click a lesson to open it here.
            </li>
            <li>
              <strong className="text-foreground">Curriculum</strong> (header):
              browse learning standards and select a current topic.
            </li>
            <li>
              <strong className="text-foreground">Profile</strong> (header): open
              account and student settings in this pane.
            </li>
          </ul>
        </div>
      </div>
    </>
  );
}
