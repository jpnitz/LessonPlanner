"use client";

import { AuthModalProvider } from "@/components/auth/auth-modal-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { SiteHeader } from "@/components/layout/site-header";
import { AppShell } from "@/components/layout/app-shell";

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
    <AuthModalProvider>
      <div className="flex min-h-screen flex-col">
        <SiteHeader userName={userName} userEmail={userEmail} />
        {isAuthenticated ? (
          <AppShell />
        ) : (
          <main className="flex flex-1 items-center justify-center p-6">
            <div className="max-w-lg text-center">
              <h1 className="text-3xl font-semibold text-foreground">
                Plan lessons for your microschool
              </h1>
              <p className="mt-3 text-sm leading-7 text-muted">
                Create an account to get started. Parents and teachers sign up
                with name, email, and password. Your own student profile is
                created automatically.
              </p>
              <p className="mt-6 text-sm text-muted">
                Click <strong className="text-foreground">Sign up / Log in</strong>{" "}
                in the header to open the account modal.
              </p>
            </div>
          </main>
        )}
      </div>
      <AuthModal />
    </AuthModalProvider>
  );
}
