/* ═══════════════════════════════════════════════════════════════════════════
   Ker Properties — netlify/functions/admin-users.js
   Serverless function for admin user management.

   WHY THIS EXISTS:
   Creating, deleting, and listing Supabase Auth users requires the
   service_role key, which bypasses ALL Row Level Security. That key must
   NEVER appear in frontend code (HTML/JS). This function runs on Netlify's
   servers, keeps the key in a private environment variable, verifies the
   caller is a legitimate signed-in admin before doing anything, and only
   then calls the Supabase Auth admin API.

   ENVIRONMENT VARIABLES (set in Netlify → Site → Environment Variables):
     SUPABASE_URL              — your project URL (same as in supabase.js)
     SUPABASE_SERVICE_ROLE_KEY — from Supabase → Project Settings → API
     SITE_URL                  — your live site URL e.g. https://kerproperties.netlify.app

   ACTIONS (POST body: { action, ...params }):
     list            — list all admin users
     create          — create new admin  { email, password }
     delete          — delete an admin   { userId }
     reset-password  — send reset email  { email }
   ═══════════════════════════════════════════════════════════════════════════ */

const { createClient } = require("@supabase/supabase-js");

const ALLOWED_ORIGIN = process.env.SITE_URL || "";

exports.handler = async (event) => {
  /* ── CORS headers ── */
  const headers = {
    "Access-Control-Allow-Origin":  ALLOWED_ORIGIN || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  /* ── Validate env vars are configured ── */
  const supabaseUrl        = process.env.SUPABASE_URL;
  const serviceRoleKey     = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("[KP] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Server not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Netlify environment variables."
      })
    };
  }

  /* ── Verify the caller is a signed-in admin ── */
  const authHeader = event.headers["authorization"] || event.headers["Authorization"] || "";
  const token      = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized: no token" }) };
  }

  /* Use a regular anon client just to validate the JWT — this doesn't
     give it any special powers; it only checks the token is legitimate. */
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: { user: callerUser }, error: authErr } = await adminClient.auth.getUser(token);
  if (authErr || !callerUser) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: "Unauthorized: invalid session" }) };
  }

  /* ── Verify the caller is a MAIN admin ──
     Every action this function performs (listing/creating/deleting admin
     accounts, resetting another admin's password) is a Main-Admin-only
     privilege. We look this up with the service_role client, which
     bypasses RLS entirely, so a regular Admin has no way to spoof this
     check from the browser. */
  const { data: callerRoleRow } = await adminClient
    .from("admin_roles")
    .select("role")
    .eq("user_id", callerUser.id)
    .maybeSingle();
  const isMainAdmin = callerRoleRow?.role === "main";
  if (!isMainAdmin) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: "Only the Main Admin can manage admin accounts." })
    };
  }

  /* ── Parse request body ── */
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: "Invalid JSON body" }) };
  }

  const { action } = body;

  try {

    /* ── LIST all admin users ── */
    if (action === "list") {
      const { data, error } = await adminClient.auth.admin.listUsers();
      if (error) throw error;
      const { data: roleRows } = await adminClient.from("admin_roles").select("user_id, role");
      const roleByUserId = new Map((roleRows || []).map(r => [r.user_id, r.role]));
      /* Return only safe fields — never expose hashed passwords or tokens */
      const users = (data.users || []).map(u => ({
        id:         u.id,
        email:      u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        isSelf:     u.id === callerUser.id,
        role:       roleByUserId.get(u.id) || "admin",
      }));
      return { statusCode: 200, headers, body: JSON.stringify({ users }) };
    }

    /* ── CREATE a new admin user ── */
    if (action === "create") {
      const { email, password } = body;
      if (!email || !password) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email and password are required" }) };
      }
      if (password.length < 8) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Password must be at least 8 characters" }) };
      }
      const { data, error } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, /* skip confirmation email — direct admin creation */
      });
      if (error) throw error;

      /* Every admin created this way starts as a regular ("admin") role —
         never "main". Promoting to Main Admin is intentionally not exposed
         anywhere in the UI; it can only be done via SQL in Supabase, so
         there is never more than one Main Admin by accident. */
      const { error: roleError } = await adminClient
        .from("admin_roles")
        .insert([{ user_id: data.user.id, role: "admin" }]);
      if (roleError) {
        /* Roll back the auth user so we don't end up with an admin account
           that has no role row (which kpGetMyRole would still treat safely
           as "admin", but better to fail cleanly than leave a half-created
           account). */
        await adminClient.auth.admin.deleteUser(data.user.id);
        throw roleError;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          user: { id: data.user.id, email: data.user.email, created_at: data.user.created_at }
        })
      };
    }

    /* ── DELETE an admin user ── */
    if (action === "delete") {
      const { userId } = body;
      if (!userId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "userId is required" }) };
      }
      /* Safety: prevent an admin from deleting their own account */
      if (userId === callerUser.id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "You cannot delete your own account" }) };
      }
      /* Safety: never allow the Main Admin account to be deleted this way */
      const { data: targetRoleRow } = await adminClient
        .from("admin_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();
      if (targetRoleRow?.role === "main") {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "The Main Admin account cannot be removed here." }) };
      }
      /* Deleting the auth user cascades to remove their admin_roles row too
         (see "on delete cascade" in supabase-admin-roles-setup.sql). */
      const { error } = await adminClient.auth.admin.deleteUser(userId);
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    /* ── RESET PASSWORD — send reset email ── */
    if (action === "reset-password") {
      const { email } = body;
      if (!email) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: "Email is required" }) };
      }
      const redirectTo = (process.env.SITE_URL || "") + "/login.html";
      const { error } = await adminClient.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: "Unknown action: " + action }) };

  } catch (err) {
    console.error("[KP] admin-users function error:", err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || "Internal server error" }) };
  }
};
