import { getAuthenticatedParent, jsonError } from "@/lib/api/auth";
import { deleteUserCurriculum } from "@/lib/curriculum/delete-curriculum";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const { supabase, user } = await getAuthenticatedParent();
  if (!user) return jsonError("Unauthorized.", 401);

  const isStudentAccount = user.user_metadata?.account_type === "student";
  if (isStudentAccount) {
    return jsonError("Student accounts cannot delete curricula.", 403);
  }

  const { id } = await context.params;

  try {
    await deleteUserCurriculum(supabase, user.id, id);
    return Response.json({ ok: true });
  } catch (error) {
    return jsonError(
      error instanceof Error ? error.message : "Could not delete curriculum.",
      400,
    );
  }
}
