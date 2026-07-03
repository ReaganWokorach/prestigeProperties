/* ═══════════════════════════════════════════════════════════════════════════
   Ker Properties — fix for slow/failing Admin dashboard login
   Run this in: Supabase Dashboard → SQL Editor → New query
   (Safe to run even if you've already run supabase-admin-roles-setup.sql —
   this only replaces one policy.)
   ═══════════════════════════════════════════════════════════════════════════ */

/* The original policy let a query check "is this user the Main Admin?" by
   querying admin_roles from INSIDE a policy that is itself protecting
   admin_roles. That kind of self-reference is a classic cause of slow or
   hanging queries in Postgres. It also wasn't needed — the browser only
   ever needs to read its OWN role row; the full admin list is fetched
   through the Netlify function with the service_role key instead, which
   bypasses RLS entirely. This replaces it with a simple, fast policy. */
drop policy if exists "read own role or all if main" on public.admin_roles;
drop policy if exists "read own role" on public.admin_roles;
create policy "read own role"
  on public.admin_roles for select
  using (auth.uid() = user_id);

/* ── Quick verification — run this separately afterward ──
   You should see exactly one row, with role = 'main', for your login email.
   If you see ZERO rows, the earlier bootstrap step didn't take — re-run it
   with your exact login email (case-sensitive, must match auth.users).

   select u.email, r.role, r.created_at
   from public.admin_roles r
   join auth.users u on u.id = r.user_id;
   ═══════════════════════════════════════════════════════════════════════════ */
