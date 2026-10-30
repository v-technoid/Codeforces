// The card image endpoint for every platform, for example:
//   /api/card?username=tourist&type=rating&theme=dark            (Codeforces)
//   /api/card?platform=leetcode&username=neal_wu&type=solved
//   /api/card?type=combined&codeforces=tourist&leetcode=neal_wu
//   /api/card?type=typing&lines=Hello;I+solve+problems
// /api/codeforces is the same endpoint under its original name.
// Vercel runs this file as a serverless function. It has no dependencies.
import { CodeforcesError, getCardStats } from "../js/lib/codeforces.js";
import { getAllUpcoming } from "../js/lib/contests.js";
import { getCard, renderErrorCard } from "../js/lib/cards/index.js";
import { renderPlatformCard } from "../js/lib/cards/platform.js";
import { parseOptions } from "../js/lib/options.js";
import { fetchMany, getPlatform, PlatformError, PLATFORMS, supportedCards } from "../js/lib/platforms/index.js";

const first = (v) => (Array.isArray(v) ? v[0] : v);

// How long GitHub's image proxy and Vercel's edge may keep each kind of card.
const LIVE = "public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400";
const CACHE = {
  handle: LIVE,
  submissions: LIVE,
  multi: LIVE,
  upcoming: "public, max-age=600, s-maxage=600, stale-while-revalidate=3600",
  none: "public, max-age=86400, s-maxage=86400",
};

export default async function handler(req, res) {
  const query = req.query ?? {};
  // `handle` is accepted as an alias for `username`.
  const username = (first(query.username) ?? first(query.handle) ?? "").trim();
  const opts = parseOptions(query);
  const platform = getPlatform(first(query.platform));

  res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");

  const send = (body, cacheControl) => {
    // `cache=` lets people choose how fresh live cards are (10 minutes to a day).
    if (opts.cacheSeconds && cacheControl.startsWith("public, max-age=1800")) {
      const s = opts.cacheSeconds;
      cacheControl = `public, max-age=${s}, s-maxage=${s}, stale-while-revalidate=86400`;
    }
    res.setHeader("Cache-Control", cacheControl);
    res.statusCode = 200;
    res.end(body);
  };
  const fail = (message, seconds) =>
    send(renderErrorCard(message, opts.theme), `public, max-age=${seconds}, s-maxage=${seconds}`);

  if (!opts.ok) return fail(opts.message, 3600);
  if (!platform) return fail(`Unknown platform. Try ${PLATFORMS.map((p) => p.id).join(", ")}`, 3600);

  const card = getCard(opts.type);
  const renderOptions = {
    theme: opts.theme,
    hide: opts.hide,
    hideBorder: opts.hideBorder,
    animate: opts.animate,
    radius: opts.radius,
    params: opts.params,
    now: new Date(),
  };

  try {
    // Cards for platforms other than Codeforces.
    if (card.anyPlatform && platform.id !== "codeforces") {
      if (!supportedCards(platform).includes(card.type)) {
        return fail(`${platform.name} doesn't share the data for the ${card.label.toLowerCase()} card`, 3600);
      }
      if (!username) return fail(`Add your ${platform.name} handle to the link, like &username=you`, 3600);
      const stats = await platform.fetch(username, { submissions: card.needsSubmissions });
      return send(renderPlatformCard(card.type, platform.id, stats, renderOptions), LIVE);
    }

    if (card.needsHandle && !username) return fail("Add your handle to the link, like ?username=tourist", 3600);

    let data = null;
    if (card.needsHandle) data = await getCardStats(username, { submissions: card.needsSubmissions });
    if (card.needs === "upcoming") data = await getAllUpcoming();
    if (card.needs === "multi") {
      const handles = Object.fromEntries(PLATFORMS.map((p) => [p.id, opts.params[p.id]]).filter(([, h]) => h));
      if (Object.keys(handles).length === 0) return fail("Add at least one handle, like &codeforces=tourist&leetcode=you", 3600);
      data = await fetchMany(handles);
    }

    return send(card.render(data, renderOptions), CACHE[card.needs]);
  } catch (err) {
    if (err instanceof CodeforcesError || err instanceof PlatformError) {
      return fail(err.message, err.kind === "unavailable" || err.kind === "changed" ? 60 : 600);
    }
    console.error("card error", err);
    return fail("Something went wrong on our side", 60);
  }
}
