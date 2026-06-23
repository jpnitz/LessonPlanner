-- MicroSchool Lesson Planner — Phase 4 AI chat + curriculum model update
-- REVIEW THIS FILE BEFORE RUNNING.
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
--
-- Requires Phase 3 migration (003) to have been applied first.
--
-- Changes:
-- 1. Flatten curriculum_sections into learning_standards (domain_title column)
-- 2. Add standard_ksas (Knowledge, Skills, Abilities per standard)
-- 3. Add student_curricula (which subjects each student studies)
-- 4. Add lesson_planner_settings (hours, days, selected students)
-- 5. Add student_current_topics (persist selected standard per student)
-- 6. Server-only function to read LLM API keys for chat routes

-- ---------------------------------------------------------------------------
-- Restructure learning_standards: attach directly to curricula
-- ---------------------------------------------------------------------------
alter table public.learning_standards
  add column if not exists curriculum_id uuid references public.curricula (id) on delete cascade;

alter table public.learning_standards
  add column if not exists domain_title text;

-- Migrate from curriculum_sections when Phase 3 schema exists
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'learning_standards'
      and column_name = 'section_id'
  ) then
    update public.learning_standards ls
    set
      curriculum_id = cs.curriculum_id,
      domain_title = cs.title
    from public.curriculum_sections cs
    where ls.section_id = cs.id
      and ls.curriculum_id is null;

    alter table public.learning_standards drop constraint if exists learning_standards_section_id_fkey;
    alter table public.learning_standards drop column section_id;
  end if;
end $$;

alter table public.learning_standards
  alter column curriculum_id set not null;

create index if not exists learning_standards_curriculum_id_idx
  on public.learning_standards (curriculum_id, sort_order);

drop table if exists public.curriculum_sections cascade;

-- ---------------------------------------------------------------------------
-- standard_ksas — Knowledge, Skills, Abilities per learning standard
-- ---------------------------------------------------------------------------
create table if not exists public.standard_ksas (
  id uuid primary key default gen_random_uuid(),
  standard_id uuid not null references public.learning_standards (id) on delete cascade,
  ksa_type text not null check (ksa_type in ('knowledge', 'skill', 'ability')),
  title text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists standard_ksas_standard_id_idx
  on public.standard_ksas (standard_id, ksa_type, sort_order);

drop trigger if exists standard_ksas_set_updated_at on public.standard_ksas;
create trigger standard_ksas_set_updated_at
  before update on public.standard_ksas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- student_curricula — subjects each student studies
-- ---------------------------------------------------------------------------
create table if not exists public.student_curricula (
  student_id uuid not null references public.students (id) on delete cascade,
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (student_id, curriculum_id)
);

create index if not exists student_curricula_curriculum_id_idx
  on public.student_curricula (curriculum_id);

-- ---------------------------------------------------------------------------
-- lesson_planner_settings — per parent/teacher account
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_planner_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hours_per_week numeric(4, 1),
  hours_per_day numeric(4, 1),
  days_of_week int[] not null default '{}',
  selected_student_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lesson_planner_hours_per_week_nonneg check (
    hours_per_week is null or hours_per_week >= 0
  ),
  constraint lesson_planner_hours_per_day_nonneg check (
    hours_per_day is null or hours_per_day >= 0
  )
);

drop trigger if exists lesson_planner_settings_set_updated_at on public.lesson_planner_settings;
create trigger lesson_planner_settings_set_updated_at
  before update on public.lesson_planner_settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- student_current_topics — persist selected learning standard
-- ---------------------------------------------------------------------------
create table if not exists public.student_current_topics (
  student_id uuid primary key references public.students (id) on delete cascade,
  standard_id uuid not null references public.learning_standards (id) on delete cascade,
  updated_at timestamptz not null default now()
);

drop trigger if exists student_current_topics_set_updated_at on public.student_current_topics;
create trigger student_current_topics_set_updated_at
  before update on public.student_current_topics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.standard_ksas enable row level security;
