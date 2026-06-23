export type CalendarEventType = "lesson" | "custom";

export type CalendarViewMode = "month" | "week" | "day";

export type CalendarEventDisplay = {
  id: string;
  managed_by_user_id: string;
  student_id: string;
  lesson_id: string | null;
  event_type: CalendarEventType;
  event_title: string;
  event_description: string | null;
  starts_at: string;
  ends_at: string;
  is_all_day: boolean;
  created_at: string;
  updated_at: string;
  lesson_title: string | null;
  lesson_summary: string | null;
  lesson_content: string | null;
  lesson_status: string | null;
  curriculum_id: string | null;
  curriculum_title: string | null;
  standard_id: string | null;
  standard_title: string | null;
  student_display_name: string;
};

export type CustomCalendarEventInput = {
  student_id: string;
  title: string;
  description?: string | null;
  starts_at: string;
  ends_at: string;
  is_all_day?: boolean;
};

export type CustomCalendarEventUpdate = Partial<CustomCalendarEventInput>;
