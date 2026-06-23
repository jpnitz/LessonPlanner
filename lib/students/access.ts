import type { SupabaseClient } from "@supabase/supabase-js";
import type { StudentSafe } from "@/types/profile";

export async function getManagedStudents(
  supabase: SupabaseClient,
  userId: string,
  isStudentAccount: boolean,
): Promise<StudentSafe[]> {
  if (isStudentAccount) {
    const { data } = await supabase
      .from("students_safe")
      .select("*")
      .eq("auth_user_id", userId);
    return (data ?? []) as StudentSafe[];
  }

  const { data } = await supabase
    .from("students_safe")
    .select("*")
    .eq("managed_by_user_id", userId)
    .order("is_primary", { ascending: false })
    .order("display_name", { ascending: true });

  return (data ?? []) as StudentSafe[];
}

export async function assertStudentAccess(
  supabase: SupabaseClient,
  userId: string,
  studentId: string,
  isStudentAccount: boolean,
): Promise<boolean> {
  const students = await getManagedStudents(supabase, userId, isStudentAccount);
  return students.some((student) => student.id === studentId);
}

export function resolveActiveStudentId(
  students: StudentSafe[],
  selectedStudentIds: string[],
  explicitStudentId?: string | null,
): string | null {
  if (explicitStudentId && students.some((s) => s.id === explicitStudentId)) {
    return explicitStudentId;
  }

  const selected = selectedStudentIds.filter((id) =>
    students.some((student) => student.id === id),
  );
  if (selected.length === 1) return selected[0];
  if (selected.length > 1) return selected[0];

  const primary = students.find((student) => student.is_primary);
  return primary?.id ?? students[0]?.id ?? null;
}
