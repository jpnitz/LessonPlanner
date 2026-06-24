export const CALENDAR_REFRESH_EVENT = "lessonplanner:calendar-refresh";

export function requestCalendarRefresh() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CALENDAR_REFRESH_EVENT));
}
