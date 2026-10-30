// Codeforces, through its official API (see ../codeforces.js for the full card data).
import { CodeforcesError, getCardStats } from "../codeforces.js";
import { RANKS, rankForRating, titleCase } from "../ranks.js";
import { PlatformError } from "./http.js";

export const codeforces = {
  id: "codeforces",
  name: "Codeforces",
  accent: { light: "#1f6fb2", dark: "#5aa6e6" },
  reads: "api",
  hint: "Your Codeforces handle",
  profileUrl: (h) => `https://codeforces.com/profile/${encodeURIComponent(h)}`,
  tiers: RANKS.map((r) => ({ ...r, name: titleCase(r.name), min: Number.isFinite(r.min) ? r.min : 0 })),

  async fetch(handle) {
    let s;
    try {
      s = await getCardStats(handle);
    } catch (err) {
      if (err instanceof CodeforcesError) throw new PlatformError(err.message, err.kind);
      throw err;
    }
    return fromCodeforces(s);
  },
};

/** Turns the detailed Codeforces stats into the shape every platform shares. */
export function fromCodeforces(s) {
  const { user } = s;
  return {
    platform: "codeforces",
    handle: user.handle,
    rating: user.rating,
    maxRating: user.maxRating,
    rankLabel: user.rating === undefined ? "Unrated" : titleCase(rankForRating(user.rating).name),
    contests: s.contests,
    bestRank: s.bestContestRank,
    history: s.ratings.map((r) => ({
      time: r.ratingUpdateTimeSeconds,
      rating: r.newRating,
      old: r.oldRating,
      name: r.contestName,
      rank: r.rank,
    })),
    solved: s.solved?.total,
    facts: [
      { label: "Contribution", value: user.contribution },
      { label: "Friend of", value: user.friendOfCount },
      { label: "Country", value: user.country },
    ],
    activity: s.activity,
    recent: s.solved?.recent,
    languages: s.solved?.languages,
  };
}
