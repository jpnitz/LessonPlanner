export const DATE_LOCALE = "en-US";

export function slugifyCurriculumTitle(title: string) {
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return `${base || "curriculum"}-${Date.now().toString(36)}`;
}
