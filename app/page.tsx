import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isProfileIncomplete } from "@/lib/profile/validation";
import {
  fetchCurricula,
  fetchCurriculumDetail,
  fetchStudentCurriculumIds,
} from "@/lib/curriculum/fetch";
import {
  fetchInitialCurrentTopic,
  fetchLessonPlannerSettings,
} from "@/lib/lesson-planner/load-settings";
import { fetchCalendarEvents } from "@/lib/calendar/fetch";
import { getViewRange } from "@/lib/calendar/date-utils";
import { HomeClient } from "@/components/home-client";
import { EnvBanner } from "@/components/setup/env-banner";
import type {
  CurrentTopic,
  CurriculumDetail,
  CurriculumSummary,
  LessonPlannerSettings,
} from "@/types/curriculum";
import type { CalendarEventDisplay } from "@/types/calendar";
import type { Profile, StudentSafe } from "@/types/profile";

export default async function Home() {
  const supabaseConfigured = isSupabaseConfigured();
  let userId: string | null = null;
  let userName: string | null = null;
  let userEmail: string | null = null;
  let isAuthenticated = false;
  let isStudentAccount = false;
  let profile: Profile | null = null;
  let students: StudentSafe[] = [];
  let showProfileIncompleteBanner = false;
  let curricula: CurriculumSummary[] = [];
  let curriculumDetails: CurriculumDetail[] = [];
  let initialSettings: LessonPlannerSettings | null = null;
  let initialCurrentTopic: CurrentTopic | null = null;
  let initialActiveStudentId: string | null = null;
  let initialCalendarEvents: CalendarEventDisplay[] = [];

  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isAuthenticated = true;
      userId = user.id;
      userEmail = user.email ?? null;
      isStudentAccount = user.user_metadata?.account_type === "student";

      if (isStudentAccount) {
        const { data: ownStudents } = await supabase
          .from("students_safe")
          .select("*")
          .eq("auth_user_id", user.id);

        students = (ownStudents ?? []) as StudentSafe[];
        userName = students[0]?.display_name ?? null;
        profile = {
          id: user.id,
          full_name: students[0]?.display_name ?? userName ?? "Student",
          created_at: students[0]?.created_at ?? new Date().toISOString(),
          updated_at: students[0]?.updated_at ?? new Date().toISOString(),
        };
      } else {
        const { data: profileRow } = await supabase
          .from("profiles")
          .select("id, full_name, created_at, updated_at")
          .eq("id", user.id)
          .single();

        profile = profileRow as Profile | null;
        userName = profile?.full_name ?? null;

        const { data: managedStudents } = await supabase
          .from("students_safe")
          .select("*")
          .eq("managed_by_user_id", user.id)
          .order("is_primary", { ascending: false })
          .order("display_name", { ascending: true });

        students = (managedStudents ?? []) as StudentSafe[];
      }

      const primaryStudent = students.find((student) => student.is_primary);
      const primaryStudentId = primaryStudent?.id ?? students[0]?.id ?? null;
      if (primaryStudent) {
        showProfileIncompleteBanner = isProfileIncomplete(primaryStudent);
      }

      try {
        initialSettings = await fetchLessonPlannerSettings(
          supabase,
          user.id,
          primaryStudentId,
        );
        const topicState = await fetchInitialCurrentTopic(
          supabase,
          students,
          initialSettings,
        );
        initialCurrentTopic = topicState.topic;
        initialActiveStudentId = topicState.activeStudentId;

        let curriculumIds: string[] | undefined;
        if (initialSettings.selected_student_ids.length > 0) {
          curriculumIds = await fetchStudentCurriculumIds(
            supabase,
            initialSettings.selected_student_ids,
          );
        }

        curricula = await fetchCurricula(supabase, {
          curriculumIds:
            curriculumIds && curriculumIds.length > 0 ? curriculumIds : undefined,
        });

        curriculumDetails = await Promise.all(
          curricula.map((curriculum) =>
            fetchCurriculumDetail(supabase, curriculum.id),
          ),
        ).then((details) =>
          details.filter((detail): detail is CurriculumDetail => detail !== null),
        );

        const visibleStudentIds =
          initialSettings.selected_student_ids.length > 0
            ? initialSettings.selected_student_ids.filter((id) =>
                students.some((student) => student.id === id),
              )
            : students.map((student) => student.id);

        const weekRange = getViewRange("week", new Date());
        initialCalendarEvents = await fetchCalendarEvents(supabase, {
          start: weekRange.start,
          end: weekRange.end,
          studentIds:
            visibleStudentIds.length > 0 ? visibleStudentIds : undefined,
        });
      } catch {
        curricula = [];
        curriculumDetails = [];
        initialCalendarEvents = [];
      }
    }
  }

  return (
    <>
      <EnvBanner configured={supabaseConfigured} />
      <HomeClient
        userId={userId}
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        userName={userName}
        profile={profile}
        students={students}
        isStudentAccount={isStudentAccount}
        showProfileIncompleteBanner={showProfileIncompleteBanner}
        curricula={curricula}
        curriculumDetails={curriculumDetails}
        initialSettings={initialSettings}
        initialCurrentTopic={initialCurrentTopic}
        initialActiveStudentId={initialActiveStudentId}
        initialCalendarEvents={initialCalendarEvents}
      />
    </>
  );
}