alter table public.student_curricula enable row level security;
alter table public.lesson_planner_settings enable row level security;
alter table public.student_current_topics enable row level security;

drop policy if exists "Authenticated users can read standard ksas" on public.standard_ksas;
create policy "Authenticated users can read standard ksas"
  on public.standard_ksas for select
  to authenticated
  using (true);

drop policy if exists "Users can read student curricula they manage or own" on public.student_curricula;
create policy "Users can read student curricula they manage or own"
  on public.student_curricula for select
  to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = student_curricula.student_id
        and (s.auth_user_id = auth.uid() or s.managed_by_user_id = auth.uid())
    )
  );

drop policy if exists "Parents can manage student curricula" on public.student_curricula;
create policy "Parents can manage student curricula"
  on public.student_curricula for all
  to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = student_curricula.student_id
        and s.managed_by_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.students s
      where s.id = student_curricula.student_id
        and s.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Users can read own lesson planner settings" on public.lesson_planner_settings;
create policy "Users can read own lesson planner settings"
  on public.lesson_planner_settings for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "Users can insert own lesson planner settings" on public.lesson_planner_settings;
create policy "Users can insert own lesson planner settings"
  on public.lesson_planner_settings for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can update own lesson planner settings" on public.lesson_planner_settings;
create policy "Users can update own lesson planner settings"
  on public.lesson_planner_settings for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users can read current topics they manage or own" on public.student_current_topics;
create policy "Users can read current topics they manage or own"
  on public.student_current_topics for select
  to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = student_current_topics.student_id
        and (s.auth_user_id = auth.uid() or s.managed_by_user_id = auth.uid())
    )
  );

drop policy if exists "Users can upsert current topics they manage or own" on public.student_current_topics;
create policy "Users can upsert current topics they manage or own"
  on public.student_current_topics for all
  to authenticated
  using (
    exists (
      select 1 from public.students s
      where s.id = student_current_topics.student_id
        and (s.auth_user_id = auth.uid() or s.managed_by_user_id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.students s
      where s.id = student_current_topics.student_id
        and (s.auth_user_id = auth.uid() or s.managed_by_user_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- Server-only LLM key access (never granted to authenticated/anon)
-- ---------------------------------------------------------------------------
create or replace function public.get_student_llm_api_key(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  key_value text;
begin
  if not exists (
    select 1 from public.students s
    where s.id = p_student_id
      and (s.auth_user_id = auth.uid() or s.managed_by_user_id = auth.uid())
  ) then
    return null;
  end if;

  select ss.llm_api_key into key_value
  from public.student_secrets ss
  where ss.student_id = p_student_id;

  return key_value;
end;
$$;

revoke all on function public.get_student_llm_api_key(uuid) from public;
revoke all on function public.get_student_llm_api_key(uuid) from authenticated;
revoke all on function public.get_student_llm_api_key(uuid) from anon;

-- ---------------------------------------------------------------------------
-- Seed KSAs for existing standards (generic placeholders)
-- ---------------------------------------------------------------------------
insert into public.standard_ksas (standard_id, ksa_type, title, description, sort_order)
select ls.id, ksa.ksa_type, ksa.title, ksa.description, ksa.sort_order
from public.learning_standards ls
cross join (
  values
    ('knowledge', 'Core concepts and vocabulary', 'Understand the foundational terms and ideas for this standard.', 1),
    ('skill', 'Applied practice', 'Demonstrate the standard through guided exercises and examples.', 2),
    ('ability', 'Problem solving and transfer', 'Apply the standard to new situations independently.', 3)
) as ksa(ksa_type, title, description, sort_order)
where not exists (
  select 1 from public.standard_ksas sk where sk.standard_id = ls.id
);

-- Assign sample curricula to primary students (optional starter data)
insert into public.student_curricula (student_id, curriculum_id)
select s.id, c.id
from public.students s
cross join public.curricula c
where s.is_primary = true
  and c.slug in ('algebra', 'chemistry')
on conflict do nothing;
