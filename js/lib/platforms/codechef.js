// CodeChef has no public API, so this reads the public profile page.
// If CodeChef redesigns that page, this reader needs updating.
import { cached, changed, checkHandle, getPage, inner, num, PlatformError, textOf } from "./http.js";

const NAME = "CodeChef";

export const codechef = {
  id: "codechef",
  name: NAME,
  accent: { light: "#5b4638", dark: "#c9a98f" },
  reads: "page",
  hint: "Your CodeChef username",
  profileUrl: (h) => `https://www.codechef.com/users/${encodeURIComponent(h)}`,
  tiers: [
    { name: "1★", min: 0, light: "#666666", dark: "#a0a0a0" },
    { name: "2★", min: 1400, light: "#1e7d22", dark: "#4cbf52" },
    { name: "3★", min: 1600, light: "#3366cc", dark: "#6b95ff" },
    { name: "4★", min: 1800, light: "#684273", dark: "#b07cc0" },
    { name: "5★", min: 2000, light: "#c79500", dark: "#ffbf00" },
    { name: "6★", min: 2200, light: "#ff7f00", dark: "#ff9a3c" },
    { name: "7★", min: 2500, light: "#d0011b", dark: "#ff4b5f" },
  ],

  async fetch(handle) {
    checkHandle(handle, NAME, /^[A-Za-z0-9_]{1,30}$/);
    const html = await cached(`codechef:${handle.toLowerCase()}`, () =>
      getPage(`https://www.codechef.com/users/${encodeURIComponent(handle)}`, NAME),
    );
    return parseCodechef(html, handle);
  },
};

export function parseCodechef(html, handle) {
  const ratingHtml = inner(html, 'class="rating-number"');
  // An unknown user lands on a page without a profile header.
  if (ratingHtml === undefined) {
    if (!/user-details|rating-header/i.test(html)) {
      throw new PlatformError("No CodeChef user with that handle", "not_found");
    }
    throw changed(NAME);
  }
  const rating = num(textOf(ratingHtml));
  const header = textOf(inner(html, 'class="rating-header') ?? "");
  const highest = num(/Highest Rating\D*(\d+)/i.exec(header)?.[1]);

  const ranks = inner(html, 'class="rating-ranks"') ?? "";
  const strong = [...ranks.matchAll(/<strong>([\s\S]*?)<\/strong>/gi)].map((m) => num(textOf(m[1])));
  const page = textOf(html);
  const solved = num(/Total Problems Solved:?\s*([\d,]+)/i.exec(page)?.[1]);

  let history = [];
  const all = /all_rating\s*=\s*(\[[\s\S]*?\])\s*;/.exec(html);
  if (all) {
    try {
      history = JSON.parse(all[1]).map((c) => ({
        time: Math.floor(Date.parse(String(c.end_date).replace(" ", "T") + "Z") / 1000) || undefined,
        rating: Number(c.rating),
        name: c.name,
        rank: Number(c.rank) || undefined,
      }));
      history.forEach((h, i) => (h.old = i ? history[i - 1].rating : 1000));
    } catch {
      history = [];
    }
  }

  const tier = rating !== undefined ? codechef.tiers.filter((t) => rating >= t.min).pop() : null;
  return {
    platform: "codechef",
    handle,
    rating,
    maxRating: highest ?? (history.length ? Math.max(...history.map((h) => h.rating)) : undefined),
    rankLabel: tier?.name ?? "Unrated",
    contests: history.length || undefined,
    bestRank: history.length ? Math.min(...history.map((h) => h.rank).filter(Boolean)) : undefined,
    history,
    solved,
    primary: { label: "solved", value: solved },
    facts: [
      { label: "Global rank", value: strong[0] ? `#${strong[0].toLocaleString("en-US")}` : undefined },
      { label: "Country rank", value: strong[1] ? `#${strong[1].toLocaleString("en-US")}` : undefined },
    ],
  };
}
