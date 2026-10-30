// Platform stats as JSON, used by the page for live previews.
//   /api/profile?platform=leetcode&username=neal_wu
//   /api/profile?platform=atcoder&username=tourist&full=1   (with daily activity)
//   /api/profile?codeforces=tourist&leetcode=neal_wu      (several at once)
import { fetchMany, getPlatform, PlatformError, PLATFORMS } from "../js/lib/platforms/index.js";

const first = (v) => (Array.isArray(v) ? v[0] : v);

export default async function handler(req, res) {
  const query = req.query ?? {};
  const json = (status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };

  const many = Object.fromEntries(PLATFORMS.map((p) => [p.id, (first(query[p.id]) ?? "").trim()]).filter(([, h]) => h));
  if (Object.keys(many).length) {
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=1800, stale-while-revalidate=86400");
    return json(200, { results: await fetchMany(many) });
  }

  const platform = getPlatform(first(query.platform));
  const username = (first(query.username) ?? "").trim();
  if (!platform) return json(400, { error: "Unknown platform" });
  if (!username) return json(400, { error: `Enter your ${platform.name} handle` });

  try {
    const stats = await platform.fetch(username, { submissions: first(query.full) === "1" });
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=1800, stale-while-revalidate=86400");
    return json(200, { stats });
  } catch (err) {
    if (err instanceof PlatformError) {
      const status = err.kind === "not_found" ? 404 : err.kind === "invalid" ? 400 : 503;
      return json(status, { error: err.message });
    }
    console.error("profile error", err);
    return json(500, { error: "Something went wrong on our side" });
  }
}
