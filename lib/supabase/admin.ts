import { createClient } from "@supabase/supabase-js";
import { getStudentInternalEmail } from "@/lib/profile/student-auth";

export { getStudentInternalEmail };

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) for server admin operations.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isInternalStudentEmail(email: string) {
  const hostname = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;
  const projectRef = hostname.split(".")[0];
  return email.toLowerCase().endsWith(`@students.${projectRef}.internal`);
}

export function loginIdFromInternalEmail(email: string) {
  return email.split("@")[0] ?? "";
}
