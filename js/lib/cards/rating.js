import { RANKS } from "../ranks.js";
import { colorOf, emptyBody, fmt, frame, header, rankColor, FONT } from "./shared.js";
export const RATING_HEIGHT = 230;
/** Ids accepted by `hide` on the rating graph. */
export const RATING_FIELDS = [
  { id: "bands", label: "Rank color bands" },
  { id: "points", label: "Contest dots" },
];
export function renderRatingCard(stats, options) {
  const { theme: t } = options;
  const hide = options.hide ?? new Set();
  const { user, ratings } = stats;
  // Other platforms pass their own tiers and colors; Codeforces uses its ranks.
  const tiers = options.tiers ?? RANKS;
  const colorAt = options.colorAt ?? ((v) => rankColor(v, t));
  const color = options.color ?? rankColor(user.rating, t);
  const site = options.platformName ?? "Codeforces";
  const summary =
    user.rating === undefined
      ? ""
      : `<g transform="translate(470, 40)" text-anchor="end">
    <text class="now" fill="${color}">${user.rating}</text>
    <text class="small" y="18">max ${fmt(user.maxRating)} in ${ratings.length} contests</text>
  </g>`;
  let plot = emptyBody("No rated contests yet. The graph appears after the first one.", 96);
  if (ratings.length > 0) {
    const left = 58;
    const right = 470;
    const top = 76;
    const bottom = 196;
    const values = ratings.map((r) => r.newRating);
    const lo =
      Math.floor((Math.min(...values, ...ratings.map((r) => r.oldRating || r.newRating)) - 100) / 100) * 100;
    const hi = Math.ceil((Math.max(...values) + 100) / 100) * 100;
    const y = (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
    // Spread contests by time when we have it, otherwise evenly.
    const times = ratings.map((r, i) => r.ratingUpdateTimeSeconds ?? i);
    const t0 = times[0];
    const t1 = times[times.length - 1];
    const x = (i) =>
      ratings.length === 1 ? (left + right) / 2 : left + ((times[i] - t0) / (t1 - t0 || 1)) * (right - left);
    // Colored horizontal bands for each rank the graph passes through.
    const bands = hide.has("bands")
      ? ""
      : tiers.map((rank, i) => {
          const from = Math.max(lo, Number.isFinite(rank.min) ? rank.min : lo);
          const to = Math.min(hi, tiers[i + 1]?.min ?? hi);
          if (to <= from) return "";
          return `<rect x="${left}" y="${y(to).toFixed(1)}" width="${right - left}" height="${(y(from) - y(to)).toFixed(1)}" fill="${colorOf(rank, t)}" fill-opacity="${t.dark ? 0.16 : 0.12}"/>`;
        }).join("");
    // Axis labels at rank boundaries inside the range, plus the range ends
    // (so a graph that never crosses a boundary still has a scale).
    const marks = [
      ...new Set([lo, ...tiers.map((r) => r.min).filter((m) => Number.isFinite(m) && m > lo && m < hi), hi]),
    ]
      .sort((a, b) => a - b)
      .filter((m, i, arr) => i === 0 || y(arr[i - 1]) - y(m) >= 11);
    const ticks = marks
      .map((m) => {
        const inner = m !== lo && m !== hi;
        return `<text class="axis" x="${left - 6}" y="${(y(m) + 3.5).toFixed(1)}" text-anchor="end">${m}</text>${
          inner
            ? `<line x1="${left}" x2="${right}" y1="${y(m).toFixed(1)}" y2="${y(m).toFixed(1)}" stroke="${t.border}" stroke-width="1" stroke-dasharray="2 3"/>`
            : ""
        }`;
      })
      .join("");
    // Year labels along the bottom.
    let lastYear = "";
    const years = ratings
      .map((r, i) => {
        if (!r.ratingUpdateTimeSeconds) return "";
        const year = new Date(r.ratingUpdateTimeSeconds * 1000).getUTCFullYear().toString();
        if (year === lastYear) return "";
        lastYear = year;
        return `<text class="axis" x="${x(i).toFixed(1)}" y="${bottom + 16}" text-anchor="middle">${year}</text>`;
      })
      .filter(Boolean)
      // Drop labels that would overlap the previous one.
      .filter((label, i, arr) => {
        if (i === 0) return true;
        const px = Number(/x="([\d.]+)"/.exec(label)[1]);
        const prev = Number(/x="([\d.]+)"/.exec(arr[i - 1])[1]);
        return px - prev > 30;
      })
      .join("");
    const path = values
      .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
      .join(" ");
    const showDots = !hide.has("points") && ratings.length <= 120;
    const dots = showDots
      ? values
          .map(
            (v, i) =>
              `<circle cx="${x(i).toFixed(1)}" cy="${y(v).toFixed(1)}" r="2.3" fill="${colorAt(v)}" stroke="${t.background}" stroke-width="1"/>`,
          )
          .join("")
      : "";
    const last = values.length - 1;
    plot = `
  <g clip-path="url(#plot)">${bands}</g>
  <defs><clipPath id="plot"><rect x="${left}" y="${top}" width="${right - left}" height="${bottom - top}" rx="3"/></clipPath></defs>
  ${ticks}
  <path class="draw" pathLength="1" d="${path}" stroke="${t.text}" stroke-opacity=".85" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
  <g class="fade" style="animation-delay:1.2s">${dots}
    <circle cx="${x(last).toFixed(1)}" cy="${y(values[last]).toFixed(1)}" r="4" fill="${color}" stroke="${t.background}" stroke-width="1.5"/>
  </g>
  ${years}`;
  }
  return frame({
    options,
    height: ratings.length > 0 ? RATING_HEIGHT : 120,
    accent: color,
    title: `${user.handle} rating history on ${site}`,
    desc:
      ratings.length > 0
        ? `Rating over ${ratings.length} contests, now ${user.rating}, peak ${user.maxRating}`
        : "No rated contests yet",
    css: `
    .now { font: 800 22px ${FONT}; }
    .axis { font: 500 9.5px ${FONT}; fill: ${t.muted}; }`,
    body: `${header(options.eyebrow ?? "RATING HISTORY", stats, t, options.color, !!options.tiers)}
  ${summary}
  ${plot}`,
  });
}
