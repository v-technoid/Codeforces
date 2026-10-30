import { summarize } from "./codeforces.js";
// Small seeded random generator so the sample looks the same on the server and in the browser.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}
const TAGS = [
  "implementation",
  "math",
  "greedy",
  "dp",
  "constructive algorithms",
  "brute force",
  "sortings",
  "binary search",
  "graphs",
  "strings",
  "number theory",
  "trees",
  "dfs and similar",
];
const CONTEST_NAMES = [
  "Codeforces Round 1012 (Div. 2)",
  "Educational Codeforces Round 178",
  "Codeforces Round 1018 (Div. 1 + Div. 2)",
  "Codeforces Round 1021 (Div. 2)",
  "Codeforces Global Round 29",
  "Educational Codeforces Round 180",
  "Codeforces Round 1030 (Div. 2)",
  "Codeforces Round 1034 (Div. 3)",
];
// A fixed date keeps the sample identical every time the page loads.
const SAMPLE_NOW = new Date("2026-10-20T12:00:00Z");
/** Builds believable stats for previews and the hero. Never shown as someone's real data. */
export function makeSample(
  { handle, start, end, contests, solvedPerDay, seed, country, friends },
  now = SAMPLE_NOW,
) {
  const rand = rng(seed);
  const nowS = Math.floor(now.getTime() / 1000);
  const span = 3 * 365 * 86400;
  const ratings = [];
  let r = start;
  for (let i = 0; i < contests; i++) {
    const target = start + ((end - start) * (i + 1)) / contests;
    const next = Math.round(target + (rand() - 0.5) * 140);
    ratings.push({
      contestId: 1900 + i,
      contestName: CONTEST_NAMES[i % CONTEST_NAMES.length].replace(/\d{3,4}/, (m) =>
        String(Number(m) - (contests - i) * 3),
      ),
      rank: Math.max(1, Math.round(3000 - (next - 800) * 1.1 + rand() * 600)),
      oldRating: r,
      newRating: next,
      ratingUpdateTimeSeconds: nowS - span + Math.round((span * i) / contests) + 86400,
    });
    r = next;
  }
  if (ratings.length) ratings[ratings.length - 1].newRating = end;
  const submissions = [];
  for (let d = 0; d < 400; d++) {
    const busy = rand() < 0.62;
    if (!busy && d > 3) continue;
    const n = Math.max(1, Math.round(rand() * solvedPerDay * 2));
    for (let k = 0; k < n; k++) {
      const ok = rand() < 0.68;
      const rating = 800 + Math.round((Math.min(1, Math.pow(rand(), 1.6)) * (end - 600)) / 100) * 100;
      submissions.push({
        creationTimeSeconds: nowS - d * 86400 - Math.round(rand() * 80000),
        verdict: ok ? "OK" : "WRONG_ANSWER",
        problem: {
          contestId: 1500 + Math.floor(rand() * 600),
          index: "ABCDE"[Math.floor(rand() * 5)],
          rating: rand() < 0.05 ? undefined : rating,
          tags: [
            TAGS[Math.floor(Math.pow(rand(), 1.8) * TAGS.length)],
            TAGS[Math.floor(rand() * TAGS.length)],
          ],
        },
      });
    }
  }
  const user = {
    handle,
    rating: end,
    maxRating: Math.max(end, ...ratings.map((x) => x.newRating)),
    contribution: Math.round(rand() * 20),
    friendOfCount: friends ?? Math.round(10 + rand() * 120),
    country,
  };
  return summarize(user, ratings, submissions, now);
}

/** A believable list of upcoming contests for previews, relative to `now`. */
export function sampleUpcoming(now = new Date()) {
  const base = Math.floor(now.getTime() / 1000);
  const at = (days, hour) => {
    const d = new Date((base + days * 86400) * 1000);
    d.setUTCHours(hour, 35, 0, 0);
    return Math.floor(d.getTime() / 1000);
  };
  return [
    { site: "codeforces", name: "Codeforces Round (Div. 2)", startTimeSeconds: at(1, 14), durationSeconds: 7200 },
    { site: "atcoder", name: "AtCoder Beginner Contest", startTimeSeconds: at(2, 12), durationSeconds: 6000 },
    { site: "leetcode", name: "Weekly Contest", startTimeSeconds: at(3, 2), durationSeconds: 5400 },
    { site: "codechef", name: "CodeChef Starters", startTimeSeconds: at(4, 14), durationSeconds: 7200 },
    { site: "codeforces", name: "Educational Codeforces Round (Rated for Div. 2)", startTimeSeconds: at(5, 14), durationSeconds: 7200 },
    { site: "leetcode", name: "Biweekly Contest", startTimeSeconds: at(6, 14), durationSeconds: 5400 },
  ];
}

