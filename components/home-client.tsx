"use client";

import type {
  CurrentTopic,
  CurriculumDetail,
  CurriculumSummary,
  LessonPlannerSettings,
} from "@/types/curriculum";
import type { CalendarEventDisplay } from "@/types/calendar";
import type { Profile, StudentSafe } from "@/types/profile";
import { SiteHeader } from "@/components/layout/site-header";
import { AppShell } from "@/components/layout/app-shell";
import { GuestMainPane } from "@/components/guest-main-pane";
import { AuthenticatedMainPane } from "@/components/main-pane/authenticated-main-pane";
import { CurrentTopicProvider } from "@/components/current-topic/current-topic-context";
import { LessonPlannerProvider } from "@/components/lesson-planner/lesson-planner-context";
import { MenuChatProvider } from "@/components/menu/menu-chat-context";

type HomeClientProps = {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  profile: Profile | null;
  students: StudentSafe[];
  isStudentAccount: boolean;
  showProfileIncompleteBanner: boolean;
  curricula: CurriculumSummary[];
  curriculumDetails: CurriculumDetail[];
  initialSettings: LessonPlannerSettings | null;
  initialCurrentTopic: CurrentTopic | null;
  initialActiveStudentId: string | null;
  initialCalendarEvents: CalendarEventDisplay[];
};

export function HomeClient({
  userId,
  userName,
  userEmail,
  isAuthenticated,
  profile,
  students,
  isStudentAccount,
  showProfileIncompleteBanner,
  curricula,
  curriculumDetails,
  initialSettings,
  initialCurrentTopic,
  initialActiveStudentId,
  initialCalendarEvents,
}: HomeClientProps) {
  const shell = (
    <>
      <SiteHeader
        userName={userName}
        userEmail={userEmail}
        showProfileLink={isAuthenticated}
      />
      <AppShell
        showIntro={false}
        menuStudents={isAuthenticated ? students : []}
        calendarStudents={isAuthenticated ? students : []}
        initialCalendarEvents={isAuthenticated ? initialCalendarEvents : []}
        isStudentAccount={isStudentAccount}
      >
        {isAuthenticated && profile ? (
          <AuthenticatedMainPane
            profile={profile}
            email={userEmail ?? ""}
            students={students}
            isStudentAccount={isStudentAccount}
            showProfileIncompleteBanner={showProfileIncompleteBanner}
            curricula={curricula}
            curriculumDetails={curriculumDetails}
          />
        ) : isAuthenticated ? (
          <div className="mx-auto max-w-lg rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
            Your account loaded, but profile data is missing. Run the Phase 2 SQL
            migration in Supabase, then refresh this page.
          </div>
        ) : (
          <GuestMainPane />
        )}
      </AppShell>
    </>
  );

  if (isAuthenticated && profile && userId) {
    const primaryStudentId =
      students.find((s) => s.is_primary)?.id ?? students[0]?.id ?? null;

    return (
      <LessonPlannerProvider
        userId={userId}
        initialSettings={initialSettings}
        primaryStudentId={primaryStudentId}
      >
        <MenuChatProvider>
          <CurrentTopicProvider
            initialTopic={initialCurrentTopic}
            initialActiveStudentId={initialActiveStudentId}
          >
            <div className="flex h-screen flex-col overflow-hidden">{shell}</div>
          </CurrentTopicProvider>
        </MenuChatProvider>
      </LessonPlannerProvider>
    );
  }

  return <div className="flex h-screen flex-col overflow-hidden">{shell}</div>;
}
