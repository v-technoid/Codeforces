// Every supported platform, and helpers that work the same for all of them.
//
// Each platform reader returns stats in one shared shape:
// {
//   platform, handle, name?,
//   rating?, maxRating?, rankLabel?, rankColor?,   // for rated platforms
//   contests?, bestRank?, history?: [{ time?, rating, old?, name?, rank? }],
//   solved?, difficulty?: [{ label, count, total?, color: { light, dark } }],
//   primary?: { label, value },                   // the big number when there's no rating
//   facts: [{ label, value }],                     // smaller numbers, empty ones are skipped
//   activity?,                                     // same format as the heatmap card
// }
import { atcoder } from "./atcoder.js";
import { codechef } from "./codechef.js";
import { codeforces } from "./codeforces.js";
import { gfg } from "./gfg.js";
import { leetcode } from "./leetcode.js";
import { codewars, cses, dmoj, hackerrank, kattis, spoj, topcoder, uva } from "./more.js";

export { PlatformError } from "./http.js";

export const PLATFORMS = [codeforces, leetcode, atcoder, codechef, gfg, hackerrank, topcoder, codewars, dmoj, spoj, kattis, uva, cses];

export function getPlatform(id) {
  const key = String(id ?? "codeforces").trim().toLowerCase();
  const aliases = { cf: "codeforces", lc: "leetcode", ac: "atcoder", cc: "codechef", geeksforgeeks: "gfg", hr: "hackerrank", tc: "topcoder", cw: "codewars", uhunt: "uva" };
  return PLATFORMS.find((p) => p.id === (aliases[key] ?? key)) ?? null;
}

/** The tier for a rating on a platform, or null for unrated or tierless platforms. */
export function tierFor(platform, rating) {
  if (!platform.tiers || rating === undefined || rating === null) return null;
  let found = platform.tiers[0];
  for (const t of platform.tiers) if (rating >= t.min) found = t;
  return found;
}

export function nextTierFor(platform, rating) {
  if (!platform.tiers || rating === undefined) return null;
  return platform.tiers.find((t) => t.min > rating) ?? null;
}

/** The color that represents a user: their tier color, a platform given color, or the platform accent. */
export function colorFor(platform, stats, dark) {
  const tier = tierFor(platform, stats?.rating);
  const c = tier ?? stats?.rankColor ?? platform.accent;
  return dark ? c.dark : c.light;
}

// Which cards each platform can fill, given the data it shares.
const SUPPORT = {
  codeforces: ["stats", "rating", "solved", "heatmap", "contests", "badge"],
  leetcode: ["stats", "rating", "solved", "heatmap", "contests", "badge"],
  atcoder: ["stats", "rating", "contests", "badge"],
  codechef: ["stats", "rating", "contests", "badge"],
  gfg: ["stats", "solved", "badge"],
  hackerrank: ["stats", "solved", "badge"],
  topcoder: ["stats", "badge"],
  codewars: ["stats", "solved", "badge"],
  dmoj: ["stats", "rating", "badge"],
  spoj: ["stats", "badge"],
  kattis: ["stats", "badge"],
  uva: ["stats", "heatmap", "badge"],
  cses: ["stats", "badge"],
};

export function supportedCards(platform) {
  return SUPPORT[platform.id] ?? ["stats", "badge"];
}

/** Fetches stats for many platforms at once. Failures come back as { error } instead of throwing. */
export async function fetchMany(handles) {
  const entries = PLATFORMS.filter((p) => handles[p.id]).map(async (p) => {
    try {
      return [p.id, { stats: await p.fetch(handles[p.id]) }];
    } catch (err) {
      return [p.id, { error: err.message || "Couldn't load" }];
    }
  });
  return Object.fromEntries(await Promise.all(entries));
}
