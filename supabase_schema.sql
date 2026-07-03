-- ═══════════════════════════════════════════════════════════════════════════
-- Ker Properties — Supabase Database Schema & Security Policies
-- Run this entire file once in: Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────
-- 1. LISTINGS TABLE
-- ─────────────────────────────────────────────
create table if not exists public.kp_listings (
  id            bigint generated always as identity primary key,
  type          text not null check (type in ('land-sale','land-rent','house-sale','house-rent')),
  title         text not null,
  location      text not null,
  location_key  text not null default '',
  price         bigint not null default 0,
  price_label   text not null default '',
  price_note    text not null default '',
  features      text[] not null default '{}',
  feature_icons text[] not null default '{}',
  description   text not null default '',
  photos        text[] not null default '{}',
  available     boolean not null default true,
  featured      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update the updated_at column on every change
create or replace function public.kp_set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists kp_listings_set_updated_at on public.kp_listings;
create trigger kp_listings_set_updated_at
  before update on public.kp_listings
  for each row execute function public.kp_set_updated_at();

-- ─────────────────────────────────────────────
-- 2. MESSAGES TABLE (contact / enquiry / reviews)
-- ─────────────────────────────────────────────
create table if not exists public.kp_messages (
  id          bigint generated always as identity primary key,
  "from"      text not null,
  phone       text,
  email       text,
  location    text,
  subject     text,
  body        text not null,
  type        text not null default 'contact',
  category    text not null default 'contact',
  rating      smallint,
  service     text,
  unread      boolean not null default true,
  "time"      text,
  created_at  timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
--    This is the core of the security model: by default NOTHING
--    is accessible. Every permission below is explicit and minimal.
-- ─────────────────────────────────────────────
alter table public.kp_listings enable row level security;
alter table public.kp_messages enable row level security;

-- ── Listings: public can READ (the website needs to display properties) ──
drop policy if exists "Public can view listings" on public.kp_listings;
create policy "Public can view listings"
  on public.kp_listings
  for select
  to anon, authenticated
  using (true);

-- ── Listings: ONLY authenticated (logged-in admin) users can INSERT ──
drop policy if exists "Authenticated can insert listings" on public.kp_listings;
create policy "Authenticated can insert listings"
  on public.kp_listings
  for insert
  to authenticated
  with check (true);

-- ── Listings: ONLY authenticated (logged-in admin) users can UPDATE ──
drop policy if exists "Authenticated can update listings" on public.kp_listings;
create policy "Authenticated can update listings"
  on public.kp_listings
  for update
  to authenticated
  using (true)
  with check (true);

-- ── Listings: ONLY authenticated (logged-in admin) users can DELETE ──
drop policy if exists "Authenticated can delete listings" on public.kp_listings;
create policy "Authenticated can delete listings"
  on public.kp_listings
  for delete
  to authenticated
  using (true);

-- ── Messages: ANYONE can INSERT (public contact/enquiry/review forms) ──
drop policy if exists "Public can submit messages" on public.kp_messages;
create policy "Public can submit messages"
  on public.kp_messages
  for insert
  to anon, authenticated
  with check (true);

-- ── Messages: ONLY authenticated admin can READ (protects customer PII) ──
drop policy if exists "Authenticated can view messages" on public.kp_messages;
create policy "Authenticated can view messages"
  on public.kp_messages
  for select
  to authenticated
  using (true);

-- ── Messages: ONLY authenticated admin can UPDATE (mark as read) ──
drop policy if exists "Authenticated can update messages" on public.kp_messages;
create policy "Authenticated can update messages"
  on public.kp_messages
  for update
  to authenticated
  using (true)
  with check (true);

-- ── Messages: ONLY authenticated admin can DELETE ──
drop policy if exists "Authenticated can delete messages" on public.kp_messages;
create policy "Authenticated can delete messages"
  on public.kp_messages
  for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- 4. STORAGE BUCKET FOR PROPERTY PHOTOS
--    Run this section, then also verify bucket settings in
--    Dashboard → Storage (see step-by-step guide).
-- ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kp-photos', 'kp-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

-- Public can VIEW photos (needed to display listing images on the site)
drop policy if exists "Public can view photos" on storage.objects;
create policy "Public can view photos"
  on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'kp-photos');

-- ONLY authenticated admin can UPLOAD photos
drop policy if exists "Authenticated can upload photos" on storage.objects;
create policy "Authenticated can upload photos"
  on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'kp-photos');

-- ONLY authenticated admin can DELETE photos
drop policy if exists "Authenticated can delete photos" on storage.objects;
create policy "Authenticated can delete photos"
  on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'kp-photos');

-- ─────────────────────────────────────────────
-- 5. REALTIME — enable live sync for listings & messages
--    so every device sees changes instantly without refreshing.
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table public.kp_listings;
alter publication supabase_realtime add table public.kp_messages;

