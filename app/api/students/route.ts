import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { validateStudentProfile } from "@/lib/profile/validation";
import {
  createAdminClient,
  getStudentInternalEmail,
} from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized", 401);

  const isStudentAccount = user.user_metadata?.account_type === "student";

  let query = supabase.from("students_safe").select("*");

  if (isStudentAccount) {
    query = query.eq("auth_user_id", user.id);
  } else {
    query = query
      .eq("managed_by_user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("display_name", { ascending: true });
  }

  const { data, error } = await query;

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ students: data ?? [] });
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await request.json();
  const display_name = typeof body.display_name === "string" ? body.display_name : "";
  const birthday = typeof body.birthday === "string" ? body.birthday : "";
  const zip_code = typeof body.zip_code === "string" ? body.zip_code : "";
  const login_id = typeof body.login_id === "string" ? body.login_id.trim() : "";
  const login_email =
    typeof body.login_email === "string" ? body.login_email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const llm_api_key =
    typeof body.llm_api_key === "string" ? body.llm_api_key.trim() : "";

  const errors = validateStudentProfile({
    display_name,
    birthday,
    zip_code,
    login_id: login_id || undefined,
    login_email: login_email || undefined,
    password,
    isNew: true,
  });

  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Admin client not configured.",
      500,
    );
  }

  const authEmail = login_email || getStudentInternalEmail(login_id);

  const { data: authUser, error: createUserError } =
    await admin.auth.admin.createUser({
      email: authEmail,
      password,
      email_confirm: true,
      user_metadata: {
        account_type: "student",
        display_name: display_name.trim(),
        managed_by_user_id: user.id,
      },
    });

  if (createUserError || !authUser.user) {
    return jsonError(createUserError?.message ?? "Could not create student login.", 500);
  }

  const { data: student, error: studentError } = await supabase
    .from("students")
    .insert({
      auth_user_id: authUser.user.id,
      managed_by_user_id: user.id,
      is_primary: false,
      display_name: display_name.trim(),
      birthday,
      zip_code: zip_code.trim(),
      login_id: login_id || null,
      login_email: login_email || null,
    })
    .select("id")
    .single();

  if (studentError || !student) {
    await admin.auth.admin.deleteUser(authUser.user.id);
    return jsonError(studentError?.message ?? "Could not create student.", 500);
  }

  if (llm_api_key) {
    const { error: secretError } = await supabase.from("student_secrets").insert({
      student_id: student.id,
      llm_api_key,
    });

    if (secretError) {
      await supabase.from("students").delete().eq("id", student.id);
      await admin.auth.admin.deleteUser(authUser.user.id);
      return jsonError(secretError.message, 500);
    }
  }

  const { data: safeStudent, error: safeError } = await supabase
    .from("students_safe")
    .select("*")
    .eq("id", student.id)
    .single();

  if (safeError || !safeStudent) {
    return jsonError(safeError?.message ?? "Student created but could not be loaded.", 500);
  }

  return NextResponse.json({ student: safeStudent }, { status: 201 });
}
