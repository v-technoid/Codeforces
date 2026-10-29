// JSON version of the card data, used by the page for live previews.
// /api/stats?username=tourist        quick: profile and rating history
// /api/stats?username=tourist&full=1 also solved problems and activity (slower)
import { CodeforcesError, getCardStats } from "../js/lib/codeforces.js";

const first = (v) => (Array.isArray(v) ? v[0] : v);

export default async function handler(req, res) {
  const query = req.query ?? {};
  const username = (first(query.username) ?? first(query.handle) ?? "").trim();
  const full = first(query.full) === "1" || first(query.full) === "true";

  const json = (status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };

  if (!username) return json(400, { error: "Enter a Codeforces handle" });

  try {
    const stats = await getCardStats(username, { submissions: full });
    res.setHeader("Cache-Control", "public, max-age=600, s-maxage=1800, stale-while-revalidate=86400");
    return json(200, { stats });
  } catch (err) {
    if (err instanceof CodeforcesError) {
      const status = err.kind === "not_found" ? 404 : err.kind === "invalid" ? 400 : 503;
      return json(status, { error: err.message });
    }
    console.error("stats error", err);
    return json(500, { error: "Something went wrong on our side" });
  }
}
