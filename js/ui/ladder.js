// The rank ladder: a band of rank colors with markers for handles. Works for
// any platform with rating tiers.
import { nextTierFor, tierFor } from "../lib/platforms/index.js";
import { $, currentPlatform, esc, isCodeforces, state } from "./core.js";

// Codeforces uses CSS variables so its colors follow the page's light or dark mode.
const CF_SCALE = {
  min: 800,
  max: 3300,
  segments: [
    { name: "Newbie", from: 800, to: 1200, color: "var(--r-newbie)" },
    { name: "Pupil", from: 1200, to: 1400, color: "var(--r-pupil)" },
    { name: "Specialist", from: 1400, to: 1600, color: "var(--r-specialist)" },
    { name: "Expert", from: 1600, to: 1900, color: "var(--r-expert)" },
    { name: "Candidate master", from: 1900, to: 2100, color: "var(--r-cm)" },
    { name: "Master", from: 2100, to: 2400, color: "var(--r-master)" },
    { name: "Grandmaster", from: 2400, to: 3300, color: "var(--r-gm)" },
  ],
  // Master and grandmaster tiers share a color, so their inner edges are thin ticks.
  ticks: [2300, 2600, 3000],
  firstLabel: "below 1200",
};

const prefersDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

/** The ladder scale for a platform, or null if it has no rating tiers. */
export function scaleFor(platform) {
  if (platform.id === "codeforces") return CF_SCALE;
  const tiers = platform.tiers;
  if (!tiers || tiers.length < 2) return null;
  const dark = prefersDark();
  const min = Math.max(0, tiers[1].min - (tiers[2] ? tiers[2].min - tiers[1].min : 400));
  const max = tiers[tiers.length - 1].min + 500;
  // Neighbouring tiers with the same color merge into one segment with a tick between.
  const segments = [];
  const ticks = [];
  tiers.forEach((t, i) => {
    const from = Math.max(min, t.min);
    const to = tiers[i + 1]?.min ?? max;
    const color = dark ? t.dark : t.light;
    const prev = segments[segments.length - 1];
    if (prev && prev.color === color) {
      prev.to = to;
      ticks.push(from);
    } else segments.push({ name: t.name, from, to, color });
  });
  return { min, max, segments, ticks, firstLabel: `below ${tiers[1].min}` };
}

/** markers: [{ handle, rating, maxRating }]. Two markers put the second flag below the band. */
export function ladderHtml(markers, compact = false, scale = CF_SCALE) {
  const { min, max, segments, ticks, firstLabel } = scale;
  const pct = (r) => ((Math.min(max, Math.max(min, r)) - min) / (max - min)) * 100;
  const edgeClass = (p) => (p < 10 ? " edge-start" : p > 90 ? " edge-end" : "");
  const placed = markers.filter((m) => m.rating !== undefined);
  const single = placed.length === 1 ? placed[0] : null;

  const band =
    segments
      .map((s) => `<span class="ladder-segment" style="width:${pct(s.to) - pct(s.from)}%;background:${s.color}"></span>`)
      .join("") + ticks.map((t) => `<span class="ladder-inner-tick" style="left:${pct(t)}%"></span>`).join("");

  const maxTick =
    single && single.maxRating !== undefined && single.maxRating !== single.rating
      ? `<span class="ladder-max${pct(single.maxRating) > 94 ? " edge-end" : pct(single.maxRating) < 6 ? " edge-start" : ""}" style="left:${pct(single.maxRating)}%" title="Max rating ${single.maxRating}">
          <span class="ladder-max-label">max ${single.maxRating}</span>
        </span>`
      : "";

  const flags = placed
    .map(
      (m, i) => `<span class="ladder-marker${i === 1 ? " below" : ""}${edgeClass(pct(m.rating))}" style="left:${pct(m.rating)}%;animation-delay:${i * 120}ms">
        <span class="ladder-flag"><span class="ladder-flag-handle">${esc(m.handle)}</span><span class="ladder-flag-rating">${m.rating}</span></span>
      </span>`,
    )
    .join("");

  const labels = compact
    ? ""
    : `<div class="ladder-labels" aria-hidden="true">${segments
        .map(
          (s, i) => `<span class="ladder-label" style="width:${pct(s.to) - pct(s.from)}%">
          <span class="ladder-label-name">${esc(s.name)}</span>
          <span class="ladder-label-from">${i === 0 ? firstLabel : s.from}</span>
        </span>`,
        )
        .join("")}</div>`;

  return `<figure class="ladder${placed.length > 1 ? " two" : ""}" aria-label="Rank ladder">
    <div class="ladder-track"><div class="ladder-band">${band}</div>${maxTick}${flags}</div>
    ${labels}
  </figure>`;
}

function describe(platform, { handle, rating, rankLabel, contests, solved }) {
  if (rating === undefined) {
    if (solved !== undefined) return `${handle} has solved ${solved.toLocaleString("en-US")} problems on ${platform.name}.`;
    return `${handle} hasn't played a rated contest on ${platform.name} yet. The cards fill in after the first one.`;
  }
  const next = nextTierFor(platform, rating);
  // AtCoder and TopCoder name tiers by color, which people say as "a Blue coder".
  const colorTiers = platform.id === "atcoder" || platform.id === "topcoder";
  const base = rankLabel || tierFor(platform, rating)?.name || "rated";
  const label = colorTiers ? `${base} coder` : base;
  const gap = next ? ` ${next.min - rating} points from ${next.name}.` : platform.tiers ? " That's the top tier." : "";
  const article = /^[aeiou8]/i.test(label) ? "an" : "a";
  const after = contests ? ` after ${contests} rated contest${contests === 1 ? "" : "s"}` : "";
  return `${handle} is ${article} ${label} at ${rating}${after} on ${platform.name}.${gap}`;
}

export function renderStanding() {
  const platform = currentPlatform();
  const scale = scaleFor(platform);
  let s = null;
  if (isCodeforces() && state.stats) {
    const u = state.stats.user;
    s = { handle: u.handle, rating: u.rating, maxRating: u.maxRating, contests: state.stats.contests, rankLabel: undefined };
  } else if (!isCodeforces() && state.pstats) {
    s = state.pstats;
  }

  // Platforms without ratings skip the ladder and just describe the profile.
  $("standing-ladder").hidden = !scale;
  $("standing-heading").textContent = s ? "Where you stand" : scale ? `Every ${platform.name} rank has its color` : `${platform.name} profile`;
  if (scale) {
    $("standing-ladder").innerHTML = ladderHtml(s ? [{ handle: s.handle, rating: s.rating, maxRating: s.maxRating }] : [], false, scale);
  }
  $("standing-summary").textContent = s
    ? describe(platform, s)
    : scale
      ? "Your cards use the color of your rank, so people can read your level at a glance."
      : `${platform.name} has no rating tiers, so your cards lead with problems solved and your score.`;
}
