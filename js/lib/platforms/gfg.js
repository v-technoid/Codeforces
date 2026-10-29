// GeeksforGeeks: profile numbers come from the data embedded in the public
// profile page, and solved counts by difficulty from GeeksforGeeks' practice API.
import { cached, changed, checkHandle, getPage, PlatformError, request } from "./http.js";

const NAME = "GeeksforGeeks";

const LEVELS = [
  { key: "School", color: { light: "#6b7280", dark: "#9ca3af" } },
  { key: "Basic", color: { light: "#2563eb", dark: "#60a5fa" } },
  { key: "Easy", color: { light: "#15803d", dark: "#4ade80" } },
  { key: "Medium", color: { light: "#c2790a", dark: "#fbbf24" } },
  { key: "Hard", color: { light: "#dc2626", dark: "#f87171" } },
];

/** Finds the first value for any of `keys` anywhere inside a nested object. */
function find(obj, keys, depth = 0) {
  if (!obj || typeof obj !== "object" || depth > 8) return undefined;
  for (const k of keys) if (obj[k] !== undefined && obj[k] !== null && typeof obj[k] !== "object") return obj[k];
  for (const v of Object.values(obj)) {
    const hit = find(v, keys, depth + 1);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

export const gfg = {
  id: "gfg",
  name: NAME,
  accent: { light: "#2f8d46", dark: "#4cc46b" },
  reads: "page",
  hint: "Your GeeksforGeeks handle",
  profileUrl: (h) => `https://www.geeksforgeeks.org/user/${encodeURIComponent(h)}/`,
  breakdownLabel: "BY DIFFICULTY",

  async fetch(handle) {
    checkHandle(handle, NAME);
    const key = handle.toLowerCase();
    const [html, subs] = await Promise.all([
      cached(`gfg:p:${key}`, () => getPage(`https://www.geeksforgeeks.org/user/${encodeURIComponent(handle)}/`, NAME)),
      cached(`gfg:s:${key}`, async () => {
        const { status, text } = await request("https://practiceapi.geeksforgeeks.org/api/v1/user/problems/submissions/", NAME, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({ handle, requestType: "", year: "", month: "" }),
        });
        if (status >= 400) return null;
        return JSON.parse(text);
      }).catch(() => null),
    ]);

    const m = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (!m) throw changed(NAME);
    let next;
    try {
      next = JSON.parse(m[1]);
    } catch {
      throw changed(NAME);
    }
    const props = next?.props?.pageProps ?? {};
    const score = find(props, ["score", "coding_score", "codingScore"]);
    const total = find(props, ["total_problems_solved", "totalProblemsSolved"]);
    if (score === undefined && total === undefined && !subs?.result) {
      throw new PlatformError("No GeeksforGeeks user with that handle", "not_found");
    }

    const result = subs?.result ?? {};
    const difficulty = LEVELS.map((l) => ({
      label: l.key,
      count: Object.keys(result[l.key] ?? result[l.key.toLowerCase()] ?? {}).length,
      color: l.color,
    }));
    const solved = Number(total ?? subs?.count) || difficulty.reduce((a, d) => a + d.count, 0) || undefined;
    const contestRating = Number(props?.contestData?.user_contest_data?.current_rating) || undefined;
    const stars = props?.contestData?.user_stars;

    return {
      platform: "gfg",
      handle,
      name: find(props, ["name"]) || undefined,
      solved,
      difficulty: subs?.result ? difficulty : undefined,
      primary: { label: "coding score", value: Number(score) || undefined },
      facts: [
        { label: "Solved", value: solved },
        { label: "Institute rank", value: find(props, ["institute_rank", "instituteRank"]) || undefined },
        { label: "Longest streak", value: find(props, ["pod_solved_longest_streak", "maxStreak"]) },
        { label: "Monthly score", value: find(props, ["monthly_score", "monthlyCodingScore"]) },
        { label: "Contest rating", value: contestRating },
        { label: "Contest stars", value: stars ? `${stars}★` : undefined },
      ],
    };
  },
};
