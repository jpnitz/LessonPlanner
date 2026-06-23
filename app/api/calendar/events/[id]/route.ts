import { NextResponse } from "next/server";
import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { normalizeEvent } from "@/lib/calendar/fetch";
import { assertStudentAccess } from "@/lib/students/access";
import type { CustomCalendarEventUpdate } from "@/types/calendar";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const { id } = await context.params;
  const body = (await request.json()) as CustomCalendarEventUpdate;
  const isStudentAccount = user.user_metadata?.account_type === "student";

  if (isStudentAccount) {
    return jsonError("Student accounts cannot edit calendar events.", 403);
  }

  const { data: existing, error: existingError } = await supabase
    .from("calendar_events")
    .select("id, managed_by_user_id, student_id, event_type, starts_at, ends_at")
    .eq("id", id)
    .maybeSingle();

  if (existingError) return jsonError(existingError.message, 500);
  if (!existing) return jsonError("Event not found.", 404);
  if (existing.managed_by_user_id !== user.id) {
    return jsonError("Event not found.", 404);
  }
  if (existing.event_type !== "custom") {
    return jsonError("Only custom events can be edited.", 400);
  }

  const nextStudentId = body.student_id ?? existing.student_id;
  const allowed = await assertStudentAccess(
    supabase,
    user.id,
    nextStudentId,
    isStudentAccount,
  );
  if (!allowed) {
    return jsonError("Student is not accessible.", 403);
  }

  const patch: Record<string, unknown> = {};
  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) return jsonError("Title cannot be empty.", 400);
    patch.title = title;
  }
  if (body.description !== undefined) {
    patch.description = body.description?.trim() || null;
  }
  if (body.student_id !== undefined) {
    patch.student_id = body.student_id;
  }
  if (body.is_all_day !== undefined) {
    patch.is_all_day = Boolean(body.is_all_day);
  }

  let startsAt =
    body.starts_at !== undefined ? new Date(body.starts_at) : new Date(existing.starts_at);
  let endsAt =
    body.ends_at !== undefined ? new Date(body.ends_at) : new Date(existing.ends_at);

  if (body.starts_at !== undefined) {
    if (Number.isNaN(startsAt.getTime())) {
      return jsonError("A valid start time is required.", 400);
    }
    patch.starts_at = startsAt.toISOString();
  }

  if (body.ends_at !== undefined) {
    if (Number.isNaN(endsAt.getTime())) {
      return jsonError("A valid end time is required.", 400);
    }
    patch.ends_at = endsAt.toISOString();
  }

  if (endsAt < startsAt) {
    return jsonError("End time must be after start time.", 400);
  }

  const { error } = await supabase
    .from("calendar_events")
    .update(patch)
    .eq("id", id);

  if (error) return jsonError(error.message, 500);

  const { data: displayRow, error: displayError } = await supabase
    .from("calendar_events_display")
    .select("*")
    .eq("id", id)
    .single();

  if (displayError) return jsonError(displayError.message, 500);

  return NextResponse.json({ event: normalizeEvent(displayRow) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const { id } = await context.params;
  const isStudentAccount = user.user_metadata?.account_type === "student";

  if (isStudentAccount) {
    return jsonError("Student accounts cannot delete calendar events.", 403);
  }

  const { data: existing, error: existingError } = await supabase
    .from("calendar_events")
    .select("id, managed_by_user_id, event_type")
    .eq("id", id)
    .maybeSingle();

  if (existingError) return jsonError(existingError.message, 500);
  if (!existing) return jsonError("Event not found.", 404);
  if (existing.managed_by_user_id !== user.id) {
    return jsonError("Event not found.", 404);
  }
  if (existing.event_type !== "custom") {
    return jsonError("Only custom events can be deleted.", 400);
  }

  const { error } = await supabase.from("calendar_events").delete().eq("id", id);
  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}
