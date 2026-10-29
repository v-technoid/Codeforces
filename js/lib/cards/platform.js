// Cards for any platform, drawn from the shared stats shape (see ../platforms/index.js).
// Codeforces keeps its own detailed cards; every other platform uses these.
import { colorFor, getPlatform, nextTierFor, tierFor } from "../platforms/index.js";
import { renderContestsCard } from "./contests.js";
import { renderHeatmapCard } from "./heatmap.js";
import { renderRatingCard } from "./rating.js";
import { emptyBody, escapeXml, fmt, frame, truncate, FONT } from "./shared.js";

const present = (v) => v !== undefined && v !== null && v !== "" && !Number.isNaN(v);
const show = (v) => (typeof v === "number" ? fmt(v) : String(v));

/** The detailed card renderers expect Codeforces shaped data; this converts. */
function asRatings(p) {
  const history = p.history ?? [];
  return {
    user: { handle: p.handle, rating: p.rating, maxRating: p.maxRating },
    contests: p.contests,
    bestContestRank: p.bestRank,
    ratings: history.map((h, i) => ({
      contestId: i,
      contestName: h.name,
      rank: h.rank,
      oldRating: h.old ?? h.rating,
      newRating: h.rating,
      ratingUpdateTimeSeconds: h.time,
    })),
    activity: p.activity,
  };
}

function colors(platform, p, t) {
  const color = colorFor(platform, p, t.dark);
  const accent = t.dark ? platform.accent.dark : platform.accent.light;
  const colorAt = (v) => {
    const tier = tierFor(platform, v);
    return tier ? (t.dark ? tier.dark : tier.light) : color;
  };
  return { color, accent, colorAt };
}

/* ---------- Profile ---------- */

function renderStats(platform, p, options) {
  const { theme: t, animate = true } = options;
  const hide = options.hide ?? new Set();
  const { color, accent, colorAt } = colors(platform, p, t);
  const rated = present(p.rating);
  const sub = p.rankLabel || p.name || (rated ? "Rated" : "");

  const cells = [];
  if (rated || present(p.maxRating)) {
    if (present(p.maxRating)) cells.push({ id: "max_rating", label: "Max rating", value: p.maxRating, color: colorAt(p.maxRating) });
    if (present(p.contests)) cells.push({ id: "contests", label: "Contests", value: p.contests });
    if (present(p.bestRank) && Number.isFinite(p.bestRank)) cells.push({ id: "best_rank", label: "Best rank", value: `#${fmt(p.bestRank)}` });
    if (present(p.solved)) cells.push({ id: "solved", label: "Solved", value: p.solved });
  }
  for (const f of p.facts ?? []) {
    if (!present(f.value) || cells.some((c) => c.label === f.label)) continue;
    cells.push({ id: f.label.toLowerCase().replace(/\W+/g, "_"), label: f.label, value: f.value });
  }
  const shown = cells.filter((c) => !hide.has(c.id)).slice(0, 6);

  const grid = shown
    .map((cell, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return `<g class="fade" style="animation-delay:${200 + i * 70}ms" transform="translate(${25 + col * 112}, ${120 + row * 42})">
    <text class="label">${escapeXml(truncate(cell.label.toUpperCase(), 17))}</text>
    <text class="value" y="20"${cell.color ? ` style="fill:${cell.color}"` : ""}>${escapeXml(truncate(show(cell.value), col === 2 ? 13 : 11))}</text>
  </g>`;
    })
    .join("");

  let right;
  if (rated) {
    const r = 44;
    const c = 2 * Math.PI * r;
    const tier = tierFor(platform, p.rating);
    const next = nextTierFor(platform, p.rating);
    const progress = tier && next ? Math.min(1, Math.max(0, (p.rating - tier.min) / (next.min - tier.min))) : 1;
    const offset = c * (1 - progress);
    const note = next ? `+${next.min - p.rating} to ${next.name}` : platform.tiers ? "Top tier" : "rating";
    right = `<g transform="translate(420, 78)">
    <circle r="${r}" stroke="${t.track}" stroke-width="8"/>
    <circle class="ring" r="${r}" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(animate ? c : offset).toFixed(2)}" transform="rotate(-90)"/>
    <text class="big" y="4" text-anchor="middle" fill="${color}">${p.rating}</text>
    <text class="small" y="20" text-anchor="middle">rating</text>
    <text class="small" y="${r + 22}" text-anchor="middle">${escapeXml(note)}</text>
  </g>
  <style>${animate ? `.ring { animation: ring 1.1s cubic-bezier(.4,0,.2,1) forwards; } @keyframes ring { from { stroke-dashoffset: ${c.toFixed(2)}; } to { stroke-dashoffset: ${offset.toFixed(2)}; } }` : ""}</style>`;
  } else {
    const value = present(p.primary?.value) ? show(p.primary.value) : present(p.solved) ? fmt(p.solved) : "n/a";
    const label = present(p.primary?.value) ? p.primary.label : "solved";
    const size = value.length <= 4 ? 34 : value.length <= 7 ? 26 : 19;
    right = `<g class="fade" style="animation-delay:150ms" transform="translate(420, 84)" text-anchor="middle">
    <text y="0" style="font:800 ${size}px ${FONT};fill:${color}">${escapeXml(value)}</text>
    <text class="small" y="22">${escapeXml(label)}</text>
  </g>`;
  }

  const spark = rated && !hide.has("trend") ? sparkline((p.history ?? []).slice(-30).map((h) => h.rating), color) : "";

  return frame({
    options,
    height: 200,
    accent: color,
    title: `${p.handle} on ${platform.name}`,
    desc: [sub, rated ? `rating ${p.rating}` : "", present(p.solved) ? `${p.solved} solved` : ""].filter(Boolean).join(", "),
    css: `
    .platform { font: 700 10.5px ${FONT}; letter-spacing: 1.6px; fill: ${accent}; }
    .big-handle { font: 700 22px ${FONT}; }
    .sub { font: 600 13px ${FONT}; }
    .big { font: 800 24px ${FONT}; }`,
    body: `<g transform="translate(25, 34)">
    <text class="platform">${escapeXml(platform.name.toUpperCase())}</text>
    <text class="big-handle" y="28" fill="${color}">${escapeXml(truncate(p.handle, 22))}</text>
    ${sub ? `<text class="sub" y="49" fill="${color}">${escapeXml(truncate(sub, 30))}</text>` : ""}
  </g>
  ${shown.length ? grid : emptyBody("No stats to show yet.", 140)}
  ${right}
  ${spark}`,
  });
}

