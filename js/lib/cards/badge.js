import { rankForRating, titleCase } from "../ranks.js";
import { escapeXml } from "./shared.js";
// Approximate Verdana 11px widths, the font shields.io badges use.
function textWidth(text) {
  let w = 0;
  for (const ch of text) {
    if ("ilI.,:;|!'".includes(ch)) w += 3.4;
    else if ("mwMW".includes(ch)) w += 9.6;
    else if (ch === " ") w += 3.9;
    else if (/[A-Z0-9]/.test(ch)) w += 7.6;
    else w += 6.6;
  }
  return Math.ceil(w);
}
/** A small flat badge in the shields.io style, e.g. "Codeforces | Expert 1734". */
export function renderBadge(stats, options) {
  const { user } = stats;
  const rank = rankForRating(user.rating);
  const left = "Codeforces";
  const right = user.rating === undefined ? "Unrated" : `${titleCase(rank.name)} ${user.rating}`;
  // Badge colors stay readable on both GitHub themes, so they ignore the card theme.
  const color = user.rating === undefined ? "#6b7280" : rank.light === "#0000ff" ? "#2b55e6" : rank.light;
  const lw = textWidth(left) + 14;
  const rw = textWidth(right) + 14;
  const w = lw + rw;
  void options;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="${escapeXml(`${left}: ${right}`)}">
  <title>${escapeXml(`${user.handle} on ${left}: ${right}`)}</title>
  <linearGradient id="s" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${w}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#555"/>
    <rect x="${lw}" width="${rw}" height="20" fill="${color}"/>
    <rect width="${w}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${lw / 2}" y="15" fill="#010101" fill-opacity=".3">${left}</text>
    <text x="${lw / 2}" y="14">${left}</text>
    <text x="${lw + rw / 2}" y="15" fill="#010101" fill-opacity=".3">${escapeXml(right)}</text>
    <text x="${lw + rw / 2}" y="14">${escapeXml(right)}</text>
  </g>
</svg>`;
}
