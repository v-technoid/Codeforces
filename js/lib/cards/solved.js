import { rankForRating } from "../ranks.js";
import { colorOf, emptyBody, escapeXml, fmt, frame, header, rankColor, FONT } from "./shared.js";
export const SOLVED_HEIGHT = 235;
/** Ids accepted by `hide` on the solved card. */
export const SOLVED_FIELDS = [
  { id: "streak", label: "Streaks" },
  { id: "hardest", label: "Hardest solved" },
  { id: "tags", label: "Top tags" },
];
export function renderSolvedCard(stats, options) {
  const { theme: t } = options;
  const hide = options.hide ?? new Set();
  const color = rankColor(stats.user.rating, t);
  const s = stats.solved;
  let body = emptyBody("Solved problems couldn't be loaded right now.", 120);
  if (s) {
    const acceptance = s.submissions ? Math.round((s.accepted / s.submissions) * 100) : 0;
    // Left column: total and small stats.
    const facts = [
      ...(hide.has("streak")
        ? []
        : [
            { label: "STREAK", value: `${s.currentStreak} day${s.currentStreak === 1 ? "" : "s"}` },
            { label: "BEST STREAK", value: `${s.longestStreak} day${s.longestStreak === 1 ? "" : "s"}` },
          ]),
      ...(hide.has("hardest") || !s.hardest
        ? []
        : [{ label: "HARDEST", value: String(s.hardest), color: colorOf(rankForRating(s.hardest), t) }]),
    ].slice(0, 3);
    const left = `
  <g transform="translate(25, 98)">
    <text class="total">${fmt(s.total)}</text>
    <text class="small" y="18">problems solved, ${acceptance}% of submissions accepted</text>
  </g>
  ${facts
    .map(
      (
        f,
        i,
      ) => `<g class="fade" style="animation-delay:${300 + i * 80}ms" transform="translate(${25 + i * 100}, 158)">
    <text class="label">${f.label}</text>
    <text class="value" y="20"${f.color ? ` style="fill:${f.color}"` : ""}>${escapeXml(f.value)}</text>
  </g>`,
    )
    .join("")}`;
    // Right column: problems by difficulty.
    const max = Math.max(1, ...s.buckets.map((b) => b.count));
    const barX = 330;
    const barW = 110;
    const bars = s.buckets
      .map((b, i) => {
        const y = 60 + i * 19;
        const w = Math.max(b.count > 0 ? 3 : 0, (b.count / max) * barW);
        const c = colorOf(rankForRating(b.from), t);
        return `<g transform="translate(0, ${y})">
    <text class="axis" x="${barX - 8}" y="9" text-anchor="end">${b.from === 2400 ? "2400+" : `${b.from}`}</text>
    <rect x="${barX}" y="1" width="${barW}" height="10" rx="3" fill="${t.track}"/>
    <rect class="grow" style="animation-delay:${200 + i * 70}ms" x="${barX}" y="1" width="${w.toFixed(1)}" height="10" rx="3" fill="${c}"/>
    <text class="count" x="${barX + barW + 8}" y="10">${fmt(b.count)}</text>
  </g>`;
      })
      .join("");
    // Top tags as a single row of pills.
    let tags = "";
    if (!hide.has("tags") && s.topTags.length > 0) {
      let cx = 25;
      const pills = [];
      for (const tag of s.topTags) {
        const text = `${tag.tag} ${tag.count}`;
        const w = text.length * 6.1 + 18;
        if (cx + w > 470) break;
        pills.push(`<g class="fade" style="animation-delay:${600 + pills.length * 60}ms" transform="translate(${cx.toFixed(1)}, 200)">
    <rect width="${w.toFixed(1)}" height="20" rx="10" fill="${t.track}"/>
    <text class="pill" x="9" y="14">${escapeXml(tag.tag)} <tspan class="pill-count">${tag.count}</tspan></text>
  </g>`);
        cx += w + 6;
      }
      tags = pills.join("");
    }
    body = `${left}
  <text class="label" x="${barX}" y="50">BY DIFFICULTY</text>
  ${bars}
  ${tags}`;
  }
  const height = s && (hide.has("tags") || s.topTags.length === 0) ? 196 : SOLVED_HEIGHT;
  return frame({
    options,
    height,
    accent: color,
    title: `${stats.user.handle} problems solved on Codeforces`,
    desc: s
      ? `${s.total} problems solved, current streak ${s.currentStreak} days`
      : "Solved problems unavailable",
    css: `
    .total { font: 800 34px ${FONT}; fill: ${t.text}; }
    .axis { font: 500 10px ${FONT}; fill: ${t.muted}; }
    .count { font: 600 11px ${FONT}; fill: ${t.text}; }
    .pill { font: 600 11px ${FONT}; fill: ${t.text}; }
    .pill-count { fill: ${t.muted}; font-weight: 500; }`,
    body: `${header("PROBLEMS SOLVED", stats, t)}
  ${body}`,
  });
}
