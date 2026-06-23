export const LESSON_ACTIVITY_TYPES = [
  "video",
  "web_activity",
  "computer_challenge",
  "worksheet",
  "home_activity",
  "community_activity",
  "thought_experiment",
] as const;

export type LessonActivityType = (typeof LESSON_ACTIVITY_TYPES)[number];

export const ACTIVITY_TYPE_LABELS: Record<LessonActivityType, string> = {
  video: "Video",
  web_activity: "Web activity",
  computer_challenge: "Computer challenge",
  worksheet: "Worksheet",
  home_activity: "Home activity",
  community_activity: "Community activity",
  thought_experiment: "Thought experiment",
};

export type LessonActivityResources = {
  url?: string;
  notes?: string;
};

export type LessonActivity = {
  id: string;
  lesson_id: string;
  activity_type: LessonActivityType;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  resources: LessonActivityResources;
  sort_order: number;
};

export type ProposedLessonActivity = {
  activity_type: LessonActivityType;
  title: string;
  description?: string;
  duration_minutes?: number;
  resources?: LessonActivityResources;
};

export type ProposedLesson = {
  client_id: string;
  standard_id?: string | null;
  standard_title: string;
  curriculum_id?: string | null;
  curriculum_title?: string | null;
  title: string;
  summary: string;
  content: string;
  activities: ProposedLessonActivity[];
  scheduled_starts_at?: string;
  scheduled_ends_at?: string;
};

export type ProposedLessonPlan = {
  student_id: string;
  lessons: ProposedLesson[];
};

export type SaveLessonPlanInput = {
  student_id: string;
  lessons: ProposedLesson[];
};
