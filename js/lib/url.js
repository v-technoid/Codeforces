import { getCard } from "./cards/index.js";
import { writeParams } from "./cards/params.js";
import { cleanHex, COLOR_PARAMS } from "./options.js";
import { DEFAULT_THEME } from "./themes.js";

/**
 * Builds the shortest card link for a config, leaving out anything at its default.
 * config: { platform, handle, type, theme, hide, colors, hideBorder, animate, params }
 */
export function cardUrl(origin, c, themeOverride) {
  const card = getCard(c.type);
  const p = new URLSearchParams();
  const otherPlatform = card.anyPlatform && c.platform && c.platform !== "codeforces";
  if (otherPlatform) p.set("platform", c.platform);
  if (card.needsHandle) p.set("username", c.handle);
  if (c.type !== "stats") p.set("type", c.type);
  writeParams(card, c.params, p);
  const theme = themeOverride ?? c.theme;
  if (card.themed) {
    if (theme !== DEFAULT_THEME) p.set("theme", theme);
    if (c.hide?.length) p.set("hide", c.hide.join(","));
    for (const { param } of COLOR_PARAMS) {
      const hex = cleanHex(c.colors?.[param]);
      if (hex) p.set(param, hex);
    }
    if (c.hideBorder) p.set("hide_border", "true");
  }
  if (c.animate === false && card.type !== "badge") p.set("animate", "false");
  // Commas, semicolons and slashes read better unescaped and are safe in a query string.
  const qs = p.toString().replace(/%2C/g, ",").replace(/%3B/g, ";").replace(/%2F/g, "/");
  return `${origin}/api/card?${qs}`;
}
