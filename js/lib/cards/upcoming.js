// Upcoming contests from Codeforces, LeetCode, AtCoder and CodeChef, with
// start time, length and a countdown. `sites` picks which platforms to include.
import { CONTEST_SITES, DEFAULT_SITES, siteInfo } from "../contests.js";
import { emptyBody, escapeXml, frame, truncate, FONT } from "./shared.js";

export const UPCOMING_PARAMS = [
  {
    name: "sites",
    label: "Platforms",
    kind: "list",
    separator: ",",
    maxItems: CONTEST_SITES.length,
    maxLength: 12,
    default: DEFAULT_SITES,
    hint: `Any of ${DEFAULT_SITES.join(", ")}, separated by commas.`,
  },
  { name: "count", label: "How many contests", kind: "number", min: 1, max: 6, default: 4 },
  {
    name: "tz",
    label: "Time zone",
    kind: "timezone",
    default: "UTC",
    hint: "Times on the card use this time zone, like Asia/Kolkata or America/New_York.",
  },
];

export const UPCOMING_FIELDS = [
  { id: "site", label: "Platform tag" },
  { id: "countdown", label: "Time left" },
  { id: "duration", label: "Duration" },
];

const ROW = 46;

export function upcomingHeight(count) {
  return count === 0 ? 118 : 74 + count * ROW + 8;
}

function countdown(seconds) {
  if (seconds <= 0) return "starting";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `in ${d}d ${h}h`;
  if (h > 0) return `in ${h}h ${m}m`;
  return `in ${Math.max(1, m)}m`;
}

function duration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  if (h) return `${h} hour${h === 1 ? "" : "s"}`;
  return `${m} min`;
}

/** Short time zone name like "IST" or "GMT+5:30". */
function zoneName(tz, date) {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZone: tz, timeZoneName: "short" })
      .formatToParts(date)
      .find((x) => x.type === "timeZoneName");
    if (tz === "Asia/Kolkata" || tz === "Asia/Calcutta") return "IST";
    return part?.value ?? tz;
  } catch {
    return tz;
  }
}

export function renderUpcomingCard(contests, options) {
  const { theme: t } = options;
  const p = options.params;
  const hide = options.hide ?? new Set();
  const now = options.now ?? new Date();
  const sites = p.sites.map((x) => x.toLowerCase()).filter((x) => DEFAULT_SITES.includes(x));
  const wanted = new Set(sites.length ? sites : DEFAULT_SITES);
  const list = (contests ?? []).filter((c) => wanted.has(c.site ?? "codeforces")).slice(0, p.count);
  const accent = t.title;
  const showSite = !hide.has("site") && wanted.size > 1;
  const heading = wanted.size === 1 ? siteInfo([...wanted][0]).name : wanted.size === DEFAULT_SITES.length ? "All platforms" : [...wanted].map((x) => siteInfo(x).name).join(", ");
  const zone = zoneName(p.tz, now);

  const dateFmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: p.tz,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const rows = list
    .map((c, i) => {
      const y = 92 + i * ROW;
      const start = new Date(c.startTimeSeconds * 1000);
      const when = `${dateFmt.format(start).replace(",", "")} ${zone}`;
      const meta = hide.has("duration") ? when : `${when}, ${duration(c.durationSeconds)}`;
      const left = c.startTimeSeconds - Math.floor(now.getTime() / 1000);
      const showLeft = !hide.has("countdown");
      return `<g class="fade" style="animation-delay:${150 + i * 90}ms" transform="translate(0, ${y})">
    ${i > 0 ? `<line x1="25" x2="470" y1="-22" y2="-22" stroke="${t.border}"/>` : ""}
    ${
      showSite
        ? `<rect x="25" y="-11" width="24" height="15" rx="4" fill="${t.dark ? siteInfo(c.site).color.dark : siteInfo(c.site).color.light}" fill-opacity=".16"/>
    <text class="tag" x="37" y="0" text-anchor="middle" fill="${t.dark ? siteInfo(c.site).color.dark : siteInfo(c.site).color.light}">${siteInfo(c.site).short}</text>`
        : ""
    }
    <text class="name" x="${showSite ? 56 : 25}">${escapeXml(truncate(c.name, (showLeft ? 52 : 62) - (showSite ? 5 : 0)))}</text>
    <text class="small" x="${showSite ? 56 : 25}" y="17">${escapeXml(meta)}</text>
    ${showLeft ? `<text class="left" x="470" y="6" text-anchor="end" fill="${accent}">${countdown(left)}</text>` : ""}
  </g>`;
    })
    .join("");

  const body = `<g transform="translate(25, 32)">
    <text class="eyebrow">UPCOMING CONTESTS</text>
    <text class="handle" y="23" fill="${accent}">${escapeXml(truncate(heading, 34))}</text>
  </g>
  <text class="small" x="470" y="55" text-anchor="end">times in ${escapeXml(zone)}</text>
  ${list.length ? rows : emptyBody("No contests are scheduled right now. Check back soon.", 96)}`;

  return frame({
    options,
    height: upcomingHeight(list.length),
    accent,
    title: `Upcoming contests: ${heading}`,
    desc: list.length ? list.map((c) => c.name).join(", ") : "No contests scheduled",
    css: `
    .name { font: 600 12.5px ${FONT}; fill: ${t.text}; }
    .left { font: 700 12.5px ${FONT}; }
    .tag { font: 800 8.5px ${FONT}; letter-spacing: .4px; }`,
    body,
  });
}
