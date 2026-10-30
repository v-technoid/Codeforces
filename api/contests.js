// Upcoming contests as JSON, used by the page for live previews.
//   /api/contests                     every supported platform
//   /api/contests?sites=atcoder,codechef
import { DEFAULT_SITES, getAllUpcoming } from "../js/lib/contests.js";

export default async function handler(req, res) {
  const json = (status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };
  const raw = String(req.query?.sites ?? "");
  const sites = raw ? raw.split(",").map((s) => s.trim().toLowerCase()).filter((s) => DEFAULT_SITES.includes(s)) : DEFAULT_SITES;
  try {
    const contests = await getAllUpcoming(sites.length ? sites : DEFAULT_SITES);
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=3600");
    return json(200, { contests });
  } catch (err) {
    console.error("contests error", err?.message ?? err);
    return json(503, { error: "Contest lists are unavailable right now" });
  }
}