/**
 * Sample stats for any platform, in the shared platform shape, so previews
 * show something sensible before a handle is entered.
 */
export function samplePlatformStats(platform, now = SAMPLE_NOW) {
  const rand = rng(platform.id.length * 97 + 3);
  const nowS = Math.floor(now.getTime() / 1000);
  const tiers = platform.tiers;
  // Aim for the middle of the third tier, so the ring and bands have something to show.
  const target = platform.id === "leetcode" ? 1780 : tiers ? Math.round((tiers[Math.min(2, tiers.length - 1)].min + (tiers[Math.min(3, tiers.length - 1)].min || 1600)) / 2) : undefined;
  let history = [];
  if (tiers) {
    let r = Math.max(0, target - 450);
    history = Array.from({ length: 32 }, (_, i) => {
      const old = r;
      r = Math.round(r + (target - r) * 0.12 + (rand() - 0.45) * 60);
      return { time: nowS - (32 - i) * 12 * 86400, rating: r, old, name: `${platform.name} Contest ${100 + i}`, rank: 200 + Math.floor(rand() * 3000) };
    });
  }
  const rating = history.at(-1)?.rating;
  const tier = tiers && rating !== undefined ? tiers.filter((t) => rating >= t.min).pop() : null;
  const days = [];
  const today = Math.floor(nowS / 86400);
  for (let d = 0; d < 365; d++) if (rand() < 0.5) days.push([today - d, 1 + Math.floor(rand() * 5)]);
  const counts = new Array(53 * 7).fill(0);
  const weekday = new Date(today * 86400000).getUTCDay();
  const start = today - weekday - 52 * 7;
  for (const [day, n] of days) if (day - start >= 0 && day - start < counts.length) counts[day - start] += n;

  const breakdown = {
    leetcode: [["Easy", 180, 860, "#00a38b", "#00b8a3"], ["Medium", 240, 1789, "#d99a00", "#ffc01e"], ["Hard", 52, 763, "#e0283f", "#ef4743"]],
    gfg: [["School", 18], ["Basic", 60], ["Easy", 130], ["Medium", 90], ["Hard", 18]],
    hackerrank: [["Problem Solving", 150], ["C++", 30], ["Python", 20], ["SQL", 12]],
    codewars: [["python", 1200], ["javascript", 300], ["cpp", 80]],
  }[platform.id];
  const palette = [["#6b7280", "#9ca3af"], ["#2563eb", "#60a5fa"], ["#15803d", "#4ade80"], ["#c2790a", "#fbbf24"], ["#dc2626", "#f87171"]];
  const difficulty = breakdown?.map(([label, count, total, light, dark], i) => ({
    label,
    count,
    total,
    color: { light: light ?? palette[i % 5][0], dark: dark ?? palette[i % 5][1] },
  }));
  const solved = difficulty ? difficulty.reduce((a, d) => a + d.count, 0) : 240 + Math.floor(rand() * 300);

  return {
    platform: platform.id,
    handle: "your_handle",
    rating,
    maxRating: history.length ? Math.max(...history.map((h) => h.rating)) : undefined,
    rankLabel: platform.id === "codewars" ? "4 kyu" : tier?.name,
    rankColor: platform.id === "codewars" ? { light: "#2f6db3", dark: "#5c9bdb" } : undefined,
    contests: history.length || undefined,
    bestRank: history.length ? Math.min(...history.map((h) => h.rank)) : undefined,
    history,
    solved,
    difficulty,
    primary: { label: platform.id === "gfg" ? "coding score" : platform.id === "spoj" ? "points" : platform.id === "kattis" ? "score" : "solved", value: platform.id === "gfg" ? 980 : platform.id === "spoj" ? 84.2 : platform.id === "kattis" ? 512.4 : solved },
    facts: [
      { label: "Global rank", value: "#24,310" },
      { label: "Streak", value: "12 days" },
    ],
    activity: {
      start: new Date(start * 86400000).toISOString().slice(0, 10),
      counts: counts.slice(0, today - start + 1),
      total: counts.reduce((a, b) => a + b, 0),
      activeDays: counts.filter(Boolean).length,
    },
  };
}
