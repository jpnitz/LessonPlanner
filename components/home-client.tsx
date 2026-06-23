"use client";

import { SiteHeader } from "@/components/layout/site-header";
import { AppShell } from "@/components/layout/app-shell";
import { GuestMainPane } from "@/components/guest-main-pane";

type HomeClientProps = {
  userName: string | null;
  userEmail: string | null;
  isAuthenticated: boolean;
};

export function HomeClient({
  userName,
  userEmail,
  isAuthenticated,
}: HomeClientProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SiteHeader userName={userName} userEmail={userEmail} />
      <AppShell showIntro={isAuthenticated}>
        {!isAuthenticated ? <GuestMainPane /> : null}
      </AppShell>
    </div>
  );
}
