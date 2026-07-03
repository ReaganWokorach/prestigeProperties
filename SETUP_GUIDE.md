# Ker Properties — Supabase Migration & Security Setup Guide

This guide walks you through connecting your site to Supabase so that
listings, messages, and admin login work identically and stay in sync
no matter which device or browser you use anywhere in the world.

---

## What changed, in plain terms

**Before:** Everything — listings, messages, and even the admin
password — was stored in `localStorage` in one browser. Open the site
on a different phone and it looked empty or out of date. The admin
password (`admin` / `Ker@2026`) was hardcoded in plain text inside
`main.js`, visible to anyone who opened your site's source code.

**Now:** Listings and messages live in a real Postgres database
(Supabase). The admin login uses Supabase Auth — a proper
authentication system used by thousands of production apps — so there
is no password anywhere in your code. Every device that loads the
site reads from the same database, so what you see in Kampala is
exactly what your manager sees in Gulu, in real time.

Nothing about how the site **looks** or **behaves** for visitors has
changed — same listings cards, same cart, same modals, same forms,
same images, same logo. Only the data layer underneath was replaced.

---

## Part 1 — Create your Supabase project

1. Go to **supabase.com** and sign up (free tier is enough to start).
2. Click **New Project**. Choose a strong database password — store
   it in a password manager, you won't need it day-to-day, but keep
   it safe.
3. Wait ~2 minutes for the project to finish provisioning.
4. Once ready, go to **Project Settings → API**. You'll need two
   values from this page in a moment:
   - **Project URL** (looks like `https://xxxxxxxx.supabase.co`)
   - **anon public key** (a long string starting with `eyJ...`)

> The anon key is safe to put in your frontend code — it is designed
> to be public. Real security comes from the Row Level Security (RLS)
> policies you'll set up next, not from hiding this key.

---

## Part 2 — Run the database schema

1. In the Supabase dashboard, go to **SQL Editor → New Query**.
2. Open `supabase_schema.sql` (included in your project folder) and
   paste its **entire contents** into the editor.
3. Click **Run**.

This single script:
- Creates the `kp_listings` and `kp_messages` tables.
- Turns on **Row Level Security** (RLS) on both tables.
- Adds policies so that:
  - Anyone can **view** listings (your public website needs this).
  - Only a **logged-in admin** can add, edit, or delete listings.
  - Anyone can **submit** a contact/enquiry/review message.
  - Only a **logged-in admin** can read, mark-read, or delete
    messages (this protects your customers' phone numbers and
    emails from being scraped by the public).
- Creates a `kp-photos` storage bucket for property images, with the
  same logic: public can view photos, only the admin can upload or
  delete them.
- Turns on **Realtime** so listings and the inbox update live across
  every open device without needing a page refresh.

If you ever need to start over, you can re-run this script safely —
it uses `if not exists` / `drop policy if exists` so it won't error
on a second run.

---

## Part 3 — Create your admin login (replacing the hardcoded password)

This is the step that fixes the security hole you flagged.

1. In Supabase, go to **Authentication → Users**.
2. Click **Add User → Create new user**.
3. Enter the email address you want to use to log in to your admin
   panel, and choose a strong password (see the password advice
   below).
4. Leave **Auto Confirm User** checked so you don't need to click an
   email confirmation link the first time.
5. Click **Create User**.

That's it — this is now your one and only admin account. There is no
password anywhere in your website's code anymore. Supabase stores it
hashed and salted, the same way banks store passwords, and verifies
every login attempt server-side.

**To add a second admin (e.g. a manager)** later, repeat this step
with their email. Every admin who logs in sees and edits the exact
same shared listings and inbox.

---

## Part 4 — Connect your website to your project

1. Open `supabase.js` in your project folder.
2. Find these two lines near the top:
   ```js
   const SUPABASE_URL  = window.KP_SUPABASE_URL  || "https://YOUR_PROJECT_ID.supabase.co";
   const SUPABASE_ANON = window.KP_SUPABASE_ANON || "YOUR_ANON_KEY_HERE";
   ```
3. Replace `YOUR_PROJECT_ID` and `YOUR_ANON_KEY_HERE` with the values
   you copied in Part 1.
4. Save the file.

That's the only code change needed to point your whole site at your
database — every HTML page already loads `supabase.js` before
`main.js`.

---

