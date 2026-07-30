/* ═══════════════════════════════════════════════════════════════════════════
   Ker Properties — supabase.js
   Supabase backend layer: auth, listings, messages, cart, reviews.
   Replace ALL localStorage credential storage with Supabase Auth.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Config: Replace these with your actual Supabase project values ──
   IMPORTANT: SUPABASE_URL must be ONLY the bare project URL, e.g.
     https://abcdefghijk.supabase.co
   Do NOT copy this from the "API docs" / "Table Editor" panel, which shows
   full endpoint URLs like https://xxxx.supabase.co/rest/v1/ — that is the
   REST endpoint, not the project URL, and will break every request with
   errors like "Invalid path specified in request URL".
   Get the correct value from: Project Settings → API → Project URL. */
const SUPABASE_URL  = _kpSanitizeSupabaseUrl(window.KP_SUPABASE_URL || "https://tqivukzzvyjrjfytgddo.supabase.co");
const SUPABASE_ANON = window.KP_SUPABASE_ANON || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaXZ1a3p6dnlqcmpmeXRnZGRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MDU1MzQsImV4cCI6MjEwMDk4MTUzNH0.zmsRUDmWl4wk1UdIl8_HnJfHn2r5d6LjQG5aJDRqOao";

/**
 * Strips any trailing slash and any accidentally-pasted API path
 * (/rest/v1, /auth/v1, /storage/v1, etc.) off a Supabase URL, so a common
 * copy-paste mistake doesn't silently break every request.
 */
function _kpSanitizeSupabaseUrl(url) {
  if (!url) return url;
  let cleaned = url.trim();
  /* Strip known Supabase API sub-paths if someone pasted the full endpoint */
  cleaned = cleaned.replace(/\/(rest|auth|storage|realtime|functions)\/v\d+\/?.*$/i, "");
  /* Strip any remaining trailing slash(es) */
  cleaned = cleaned.replace(/\/+$/, "");
  if (cleaned !== url.trim()) {
    console.warn(
      "[KP] SUPABASE_URL looked malformed (likely copied from the API docs " +
      "panel instead of Project Settings → API → Project URL). " +
      "Auto-corrected:\n  from: " + url + "\n  to:   " + cleaned
    );
  }
  return cleaned;
}

/* Warm up the connection to Supabase as early as possible (DNS lookup +
   TLS handshake happen ahead of time), so the first real API call doesn't
   pay that cost on top of the request itself. Saves roughly 100-300ms on
   the first listings fetch, especially on mobile networks. */
(function preconnectSupabase() {
  try {
    const link = document.createElement("link");
    link.rel  = "preconnect";
    link.href = SUPABASE_URL;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  } catch (e) { /* non-critical */ }
})();

/* ── Supabase JS client (loaded via CDN in each HTML file) ── */
let _sb = null;
function getSupabase() {
  if (_sb) return _sb;
  if (typeof supabase === "undefined" || !supabase.createClient) {
    console.error("[KP] Supabase JS library not loaded.");
    return null;
  }
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: {
      persistSession:        true,
      autoRefreshToken:      true,
      detectSessionInUrl:    true,
      storageKey:            "kp_auth_session",
      /* Use sessionStorage instead of the default localStorage so the admin
         session never silently survives a closed tab, a new tab, or being
         "remembered" longer than the requester wants. Combined with the
         explicit logout-on-navigate/refresh logic in main.js, this means
         the admin session is genuinely scoped to "this one active page
         view" rather than persisting in the background. */
      storage: window.sessionStorage,
    }
  });
  return _sb;
}

/* ════════════════════════════════════════
   AUTH HELPERS
   ════════════════════════════════════════ */

/**
 * Sign in admin with email + password via Supabase Auth.
 * Returns { session, error }
 */
async function kpSignIn(email, password) {
  const sb = getSupabase();
  if (!sb) return { session: null, error: "Supabase not initialised" };
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { session: data?.session || null, error: error?.message || null };
}

/**
 * Sign out the current user.
 */
async function kpSignOut() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.auth.signOut();
}

/**
 * Get the current Supabase session (null if not signed in).
 */
async function kpGetSession() {
  const sb = getSupabase();
  if (!sb) return null;
  const { data } = await sb.auth.getSession();
  return data?.session || null;
}

/**
 * Returns the current user or null.
 */
async function kpGetUser() {
  const session = await kpGetSession();
  return session?.user || null;
}

