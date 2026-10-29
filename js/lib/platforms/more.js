// The remaining platforms. Each is small, so they share one file.
import {
  activityFromDays,
  cached,
  changed,
  checkHandle,
  dayOf,
  getJson,
  getPage,
  num,
  PlatformError,
  textOf,
} from "./http.js";

const fmt = (n) => (n === undefined || n === null ? undefined : Number(n).toLocaleString("en-US"));

/* ---------- HackerRank (its website's JSON endpoints) ---------- */

export const hackerrank = {
  id: "hackerrank",
  name: "HackerRank",
  accent: { light: "#1a8a4a", dark: "#2ec866" },
  reads: "api",
  hint: "Your HackerRank username",
  profileUrl: (h) => `https://www.hackerrank.com/profile/${encodeURIComponent(h)}`,
  breakdownLabel: "SOLVED BY BADGE",

  async fetch(handle) {
    checkHandle(handle, this.name);
    const q = encodeURIComponent(handle);
    const key = handle.toLowerCase();
    const [profile, badges] = await Promise.all([
      cached(`hr:p:${key}`, () => getJson(`https://www.hackerrank.com/rest/contests/master/hackers/${q}/profile`, this.name)),
      cached(`hr:b:${key}`, () => getJson(`https://www.hackerrank.com/rest/hackers/${q}/badges`, this.name)).catch(() => null),
    ]);
    const model = profile?.model;
    if (!model) throw new PlatformError("No HackerRank user with that handle", "not_found");
    const list = (badges?.models ?? []).filter((b) => b.badge_name).sort((a, b) => (b.stars ?? 0) - (a.stars ?? 0) || (b.solved ?? 0) - (a.solved ?? 0));
    const starColor = (s) =>
      s >= 5 ? { light: "#c79500", dark: "#ffcc33" } : s >= 3 ? { light: "#2563eb", dark: "#60a5fa" } : { light: "#6b7280", dark: "#9ca3af" };
    const solved = list.reduce((a, b) => a + (b.solved ?? 0), 0) || undefined;
    return {
      platform: "hackerrank",
      handle: model.username ?? handle,
      name: model.name || undefined,
      solved,
      difficulty: list.length
        ? list.slice(0, 5).map((b) => ({ label: b.badge_name, count: b.solved ?? 0, color: starColor(b.stars ?? 0) }))
        : undefined,
      primary: { label: "badges", value: list.length },
      facts: [
        ...list.slice(0, 4).map((b) => ({ label: b.badge_name, value: `${"★".repeat(b.stars ?? 0)}${"☆".repeat(Math.max(0, 5 - (b.stars ?? 0)))}` })),
        { label: "Country", value: model.country || undefined },
      ],
    };
  },
};

/* ---------- TopCoder (official members API) ---------- */

