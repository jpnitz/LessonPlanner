import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { NextResponse } from "next/server";

export async function GET() {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized", 401);

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({
    profile: data,
    email: user.email,
  });
}

export async function PATCH(request: Request) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized", 401);

  const body = await request.json();
  const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";

  if (!fullName) return jsonError("Full name is required.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ full_name: fullName })
    .eq("id", user.id)
    .select("id, full_name, created_at, updated_at")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ profile: data });
}