## Part 5 — Deploy to Netlify

1. In your Netlify dashboard, either drag-and-drop the whole project
   folder onto the deploy area, or connect it to a Git repository if
   you'd prefer continuous deployment.
2. Netlify will pick up `netlify.toml` automatically — this sets
   useful security headers (like blocking your site from being
   embedded in another site's iframe, and telling search engines not
   to index your admin/login pages).
3. Once deployed, visit `your-site.netlify.app/login.html` and sign
   in with the email/password you created in Part 3.

Your Netlify Forms (contact form, enquiry form, review form) keep
working exactly as before — form submissions still also email you via
Netlify's built-in notification system, on top of being saved to
Supabase for the admin inbox.

---

## Part 6 — Your starter listings are already live

Good news — there's nothing to do here. The schema script you ran in
**Part 2** already inserted your original 14 properties (same titles,
prices, locations, and descriptions you had before) directly into
Supabase, the moment you ran it. There's no gap where the site shows
"no listings" — anyone who opens your link sees your full property
list immediately, with no admin login required first.

From here, every listing you add, edit, or delete through the admin
panel syncs live to every visitor and every admin device, the same
way.

> **If you ever need to re-seed manually** (for example, if you
> deleted all listings by mistake and want the originals back), you
> can still do this anytime from **Settings tab → Data Sync → Seed
> Starter Listings** in the admin panel.

---

## Who can see what — public visitors vs. admin

This is worth being precise about, since it's the core of the
security model.

**Anyone with your site's link — no login, no account, nothing —
can:**
- Browse every property listing, including photos, prices, and
  descriptions
- Search and filter listings
- Submit a contact message, a property enquiry, or a review

**Only someone signed in as your admin can:**
- Add, edit, delete, or mark listings as featured/taken
- Read the inbox (contact messages, enquiries, reviews) — this
  protects your customers' phone numbers and emails from being
  scraped by the public
- Upload or delete property photos

This isn't enforced by hiding a link or hoping nobody finds the admin
page — it's enforced by the database itself, via Row Level Security.
Even someone who knows your Supabase project URL and inspects your
site's network requests cannot read messages or write listings
without a valid admin session; the database rejects the request
regardless of what the frontend code does or doesn't check.

---

## How global sync actually works now

| Data | Where it lives | Syncs across devices? |
|---|---|---|
| Property listings | Supabase `kp_listings` table | ✅ Yes — instantly, via Realtime |
| Contact/enquiry/review messages | Supabase `kp_messages` table | ✅ Yes — instantly, via Realtime |
| Property photos | Supabase Storage (`kp-photos` bucket) | ✅ Yes — public CDN URLs |
| Admin login credentials | Supabase Auth | ✅ Yes — sign in from anywhere |
| Visitor's enquiry cart (heart/save button) | Browser `localStorage` | ❌ No — intentionally local |

The cart is the one piece that **stays** on each browser. This is
deliberate: it's just a temporary "things I'm interested in" list for
a single visitor before they submit an enquiry. There's no reason for
your customer's cart on their phone to follow them to their laptop,
and keeping it local means one less thing touching your database for
every casual visitor.

---

## Security — what's protecting your site now, and how to go further

### "My API keys are visible on GitHub — is that a problem?"

Short answer: **the key in `supabase.js` (the "anon" or "publishable"
key) is specifically designed to be public.** Supabase's own
documentation calls it safe to expose in a web page, mobile app, or
public GitHub repository — every Supabase app built this way works
the same way, including large production apps. It is not a secret in
the way a typical API key is.

What actually matters is two things, both of which this project
already has right:

1. **Row Level Security (RLS) must be turned on for every table.**
   This is the real gatekeeper — not the key. RLS is enabled on
   `kp_listings`, `kp_messages`, and `kp_team` in
   `supabase_schema.sql`, with policies that only allow public read
   access and restrict every write to a logged-in admin. Even with
   your anon key fully public, the database itself refuses
   unauthorized inserts, updates, or deletes — this is enforced at
   the database level, not by hiding anything in the frontend.