export const topcoder = {
  id: "topcoder",
  name: "TopCoder",
  accent: { light: "#1c6ea4", dark: "#4ea8de" },
  reads: "api",
  hint: "Your TopCoder handle",
  profileUrl: (h) => `https://profiles.topcoder.com/${encodeURIComponent(h)}`,
  tiers: [
    { name: "Gray", min: 0, light: "#808080", dark: "#a8a8a8" },
    { name: "Green", min: 900, light: "#00a900", dark: "#3fbf5a" },
    { name: "Blue", min: 1200, light: "#4f4fd9", dark: "#8080ff" },
    { name: "Yellow", min: 1500, light: "#b5a300", dark: "#ddcc00" },
    { name: "Red", min: 2200, light: "#ee0000", dark: "#ff5c5c" },
  ],

  async fetch(handle) {
    checkHandle(handle, this.name);
    const q = encodeURIComponent(handle);
    const key = handle.toLowerCase();
    const [member, statsRaw] = await Promise.all([
      cached(`tc:m:${key}`, () => getJson(`https://api.topcoder.com/v5/members/${q}`, this.name)),
      cached(`tc:s:${key}`, () => getJson(`https://api.topcoder.com/v5/members/${q}/stats`, this.name)).catch(() => null),
    ]);
    if (!member?.handle) throw new PlatformError("No TopCoder user with that handle", "not_found");
    const stats = Array.isArray(statsRaw) ? statsRaw[0] : statsRaw;
    const srm = stats?.DATA_SCIENCE?.SRM;
    const mm = stats?.DATA_SCIENCE?.MARATHON_MATCH;
    const rating = srm?.rank?.rating || undefined;
    const tier = rating ? this.tiers.filter((t) => rating >= t.min).pop() : null;
    return {
      platform: "topcoder",
      handle: member.handle,
      rating,
      maxRating: srm?.rank?.maximumRating || member.maxRating?.rating || undefined,
      rankLabel: tier ? tier.name : "Unrated in SRM",
      contests: srm?.rank?.competitions ?? srm?.challenges,
      primary: { label: "max rating", value: member.maxRating?.rating },
      facts: [
        { label: "Marathon", value: mm?.rank?.rating || undefined },
        { label: "Challenges", value: stats?.challenges },
        { label: "Wins", value: stats?.wins },
        { label: "Country", value: member.homeCountryCode || member.competitionCountryCode || undefined },
      ],
    };
  },
};

/* ---------- Codewars (official API) ---------- */

const KYU_COLORS = {
  white: { light: "#7a7a7a", dark: "#e6e6e6" },
  yellow: { light: "#b8860b", dark: "#ecb613" },
  blue: { light: "#2f6db3", dark: "#5c9bdb" },
  purple: { light: "#6f4fb8", dark: "#a08ae0" },
  black: { light: "#222222", dark: "#bbbbbb" },
  red: { light: "#c0392b", dark: "#ff6b5b" },
};

export const codewars = {
  id: "codewars",
  name: "Codewars",
  accent: { light: "#b1361e", dark: "#e25d42" },
  reads: "api",
  hint: "Your Codewars username",
  profileUrl: (h) => `https://www.codewars.com/users/${encodeURIComponent(h)}`,
  breakdownLabel: "SCORE BY LANGUAGE",

  async fetch(handle) {
    checkHandle(handle, this.name);
    const u = await cached(`cw:${handle.toLowerCase()}`, () =>
      getJson(`https://www.codewars.com/api/v1/users/${encodeURIComponent(handle)}`, this.name),
    );
    if (!u?.username) throw new PlatformError("No Codewars user with that handle", "not_found");
    const overall = u.ranks?.overall ?? {};
    const langs = Object.entries(u.ranks?.languages ?? {}).sort((a, b) => (b[1].score ?? 0) - (a[1].score ?? 0));
    return {
      platform: "codewars",
      handle: u.username,
      name: u.name || undefined,
      rankLabel: overall.name,
      rankColor: KYU_COLORS[overall.color],
      solved: u.codeChallenges?.totalCompleted,
      difficulty: langs.length
        ? langs.slice(0, 5).map(([lang, r]) => ({ label: lang, count: r.score ?? 0, color: KYU_COLORS[r.color] ?? KYU_COLORS.white }))
        : undefined,
      primary: { label: "honor", value: u.honor },
      facts: [
        { label: "Completed", value: u.codeChallenges?.totalCompleted },
        { label: "Leaderboard", value: u.leaderboardPosition ? `#${fmt(u.leaderboardPosition)}` : undefined },
        { label: "Score", value: overall.score },
        { label: "Top language", value: langs[0] ? `${langs[0][0]} ${langs[0][1].name}` : undefined },
      ],
    };
  },
};

/* ---------- DMOJ (official API) ---------- */

