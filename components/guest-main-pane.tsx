"use client";

import { useAuthModal } from "@/components/auth/auth-modal-context";
import { Button } from "@/components/ui/button";

export function GuestMainPane() {
  const { openAuth } = useAuthModal();

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <h1 className="text-2xl font-semibold text-foreground">
        Plan lessons for your microschool
      </h1>
      <p className="text-sm leading-7 text-muted">
        Sign up as a parent or teacher with your name, email, and password.
        Your own student profile is created automatically.
      </p>
      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={() => openAuth("signup")}>
          Sign up
        </Button>
        <Button type="button" variant="secondary" onClick={() => openAuth("login")}>
          Log in
        </Button>
      </div>
      <p className="text-xs text-muted">
        Use the Menu and Calendar panes on the left and top right — drag the
        divider to resize the menu, and click the arrows to collapse each pane.
      </p>
    </div>
  );
}