2. **The `service_role` (secret) key must never appear anywhere in
   your code.** This is the one genuinely dangerous key — it bypasses
   RLS entirely and gives full read/write access to everything. This
   project never uses it; only the public anon key appears in
   `supabase.js`. Double-check your own Supabase dashboard and confirm
   you've never pasted the service_role key into any file that gets
   committed to GitHub. If you ever have, even briefly, rotate it
   immediately (Supabase dashboard → Project Settings → API → click
   "Reset" next to the service_role key) — deleting it from your code
   afterwards does nothing, since anyone who already saw it still has
   a usable copy until you rotate it.

A real-world example of what goes wrong when this isn't followed:
in early 2026, a vibe-coded app called Moltbook left 1.5 million auth
tokens and 35,000 emails exposed — not because the anon key was
public, but because RLS was never turned on. Public key + RLS on is
the standard, safe pattern; public key + RLS off is an open database.
You're in the first category.

### What's already locked down by this migration

- **No password in source code.** Anyone can view your site's HTML
  and JavaScript (this is true of every website) — there is simply
  nothing secret to find anymore.
- **Server-verified sessions.** Every admin action (add/edit/delete a
  listing, read a message) is checked against a real session token
  issued by Supabase, not a flag you could fake by editing your
  browser's storage.
- **Row Level Security on every table**, as detailed above — this is
  what actually protects your data, independent of the key being
  public.
- **Photo uploads are gated.** Only a logged-in admin can upload to
  the storage bucket; the public can only view.
- **Admin sessions are tab-scoped.** Signing in, then refreshing the
  admin page, closing the tab, or navigating to any other page
  immediately ends the session — coming back to the admin panel
  always requires logging in again. There's no "remembered" session
  sitting in the background.
- **Password resets can't be hijacked.** Supabase only ever sends a
  working reset link to an email that's already a registered admin
  account. For an unregistered email, the form shows the same generic
  "if that email is registered..." message (by design, to stop
  attackers from being able to guess which emails are valid admins),
  but nothing is actually sent and no password can be set — there is
  no path from "type any email" to "get into the dashboard."

### Steps you should take for maximum security

1. **Use a strong, unique admin password.** At least 12 characters,
   a mix of upper/lowercase, numbers, and symbols, not reused from
   any other account. A password manager (Bitwarden, 1Password) will
   generate and remember one for you.
2. **Turn on Multi-Factor Authentication (MFA) for your Supabase
   account itself** (Supabase dashboard → Account → Security). This
   protects the project settings, not just the website login.
3. **Turn on MFA for your admin website login too.** Supabase Auth
   supports TOTP (authenticator app) MFA per user. Once you have your
   admin user created, you can enroll MFA from your Supabase project
   dashboard, or ask me to add an MFA enrollment screen to
   `login.html` if you'd like that as a follow-up.
4. **Restrict who can sign up.** By default, only the users you
   create manually in the dashboard can log in (public sign-up isn't
   wired into this site at all — there is no "create account" form),
   so this is already locked down.
5. **Rotate your password periodically**, and immediately if you ever
   suspect it was seen by someone else — you can do this any time
   from the **My Account** tab in your admin panel.
6. **Never paste your service_role/secret key anywhere client-side**
   — not in `supabase.js`, not in any HTML file, not in a GitHub
   issue or commit message. This project never needs it.
7. **Review the Auth logs occasionally.** Supabase dashboard →
   Authentication → Logs shows every sign-in attempt, including
   failed ones, so you can spot anything unusual.
8. **Keep backups.** Supabase's paid tiers include automatic daily
   backups; on the free tier, periodically export your tables (Table
   Editor → kp_listings / kp_messages / kp_team → Export as CSV) as a
   manual backup.
9. **Set the redirect URL allowlist in Supabase.** Go to
   Authentication → URL Configuration and add your live site's
   `login.html` URL (e.g. `https://yoursite.netlify.app/login.html`)
   to the allowed redirect URLs. Without this, password reset links
   will fail even for a legitimate admin.

### Hosting & domain hardening checklist

This covers the broader "code, hosting, domain" tightening you asked
about, beyond what's specific to Supabase:

- **Netlify account security.** Turn on two-factor authentication for
  your Netlify account itself (Netlify → User settings → Security).
  Anyone who gets into your Netlify account can redeploy your site
  with anything they want.
- **GitHub account security.** Same idea — enable 2FA on GitHub
  (Settings → Password and authentication). This is usually the
  weakest link in a "my code is on GitHub" setup, since GitHub access
  often means deploy access too.
