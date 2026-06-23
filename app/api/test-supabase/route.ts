import { testSupabaseConnection } from "@/lib/supabase/test-connection";
import { NextResponse } from "next/server";

export async function GET() {
  const result = await testSupabaseConnection();

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