export const dmoj = {
  id: "dmoj",
  name: "DMOJ",
  accent: { light: "#a07800", dark: "#f0c419" },
  reads: "api",
  hint: "Your DMOJ username",
  profileUrl: (h) => `https://dmoj.ca/user/${encodeURIComponent(h)}`,
  tiers: [
    { name: "Newbie", min: 0, light: "#808080", dark: "#a8a8a8" },
    { name: "Amateur", min: 1000, light: "#00a900", dark: "#3fbf5a" },
    { name: "Expert", min: 1300, light: "#0000ff", dark: "#6b8cff" },
    { name: "Candidate Master", min: 1600, light: "#800080", dark: "#c27ad6" },
    { name: "Master", min: 1900, light: "#c48200", dark: "#ffb100" },
    { name: "Grandmaster", min: 2400, light: "#ee0000", dark: "#ff5c5c" },
    { name: "Target", min: 3000, light: "#ee0000", dark: "#ff5c5c" },
  ],

  async fetch(handle) {
    checkHandle(handle, this.name);
    const body = await cached(`dmoj:${handle.toLowerCase()}`, () =>
      getJson(`https://dmoj.ca/api/v2/user/${encodeURIComponent(handle)}`, this.name),
    );
    if (body?.error) throw new PlatformError("No DMOJ user with that handle", "not_found");
    const u = body?.data?.object;
    if (!u) throw changed(this.name);
    const rated = (u.contests ?? []).filter((c) => typeof c.rating === "number");
    const history = rated.map((c, i) => ({ rating: c.rating, old: i ? rated[i - 1].rating : 1200, name: c.key }));
    const tier = u.rating ? this.tiers.filter((t) => u.rating >= t.min).pop() : null;
    return {
      platform: "dmoj",
      handle: u.username,
      rating: u.rating ?? undefined,
      maxRating: rated.length ? Math.max(...rated.map((c) => c.rating)) : undefined,
      rankLabel: tier ? tier.name : "Unrated",
      contests: rated.length,
      history,
      solved: u.problem_count,
      primary: { label: "points", value: u.performance_points ? Math.round(u.performance_points) : undefined },
      facts: [
        { label: "Solved", value: u.problem_count },
        { label: "Points", value: u.points ? Math.round(u.points) : undefined },
        { label: "Rank", value: u.rank && u.rank !== "user" ? u.rank : undefined },
      ],
    };
  },
};

/* ---------- SPOJ (public profile page) ---------- */

export const spoj = {
  id: "spoj",
  name: "SPOJ",
  accent: { light: "#2f6ea8", dark: "#5a9ad8" },
  reads: "page",
  hint: "Your SPOJ username",
  profileUrl: (h) => `https://www.spoj.com/users/${encodeURIComponent(h)}/`,

  async fetch(handle) {
    checkHandle(handle, this.name, /^[a-z0-9_]{1,20}$/i);
    const html = await cached(`spoj:${handle.toLowerCase()}`, () => getPage(this.profileUrl(handle), this.name));
    const text = textOf(html);
    const world = /World Rank:?\s*#?\s*([\d,]+)\s*\(\s*([\d.,]+)\s*points?\)/i.exec(text);
    const solved = num(/Problems solved\s*<\/dt>\s*<dd>\s*([\d,]+)/i.exec(html)?.[1] ?? /Problems solved:?\s*([\d,]+)/i.exec(text)?.[1]);
    const submitted = num(/Solutions submitted\s*<\/dt>\s*<dd>\s*([\d,]+)/i.exec(html)?.[1] ?? /Solutions submitted:?\s*([\d,]+)/i.exec(text)?.[1]);
    if (!world && solved === undefined) throw new PlatformError("No SPOJ user with that handle (or SPOJ changed its page)", "not_found");
    return {
      platform: "spoj",
      handle,
      solved,
      primary: { label: "points", value: world ? num(world[2]) : undefined },
      facts: [
        { label: "World rank", value: world ? `#${world[1]}` : undefined },
        { label: "Solved", value: solved },
        { label: "Submitted", value: submitted },
      ],
    };
  },
};

/* ---------- Kattis (public profile page) ---------- */

