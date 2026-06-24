"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthModal } from "@/components/auth/auth-modal-context";
import { useMainPane } from "@/components/main-pane/main-pane-context";
import { Button } from "@/components/ui/button";

type SiteHeaderProps = {
  userName?: string | null;
  userEmail?: string | null;
  showProfileLink?: boolean;
};

export function SiteHeader({
  userName,
  userEmail,
  showProfileLink = false,
}: SiteHeaderProps) {
  const router = useRouter();
  const { openAuth } = useAuthModal();
  const { openProfile, openCurriculum } = useMainPane();

  async function handleSignOut() {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.refresh();
    } catch {
      router.refresh();
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent text-sm font-bold text-white">
          M
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">MicroSchool</p>
          <p className="text-xs text-muted">Lesson Planner</p>
        </div>
      </div>

      {userEmail ? (
        <div className="flex items-center gap-3">
          {showProfileLink ? (
            <>
              <button
                type="button"
                onClick={openCurriculum}
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Your Curriculum
              </button>
              <button
                type="button"
                onClick={openProfile}
                className="text-sm font-medium text-accent hover:text-accent-hover"
              >
                Profile
              </button>
            </>
          ) : null}
          <p className="hidden text-sm text-muted sm:block">
            {userName ? `${userName} · ` : ""}
            {userEmail}
          </p>
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => openAuth("login")}
          className="text-sm font-medium text-accent hover:text-accent-hover"
        >
          Sign up / Log in
        </button>
      )}
    </header>
  );
}
