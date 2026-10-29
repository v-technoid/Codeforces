import { CARDS, getCard } from "./cards/index.js";
import { readParams } from "./cards/params.js";
import { DEFAULT_THEME, getTheme } from "./themes.js";
/** Color overrides, all optional, given as hex without the leading #. */
export const COLOR_PARAMS = [
  { param: "bg_color", key: "background", label: "Background" },
  { param: "title_color", key: "title", label: "Top label" },
  { param: "text_color", key: "text", label: "Text" },
  { param: "muted_color", key: "muted", label: "Secondary text" },
  { param: "border_color", key: "border", label: "Border color" },
];
const HEX = /^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
export function cleanHex(value) {
  if (!value) return undefined;
  const v = value.trim().replace(/^#/, "");
  return HEX.test(v) ? v.toLowerCase() : undefined;
}
/** Applies color overrides to a theme. Invalid colors are ignored. */
export function applyColors(theme, colors) {
  const bg = cleanHex(colors.bg_color);
  let out = { ...theme };
  // A dark background on a light theme (or the reverse) would leave the text
  // unreadable, so start from the opposite default theme's text colors.
  if (bg && isDark(bg) !== theme.dark) {
    const opposite = getTheme(isDark(bg) ? "dark" : "light");
    out = {
      ...out,
      title: opposite.title,
      text: opposite.text,
      muted: opposite.muted,
      border: opposite.border,
    };
  }
  for (const c of COLOR_PARAMS) {
    const hex = cleanHex(colors[c.param]);
    if (hex) out[c.key] = `#${hex}`;
  }
  // The track color follows a custom background so rings and empty cells stay visible.
  if (bg) {
    out.dark = isDark(bg);
    out.track = out.dark ? mix(bg, "ffffff", 0.1) : mix(bg, "000000", 0.06);
  }
  return out;
}
function toRgb(hex) {
  const h =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex.slice(0, 6);
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function isDark(hex) {
  const [r, g, b] = toRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 128;
}
function mix(a, b, amount) {
  const x = toRgb(a);
  const y = toRgb(b);
  return `#${x
    .map((v, i) =>
      Math.round(v + (y[i] - v) * amount)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
const first = (v) => (Array.isArray(v) ? v[0] : v);
const truthy = (v) => v === "" || v === "true" || v === "1";
export function parseOptions(query) {
  const base = getTheme(first(query.theme));
  const colors = {};
  for (const c of COLOR_PARAMS) colors[c.param] = first(query[c.param]);
  const theme = applyColors(base ?? getTheme(DEFAULT_THEME), colors);
  if (!base) return { ok: false, message: "Unknown theme. Pick one from the generator page.", theme };
  const card = getCard(first(query.type));
  if (!card) {
    return {
      ok: false,
      message: `Unknown card type. Try ${CARDS.map((c) => c.type).join(", ")}.`,
      theme,
    };
  }
  const hide = new Set(
    (first(query.hide) ?? "")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
  return {
    ok: true,
    type: card.type,
    params: readParams(card, query),
    theme,
    hide,
    hideBorder: truthy(first(query.hide_border)),
    animate: first(query.animate) !== "false" && first(query.animate) !== "0",
  };
}