function sparkline(values, color) {
  if (values.length < 2) return "";
  const [x, y, w, h] = [372, 160, 96, 24];
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => [x + i * step, y + h - ((v - min) / range) * h]);
  const [lx, ly] = pts[pts.length - 1];
  return `<g class="fade" style="animation-delay:700ms">
    <polyline points="${pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ")}" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round" opacity=".75"/>
    <circle cx="${lx.toFixed(1)}" cy="${ly.toFixed(1)}" r="2.4" fill="${color}"/>
  </g>`;
}

/* ---------- Solved ---------- */

function renderSolved(platform, p, options) {
  const { theme: t } = options;
  const { color, accent } = colors(platform, p, t);
  const bars = (p.difficulty ?? []).filter((d) => d.label);
  const total = present(p.solved) ? p.solved : bars.reduce((a, b) => a + b.count, 0);
  const facts = (p.facts ?? [])
    .filter((f) => present(f.value) && !["Solved", "Completed"].includes(f.label) && !String(f.value).includes("★"))
    .slice(0, bars.length ? 3 : 4);
  const isScore = platform.id === "codewars";

  const left = `<g transform="translate(25, 98)">
    <text class="total">${present(total) ? fmt(total) : "n/a"}</text>
    <text class="small" y="18">${isScore ? "kata completed" : "problems solved"}</text>
  </g>
  ${facts
    .map(
      (f, i) => `<g class="fade" style="animation-delay:${300 + i * 80}ms" transform="translate(${25 + i * 100}, 158)">
    <text class="label">${escapeXml(truncate(f.label.toUpperCase(), 14))}</text>
    <text class="value" y="20">${escapeXml(truncate(show(f.value), 11))}</text>
  </g>`,
    )
    .join("")}`;

  let right = "";
  if (bars.length) {
    const max = Math.max(1, ...bars.map((b) => (b.total ? b.total : b.count)));
    const barX = 330;
    const barW = 105;
    right = `<text class="label" x="${barX}" y="50">${escapeXml(platform.breakdownLabel ?? "BY DIFFICULTY")}</text>
  ${bars
    .slice(0, 5)
    .map((b, i) => {
      const y = 60 + i * 19;
      const share = b.total ? b.count / b.total : b.count / max;
      const fill = t.dark ? b.color.dark : b.color.light;
      return `<g transform="translate(0, ${y})">
    <text class="axis" x="${barX - 8}" y="9" text-anchor="end">${escapeXml(truncate(b.label, 12))}</text>
    <rect x="${barX}" y="1" width="${barW}" height="10" rx="3" fill="${t.track}"/>
    <rect class="grow" style="animation-delay:${200 + i * 70}ms" x="${barX}" y="1" width="${Math.max(b.count ? 3 : 0, share * barW).toFixed(1)}" height="10" rx="3" fill="${fill}"/>
    <text class="count" x="${barX + barW + 7}" y="10">${fmt(b.count)}${b.total ? `<tspan class="of">/${fmt(b.total)}</tspan>` : ""}</text>
  </g>`;
    })
    .join("")}`;
  }

  return frame({
    options,
    height: 200,
    accent: color,
    title: `${p.handle} problems solved on ${platform.name}`,
    desc: `${total ?? 0} solved`,
    css: `
    .platform { font: 700 10.5px ${FONT}; letter-spacing: 1.6px; fill: ${accent}; }
    .total { font: 800 34px ${FONT}; fill: ${t.text}; }
    .axis { font: 500 10px ${FONT}; fill: ${t.muted}; }
    .count { font: 600 11px ${FONT}; fill: ${t.text}; }
    .of { fill: ${t.muted}; font-weight: 500; }`,
    body: `<g transform="translate(25, 32)">
    <text class="platform">${escapeXml(platform.name.toUpperCase())} SOLVED</text>
    <text class="handle" y="23" fill="${color}">${escapeXml(truncate(p.handle, 26))}</text>
  </g>
  ${left}
  ${right}`,
  });
}