/**
 * Guard admin pages — redirect to login if no active session.
 * Call at the top of admin.html <script>.
 */
async function kpRequireAdmin() {
  const session = await kpGetSession();
  if (!session) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

/**
 * Get the current admin's role: 'main' or 'admin'.
 * Reads the admin's OWN row from admin_roles (RLS allows this — see
 * supabase-admin-roles-setup.sql). Defaults to the least-privileged
 * 'admin' role if no row exists yet (e.g. the one-time bootstrap SQL
 * hasn't been run), the table/migration isn't set up, or the query is
 * slow/stuck for any reason — a 5-second hard timeout guarantees this
 * function always resolves, so it can never hang the dashboard on login.
 */
async function kpGetMyRole() {
  const sb = getSupabase();
  if (!sb) return "admin";
  const user = await kpGetUser();
  if (!user) return "admin";

  const query = sb
    .from("admin_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  const timeout = new Promise(resolve => setTimeout(() => resolve({ timedOut: true }), 5000));

  const result = await Promise.race([query, timeout]);

  if (result.timedOut) {
    console.warn("[KP] Role lookup timed out — defaulting to the regular Admin view. " +
      "If you're the Main Admin and see this, check that supabase-admin-roles-setup.sql " +
      "ran successfully and your account has a row in admin_roles.");
    return "admin";
  }

  const { data, error } = result;
  if (error || !data) return "admin";
  return data.role === "main" ? "main" : "admin";
}

/**
 * Send password reset email via Supabase Auth.
 */
async function kpSendPasswordReset(email) {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase not initialised" };
  const redirectTo = window.location.origin + "/login.html";
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
  return { error: error?.message || null };
}

/**
 * Update authenticated user's password (after reset link or when logged in).
 */
async function kpUpdatePassword(newPassword) {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase not initialised" };
  const { error } = await sb.auth.updateUser({ password: newPassword });
  return { error: error?.message || null };
}

/* ════════════════════════════════════════
   LISTINGS (kp_listings table)
   ════════════════════════════════════════ */

/** Fetch all listings (public read). Returns [] if the table is empty
    (not an error) — callers decide what to do with an empty result. */
async function kpGetListings() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("kp_listings")
    .select("*")
    .order("id", { ascending: true });
  if (error) {
    console.warn("[KP] getListings error:", error.message);
    return [];
  }
  return data || [];
}

/**
 * Returns true if the kp_listings table has zero rows.
 * Used to decide whether to auto-seed starter listings on first run.
 */
async function kpListingsTableIsEmpty() {
  const sb = getSupabase();
  if (!sb) return false;
  const { count, error } = await sb
    .from("kp_listings")
    .select("*", { count: "exact", head: true });
  if (error) {
    console.warn("[KP] kpListingsTableIsEmpty check failed:", error.message);
    return false; /* fail safe — don't seed if we can't confirm it's actually empty */
  }
  return (count || 0) === 0;
}

/** Get a single listing by id */
async function kpGetListing(id) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from("kp_listings")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data;
}

/** Insert a new listing (admin only — RLS enforced) */
async function kpAddListing(listing) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: "Supabase not initialised" };
  const { data, error } = await sb
    .from("kp_listings")
    .insert([listing])
    .select()
    .single();
  return { data, error: error?.message || null };
}

/** Update an existing listing (admin only) */
async function kpUpdateListing(id, updates) {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase not initialised" };
  const { error } = await sb
    .from("kp_listings")
    .update(updates)
    .eq("id", id);
  return { error: error?.message || null };
}

/** Delete a listing (admin only) */
async function kpDeleteListing(id) {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase not initialised" };
  const { error } = await sb
    .from("kp_listings")
    .delete()
    .eq("id", id);
  return { error: error?.message || null };
}

/** Delete ALL listings (admin only — danger zone) */
async function kpDeleteAllListings() {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase not initialised" };
  /* Delete rows where id > 0 (all rows) */
  const { error } = await sb
    .from("kp_listings")
    .delete()
    .gt("id", 0);
  return { error: error?.message || null };
}

