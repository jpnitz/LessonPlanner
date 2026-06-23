import { createClient } from "@/lib/supabase/server";

export type SupabaseConnectionResult = {
  ok: boolean;
  message: string;
};

export async function testSupabaseConnection(): Promise<SupabaseConnectionResult> {
  const supabase = await createClient();
  const { error } = await supabase.auth.getSession();

  if (error) {
    return { ok: false, message: error.message };
  }

  return { ok: true, message: "Connected to Supabase" };
}
