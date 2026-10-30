import { renderBadge } from "./badge.js";
import { CONTESTS_FIELDS, renderContestsCard } from "./contests.js";
import { HEATMAP_FIELDS, renderHeatmapCard } from "./heatmap.js";
import { RATING_FIELDS, renderRatingCard } from "./rating.js";
import { SOLVED_FIELDS, renderSolvedCard } from "./solved.js";
import { STACK_FIELDS, STACK_PARAMS, renderStackCard } from "./stack.js";
import { STATS_FIELDS, renderStatsCard } from "./stats.js";
import { TYPING_PARAMS, renderTypingCard } from "./typing.js";
import { UPCOMING_FIELDS, UPCOMING_PARAMS, renderUpcomingCard } from "./upcoming.js";
import { COMBINED_PARAMS, renderCombinedCard } from "./combined.js";
import { STREAK_FIELDS, renderStreakCard } from "./streak.js";
import { TROPHY_FIELDS, renderTrophiesCard } from "./trophies.js";
import { BANNER_PARAMS, renderBannerCard } from "./banner.js";
import { SOCIAL_PARAMS, renderSocialCard } from "./social.js";
import { readParams } from "./params.js";

export { renderErrorCard } from "./stats.js";

/**
 * Every card the site can draw.
 *
 * needs: what data the card is drawn from
 *   "handle"       profile and rating history for a Codeforces handle
 *   "submissions"  the above plus the full submission history (slower)
 *   "upcoming"     upcoming contests from several platforms
 *   "multi"        profiles on several platforms at once
 *   "none"         nothing, everything comes from the link itself
 * group: where it sits in the builder
 * themed: whether themes and custom colors apply
 * fields: parts that can be hidden with `hide`
 * params: extra link options (see params.js)
 */
export const CARDS = [
  {
    type: "stats",
    group: "codeforces",
    label: "Profile",
    description: "Rank, rating ring and the key numbers",
    render: renderStatsCard,
    needs: "handle",
    fields: STATS_FIELDS,
    themed: true,
  },
  {
    type: "rating",
    group: "codeforces",
    label: "Rating graph",
    description: "Every rated contest over the rank color bands",
    render: renderRatingCard,
    needs: "handle",
    fields: RATING_FIELDS,
    themed: true,
  },
  {
    type: "solved",
    group: "codeforces",
    label: "Solved",
    description: "Problems solved by difficulty, streaks and top tags",
    render: renderSolvedCard,
    needs: "submissions",
    fields: SOLVED_FIELDS,
    themed: true,
  },
  {
    type: "heatmap",
    group: "codeforces",
    label: "Heatmap",
    description: "A year of submissions, one square per day",
    render: renderHeatmapCard,
    needs: "submissions",
    fields: HEATMAP_FIELDS,
    themed: true,
  },
  {
    type: "streak",
    group: "codeforces",
    label: "Streak",
    description: "Current and longest run of days with a submission",
    render: renderStreakCard,
    needs: "submissions",
    fields: STREAK_FIELDS,
    themed: true,
  },
  {
    type: "trophies",
    group: "codeforces",
    label: "Achievements",
    description: "Trophies from bronze to diamond for your milestones",
    render: renderTrophiesCard,
    needs: "submissions",
    fields: TROPHY_FIELDS,
    themed: true,
  },
  {
    type: "contests",
    group: "codeforces",
    label: "Contests",
    description: "Your last five rated contests",
    render: renderContestsCard,
    needs: "handle",
    fields: CONTESTS_FIELDS,
    themed: true,
  },
  {
    type: "badge",
    group: "codeforces",
    label: "Badge",
    description: "A small one line badge for the top of a README",
    render: renderBadge,
    needs: "handle",
    fields: [],
    themed: false,
  },
  {
    type: "banner",
    group: "extra",
    label: "Header banner",
    description: "A wide gradient banner with your name, waves that move",
    render: renderBannerCard,
    needs: "none",
    fields: [],
    params: BANNER_PARAMS,
    themed: false,
  },
  {
    type: "typing",
    group: "extra",
    label: "Typing intro",
    description: "Your own lines typed out with a blinking cursor",
    render: renderTypingCard,
    needs: "none",
    fields: [],
    params: TYPING_PARAMS,
    themed: false,
  },
  {
    type: "stack",
    group: "extra",
    label: "Tech stack",
    description: "Your languages and tools as colored chips",
    render: renderStackCard,
    needs: "none",
    fields: STACK_FIELDS,
    params: STACK_PARAMS,
    themed: true,
  },
  {
    type: "upcoming",
    group: "extra",
    label: "Upcoming contests",
    description: "Next contests on Codeforces, LeetCode, AtCoder and CodeChef",
    render: renderUpcomingCard,
    needs: "upcoming",
    fields: UPCOMING_FIELDS,
    params: UPCOMING_PARAMS,
    themed: true,
  },
  {
    type: "combined",
    group: "extra",
    label: "All platforms",
    description: "Your profile on every platform you use, in one card",
    render: renderCombinedCard,
    needs: "multi",
    fields: [],
    params: COMBINED_PARAMS,
    themed: true,
  },
  {
    // Used by the README generator's "Connect with me" row; not listed in the builder.
    type: "social",
    group: "hidden",
    label: "Social link",
    description: "A link badge for one site",
    render: renderSocialCard,
    needs: "none",
    fields: [],
    params: SOCIAL_PARAMS,
    themed: false,
  },
];

// The Codeforces cards also work for other platforms through `platform=`.
const ANY_PLATFORM = new Set(["stats", "rating", "solved", "heatmap", "streak", "trophies", "contests", "badge"]);

for (const card of CARDS) {
  card.params ??= [];
  card.anyPlatform = ANY_PLATFORM.has(card.type);
  card.needsHandle = card.needs === "handle" || card.needs === "submissions";
  card.needsSubmissions = card.needs === "submissions";
}

export function getCard(type) {
  const key = (type ?? "stats").trim().toLowerCase();
  return CARDS.find((c) => c.type === key) ?? null;
}

export function renderCardOfType(type, data, options) {
  const card = getCard(type) ?? CARDS[0];
  return card.render(data, { ...options, params: options.params ?? readParams(card, {}) });
}
