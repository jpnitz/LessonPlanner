-- MicroSchool Lesson Planner — user-owned curricula + write access
-- REVIEW THIS FILE BEFORE RUNNING.
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
--
-- Enables saving chat-proposed standards into the database, then KSAs and lessons.

-- ---------------------------------------------------------------------------
-- curricula — track who created custom curricula (null = system catalog)
-- ---------------------------------------------------------------------------
alter table public.curricula
  add column if not exists managed_by_user_id uuid references auth.users (id) on delete cascade;

create index if not exists curricula_managed_by_user_id_idx
  on public.curricula (managed_by_user_id)
  where managed_by_user_id is not null;

-- ---------------------------------------------------------------------------
-- Row level security — write access for user-owned curricula
-- ---------------------------------------------------------------------------
drop policy if exists "Parents can insert own curricula" on public.curricula;
create policy "Parents can insert own curricula"
  on public.curricula for insert
  to authenticated
  with check (managed_by_user_id = auth.uid());

drop policy if exists "Parents can update own curricula" on public.curricula;
create policy "Parents can update own curricula"
  on public.curricula for update
  to authenticated
  using (managed_by_user_id = auth.uid())
  with check (managed_by_user_id = auth.uid());

drop policy if exists "Parents can delete own curricula" on public.curricula;
create policy "Parents can delete own curricula"
  on public.curricula for delete
  to authenticated
  using (managed_by_user_id = auth.uid());

drop policy if exists "Parents can insert standards for own curricula" on public.learning_standards;
create policy "Parents can insert standards for own curricula"
  on public.learning_standards for insert
  to authenticated
  with check (
    exists (
      select 1 from public.curricula c
      where c.id = curriculum_id
        and c.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can update standards for own curricula" on public.learning_standards;
create policy "Parents can update standards for own curricula"
  on public.learning_standards for update
  to authenticated
  using (
    exists (
      select 1 from public.curricula c
      where c.id = learning_standards.curriculum_id
        and c.managed_by_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.curricula c
      where c.id = curriculum_id
        and c.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can delete standards for own curricula" on public.learning_standards;
create policy "Parents can delete standards for own curricula"
  on public.learning_standards for delete
  to authenticated
  using (
    exists (
      select 1 from public.curricula c
      where c.id = learning_standards.curriculum_id
        and c.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can insert ksas for own standards" on public.standard_ksas;
create policy "Parents can insert ksas for own standards"
  on public.standard_ksas for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.learning_standards ls
      join public.curricula c on c.id = ls.curriculum_id
      where ls.id = standard_id
        and c.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can update ksas for own standards" on public.standard_ksas;
create policy "Parents can update ksas for own standards"
  on public.standard_ksas for update
  to authenticated
  using (
    exists (
      select 1
      from public.learning_standards ls
      join public.curricula c on c.id = ls.curriculum_id
      where ls.id = standard_ksas.standard_id
        and c.managed_by_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.learning_standards ls
      join public.curricula c on c.id = ls.curriculum_id
      where ls.id = standard_id
        and c.managed_by_user_id = auth.uid()
    )
  );

drop policy if exists "Parents can delete ksas for own standards" on public.standard_ksas;
create policy "Parents can delete ksas for own standards"
  on public.standard_ksas for delete
  to authenticated
  using (
    exists (
      select 1
      from public.learning_standards ls
      join public.curricula c on c.id = ls.curriculum_id
      where ls.id = standard_ksas.standard_id
        and c.managed_by_user_id = auth.uid()
    )
  );