-- ─────────────────────────────────────────────
-- 6. INDEXES for performance
-- ─────────────────────────────────────────────
create index if not exists idx_kp_listings_type     on public.kp_listings (type);
create index if not exists idx_kp_listings_featured  on public.kp_listings (featured);
create index if not exists idx_kp_messages_unread    on public.kp_messages (unread);
create index if not exists idx_kp_messages_category  on public.kp_messages (category);

-- ─────────────────────────────────────────────
-- 7. SEED STARTER LISTINGS
--    Inserts your original 14 listings immediately, so the site never
--    shows "no listings" to a public visitor — even before any admin
--    has ever logged in. Safe to re-run: it only inserts if the table
--    is currently empty, so it won't duplicate listings on a second run.
-- ─────────────────────────────────────────────
insert into public.kp_listings
  (type, title, location, location_key, price, price_label, price_note, features, feature_icons, description, photos, available, featured)
select * from (values
  ('land-sale',  '50×100ft Plot, Layibi',            'Layibi Division, Gulu City',    'gulu',     45000000,  'UGX 45,000,000',  'Negotiable',    array['50×100ft','Titled','Near Road'],            array['ti-ruler','ti-certificate','ti-road'],            'Prime plot in Layibi Division, Gulu City. Title deed ready. Near tarmac road.',                  array[]::text[], true, true),
  ('land-sale',  '1 Acre Plot, Pece Division',        'Pece, Gulu District',           'gulu',     120000000, 'UGX 120,000,000', 'Firm price',    array['1 Acre','Mailo Title','Flat land'],          array['ti-ruler','ti-certificate','ti-mountain'],        'Large flat acre in Pece Division. Mailo land title. Suitable for development.',                  array[]::text[], true, true),
  ('land-sale',  'Prime Commercial Plot, Gulu',       'Along Kampala Road, Gulu',      'gulu',     80000000,  'UGX 80,000,000',  'Negotiable',    array['60×100ft','Freehold','Commercial zone'],     array['ti-ruler','ti-certificate','ti-building-store'],  'Commercial plot along Kampala Road, Gulu. High visibility. Freehold title.',                     array[]::text[], true, true),
  ('land-sale',  '2-Acre Plot, Mbarara',              'Kakoba Division, Mbarara',      'mbarara',  180000000, 'UGX 180,000,000', 'Negotiable',    array['2 Acres','Mailo Title','Near highway'],      array['ti-ruler','ti-certificate','ti-road'],            'Large 2-acre plot in Mbarara City near the main highway. Ideal for commercial use.',             array[]::text[], true, false),
  ('land-sale',  'Residential Plot, Kireka',          'Kireka, Wakiso District',       'wakiso',   95000000,  'UGX 95,000,000',  'Firm price',    array['50×100ft','Freehold','Tarmac access'],       array['ti-ruler','ti-certificate','ti-road'],            'Well-located plot in Kireka with tarmac road access. Freehold title.',                          array[]::text[], true, false),
  ('land-sale',  'Plot for Sale, Jinja City',         'Walukuba, Jinja',               'jinja',    60000000,  'UGX 60,000,000',  'Negotiable',    array['50×100ft','Titled','Near lake'],             array['ti-ruler','ti-certificate','ti-ripple'],          'Plot near the Nile in Jinja City. Suitable for residential or hospitality use.',                array[]::text[], true, false),
  ('house-rent', '3-Bedroom House, Gulu',             'Laroo Division, Gulu City',     'gulu',     500000,    'UGX 500,000',     'per month',     array['3 Bedrooms','Borehole water','Parking'],     array['ti-bed','ti-droplet','ti-car'],                   'Spacious 3-bedroom house with borehole water and ample parking in Gulu.',                       array[]::text[], true, true),
  ('house-rent', 'Self-Contained Room, Kampala',      'Ntinda, Kampala',               'kampala',  250000,    'UGX 250,000',     'per month',     array['Self-contained','Water & power','Secure'],   array['ti-home','ti-bolt','ti-lock'],                    'Modern self-contained single room in Ntinda, Kampala. Security guard on site.',                 array[]::text[], true, true),
  ('house-rent', '2-Bedroom Apartment, Mbarara',      'Rutooma, Mbarara',              'mbarara',  450000,    'UGX 450,000',     'per month',     array['2 Bedrooms','Tiled floors','Secure compound'], array['ti-bed','ti-square','ti-lock'],                 'Modern 2-bedroom apartment in Mbarara City. Tiled floors and secure compound.',                 array[]::text[], true, true),
  ('house-rent', '4-Bedroom House, Entebbe',          'Entebbe Municipality',          'entebbe',  1200000,   'UGX 1,200,000',   'per month',     array['4 Bedrooms','2 Bathrooms','Lake view'],      array['ti-bed','ti-bath','ti-ripple'],                   'Spacious 4-bedroom house near Entebbe airport with partial lake view.',                         array[]::text[], true, false),
  ('house-rent', 'Studio Apartment, Jinja',           'Jinja City Centre',             'jinja',    200000,    'UGX 200,000',     'per month',     array['Studio','Furnished','24hr power'],           array['ti-home','ti-sofa','ti-bolt'],                    'Cosy furnished studio apartment in Jinja. 24-hour electricity supply.',                         array[]::text[], true, false),
  ('house-rent', '3-Bedroom Bungalow, Mbale',         'Industrial Division, Mbale',    'mbale',    380000,    'UGX 380,000',     'per month',     array['3 Bedrooms','Solar backup','Compound'],      array['ti-bed','ti-solar-panel','ti-fence'],             'Modern bungalow with solar backup in Mbale City. Quiet compound.',                              array[]::text[], true, false),
  ('house-sale', '3-Bedroom House for Sale, Gulu',    'Pece Division, Gulu City',      'gulu',     95000000,  'UGX 95,000,000',  'Negotiable',    array['3 Bedrooms','2 Bathrooms','Titled'],         array['ti-bed','ti-bath','ti-certificate'],              'Well-built 3-bedroom house on a titled plot in Pece Division. Ready to move in.',               array[]::text[], true, true),
  ('land-rent',  '1-Acre Farm Land, Lira',            'Ojwina Division, Lira City',    'lira',     150000,    'UGX 150,000',     'per month',     array['1 Acre','Fertile soil','Water access'],      array['ti-ruler','ti-plant','ti-droplet'],               'Fertile farmland available for monthly lease in Lira. Suitable for agriculture.',               array[]::text[], true, true)
) as seed_data(type, title, location, location_key, price, price_label, price_note, features, feature_icons, description, photos, available, featured)
where not exists (select 1 from public.kp_listings limit 1);

