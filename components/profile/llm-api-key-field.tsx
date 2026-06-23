"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { maskApiKey } from "@/lib/profile/validation";

type LlmApiKeyFieldProps = {
  hasExistingKey: boolean;
  maskedPreview: string | null;
  value: string;
  onChange: (value: string) => void;
  clearExisting: boolean;
  onClearExistingChange: (value: boolean) => void;
};

export function LlmApiKeyField({
  hasExistingKey,
  maskedPreview,
  value,
  onChange,
  clearExisting,
  onClearExistingChange,
}: LlmApiKeyFieldProps) {
  const [visible, setVisible] = useState(false);
  const showingSaved = hasExistingKey && !value && !clearExisting;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground">
        LLM API key <span className="font-normal text-muted">(optional)</span>
      </label>

      {showingSaved ? (
        <div className="flex items-center gap-2">
          <div className="h-10 flex-1 rounded-md border border-border bg-surface-muted px-3 text-sm leading-10 text-muted">
            {maskedPreview ?? maskApiKey("placeholder")}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? "Hide" : "Show"}
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type={visible ? "text" : "password"}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="sk-..."
            className="h-10 flex-1 rounded-md border border-border bg-surface px-3 text-sm text-foreground placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? "Hide" : "Show"}
          </Button>
        </div>
      )}

      {hasExistingKey ? (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <button
            type="button"
            className="text-accent hover:text-accent-hover"
            onClick={() => {
              onClearExistingChange(false);
              onChange("");
            }}
          >
            Replace key
          </button>
          <label className="flex items-center gap-2 text-muted">
            <input
              type="checkbox"
              checked={clearExisting}
              onChange={(event) => onClearExistingChange(event.target.checked)}
            />
            Remove saved key
          </label>
        </div>
      ) : null}

      {visible && showingSaved ? (
        <p className="text-xs text-muted">
          For security, saved keys are never shown in full. Choose Replace key to
          enter a new one.
        </p>
      ) : null}
    </div>
  );
}
