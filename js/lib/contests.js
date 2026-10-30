// Upcoming contests from several platforms, merged into one list sorted by start time.
// Each source is asked separately; if one site is down or changes its page,
// the others still show.
//
// Every contest: { site, name, url, startTimeSeconds, durationSeconds }
import { getUpcomingContests as codeforcesUpcoming } from "./codeforces.js";
import { cached, getJson, getPage, request, textOf } from "./platforms/http.js";

export const CONTEST_SITES = [
  { id: "codeforces", name: "Codeforces", short: "CF", url: "https://codeforces.com/contests", color: { light: "#1f6fb2", dark: "#5aa6e6" } },
  { id: "leetcode", name: "LeetCode", short: "LC", url: "https://leetcode.com/contest/", color: { light: "#d97706", dark: "#ffa116" } },
  { id: "atcoder", name: "AtCoder", short: "AC", url: "https://atcoder.jp/contests/", color: { light: "#222222", dark: "#e6e6e6" } },
  { id: "codechef", name: "CodeChef", short: "CC", url: "https://www.codechef.com/contests", color: { light: "#5b4638", dark: "#c9a98f" } },
];
export const DEFAULT_SITES = CONTEST_SITES.map((s) => s.id);
export const siteInfo = (id) => CONTEST_SITES.find((s) => s.id === id) ?? CONTEST_SITES[0];

async function codeforces() {
  const list = await codeforcesUpcoming();
  return list.map((c) => ({
    site: "codeforces",
    name: c.name,
    url: `https://codeforces.com/contests/${c.id}`,
    startTimeSeconds: c.startTimeSeconds,
    durationSeconds: c.durationSeconds,
  }));
}

async function leetcode() {
  const ask = async (query) => {
    const { status, text } = await request("https://leetcode.com/graphql", "LeetCode", {
      method: "POST",
      headers: { "Content-Type": "application/json", Referer: "https://leetcode.com/contest/", Origin: "https://leetcode.com" },
      body: JSON.stringify({ query }),
    });
    if (status >= 400) throw new Error("LeetCode unavailable");
    return JSON.parse(text)?.data;
  };
  // LeetCode has used both of these names for the same list.
  let items;
  try {
    items = (await ask("{ upcomingContests { title titleSlug startTime duration } }"))?.upcomingContests;
  } catch {
    items = null;
  }
  if (!Array.isArray(items)) items = (await ask("{ topTwoContests { title titleSlug startTime duration } }"))?.topTwoContests;
  return (items ?? []).map((c) => ({
    site: "leetcode",
    name: c.title,
    url: `https://leetcode.com/contest/${c.titleSlug}`,
    startTimeSeconds: Number(c.startTime),
    durationSeconds: Number(c.duration),
  }));
}

/** AtCoder lists upcoming contests in a table on its contests page. */
export function parseAtcoderContests(html) {
  const start = html.search(/id=["']contest-table-upcoming["']/);
  if (start < 0) return [];
  const table = html.slice(start, html.indexOf("</table>", start));
  const out = [];
  for (const row of table.split(/<tr[\s>]/i).slice(2)) {
    const time = /<time[^>]*>([^<]+)<\/time>/i.exec(row)?.[1];
    const link = /<a href=["'](\/contests\/[^"'?#]+)["'][^>]*>([\s\S]*?)<\/a>/i.exec(row);
    const dur = /<td[^>]*>\s*(\d+):(\d{2})\s*<\/td>/i.exec(row);
    if (!time || !link) continue;
    // Times look like "2026-11-01 21:00:00+0900".
    const iso = time.trim().replace(" ", "T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2");
    const startTimeSeconds = Math.floor(Date.parse(iso) / 1000);
    if (!Number.isFinite(startTimeSeconds)) continue;
    out.push({
      site: "atcoder",
      name: textOf(link[2]).replace(/^[◉ⒽⒶⒷ\s]+/, ""),
      url: `https://atcoder.jp${link[1]}`,
      startTimeSeconds,
      durationSeconds: dur ? Number(dur[1]) * 3600 + Number(dur[2]) * 60 : 6000,
    });
  }
  return out;
}

async function atcoder() {
  return parseAtcoderContests(await getPage("https://atcoder.jp/contests/?lang=en", "AtCoder"));
}

async function codechef() {
  const body = await getJson(
    "https://www.codechef.com/api/list/contests/all?sort_by=START&sorting_order=asc&offset=0&mode=all",
    "CodeChef",
  );
  return (body?.future_contests ?? []).map((c) => ({
    site: "codechef",
    name: c.contest_name,
    url: `https://www.codechef.com/${c.contest_code}`,
    startTimeSeconds: Math.floor(Date.parse(c.contest_start_date_iso) / 1000),
    durationSeconds: Number(c.contest_duration) * 60,
  }));
}

const SOURCES = { codeforces, leetcode, atcoder, codechef };

/** Upcoming contests from the given sites, soonest first. Sites that fail are skipped. */
export async function getAllUpcoming(sites = DEFAULT_SITES) {
  const wanted = sites.filter((s) => SOURCES[s]);
  const results = await Promise.allSettled(wanted.map((s) => cached(`upcoming:${s}`, SOURCES[s])));
  const now = Math.floor(Date.now() / 1000);
  const list = results
    .flatMap((r) => (r.status === "fulfilled" ? r.value : []))
    .filter((c) => Number.isFinite(c.startTimeSeconds) && c.startTimeSeconds > now - 60);
  // If every source failed, say so instead of showing an empty schedule.
  if (!list.length && results.length && results.every((r) => r.status === "rejected")) throw results[0].reason;
  return list.sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
}
