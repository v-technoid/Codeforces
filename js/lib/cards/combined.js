// One card with your profile on every platform you use, as tiles.
import { colorFor, PLATFORMS } from "../platforms/index.js";
import { escapeXml, fmt, frame, truncate, FONT } from "./shared.js";

// One handle param per platform, plus a title.
export const COMBINED_PARAMS = [
  { name: "title", label: "Title", kind: "text", maxLength: 40, default: "Coding profiles" },
  ...PLATFORMS.map((p) => ({
    name: p.id,
    label: `${p.name} handle`,
    kind: "text",
    maxLength: 40,
    default: "",
    hint: p.id === "cses" ? "Your CSES user number" : undefined,
  })),
];

const TILE_W = 216;
const TILE_H = 64;
const GAP = 13;

export function combinedHeight(count, withTitle = true) {
  const rows = Math.max(1, Math.ceil(count / 2));
  return (withTitle ? 62 : 24) + rows * TILE_H + (rows - 1) * GAP + 22;
}

/** results: { [platformId]: { stats } | { error } } */
export function renderCombinedCard(results, options) {
  const { theme: t } = options;
  // An empty title hides the heading, e.g. when the README already has one above the card.
  const title = options.params?.title ?? "Coding profiles";
  const top = title ? 58 : 20;
  const list = PLATFORMS.filter((p) => results?.[p.id]);

  const tiles = list.map((platform, i) => {
    const { stats, error } = results[platform.id];
    const x = 25 + (i % 2) * (TILE_W + GAP);
    const y = top + Math.floor(i / 2) * (TILE_H + GAP);
    const accent = t.dark ? platform.accent.dark : platform.accent.light;
    let value = "n/a";
    let detail = error ? truncate(error, 34) : "";
    let color = t.muted;
    if (stats) {
      color = colorFor(platform, stats, t.dark);
      if (stats.rating !== undefined) {
        value = String(stats.rating);
        detail = [stats.rankLabel, stats.maxRating ? `max ${stats.maxRating}` : ""].filter(Boolean).join(", ");
      } else if (stats.rankColor && stats.rankLabel) {
        value = stats.rankLabel;
        detail = stats.solved !== undefined ? `${fmt(stats.solved)} solved` : "";
      } else if (stats.primary?.value !== undefined) {
        value = typeof stats.primary.value === "number" ? fmt(stats.primary.value) : String(stats.primary.value);
        detail = stats.primary.label + (stats.solved !== undefined && stats.primary.label !== "solved" ? `, ${fmt(stats.solved)} solved` : "");
      } else if (stats.solved !== undefined) {
        value = fmt(stats.solved);
        detail = "solved";
      }
    }
    return `<g class="fade" style="animation-delay:${120 + i * 70}ms" transform="translate(${x}, ${y})">
    <rect width="${TILE_W}" height="${TILE_H}" rx="9" fill="${t.track}"/>
    <rect width="3" height="${TILE_H - 20}" x="0" y="10" rx="1.5" fill="${accent}"/>
    <text class="pname" x="14" y="20" fill="${accent}">${escapeXml(platform.name.toUpperCase())}</text>
    <text class="phandle" x="${TILE_W - 12}" y="20" text-anchor="end">${escapeXml(truncate(stats?.handle ?? "", 16))}</text>
    <text class="pvalue" x="14" y="44" fill="${color}">${escapeXml(truncate(value, 12))}</text>
    <text class="pdetail" x="14" y="57">${escapeXml(truncate(detail, 36))}</text>
  </g>`;
  });

  const height = combinedHeight(list.length, !!title);
  return frame({
    options,
    height,
    accent: t.title,
    title: title || "Coding profiles",
    desc: list.map((p) => p.name).join(", "),
    css: `
    .pname { font: 700 9.5px ${FONT}; letter-spacing: 1.2px; }
    .phandle { font: 500 10.5px ${FONT}; fill: ${t.muted}; }
    .pvalue { font: 800 18px ${FONT}; }
    .pdetail { font: 500 10px ${FONT}; fill: ${t.muted}; }`,
    body: `${title ? `<text class="eyebrow" x="25" y="36">${escapeXml(title.toUpperCase())}</text>` : ""}
  ${list.length ? tiles.join("\n  ") : `<text class="text" x="25" y="76">Add a handle for at least one platform.</text>`}`,
  });
}
