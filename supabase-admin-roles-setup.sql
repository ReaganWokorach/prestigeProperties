/* ═══════════════════════════════════════════════════════════════════════════
   Ker Properties — Main Admin / Regular Admin role system
   Run this ENTIRE script once in: Supabase Dashboard → SQL Editor → New query
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── 1. The roles table ───────────────────────────────────────────────────
   One row per admin account. role is either:
     'main'  — full authority, can manage other Admins, Team, Settings
     'admin' — regular admin: listings + messages + own password only
   No one but the Netlify function (using the service_role key, which
   bypasses RLS) can write to this table — that's what keeps a regular
   Admin from ever promoting themselves. */
create table if not exists public.admin_roles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'admin' check (role in ('main', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.admin_roles enable row level security;

/* ── 2. Helper function ───────────────────────────────────────────────────
   security definer = runs with elevated rights so it can check the table
   without getting tangled in the RLS policies that reference it. This is
   the standard, recommended Supabase pattern for role checks. */
create or replace function public.is_main_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_roles
    where user_id = auth.uid() and role = 'main'
  );
$$;

/* ── 3. Policy on admin_roles ──────────────────────────────────────────
   Each admin can read ONLY their own role row — that's all the browser
   ever needs (it's used to decide which tabs to show after login). The
   full list of admins + their roles, shown on the Admins tab, is fetched
   through the Netlify function using the service_role key instead, which
   bypasses RLS entirely — so this policy is deliberately kept simple and
   does NOT reference is_main_admin() or query admin_roles from within its
   own policy. A self-referencing policy like that is a well-known cause of
   slow or hanging queries in Postgres, and it isn't needed here anyway.
   No INSERT/UPDATE/DELETE policies are defined on purpose — only the
   Netlify function, using the service_role key, can write here. */
drop policy if exists "read own role or all if main" on public.admin_roles;
drop policy if exists "read own role" on public.admin_roles;
create policy "read own role"
  on public.admin_roles for select
  using (auth.uid() = user_id);

/* ── 4. Tighten kp_team — Team management is Main-Admin-only ─────────────
   The public site still needs to READ the team (About page), so SELECT
   stays open to everyone. Writes (add/edit/remove a team member) now
   require Main Admin. This clears out any older policies first so we
   start from a clean, known state regardless of what's there today. */
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'kp_team' loop
    execute format('drop policy %I on public.kp_team', pol.policyname);
  end loop;
end $$;

alter table public.kp_team enable row level security;

create policy "public can read team"
  on public.kp_team for select
  using (true);

create policy "main admin can insert team"
  on public.kp_team for insert
  with check (public.is_main_admin());

create policy "main admin can update team"
  on public.kp_team for update
  using (public.is_main_admin());

create policy "main admin can delete team"
  on public.kp_team for delete
  using (public.is_main_admin());

/* ── 5. Tighten kp_listings — deleting is Main-Admin-only ────────────────
   Regular Admins can still ADD and EDIT listings (as you asked), and the
   public can still browse them. Only DELETE (including the "Delete ALL"
   danger-zone button and "Seed Starter Listings") is restricted to Main
   Admin, since your spec only grants regular Admins "add" + "edit". */
do $$
declare pol record;
begin
  for pol in select policyname from pg_policies where schemaname = 'public' and tablename = 'kp_listings' loop
    execute format('drop policy %I on public.kp_listings', pol.policyname);
  end loop;
end $$;

alter table public.kp_listings enable row level security;

create policy "public can read listings"
  on public.kp_listings for select
  using (true);

create policy "authenticated admins can insert listings"
  on public.kp_listings for insert
  to authenticated
  with check (true);

create policy "authenticated admins can update listings"
  on public.kp_listings for update
  to authenticated
  using (true);

create policy "main admin can delete listings"
  on public.kp_listings for delete
  using (public.is_main_admin());

/* ═══════════════════════════════════════════════════════════════════════════
   ONE-TIME STEP — run this SEPARATELY, after the script above succeeds.
   This is what makes YOUR account the Main Admin. Replace the email below
   with the exact email address you use to log in to /admin.html, then run
   just this block on its own.
   ═══════════════════════════════════════════════════════════════════════════ */

-- insert into public.admin_roles (user_id, role)
-- select id, 'main' from auth.users where email = 'YOUR_LOGIN_EMAIL_HERE'
-- on conflict (user_id) do update set role = 'main';
