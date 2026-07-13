/* ═══════════════════════════════════════════════════════════════════════════
   Ker Properties — netlify/functions/keep-alive.js
   Scheduled function that pings the Supabase database on a regular cadence.

   WHY THIS EXISTS:
   Supabase's Free tier automatically PAUSES a project after 7 consecutive
   days with zero API activity ("automatic pausing"). Once paused, every
   page on the site that reads listings, sends messages, or logs in stops
   working until someone manually un-pauses the project from the Supabase
   dashboard.

   This function runs on a schedule (see netlify.toml) and makes one
   cheap, read-only request to Supabase — enough to count as activity
   and reset the 7-day inactivity clock, without needing any visitor to
   show up on the site in that window.

   ENVIRONMENT VARIABLES (already set for admin-users.js — reused here):
     SUPABASE_URL              — your project URL
     SUPABASE_SERVICE_ROLE_KEY — from Supabase → Project Settings → API
       (service_role is used only because it's already configured; a
       read-only query like this works equally well with the anon key
       if you'd rather set SUPABASE_ANON_KEY instead — see fallback below)

   NOTE: This does NOT fix Netlify's own free-tier limits (build minutes /
   bandwidth), which are a separate, unrelated cause of a site going down.
   If the pause notice came from Netlify rather than Supabase, this
   function won't help — check Netlify → Site → Overview for the
   specific limit that was hit.
   ═══════════════════════════════════════════════════════════════════════════ */

const { createClient } = require("@supabase/supabase-js");

exports.handler = async () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  /* Prefer the service role key since it's already configured for
     admin-users.js, but fall back to an anon key if that's what's set —
     either is sufficient since this only ever performs a read. */
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !key) {
    console.error("[KP] keep-alive: missing SUPABASE_URL or a Supabase key env var — skipping ping.");
    /* Return 200 regardless — a misconfigured keep-alive should not show
       up as a failed deploy/function in Netlify's dashboard; the error
       is already visible in the function logs for whoever set this up. */
    return { statusCode: 200, body: "skipped: missing env vars" };
  }

  try {
    const client = createClient(supabaseUrl, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    /* Cheapest possible real query: ask for a row count, fetch no rows. */
    const { error, count } = await client
      .from("kp_listings")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    console.log(`[KP] keep-alive ping ok — kp_listings count: ${count ?? "unknown"}`);
    return { statusCode: 200, body: "ok" };
  } catch (err) {
    console.error("[KP] keep-alive ping failed:", err.message || err);
    /* Still return 200: a transient ping failure isn't worth Netlify
       surfacing as a broken deploy. The log line above is what matters. */
    return { statusCode: 200, body: "ping failed, see logs" };
  }
};
