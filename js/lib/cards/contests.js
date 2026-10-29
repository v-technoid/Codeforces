import { emptyBody, escapeXml, fmt, frame, header, rankColor, truncate, FONT } from "./shared.js";
/** Ids accepted by `hide` on the contests card. */
export const CONTESTS_FIELDS = [
  { id: "date", label: "Dates" },
  { id: "rating", label: "New rating" },
];
const ROWS = 5;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function contestsHeight(count) {
  return count === 0 ? 120 : 92 + Math.min(ROWS, count) * 26 + 10;
}
export function renderContestsCard(stats, options) {
  const { theme: t } = options;
  const hide = options.hide ?? new Set();
  const color = options.color ?? rankColor(stats.user.rating, t);
  const colorAt = options.colorAt ?? ((v) => rankColor(v, t));
  const recent = stats.ratings.slice(-ROWS).reverse();
  const up = t.dark ? "#4ade80" : "#15803d";
  const down = t.dark ? "#f87171" : "#c42b2b";
  const showDate = !hide.has("date");
  const showRating = !hide.has("rating");
  const nameMax = 34 + (showDate ? 0 : 8) + (showRating ? 0 : 6);
  let body = emptyBody("No rated contests yet. They'll show up here after the first one.", 96);
  if (recent.length > 0) {
    const head = `<g transform="translate(0, 82)">
    <text class="label" x="25">CONTEST</text>
    <text class="label" x="${showRating ? 360 : 410}" text-anchor="end">RANK</text>
    <text class="label" x="${showRating ? 412 : 470}" text-anchor="end">CHANGE</text>
    ${showRating ? `<text class="label" x="470" text-anchor="end">RATING</text>` : ""}
  </g>`;
    const rows = recent
      .map((r, i) => {
        const y = 106 + i * 26;
        const delta = r.newRating - r.oldRating;
        const date =
          showDate && r.ratingUpdateTimeSeconds
            ? (() => {
                const d = new Date(r.ratingUpdateTimeSeconds * 1000);
                return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`;
              })()
            : "";
        const name = truncate(r.contestName ?? `Contest ${r.contestId}`, nameMax);
        return `<g class="fade" style="animation-delay:${150 + i * 90}ms" transform="translate(0, ${y})">
    ${i > 0 ? `<line x1="25" x2="470" y1="-17" y2="-17" stroke="${t.border}"/>` : ""}
    <text class="text" x="25">${escapeXml(name)}${date ? ` <tspan class="date">${date}</tspan>` : ""}</text>
    <text class="num" x="${showRating ? 360 : 410}" text-anchor="end">${r.rank ? `#${fmt(r.rank)}` : "n/a"}</text>
    <text class="num" x="${showRating ? 412 : 470}" text-anchor="end" style="fill:${delta > 0 ? up : delta < 0 ? down : t.muted}">${delta > 0 ? "+" : ""}${delta}</text>
    ${showRating ? `<text class="num" x="470" text-anchor="end" style="fill:${colorAt(r.newRating)}">${r.newRating}</text>` : ""}
  </g>`;
      })
      .join("");
    body = head + rows;
  }
  return frame({
    options,
    height: contestsHeight(recent.length),
    accent: color,
    title: `${stats.user.handle} recent ${options.platformName ?? "Codeforces"} contests`,
    desc: recent.length
      ? `Last ${recent.length} rated contests, latest rank ${recent[0].rank}`
      : "No rated contests yet",
    css: `
    .num { font: 700 12px ${FONT}; fill: ${t.text}; font-variant-numeric: tabular-nums; }
    .date { fill: ${t.muted}; font-size: 10.5px; }`,
    body: `${header(options.eyebrow ?? "RECENT CONTESTS", stats, t, options.color, !!options.colorAt)}
  ${body}`,
  });
}
