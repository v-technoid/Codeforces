import { SITE_NAME } from "../site.js";
import { nextRank, progressToNext, rankForRating, titleCase } from "../ranks.js";
import { escapeXml, fmt, frame, handleMarkup, truncate, FONT } from "./shared.js";
export const STATS_HEIGHT = 200;
/** Ids accepted by `hide` on the main card. */
export const STATS_FIELDS = [
  { id: "max_rating", label: "Max rating" },
  { id: "contests", label: "Contests" },
  { id: "best_rank", label: "Best rank" },
  { id: "contribution", label: "Contribution" },
  { id: "friends", label: "Friend of" },
  { id: "country", label: "Country" },
  { id: "trend", label: "Trend line" },
];
export function renderStatsCard(stats, options) {
  const { theme: t, animate = true } = options;
  const hide = options.hide ?? new Set();
  const { user, contests, bestContestRank, history } = stats;
  const rank = rankForRating(user.rating);
  const maxRank = rankForRating(user.maxRating);
  const color = t.dark ? rank.dark : rank.light;
  const maxColor = t.dark ? maxRank.dark : maxRank.light;
  // Rating ring
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const progress = progressToNext(user.rating);
  const offset = circumference * (1 - progress);
  const next = nextRank(user.rating);
  const ringNote =
    user.rating === undefined
      ? "No rated contests yet"
      : next
        ? `+${next.min - user.rating} to ${titleCase(next.name)}`
        : "Top of the ladder";
  const rankLabel = user.rating === undefined ? "Unrated" : titleCase(rank.name);
  const all = [
    { id: "max_rating", label: "Max rating", value: fmt(user.maxRating), color: maxColor },
    { id: "contests", label: "Contests", value: fmt(contests) },
    { id: "best_rank", label: "Best rank", value: bestContestRank ? `#${fmt(bestContestRank)}` : undefined },
    {
      id: "contribution",
      label: "Contribution",
      value:
        user.contribution === undefined
          ? undefined
          : `${user.contribution > 0 ? "+" : ""}${fmt(user.contribution)}`,
    },
    { id: "friends", label: "Friend of", value: fmt(user.friendOfCount) },
    { id: "country", label: "Country", value: user.country },
  ];
  const cells = all.filter((c) => !hide.has(c.id));
  const grid = cells
    .map((cell, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 25 + col * 112;
      const y = 120 + row * 42;
      const missing = cell.value === undefined || cell.value === "";
      const value = missing ? "n/a" : truncate(cell.value, col === 2 ? 13 : 11);
      return `
  <g class="fade" style="animation-delay:${200 + i * 70}ms" transform="translate(${x}, ${y})">
    <text class="label" y="0">${escapeXml(cell.label.toUpperCase())}</text>
    <text class="value${missing ? " none" : ""}" y="20"${cell.color && !missing ? ` style="fill:${cell.color}"` : ""}>${escapeXml(value)}</text>
  </g>`;
    })
    .join("");
  const spark = hide.has("trend") ? "" : sparkline(history, 372, 160, 96, 24, color);
  const ringAnim = animate
    ? `.ring { animation: ring 1.1s cubic-bezier(.4,0,.2,1) forwards; }
    @keyframes ring { from { stroke-dashoffset: ${circumference.toFixed(2)}; } to { stroke-dashoffset: ${offset.toFixed(2)}; } }`
    : "";
  const body = `
  <g transform="translate(25, 34)">
    <text class="eyebrow">CODEFORCES</text>
    <text class="big-handle" y="28" fill="${color}">${handleMarkup(user.handle, user.rating, t)}</text>
    <text class="rank" y="49" fill="${color}">${escapeXml(rankLabel)}</text>
  </g>
  ${grid}
  <g transform="translate(420, 78)">
    <circle r="${r}" stroke="${t.track}" stroke-width="8"/>
    <circle class="ring" r="${r}" stroke="${color}" stroke-width="8" stroke-linecap="round"
      stroke-dasharray="${circumference.toFixed(2)}" stroke-dashoffset="${(animate ? circumference : offset).toFixed(2)}"
      transform="rotate(-90)"${progress === 0 ? ' opacity="0"' : ""}/>
    <text class="rating" y="4" text-anchor="middle" fill="${user.rating === undefined ? t.muted : color}">${user.rating === undefined ? "?" : user.rating}</text>
    <text class="small" y="20" text-anchor="middle">rating</text>
    <text class="small" y="${r + 22}" text-anchor="middle">${escapeXml(ringNote)}</text>
  </g>
  ${spark}`;
  return frame({
    options,
    height: STATS_HEIGHT,
    accent: color,
    title: `${user.handle} on Codeforces`,
    desc: `${rankLabel}${user.rating !== undefined ? `, rating ${user.rating}` : ""}${user.maxRating !== undefined ? `, max rating ${user.maxRating}` : ""}, ${contests} contests`,
    css: `
    .big-handle { font: 700 22px ${FONT}; }
    .rank { font: 600 13px ${FONT}; }
    .rating { font: 800 24px ${FONT}; }
    ${ringAnim}`,
    body,
  });
}
function sparkline(values, x, y, w, h, color) {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [x + i * step, y + h - ((v - min) / range) * h]);
  const points = pts.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return `<g class="fade" style="animation-delay:700ms">
    <polyline points="${points}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity=".75"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.4" fill="${color}"/>
  </g>`;
}
export function renderErrorCard(message, theme) {
  return frame({
    options: { theme, animate: false },
    height: 110,
    title: `${SITE_NAME} error`,
    desc: message,
    css: `.head { font: 700 17px ${FONT}; fill: ${theme.title}; }`,
    body: `
  <text x="25" y="34" class="eyebrow">${SITE_NAME.toUpperCase()}</text>
  <text x="25" y="62" class="head">Couldn't build this card</text>
  <text x="25" y="86" class="text" style="font-size:13px">${escapeXml(message)}</text>`,
  });
}
