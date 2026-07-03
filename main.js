/* ═══════════════════════════════════════════════════════════════════════════
   Ker Properties — main.js  (Supabase Edition)
   All data (listings, messages) syncs globally via Supabase.
   Cart stays in localStorage (per-browser session data — intentional).
   Admin credentials are managed by Supabase Auth (no plaintext passwords).
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Security: escape user-supplied content before inserting into innerHTML ──
   Prevents stored XSS from contact form messages or admin-entered team data. */
function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Uganda districts for dropdowns */

/* ── Inline SVG icon helpers ──────────────────────────────────────────────
   The @tabler/icons-webfont CDN build has a known, currently-unresolved bug
   (tabler/tabler-icons issues #1415 / #1452): any "-filled" icon class such
   as "ti-heart-filled" or "ti-star-filled" renders NOTHING — the filled
   glyphs were split into a separate font file that the single CSS link
   doesn't load. That's what made the heart and the Featured star appear to
   "disappear". These inline SVGs (Tabler's own paths, MIT licensed) sidestep
   the bug entirely since they don't depend on any webfont at all. */
function heartFilledSVG(cls) {
  return `<svg class="${cls || ""}" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M6.979 3.074a6 6 0 0 1 4.988 1.425l.037 .033l.034 -.03a6 6 0 0 1 4.733 -1.44l.246 .036a6 6 0 0 1 3.364 10.008l-.18 .185l-.048 .041l-7.45 7.379a1 1 0 0 1 -1.313 .082l-.094 -.082l-7.493 -7.422a6 6 0 0 1 3.176 -10.215z"/>
  </svg>`;
}
function starFilledSVG(cls) {
  return `<svg class="${cls || ""}" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.243 7.34l-6.38 .925l-.113 .023a1 1 0 0 0 -.44 1.684l4.622 4.499l-1.09 6.355l-.013 .11a1 1 0 0 0 1.464 .944l5.706 -3l5.693 3l.1 .046a1 1 0 0 0 1.352 -1.1l-1.091 -6.355l4.624 -4.5l.078 -.085a1 1 0 0 0 -.633 -1.62l-6.38 -.926l-2.852 -5.78a1 1 0 0 0 -1.794 0l-2.853 5.78z"/>
  </svg>`;
}
const UGANDA_DISTRICTS = [
  { value: "kampala",     label: "Kampala" },
  { value: "gulu",        label: "Gulu" },
  { value: "mbarara",     label: "Mbarara" },
  { value: "jinja",       label: "Jinja" },
  { value: "lira",        label: "Lira" },
  { value: "mbale",       label: "Mbale" },
  { value: "fort-portal", label: "Fort Portal" },
  { value: "arua",        label: "Arua" },
  { value: "soroti",      label: "Soroti" },
  { value: "masaka",      label: "Masaka" },
  { value: "entebbe",     label: "Entebbe" },
  { value: "wakiso",      label: "Wakiso" },
  { value: "mukono",      label: "Mukono" },
  { value: "kasese",      label: "Kasese" },
  { value: "hoima",       label: "Hoima" },
  { value: "kabale",      label: "Kabale" },
  { value: "tororo",      label: "Tororo" },
  { value: "moroto",      label: "Moroto" },
  { value: "kitgum",      label: "Kitgum" },
  { value: "masindi",     label: "Masindi" },
  { value: "iganga",      label: "Iganga" },
  { value: "busia",       label: "Busia" },
  { value: "mityana",     label: "Mityana" },
  { value: "mubende",     label: "Mubende" },
  { value: "nakasongola", label: "Nakasongola" },
  { value: "pallisa",     label: "Pallisa" },
  { value: "nebbi",       label: "Nebbi" },
  { value: "adjumani",    label: "Adjumani" },
  { value: "kotido",      label: "Kotido" },
  { value: "bundibugyo",  label: "Bundibugyo" },
  { value: "bushenyi",    label: "Bushenyi" },
  { value: "kamuli",      label: "Kamuli" },
  { value: "kayunga",     label: "Kayunga" },
  { value: "kiboga",      label: "Kiboga" },
  { value: "kiruhura",    label: "Kiruhura" },
  { value: "koboko",      label: "Koboko" },
  { value: "kumi",        label: "Kumi" },
  { value: "kyenjojo",    label: "Kyenjojo" },
  { value: "lyantonde",   label: "Lyantonde" },
  { value: "manafwa",     label: "Manafwa" },
  { value: "mayuge",      label: "Mayuge" },
  { value: "ntungamo",    label: "Ntungamo" },
  { value: "oyam",        label: "Oyam" },
  { value: "pader",       label: "Pader" },
  { value: "rakai",       label: "Rakai" },
  { value: "rukungiri",   label: "Rukungiri" },
  { value: "sembabule",   label: "Sembabule" },
  { value: "sironko",     label: "Sironko" },
  { value: "yumbe",       label: "Yumbe" },
];

/* Default listings — used as seed data for Supabase on first setup.
   Also used as in-memory fallback if Supabase is temporarily unreachable. */
const DEFAULT_LISTINGS = [
  { id:1,  type:"land-sale", title:"50×100ft Plot, Layibi",        location:"Layibi Division, Gulu City",    location_key:"gulu",      price:45000000,  price_label:"UGX 45,000,000",  price_note:"Negotiable",       features:["50×100ft","Titled","Near Road"],          feature_icons:["ti-ruler","ti-certificate","ti-road"],           description:"Prime plot in Layibi Division, Gulu City. Title deed ready. Near tarmac road.",                                photos:[], available:true, featured:true  },
  { id:2,  type:"land-sale", title:"1 Acre Plot, Pece Division",   location:"Pece, Gulu District",           location_key:"gulu",      price:120000000, price_label:"UGX 120,000,000", price_note:"Firm price",       features:["1 Acre","Mailo Title","Flat land"],       feature_icons:["ti-ruler","ti-certificate","ti-mountain"],       description:"Large flat acre in Pece Division. Mailo land title. Suitable for development.",                               photos:[], available:true, featured:true  },
  { id:3,  type:"land-sale", title:"Prime Commercial Plot, Gulu",  location:"Along Kampala Road, Gulu",      location_key:"gulu",      price:80000000,  price_label:"UGX 80,000,000",  price_note:"Negotiable",       features:["60×100ft","Freehold","Commercial zone"],  feature_icons:["ti-ruler","ti-certificate","ti-building-store"], description:"Commercial plot along Kampala Road, Gulu. High visibility. Freehold title.",                                  photos:[], available:true, featured:true  },
  { id:4,  type:"land-sale", title:"2-Acre Plot, Mbarara",         location:"Kakoba Division, Mbarara",      location_key:"mbarara",   price:180000000, price_label:"UGX 180,000,000", price_note:"Negotiable",       features:["2 Acres","Mailo Title","Near highway"],   feature_icons:["ti-ruler","ti-certificate","ti-road"],           description:"Large 2-acre plot in Mbarara City near the main highway. Ideal for commercial use.",                          photos:[], available:true, featured:false },
  { id:5,  type:"land-sale", title:"Residential Plot, Kireka",     location:"Kireka, Wakiso District",       location_key:"wakiso",    price:95000000,  price_label:"UGX 95,000,000",  price_note:"Firm price",       features:["50×100ft","Freehold","Tarmac access"],    feature_icons:["ti-ruler","ti-certificate","ti-road"],           description:"Well-located plot in Kireka with tarmac road access. Freehold title.",                                       photos:[], available:true, featured:false },
  { id:6,  type:"land-sale", title:"Plot for Sale, Jinja City",    location:"Walukuba, Jinja",               location_key:"jinja",     price:60000000,  price_label:"UGX 60,000,000",  price_note:"Negotiable",       features:["50×100ft","Titled","Near lake"],           feature_icons:["ti-ruler","ti-certificate","ti-ripple"],         description:"Plot near the Nile in Jinja City. Suitable for residential or hospitality use.",                              photos:[], available:true, featured:false },
  { id:7,  type:"house-rent", title:"3-Bedroom House, Gulu",        location:"Laroo Division, Gulu City",     location_key:"gulu",      price:500000,    price_label:"UGX 500,000",     price_note:"per month",        features:["3 Bedrooms","Borehole water","Parking"],  feature_icons:["ti-bed","ti-droplet","ti-car"],                  description:"Spacious 3-bedroom house with borehole water and ample parking in Gulu.",                                     photos:[], available:true, featured:true  },
  { id:8,  type:"house-rent", title:"Self-Contained Room, Kampala", location:"Ntinda, Kampala",               location_key:"kampala",   price:250000,    price_label:"UGX 250,000",     price_note:"per month",        features:["Self-contained","Water & power","Secure"], feature_icons:["ti-home","ti-bolt","ti-lock"],                   description:"Modern self-contained single room in Ntinda, Kampala. Security guard on site.",                               photos:[], available:true, featured:true  },
  { id:9,  type:"house-rent", title:"2-Bedroom Apartment, Mbarara", location:"Rutooma, Mbarara",              location_key:"mbarara",   price:450000,    price_label:"UGX 450,000",     price_note:"per month",        features:["2 Bedrooms","Tiled floors","Secure compound"], feature_icons:["ti-bed","ti-square","ti-lock"],               description:"Modern 2-bedroom apartment in Mbarara City. Tiled floors and secure compound.",                               photos:[], available:true, featured:true  },
  { id:10, type:"house-rent", title:"4-Bedroom House, Entebbe",     location:"Entebbe Municipality",          location_key:"entebbe",   price:1200000,   price_label:"UGX 1,200,000",   price_note:"per month",        features:["4 Bedrooms","2 Bathrooms","Lake view"],   feature_icons:["ti-bed","ti-bath","ti-ripple"],                  description:"Spacious 4-bedroom house near Entebbe airport with partial lake view.",                                       photos:[], available:true, featured:false },
  { id:11, type:"house-rent", title:"Studio Apartment, Jinja",      location:"Jinja City Centre",             location_key:"jinja",     price:200000,    price_label:"UGX 200,000",     price_note:"per month",        features:["Studio","Furnished","24hr power"],         feature_icons:["ti-home","ti-sofa","ti-bolt"],                   description:"Cosy furnished studio apartment in Jinja. 24-hour electricity supply.",                                       photos:[], available:true, featured:false },
  { id:12, type:"house-rent", title:"3-Bedroom Bungalow, Mbale",    location:"Industrial Division, Mbale",    location_key:"mbale",     price:380000,    price_label:"UGX 380,000",     price_note:"per month",        features:["3 Bedrooms","Solar backup","Compound"],   feature_icons:["ti-bed","ti-solar-panel","ti-fence"],            description:"Modern bungalow with solar backup in Mbale City. Quiet compound.",                                            photos:[], available:true, featured:false },
  { id:13, type:"house-sale", title:"3-Bedroom House for Sale, Gulu", location:"Pece Division, Gulu City",   location_key:"gulu",      price:95000000,  price_label:"UGX 95,000,000",  price_note:"Negotiable",       features:["3 Bedrooms","2 Bathrooms","Titled"],      feature_icons:["ti-bed","ti-bath","ti-certificate"],             description:"Well-built 3-bedroom house on a titled plot in Pece Division. Ready to move in.",                             photos:[], available:true, featured:true  },
  { id:14, type:"land-rent",  title:"1-Acre Farm Land, Lira",         location:"Ojwina Division, Lira City",  location_key:"lira",      price:150000,    price_label:"UGX 150,000",     price_note:"per month",        features:["1 Acre","Fertile soil","Water access"],   feature_icons:["ti-ruler","ti-plant","ti-droplet"],              description:"Fertile farmland available for monthly lease in Lira. Suitable for agriculture.",                             photos:[], available:true, featured:true  },
];

