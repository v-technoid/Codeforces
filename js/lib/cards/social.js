// Small link badges for a "Connect with me" row: one per site, each its own
// image so every badge can link somewhere different in a README.
// The icons are simple generic glyphs drawn here, not the sites' logos.
import { escapeXml } from "./shared.js";

export const SOCIALS = {
  github: { label: "GitHub", color: "#24292f" },
  linkedin: { label: "LinkedIn", color: "#0a66c2" },
  x: { label: "X", color: "#111111" },
  email: { label: "Email", color: "#d14836" },
  website: { label: "Website", color: "#5a45f0" },
  youtube: { label: "YouTube", color: "#e62117" },
  instagram: { label: "Instagram", color: "#d6336c" },
  discord: { label: "Discord", color: "#5865f2" },
};

export const SOCIAL_PARAMS = [
  {
    name: "site",
    label: "Site",
    kind: "choice",
    default: "website",
    options: Object.entries(SOCIALS).map(([value, s]) => ({ value, label: s.label })),
  },
  { name: "label", label: "Text", kind: "text", maxLength: 30, default: "" },
];

// 16 by 16 glyphs, drawn in white.
const ICONS = {
  github: `<path d="M5.5 4 1.5 8l4 4M10.5 4l4 4-4 4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`,
  linkedin: `<rect x="1" y="1" width="14" height="14" rx="3" stroke="#fff" stroke-width="1.5"/><text x="8" y="11.6" text-anchor="middle" fill="#fff" style="font:800 8.5px Verdana,sans-serif">in</text>`,
  x: `<path d="M3 3l10 10M13 3 3 13" stroke="#fff" stroke-width="2" stroke-linecap="round"/>`,
  email: `<rect x="1" y="3" width="14" height="10" rx="2" stroke="#fff" stroke-width="1.5"/><path d="m2 4.5 6 4.5 6-4.5" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/>`,
  website: `<circle cx="8" cy="8" r="6.5" stroke="#fff" stroke-width="1.4"/><ellipse cx="8" cy="8" rx="2.8" ry="6.5" stroke="#fff" stroke-width="1.2"/><path d="M1.5 8h13" stroke="#fff" stroke-width="1.2"/>`,
  youtube: `<rect x="1" y="3" width="14" height="10" rx="3" fill="#fff"/><path d="M6.5 5.6v4.8L10.6 8z" fill="currentColor"/>`,
  instagram: `<rect x="1.5" y="1.5" width="13" height="13" rx="4" stroke="#fff" stroke-width="1.5"/><circle cx="8" cy="8" r="3" stroke="#fff" stroke-width="1.5"/><circle cx="11.9" cy="4.1" r=".9" fill="#fff"/>`,
  discord: `<path d="M2 4.5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7l-3 2.5v-2.5a2 2 0 0 1-2-2z" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/><circle cx="6" cy="7" r="1" fill="#fff"/><circle cx="10" cy="7" r="1" fill="#fff"/>`,
};

function textWidth(text) {
  let w = 0;
  for (const ch of text) w += ch === " " ? 4.5 : /[MW]/.test(ch) ? 11 : /[IJ1]/.test(ch) ? 5 : 8.4;
  return Math.ceil(w);
}

export function renderSocialCard(_data, options) {
  const p = options.params;
  const site = SOCIALS[p.site] ?? SOCIALS.website;
  const label = (p.label || site.label).toUpperCase();
  const h = 30;
  const w = 44 + textWidth(label) + Math.max(0, label.length - 1) * 1.2 + 14;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-label="${escapeXml(p.label || site.label)}">
  <title>${escapeXml(p.label || site.label)}</title>
  <rect width="${w}" height="${h}" rx="7" fill="${site.color}"/>
  <rect width="${w}" height="${h / 2}" rx="7" fill="#fff" fill-opacity=".07"/>
  <g transform="translate(13 7)" style="color:${site.color}">${ICONS[p.site] ?? ICONS.website}</g>
  <text x="38" y="19.5" fill="#fff" style="font:700 11px Verdana,Geneva,'DejaVu Sans',sans-serif;letter-spacing:1.2px">${escapeXml(label)}</text>
</svg>`;
}
