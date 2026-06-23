-- MicroSchool Lesson Planner — Phase 3 curriculum browsing
-- REVIEW THIS FILE BEFORE RUNNING.
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run
--
-- Adds:
-- 1. curricula — top-level subjects (Algebra, Chemistry, …)
-- 2. curriculum_sections — grouped learning domains within a curriculum
-- 3. learning_standards — individual selectable topics
-- 4. Read-only RLS for authenticated users
-- 5. Sample seed data for Algebra and Chemistry

-- ---------------------------------------------------------------------------
-- curricula
-- ---------------------------------------------------------------------------
create table public.curricula (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index curricula_sort_order_idx on public.curricula (sort_order, title);

create trigger curricula_set_updated_at
  before update on public.curricula
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- curriculum_sections — domain groupings (e.g. "Creating Equations")
-- ---------------------------------------------------------------------------
create table public.curriculum_sections (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references public.curricula (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index curriculum_sections_curriculum_id_idx
  on public.curriculum_sections (curriculum_id, sort_order);

create trigger curriculum_sections_set_updated_at
  before update on public.curriculum_sections
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- learning_standards — individual selectable topics
-- ---------------------------------------------------------------------------
create table public.learning_standards (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.curriculum_sections (id) on delete cascade,
  title text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index learning_standards_section_id_idx
  on public.learning_standards (section_id, sort_order);

create trigger learning_standards_set_updated_at
  before update on public.learning_standards
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row level security — shared catalog, read-only for signed-in users
-- ---------------------------------------------------------------------------
alter table public.curricula enable row level security;
alter table public.curriculum_sections enable row level security;
alter table public.learning_standards enable row level security;

create policy "Authenticated users can read curricula"
  on public.curricula for select
  to authenticated
  using (true);

create policy "Authenticated users can read curriculum sections"
  on public.curriculum_sections for select
  to authenticated
  using (true);

create policy "Authenticated users can read learning standards"
  on public.learning_standards for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- Seed: Algebra
-- ---------------------------------------------------------------------------
insert into public.curricula (slug, title, description, sort_order)
values (
  'algebra',
  'Algebra',
  'High school algebra standards covering polynomials, equations, and expressions.',
  1
);

insert into public.curriculum_sections (curriculum_id, title, sort_order)
select c.id, section.title, section.sort_order
from public.curricula c
cross join (
  values
    ('Arithmetic with Polynomials and Rational Expressions', 1),
    ('Creating Equations', 2)
) as section(title, sort_order)
where c.slug = 'algebra';

insert into public.learning_standards (section_id, title, sort_order)
select s.id, std.title, std.sort_order
from public.curriculum_sections s
join public.curricula c on c.id = s.curriculum_id
cross join (
  values
    ('Perform arithmetic operations on polynomials', 1),
    ('Understand the relationship between zeros and factors of polynomials', 2),
    ('Use polynomial identities to solve problems', 3),
    ('Rewrite rational expressions', 4)
) as std(title, sort_order)
where c.slug = 'algebra'
  and s.title = 'Arithmetic with Polynomials and Rational Expressions';

insert into public.learning_standards (section_id, title, sort_order)
select s.id, std.title, std.sort_order
from public.curriculum_sections s
join public.curricula c on c.id = s.curriculum_id
cross join (
  values
    ('Create equations that describe numbers or relationships', 1)
) as std(title, sort_order)
where c.slug = 'algebra'
  and s.title = 'Creating Equations';

-- ---------------------------------------------------------------------------
-- Seed: Chemistry
-- ---------------------------------------------------------------------------
insert into public.curricula (slug, title, description, sort_order)
values (
  'chemistry',
  'Chemistry',
  'High school chemistry standards covering matter, structure, and reactions.',
  2
);

insert into public.curriculum_sections (curriculum_id, title, sort_order)
select c.id, section.title, section.sort_order
from public.curricula c
cross join (
  values
    ('Structure and Properties of Matter', 1),
    ('Chemical Reactions', 2)
) as section(title, sort_order)
where c.slug = 'chemistry';

insert into public.learning_standards (section_id, title, sort_order)
select s.id, std.title, std.sort_order
from public.curriculum_sections s
join public.curricula c on c.id = s.curriculum_id
cross join (
  values
    ('Use the periodic table to predict properties of elements', 1),
    ('Analyze data from physical properties to identify substances', 2),
    ('Model atomic structure and electron configuration', 3)
) as std(title, sort_order)
where c.slug = 'chemistry'
  and s.title = 'Structure and Properties of Matter';

insert into public.learning_standards (section_id, title, sort_order)
select s.id, std.title, std.sort_order
from public.curriculum_sections s
join public.curricula c on c.id = s.curriculum_id
cross join (
  values
    ('Balance chemical equations', 1),
    ('Classify reactions as synthesis, decomposition, single replacement, or double replacement', 2),
    ('Use stoichiometry to calculate quantities in reactions', 3)
) as std(title, sort_order)
where c.slug = 'chemistry'
  and s.title = 'Chemical Reactions';
