import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function getAuthenticatedParent() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}
