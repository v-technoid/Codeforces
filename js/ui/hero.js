// The hero card stack: three real cards dealt onto the page. It shows sample
// cards for the picked platform until someone loads a handle, then theirs.
import { getCard } from "../lib/cards/index.js";
import { HEATMAP_HEIGHT } from "../lib/cards/heatmap.js";
import { renderPlatformCard } from "../lib/cards/platform.js";
import { RATING_HEIGHT } from "../lib/cards/rating.js";
import { STATS_HEIGHT } from "../lib/cards/stats.js";
import { supportedCards } from "../lib/platforms/index.js";
import { themes } from "../lib/themes.js";
import { $, isCodeforces, platformStats, SAMPLE, state, toDataUri } from "./core.js";

const HEIGHTS = { rating: RATING_HEIGHT, heatmap: HEATMAP_HEIGHT, stats: STATS_HEIGHT, solved: 200, contests: 232 };

let shownFor = "";

export function renderHero() {
  const other = !isCodeforces();
  const pdata = other ? platformStats() : null;
  const key = other ? `${state.platform}:${state.pstats ? pdata.handle : "sample"}` : `codeforces:${(state.full ?? SAMPLE).user.handle}`;
  // Only redraw (and replay the entrance) when the data actually changes.
  if (shownFor === key) return;
  shownFor = key;

  let cards;
  if (other) {
    // Back to front: a wide graph or grid, then a second card, then the profile.
    const can = new Set(supportedCards({ id: state.platform }));
    const picks = ["rating", "heatmap", "solved", "contests"].filter((t) => can.has(t)).slice(0, 2);
    // Platforms with only a profile card get two copies in different themes instead of three.
    const types = picks.length ? [...picks, "stats"] : ["stats", "stats"];
    const slots = types.length === 3 ? [0, 1, 2] : [0, 2];
    cards = types.map((type, i) => {
      const theme = themes[i === 0 ? "dark" : "light"];
      return { slot: slots[i], svg: renderPlatformCard(type, state.platform, pdata, { theme, animate: true, params: {} }), h: HEIGHTS[type] };
    });
  } else {
    const data = state.full ?? SAMPLE;
    cards = [
      { type: "rating", theme: "dark" },
      { type: "heatmap", theme: "light" },
      { type: "stats", theme: "light" },
    ].map((c) => ({ svg: getCard(c.type).render(data, { theme: themes[c.theme], animate: true, params: {} }), h: HEIGHTS[c.type] }));
  }

  $("hero-stack").innerHTML = cards
    .map((c, i) => `<img class="hero-card hero-card-${c.slot ?? i}" src="${toDataUri(c.svg)}" alt="" width="495" height="${c.h}" />`)
    .join("");
}
