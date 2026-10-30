// Achievements: trophies for milestones, from bronze up to diamond, with a
// bar toward the next level. Works for every platform from the shared stats
// shape; Codeforces stats are converted first.
import { getPlatform, tierFor } from "../platforms/index.js";
import { fromCodeforces } from "../platforms/codeforces.js";
import { streaksOf } from "./streak.js";
import { escapeXml, fmt, frame, truncate, FONT } from "./shared.js";

export const TROPHY_FIELDS = [
  { id: "rating", label: "Peak rating" },
  { id: "solved", label: "Problems solved" },
  { id: "contests", label: "Contests" },
  { id: "rank", label: "Best rank" },
  { id: "streak", label: "Longest streak" },
  { id: "active", label: "Active days" },
  { id: "next", label: "Progress bars" },
];

const LEVELS = [
  { name: "Locked", mark: "", light: "#c9ccd6", dark: "#3a3f55" },
  { name: "Bronze", mark: "C", light: "#b8692e", dark: "#d98b4f" },
  { name: "Silver", mark: "B", light: "#7d8796", dark: "#b6c0cc" },
  { name: "Gold", mark: "A", light: "#c99400", dark: "#f2c14a" },
  { name: "Platinum", mark: "S", light: "#0f9fb3", dark: "#45d6ea" },
  { name: "Diamond", mark: "SS", light: "#6b4cf0", dark: "#a593ff" },
];

/** Level 0 to 5 for a value against five thresholds. lower: smaller values are better. */
function levelOf(value, steps, lower = false) {
  let level = 0;
  for (const s of steps) if (lower ? value <= s : value >= s) level++;
  return level;
}

function progress(value, steps, level, lower = false) {
  if (level >= steps.length) return { share: 1, next: null };
  const from = level === 0 ? (lower ? steps[0] * 4 : 0) : steps[level - 1];
  const to = steps[level];
  const share = lower ? (from - value) / (from - to) : (value - from) / (to - from);
  return { share: Math.max(0, Math.min(1, share)), next: to };
}

/** The trophies a profile has data for, in display order. */
export function trophiesFor(platform, p) {
  const list = [];
  const peak = p.maxRating ?? p.rating;
  if (peak !== undefined && platform?.tiers?.length > 1) {
    // Rating levels follow the platform's own tiers, spread over five steps.
    const tiers = platform.tiers.slice(1);
    const pick = (f) => tiers[Math.min(tiers.length - 1, Math.round(f * (tiers.length - 1)))].min;
    const steps = [pick(0), pick(0.25), pick(0.5), pick(0.75), pick(1)].map((v, i, a) => (i && v <= a[i - 1] ? a[i - 1] + 1 : v));
    const tier = tierFor(platform, peak);
    list.push({ id: "rating", title: "Peak rating", value: peak, show: fmt(peak), sub: tier?.name ?? "", steps });
  }
  if (p.solved !== undefined) list.push({ id: "solved", title: "Problems solved", value: p.solved, show: fmt(p.solved), steps: [10, 50, 150, 400, 1000] });
  if (p.contests) list.push({ id: "contests", title: "Contests", value: p.contests, show: fmt(p.contests), steps: [1, 5, 15, 40, 100] });
  if (p.bestRank && Number.isFinite(p.bestRank)) {
    list.push({ id: "rank", title: "Best rank", value: p.bestRank, show: `#${fmt(p.bestRank)}`, steps: [20000, 5000, 1000, 200, 20], lower: true });
  }
  if (p.activity) {
    const s = streaksOf(p.activity);
    list.push({ id: "streak", title: "Longest streak", value: s.longest.length, show: `${s.longest.length} days`, steps: [3, 7, 15, 30, 100] });
    list.push({ id: "active", title: "Active days", value: s.activeDays, show: fmt(s.activeDays), sub: "last year", steps: [10, 50, 100, 200, 300] });
  }
  return list;
}

// A medal: ribbon tails behind a round face, with the level mark in the middle.
function medal(color, level, t, animate, delay) {
  const locked = level === 0;
  return `<g class="${animate ? "medal" : ""}" style="animation-delay:${delay}ms">
      <path d="M-8 8 -12 24 -5 20 0 26 1 12Z M8 8 12 24 5 20 0 26 -1 12Z" fill="${color}" opacity="${locked ? 0.5 : 0.75}"/>
      <circle r="15" fill="${color}"${locked ? ` fill-opacity=".35"` : ""}/>
      <circle r="11" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="1.4"/>
      ${
        locked
          ? `<path d="M-4.5 -1v-2.5a4.5 4.5 0 0 1 9 0V-1 M-6 -1h12v8h-12z" stroke="#fff" stroke-width="1.6" fill="none" stroke-linejoin="round"/>`
          : `<text class="mark" y="${LEVELS[level].mark.length > 1 ? 3.6 : 4.4}" text-anchor="middle" fill="#1b1530" fill-opacity=".85" style="font-size:${LEVELS[level].mark.length > 1 ? 10 : 12.5}px">${LEVELS[level].mark}</text>`
      }
    </g>`;
}

