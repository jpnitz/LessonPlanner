"use client";

import { Button } from "@/components/ui/button";

export function GoogleCalendarStub() {
  return (
    <div className="rounded-md border border-dashed border-border bg-surface-muted/60 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-foreground">Google Calendar sync</p>
          <p className="mt-1 text-xs leading-5 text-muted">
            Two-way sync with Google Calendar is planned for a later release. For now,
            add custom events here or schedule lessons from the lesson planner.
          </p>
        </div>
        <Button variant="secondary" size="sm" disabled title="Coming soon">
          Connect Google Calendar
        </Button>
      </div>
    </div>
  );
}
