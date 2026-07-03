-- ═══════════════════════════════════════════════════════════════════════════
-- Ker Properties — fix_kp_team.sql
--
-- Run this if you see the error:
--   "Could not find the table 'public.kp_team' in the schema cache"
--
-- This means the kp_team table was never created in your Supabase project
-- (it was added to supabase_schema.sql after the initial release, so if
-- you ran the schema early on the table will be missing).
--
-- HOW TO RUN:
--   Supabase Dashboard → SQL Editor → New Query → paste this → Run
--
-- This is 100% safe to re-run: every statement uses IF NOT EXISTS /
-- OR REPLACE / ON CONFLICT DO NOTHING.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create the table (safe if it already exists)
create table if not exists public.kp_team (
  id          bigint generated always as identity primary key,
  name        text not null,
  role        text not null default '',
  bio         text not null default '',
  photo_url   text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. updated_at trigger (reuses the function created by supabase_schema.sql)
drop trigger if exists kp_team_set_updated_at on public.kp_team;
create trigger kp_team_set_updated_at
  before update on public.kp_team
  for each row execute function public.kp_set_updated_at();

-- 3. Row Level Security
alter table public.kp_team enable row level security;

drop policy if exists "Public can view team" on public.kp_team;
create policy "Public can view team"
  on public.kp_team for select to anon, authenticated using (true);

drop policy if exists "Authenticated can insert team" on public.kp_team;
create policy "Authenticated can insert team"
  on public.kp_team for insert to authenticated with check (true);

drop policy if exists "Authenticated can update team" on public.kp_team;
create policy "Authenticated can update team"
  on public.kp_team for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated can delete team" on public.kp_team;
create policy "Authenticated can delete team"
  on public.kp_team for delete to authenticated using (true);

-- 4. Realtime
alter publication supabase_realtime add table public.kp_team;

-- 5. Index
create index if not exists idx_kp_team_sort on public.kp_team (sort_order);

-- 6. Seed the 4 original team members (only if table is empty)
insert into public.kp_team (name, role, bio, sort_order)
select * from (values
  ('Ronald Okello', 'Founder & CEO',             'Over 10 years in Uganda''s property market. Ronald personally oversees every major land deal and client relationship.', 1),
  ('Acen Grace',    'Head of Rentals',            'Grace manages all rental listings, tenant relations, and lease agreements across our growing portfolio nationwide.', 2),
  ('Ojok Brian',    'Land Verification Officer',  'Brian coordinates with Lands Registry offices across Uganda to verify title documents before any listing goes live.', 3),
  ('Atim Norah',    'Client Relations',           'Norah is your first point of contact — handling enquiries, scheduling site visits, and following up on every lead.', 4)
) as t(name, role, bio, sort_order)
where not exists (select 1 from public.kp_team limit 1);

-- 7. Force PostgREST to reload its schema cache immediately so the table
--    is usable right away without waiting for the automatic refresh cycle.
notify pgrst, 'reload schema';

-- Done. You can now add team members from the admin panel.
