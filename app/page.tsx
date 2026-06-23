import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { isProfileIncomplete } from "@/lib/profile/validation";
import {
  fetchCurricula,
  fetchCurriculumDetail,
} from "@/lib/curriculum/fetch";
import { HomeClient } from "@/components/home-client";
import { EnvBanner } from "@/components/setup/env-banner";
import type { CurriculumDetail, CurriculumSummary } from "@/types/curriculum";
import type { Profile, StudentSafe } from "@/types/profile";

export default async function Home() {
  const supabaseConfigured = isSupabaseConfigured();
  let userName: string | null = null;
  let userEmail: string | null = null;
  let isAuthenticated = false;
  let isStudentAccount = false;
  let profile: Profile | null = null;
  let students: StudentSafe[] = [];
  let showProfileIncompleteBanner = false;
  let curricula: CurriculumSummary[] = [];
  let curriculumDetails: CurriculumDetail[] = [];

  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isAuthenticated = true;
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
      if (primaryStudent) {
        showProfileIncompleteBanner = isProfileIncomplete(primaryStudent);
      }

      try {
        curricula = await fetchCurricula(supabase);
        curriculumDetails = await Promise.all(
          curricula.map((curriculum) =>
            fetchCurriculumDetail(supabase, curriculum.id),
          ),
        ).then((details) =>
          details.filter((detail): detail is CurriculumDetail => detail !== null),
        );
      } catch {
        curricula = [];
        curriculumDetails = [];
      }
    }
  }

  return (
    <>
      <EnvBanner configured={supabaseConfigured} />
      <HomeClient
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        userName={userName}
        profile={profile}
        students={students}
        isStudentAccount={isStudentAccount}
        showProfileIncompleteBanner={showProfileIncompleteBanner}
        curricula={curricula}
        curriculumDetails={curriculumDetails}
      />
    </>
  );
}
