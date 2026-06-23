-- MicroSchool Lesson Planner — Phase 5 calendar
-- REVIEW THIS FILE BEFORE RUNNING.
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
--
-- Requires Phase 4 migration (004) to have been applied first.
--
-- Adds:
-- 1. lessons — lesson records (content projected in main pane when selected)
-- 2. calendar_events — scheduled lesson + custom (non-curriculum) events
-- 3. calendar_events_display — view with lesson title + curriculum title
-- 4. RLS for parent-managed / student-readable access
--
-- Phase 6 will extend lessons with lesson_type, activities, and AI generation.
-- Google Calendar sync is UI-only stub in Phase 5 (no table here).

-- ---------------------------------------------------------------------------
-- lessons — minimal lesson records (extended in Phase 6)
-- ---------------------------------------------------------------------------
create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  managed_by_user_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  curriculum_id uuid references public.curricula (id) on delete set null,
  standard_id uuid references public.learning_standards (id) on delete set null,
  title text not null,
  summary text,
  content text,
  status text not null default 'draft'
    check (status in ('draft', 'scheduled', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lessons_standard_requires_curriculum check (
    standard_id is null or curriculum_id is not null
  )
);

create index if not exists lessons_managed_by_user_id_idx
  on public.lessons (managed_by_user_id, updated_at desc);

create index if not exists lessons_student_id_idx
  on public.lessons (student_id, updated_at desc);

create index if not exists lessons_curriculum_id_idx
  on public.lessons (curriculum_id)
  where curriculum_id is not null;

drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at
  before update on public.lessons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- calendar_events — scheduled items on the calendar
-- ---------------------------------------------------------------------------
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  managed_by_user_id uuid not null references auth.users (id) on delete cascade,
  student_id uuid not null references public.students (id) on delete cascade,
  lesson_id uuid references public.lessons (id) on delete cascade,
  event_type text not null check (event_type in ('lesson', 'custom')),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  is_all_day boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_events_time_range check (ends_at >= starts_at),
  constraint calendar_events_kind_consistency check (
    (event_type = 'custom' and lesson_id is null)
    or (event_type = 'lesson' and lesson_id is not null)
  )
);

create index if not exists calendar_events_managed_by_starts_idx
  on public.calendar_events (managed_by_user_id, starts_at);

create index if not exists calendar_events_student_starts_idx
  on public.calendar_events (student_id, starts_at);

create index if not exists calendar_events_lesson_id_idx
  on public.calendar_events (lesson_id)
  where lesson_id is not null;

drop trigger if exists calendar_events_set_updated_at on public.calendar_events;
create trigger calendar_events_set_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Display view — lesson title + curriculum title for calendar UI
-- ---------------------------------------------------------------------------
create or replace view public.calendar_events_display
with (security_invoker = true) as
select
  ce.id,
  ce.managed_by_user_id,
  ce.student_id,
  ce.lesson_id,
  ce.event_type,
  ce.title as event_title,
  ce.description as event_description,
  ce.starts_at,
  ce.ends_at,
  ce.is_all_day,
  ce.created_at,
  ce.updated_at,
  l.title as lesson_title,
  l.summary as lesson_summary,
  l.content as lesson_content,
  l.status as lesson_status,
  c.id as curriculum_id,
  c.title as curriculum_title,
  ls.id as standard_id,
  ls.title as standard_title,
  s.display_name as student_display_name
from public.calendar_events ce
join public.students s on s.id = ce.student_id
left join public.lessons l on l.id = ce.lesson_id
left join public.curricula c on c.id = l.curriculum_id
left join public.learning_standards ls on ls.id = l.standard_id;

grant select on public.calendar_events_display to authenticated;

-- ---------------------------------------------------------------------------
-- Row level security — lessons
-- ---------------------------------------------------------------------------
alter table public.lessons enable row level security;

