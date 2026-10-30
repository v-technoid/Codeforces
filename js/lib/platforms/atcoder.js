// AtCoder: rating history from AtCoder's own JSON, solved counts from
// AtCoder Problems (kenkoooo.com), the community stats site most AtCoder users know.
import { activityFromDays, cached, changed, checkHandle, dayOf, getJson, PlatformError } from "./http.js";

const NAME = "AtCoder";

export const atcoder = {
  id: "atcoder",
  name: NAME,
  accent: { light: "#222222", dark: "#e6e6e6" },
  reads: "api",
  hint: "Your AtCoder user name",
  profileUrl: (h) => `https://atcoder.jp/users/${encodeURIComponent(h)}`,
  tiers: [
    { name: "Gray", min: 0, light: "#808080", dark: "#a8a8a8" },
    { name: "Brown", min: 400, light: "#804000", dark: "#c07a3c" },
    { name: "Green", min: 800, light: "#008000", dark: "#3fbf5a" },
    { name: "Cyan", min: 1200, light: "#00a0a0", dark: "#2ed3d3" },
    { name: "Blue", min: 1600, light: "#0000ff", dark: "#6b8cff" },
    { name: "Yellow", min: 2000, light: "#a8a800", dark: "#e0d23c" },
    { name: "Orange", min: 2400, light: "#ff8000", dark: "#ffa94d" },
    { name: "Red", min: 2800, light: "#ff0000", dark: "#ff5c5c" },
  ],

  // Daily activity takes a few extra requests, so it's only read for the
  // heatmap, streak and achievements cards ({ submissions: true }).
  slowActivity: true,

  async fetch(handle, opts = {}) {
    checkHandle(handle, NAME, /^[A-Za-z0-9_]{1,24}$/);
    const key = handle.toLowerCase();
    const q = encodeURIComponent(handle);

    const [historyRaw, ac, points, activity] = await Promise.all([
      cached(`atcoder:h:${key}`, () => getJson(`https://atcoder.jp/users/${q}/history/json`, NAME)),
      // Solved counts are a bonus: the card still works if AtCoder Problems is down.
      cached(`atcoder:ac:${key}`, () => getJson(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user=${q}`, "AtCoder Problems")).catch(() => null),
      cached(`atcoder:rps:${key}`, () =>
        getJson(`https://kenkoooo.com/atcoder/atcoder-api/v3/user/rated_point_sum_rank?user=${q}`, "AtCoder Problems"),
      ).catch(() => null),
      opts.submissions ? cached(`atcoder:act:${key}`, () => atcoderActivity(handle)).catch(() => undefined) : undefined,
    ]);

    if (!Array.isArray(historyRaw)) throw changed(NAME);
    if (historyRaw.length === 0 && !ac) {
      // AtCoder answers an empty list for unknown names too, so check AtCoder Problems.
      throw new PlatformError("No AtCoder user with that handle, or no contests yet", "not_found");
    }

    const rated = historyRaw.filter((h) => h.IsRated);
    const history = rated.map((h) => ({
      time: Math.floor(Date.parse(h.EndTime) / 1000),
      rating: h.NewRating,
      old: h.OldRating,
      name: h.ContestNameEn || h.ContestName,
      rank: h.Place,
    }));
    const last = rated[rated.length - 1];
    const tier = last ? atcoder.tiers.filter((t) => last.NewRating >= t.min).pop() : null;

    return {
      platform: "atcoder",
      handle,
      rating: last?.NewRating,
      maxRating: rated.length ? Math.max(...rated.map((h) => h.NewRating)) : undefined,
      rankLabel: tier ? `${tier.name}` : "Unrated",
      contests: rated.length,
      bestRank: rated.length ? Math.min(...rated.map((h) => h.Place)) : undefined,
      history,
      solved: typeof ac?.count === "number" ? ac.count : undefined,
      activity,
      primary: { label: "solved", value: ac?.count },
      facts: [
        { label: "Highest perf", value: rated.length ? Math.max(...rated.map((h) => h.Performance)) : undefined },
        { label: "AC rank", value: ac?.rank !== undefined ? `#${(ac.rank + 1).toLocaleString("en-US")}` : undefined },
        { label: "Rated points", value: points?.count },
      ],
    };
  },
};

/**
 * A year of submissions per day from AtCoder Problems. It returns up to 500
 * submissions per request, and asks clients to wait a second between requests.
 */
async function atcoderActivity(handle) {
  const days = new Map();
  let from = Math.floor(Date.now() / 1000) - 366 * 86400;
  for (let page = 0; page < 5; page++) {
    if (page) await new Promise((r) => setTimeout(r, 1100));
    const list = await getJson(
      `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=${from}`,
      "AtCoder Problems",
    );
    if (!Array.isArray(list)) throw changed("AtCoder Problems");
    for (const s of list) {
      const d = dayOf(s.epoch_second);
      days.set(d, (days.get(d) ?? 0) + 1);
    }
    if (list.length < 500) break;
    from = Math.max(...list.map((s) => s.epoch_second)) + 1;
  }
  return activityFromDays(days);
}