-- ─────────────────────────────────────────────
-- 8. TEAM TABLE — admin-editable "About" page team members, with photos
-- ─────────────────────────────────────────────
create table if not exists public.kp_team (
  id          bigint generated always as identity primary key,
  name        text not null,
  role        text not null default '',
  bio         text not null default '',
  photo_url   text,                      -- null = falls back to initials avatar
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists kp_team_set_updated_at on public.kp_team;
create trigger kp_team_set_updated_at
  before update on public.kp_team
  for each row execute function public.kp_set_updated_at();

alter table public.kp_team enable row level security;

-- Public can view team members (the About page needs this)
drop policy if exists "Public can view team" on public.kp_team;
create policy "Public can view team"
  on public.kp_team
  for select
  to anon, authenticated
  using (true);

-- Only authenticated admin can insert/update/delete team members
drop policy if exists "Authenticated can insert team" on public.kp_team;
create policy "Authenticated can insert team"
  on public.kp_team for insert to authenticated with check (true);

drop policy if exists "Authenticated can update team" on public.kp_team;
create policy "Authenticated can update team"
  on public.kp_team for update to authenticated using (true) with check (true);

drop policy if exists "Authenticated can delete team" on public.kp_team;
create policy "Authenticated can delete team"
  on public.kp_team for delete to authenticated using (true);

-- Team photos share the same kp-photos storage bucket created earlier,
-- under a "team/" folder — the existing storage policies already cover
-- public view + authenticated upload/delete for the whole bucket, so no
-- additional storage policy is needed here.

alter publication supabase_realtime add table public.kp_team;

create index if not exists idx_kp_team_sort on public.kp_team (sort_order);

-- Seed the 4 original team members (photo_url left null — falls back to
-- their initials avatar exactly as the site showed before; admin can add
-- real photos any time from the admin panel without affecting anything
-- else on the page).
insert into public.kp_team (name, role, bio, sort_order)
select * from (values
  ('Ronald Okello', 'Founder & CEO',              'Over 10 years in Uganda''s property market. Ronald personally oversees every major land deal and client relationship.', 1),
  ('Acen Grace',     'Head of Rentals',            'Grace manages all rental listings, tenant relations, and lease agreements across our growing portfolio nationwide.', 2),
  ('Ojok Brian',     'Land Verification Officer',  'Brian coordinates with Lands Registry offices across Uganda to verify title documents before any listing goes live.', 3),
  ('Atim Norah',     'Client Relations',           'Norah is your first point of contact — handling enquiries, scheduling site visits, and following up on every lead.', 4)
) as seed_team(name, role, bio, sort_order)
where not exists (select 1 from public.kp_team limit 1);

-- ═══════════════════════════════════════════════════════════════════════════
-- DONE. Your 14 starter listings and 4 team members are now live
-- immediately — any visitor with the link can see them right away, with
-- no admin login required.
--
-- Next steps (see the setup guide):
--   1. Go to Authentication → Users → Add User to create your admin login.
--   2. Go to Project Settings → API to copy your URL + anon key into supabase.js.
--   3. Sign in to the admin panel to add, edit, or remove listings and team
--      members — every change is visible to the public immediately, same
--      as the starter set.
-- ═══════════════════════════════════════════════════════════════════════════