/** Seed listings into Supabase. Pass an array of listing objects (snake_case or camelCase — table accepts both via normalisation upstream). */
async function kpSeedDefaultListings(listings) {
  const sb = getSupabase();
  if (!sb || !listings || listings.length === 0) return;
  /* Strip any client-side numeric id so Supabase auto-assigns identity ids */
  const toInsert = listings.map(({ id, locationKey, priceLabel, priceNote, featureIcons, ...rest }) => ({
    ...rest,
    location_key:  locationKey  || rest.location_key  || "",
    price_label:   priceLabel   || rest.price_label   || "",
    price_note:    priceNote    || rest.price_note     || "",
    feature_icons: featureIcons || rest.feature_icons || [],
  }));
  const { error } = await sb.from("kp_listings").insert(toInsert);
  if (error) throw new Error(error.message);
}

/* ════════════════════════════════════════
   PHOTO UPLOAD (Supabase Storage)
   ════════════════════════════════════════ */

/**
 * Upload a photo File/Blob to Supabase Storage.
 * Returns public URL or null on error.
 */
async function kpUploadPhoto(file, folder) {
  const sb = getSupabase();
  if (!sb) return null;
  const ext    = file.name ? file.name.split(".").pop().toLowerCase() : "jpg";
  const name   = `${folder || "listings"}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { data, error } = await sb.storage
    .from("kp-photos")
    .upload(name, file, { cacheControl: "3600", upsert: false });
  if (error) { console.warn("[KP] Upload error:", error.message); return null; }
  const { data: urlData } = sb.storage.from("kp-photos").getPublicUrl(data.path);
  return urlData?.publicUrl || null;
}

/**
 * Upload a base64 data-URL as a photo and return the public storage URL.
 * Used when photos come from FileReader (add/edit listing forms).
 */
async function kpUploadBase64Photo(dataUrl, folder) {
  const [header, b64] = dataUrl.split(",");
  const mime  = (header.match(/:(.*?);/) || [])[1] || "image/jpeg";
  const ext   = mime.split("/")[1] || "jpg";
  const bytes = atob(b64);
  const arr   = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  const blob = new Blob([arr], { type: mime });
  const file = new File([blob], `photo.${ext}`, { type: mime });
  return kpUploadPhoto(file, folder);
}

/* ════════════════════════════════════════
   TEAM (kp_team table)
   ════════════════════════════════════════ */

/**
 * Translates the raw PostgREST "schema cache" error into a clear, actionable
 * message. This error means the kp_team table doesn't exist yet in the
 * Supabase project (run fix_kp_team.sql in the SQL Editor to fix it).
 */
function _kpTeamError(error) {
  if (!error) return null;
  const msg = error.message || String(error);
  if (
    error.code === "PGRST205" ||
    /schema cache/i.test(msg) ||
    /kp_team/i.test(msg)
  ) {
    return (
      "The 'kp_team' table does not exist in your Supabase database. " +
      "Go to Supabase Dashboard → SQL Editor, open fix_kp_team.sql " +
      "(included in this project), and run it. Then try again."
    );
  }
  return msg;
}

/** Fetch all team members (public read), ordered for display */
async function kpGetTeam() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("kp_team")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) { console.warn("[KP] getTeam error:", _kpTeamError(error)); return []; }
  return data || [];
}

/** Add a new team member (admin only) */
async function kpAddTeamMember(member) {
  const sb = getSupabase();
  if (!sb) return { data: null, error: "Supabase not initialised" };
  const { data, error } = await sb.from("kp_team").insert([member]).select().single();
  return { data, error: _kpTeamError(error) };
}

/** Update a team member's details and/or photo (admin only) */
async function kpUpdateTeamMember(id, updates) {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase not initialised" };
  const { error } = await sb.from("kp_team").update(updates).eq("id", id);
  return { error: _kpTeamError(error) };
}

/** Delete a team member (admin only) */
async function kpDeleteTeamMember(id) {
  const sb = getSupabase();
  if (!sb) return { error: "Supabase not initialised" };
  const { error } = await sb.from("kp_team").delete().eq("id", id);
  return { error: _kpTeamError(error) };
}

/* ════════════════════════════════════════
   MESSAGES (kp_messages table)
   ════════════════════════════════════════ */

/** Save a message (contact / enquiry / review) — public insert */
async function kpSaveMessage(data) {
  const sb = getSupabase();
  const category = _normaliseCategory(data.type);
  const msg = {
    ...data,
    category,
    unread:     true,
    created_at: new Date().toISOString(),
    time:       new Date().toLocaleString("en-UG"),
  };
  if (!sb) return { error: "Supabase not initialised" };
  const { error } = await sb.from("kp_messages").insert([msg]);
  return { error: error?.message || null };
}

/** Fetch all messages (admin only) */
async function kpGetMessages() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("kp_messages")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) { console.warn("[KP] getMessages:", error.message); return []; }
  return data || [];
}

/** Mark a single message as read (admin only) */
async function kpMarkOneRead(id) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("kp_messages").update({ unread: false }).eq("id", id);
}

/** Mark all messages as read (admin only) */
async function kpMarkAllRead() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("kp_messages").update({ unread: false }).eq("unread", true);
}

/** Delete a single message (admin only) */
async function kpDeleteMessage(id) {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("kp_messages").delete().eq("id", id);
}

/** Delete all messages (admin only) */
async function kpDeleteAllMessages() {
  const sb = getSupabase();
  if (!sb) return;
  await sb.from("kp_messages").delete().gt("id", 0);
}

/* ════════════════════════════════════════
   CART  (localStorage — per-user device)
   Cart is intentionally kept in localStorage because:
   • It is per-browser/session state — not global admin data
   • No PII is stored (just listing IDs + titles)
   • A Supabase row per cart item would be overkill for enquiries
   ════════════════════════════════════════ */

function kpGetCart() {
  try { return JSON.parse(localStorage.getItem("kp_cart")) || []; } catch { return []; }
}
function kpSaveCart(cart) {
  try { localStorage.setItem("kp_cart", JSON.stringify(cart)); } catch(e) {}
  updateCartBadge();
}

/* ════════════════════════════════════════
   REALTIME SUBSCRIPTIONS
   ════════════════════════════════════════ */

/**
 * Subscribe to real-time listing changes.
 * callback(payload) is called on INSERT / UPDATE / DELETE.
 */
function kpSubscribeListings(callback) {
  const sb = getSupabase();
  if (!sb) return null;
  return sb
    .channel("kp_listings_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "kp_listings" }, callback)
    .subscribe();
}

/**
 * Subscribe to new messages (admin inbox live updates).
 */
function kpSubscribeMessages(callback) {
  const sb = getSupabase();
  if (!sb) return null;
  return sb
    .channel("kp_messages_changes")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "kp_messages" }, callback)
    .subscribe();
}

/* ════════════════════════════════════════
   UTILITY
   ════════════════════════════════════════ */

function _normaliseCategory(type) {
  if (type === "reviews" || type === "review") return "reviews";
  if (type === "property-enquiry" || type === "enquiry") return "enquiry";
  return "contact";
}

/* Expose everything globally so HTML inline handlers and main.js can use them */
window.kpSignIn              = kpSignIn;
window.kpSignOut             = kpSignOut;
window.kpGetSession          = kpGetSession;
window.kpGetUser             = kpGetUser;
window.kpRequireAdmin        = kpRequireAdmin;
window.kpGetMyRole           = kpGetMyRole;
window.kpSendPasswordReset   = kpSendPasswordReset;
window.kpUpdatePassword      = kpUpdatePassword;
window.kpGetListings         = kpGetListings;
window.kpListingsTableIsEmpty = kpListingsTableIsEmpty;
window.kpGetListing          = kpGetListing;
window.kpAddListing          = kpAddListing;
window.kpUpdateListing       = kpUpdateListing;
window.kpDeleteListing       = kpDeleteListing;
window.kpDeleteAllListings   = kpDeleteAllListings;
window.kpSeedDefaultListings = kpSeedDefaultListings;
window.kpUploadPhoto         = kpUploadPhoto;
window.kpUploadBase64Photo   = kpUploadBase64Photo;
window.kpGetTeam              = kpGetTeam;
window.kpAddTeamMember        = kpAddTeamMember;
window.kpUpdateTeamMember     = kpUpdateTeamMember;
window.kpDeleteTeamMember     = kpDeleteTeamMember;
window.kpSaveMessage         = kpSaveMessage;
window.kpGetMessages         = kpGetMessages;
window.kpMarkOneRead         = kpMarkOneRead;
window.kpMarkAllRead         = kpMarkAllRead;
window.kpDeleteMessage       = kpDeleteMessage;
window.kpDeleteAllMessages   = kpDeleteAllMessages;
window.kpGetCart             = kpGetCart;
window.kpSaveCart            = kpSaveCart;
window.kpSubscribeListings   = kpSubscribeListings;
window.kpSubscribeMessages   = kpSubscribeMessages;