/* ─── Stale-while-revalidate listings cache ───
   Why: on a fresh page load, waiting for a network round-trip to Supabase
   before showing any property cards makes the site feel slow — especially
   on weaker mobile connections. Instead we:
     1. Try localStorage first → render instantly if we have anything cached.
     2. Always still fetch fresh data in the background.
     3. Re-render automatically when the fresh data arrives (or differs).
   This means the very first visit on a device still waits for the network
   (nothing to show yet), but every visit after that feels instant. */
const LISTINGS_CACHE_KEY = "kp_listings_cache_v1";
const LISTINGS_CACHE_MAX_AGE_MS = 5 * 60 * 1000; /* treat cache as "fresh enough" for 5 min */

let _listingsCache = null;          /* in-memory, fastest path within one page view */
let _listingsRefreshPromise = null; /* dedupe concurrent background refreshes */

function _readListingsFromStorage() {
  try {
    const raw = localStorage.getItem(LISTINGS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.data)) return null;
    return parsed;
  } catch { return null; }
}

function _writeListingsToStorage(data) {
  try {
    localStorage.setItem(LISTINGS_CACHE_KEY, JSON.stringify({ data, savedAt: Date.now() }));
  } catch (e) { /* storage full or unavailable — fine, cache is best-effort */ }
}

/* Normalise a Supabase row to the shape the UI expects
   (Supabase uses snake_case; old JS used camelCase) */
function _normaliseListing(row) {
  if (!row) return row;
  return {
    id:           row.id,
    type:         row.type,
    title:        row.title,
    location:     row.location,
    locationKey:  row.location_key  || row.locationKey  || "",
    price:        row.price,
    priceLabel:   row.price_label   || row.priceLabel   || "",
    priceNote:    row.price_note    || row.priceNote     || "",
    features:     row.features      || [],
    featureIcons: row.feature_icons || row.featureIcons || [],
    description:  row.description   || "",
    photos:       row.photos        || [],
    available:    row.available     !== false,
    featured:     row.featured      === true,
  };
}

/**
 * Returns listings as fast as possible:
 * - In-memory cache (same page view) → instant, no async wait.
 * - localStorage cache (repeat visits) → instant, then refreshes in background.
 * - Otherwise → waits on the network once, then caches for next time.
 *
 * Pass { background: true } to force a silent network refresh after
 * returning cached data — callers that want to react to fresher data
 * should use kpSubscribeListings() / the onUpdate callback below instead
 * of polling this function again.
 */
async function getListings(onFreshData) {
  if (_listingsCache) return _listingsCache;

  const stored = _readListingsFromStorage();
  if (stored) {
    _listingsCache = stored.data;
    const isStale = (Date.now() - stored.savedAt) > LISTINGS_CACHE_MAX_AGE_MS;
    /* Always refresh in the background at most once concurrently,
       so the cache doesn't go silently out of date forever. */
    if (isStale || true) {
      _refreshListingsInBackground(onFreshData);
    }
    return _listingsCache;
  }

  /* No cache anywhere yet — this is the only case where we actually wait. */
  let rows = await kpGetListings();

  /* First-run auto-seed: if the table is genuinely empty AND the current
     visitor is the logged-in admin (RLS only allows authenticated writes
     anyway), load the original 14 starter listings automatically so they
     don't have to be manually re-added through the admin panel.
     Ordinary visitors never trigger this — they simply see "no listings"
     until an admin has logged in at least once, which is correct: nobody
     but the admin should ever be able to write to the database. */
  if (rows.length === 0) {
    rows = await _maybeAutoSeedListings();
  }

  _listingsCache = rows.map(_normaliseListing);
  _writeListingsToStorage(_listingsCache);
  return _listingsCache;
}

const AUTO_SEED_FLAG_KEY = "kp_auto_seed_attempted";

async function _maybeAutoSeedListings() {
  try {
    /* Only try once per browser, so we don't hammer the database with
       repeated empty-check calls if seeding fails for some reason. */
    if (sessionStorage.getItem(AUTO_SEED_FLAG_KEY) === "true") return [];
    sessionStorage.setItem(AUTO_SEED_FLAG_KEY, "true");

    const session = await kpGetSession();
    if (!session) return []; /* not logged in as admin — do nothing, RLS would block it anyway */

    const isEmpty = await kpListingsTableIsEmpty();
    if (!isEmpty) return []; /* race condition guard — someone else already added listings */

    await kpSeedDefaultListings(DEFAULT_LISTINGS);
    showToast("Starter listings loaded automatically.");
    return await kpGetListings();
  } catch (err) {
    console.warn("[KP] Auto-seed failed:", err);
    return [];
  }
}

function _refreshListingsInBackground(onFreshData) {
  if (_listingsRefreshPromise) return _listingsRefreshPromise; /* already in flight */
  _listingsRefreshPromise = kpGetListings()
    .then(rows => {
      const fresh = rows.map(_normaliseListing);
      const changed = JSON.stringify(fresh) !== JSON.stringify(_listingsCache);
      _listingsCache = fresh;
      _writeListingsToStorage(fresh);
      if (changed && typeof onFreshData === "function") onFreshData(fresh);
      return fresh;
    })
    .catch(err => {
      console.warn("[KP] Background listings refresh failed:", err);
      return _listingsCache;
    })
    .finally(() => { _listingsRefreshPromise = null; });
  return _listingsRefreshPromise;
}

function _bustListingCache() {
  _listingsCache = null;
  try { localStorage.removeItem(LISTINGS_CACHE_KEY); } catch (e) {}
}

/* ─── Cart (browser-local — intentional) ─── */
function getCart()       { return kpGetCart(); }
function saveCart(cart)  { kpSaveCart(cart); }

/* ─── Messages ─── */
async function saveMessage(data)  { return kpSaveMessage(data); }
async function getMessages()      { return kpGetMessages(); }
async function markAllRead()      { return kpMarkAllRead(); }
async function markOneRead(id)    { await kpMarkOneRead(id); renderInbox(); renderAdminTable(); }
async function deleteMessage(id)  { await kpDeleteMessage(id); }
function getUnreadCount()  { /* computed from renderInbox state */ return 0; } /* overridden below */

function populateDistrictDropdowns() {
  document.querySelectorAll(".district-select").forEach(sel => {
    const currentVal  = sel.value;
    const firstOption = sel.options[0];
    sel.innerHTML = "";
    sel.appendChild(firstOption);
    UGANDA_DISTRICTS.forEach(d => {
      const opt = document.createElement("option");
      opt.value       = d.value;
      opt.textContent = d.label;
      sel.appendChild(opt);
    });
    if (currentVal) sel.value = currentVal;
  });
}

/* ══════════════════════════════════════════
   CART LOGIC
   ══════════════════════════════════════════ */

async function toggleCart(id) {
  const listings = await getListings();
  const item     = listings.find(l => l.id === Number(id));
  if (!item) return;

  let cart   = getCart();
  const idx  = cart.findIndex(c => Number(c.id) === Number(id));
  const inCart = idx > -1;

  if (inCart) {
    cart.splice(idx, 1);
    saveCart(cart);
    showToast(`"${item.title}" removed from enquiry list.`);
    _updateHearts(id, false);
  } else {
    cart.push({ id: item.id, title: item.title, price: item.priceLabel, type: item.type, photo: (item.photos && item.photos[0]) || "" });
    saveCart(cart);
    showToast(`"${item.title}" added to enquiry list!`);
    _updateHearts(id, true);
  }
}

function _updateHearts(id, inCart) {
  document.querySelectorAll(`.prop-card__save[data-id="${id}"]`).forEach(btn => {
    if (inCart) {
      btn.classList.add("saved");
    } else {
      btn.classList.remove("saved");
    }
    /* The heart is now built from real inline SVGs (see heartFilledSVG),
       not a webfont glyph, so only the .saved class needs to be toggled —
       CSS handles the colour change for both the backdrop and foreground
       heart layers automatically. */
    btn.title = inCart ? "Remove from enquiry list" : "Add to enquiry list";
  });
  const modalBtn = document.getElementById(`modalHeartBtn_${id}`);
  if (modalBtn) _updateModalHeartBtn(modalBtn, inCart);
}

function _updateModalHeartBtn(btn, inCart) {
  btn.style.background  = inCart ? 'var(--purple)' : 'var(--white)';
  btn.style.color       = inCart ? '#fff' : 'var(--purple)';
  btn.style.borderColor = 'var(--purple)';
  btn.innerHTML = `${inCart ? heartFilledSVG("modal-heart-icon") : '<i class="ti ti-heart"></i>'} ${inCart ? 'Saved' : 'Save Property'}`;
}

function isInCart(id) { return getCart().some(c => Number(c.id) === Number(id)); }

function updateCartBadge() {
  const count = getCart().length;
  document.querySelectorAll("#cartBadge").forEach(b => {
    const changed = b.textContent !== String(count);
    b.textContent   = count;
    b.style.display = count > 0 ? "flex" : "none";
    if (changed) {
      b.classList.remove("pop");
      void b.offsetWidth;
      b.classList.add("pop");
    }
  });
  const countPill  = document.getElementById("cartItemCount");
  const countSide  = document.getElementById("cartItemCountSide");
  const countTotal = document.getElementById("cartItemCountTotal");
  if (countPill)  countPill.textContent  = count;
  if (countSide)  countSide.textContent  = count;
  if (countTotal) countTotal.textContent = count;

  const headerRow = document.getElementById("cartHeaderRow");
  const summaryEl = document.getElementById("cartSummary");
  const emptyEl   = document.getElementById("cartEmpty");
  const helpNote  = document.getElementById("cartHelpNote");
  const isEmpty   = count === 0;
  if (headerRow) headerRow.style.display = isEmpty ? "none"  : "flex";
  if (summaryEl) summaryEl.style.display = isEmpty ? "none"  : "block";
  if (emptyEl)   emptyEl.style.display   = isEmpty ? "block" : "none";
  if (helpNote)  helpNote.style.display  = isEmpty ? "none"  : "flex";
}

