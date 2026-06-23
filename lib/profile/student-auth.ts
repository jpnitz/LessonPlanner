export function getStudentInternalEmail(loginId: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }

  const projectRef = new URL(url).hostname.split(".")[0];
  return `${loginId.toLowerCase()}@students.${projectRef}.internal`;
}

export function resolveStudentLoginEmail(identifier: string) {
  const trimmed = identifier.trim();
  if (trimmed.includes("@")) {
    return trimmed.toLowerCase();
  }

  return getStudentInternalEmail(trimmed);
}
