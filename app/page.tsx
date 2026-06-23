import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { HomeClient } from "@/components/home-client";
import { EnvBanner } from "@/components/setup/env-banner";

export default async function Home() {
  const supabaseConfigured = isSupabaseConfigured();
  let userName: string | null = null;
  let userEmail: string | null = null;
  let isAuthenticated = false;

  if (supabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      isAuthenticated = true;
      userEmail = user.email ?? null;

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
  }

  return (
    <>
      <EnvBanner configured={supabaseConfigured} />
      <HomeClient
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        userName={userName}
      />
    </>
  );
}
