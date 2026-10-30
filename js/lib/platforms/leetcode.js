// LeetCode, through the public GraphQL endpoint its own website uses.
// Public profiles need no login. LeetCode limits how often it can be asked,
// so results are cached.
import { activityFromDays, cached, changed, checkHandle, dayOf, PlatformError, request } from "./http.js";

const NAME = "LeetCode";

const QUERY = `query cards($username: String!) {
  allQuestionsCount { difficulty count }
  matchedUser(username: $username) {
    username
    profile { realName ranking countryName reputation }
    submitStatsGlobal { acSubmissionNum { difficulty count } }
    badges { displayName }
    userCalendar { streak totalActiveDays submissionCalendar }
  }
  userContestRanking(username: $username) {
    attendedContestsCount rating globalRanking topPercentage badge { name }
  }
  userContestRankingHistory(username: $username) {
    attended rating ranking contest { title startTime }
  }
}`;

// Recent accepted problems and solved counts by language, asked for separately
// so that if LeetCode ever changes these fields the main cards keep working.
const EXTRAS = `query extras($username: String!) {
  recentAcSubmissionList(username: $username, limit: 6) { title titleSlug timestamp lang }
  matchedUser(username: $username) { languageProblemCount { languageName problemsSolved } }
}`;

const LANGS = {
  cpp: "C++", "c++": "C++", c: "C", python: "Python", python3: "Python", java: "Java", javascript: "JavaScript",
  typescript: "TypeScript", golang: "Go", go: "Go", rust: "Rust", kotlin: "Kotlin", csharp: "C#", "c#": "C#",
  swift: "Swift", ruby: "Ruby", scala: "Scala", php: "PHP", dart: "Dart", mysql: "SQL", mssql: "SQL",
  oraclesql: "SQL", postgresql: "SQL", pythondata: "Pandas", pandas: "Pandas", elixir: "Elixir", erlang: "Erlang",
  racket: "Racket", bash: "Bash",
};
const langName = (l) => LANGS[String(l ?? "").toLowerCase()] ?? String(l ?? "Other");

async function graphql(query, handle) {
  const { status, text } = await request("https://leetcode.com/graphql", NAME, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Referer: `https://leetcode.com/u/${encodeURIComponent(handle)}/`,
      Origin: "https://leetcode.com",
    },
    body: JSON.stringify({ query, variables: { username: handle } }),
  });
  if (status === 429) throw new PlatformError("LeetCode is limiting requests right now, try again in a minute", "unavailable");
  if (status >= 400) throw new PlatformError("LeetCode is unavailable right now", "unavailable");
  try {
    return JSON.parse(text);
  } catch {
    throw changed(NAME);
  }
}

const DIFFICULTY = [
  { key: "Easy", color: { light: "#00a38b", dark: "#00b8a3" } },
  { key: "Medium", color: { light: "#d99a00", dark: "#ffc01e" } },
  { key: "Hard", color: { light: "#e0283f", dark: "#ef4743" } },
];

export const leetcode = {
  id: "leetcode",
  name: NAME,
  accent: { light: "#c77700", dark: "#ffa116" },
  reads: "api",
  hint: "Your LeetCode username",
  profileUrl: (h) => `https://leetcode.com/u/${encodeURIComponent(h)}/`,
  breakdownLabel: "BY DIFFICULTY",
  // LeetCode badges also depend on your top percentage, so these are approximate.
  tiers: [
    { name: "Contest rating", min: 0, light: "#b36b00", dark: "#ffa116" },
    { name: "Knight", min: 1850, light: "#2e8b57", dark: "#5ec98a" },
    { name: "Guardian", min: 2150, light: "#2f6fd1", dark: "#6aa0ff" },
  ],

  async fetch(handle) {
    checkHandle(handle, NAME);
    const key = handle.toLowerCase();
    const [body, extras] = await Promise.all([
      cached(`leetcode:${key}`, () => graphql(QUERY, handle)),
      cached(`leetcode-extras:${key}`, () => graphql(EXTRAS, handle)).catch(() => null),
    ]);

    const data = body?.data;
    if (!data) throw changed(NAME);
    const user = data.matchedUser;
    if (!user) throw new PlatformError("No LeetCode user with that handle", "not_found");

    const ac = user.submitStatsGlobal?.acSubmissionNum ?? [];
    const totals = Object.fromEntries((data.allQuestionsCount ?? []).map((q) => [q.difficulty, q.count]));
    const solvedOf = (d) => ac.find((x) => x.difficulty === d)?.count;

    const contest = data.userContestRanking;
    const history = (data.userContestRankingHistory ?? [])
      .filter((h) => h.attended)
      .map((h) => ({
        time: h.contest?.startTime,
        rating: Math.round(h.rating),
        name: h.contest?.title,
        rank: h.ranking,
      }));
    history.forEach((h, i) => (h.old = i ? history[i - 1].rating : 1500));

    let activity;
    try {
      const days = Object.entries(JSON.parse(user.userCalendar?.submissionCalendar ?? "{}")).map(([sec, n]) => [
        dayOf(Number(sec)),
        n,
      ]);
      activity = activityFromDays(days);
    } catch {
      activity = undefined;
    }

    return {
      platform: "leetcode",
      handle: user.username,
      name: user.profile?.realName || undefined,
      rating: contest?.rating ? Math.round(contest.rating) : undefined,
      maxRating: history.length ? Math.max(...history.map((h) => h.rating)) : undefined,
      rankLabel: contest?.badge?.name || (contest?.rating ? "Contest rating" : "No contests yet"),
      contests: contest?.attendedContestsCount ?? history.length,
      bestRank: history.length ? Math.min(...history.map((h) => h.rank).filter(Boolean)) : undefined,
      history,
      solved: solvedOf("All"),
      difficulty: DIFFICULTY.map((d) => ({ label: d.key, count: solvedOf(d.key) ?? 0, total: totals[d.key], color: d.color })),
      primary: { label: "solved", value: solvedOf("All") },
      facts: [
        { label: "Global rank", value: user.profile?.ranking ? `#${user.profile.ranking.toLocaleString("en-US")}` : undefined },
        { label: "Contest top", value: contest?.topPercentage ? `${contest.topPercentage.toFixed(1)}%` : undefined },
        { label: "Streak", value: user.userCalendar?.streak !== undefined ? `${user.userCalendar.streak} days` : undefined },
        { label: "Active days", value: user.userCalendar?.totalActiveDays },
        { label: "Badges", value: user.badges?.length },
        { label: "Country", value: user.profile?.countryName || undefined },
      ],
      activity,
      recent: (extras?.data?.recentAcSubmissionList ?? []).map((r) => ({
        title: r.title,
        ok: true,
        verdict: "Accepted",
        lang: langName(r.lang),
        time: Number(r.timestamp),
      })),
      languages: mergeLanguages(extras?.data?.matchedUser?.languageProblemCount ?? []),
    };
  },
};

function mergeLanguages(list) {
  const out = new Map();
  for (const l of list) {
    const name = langName(l.languageName);
    out.set(name, (out.get(name) ?? 0) + (Number(l.problemsSolved) || 0));
  }
  return [...out.entries()].filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([name, count]) => ({ name, count }));
}