drop policy if exists "Users can read lessons they manage or own" on public.lessons;
create policy "Users can read lessons they manage or own"
  on public.lessons for select
  to authenticated
  using (
    managed_by_user_id = auth.uid()
    or exists (
      select 1 from public.students s
      where s.id = lessons.student_id
        and s.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can insert lessons for managed students" on public.lessons;
create policy "Parents can insert lessons for managed students"
  on public.lessons for insert
  to authenticated
  with check (
    managed_by_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = student_id
        and s.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can update lessons for managed students" on public.lessons;
create policy "Parents can update lessons for managed students"
  on public.lessons for update
  to authenticated
  using (
    managed_by_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = lessons.student_id
        and s.managed_by_user_id = auth.uid()
    )
  )
  with check (
    managed_by_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = student_id
        and s.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can delete lessons for managed students" on public.lessons;
create policy "Parents can delete lessons for managed students"
  on public.lessons for delete
  to authenticated
  using (
    managed_by_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = lessons.student_id
        and s.managed_by_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Row level security — calendar_events
-- ---------------------------------------------------------------------------
alter table public.calendar_events enable row level security;

drop policy if exists "Users can read calendar events they manage or own" on public.calendar_events;
create policy "Users can read calendar events they manage or own"
  on public.calendar_events for select
  to authenticated
  using (
    managed_by_user_id = auth.uid()
    or exists (
      select 1 from public.students s
      where s.id = calendar_events.student_id
        and s.auth_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can insert calendar events for managed students" on public.calendar_events;
create policy "Parents can insert calendar events for managed students"
  on public.calendar_events for insert
  to authenticated
  with check (
    managed_by_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = student_id
        and s.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can update calendar events for managed students" on public.calendar_events;
create policy "Parents can update calendar events for managed students"
  on public.calendar_events for update
  to authenticated
  using (
    managed_by_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = calendar_events.student_id
        and s.managed_by_user_id = auth.uid()
    )
  )
  with check (
    managed_by_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = student_id
        and s.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can delete calendar events for managed students" on public.calendar_events;
create policy "Parents can delete calendar events for managed students"
  on public.calendar_events for delete
  to authenticated
  using (
    managed_by_user_id = auth.uid()
    and exists (
      select 1 from public.students s
      where s.id = calendar_events.student_id
        and s.managed_by_user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Optional starter data — one sample lesson + event per primary student
-- ---------------------------------------------------------------------------
insert into public.lessons (
  managed_by_user_id,
  student_id,
  curriculum_id,
  standard_id,
  title,
  summary,
  content,
  status
)
select
  s.managed_by_user_id,
  s.id,
  c.id,
  ls.id,
  'Introduction to ' || ls.title,
  'Sample lesson linked to ' || c.title || '.',
  '# Sample lesson' || E'\n\n'
    || 'This is placeholder content for the main pane. '
    || 'Phase 6 will generate full lesson plans from KSAs.',
  'scheduled'
from public.students s
join public.student_curricula sc on sc.student_id = s.id
join public.curricula c on c.id = sc.curriculum_id
join public.learning_standards ls on ls.curriculum_id = c.id
where s.is_primary = true
  and c.slug = 'algebra'
  and ls.sort_order = 1
  and not exists (
    select 1 from public.lessons l
    where l.student_id = s.id
      and l.standard_id = ls.id
  )
limit 1;

insert into public.calendar_events (
  managed_by_user_id,
  student_id,
  lesson_id,
  event_type,
  title,
  description,
  starts_at,
  ends_at
)
select
  l.managed_by_user_id,
  l.student_id,
  l.id,
  'lesson',
  l.title,
  l.summary,
  date_trunc('week', now()) + interval '1 day' + interval '10 hours',
  date_trunc('week', now()) + interval '1 day' + interval '11 hours'
from public.lessons l
where l.status = 'scheduled'
  and not exists (
    select 1 from public.calendar_events ce
    where ce.lesson_id = l.id
  )
limit 1;
