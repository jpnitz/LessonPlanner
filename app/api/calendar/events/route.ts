import { NextResponse } from "next/server";
import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { fetchCalendarEvents, normalizeEvent } from "@/lib/calendar/fetch";
import { endOfDay, startOfDay } from "@/lib/calendar/date-utils";
import { assertStudentAccess } from "@/lib/students/access";
import type { CustomCalendarEventInput } from "@/types/calendar";

function parseDateParam(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export async function GET(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const url = new URL(request.url);
  const now = new Date();
  const start = parseDateParam(url.searchParams.get("start"), startOfDay(now));
  const end = parseDateParam(url.searchParams.get("end"), endOfDay(now));
  const studentIds = url.searchParams.getAll("studentId").filter(Boolean);
  const isStudentAccount = user.user_metadata?.account_type === "student";

  if (studentIds.length > 0) {
    for (const studentId of studentIds) {
      const allowed = await assertStudentAccess(
        supabase,
        user.id,
        studentId,
        isStudentAccount,
      );
      if (!allowed) {
        return jsonError("One or more selected students are not accessible.", 403);
      }
    }
  }

  try {
    const events = await fetchCalendarEvents(supabase, {
      start,
      end,
      studentIds: studentIds.length > 0 ? studentIds : undefined,
    });
    return NextResponse.json({ events });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Failed to load calendar events.",
      500,
    );
  }
}

export async function POST(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const body = (await request.json()) as CustomCalendarEventInput;
  const title = body.title?.trim();
  const studentId = body.student_id;
  const startsAt = body.starts_at ? new Date(body.starts_at) : null;
  const endsAt = body.ends_at ? new Date(body.ends_at) : null;
  const isStudentAccount = user.user_metadata?.account_type === "student";

  if (!studentId || !title) {
    return jsonError("Student and title are required.", 400);
  }

  if (!startsAt || Number.isNaN(startsAt.getTime())) {
    return jsonError("A valid start time is required.", 400);
  }

  if (!endsAt || Number.isNaN(endsAt.getTime())) {
    return jsonError("A valid end time is required.", 400);
  }

  if (endsAt < startsAt) {
    return jsonError("End time must be after start time.", 400);
  }

  const allowed = await assertStudentAccess(
    supabase,
    user.id,
    studentId,
    isStudentAccount,
  );
  if (!allowed) {
    return jsonError("Student is not accessible.", 403);
  }

  if (isStudentAccount) {
    return jsonError("Student accounts cannot create calendar events.", 403);
  }

  const { data, error } = await supabase
    .from("calendar_events")
    .insert({
      managed_by_user_id: user.id,
      student_id: studentId,
      event_type: "custom",
      title,
      description: body.description?.trim() || null,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      is_all_day: Boolean(body.is_all_day),
    })
    .select("id")
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  const { data: displayRow, error: displayError } = await supabase
    .from("calendar_events_display")
    .select("*")
    .eq("id", data.id)
    .single();

  if (displayError) {
    return jsonError(displayError.message, 500);
  }

  return NextResponse.json({ event: normalizeEvent(displayRow) }, { status: 201 });
}
