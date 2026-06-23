"use client";

import type { CurriculumSummary } from "@/types/curriculum";

type CurriculumListProps = {
  curricula: CurriculumSummary[];
  onSelect: (curriculumId: string) => void;
};

export function CurriculumList({ curricula, onSelect }: CurriculumListProps) {
  if (curricula.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm text-muted">
        No curricula found. Run migrations 003 and 004 in Supabase, then refresh
        this page.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {curricula.map((curriculum) => (
        <li key={curriculum.id}>
          <button
            type="button"
            onClick={() => onSelect(curriculum.id)}
            className="w-full rounded-lg border border-border bg-surface p-4 text-left transition-colors hover:border-accent hover:bg-accent-soft"
          >
            <p className="font-medium text-foreground">{curriculum.title}</p>
            {curriculum.description ? (
              <p className="mt-1 text-sm text-muted">{curriculum.description}</p>
            ) : null}
          </button>
        </li>
      ))}
    </ul>
  );
}
