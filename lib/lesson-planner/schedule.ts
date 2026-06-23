import type { LessonPlannerSettings } from "@/types/curriculum";
import { DAY_VALUES } from "@/types/curriculum";

export type TimeSlot = {
  starts_at: Date;
  ends_at: Date;
};

const DEFAULT_START_HOUR = 10;
const DEFAULT_LESSON_MINUTES = 60;
const MAX_LESSON_MINUTES = 180;

function isoWeekday(date: Date) {
  const day = date.getDay();
  return day === 0 ? 7 : day;
}

function withTime(date: Date, hours: number, minutes = 0) {
  const next = new Date(date);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
) {
  return aStart < bEnd && bStart < aEnd;
}

export function resolveAllowedWeekdays(settings: LessonPlannerSettings) {
  const selected = settings.days_of_week.filter((day) =>
    DAY_VALUES.includes(day as (typeof DAY_VALUES)[number]),
  );
  return selected.length > 0 ? selected.sort((a, b) => a - b) : [1, 2, 3, 4, 5];
}

export function resolveLessonDurationMinutes(settings: LessonPlannerSettings) {
  if (settings.hours_per_day && settings.hours_per_day > 0) {
    return Math.min(
      MAX_LESSON_MINUTES,
      Math.max(15, Math.round(settings.hours_per_day * 60)),
    );
  }

  const allowedDays = resolveAllowedWeekdays(settings);
  if (settings.hours_per_week && settings.hours_per_week > 0) {
    const perDay = settings.hours_per_week / allowedDays.length;
    return Math.min(
      MAX_LESSON_MINUTES,
      Math.max(15, Math.round(perDay * 60)),
    );
  }

  return DEFAULT_LESSON_MINUTES;
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

export function scheduleLessonSlots(options: {
  lessonCount: number;
  settings: LessonPlannerSettings;
  occupied: TimeSlot[];
  startFrom?: Date;
  maxDays?: number;
}): TimeSlot[] {
  const { lessonCount, settings, occupied } = options;
  if (lessonCount <= 0) return [];

  const allowedDays = resolveAllowedWeekdays(settings);
  const durationMinutes = resolveLessonDurationMinutes(settings);
  const maxDays = options.maxDays ?? 365;
  const slots: TimeSlot[] = [];
  let cursor = withTime(
    options.startFrom ?? new Date(),
    DEFAULT_START_HOUR,
  );

  if (cursor.getTime() <= Date.now()) {
    cursor = withTime(new Date(cursor.getTime() + 24 * 60 * 60 * 1000), DEFAULT_START_HOUR);
  }

  const searchStart = startOfDay(cursor);
  let safety = 0;
  while (slots.length < lessonCount && safety < 400) {
    safety += 1;
    const daysFromStart = Math.floor(
      (startOfDay(cursor).getTime() - searchStart.getTime()) / (24 * 60 * 60 * 1000),
    );
    if (daysFromStart >= maxDays) break;

    const weekday = isoWeekday(cursor);

    if (!allowedDays.includes(weekday)) {
      cursor = withTime(
        new Date(cursor.getTime() + 24 * 60 * 60 * 1000),
        DEFAULT_START_HOUR,
      );
      continue;
    }

    const startsAt = withTime(cursor, DEFAULT_START_HOUR);
    const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    const conflicts = [...occupied, ...slots].some((slot) =>
      overlaps(startsAt, endsAt, slot.starts_at, slot.ends_at),
    );

    if (!conflicts) {
      slots.push({ starts_at: startsAt, ends_at: endsAt });
    }

    cursor = withTime(
      new Date(cursor.getTime() + 24 * 60 * 60 * 1000),
      DEFAULT_START_HOUR,
    );
  }

  return slots;
}

export function formatPlannerConstraints(settings: LessonPlannerSettings) {
  const allowedDays = resolveAllowedWeekdays(settings);
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayLabel = allowedDays.map((day) => dayNames[day - 1]).join(", ");
  const duration = resolveLessonDurationMinutes(settings);

  const parts = [
    `Schedule on these weekdays only: ${dayLabel}.`,
    `Target about ${duration} minutes per lesson.`,
  ];

  if (settings.hours_per_week) {
    parts.push(`Weekly budget: ${settings.hours_per_week} hours.`);
  }
  if (settings.hours_per_day) {
    parts.push(`Daily budget: ${settings.hours_per_day} hours.`);
  }

  return parts.join(" ");
}
