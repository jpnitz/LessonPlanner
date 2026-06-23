"use client";

import { useMainPane } from "@/components/main-pane/main-pane-context";
import { Button } from "@/components/ui/button";

type CompleteProfileBannerProps = {
  show: boolean;
};

export function CompleteProfileBanner({ show }: CompleteProfileBannerProps) {
  const { openProfile } = useMainPane();

  if (!show) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-foreground">
          Complete your student profile
        </p>
        <p className="mt-1 text-sm text-muted">
          Add your birthday and zip code when you are ready. The rest of the app
          stays available.
        </p>
      </div>
      <Button type="button" size="sm" onClick={openProfile}>
        Go to Profile
      </Button>
    </div>
  );
}
