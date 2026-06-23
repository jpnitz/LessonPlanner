-- MicroSchool Lesson Planner — Phase 6 AI lesson generation
-- REVIEW THIS FILE BEFORE RUNNING.
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
--
-- Requires Phase 5 migration (005) to have been applied first.
--
-- Adds:
-- 1. lesson_activities — structured activities per lesson (video, worksheet, etc.)
-- 2. RLS for lesson_activities (inherits lesson access model)

-- ---------------------------------------------------------------------------
-- lesson_activities — structured lesson plan activities
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_activities (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  activity_type text not null check (
    activity_type in (
      'video',
      'web_activity',
      'computer_challenge',
      'worksheet',
      'home_activity',
      'community_activity',
      'thought_experiment'
    )
  ),
  title text not null,
  description text,
  duration_minutes int check (
    duration_minutes is null or duration_minutes > 0
  ),
  resources jsonb not null default '{}'::jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lesson_activities_lesson_id_idx
  on public.lesson_activities (lesson_id, sort_order);

drop trigger if exists lesson_activities_set_updated_at on public.lesson_activities;
create trigger lesson_activities_set_updated_at
  before update on public.lesson_activities
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security — lesson_activities
-- ---------------------------------------------------------------------------
alter table public.lesson_activities enable row level security;

drop policy if exists "Users can read activities for lessons they manage or own"
  on public.lesson_activities;
create policy "Users can read activities for lessons they manage or own"
  on public.lesson_activities for select
  to authenticated
  using (
    exists (
      select 1 from public.lessons l
      where l.id = lesson_activities.lesson_id
        and (
          l.managed_by_user_id = auth.uid()
          or exists (
            select 1 from public.students s
            where s.id = l.student_id
              and s.auth_user_id = auth.uid()
          )
        )
    )
  );

drop policy if exists "Parents can insert activities for managed lessons"
  on public.lesson_activities;
create policy "Parents can insert activities for managed lessons"
  on public.lesson_activities for insert
  to authenticated
  with check (
    exists (
      select 1 from public.lessons l
      join public.students s on s.id = l.student_id
      where l.id = lesson_id
        and l.managed_by_user_id = auth.uid()
        and s.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can update activities for managed lessons"
  on public.lesson_activities;
create policy "Parents can update activities for managed lessons"
  on public.lesson_activities for update
  to authenticated
  using (
    exists (
      select 1 from public.lessons l
      join public.students s on s.id = l.student_id
      where l.id = lesson_activities.lesson_id
        and l.managed_by_user_id = auth.uid()
        and s.managed_by_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.lessons l
      join public.students s on s.id = l.student_id
      where l.id = lesson_id
        and l.managed_by_user_id = auth.uid()
        and s.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can delete activities for managed lessons"
  on public.lesson_activities;
create policy "Parents can delete activities for managed lessons"
  on public.lesson_activities for delete
  to authenticated
  using (
    exists (
      select 1 from public.lessons l
      join public.students s on s.id = l.student_id
      where l.id = lesson_activities.lesson_id
        and l.managed_by_user_id = auth.uid()
        and s.managed_by_user_id = auth.uid()
    )
  );