function removeFromCart(id) {
  saveCart(getCart().filter(c => Number(c.id) !== Number(id)));
  _updateHearts(id, false);
}

/* ══════════════════════════════════════════
   PROPERTY DETAIL MODAL
   ══════════════════════════════════════════ */

async function openDetailModal(id) {
  const listings = await getListings();
  const item     = listings.find(l => l.id === Number(id));
  if (!item) return;

  document.getElementById("propDetailModal")?.remove();

  const photos = item.photos && item.photos.length > 0;
  const featuresHTML = item.features.map((f, i) =>
    `<span style="display:inline-flex;align-items:center;gap:5px;font-size:.85rem;
      background:var(--purple-pale);border:1px solid rgba(91,45,142,.15);
      border-radius:100px;padding:3px 10px;color:var(--text-mid)">
      <i class="ti ${item.featureIcons[i] || 'ti-check'}" style="color:var(--purple)"></i>${f}
    </span>`
  ).join("");

  const numPhotos = item.photos ? item.photos.length : 0;
  const photoHTML = numPhotos > 0
    ? `<div style="position:relative;margin-bottom:1.25rem" id="modalPhotoWrap">
        <div style="height:260px;border-radius:var(--radius-md);overflow:hidden;position:relative">
          ${item.photos.map((src, i) =>
            `<div style="position:absolute;inset:0;background:url('${src}') center/cover;
              opacity:${i === 0 ? 1 : 0};transition:opacity .45s ease" data-slide="${i}"></div>`
          ).join("")}
        </div>
        ${numPhotos > 1 ? `
        <button onclick="slidePhoto(-1)" title="Previous photo"
          style="position:absolute;left:8px;top:50%;transform:translateY(-50%);
            background:rgba(0,0,0,0.48);color:#fff;border:none;border-radius:50%;
            width:36px;height:36px;display:flex;align-items:center;justify-content:center;
            cursor:pointer;font-size:1.15rem;z-index:4;transition:background .2s ease"
          onmouseover="this.style.background='rgba(91,45,142,0.85)'"
          onmouseout="this.style.background='rgba(0,0,0,0.48)'">
          <i class="ti ti-chevron-left"></i>
        </button>
        <button onclick="slidePhoto(1)" title="Next photo"
          style="position:absolute;right:8px;top:50%;transform:translateY(-50%);
            background:rgba(0,0,0,0.48);color:#fff;border:none;border-radius:50%;
            width:36px;height:36px;display:flex;align-items:center;justify-content:center;
            cursor:pointer;font-size:1.15rem;z-index:4;transition:background .2s ease"
          onmouseover="this.style.background='rgba(91,45,142,0.85)'"
          onmouseout="this.style.background='rgba(0,0,0,0.48)'">
          <i class="ti ti-chevron-right"></i>
        </button>
        <div style="position:absolute;bottom:10px;left:50%;transform:translateX(-50%);
          display:flex;gap:5px;z-index:3">
          ${item.photos.map((_, i) =>
            `<button onclick="slidePhoto(${i}, true)"
              style="width:7px;height:7px;border-radius:50%;border:none;cursor:pointer;padding:0;
              background:${i === 0 ? '#fff' : 'rgba(255,255,255,.42)'};transition:all .2s" data-dot="${i}"></button>`
          ).join("")}
        </div>` : ""}
      </div>`
    : `<div style="height:200px;border-radius:var(--radius-md);
        background:linear-gradient(135deg,var(--purple-pale),var(--silver-light));
        display:flex;align-items:center;justify-content:center;margin-bottom:1.25rem;
        border:1px solid var(--silver-light)">
        <i class="ti ${(item.type === 'land-sale' || item.type === 'land-rent') ? 'ti-map-pin' : 'ti-building'}"
          style="font-size:3rem;color:var(--purple-light);opacity:.38"></i>
      </div>`;

  const modal = document.createElement("div");
  modal.id    = "propDetailModal";
  modal.style.cssText = `
    position:fixed;inset:0;z-index:9000;
    background:rgba(10,7,18,.75);backdrop-filter:blur(6px);
    display:flex;align-items:center;justify-content:center;padding:1rem;
    animation:fadeInModal .2s ease;
  `;

  modal.innerHTML = `
    <style>
      @keyframes fadeInModal { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
      .modal-inner { background:var(--white);border-radius:var(--radius-lg);
        max-width:680px;width:100%;max-height:90vh;overflow-y:auto;
        box-shadow:0 24px 80px rgba(0,0,0,.35);position:relative; }
      .modal-close { position:absolute;top:1rem;right:1rem;background:var(--off-white);
        border:1px solid var(--silver-light);border-radius:50%;width:34px;height:34px;
        display:flex;align-items:center;justify-content:center;cursor:pointer;
        font-size:1rem;color:var(--text-mid);transition:all .2s ease;z-index:2; }
      .modal-close:hover { background:var(--red-bg);color:var(--red-tag);border-color:var(--red-tag); }
    </style>
    <div class="modal-inner">
      <button class="modal-close" onclick="closeDetailModal()" title="Close">
        <i class="ti ti-x"></i>
      </button>
      <div style="padding:2rem 2rem 0">
        ${photoHTML}
        <div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.75rem">
          <span class="prop-card__badge ${item.type === 'land-sale' || item.type === 'land-rent' ? 'land' : 'rent'}"
            style="position:static;font-size:.7rem;display:inline-block">
            ${item.type === 'land-sale' ? 'For Sale' : item.type === 'land-rent' ? 'Land Rent' : item.type === 'house-sale' ? 'For Sale' : 'For Rent'}
          </span>
          ${!item.available
            ? `<span style="background:var(--red-bg);color:var(--red-tag);font-size:.7rem;
                font-weight:600;padding:2px 10px;border-radius:100px;text-transform:uppercase">
                Taken / Sold</span>`
            : `<span style="background:var(--green-bg);color:var(--green-tag);font-size:.7rem;
                font-weight:600;padding:2px 10px;border-radius:100px;text-transform:uppercase">
                Available</span>`}
        </div>
        <h2 style="font-family:var(--font-serif);font-size:1.6rem;font-weight:700;
          color:var(--text-primary);margin-bottom:.4rem">${item.title}</h2>
        <div style="display:flex;align-items:center;gap:5px;font-size:.85rem;
          color:var(--text-muted);margin-bottom:1rem">
          <i class="ti ti-map-pin" style="color:var(--purple-light)"></i>${item.location}
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1.25rem">
          ${featuresHTML}
        </div>
        ${item.description
          ? `<p style="font-size:.92rem;color:var(--text-mid);line-height:1.75;margin-bottom:1.25rem">
              ${item.description}</p>`
          : ""}
        <div style="background:var(--purple-pale);border:1px solid rgba(91,45,142,.15);
          border-radius:var(--radius-md);padding:1rem 1.25rem;margin-bottom:1.5rem;
          display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:.75rem">
          <div>
            <div style="font-size:.72rem;color:var(--text-muted);text-transform:uppercase;
              letter-spacing:.08em;margin-bottom:3px">Price</div>
            <div style="font-family:var(--font-serif);font-size:1.5rem;font-weight:700;
              color:var(--text-primary)">${item.priceLabel}</div>
            <div style="font-size:.75rem;color:var(--text-muted)">${item.priceNote}</div>
          </div>
          <button onclick="toggleCart(${item.id});_updateModalHeartBtn(this,isInCart(${item.id}))"
            id="modalHeartBtn_${item.id}"
            style="display:flex;align-items:center;gap:6px;
              background:${isInCart(item.id) ? 'var(--purple)' : 'var(--white)'};
              color:${isInCart(item.id) ? '#fff' : 'var(--purple)'};
              border:2px solid var(--purple);border-radius:var(--radius-sm);
              padding:.5rem 1.1rem;font-size:.85rem;font-weight:600;cursor:pointer;
              font-family:var(--font-sans);transition:all .25s ease">
            ${isInCart(item.id)
              ? heartFilledSVG("modal-heart-icon")
              : '<i class="ti ti-heart"></i>'}
            ${isInCart(item.id) ? "Saved" : "Save Property"}
          </button>
        </div>
      </div>
      <div style="padding:0 2rem 2rem">
        <h3 style="font-family:var(--font-serif);font-size:1.15rem;font-weight:700;
          color:var(--text-primary);margin-bottom:1.25rem;padding-bottom:.85rem;
          border-top:1px solid var(--silver-light);padding-top:1.25rem">
          Send an Enquiry About This Property
        </h3>
        <form id="modalEnquiryForm"
          name="property-enquiry"
          method="POST"
          data-netlify="true"
          netlify-honeypot="bot-field">
          <input type="hidden" name="form-name"         value="property-enquiry" />
          <input type="hidden" name="property_title"    value="${item.title}" />
          <input type="hidden" name="property_location" value="${item.location}" />
          <input type="hidden" name="property_price"    value="${item.priceLabel}" />
          <input type="hidden" name="property_type"     value="${item.type === 'land-sale' ? 'For Sale' : item.type === 'land-rent' ? 'Land Rent' : item.type === 'house-sale' ? 'For Sale' : 'For Rent'}" />
          <p style="display:none"><label>Skip: <input name="bot-field" /></label></p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
            <div class="form-group">
              <label for="meq-name">Your Name <span class="req">*</span></label>
              <input type="text" id="meq-name" name="name" placeholder="Full name" required />
            </div>
            <div class="form-group">
              <label for="meq-phone">Phone / WhatsApp <span class="req">*</span></label>
              <input type="tel" id="meq-phone" name="phone" placeholder="+256 7XX XXX XXX" required />
            </div>
          </div>
          <div class="form-group">
            <label for="meq-email">Email Address</label>
            <input type="email" id="meq-email" name="email" placeholder="your@email.com" />
          </div>
          <div class="form-group">
            <label for="meq-message">Message <span class="req">*</span></label>
            <textarea id="meq-message" name="message" rows="3"
              placeholder="Ask about this property — viewing, title documents, payment terms…"
              required></textarea>
          </div>
          <button type="submit" class="btn btn--primary btn--full" id="modalEnquiryBtn">
            <i class="ti ti-send"></i> Send Enquiry
          </button>
          <div class="form-status" id="modalEnquiryStatus" style="margin-top:.75rem"></div>
        </form>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) closeDetailModal(); });

  const form = document.getElementById("modalEnquiryForm");
  form?.addEventListener("submit", async e => {
    e.preventDefault();
    const btn    = document.getElementById("modalEnquiryBtn");
    const status = document.getElementById("modalEnquiryStatus");
    const name   = document.getElementById("meq-name").value.trim();
    const phone  = document.getElementById("meq-phone").value.trim();
    const email  = document.getElementById("meq-email").value.trim();
    const msg    = document.getElementById("meq-message").value.trim();

    if (!name || !phone || !msg) {
      status.textContent = "Please fill in all required fields.";
      status.className   = "form-status error";
      return;
    }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> Sending…'; }

    try {
      /* Send to Netlify Forms */
      const body = new URLSearchParams(new FormData(form)).toString();
      await fetch("/", { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body });

      /* Save to Supabase messages */
      await saveMessage({
        from:    name,
        phone,
        email,
        subject: `Enquiry: ${item.title}`,
        body:    `Property: ${item.title}\nLocation: ${item.location}\nPrice: ${item.priceLabel}\n\nMessage:\n${msg}`,
        type:    "property-enquiry"
      });

      form.reset();
      status.textContent = "✓ Enquiry sent! Our team will contact you shortly.";
      status.className   = "form-status success";
      showToast("Enquiry sent successfully!");
    } catch {
      status.textContent = "Something went wrong. Please call or WhatsApp us directly.";
      status.className   = "form-status error";
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Send Enquiry'; }
    }
  });

  let _currentSlide = 0;
  const _totalSlides = item.photos ? item.photos.length : 0;

  window.slidePhoto = function(arg, absolute) {
    if (_totalSlides < 2) return;
    _currentSlide = absolute ? arg : (_currentSlide + arg + _totalSlides) % _totalSlides;
    modal.querySelectorAll("[data-slide]").forEach((el, i) => {
      el.style.opacity = i === _currentSlide ? "1" : "0";
    });
    modal.querySelectorAll("[data-dot]").forEach((el, i) => {
      el.style.background   = i === _currentSlide ? "#fff" : "rgba(255,255,255,.42)";
      el.style.width        = i === _currentSlide ? "18px" : "7px";
      el.style.borderRadius = "4px";
    });
  };

  document.body.style.overflow = "hidden";
}

function closeDetailModal() {
  document.getElementById("propDetailModal")?.remove();
  document.body.style.overflow = "";
}

/* ══════════════════════════════════════════
   CARD RENDERING
   ══════════════════════════════════════════ */

function createCard(listing) {
  const inCart   = isInCart(listing.id);
  const features = listing.features.map((f, i) =>
    `<span class="prop-card__feat">
      <i class="ti ${listing.featureIcons[i] || 'ti-check'}"></i>${f}
    </span>`
  ).join("");

  const photos   = listing.photos && listing.photos.length > 0 ? listing.photos : [];
  const hasPhoto = photos.length > 0;

  const photoSlides = hasPhoto
    ? photos.map((src, i) =>
        `<div class="prop-card__photo${i === 0 ? " active" : ""}"
          style="background-image:url('${src}')" data-idx="${i}"></div>`
      ).join("") : "";

  const photoDots = hasPhoto && photos.length > 1
    ? `<div class="prop-card__photo-dots">
        ${photos.map((_, i) =>
          `<button class="prop-card__photo-dot${i === 0 ? " active" : ""}"
            data-dot="${i}"></button>`
        ).join("")}
      </div>` : "";

  const takenOverlay = !listing.available
    ? `<div class="prop-card__taken">
        <span class="prop-card__taken-label">Taken / Sold</span>
      </div>` : "";

  return `
    <div class="prop-card fade-in" data-id="${listing.id}">
      <div class="prop-card__image">
        ${hasPhoto ? `<div class="prop-card__photos">${photoSlides}</div>` : ""}
        ${!hasPhoto ? `<i class="ti ${(listing.type === 'land-sale' || listing.type === 'land-rent') ? 'ti-map-pin' : 'ti-building'}"></i>` : ""}
        ${photoDots}
        <span class="prop-card__badge ${listing.type === 'land-sale' || listing.type === 'land-rent' ? 'land' : 'rent'}">
          ${listing.type === 'land-sale' ? 'For Sale' : listing.type === 'land-rent' ? 'Land Rent' : listing.type === 'house-sale' ? 'For Sale' : 'For Rent'}
        </span>
        <button
          class="prop-card__save${inCart ? " saved" : ""}"
          data-id="${listing.id}"
          onclick="toggleCart(${listing.id})"
          title="${inCart ? "Remove from enquiry list" : "Add to enquiry list"}">
          ${heartFilledSVG("prop-card__save-bg")}
          ${heartFilledSVG("prop-card__save-fg")}
        </button>
        ${takenOverlay}
      </div>
      <div class="prop-card__body">
        <div class="prop-card__title">${listing.title}</div>
        <div class="prop-card__loc">
          <i class="ti ti-map-pin"></i>${listing.location}
        </div>
        <div class="prop-card__features">${features}</div>
        <div class="prop-card__footer">
          <div class="prop-card__price">
            ${listing.priceLabel}
            <span>${listing.priceNote}</span>
          </div>
          <button class="prop-card__cta" onclick="openDetailModal(${listing.id})">
            <i class="ti ti-info-circle"></i> Details
          </button>
        </div>
      </div>
    </div>`;
}

function initCardSlideshows() {
  document.querySelectorAll(".prop-card").forEach(card => {
    const dots   = card.querySelectorAll(".prop-card__photo-dot");
    const photos = card.querySelectorAll(".prop-card__photo");
    if (!dots.length) return;
    dots.forEach(dot => {
      dot.addEventListener("click", e => {
        e.stopPropagation();
        const idx = parseInt(dot.dataset.dot, 10);
        photos.forEach((p, i) => p.classList.toggle("active", i === idx));
        dots.forEach((d, i) => d.classList.toggle("active", i === idx));
      });
    });
  });
}

/* ══════════════════════════════════════════
   ABOUT PAGE — TEAM GRID
   ══════════════════════════════════════════ */

function _initialsFor(name) {
  return (name || "")
    .trim()
    .split(/\s+/)
    .map(p => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";
}

async function renderTeamGrid() {
  const grid = document.getElementById("teamGrid");
  if (!grid) return; /* only present on about.html */

  const team = await kpGetTeam();

  if (team.length === 0) {
    grid.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;text-align:center">
      Team information will appear here once added in the admin panel.
    </p>`;
    return;
  }

  grid.innerHTML = team.map(member => `
    <div class="team-card fade-in">
      <div class="team-card__avatar"${member.photo_url ? ` style="padding:0;background:none;box-shadow:none"` : ""}>
        ${member.photo_url
          ? `<img src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(member.name)}" style="width:100%;height:100%;border-radius:50%;object-fit:cover" />`
          : _initialsFor(member.name)}
      </div>
      <div class="team-card__name">${escapeHtml(member.name)}</div>
      <div class="team-card__role">${escapeHtml(member.role || "")}</div>
      ${member.bio ? `<p class="team-card__bio">${escapeHtml(member.bio)}</p>` : ""}
    </div>`
  ).join("");

  observeFadeIns();
}

/* ══════════════════════════════════════════
   HOME PAGE FEATURED LISTINGS
   ══════════════════════════════════════════ */

async function renderHomeListings() {
  const listings  = await getListings(() => renderHomeListings());
  const landGrid  = document.getElementById("landGrid");
  const rentGrid  = document.getElementById("rentGrid");
  if (landGrid) {
    const items = listings.filter(l => (l.type === "land-sale" || l.type === "land-rent") && l.featured).slice(0, 3);
    landGrid.innerHTML = items.length
      ? items.map(createCard).join("")
      : `<p style="color:var(--text-muted);padding:2rem 0">No featured land listings at the moment.</p>`;
  }
  if (rentGrid) {
    const items = listings.filter(l => (l.type === "house-rent" || l.type === "house-sale") && l.featured).slice(0, 3);
    rentGrid.innerHTML = items.length
      ? items.map(createCard).join("")
      : `<p style="color:var(--text-muted);padding:2rem 0">No featured rental listings at the moment.</p>`;
  }
  observeFadeIns();
  initCardSlideshows();
}

/* ══════════════════════════════════════════
   PROPERTIES PAGE
   ══════════════════════════════════════════ */

async function renderPropertyPage(results) {
  const grid    = document.getElementById("allPropertiesGrid");
  const countEl = document.getElementById("filterCount");
  if (!grid) return;
  if (!results) results = await getListings(() => handleSearch(null));
  if (countEl) countEl.textContent = `${results.length} propert${results.length === 1 ? "y" : "ies"} found`;
  grid.innerHTML = results.length
    ? results.map(createCard).join("")
    : `<div class="no-results"><i class="ti ti-search-off"></i><p>No properties match your filters.</p></div>`;
  observeFadeIns();
  initCardSlideshows();
}

async function handleSearch(e) {
  if (e) e.preventDefault();
  const query      = (document.getElementById("searchInput")?.value || "").toLowerCase().trim();
  const typeFilter = document.getElementById("searchType")?.value    || "all";
  const locFilter  = document.getElementById("searchLocation")?.value || "all";
  const listings   = await getListings();
  const results    = listings.filter(l => {
    const matchType = typeFilter === "all"
      || l.type === typeFilter
      || (typeFilter === "land"       && (l.type === "land-sale" || l.type === "land-rent"))
      || (typeFilter === "rent"       && (l.type === "house-rent" || l.type === "house-sale"))
      || (typeFilter === "house-rent" && l.type === "house-rent")
      || (typeFilter === "house-sale" && l.type === "house-sale")
      || (typeFilter === "land-sale"  && l.type === "land-sale")
      || (typeFilter === "land-rent"  && l.type === "land-rent");
    const matchLoc = locFilter === "all" || l.locationKey === locFilter;
    const matchQ   = !query || l.title.toLowerCase().includes(query) || l.location.toLowerCase().includes(query) || l.features.some(f => f.toLowerCase().includes(query));
    return matchType && matchLoc && matchQ;
  });
  if (window.location.pathname.includes("properties")) {
    renderPropertyPage(results);
  } else {
    const params = new URLSearchParams();
    if (query)                params.set("q",    query);
    if (typeFilter !== "all") params.set("type", typeFilter);
    if (locFilter  !== "all") params.set("loc",  locFilter);
    window.location.href = "properties.html?" + params.toString();
  }
}

async function initPropertyFilters() {
  const grid = document.getElementById("allPropertiesGrid");
  if (!grid) return;
  const params  = new URLSearchParams(window.location.search);
  const qParam  = params.get("q")    || "";
  const tParam  = params.get("type") || "all";
  const lParam  = params.get("loc")  || "all";
  if (document.getElementById("searchInput"))    document.getElementById("searchInput").value    = qParam;
  if (document.getElementById("searchType"))     document.getElementById("searchType").value     = tParam;
  if (document.getElementById("searchLocation")) document.getElementById("searchLocation").value = lParam;
  document.querySelectorAll(".filter-btn[data-type]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.type === tParam);
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter-btn[data-type]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const st = document.getElementById("searchType");
      if (st) st.value = btn.dataset.type;
      handleSearch(null);
    });
  });
  const locSelect = document.getElementById("filterLocation");
  if (locSelect) {
    if (lParam) locSelect.value = lParam;
    locSelect.addEventListener("change", () => {
      const sl = document.getElementById("searchLocation");
      if (sl) sl.value = locSelect.value;
      handleSearch(null);
    });
  }
  handleSearch(null);
}

function initHeroTags() {
  document.querySelectorAll(".hero__tag").forEach(tag => {
    tag.addEventListener("click", () => {
      const params = new URLSearchParams();
      params.set("q", tag.dataset.filter || tag.textContent.trim().toLowerCase());
      window.location.href = "properties.html?" + params.toString();
    });
  });
}

/* ══════════════════════════════════════════
   NAVBAR
   ══════════════════════════════════════════ */

function initNavbar() {
  const navbar    = document.getElementById("navbar");
  const hamburger = document.getElementById("hamburger");
  const navLinks  = document.getElementById("navLinks");

  window.addEventListener("scroll", () => {
    if (navbar) navbar.classList.toggle("scrolled", window.scrollY > 40);
    document.getElementById("backToTop")?.classList.toggle("visible", window.scrollY > 400);
  }, { passive: true });

  if (hamburger && navLinks) {
    hamburger.addEventListener("click", () => {
      hamburger.classList.toggle("open");
      navLinks.classList.toggle("open");
    });
    navLinks.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("open");
        navLinks.classList.remove("open");
      });
    });
  }

  const raw     = window.location.pathname;
  const page    = raw.split("/").pop() || "index.html";
  const current = page === "" || page === "/" ? "index.html" : page;
  document.querySelectorAll(".nav-link").forEach(link => {
    const href  = (link.getAttribute("href") || "").split("?")[0].split("#")[0];
    const match = href === current
      || (current === "index.html" && (href === "index.html" || href === "./index.html" || href === "./" || href === ""));
    link.classList.toggle("active", match);
  });
}

/* Animated counters */
function animateCounter(el, target, duration = 1800) {
  let start = null;
  const step = ts => {
    if (!start) start = ts;
    const ease = 1 - Math.pow(1 - Math.min((ts - start) / duration, 1), 3);
    el.textContent = Math.floor(ease * target);
    if (ease < 1) requestAnimationFrame(step);
    else el.textContent = target;
  };
  requestAnimationFrame(step);
}
function initCounters() {
  const statsSection = document.querySelector(".stats");
  if (!statsSection) return;
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        document.querySelectorAll(".stats__item[data-count]").forEach(item => {
          const el  = item.querySelector(".counter");
          const tgt = parseInt(item.dataset.count, 10);
          if (el && tgt) animateCounter(el, tgt);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.3 });
  observer.observe(statsSection);
}

function observeFadeIns() {
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add("visible"); observer.unobserve(entry.target); }
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".fade-in:not(.visible)").forEach(el => observer.observe(el));
}

/* ══════════════════════════════════════════
   CONTACT FORM
   ══════════════════════════════════════════ */

function initContactForm() {
  const form      = document.getElementById("contactForm");
  const status    = document.getElementById("formStatus");
  const submitBtn = document.getElementById("contactSubmitBtn");
  if (!form) return;

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const name     = form.querySelector('[name="name"]')?.value.trim();
    const phone    = form.querySelector('[name="phone"]')?.value.trim();
    const msg      = form.querySelector('[name="message"]')?.value.trim();
    const email    = form.querySelector('[name="email"]')?.value.trim()  || "";
    const interest = form.querySelector('[name="interest"]')?.value      || "";
    const subject  = form.querySelector('[name="subject"]')?.value.trim() || "";

    if (!name || !phone || !msg) {
      if (status) { status.textContent = "Please fill in all required fields."; status.className = "form-status error"; }
      return;
    }
    if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> Sending…'; }

    try {
      const body = new URLSearchParams(new FormData(form)).toString();
      await fetch("/", { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body });

      await saveMessage({
        from:    name,
        phone,
        email,
        subject: subject || (interest ? `Interest: ${interest}` : "Contact Form"),
        body:    msg,
        type:    "contact"
      });
      form.reset();
      if (status) { status.textContent = "✓ Message sent! We'll be in touch shortly."; status.className = "form-status success"; }
      showToast("Message sent successfully!");
    } catch {
      if (status) { status.textContent = "Something went wrong. Please call or WhatsApp us directly."; status.className = "form-status error"; }
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = '<i class="ti ti-send"></i> Send Message'; }
    }
  });
}

/* ══════════════════════════════════════════
   TESTIMONIES / REVIEWS
   ══════════════════════════════════════════ */

function initStarPicker() {
  const picker = document.querySelector(".star-picker");
  const input  = document.getElementById("ratingInput");
  if (!picker || !input) return;
  const stars  = picker.querySelectorAll("span");
  const rText  = document.getElementById("starRatingText");
  const labels = ["","Poor","Fair","Good","Very Good","Excellent"];
  let selected = 5;
  input.value  = selected;
  function set(n) {
    stars.forEach((s, i) => s.classList.toggle("active", i < n));
    if (rText) rText.textContent = `${n} out of 5 — ${labels[n]}`;
  }
  set(selected);
  stars.forEach((star, i) => {
    star.addEventListener("mouseenter", () => set(i + 1));
    star.addEventListener("click",      () => { selected = i + 1; input.value = selected; set(selected); });
  });
  picker.addEventListener("mouseleave", () => set(selected));
}

function initReviewForm() {
  const form   = document.getElementById("reviewForm");
  const status = document.getElementById("reviewStatus");
  if (!form) return;
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn  = form.querySelector('[type="submit"]');
    const name = form.querySelector('[name="reviewer_name"]')?.value.trim();
    const text = form.querySelector('[name="review_text"]')?.value.trim();
    if (!name || !text) {
      if (status) { status.textContent = "Please fill in your name and review."; status.className = "form-status error"; }
      return;
    }
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> Submitting…'; }
    try {
      const location = form.querySelector('[name="reviewer_location"]')?.value.trim() || "";
      const service  = form.querySelector('[name="service_used"]')?.value || "";
      const rating   = form.querySelector('[name="rating"]')?.value || "5";
      const body = new URLSearchParams(new FormData(form)).toString();
      await fetch("/", { method:"POST", headers:{"Content-Type":"application/x-www-form-urlencoded"}, body });
      await saveMessage({
        from:    name,
        subject: location ? `Review from ${location}` : "New Review",
        body:    text,
        rating:  Number(rating) || 5,
        service,
        location,
        type:    "reviews"
      });
      form.reset(); initStarPicker();
      if (status) { status.textContent = "✓ Thank you! Your review has been submitted."; status.className = "form-status success"; }
      showToast("Review submitted!");
    } catch {
      if (status) { status.textContent = "Submission failed. Please try again."; status.className = "form-status error"; }
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-send"></i> Submit Review'; }
    }
  });
}

/* ══════════════════════════════════════════
   CART PAGE
   ══════════════════════════════════════════ */

async function renderCartPage() {
  const itemsEl    = document.getElementById("cartItems");
  const emptyEl    = document.getElementById("cartEmpty");
  const summaryEl  = document.getElementById("cartSummary");
  const countEl    = document.getElementById("cartItemCount");
  const countTotal = document.getElementById("cartItemCountTotal");
  const helpNote   = document.getElementById("cartHelpNote");
  const headerRow  = document.getElementById("cartHeaderRow");
  const propInput  = document.getElementById("selectedPropertiesInput");
  if (!itemsEl) return;

  const cart  = getCart();
  const empty = cart.length === 0;

  if (emptyEl)    emptyEl.style.display    = empty ? "block" : "none";
  if (summaryEl)  summaryEl.style.display  = empty ? "none"  : "block";
  if (helpNote)   helpNote.style.display   = empty ? "none"  : "flex";
  if (headerRow)  headerRow.style.display  = empty ? "none"  : "flex";
  if (countEl)    countEl.textContent      = cart.length;
  if (countTotal) countTotal.textContent   = cart.length;
  if (propInput)  propInput.value          = cart.map(c => `${c.title} (${c.price})`).join(" | ");

  if (empty) { itemsEl.innerHTML = ""; return; }
  cart.forEach(c => _updateHearts(c.id, true));

  itemsEl.innerHTML = cart.map(item => `
    <div class="cart-item fade-in" data-id="${item.id}">
      <div class="cart-item__icon">
        ${item.photo
          ? `<img src="${item.photo}" alt="${item.title}" />`
          : `<i class="ti ${(item.type === 'land-sale' || item.type === 'land-rent') ? 'ti-map-pin' : 'ti-building'}"></i>`}
      </div>
      <div class="cart-item__info">
        <div class="cart-item__title">
          ${item.title}
          <span class="cart-item__type ${item.type === 'land-sale' || item.type === 'land-rent' ? 'land' : 'rent'}">
            ${item.type === 'land-sale' ? 'For Sale' : item.type === 'land-rent' ? 'Land Rent' : item.type === 'house-sale' ? 'For Sale' : 'For Rent'}
          </span>
        </div>
        <div class="cart-item__price">${item.price}</div>
      </div>
      <div style="display:flex;gap:.5rem;flex-wrap:wrap;align-items:center">
        <button class="btn btn--outline" style="padding:.35rem .75rem;font-size:.78rem"
          onclick="openDetailModal(${item.id})">
          <i class="ti ti-info-circle"></i> Details
        </button>
        <button class="cart-remove" onclick="removeCartItem(${item.id})">
          <i class="ti ti-trash"></i> Remove
        </button>
      </div>
    </div>`
  ).join("");
  observeFadeIns();
}

function removeCartItem(id) {
  removeFromCart(id);
  renderCartPage();
  const propInput = document.getElementById("selectedPropertiesInput");
  if (propInput) propInput.value = getCart().map(c => `${c.title} (${c.price})`).join(" | ");
  showToast("Item removed from enquiry list.");
}

/* ══════════════════════════════════════════
   LOGIN  (Supabase Auth — no plaintext creds)
   ══════════════════════════════════════════ */

function initLogin() {
  const form   = document.getElementById("loginForm");
  const status = document.getElementById("loginStatus");
  if (!form) return;

  /* Redirect if already logged in */
  kpGetSession().then(session => {
    if (session && window.location.pathname.includes("login")) {
      window.location.href = "admin.html";
    }
  });

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const btn   = form.querySelector('[type="submit"]');
    const email = form.querySelector('[name="username"]').value.trim();
    const pass  = form.querySelector('[name="password"]').value;

    if (!email || !pass) {
      if (status) { status.textContent = "Please enter your email and password."; status.className = "form-status error"; }
      return;
    }

    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> Signing in…'; }

    const { session, error } = await kpSignIn(email, pass);

    if (session) {
      showToast("Login successful! Redirecting…");
      setTimeout(() => window.location.href = "admin.html", 900);
    } else {
      if (status) { status.textContent = error || "Incorrect email or password."; status.className = "form-status error"; }
      if (btn) { btn.disabled = false; btn.innerHTML = '<i class="ti ti-login"></i> Sign In'; }
    }
  });

  /* Password reset via Supabase */
  const sendOtpBtn  = document.getElementById("sendOtpBtn");
  const resetStatus = document.getElementById("resetStatus");

  sendOtpBtn?.addEventListener("click", async function() {
    const contact = (document.getElementById("reset-contact")?.value || "").trim();
    if (!contact) {
      if (resetStatus) { resetStatus.textContent = "Please enter your recovery email address."; resetStatus.className = "form-status error"; }
      return;
    }
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(contact)) {
      if (resetStatus) { resetStatus.textContent = "Please enter a valid email address."; resetStatus.className = "form-status error"; }
      return;
    }
    this.disabled = true;
    this.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> Sending…';

    const { error } = await kpSendPasswordReset(contact);
    this.disabled = false;
    this.innerHTML = '<i class="ti ti-send"></i> Send Reset Link';

    if (error) {
      if (resetStatus) { resetStatus.textContent = `Error: ${error}`; resetStatus.className = "form-status error"; }
    } else {
      /* Important: Supabase intentionally returns this same success
         response whether or not the email belongs to a real admin
         account — this is a deliberate security measure (it stops an
         attacker from using this form to discover which emails are
         registered admins). It does NOT mean a reset link was sent to
         an unregistered address: nothing is sent, and nobody can set
         a password, unless the email matches a real account. */
      if (resetStatus) {
        resetStatus.textContent = "✓ If that email is registered as an admin, a reset link has been sent.";
        resetStatus.className = "form-status success";
      }
      const step2 = document.getElementById("resetStep2");
      if (step2) {
        step2.innerHTML = `<p style="font-size:.85rem;color:var(--text-mid);line-height:1.65">
          If <strong>${contact}</strong> is a registered admin email, a secure
          password reset link has just been sent to it. Click the link in
          that email to set a new password — it expires in 1 hour. If you
          don't receive anything within a few minutes, double-check the
          email address is the one your admin account was created with.
        </p>`;
        step2.style.display = "block";
      }
    }
  });
}

/* ══════════════════════════════════════════
   ADMIN PAGE
   ══════════════════════════════════════════ */

async function initAdmin() {
  if (!window.location.pathname.includes("admin")) return;

  /* Auth guard */
  const ok = await kpRequireAdmin();
  if (!ok) return;

  /* Role guard — determines whether this is the Main Admin (full access)
     or a regular Admin (listings + messages + own account only). This
     drives which tabs are visible; the REAL enforcement lives in Supabase
     RLS policies and the admin-users Netlify function, so hiding tabs
     here is a UX nicety on top of actual security, not a substitute for it. */
  window._kpAdminRole = await kpGetMyRole();
  _applyAdminRoleUI(window._kpAdminRole);

  await renderAdminTable();
  await renderInbox();

  /* Live updates via Supabase Realtime */
  kpSubscribeListings(async () => {
    _bustListingCache();
    await renderAdminTable();
    showToast("Listings updated in real-time.");
  });

  kpSubscribeMessages(async () => {
    await renderInbox();
    await renderAdminTable();
    showToast("New message received!");
  });

  _enableAdminAutoLogout();
}

/**
 * Hides the Team, Admins, and Settings tabs (and their panels) for a
 * regular Admin. A Main Admin sees everything, unchanged.
 */
function _applyAdminRoleUI(role) {
  if (role === "main") return; /* Main Admin sees everything — no changes */

  const restrictedTabs = ["team", "admins", "settings"];
  restrictedTabs.forEach(name => {
    document.querySelector(`.admin-tab[data-tab="${name}"]`)?.style.setProperty("display", "none");
    document.getElementById("tab-" + name)?.classList.remove("active");
  });

  /* If a restricted tab somehow ends up active (e.g. deep link), fall back
     to the always-available "All Listings" tab. */
  const activeTab = document.querySelector(".admin-tab.active");
  if (!activeTab || restrictedTabs.includes(activeTab.dataset.tab)) {
    document.querySelector('.admin-tab[data-tab="listings"]')?.click();
  }
}

/**
 * Ends the admin session the moment they leave the admin page — whether by
 * clicking a link to another page, closing the tab, or refreshing. This is
 * intentional: the admin session is scoped to a single, active page view,
 * not "remembered" in the background.
 *
 * Why two mechanisms layered together:
 *  - sessionStorage (set in supabase.js) already means the session can't
 *    follow into a new tab or survive the browser fully closing.
 *  - This handler additionally clears it the instant the user navigates
 *    AWAY from admin.html to anywhere else (including refreshing — a
 *    refresh is, from the browser's perspective, also a full unload+reload),
 *    so coming back to admin.html always requires signing in again, even
 *    within the same tab.
 *
 * beforeunload/pagehide can't reliably await network calls, so we clear the
 * local session synchronously first (this is what kpRequireAdmin() actually
 * checks), then fire a best-effort server-side revoke that may or may not
 * complete depending on how fast the navigation happens — either way the
 * user is locked out of admin.html until they log in again.
 */
function _enableAdminAutoLogout() {
  const handler = () => {
    try {
      sessionStorage.removeItem("kp_auth_session");
    } catch (e) { /* storage unavailable — nothing more we can do synchronously */ }
    /* Best-effort: ask Supabase to revoke the refresh token server-side too,
       using sendBeacon-style fire-and-forget since the page is unloading. */
    try { kpSignOut(); } catch (e) {}
  };
  window.addEventListener("pagehide", handler);
  window.addEventListener("beforeunload", handler);
}

async function renderAdminTable() {
  const tbody = document.getElementById("adminTableBody");
  if (!tbody) return;

  const listings = await getListings();
  const messages = await getMessages();

  const landSaleCount  = listings.filter(l => l.type === "land-sale").length;
  const landRentCount  = listings.filter(l => l.type === "land-rent").length;
  const houseSaleCount = listings.filter(l => l.type === "house-sale").length;
  const houseRentCount = listings.filter(l => l.type === "house-rent").length;
  const totalCount     = landSaleCount + landRentCount + houseSaleCount + houseRentCount;
  const featuredCount  = listings.filter(l => l.featured).length;
  const msgCount       = messages.length;
  const unread         = messages.filter(m => m.unread).length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("adminTotalCount",     totalCount);
  set("adminLandSaleCount",  landSaleCount);
  set("adminLandRentCount",  landRentCount);
  set("adminHouseSaleCount", houseSaleCount);
  set("adminHouseRentCount", houseRentCount);
  set("adminFeaturedCount",  featuredCount);
  set("adminMsgCount",       msgCount);

  const badge = document.getElementById("inboxBadge");
  if (badge) { badge.textContent = unread; badge.style.display = unread > 0 ? "inline" : "none"; }

  if (listings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9"><div style="text-align:center;padding:3rem;color:var(--text-muted)">
      <i class="ti ti-building-off" style="font-size:2rem;display:block;margin-bottom:.75rem;color:var(--navy-light);opacity:.35"></i>
      No listings yet. Use the "Add Listing" tab.
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = listings.map(l => `
    <tr data-id="${l.id}"
        data-title="${l.title.toLowerCase()}"
        data-location="${l.location.toLowerCase()}"
        data-type="${l.type}"
        data-status="${l.available ? "available" : "sold"}">
      <td style="color:var(--text-muted);font-size:.78rem">${l.id}</td>
      <td>
        <strong style="font-size:.875rem">${l.title}</strong><br/>
        <span style="font-size:.75rem;color:var(--text-muted)">${l.location}</span>
      </td>
      <td>
        <span class="prop-card__badge prop-card__badge--${l.type}"
          style="position:static;font-size:.65rem;display:inline-block">
          ${l.type === 'land-sale' ? 'Land Sale' : l.type === 'land-rent' ? 'Land Rent' : l.type === 'house-sale' ? 'House Sale' : 'House Rent'}
        </span>
      </td>
      <td style="font-size:.82rem;font-weight:500">${l.priceLabel}</td>
      <td>${l.photos && l.photos.length > 0
        ? `<span style="font-size:.78rem;color:var(--green-tag)"><i class="ti ti-photo"></i> ${l.photos.length}</span>`
        : `<span style="font-size:.78rem;color:var(--text-muted)">None</span>`}</td>
      <td>${l.featured
        ? `${starFilledSVG("admin-star-icon")}`
        : '<i class="ti ti-star" style="color:var(--silver)"></i>'}</td>
      <td>
        <span class="status-badge status-badge--${l.available ? "available" : "sold"}">
          ${l.available ? "Available" : "Taken"}
        </span>
      </td>
      <td>
        <div style="display:flex;gap:.35rem;flex-wrap:wrap">
          <button class="btn btn--outline" style="padding:.3rem .6rem;font-size:.72rem"
            onclick="openEditModal(${l.id})" title="Edit listing">
            <i class="ti ti-pencil"></i>
          </button>
          <button class="btn btn--outline" style="padding:.3rem .6rem;font-size:.72rem"
            onclick="toggleAvailability(${l.id})" title="Toggle available/taken">
            <i class="ti ti-refresh"></i>
          </button>
          <button class="btn btn--outline" style="padding:.3rem .6rem;font-size:.72rem"
            onclick="toggleFeatured(${l.id})" title="Toggle featured">
            <i class="ti ti-star"></i>
          </button>
          ${window._kpAdminRole === "main" ? `
          <button class="btn btn--danger" style="padding:.3rem .6rem;font-size:.72rem"
            onclick="deleteListing(${l.id})" title="Delete">
            <i class="ti ti-trash"></i>
          </button>` : ""}
        </div>
      </td>
    </tr>`
  ).join("");
}

/* ══════════════════════════════════════════
   EDIT LISTING MODAL
   ══════════════════════════════════════════ */

async function openEditModal(id) {
  const listings = await getListings();
  const item     = listings.find(l => l.id === Number(id));
  if (!item) return;

  document.getElementById("editModal")?.remove();

  const districtOptions = UGANDA_DISTRICTS.map(d =>
    `<option value="${d.value}"${d.value === item.locationKey ? " selected" : ""}>${d.label}</option>`
  ).join("");

  const modal = document.createElement("div");
  modal.id    = "editModal";
  modal.style.cssText = `position:fixed;inset:0;z-index:9000;background:rgba(10,7,18,.75);
    backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;
    padding:1rem;animation:fadeInModal .2s ease`;

  modal.innerHTML = `
    <style>
      @keyframes fadeInModal{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
      .edit-modal-inner{background:var(--white);border-radius:var(--radius-lg);max-width:600px;
        width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,.35);position:relative;padding:2rem}
      .edit-modal-close{position:absolute;top:1rem;right:1rem;background:var(--off-white);
        border:1px solid var(--silver-light);border-radius:50%;width:34px;height:34px;
        display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;
        color:var(--text-mid);transition:all .2s ease}
      .edit-modal-close:hover{background:var(--red-bg);color:var(--red-tag);border-color:var(--red-tag)}
    </style>
    <div class="edit-modal-inner">
      <button class="edit-modal-close" onclick="closeEditModal()"><i class="ti ti-x"></i></button>
      <h2 style="font-family:var(--font-serif);font-size:1.35rem;font-weight:700;
        color:var(--text-primary);margin-bottom:1.5rem;padding-bottom:.85rem;
        border-bottom:1px solid var(--silver-light)">
        <i class="ti ti-pencil" style="color:var(--purple);margin-right:8px"></i>Edit Listing #${item.id}
      </h2>
      <form id="editListingForm">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group">
            <label>Type</label>
            <select name="type">
              <option value="house-rent"${item.type==="house-rent"?" selected":""}>House for Rent</option>
              <option value="house-sale"${item.type==="house-sale"?" selected":""}>House for Sale</option>
              <option value="land-sale"${item.type==="land-sale"?" selected":""}>Land for Sale</option>
              <option value="land-rent"${item.type==="land-rent"?" selected":""}>Land for Rent</option>
            </select>
          </div>
          <div class="form-group">
            <label>District</label>
            <select name="locationKey">${districtOptions}</select>
          </div>
        </div>
        <div class="form-group">
          <label>Title <span class="req">*</span></label>
          <input type="text" name="title" value="${item.title}" required />
        </div>
        <div class="form-group">
          <label>Full Location <span class="req">*</span></label>
          <input type="text" name="location" value="${item.location}" required />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
          <div class="form-group">
            <label>Price (numbers only)</label>
            <input type="number" name="price" value="${item.price}" min="0" />
          </div>
          <div class="form-group">
            <label>Price Label</label>
            <input type="text" name="priceLabel" value="${item.priceLabel}" />
          </div>
        </div>
        <div class="form-group">
          <label>Price Note</label>
          <input type="text" name="priceNote" value="${item.priceNote}" />
        </div>
        <div class="form-group">
          <label>Features (comma-separated)</label>
          <input type="text" name="features" value="${item.features.join(", ")}" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="3">${item.description || ""}</textarea>
        </div>
        <!-- Photo management -->
        <div style="margin-bottom:1.25rem">
          <label style="display:block;font-size:.79rem;font-weight:500;color:var(--charcoal);margin-bottom:.75rem">
            <i class="ti ti-photo" style="color:var(--navy);margin-right:5px"></i>
            Photos (first = main cover) — up to 10
          </label>
          <div id="editPhotoGrid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(95px,1fr));gap:.6rem;margin-bottom:.75rem">
            ${(item.photos && item.photos.length > 0)
              ? item.photos.map((src, i) => `
                <div style="position:relative;height:85px;border-radius:6px;overflow:hidden;border:1px solid var(--silver-light);${i===0?'outline:2px solid var(--purple);':''}">
                  <img src="${src}" style="width:100%;height:100%;object-fit:cover" />
                  ${i===0 ? '<span style="position:absolute;bottom:0;left:0;right:0;background:var(--purple);color:#fff;font-size:.55rem;text-align:center;padding:2px">MAIN</span>' : ''}
                  <button type="button" onclick="editRemovePhoto(${i})"
                    style="position:absolute;top:3px;right:3px;background:rgba(153,27,27,.9);color:#fff;border:none;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:.65rem;cursor:pointer">
                    <i class="ti ti-x"></i>
                  </button>
                </div>`).join("")
              : '<p style="font-size:.8rem;color:var(--text-muted);grid-column:1/-1">No photos yet.</p>'}
          </div>
          <label style="border:2px dashed var(--silver-light);border-radius:8px;padding:1rem;text-align:center;cursor:pointer;display:block;background:var(--off-white);transition:all .2s ease"
            onmouseover="this.style.borderColor='var(--navy)';this.style.background='var(--navy-pale)'"
            onmouseout="this.style.borderColor='var(--silver-light)';this.style.background='var(--off-white)'">
            <i class="ti ti-cloud-upload" style="font-size:1.5rem;color:var(--navy-light);display:block;margin-bottom:.35rem;opacity:.6"></i>
            <span style="font-size:.78rem;color:var(--text-muted)">Click to add photos (JPG, PNG, WEBP)</span>
            <input type="file" accept="image/*" multiple id="editPhotoInput" style="display:none" onchange="editAddPhotos(this)" />
          </label>
          <p id="editPhotoUploadStatus" style="font-size:.75rem;color:var(--purple);margin-top:.4rem"></p>
        </div>
        <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1rem">
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.875rem">
            <input type="checkbox" name="available" ${item.available?"checked":""} style="accent-color:var(--purple);width:17px;height:17px" />
            Available (unchecked = Taken)
          </label>
          <label style="display:flex;align-items:center;gap:.5rem;cursor:pointer;font-size:.875rem">
            <input type="checkbox" name="featured" ${item.featured?"checked":""} style="accent-color:var(--purple);width:17px;height:17px" />
            Featured on home page
          </label>
        </div>
        <div class="form-status" id="editStatus" style="text-align:left;margin-bottom:.75rem"></div>
        <div style="display:flex;gap:.75rem">
          <button type="submit" class="btn btn--primary" style="flex:1;justify-content:center" id="editSaveBtn">
            <i class="ti ti-device-floppy"></i> Save Changes
          </button>
          <button type="button" class="btn btn--outline" onclick="closeEditModal()">Cancel</button>
        </div>
      </form>
    </div>`;

  document.body.appendChild(modal);
  modal.addEventListener("click", e => { if (e.target === modal) closeEditModal(); });
  document.body.style.overflow = "hidden";

  _editExistingPhotos = [...(item.photos || [])];
  _editNewFiles        = [];
  _editNewPreviews     = [];

  document.getElementById("editListingForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f       = e.target;
    const status  = document.getElementById("editStatus");
    const saveBtn = document.getElementById("editSaveBtn");
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="ti ti-loader-2 ti-spin"></i> Saving…'; }

    const rawFeats   = f.querySelector('[name="features"]').value;
    const features   = rawFeats.split(",").map(s => s.trim()).filter(Boolean);
    const type       = f.querySelector('[name="type"]').value;
    const landIcons  = ["ti-ruler","ti-certificate","ti-road","ti-mountain","ti-droplet"];
    const rentIcons  = ["ti-bed","ti-bath","ti-car","ti-bolt","ti-home"];

    /* Build final photo list: existing saved URLs + freshly uploaded new ones.
       Never includes the base64 previews — those were display-only. */
    let finalPhotos = [..._editExistingPhotos];
    if (_editNewFiles.length > 0) {
      const uploadStatus = document.getElementById("editPhotoUploadStatus");
      if (uploadStatus) uploadStatus.textContent = "Uploading photos…";
      for (const file of _editNewFiles) {
        const url = await kpUploadPhoto(file, "listings");
        if (url) finalPhotos.push(url);
      }
      if (uploadStatus) uploadStatus.textContent = "";
    }

    const updates = {
      type,
      location_key: f.querySelector('[name="locationKey"]').value,
      title:        f.querySelector('[name="title"]').value.trim(),
      location:     f.querySelector('[name="location"]').value.trim(),
      price:        parseInt(f.querySelector('[name="price"]').value, 10) || item.price,
      price_label:  f.querySelector('[name="priceLabel"]').value.trim(),
      price_note:   f.querySelector('[name="priceNote"]').value.trim(),
      features,
      feature_icons: features.map((_, i) => (type === 'land-sale' || type === 'land-rent') ? (landIcons[i] || 'ti-check') : (rentIcons[i] || 'ti-check')),
      description:  f.querySelector('[name="description"]').value.trim(),
      available:    f.querySelector('[name="available"]').checked,
      featured:     f.querySelector('[name="featured"]').checked,
      photos:       finalPhotos,
    };

    const { error } = await kpUpdateListing(item.id, updates);
    if (error) {
      if (status) { status.textContent = `Error: ${error}`; status.className = "form-status error"; }
      if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="ti ti-device-floppy"></i> Save Changes'; }
      return;
    }

    _bustListingCache();
    closeEditModal();
    await renderAdminTable();
    showToast("Listing updated successfully!");
  });
}

function closeEditModal() {
  document.getElementById("editModal")?.remove();
  document.body.style.overflow = "";
}

/* ── Edit-modal photo state ──
   _editExistingPhotos: URLs already saved in Supabase Storage for this listing.
   _editNewFiles:        raw File objects for newly-added photos (not yet uploaded).
   _editNewPreviews:     base64 preview strings, index-paired with _editNewFiles,
                         used only for instant on-screen preview before saving.
   Keeping these three separate (instead of one mixed array) is what prevents
   a photo from being counted twice — once as its preview, once as its
   uploaded URL — when the listing is saved. */
let _editExistingPhotos = [];
let _editNewFiles        = [];
let _editNewPreviews     = [];

function editAddPhotos(input) {
  const files = Array.from(input.files);
  const current = _editExistingPhotos.length + _editNewFiles.length;
  if (current + files.length > 10) { showToast("Maximum 10 photos allowed."); return; }
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      _editNewFiles.push(file);
      _editNewPreviews.push(ev.target.result); /* temporary base64 for preview only */
      _refreshEditPhotoGrid();
    };
    reader.readAsDataURL(file);
  });
  input.value = ""; /* allow re-selecting the same file again if removed */
}

function editRemovePhoto(idx) {
  if (idx < _editExistingPhotos.length) {
    _editExistingPhotos.splice(idx, 1);
  } else {
    const newIdx = idx - _editExistingPhotos.length;
    _editNewFiles.splice(newIdx, 1);
    _editNewPreviews.splice(newIdx, 1);
  }
  _refreshEditPhotoGrid();
}

function _refreshEditPhotoGrid() {
  const grid = document.getElementById("editPhotoGrid");
  if (!grid) return;
  /* Existing (already-uploaded) photos first, then new previews — matches
     the index math in editRemovePhoto above. */
  const allForDisplay = [..._editExistingPhotos, ..._editNewPreviews];
  if (allForDisplay.length === 0) {
    grid.innerHTML = '<p style="font-size:.8rem;color:var(--text-muted);grid-column:1/-1">No photos yet.</p>';
    return;
  }
  grid.innerHTML = allForDisplay.map((src, i) => `
    <div style="position:relative;height:85px;border-radius:6px;overflow:hidden;border:1px solid var(--silver-light);${i===0?'outline:2px solid var(--purple);':''}">
      <img src="${src}" style="width:100%;height:100%;object-fit:cover" />
      ${i===0 ? '<span style="position:absolute;bottom:0;left:0;right:0;background:var(--purple);color:#fff;font-size:.55rem;text-align:center;padding:2px">MAIN</span>' : ''}
      <button type="button" onclick="editRemovePhoto(${i})"
        style="position:absolute;top:3px;right:3px;background:rgba(153,27,27,.9);color:#fff;border:none;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:.65rem;cursor:pointer">
        <i class="ti ti-x"></i>
      </button>
    </div>`).join("");
}

async function toggleAvailability(id) {
  const listings = await getListings();
  const item     = listings.find(l => l.id === Number(id));
  if (!item) return;
  const { error } = await kpUpdateListing(id, { available: !item.available });
  if (!error) {
    _bustListingCache();
    await renderAdminTable();
    showToast(!item.available ? "Marked as Available." : "Marked as Taken.");
  }
}

async function toggleFeatured(id) {
  const listings = await getListings();
  const item     = listings.find(l => l.id === Number(id));
  if (!item) return;
  const { error } = await kpUpdateListing(id, { featured: !item.featured });
  if (!error) {
    _bustListingCache();
    await renderAdminTable();
    showToast(!item.featured ? "Marked as Featured." : "Removed from Featured.");
  }
}

async function deleteListing(id) {
  if (!confirm("Delete this listing permanently?")) return;
  const { error } = await kpDeleteListing(id);
  if (!error) {
    _bustListingCache();
    await renderAdminTable();
    showToast("Listing deleted.");
  }
}

async function resetAllListings() {
  if (!confirm("PERMANENTLY delete ALL listings?\nNothing will remain. This cannot be undone.")) return;
  const { error } = await kpDeleteAllListings();
  if (!error) {
    _bustListingCache();
    await renderAdminTable();
    showToast("All listings deleted.");
  }
}

/* ══════════════════════════════════════════
   ADMIN INBOX
   ══════════════════════════════════════════ */

let _inboxFilter = "all";
let _cachedMessages = [];

function setInboxFilter(cat) {
  _inboxFilter = cat;
  document.querySelectorAll(".inbox-cat-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.cat === cat);
  });
  renderInbox();
}

function _normCategory(type) {
  if (type === "reviews" || type === "review") return "reviews";
  if (type === "property-enquiry" || type === "enquiry") return "enquiry";
  return "contact";
}

const CATEGORY_META = {
  contact: { label: "Contact", icon: "ti-message",      cssTag: "contact" },
  reviews: { label: "Review",  icon: "ti-star",         cssTag: "reviews" },
  enquiry: { label: "Enquiry", icon: "ti-home-search",  cssTag: "enquiry" },
};

async function renderInbox() {
  const container = document.getElementById("inboxList");
  if (!container) return;

  const messages   = await getMessages();
  _cachedMessages  = messages;
  const totalUnread = messages.filter(m => m.unread).length;

  const badge = document.getElementById("inboxBadge");
  if (badge) { badge.textContent = totalUnread; badge.style.display = totalUnread > 0 ? "inline" : "none"; }

  const unreadCounts = { all: totalUnread, contact: 0, reviews: 0, enquiry: 0 };
  messages.filter(m => m.unread).forEach(m => {
    const c = m.category || _normCategory(m.type);
    if (unreadCounts[c] !== undefined) unreadCounts[c]++;
  });
  Object.keys(unreadCounts).forEach(cat => {
    const el = document.getElementById(`catCount-${cat}`);
    if (!el) return;
    const n = unreadCounts[cat];
    el.textContent   = n;
    el.style.display = n > 0 ? "" : "none";
  });

  const visible = _inboxFilter === "all"
    ? messages
    : messages.filter(m => (m.category || _normCategory(m.type)) === _inboxFilter);

  const visibleUnread = visible.filter(m => m.unread).length;
  const note = document.getElementById("inboxCountNote");
  if (note) {
    const catLabel = _inboxFilter === "all" ? "" : ` in ${CATEGORY_META[_inboxFilter]?.label || _inboxFilter}`;
    note.textContent = visibleUnread > 0
      ? `${visible.length} message${visible.length !== 1 ? "s" : ""}${catLabel} — ${visibleUnread} unread`
      : `${visible.length} message${visible.length !== 1 ? "s" : ""}${catLabel}`;
  }

  if (visible.length === 0) {
    const emptyLabel = _inboxFilter === "all" ? "" : CATEGORY_META[_inboxFilter]?.label.toLowerCase() || "";
    container.innerHTML = `<div class="inbox-empty">
      <i class="ti ti-mail-off"></i>
      <p>No ${emptyLabel} messages${emptyLabel ? "" : " yet"}.</p>
    </div>`;
    return;
  }

  container.innerHTML = visible.map(m => {
    const category = m.category || _normCategory(m.type);
    const meta     = CATEGORY_META[category] || CATEGORY_META.contact;
    const stars    = category === "reviews" && m.rating
      ? `<div class="inbox-msg__rating">${"★".repeat(m.rating)}${"☆".repeat(5 - m.rating)}</div>`
      : "";
    return `
    <div class="inbox-msg${m.unread ? " unread" : ""}" data-msgid="${m.id}">
      <div class="inbox-msg__header">
        <span class="inbox-msg__from">
          <span class="inbox-msg__cat-icon inbox-msg__cat-icon--${meta.cssTag}"><i class="ti ${meta.icon}"></i></span>
          ${escapeHtml(m.from)}
        </span>
        <span class="inbox-msg__time">${escapeHtml(m.time || new Date(m.created_at).toLocaleString("en-UG"))}</span>
      </div>
      <div class="inbox-msg__subject">${escapeHtml(m.subject || "No subject")}</div>
      ${stars}
      <div class="inbox-msg__body">${escapeHtml(m.body)}</div>
      <div class="inbox-msg__meta">
        <span class="inbox-msg__tag inbox-msg__tag--${meta.cssTag}"><i class="ti ${meta.icon}"></i> ${meta.label}</span>
        ${m.phone    ? `<span class="inbox-msg__tag"><i class="ti ti-phone"></i> ${escapeHtml(m.phone)}</span>`       : ""}
        ${m.email    ? `<span class="inbox-msg__tag"><i class="ti ti-mail"></i> ${escapeHtml(m.email)}</span>`        : ""}
        ${m.location ? `<span class="inbox-msg__tag"><i class="ti ti-map-pin"></i> ${escapeHtml(m.location)}</span>`  : ""}
        ${m.unread
          ? `<button class="inbox-read-btn" onclick="markOneRead('${m.id}')">
               <i class="ti ti-check"></i> Mark as Read
             </button>`
          : `<span class="inbox-msg__tag" style="color:var(--text-muted)"><i class="ti ti-eye"></i> Read</span>`}
        <button class="inbox-del-btn" onclick="deleteSingleMessage('${m.id}')">
          <i class="ti ti-trash"></i> Delete
        </button>
      </div>
    </div>`;
  }).join("");
}

/* ══════════════════════════════════════════
   TOAST
   ══════════════════════════════════════════ */

let _toastTimer = null;
function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

/* ══════════════════════════════════════════
   BACK TO TOP
   ══════════════════════════════════════════ */

function initBackToTop() {
  document.getElementById("backToTop")?.addEventListener("click",
    () => window.scrollTo({ top: 0, behavior: "smooth" }));
}

/* ══════════════════════════════════════════
   LOGOUT
   ══════════════════════════════════════════ */

async function handleLogout() {
  await kpSignOut();
  window.location.href = "login.html";
}

/* ══════════════════════════════════════════
   DOMContentLoaded INIT
   ══════════════════════════════════════════ */

document.addEventListener("DOMContentLoaded", async () => {
  initNavbar();
  updateCartBadge();
  initBackToTop();
  observeFadeIns();
  populateDistrictDropdowns();

  await renderHomeListings();
  await renderTeamGrid();
  initCounters();
  initHeroTags();
  initContactForm();
  await initPropertyFilters();
  initStarPicker();
  initReviewForm();
  await renderCartPage();
  await initAdmin();
  initLogin();

  const searchForm = document.getElementById("searchForm");
  if (searchForm) searchForm.addEventListener("submit", handleSearch);

  /* Subscribe to listing changes on public pages for live updates */
  if (!window.location.pathname.includes("admin") && !window.location.pathname.includes("login")) {
    kpSubscribeListings(async () => {
      _bustListingCache();
      await renderHomeListings();
      if (document.getElementById("allPropertiesGrid")) await renderPropertyPage();
    });
  }
});

/* ══════════════════════════════════════════
   GLOBAL EXPORTS  (inline onclick handlers)
   ══════════════════════════════════════════ */

window.toggleCart          = toggleCart;
window.openDetailModal     = openDetailModal;
window.closeDetailModal    = closeDetailModal;
window.openEditModal       = openEditModal;
window.closeEditModal      = closeEditModal;
window.removeCartItem      = removeCartItem;
window.removeFromCart      = removeFromCart;
window.toggleAvailability  = toggleAvailability;
window.toggleFeatured      = toggleFeatured;
window.deleteListing       = deleteListing;
window.resetAllListings    = resetAllListings;
window.getCart             = getCart;
window.getListings         = getListings;
window.isInCart            = isInCart;
window.showToast           = showToast;
window.renderAdminTable    = renderAdminTable;
window.renderInbox         = renderInbox;
window.deleteMessage       = deleteMessage;
window.deleteSingleMessage = async (id) => { await kpDeleteMessage(id); await renderInbox(); await renderAdminTable(); };
window.markAllRead         = markAllRead;
window.markOneRead         = async (id) => { await kpMarkOneRead(id); await renderInbox(); await renderAdminTable(); };
window.getMessages         = getMessages;
window.saveMessage         = saveMessage;
window.UGANDA_DISTRICTS    = UGANDA_DISTRICTS;
window.editAddPhotos       = editAddPhotos;
window.editRemovePhoto     = editRemovePhoto;
window.setInboxFilter      = setInboxFilter;
window.handleLogout        = handleLogout;
window._updateModalHeartBtn = _updateModalHeartBtn;
