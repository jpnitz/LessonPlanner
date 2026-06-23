import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "@/components/home-client";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName: string | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .maybeSingle();

    userName =
      profile?.full_name ??
      (typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : null);
  }

  return (
    <HomeClient
      isAuthenticated={Boolean(user)}
      userEmail={user?.email ?? null}
      userName={userName}
    />
  );
}
