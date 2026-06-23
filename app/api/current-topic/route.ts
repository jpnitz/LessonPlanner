import { NextResponse } from "next/server";
import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { assertStudentAccess } from "@/lib/students/access";

export async function PUT(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const body = await request.json();
  const student_id = typeof body.student_id === "string" ? body.student_id : "";
  const standard_id = typeof body.standard_id === "string" ? body.standard_id : "";

  if (!student_id || !standard_id) {
    return jsonError("student_id and standard_id are required.", 400);
  }

  const isStudentAccount = user.user_metadata?.account_type === "student";
  const hasAccess = await assertStudentAccess(
    supabase,
    user.id,
    student_id,
    isStudentAccount,
  );
  if (!hasAccess) return jsonError("Student not accessible.", 403);

  const { error } = await supabase.from("student_current_topics").upsert(
    { student_id, standard_id },
    { onConflict: "student_id" },
  );

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const body = await request.json();
  const student_id = typeof body.student_id === "string" ? body.student_id : "";
  if (!student_id) return jsonError("student_id is required.", 400);

  const isStudentAccount = user.user_metadata?.account_type === "student";
  const hasAccess = await assertStudentAccess(
    supabase,
    user.id,
    student_id,
    isStudentAccount,
  );
  if (!hasAccess) return jsonError("Student not accessible.", 403);

  const { error } = await supabase
    .from("student_current_topics")
    .delete()
    .eq("student_id", student_id);

  if (error) return jsonError(error.message, 500);
  return NextResponse.json({ ok: true });
}
