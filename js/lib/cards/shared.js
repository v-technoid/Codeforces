import { rankForRating } from "../ranks.js";
export const CARD_WIDTH = 495;
export const FONT = `'Segoe UI', Ubuntu, 'Helvetica Neue', Arial, sans-serif`;
export function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
export const fmt = (n) => (n === undefined ? undefined : n.toLocaleString("en-US"));
export function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
export function rankColor(rating, t) {
  const r = rankForRating(rating);
  return t.dark ? r.dark : r.light;
}
export function colorOf(rank, t) {
  return t.dark ? rank.dark : rank.light;
}
/** The handle, with the legendary grandmaster first letter rule applied. */
export function handleMarkup(handle, rating, t) {
  if (rankForRating(rating).name === "legendary grandmaster") {
    return `<tspan fill="${t.title}">${escapeXml(handle[0])}</tspan>${escapeXml(handle.slice(1))}`;
  }
  return escapeXml(handle);
}
/** Shared card shell: background, border, accent edge, base styles and animations. */
export function frame({ options, width = CARD_WIDTH, height, accent, title, desc, css = "", body }) {
  const { theme: t, animate = true, hideBorder = false } = options;
  const rx = options.radius ?? 10;
  const motion = animate
    ? `
    .fade { opacity: 0; animation: fade .5s ease forwards; }
    .draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: draw 1.4s cubic-bezier(.4,0,.2,1) .2s forwards; }
    .grow { transform: scaleX(0); transform-box: fill-box; transform-origin: left center; animation: grow .8s cubic-bezier(.2,.8,.2,1) forwards; }
    @keyframes fade { to { opacity: 1; } }
    @keyframes draw { to { stroke-dashoffset: 0; } }
    @keyframes grow { to { transform: scaleX(1); } }
    @media (prefers-reduced-motion: reduce) {
      .fade, .draw, .grow, .ring { animation: none !important; opacity: 1; stroke-dashoffset: 0; transform: none; }
    }`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(title)}</title>
  <desc id="desc">${escapeXml(desc)}</desc>
  <style>
    .eyebrow { font: 700 10.5px ${FONT}; letter-spacing: 1.6px; fill: ${t.title}; opacity: .85; }
    .handle { font: 700 17px ${FONT}; }
    .label { font: 600 9.5px ${FONT}; letter-spacing: .8px; fill: ${t.muted}; }
    .value { font: 700 15px ${FONT}; fill: ${t.text}; }
    .text { font: 500 12px ${FONT}; fill: ${t.text}; }
    .small { font: 500 10.5px ${FONT}; fill: ${t.muted}; }
    .none { font-weight: 500; fill: ${t.muted}; opacity: .7; }
    ${css}
    ${motion}
  </style>
  <defs><clipPath id="card"><rect x="0.5" y="0.5" rx="${rx}" width="${width - 1}" height="${height - 1}"/></clipPath></defs>
  <rect x="0.5" y="0.5" rx="${rx}" width="${width - 1}" height="${height - 1}" fill="${t.background}"${hideBorder ? "" : ` stroke="${t.border}"`}/>
  ${accent ? `<rect x="0" y="0" width="4" height="${height}" fill="${accent}" clip-path="url(#card)"/>` : ""}
  ${body}
</svg>`;
}
/** Eyebrow plus handle, used at the top of the secondary cards. */
export function header(eyebrow, stats, t, colorOverride, plainHandle = false) {
  const color = colorOverride ?? rankColor(stats.user.rating, t);
  return `<g transform="translate(25, 32)">
    <text class="eyebrow">${escapeXml(eyebrow)}</text>
    <text class="handle" y="23" fill="${color}">${plainHandle ? escapeXml(stats.user.handle) : handleMarkup(stats.user.handle, stats.user.rating, t)}</text>
  </g>`;
}
/** A card shown in place of the requested one when there's nothing to draw yet. */
export function emptyBody(message, y) {
  return `<text class="text" x="25" y="${y}" style="fill-opacity:.8">${escapeXml(message)}</text>`;
}