- **Branch protection, if you use Git-based deploys.** If Netlify
  redeploys automatically from a GitHub branch, restrict who can push
  directly to that branch and consider requiring pull request review
  before merge, even if you're the only contributor — it adds a
  pause before anything goes live.
- **Custom domain + HTTPS.** If you connect a custom domain (e.g.
  kerproperties.com) instead of the default `.netlify.app` address,
  Netlify provisions a free HTTPS certificate automatically — make
  sure "Force HTTPS" is turned on in Netlify's domain settings so
  visitors can never accidentally load the site over plain HTTP.
- **DNS account security.** Wherever you bought/manage your domain
  (registrar), turn on 2FA there too, and use a domain lock /
  transfer lock feature if your registrar offers one, so the domain
  can't be transferred away without your explicit unlock.
- **Security headers are already configured** in `netlify.toml` —
  this blocks your site from being embedded in another site's iframe
  (clickjacking protection), tells browsers not to guess content
  types, and sets a Content Security Policy restricting which domains
  scripts can load from.
- **Keep dependencies current.** This site loads the Supabase JS
  library and Tabler Icons from a CDN using `@latest`-style or pinned
  version tags — periodically check that these haven't been
  superseded by a newer major version with breaking changes, and
  update intentionally rather than always trailing far behind.
- **Don't commit `.env` files or secrets to Git**, even by accident.
  If your project ever grows to need a `.env` file (for example, if
  you add a serverless function later), add it to `.gitignore`
  immediately, before the first commit that could contain it.

### On "not even an AI should be able to compromise this"

The honest, important point here: no system is unbreakable, and
anyone who tells you otherwise is overselling. What this setup gives
you is industry-standard practice — the same authentication and
database-level access control used by real production businesses —
rather than the hardcoded plaintext password you started with, which
was the single biggest risk in the original code. The remaining risk
surface after this migration is the same as for any well-built web
app: protect your admin password, your Supabase dashboard account,
your GitHub account, and your Netlify account the way you'd protect a
bank login, and you are in good shape.

---

## Troubleshooting

**"Listings aren't showing up after I added them."**
Check the browser console for errors. The most common cause is the
`SUPABASE_URL` / `SUPABASE_ANON` values in `supabase.js` not being
filled in yet (Part 4).

**"I can't sign in."**
Confirm you used the exact email you created in Part 3 — the login
form expects an email address now, not a plain username.

**"I forgot my password."**
Use the "Forgot password?" link on the login page. Supabase will
email a secure reset link to your admin account's email address. If
nothing arrives, double-check the redirect URL allowlist is set up
(see step 9 in the security section above) and that you typed the
exact email your admin account was created with.

**"Photos aren't uploading."**
Double-check the `kp-photos` storage bucket and its policies were
created — re-run Part 4 of `supabase_schema.sql` (the storage
section) if needed.

**"I'm not getting an email when someone sends a property enquiry."**
This was a known gap, now fixed — make sure you've deployed the
latest `index.html`, `properties.html`, and `cart.html`, which each
contain a small hidden form that lets Netlify register the
property-enquiry form for email notifications (Netlify can't detect
forms that JavaScript builds at runtime on its own).

**"My admin session keeps logging me out when I refresh."**
This is intentional, not a bug — admin sessions are now scoped to a
single active page view. Refreshing, navigating to another page, or
closing the tab all end the session by design, so you'll need to sign
in again. Switching between tabs inside the admin panel itself
(Listings, Add Listing, Team, Messages, etc.) does not log you out.

---

## File reference

| File | Purpose |
|---|---|
| `supabase.js` | All Supabase connection logic — auth, listings, messages, team, photo storage, realtime |
| `main.js` | Site behavior (rendering, forms, cart, team grid) — now calls into `supabase.js` instead of `localStorage` for shared data |
| `supabase_schema.sql` | One-time database setup script — run in Supabase SQL Editor |
| `netlify.toml` | Deployment + security headers for Netlify |
| `robots.txt` | Keeps admin/login pages out of search engine indexes |

Everything else — `index.html`, `about.html`, `contact.html`,
`properties.html`, `cart.html`, `testimonies.html`, `login.html`,
`admin.html`, `style.css`, images, and your logo — is visually and
functionally identical to your original site, aside from the specific
fixes and additions covered in this guide (team photos, the brighter
save/heart icon, the corrected About page icon, and the email
notification fix).
