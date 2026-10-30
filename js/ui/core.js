// Shared page state and helpers used by every section of the page.
import { getCardStats, getUpcomingContests } from "../lib/codeforces.js";
import { getPlatform, PLATFORMS } from "../lib/platforms/index.js";
import { makeSample, samplePlatformStats, sampleUpcoming } from "../lib/sample.js";
import { SITE_URL } from "../lib/site.js";
import { themeList } from "../lib/themes.js";

export const $ = (id) => document.getElementById(id);

export const esc = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const toDataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const cleanHandle = (value) => value.trim().replace(/^@/, "");

// Links in snippets always point at the public site, so a README made on a
// preview deployment or on localhost still works after you paste it.
export const ORIGIN = SITE_URL;

export const REPO = { owner: "v-technoid", name: "Codeforces" };
export const REPO_URL = `https://github.com/${REPO.owner}/${REPO.name}`;

export const BROWSER_TZ = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
})();

// Shown until someone enters a handle, so the page never looks empty.
export const SAMPLE = makeSample({
  handle: "your_handle",
  start: 1150,
  end: 1734,
  contests: 42,
  solvedPerDay: 3,
  seed: 11,
  country: "India",
});

/* ---------- State ---------- */

export const state = {
  platform: "codeforces", // the platform picked in the hero
  stats: null, // Codeforces: quick data for the person who searched
  full: null, // Codeforces: the same plus solved problems and activity
  loadingFull: false,
  pstats: null, // any other platform: stats in the shared platform shape
  upcoming: null, // live upcoming contests, once loaded
  upcomingIsSample: true,
  multi: null, // results for the combined card: { [platformId]: { stats } | { error } }
  multiKey: "", // which handles `multi` was loaded for
};

export const currentPlatform = () => getPlatform(state.platform);
export const isCodeforces = () => state.platform === "codeforces";

/** Codeforces data for the Codeforces cards (sample until a handle is loaded). */
export const shown = () => state.full ?? state.stats ?? SAMPLE;
/** Whether the picked platform has real data loaded. */
export const isReal = () => (isCodeforces() ? !!state.stats : !!state.pstats);
export const platformStats = () => state.pstats ?? samplePlatformStats(currentPlatform());
export const handleOrPlaceholder = () => {
  if (isCodeforces()) return state.stats ? state.stats.user.handle : "YOUR_HANDLE";
  return state.pstats ? state.pstats.handle : "YOUR_HANDLE";
};
export const upcomingData = () => state.upcoming ?? sampleUpcoming();

// Shown in the combined card until real handles are entered.
const SAMPLE_MULTI = Object.fromEntries(
  ["codeforces", "leetcode", "atcoder", "codechef"].map((id) => [id, { stats: samplePlatformStats(getPlatform(id)) }]),
);
export const multiData = () => state.multi ?? SAMPLE_MULTI;

/** The data a card is drawn from, or null if it needs nothing. */
export function dataFor(card) {
  if (card.needs === "upcoming") return upcomingData();
  if (card.needs === "multi") return multiData();
  if (card.anyPlatform && !isCodeforces()) return platformStats();
  if (card.needsHandle) return shown();
  return null;
}

// Sections register here to redraw when the data changes.
const listeners = new Set();
export const subscribe = (fn) => listeners.add(fn);
export const notify = () => listeners.forEach((fn) => fn());

/* ---------- Data ---------- */

/** Fetches JSON from this site's API; returns null when the API isn't there (opened as a file). */
async function api(path) {
  let res;
  try {
    res = await fetch(path);
  } catch {
    return null;
  }
  if (!res.headers.get("content-type")?.includes("application/json")) return null;
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Something went wrong.");
  return body;
}

/** Stats through /api/stats, or straight from Codeforces when the API isn't available. */
export async function fetchStats(handle, full = false) {
  const body = await api(`api/stats?username=${encodeURIComponent(handle)}${full ? "&full=1" : ""}`);
  if (body) return body.stats;
  return getCardStats(handle, { submissions: full });
}

/** Stats for a platform other than Codeforces, through /api/profile. */
export async function fetchProfile(platformId, handle, full = false) {
  const body = await api(`api/profile?platform=${platformId}&username=${encodeURIComponent(handle)}${full ? "&full=1" : ""}`);
  if (!body) {
    throw new Error("Other platforms need the site's server. Run node server.js and open the page from there.");
  }
  return body.stats;
}

/** Loads the combined card's data for these handles, a moment after typing stops. */
let multiTimer = 0;
export function loadMulti(handles) {
  const filled = Object.entries(handles).filter(([id, h]) => h && PLATFORMS.some((p) => p.id === id));
  const key = filled.map(([id, h]) => `${id}=${h}`).join("&");
  if (key === state.multiKey) return;
  clearTimeout(multiTimer);
  multiTimer = setTimeout(async () => {
    state.multiKey = key;
    if (!filled.length) {
      state.multi = null;
      return notify();
    }
    try {
      const body = await api(`api/profile?${filled.map(([id, h]) => `${id}=${encodeURIComponent(h)}`).join("&")}`);
      state.multi = body ? body.results : Object.fromEntries(filled.map(([id]) => [id, { error: "Needs node server.js" }]));
    } catch {
      state.multi = Object.fromEntries(filled.map(([id]) => [id, { error: "Couldn't load" }]));
    }
    notify();
  }, 600);
}

/** Loads the live upcoming contest list once; previews use sample contests until then. */
export async function loadUpcoming() {
  try {
    const body = await api("api/contests");
    // Without the site's server, only Codeforces can be read straight from the browser.
    const list = body ? body.contests : (await getUpcomingContests()).map((c) => ({ ...c, site: "codeforces" }));
    state.upcoming = list;
    state.upcomingIsSample = false;
    notify();
  } catch {
    // Keep the sample list; the real card still loads live data on GitHub.
  }
}

/* ---------- Small shared UI pieces ---------- */

export function themeChipsHtml(selected) {
  return themeList
    .map(
      (t) => `<button type="button" role="radio" class="chip" data-theme="${t.id}" aria-checked="${t.id === selected}">
        <span class="swatch" style="background:linear-gradient(135deg, ${t.background} 55%, ${t.title} 55%);border-color:${t.border}"></span>${t.label}
      </button>`,
    )
    .join("");
}

/** Copies text, or selects it so it can be copied by hand when the clipboard is blocked. */
export async function copyText(text, fallbackEl) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (fallbackEl) window.getSelection()?.selectAllChildren(fallbackEl);
    return false;
  }
}

/** Keeps keyboard focus on the same control when a section redraws its HTML. */
export function rememberFocus() {
  const el = document.activeElement;
  if (!el?.dataset) return () => {};
  const box = el.closest("[id]");
  let selector = null;
  for (const attr of ["field", "theme", "tab", "type", "param", "section"]) {
    if (el.dataset[attr] !== undefined && box) {
      selector = `#${box.id} [data-${attr}="${el.dataset[attr]}"]`;
      break;
    }
  }
  return () => selector && document.querySelector(selector)?.focus();
}
