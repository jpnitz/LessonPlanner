"use client";

import type { Profile, StudentSafe } from "@/types/profile";
import { SiteHeader } from "@/components/layout/site-header";
import { AppShell } from "@/components/layout/app-shell";
import { GuestMainPane } from "@/components/guest-main-pane";
import { AuthenticatedMainPane } from "@/components/main-pane/authenticated-main-pane";

type HomeClientProps = {
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
  profile: Profile | null;
  students: StudentSafe[];
  isStudentAccount: boolean;
  showProfileIncompleteBanner: boolean;
};

export function HomeClient({
  userName,
  userEmail,
  isAuthenticated,
  profile,
  students,
  isStudentAccount,
  showProfileIncompleteBanner,
}: HomeClientProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SiteHeader
        userName={userName}
        userEmail={userEmail}
        showProfileLink={isAuthenticated}
      />
      <AppShell showIntro={false}>
        {isAuthenticated && profile ? (
          <AuthenticatedMainPane
            profile={profile}
            email={userEmail ?? ""}
            students={students}
            isStudentAccount={isStudentAccount}
            showProfileIncompleteBanner={showProfileIncompleteBanner}
          />
        ) : isAuthenticated ? (
          <div className="mx-auto max-w-lg rounded-lg border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
            Your account loaded, but profile data is missing. Run the Phase 2 SQL
            migration in Supabase, then refresh this page.
          </div>
        ) : (
          <GuestMainPane />
        )}
      </AppShell>
    </div>
  );
}
