-- MicroSchool Lesson Planner — Phase 2 profile management
-- REVIEW THIS FILE BEFORE RUNNING.
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
--
-- Changes from Phase 1:
-- 1. Additional students can use login_email OR login_id for separate sign-in
-- 2. Trigger skips auto profile/student for student-only auth accounts
-- 3. Safe view exposes has_llm_api_key + masked key preview (never raw key)
-- 4. Helper to check if birthday + zip are complete
-- 5. DELETE policy on student_secrets for cleanup

-- ---------------------------------------------------------------------------
-- students: add login_email for email-based student accounts
-- ---------------------------------------------------------------------------
alter table public.students
  add column if not exists login_email text;

create unique index if not exists students_login_email_unique
  on public.students (lower(login_email))
  where login_email is not null;

alter table public.students
  drop constraint if exists students_primary_self;

alter table public.students
  add constraint students_primary_self check (
    not is_primary
    or (
      auth_user_id = managed_by_user_id
      and login_id is null
      and login_email is null
    )
  );

alter table public.students
  drop constraint if exists students_additional_login;

alter table public.students
  add constraint students_additional_login check (
    is_primary
    or login_id is not null
    or login_email is not null
  );

-- ---------------------------------------------------------------------------
-- Skip auto profile/student for additional-student auth accounts
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
  if coalesce(new.raw_user_meta_data->>'account_type', '') = 'student' then
    return new;
  end if;

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

-- ---------------------------------------------------------------------------
-- Profile completeness helper (birthday + zip required to save in Phase 2)
-- ---------------------------------------------------------------------------
create or replace function public.is_student_profile_complete(p_student_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.students s
    where s.id = p_student_id
      and s.birthday is not null
      and nullif(trim(s.zip_code), '') is not null
  );
$$;

grant execute on function public.is_student_profile_complete(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Safe student view: includes masked key status, never raw secrets
-- ---------------------------------------------------------------------------
create or replace view public.students_safe
with (security_invoker = true) as
select
  s.id,
  s.auth_user_id,
  s.managed_by_user_id,
  s.is_primary,
  s.login_id,
  s.login_email,
  s.display_name,
  s.birthday,
  s.zip_code,
  s.created_at,
  s.updated_at,
  public.is_student_profile_complete(s.id) as is_profile_complete,
  exists (
    select 1
    from public.student_secrets ss
    where ss.student_id = s.id
  ) as has_llm_api_key,
  public.get_masked_llm_api_key(s.id) as llm_api_key_masked
from public.students s;

grant select on public.students_safe to authenticated;

-- ---------------------------------------------------------------------------
-- student_secrets: allow parents to delete keys when removing a student
-- ---------------------------------------------------------------------------
create policy "Parents can delete secrets for managed students"
  on public.student_secrets for delete
  using (
    exists (
      select 1
      from public.students s
      where s.id = student_id
        and s.managed_by_user_id = auth.uid()
    )
  );
