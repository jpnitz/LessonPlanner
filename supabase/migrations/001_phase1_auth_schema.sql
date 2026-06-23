-- MicroSchool Lesson Planner — Phase 1 schema
-- Paste this entire file into: Supabase Dashboard → SQL Editor → New query → Run

-- ---------------------------------------------------------------------------
-- Helper: auto-update updated_at
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles — parent/teacher (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- students — self-student + additional students
-- ---------------------------------------------------------------------------
create table public.students (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users (id) on delete cascade,
  managed_by_user_id uuid not null references auth.users (id) on delete cascade,
  is_primary boolean not null default false,
  login_id text unique,
  display_name text not null,
  birthday date,
  zip_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint students_login_id_format check (
    login_id is null or (login_id ~ '^[a-zA-Z0-9._-]{3,32}$')
  ),
  constraint students_primary_self check (
    not is_primary or (auth_user_id = managed_by_user_id and login_id is null)
  )
);

create unique index students_one_primary_per_parent
  on public.students (managed_by_user_id)
  where is_primary = true;

create index students_managed_by_user_id_idx on public.students (managed_by_user_id);
create index students_auth_user_id_idx on public.students (auth_user_id);

create trigger students_set_updated_at
  before update on public.students
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- student_secrets — LLM API keys (never exposed raw to clients)
-- ---------------------------------------------------------------------------
create table public.student_secrets (
  student_id uuid primary key references public.students (id) on delete cascade,
  llm_api_key text not null,
  updated_at timestamptz not null default now()
);

create trigger student_secrets_set_updated_at
  before update on public.student_secrets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create profile + primary student on sign-up
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_full_name text;
begin
  user_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name)
  values (new.id, user_full_name);

  insert into public.students (
    auth_user_id,
    managed_by_user_id,
    is_primary,
    display_name
  )
  values (
    new.id,
    new.id,
    true,
    user_full_name
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Masked LLM key preview (safe for clients)
-- ---------------------------------------------------------------------------
create or replace function public.get_masked_llm_api_key(p_student_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  key_value text;
begin
  if auth.uid() is null then
    return null;
  end if;

  if not exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.managed_by_user_id = auth.uid()
  ) then
    return null;
  end if;

  select ss.llm_api_key
  into key_value
  from public.student_secrets ss
  where ss.student_id = p_student_id;

  if key_value is null then
    return null;
  end if;

  if length(key_value) <= 4 then
    return repeat('•', 8);
  end if;

  return repeat('•', 8) || right(key_value, 4);
end;
$$;

grant execute on function public.get_masked_llm_api_key(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.student_secrets enable row level security;

-- profiles
create policy "Users can view own profile"
  on public.profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.profiles for update
  using (id = auth.uid());

-- students
create policy "Users can view managed or own student records"
  on public.students for select
  using (managed_by_user_id = auth.uid() or auth_user_id = auth.uid());

create policy "Parents can insert students they manage"
  on public.students for insert
  with check (managed_by_user_id = auth.uid());

create policy "Parents can update students they manage"
  on public.students for update
  using (managed_by_user_id = auth.uid());

create policy "Parents can delete non-primary students they manage"
  on public.students for delete
  using (managed_by_user_id = auth.uid() and is_primary = false);

-- student_secrets: no SELECT policy — raw keys are never readable via the API
create policy "Parents can insert secrets for managed students"
  on public.student_secrets for insert
  with check (
    exists (
      select 1
      from public.students s
      where s.id = student_id
        and s.managed_by_user_id = auth.uid()
    )
  );

create policy "Parents can update secrets for managed students"
  on public.student_secrets for update
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_id
        and s.managed_by_user_id = auth.uid()
    )
  );