export function renderTrophiesCard(data, options) {
  const { theme: t, animate = true } = options;
  const hide = options.hide ?? new Set();
  // Codeforces cards hand over Codeforces shaped data; everything else is already shared.
  const p = data?.user ? fromCodeforces(data) : data;
  const platform = getPlatform(p.platform ?? "codeforces");
  const accent = options.color ?? (t.dark ? platform.accent.dark : platform.accent.light);
  const items = trophiesFor(platform, p).filter((x) => !hide.has(x.id)).slice(0, 6);
  const showNext = !hide.has("next");

  // Up to three per row; fewer trophies get wider tiles so the card stays full.
  const cols = Math.max(1, Math.min(3, items.length));
  const w = (445 - (cols - 1) * 8) / cols;
  const h = 92;
  const gap = 8;
  const rows = Math.max(1, Math.ceil(items.length / cols));
  const height = 66 + rows * h + (rows - 1) * gap + 20;
  const earned = items.filter((x) => levelOf(x.value, x.steps, x.lower) > 0).length;

  const tiles = items
    .map((x, i) => {
      const level = levelOf(x.value, x.steps, x.lower);
      const L = LEVELS[level];
      const color = t.dark ? L.dark : L.light;
      const { share, next } = progress(x.value, x.steps, level, x.lower);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const tx = 25 + col * (w + gap);
      const ty = 66 + row * (h + gap);
      const nextText = next === null ? "Top level" : `next ${x.lower ? `#${fmt(next)}` : fmt(next)}`;
      return `<g class="fade" style="animation-delay:${150 + i * 80}ms" transform="translate(${tx}, ${ty})">
    <rect width="${w}" height="${h}" rx="9" fill="${t.track}" fill-opacity="${t.dark ? 0.55 : 0.6}"/>
    <g transform="translate(24, 30)">${medal(color, level, t, animate, 250 + i * 80)}</g>
    <text class="tt" x="48" y="21">${escapeXml(x.title.toUpperCase())}</text>
    <text class="tv" x="48" y="40">${escapeXml(truncate(x.show, 11))}</text>
    <text class="ts" x="48" y="54" fill="${level ? color : t.muted}">${escapeXml(level ? L.name : "Locked")}${x.sub ? `<tspan class="tsub"> · ${escapeXml(truncate(x.sub, 12))}</tspan>` : ""}</text>
    ${
      showNext
        ? `<rect x="12" y="66" width="${w - 24}" height="4" rx="2" fill="${t.border}"/>
    <rect class="grow" style="animation-delay:${400 + i * 80}ms" x="12" y="66" width="${Math.max(share > 0 ? 3 : 0, share * (w - 24)).toFixed(1)}" height="4" rx="2" fill="${color}"/>
    <text class="tn" x="12" y="84">${escapeXml(nextText)}</text>
    <text class="tn" x="${w - 12}" y="84" text-anchor="end">${Math.round(share * 100)}%</text>`
        : ""
    }
  </g>`;
    })
    .join("");

  return frame({
    options,
    height,
    accent,
    title: `${p.handle} achievements on ${platform.name}`,
    desc: items.map((x) => `${x.title}: ${x.show} (${LEVELS[levelOf(x.value, x.steps, x.lower)].name})`).join(", "),
    css: `
    .tt { font: 700 8.5px ${FONT}; letter-spacing: .7px; fill: ${t.muted}; }
    .tv { font: 800 15px ${FONT}; fill: ${t.text}; }
    .ts { font: 700 9.5px ${FONT}; }
    .tsub { font-weight: 500; fill: ${t.muted}; }
    .tn { font: 500 8.5px ${FONT}; fill: ${t.muted}; }
    .mark { font-family: ${FONT}; font-weight: 900; }
    ${
      animate
        ? `.medal { transform-box: fill-box; transform-origin: center; animation: medal .7s cubic-bezier(.3,1.5,.5,1) both; }
    @keyframes medal { from { transform: scale(.2) rotate(-25deg); opacity: 0; } to { transform: none; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .medal { animation: none; } }`
        : ""
    }`,
    body: `<g transform="translate(25, 32)">
    <text class="eyebrow">${escapeXml(platform.name.toUpperCase())} ACHIEVEMENTS</text>
    <text class="handle" y="23" fill="${accent}">${escapeXml(truncate(p.handle, 24))}</text>
  </g>
  <text class="small" x="470" y="55" text-anchor="end">${earned} of ${items.length} earned</text>
  ${items.length ? tiles : `<text class="text" x="25" y="96">No stats to award yet.</text>`}`,
  });
}