/* ---------- Badge ---------- */

function textWidth(text) {
  let w = 0;
  for (const ch of text) {
    if ("ilI.,:;|!'".includes(ch)) w += 3.4;
    else if ("mwMW".includes(ch)) w += 9.6;
    else if (ch === " ") w += 3.9;
    else if (/[A-Z0-9★]/.test(ch)) w += 7.6;
    else w += 6.6;
  }
  return Math.ceil(w);
}

function renderBadge(platform, p) {
  const left = platform.name;
  const right = present(p.rating)
    ? `${p.rankLabel ? `${p.rankLabel} ` : ""}${p.rating}`
    : p.rankColor && p.rankLabel
      ? p.rankLabel
      : present(p.primary?.value)
      ? `${show(p.primary.value)} ${p.primary.label}`
      : present(p.solved)
        ? `${fmt(p.solved)} solved`
        : "Profile";
  // Badges use light colors everywhere so they read on both GitHub themes.
  let color = colorFor(platform, p, false);
  if (/^#(000|111|222)/i.test(color) || color === "#0000ff") color = "#2b55e6";
  const lw = textWidth(left) + 14;
  const rw = textWidth(right) + 14;
  const w = lw + rw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${escapeXml(`${left}: ${right}`)}">
  <title>${escapeXml(`${p.handle} on ${left}: ${right}`)}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#555"/>
    <rect x="${lw}" width="${rw}" height="20" fill="${color}"/>
    <rect width="${w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${lw / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(left)}</text>
    <text x="${lw / 2}" y="14">${escapeXml(left)}</text>
    <text x="${lw + rw / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(right)}</text>
    <text x="${lw + rw / 2}" y="14">${escapeXml(right)}</text>
  </g>
</svg>`;
}

/* ---------- Dispatch ---------- */

/** Draws `type` for a non Codeforces platform. */
export function renderPlatformCard(type, platformId, p, options) {
  const platform = getPlatform(platformId);
  const { color, colorAt } = colors(platform, p, options.theme);
  const NAME = platform.name.toUpperCase();
  const shared = { ...options, color, colorAt, tiers: platform.tiers ?? [{ name: "", min: 0, ...platform.accent }], platformName: platform.name };
  switch (type) {
    case "rating":
      return renderRatingCard(asRatings(p), { ...shared, eyebrow: `${NAME} RATING` });
    case "contests":
      return renderContestsCard(asRatings(p), { ...shared, eyebrow: `${NAME} CONTESTS` });
    case "heatmap":
      return renderHeatmapCard(asRatings(p), { ...shared, eyebrow: `${NAME} SUBMISSIONS` });
    case "solved":
      return renderSolved(platform, p, options);
    case "badge":
      return renderBadge(platform, p);
    default:
      return renderStats(platform, p, options);
  }
}
