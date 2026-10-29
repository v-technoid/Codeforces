import { emptyBody, fmt, frame, header, rankColor, FONT } from "./shared.js";
export const HEATMAP_HEIGHT = 178;
/** Ids accepted by `hide` on the heatmap. */
export const HEATMAP_FIELDS = [
  { id: "legend", label: "Legend" },
  { id: "labels", label: "Day and month labels" },
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function renderHeatmapCard(stats, options) {
  const { theme: t } = options;
  const hide = options.hide ?? new Set();
  const color = options.color ?? rankColor(stats.user.rating, t);
  const a = stats.activity;
  let body = emptyBody("Submission activity couldn't be loaded right now.", 120);
  if (a) {
    const step = 8;
    const size = 6.4;
    const gx = 48;
    const gy = 82;
    // Levels are relative to the busiest days, so light and heavy users both get a readable map.
    const sorted = a.counts.filter((c) => c > 0).sort((x, y) => x - y);
    const q = (p) => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 1;
    const cuts = [q(0.25), q(0.5), q(0.75)];
    const level = (c) => (c === 0 ? 0 : c <= cuts[0] ? 1 : c <= cuts[1] ? 2 : c <= cuts[2] ? 3 : 4);
    const opacity = [0, 0.3, 0.5, 0.75, 1];
    const startMs = Date.parse(`${a.start}T00:00:00Z`);
    const weeks = Math.ceil(a.counts.length / 7);
    const columns = [];
    const months = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      const cells = [];
      for (let d = 0; d < 7; d++) {
        const i = w * 7 + d;
        if (i >= a.counts.length) break;
        const c = a.counts[i];
        const lv = level(c);
        cells.push(
          lv === 0
            ? `<rect y="${d * step}" width="${size}" height="${size}" rx="1.5" fill="${t.track}"/>`
            : `<rect y="${d * step}" width="${size}" height="${size}" rx="1.5" fill="${color}" fill-opacity="${opacity[lv]}"/>`,
        );
      }
      columns.push(
        `<g class="fade" style="animation-delay:${Math.round(w * 14)}ms" transform="translate(${gx + w * step}, ${gy})">${cells.join("")}</g>`,
      );
      const month = new Date(startMs + w * 7 * 86400000).getUTCMonth();
      if (month !== lastMonth && w < weeks - 2) {
        // A month that only shows for a week or two at the start would crowd the next label.
        if (months.length && w - Number(months[months.length - 1].split("|")[0]) < 3) months.pop();
        months.push(`${w}|${MONTHS[month]}`);
        lastMonth = month;
      }
    }
    const monthLabels = months.map((m) => {
      const [w, name] = m.split("|");
      return `<text class="axis" x="${gx + Number(w) * step}" y="${gy - 6}">${name}</text>`;
    });
    const dayLabels = hide.has("labels")
      ? ""
      : ["Mon", "Wed", "Fri"]
          .map((d, i) => `<text class="axis" x="25" y="${gy + (1 + i * 2) * step + 6}">${d}</text>`)
          .join("") + monthLabels.join("");
    const legend = hide.has("legend")
      ? ""
      : `<g transform="translate(${gx + weeks * step - 5 * 10 - 30}, ${gy + 7 * step + 14})">
    <text class="axis" x="-6" y="7" text-anchor="end">Less</text>
    ${opacity
      .map((o, i) =>
        i === 0
          ? `<rect x="0" width="${size}" height="${size}" rx="1.5" fill="${t.track}"/>`
          : `<rect x="${i * 10}" width="${size}" height="${size}" rx="1.5" fill="${color}" fill-opacity="${o}"/>`,
      )
      .join("")}
    <text class="axis" x="${5 * 10 + 2}" y="7">More</text>
  </g>`;
    const summary = `<g transform="translate(470, 40)" text-anchor="end">
    <text class="now" fill="${color}">${fmt(a.total)}</text>
    <text class="small" y="18">submissions in the last year, ${fmt(a.activeDays)} active days</text>
  </g>`;
    body = `${summary}
  ${dayLabels}
  ${columns.join("")}
  ${legend}`;
  }
  return frame({
    options,
    height: HEATMAP_HEIGHT,
    accent: color,
    title: `${stats.user.handle} ${options.platformName ?? "Codeforces"} submissions in the last year`,
    desc: a ? `${a.total} submissions on ${a.activeDays} days in the last year` : "Activity unavailable",
    css: `
    .now { font: 800 22px ${FONT}; }
    .axis { font: 500 9.5px ${FONT}; fill: ${t.muted}; }`,
    body: `${header(options.eyebrow ?? "SUBMISSIONS", stats, t, options.color, !!options.color)}
  ${body}`,
  });
}
