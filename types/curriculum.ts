export type KsaType = "knowledge" | "skill" | "ability";

export type StandardKsa = {
  id: string;
  standard_id: string;
  ksa_type: KsaType;
  title: string;
  description: string | null;
  sort_order: number;
};

export type LearningStandard = {
  id: string;
  curriculum_id: string;
  domain_title: string | null;
  title: string;
  sort_order: number;
  ksas: StandardKsa[];
};

export type CurriculumDomain = {
  title: string;
  sort_order: number;
  learning_standards: LearningStandard[];
};

export type Curriculum = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  sort_order: number;
};

export type CurriculumSummary = Curriculum;

export type CurriculumDetail = Curriculum & {
  domains: CurriculumDomain[];
};

export type CurrentTopic = {
  standardId: string;
  standardTitle: string;
  domainTitle: string | null;
  curriculumTitle: string;
  curriculumId: string;
  studentId: string;
};

export type ProposedStandardKsa = {
  ksa_type: KsaType;
  title: string;
  description?: string;
};

export type ProposedStandard = {
  title: string;
  domain_title?: string;
  ksas?: ProposedStandardKsa[];
};

export type ProposedCurriculum = {
  title: string;
  description?: string;
  standards: ProposedStandard[];
};

export type LessonPlannerSettings = {
  user_id: string;
  hours_per_week: number | null;
  hours_per_day: number | null;
  days_of_week: number[];
  selected_student_ids: string[];
};

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type StudentCurriculumAssignment = {
  student_id: string;
  curriculum_id: string;
};

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Monday=1 … Sunday=7 (ISO weekday) */
export const DAY_VALUES = [1, 2, 3, 4, 5, 6, 7] as const;

export function formatDaysOfWeek(days: number[]) {
  if (days.length === 0) return "Any day / open time";
  return DAY_VALUES.filter((day) => days.includes(day))
    .map((day) => DAY_LABELS[day - 1])
    .join(", ");
}
