// Upcoming Codeforces contests as JSON, used by the page for live previews.
import { CodeforcesError, getUpcomingContests } from "../js/lib/codeforces.js";

export default async function handler(req, res) {
  const json = (status, body) => {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };
  try {
    const contests = await getUpcomingContests();
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=600, stale-while-revalidate=3600");
    return json(200, { contests });
  } catch (err) {
    if (err instanceof CodeforcesError) return json(503, { error: err.message });
    console.error("contests error", err);
    return json(500, { error: "Something went wrong on our side" });
  }
}
