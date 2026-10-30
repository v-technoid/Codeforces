// Shared tools for the platform readers: fetching with a timeout, a small
// in-memory cache, one error type, and helpers for reading HTML pages.

const TIMEOUT_MS = 9000;
const USER_AGENT = "Mozilla/5.0 (compatible; CoderStatsCard/3.1; +https://github.com/v-technoid/Codeforces)";

/**
 * kind:
 *   "not_found"    the platform says there's no such user
 *   "invalid"      the handle can't be valid on that platform
 *   "unavailable"  the platform didn't answer or answered with an error
 *   "changed"      the answer came back in a shape we don't recognise,
 *                  usually because the platform changed its page
 */
export class PlatformError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind;
  }
}

/** Fetches a URL and returns { status, text }. Network failures become PlatformError. */
export async function request(url, name, init = {}) {
  let res;
  try {
    res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "User-Agent": USER_AGENT, "Accept-Language": "en", ...(init.headers ?? {}) },
    });
  } catch {
    throw new PlatformError(`${name} did not respond, try again soon`, "unavailable");
  }
  return { status: res.status, text: await res.text().catch(() => "") };
}

/** Fetches JSON. 404 means the user doesn't exist; other errors mean the platform is unavailable. */
export async function getJson(url, name, init) {
  const { status, text } = await request(url, name, { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
  if (status === 404) throw new PlatformError(`No ${name} user with that handle`, "not_found");
  if (status === 429) throw new PlatformError(`${name} is limiting requests right now, try again in a minute`, "unavailable");
  if (status >= 400) throw new PlatformError(`${name} is unavailable right now`, "unavailable");
  try {
    return JSON.parse(text);
  } catch {
    throw new PlatformError(`${name} sent an unexpected response`, "changed");
  }
}

/** Fetches an HTML page. 404 means the user doesn't exist. */
export async function getPage(url, name) {
  const { status, text } = await request(url, name, { headers: { Accept: "text/html" } });
  if (status === 404) throw new PlatformError(`No ${name} user with that handle`, "not_found");
  if (status >= 400) throw new PlatformError(`${name} is unavailable right now`, "unavailable");
  return text;
}

export function changed(name) {
  return new PlatformError(
    `Couldn't read the ${name} profile. ${name} may have changed its page; please report it on GitHub.`,
    "changed",
  );
}

/* ---------- Cache ---------- */

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();

export function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = load();
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  return value;
}

/* ---------- Reading HTML without a parser ---------- */

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };

export function decode(text) {
  return text
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) => ENTITIES[e])
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Plain text of an HTML fragment, with tags removed and spaces collapsed. */
export function textOf(html) {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** The first number in a string, ignoring thousands separators. */
export function num(text) {
  const m = String(text ?? "").replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
}

/** Inner HTML of the first element whose opening tag matches `attrPattern`, e.g. class="rating-number". */
export function inner(html, attrPattern) {
  const open = new RegExp(`<([a-z0-9]+)[^>]*${attrPattern}[^>]*>`, "i").exec(html);
  if (!open) return undefined;
  const tag = open[1];
  const start = open.index + open[0].length;
  // Walk forward to the matching close tag, counting nested tags of the same name.
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = start;
  let depth = 1;
  let m;
  while ((m = re.exec(html))) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(start, m.index);
  }
  return html.slice(start);
}

/* ---------- Activity from a day by day count ---------- */

const DAY = 86400;

/**
 * Builds the 53 week activity grid the heatmap card uses from a map of
 * UTC day index (days since 1970) to count.
 */
export function activityFromDays(days, now = new Date()) {
  const today = Math.floor(now.getTime() / 1000 / DAY);
  const weekday = new Date(today * DAY * 1000).getUTCDay();
  const start = today - weekday - 52 * 7;
  const counts = new Array(today - start + 1).fill(0);
  for (const [day, count] of days) {
    const i = Number(day) - start;
    if (i >= 0 && i < counts.length) counts[i] += Number(count) || 0;
  }
  return {
    start: new Date(start * DAY * 1000).toISOString().slice(0, 10),
    counts,
    total: counts.reduce((a, b) => a + b, 0),
    activeDays: counts.filter((c) => c > 0).length,
  };
}

export const dayOf = (seconds) => Math.floor(seconds / DAY);

/** Handles on most platforms use letters, digits, underscore, dot and minus. */
export function checkHandle(handle, name, pattern = /^[A-Za-z0-9_.\-]{1,40}$/) {
  if (!pattern.test(handle)) throw new PlatformError(`That doesn't look like a ${name} handle`, "invalid");
}
