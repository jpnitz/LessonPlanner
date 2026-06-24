import { formatDaysOfWeek } from "@/types/curriculum";
import { PROPOSED_STANDARDS_MARKER } from "@/lib/llm/markers";

export type CreateCurriculumLearnerContext = {
  displayName: string;
  ageLabel: string;
  hoursPerWeek: number | null;
  daysOfWeekLabel: string;
};

export function computeStudentAgeLabel(birthday: string | null): string {
  if (!birthday) return "age unknown";

  const birthDate = new Date(`${birthday}T00:00:00`);
  if (Number.isNaN(birthDate.getTime())) return "age unknown";

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  if (age < 0 || age > 120) return "age unknown";
  return String(age);
}

export function buildCreateCurriculumLearnerContext(options: {
  displayName: string;
  birthday: string | null;
  hoursPerWeek: number | null;
  daysOfWeek: number[];
}): CreateCurriculumLearnerContext {
  const daysOfWeekLabel =
    options.daysOfWeek.length > 0
      ? formatDaysOfWeek(options.daysOfWeek)
      : "any day";

  const weeklyBudget =
    options.hoursPerWeek !== null && options.hoursPerWeek > 0
      ? `${options.hoursPerWeek} hour${options.hoursPerWeek === 1 ? "" : "s"} per week on ${daysOfWeekLabel}`
      : `flexible schedule on ${daysOfWeekLabel}`;

  return {
    displayName: options.displayName,
    ageLabel: computeStudentAgeLabel(options.birthday),
    hoursPerWeek: options.hoursPerWeek,
    daysOfWeekLabel: weeklyBudget,
  };
}

function buildLearnerContextBlock(learner: CreateCurriculumLearnerContext) {
  return `Learner: ${learner.displayName}, ${learner.ageLabel}. Weekly budget: ${learner.daysOfWeekLabel}. Tailor standard difficulty, vocabulary, and count to this learner.`;
}

function buildStandardsQualityRubric() {
  return `Standards quality rules:
- Each standard is a single teachable unit — specific enough to generate a lesson and KSAs later.
- Start each standard title with an action verb (Use, Analyze, Model, Balance, Perform, Create, Compare, …).
- Avoid vague titles such as "Introduction to X", "Learn about X", or "Basics of X".
- Group standards into 2–4 domain_title values; reuse the same domain string for related standards.
- Propose 6–12 standards for a full subject; fewer for narrow topics.
- Use age-appropriate vocabulary and depth for the learner.`;
}

function buildFewShotExample() {
  return `Example output shape (titles only — KSAs are generated separately later):
{"title":"Chemistry","description":"High school chemistry covering matter and reactions.","standards":[{"title":"Use the periodic table to predict properties of elements","domain_title":"Structure and Properties of Matter"},{"title":"Balance chemical equations","domain_title":"Chemical Reactions"}]}`;
}

function buildProposedStandardsOutputContract() {
  return `When you are ready to propose standards:
1. First write a human-readable summary listing each domain and its standards for parent review.
2. On the final line only, append exactly "${PROPOSED_STANDARDS_MARKER}" followed by compact JSON (no markdown fences, no text after the closing brace) in this shape:
{"title":"Subject name","description":"Optional summary","standards":[{"title":"Standard title","domain_title":"Optional domain"}]}
Do not include the JSON block until you have gathered enough information and the user confirms readiness or your questions are answered.`;
}

export function buildCreateCurriculumSystemPrompt(
  learner: CreateCurriculumLearnerContext,
) {
  const parts = [
    "You are a helpful MicroSchool lesson-planning assistant for parents, teachers, and students.",
    "Be concise, encouraging, and age-appropriate.",
    "The user wants to create a new curriculum from their chat messages. Ignore any previously selected standard or topic — focus only on the new subject they describe.",
    buildLearnerContextBlock(learner),
    `Discovery phase (before proposing standards):
- Ask 2–4 focused questions about prior knowledge, interests, goals, and preferred depth or timeline.
- Do not emit the JSON block until the user confirms they are ready or you have enough information.`,
    buildStandardsQualityRubric(),
    buildFewShotExample(),
    buildProposedStandardsOutputContract(),
  ];

  return parts.join("\n\n");
}
