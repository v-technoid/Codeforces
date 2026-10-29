const API = "https://codeforces.com/api";
const TIMEOUT_MS = 9000;
export class CodeforcesError extends Error {
  kind;
  constructor(message, kind) {
    super(message);
    this.kind = kind;
  }
}
// Codeforces handles use letters, digits, underscore, dot and minus.
const HANDLE_PATTERN = /^[A-Za-z0-9_.-]{1,24}$/;
export function isValidHandle(handle) {
  return HANDLE_PATTERN.test(handle);
}
async function call(method, query) {
  let res;
  try {
    res = await fetch(`${API}/${method}?${query}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Accept: "application/json" },
    });
  } catch {
    throw new CodeforcesError("Codeforces did not respond, try again soon", "unavailable");
  }
  let body;
  try {
    body = await res.json();
  } catch {
    throw new CodeforcesError("Codeforces sent an unexpected response", "unavailable");
  }
  if (body.status === "OK") return body.result;
  const comment = body.comment ?? "";
  if (/not found/i.test(comment)) {
    throw new CodeforcesError("No Codeforces user with that handle", "not_found");
  }
  throw new CodeforcesError("Codeforces is unavailable right now", "unavailable");
}
// A small in-memory cache, so a README with several cards for the same
// handle doesn't hit Codeforces once per card on a warm server.
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map();
function cached(key, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  const value = load();
  cache.set(key, { at: Date.now(), value });
  value.catch(() => cache.delete(key));
  if (cache.size > 300) cache.delete(cache.keys().next().value);
  return value;
}
export async function getCardStats(handle, { submissions = false } = {}) {
  if (!isValidHandle(handle)) {
    throw new CodeforcesError("That doesn't look like a Codeforces handle", "invalid");
  }
  const key = handle.toLowerCase();
  const q = encodeURIComponent(handle);
  // Rating history is a bonus on the main card, so the card still renders if
  // only that call fails.
  const [users, ratings, subs] = await Promise.all([
    cached(`info:${key}`, () => call("user.info", `handles=${q}`)),
    cached(`rating:${key}`, () => call("user.rating", `handle=${q}`)).catch(() => []),
    submissions
      ? cached(`status:${key}`, () => call("user.status", `handle=${q}`).then(trimSubmissions))
      : Promise.resolve(undefined),
  ]);
  const user = users[0];
  if (!user) throw new CodeforcesError("No Codeforces user with that handle", "not_found");
  return summarize(user, ratings, subs);
}
// Submissions can be several megabytes; keep only the fields we use in memory.
function trimSubmissions(list) {
  return list.map((s) => ({
    creationTimeSeconds: s.creationTimeSeconds,
    verdict: s.verdict,
    problem: {
      contestId: s.problem.contestId,
      problemsetName: s.problem.problemsetName,
      index: s.problem.index,
      rating: s.problem.rating,
      tags: s.problem.tags,
    },
  }));
}
export function summarize(user, ratings, submissions, now = new Date()) {
  const best = ratings.length ? Math.min(...ratings.map((r) => r.rank)) : undefined;
  return {
    user,
    contests: ratings.length,
    bestContestRank: best,
    history: ratings.slice(-30).map((r) => r.newRating),
    ratings: ratings.map((r) => ({
      contestId: r.contestId,
      contestName: r.contestName,
      rank: r.rank,
      oldRating: r.oldRating,
      newRating: r.newRating,
      ratingUpdateTimeSeconds: r.ratingUpdateTimeSeconds,
    })),
    solved: submissions ? summarizeSolved(submissions, now) : undefined,
    activity: submissions ? summarizeActivity(submissions, now) : undefined,
  };
}
const BUCKETS = [
  { label: "800 to 1199", from: 800, to: 1199 },
  { label: "1200 to 1599", from: 1200, to: 1599 },
  { label: "1600 to 1999", from: 1600, to: 1999 },
  { label: "2000 to 2399", from: 2000, to: 2399 },
  { label: "2400 and up", from: 2400, to: Infinity },
];
const DAY = 86400;
const dayIndex = (seconds) => Math.floor(seconds / DAY);
const isoDay = (index) => new Date(index * DAY * 1000).toISOString().slice(0, 10);
export function summarizeSolved(submissions, now = new Date()) {
  const solved = new Map();
  const acceptedDays = new Set();
  let accepted = 0;
  for (const s of submissions) {
    if (s.verdict !== "OK") continue;
    accepted++;
    acceptedDays.add(dayIndex(s.creationTimeSeconds));
    const key = `${s.problem.contestId ?? s.problem.problemsetName ?? "x"}-${s.problem.index}`;
    if (!solved.has(key)) solved.set(key, s.problem);
  }
  const buckets = BUCKETS.map((b) => ({ ...b, count: 0 }));
  const tags = new Map();
  let unrated = 0;
  let hardest;
  for (const p of solved.values()) {
    if (p.rating) {
      const bucket = buckets.find((b) => p.rating >= b.from && p.rating <= b.to) ?? buckets[0];
      bucket.count++;
      hardest = Math.max(hardest ?? 0, p.rating);
    } else {
      unrated++;
    }
    for (const t of p.tags ?? []) {
      if (t.startsWith("*")) continue; // "*special" marks, not real topics
      tags.set(t, (tags.get(t) ?? 0) + 1);
    }
  }
  const topTags = [...tags.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 6)
    .map(([tag, count]) => ({ tag, count }));
  // Streaks count UTC days with at least one accepted submission. Today not
  // being solved yet doesn't break the current streak.
  const today = dayIndex(now.getTime() / 1000);
  let currentStreak = 0;
  let d = acceptedDays.has(today) ? today : today - 1;
  while (acceptedDays.has(d)) {
    currentStreak++;
    d--;
  }
  let longestStreak = 0;
  let run = 0;
  let prev;
  for (const day of [...acceptedDays].sort((a, b) => a - b)) {
    run = prev !== undefined && day === prev + 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = day;
  }
  return {
    total: solved.size,
    submissions: submissions.length,
    accepted,
    buckets,
    unrated,
    topTags,
    currentStreak,
    longestStreak,
    hardest,
  };
}
export function summarizeActivity(submissions, now = new Date()) {
  const today = dayIndex(now.getTime() / 1000);
  // Start on the Sunday 52 full weeks back, so the grid has 53 aligned columns.
  const weekday = new Date(today * DAY * 1000).getUTCDay();
  const start = today - weekday - 52 * 7;
  const counts = new Array(today - start + 1).fill(0);
  for (const s of submissions) {
    const i = dayIndex(s.creationTimeSeconds) - start;
    if (i >= 0 && i < counts.length) counts[i]++;
  }
  return {
    start: isoDay(start),
    counts,
    total: counts.reduce((a, b) => a + b, 0),
    activeDays: counts.filter((c) => c > 0).length,
  };
}

/** The next Codeforces contests that haven't started, soonest first. */
export async function getUpcomingContests() {
  const list = await cached("contests:upcoming", () =>
    call("contest.list", "gym=false").then((all) =>
      all
        .filter((c) => c.phase === "BEFORE")
        .map((c) => ({
          id: c.id,
          name: c.name,
          startTimeSeconds: c.startTimeSeconds,
          durationSeconds: c.durationSeconds,
        })),
    ),
  );
  const now = Math.floor(Date.now() / 1000);
  // The cached list can include contests that started since it was fetched.
  return list.filter((c) => c.startTimeSeconds > now - 60).sort((a, b) => a.startTimeSeconds - b.startTimeSeconds);
}
