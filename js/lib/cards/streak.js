// Streak: current and longest run of days with at least one submission,
// plus active days in the last year. Drawn from the same activity data as the
// heatmap, so it works on every platform that shares a heatmap.
import { emptyBody, escapeXml, fmt, frame, header, rankColor, FONT } from "./shared.js";

export const STREAK_FIELDS = [
  { id: "active", label: "Active days" },
  { id: "dates", label: "Dates under each number" },
  { id: "strip", label: "Last 30 days strip" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86400000;

/**
 * Reads streaks from an activity grid ({ start, counts }), where the last
 * entry is today. A streak still counts as current if the last submission
 * was yesterday, so it doesn't drop to zero first thing in the morning.
 */
export function streaksOf(activity) {
  const c = activity.counts;
  const last = c.length - 1;
  let longest = { length: 0, end: -1 };
  let run = 0;
  for (let i = 0; i <= last; i++) {
    run = c[i] > 0 ? run + 1 : 0;
    if (run > longest.length) longest = { length: run, end: i };
  }
  let end = c[last] > 0 ? last : c[last - 1] > 0 ? last - 1 : -1;
  let length = 0;
  if (end >= 0) for (let i = end; i >= 0 && c[i] > 0; i--) length++;
  let best = { count: 0, at: -1 };
  c.forEach((n, i) => {
    if (n > best.count) best = { count: n, at: i };
  });
  return {
    current: { length, end, start: end - length + 1 },
    longest: { length: longest.length, end: longest.end, start: longest.end - longest.length + 1 },
    activeDays: c.filter((n) => n > 0).length,
    total: c.reduce((a, b) => a + b, 0),
    best,
    startMs: Date.parse(`${activity.start}T00:00:00Z`),
  };
}

function dayLabel(startMs, index) {
  const d = new Date(startMs + index * DAY_MS);
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

function range(s, run) {
  if (run.length === 0) return "No streak yet";
  if (run.length === 1) return dayLabel(s.startMs, run.start);
  return `${dayLabel(s.startMs, run.start)} to ${dayLabel(s.startMs, run.end)}`;
}

// A symmetric flame centered on (0, 0): an outer teardrop with a smaller one
// cut out of its base, so it reads as a flame even at this size.
const FLAME_OUTER = "M0 -10.5C1.2 -6.8 7 -4 7 2C7 6 4 9 0 9C-4 9 -7 6 -7 2C-7 -4 -1.2 -6.8 0 -10.5Z";
const FLAME_INNER = "M0 0.5C1.8 2.4 3 3.6 3 5.2C3 6.9 1.7 8 0 8C-1.7 8 -3 6.9 -3 5.2C-3 3.6 -1.8 2.4 0 0.5Z";

export function renderStreakCard(stats, options) {
  const { theme: t, animate = true } = options;
  const hide = options.hide ?? new Set();
  const color = options.color ?? rankColor(stats.user.rating, t);
  const eyebrow = options.eyebrow ?? "SUBMISSION STREAK";
  const a = stats.activity;
  const showStrip = !hide.has("strip");
  const height = showStrip ? 246 : 214;

  let body;
  let desc = "No activity data";
  if (!a) {
    body = emptyBody("Submission activity couldn't be loaded right now.", 120);
  } else {
    const s = streaksOf(a);
    desc = `Current streak ${s.current.length} days, longest ${s.longest.length} days, ${s.activeDays} active days in the last year`;
    const dates = !hide.has("dates");
    const r = 38;
    const cx = 247;
    const cy = 128;
    const circ = 2 * Math.PI * r;
    const lit = s.current.length > 0;
    // The ring fills toward the longest streak, so beating your record closes it.
    const share = lit ? Math.min(1, s.current.length / Math.max(1, s.longest.length)) : 0;
    const offset = circ * (1 - share);

    const column = (x, value, label, sub, delay) => `<g class="fade" style="animation-delay:${delay}ms" transform="translate(${x}, 0)" text-anchor="middle">
    <text class="num" y="${cy + 6}">${fmt(value)}</text>
    <text class="col-label" y="${cy + 30}">${label}</text>
    ${dates ? `<text class="small" y="${cy + 47}">${escapeXml(sub)}</text>` : ""}
  </g>`;

    const left = hide.has("active")
      ? column(95, s.total, "Submissions", "in the last year", 150)
      : column(95, s.activeDays, "Active days", `${fmt(s.total)} submissions`, 150);
    const right = column(400, s.longest.length, "Longest streak", range(s, s.longest), 300);

    const center = `<g transform="translate(${cx}, ${cy})">
    <circle r="${r}" stroke="${t.track}" stroke-width="6"/>
    ${lit ? `<circle class="sring" r="${r}" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${circ.toFixed(2)}" stroke-dashoffset="${(animate ? circ : offset).toFixed(2)}" transform="rotate(-90)"/>` : ""}
    <g transform="translate(0, ${-r})">
      <circle r="15" fill="${lit ? color : t.track}" stroke="${t.background === "rgba(0,0,0,0)" ? "none" : t.background}" stroke-width="4"/>
      <g class="${lit && animate ? "flame" : ""}">
        <path d="${FLAME_OUTER}" fill="${lit ? "#fff" : t.muted}"/>
        <path d="${FLAME_INNER}" fill="${lit ? color : t.track}"/>
      </g>
    </g>
    <text class="cur" y="12" text-anchor="middle" fill="${lit ? color : t.muted}">${fmt(s.current.length)}</text>
  </g>
  <g class="fade" style="animation-delay:220ms" text-anchor="middle" transform="translate(${cx}, 0)">
    <text class="col-label" y="${cy + 58}" fill="${lit ? color : t.text}" style="fill:${lit ? color : t.text}">Current streak</text>
    ${dates ? `<text class="small" y="${cy + 74}">${escapeXml(lit ? range(s, s.current) : "Submit today to start one")}</text>` : ""}
  </g>
  <style>${
    animate && lit
      ? `.sring { animation: sring 1.2s cubic-bezier(.4,0,.2,1) .2s forwards; }
    @keyframes sring { to { stroke-dashoffset: ${offset.toFixed(2)}; } }
    .flame { transform-box: fill-box; transform-origin: 50% 90%; animation: flicker 1.6s ease-in-out infinite; }
    @keyframes flicker { 0%,100% { transform: scale(1, 1); } 35% { transform: scale(.93, 1.1); } 65% { transform: scale(1.05, .95); } }
    @media (prefers-reduced-motion: reduce) { .sring, .flame { animation: none !important; stroke-dashoffset: ${offset.toFixed(2)}; } }`
      : ""
  }</style>`;

    const dividers = [171, 323]
      .map((x) => `<line x1="${x}" y1="${cy - 30}" x2="${x}" y2="${cy + 44}" stroke="${t.border}" stroke-width="1"/>`)
      .join("");

    let strip = "";
    if (showStrip) {
      const days = a.counts.slice(-30);
      const w = 11.6;
      const x0 = 495 / 2 - (days.length * w) / 2;
      strip = `<g transform="translate(0, ${height - 26})">
    ${days
      .map(
        (n, i) =>
          `<rect class="fade" style="animation-delay:${400 + i * 18}ms" x="${(x0 + i * w).toFixed(1)}" width="9" height="9" rx="2" fill="${n > 0 ? color : t.track}"${n > 0 ? ` fill-opacity="${Math.min(1, 0.45 + n / Math.max(4, s.best.count))}"` : ""}/>`,
      )
      .join("")}
    <text class="small" x="${(x0 - 8).toFixed(1)}" y="8" text-anchor="end">30 days</text>
    <text class="small" x="${(x0 + days.length * w + 6).toFixed(1)}" y="8">today</text>
  </g>`;
    }

    body = `${dividers}${left}${center}${right}${strip}`;
  }

  return frame({
    options,
    height,
    accent: color,
    title: `${stats.user.handle} submission streak`,
    desc,
    css: `
    .num { font: 800 26px ${FONT}; fill: ${t.text}; }
    .cur { font: 800 30px ${FONT}; }
    .col-label { font: 700 12.5px ${FONT}; fill: ${t.text}; }`,
    body: `${header(eyebrow, stats, t, options.color, !!options.color)}
  ${body}`,
  });
}
