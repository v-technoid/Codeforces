// Builds the Markdown and HTML that people paste into a README.
import { getCard } from "../lib/cards/index.js";
import { getPlatform } from "../lib/platforms/index.js";
import { cardUrl } from "../lib/url.js";
import { ORIGIN } from "./core.js";

// Alt text sits inside double quotes, so only these characters need escaping.
const attr = (v) => String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/** Where clicking a card should take a visitor. */
export function cardLink(type, handle, platformId = "codeforces") {
  const card = getCard(type);
  if (card.needsHandle) return getPlatform(card.anyPlatform ? platformId : "codeforces").profileUrl(handle);
  if (type === "upcoming") return "https://codeforces.com/contests";
  return null;
}

/** A readable description of the card, used as alt text. */
export function cardAlt(type, handle, params, platformId = "codeforces") {
  const card = getCard(type);
  const site = getPlatform(card.anyPlatform ? platformId : "codeforces").name;
  if (type === "combined") return params?.title || "Coding profiles";
  if (type === "typing") return params?.lines?.join(". ") ?? "Typing intro";
  if (type === "stack") return params?.title || "Tech stack";
  if (type === "upcoming") return "Upcoming Codeforces contests";
  return `${handle} on ${site}${card.type === "stats" ? "" : `, ${card.label.toLowerCase()}`}`;
}

/**
 * One image as HTML. With a dark URL it becomes a <picture> that GitHub swaps
 * to match the visitor's light or dark mode.
 */
export function imageHtml({ light, dark, alt, href, width, indent = "" }) {
  const w = width ? ` width="${width}"` : "";
  const img = dark
    ? `<picture>
${indent}  <source media="(prefers-color-scheme: dark)" srcset="${dark}" />
${indent}  <img src="${light}" alt="${attr(alt)}"${w} />
${indent}</picture>`
    : `<img src="${light}" alt="${attr(alt)}"${w} />`;
  return href ? `<a href="${href}">${img}</a>` : img;
}

/** The light and (optional) dark links for a card config. */
export function cardUrls(config, darkTheme) {
  const card = getCard(config.type);
  const light = cardUrl(ORIGIN, config);
  const dark = darkTheme && card.themed ? cardUrl(ORIGIN, config, darkTheme) : null;
  return { light, dark };
}