export const kattis = {
  id: "kattis",
  name: "Kattis",
  accent: { light: "#b5650d", dark: "#f0a03c" },
  reads: "page",
  hint: "Your Kattis username",
  profileUrl: (h) => `https://open.kattis.com/users/${encodeURIComponent(h)}`,

  async fetch(handle) {
    checkHandle(handle, this.name);
    const html = await cached(`kattis:${handle.toLowerCase()}`, () => getPage(this.profileUrl(handle), this.name));
    const text = textOf(html);
    const rank = num(/\bRank\s*#?\s*([\d,]+)/i.exec(text)?.[1]);
    const score = num(/\bScore\s*([\d.,]+)/i.exec(text)?.[1]);
    const solved = num(/([\d,]+)\s+(?:problems\s+)?solved/i.exec(text)?.[1]);
    if (rank === undefined && score === undefined) throw changed(this.name);
    return {
      platform: "kattis",
      handle,
      solved,
      primary: { label: "score", value: score },
      facts: [
        { label: "Rank", value: rank ? `#${fmt(rank)}` : undefined },
        { label: "Score", value: score },
        { label: "Solved", value: solved },
      ],
    };
  },
};

/* ---------- UVa Online Judge (uHunt API) ---------- */

export const uva = {
  id: "uva",
  name: "UVa",
  accent: { light: "#5b3f8c", dark: "#a88ad8" },
  reads: "api",
  hint: "Your UVa Online Judge username",
  profileUrl: (h) => `https://uhunt.onlinejudge.org/u/${encodeURIComponent(h)}`,

  async fetch(handle) {
    checkHandle(handle, this.name, /^[\w.\-]{1,40}$/);
    const uid = await cached(`uva:id:${handle.toLowerCase()}`, () =>
      getJson(`https://uhunt.onlinejudge.org/api/uname2uid/${encodeURIComponent(handle)}`, this.name),
    );
    if (!uid) throw new PlatformError("No UVa user with that handle", "not_found");
    const data = await cached(`uva:subs:${uid}`, () => getJson(`https://uhunt.onlinejudge.org/api/subs-user/${uid}`, this.name));
    const subs = data?.subs ?? [];
    // Each submission: [id, problem, verdict, runtime, time, language, rank]. Verdict 90 is Accepted.
    const solved = new Set(subs.filter((s) => s[2] === 90).map((s) => s[1]));
    const days = new Map();
    for (const s of subs) days.set(dayOf(s[4]), (days.get(dayOf(s[4])) ?? 0) + 1);
    return {
      platform: "uva",
      handle: data?.uname ?? handle,
      name: data?.name || undefined,
      solved: solved.size,
      primary: { label: "solved", value: solved.size },
      facts: [
        { label: "Submissions", value: subs.length },
        { label: "Accepted", value: subs.filter((s) => s[2] === 90).length },
      ],
      activity: activityFromDays(days),
    };
  },
};

/* ---------- CSES (public problem set page) ---------- */

export const cses = {
  id: "cses",
  name: "CSES",
  accent: { light: "#1b5e8f", dark: "#5aa0d0" },
  reads: "page",
  hint: "Your CSES user number, from your profile link like cses.fi/user/12345",
  profileUrl: (h) => `https://cses.fi/user/${encodeURIComponent(h)}`,

  async fetch(handle) {
    checkHandle(handle, this.name, /^\d{1,9}$/);
    const html = await cached(`cses:${handle}`, () => getPage(`https://cses.fi/problemset/user/${handle}/`, this.name));
    const all = html.match(/class="task-score icon[^"]*"/g) ?? [];
    if (all.length === 0) throw new PlatformError("No CSES user with that number (or CSES changed its page)", "not_found");
    const solved = all.filter((c) => /\bfull\b/.test(c)).length;
    const title = textOf(/<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] ?? /<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "");
    const name = /User\s+(.+)$/i.exec(title)?.[1];
    return {
      platform: "cses",
      handle: name || handle,
      solved,
      primary: { label: "solved", value: solved },
      facts: [
        { label: "Solved", value: `${solved} of ${all.length}` },
        { label: "Progress", value: `${Math.round((solved / all.length) * 100)}%` },
      ],
    };
  },
};
