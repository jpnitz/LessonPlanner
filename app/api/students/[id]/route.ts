import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { validateStudentProfile } from "@/lib/profile/validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized", 401);

  const { data: existing, error: existingError } = await supabase
    .from("students")
    .select("id, is_primary, managed_by_user_id")
    .eq("id", id)
    .single();

  if (existingError || !existing) return jsonError("Student not found.", 404);
  if (existing.managed_by_user_id !== user.id) return jsonError("Forbidden", 403);

  const body = await request.json();
  const display_name = typeof body.display_name === "string" ? body.display_name : "";
  const birthday = typeof body.birthday === "string" ? body.birthday : "";
  const zip_code = typeof body.zip_code === "string" ? body.zip_code : "";
  const password = typeof body.password === "string" ? body.password.trim() : "";
  const llm_api_key =
    typeof body.llm_api_key === "string" ? body.llm_api_key.trim() : "";
  const clear_llm_api_key = body.clear_llm_api_key === true;

  const errors = validateStudentProfile({
    display_name,
    birthday,
    zip_code,
  });

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  const { error: updateError } = await supabase
    .from("students")
    .update({
      display_name: display_name.trim(),
      birthday,
      zip_code: zip_code.trim(),
    })
    .eq("id", id);

  if (updateError) return jsonError(updateError.message, 500);

  if (password) {
    try {
      const admin = createAdminClient();
      const { data: studentAuth } = await supabase
        .from("students")
        .select("auth_user_id")
        .eq("id", id)
        .single();

      if (studentAuth?.auth_user_id) {
        const { error: passwordError } = await admin.auth.admin.updateUserById(
          studentAuth.auth_user_id,
          { password },
        );
        if (passwordError) return jsonError(passwordError.message, 500);
      }
    } catch (error) {
      return jsonError(
        error instanceof Error ? error.message : "Could not update password.",
        500,
      );
    }
  }

  if (clear_llm_api_key) {
    await supabase.from("student_secrets").delete().eq("student_id", id);
  } else if (llm_api_key) {
    const { data: currentSecret } = await supabase
      .from("student_secrets")
      .select("student_id")
      .eq("student_id", id)
      .maybeSingle();

    if (currentSecret) {
      const { error: secretUpdateError } = await supabase
        .from("student_secrets")
        .update({ llm_api_key })
        .eq("student_id", id);
      if (secretUpdateError) return jsonError(secretUpdateError.message, 500);
    } else {
      const { error: secretInsertError } = await supabase
        .from("student_secrets")
        .insert({ student_id: id, llm_api_key });
      if (secretInsertError) return jsonError(secretInsertError.message, 500);
    }
  }

  const { data: safeStudent, error: safeError } = await supabase
    .from("students_safe")
    .select("*")
    .eq("id", id)
    .single();

  if (safeError || !safeStudent) {
    return jsonError(safeError?.message ?? "Student updated but could not be loaded.", 500);
  }

  return NextResponse.json({ student: safeStudent });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized", 401);

  const { data: existing, error: existingError } = await supabase
    .from("students")
    .select("id, is_primary, auth_user_id, managed_by_user_id")
    .eq("id", id)
    .single();

  if (existingError || !existing) return jsonError("Student not found.", 404);
  if (existing.managed_by_user_id !== user.id) return jsonError("Forbidden", 403);
  if (existing.is_primary) return jsonError("You cannot delete your own primary student profile.");

  const authUserId = existing.auth_user_id;

  const { error: deleteStudentError } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (deleteStudentError) return jsonError(deleteStudentError.message, 500);

  try {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(authUserId);
  } catch {
    // Student row is already removed; auth cleanup can be retried manually if needed.
  }

  return NextResponse.json({ ok: true });
}
