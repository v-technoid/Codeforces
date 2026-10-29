// Compare two handles: both on the rank ladder, then stat by stat bars.
import { rankForRating, titleCase } from "../lib/ranks.js";
import { $, cleanHandle, esc, fetchStats, state } from "./core.js";
import { ladderHtml } from "./ladder.js";

const RANK_VARS = {
  newbie: "var(--r-newbie)",
  pupil: "var(--r-pupil)",
  specialist: "var(--r-specialist)",
  expert: "var(--r-expert)",
  "candidate master": "var(--r-cm)",
  master: "var(--r-master)",
  "international master": "var(--r-master)",
  grandmaster: "var(--r-gm)",
  "international grandmaster": "var(--r-gm)",
  "legendary grandmaster": "var(--r-gm)",
  unrated: "var(--muted)",
};
const colorFor = (s) => RANK_VARS[rankForRating(s.user.rating).name] ?? "var(--ink)";

const ROWS = [
  { label: "Rating", get: (s) => s.user.rating },
  { label: "Max rating", get: (s) => s.user.maxRating },
  { label: "Rated contests", get: (s) => s.contests },
  { label: "Best contest rank", get: (s) => s.bestContestRank, lowerWins: true, prefix: "#" },
  { label: "Problems solved", get: (s) => s.solved?.total },
  { label: "Hardest solved", get: (s) => s.solved?.hardest },
  { label: "Longest streak", get: (s) => s.solved?.longestStreak },
  { label: "Submissions this year", get: (s) => s.activity?.total },
  { label: "Contribution", get: (s) => s.user.contribution },
];

function compareHtml([a, b]) {
  const rows = ROWS.map((row) => {
    const va = row.get(a);
    const vb = row.get(b);
    if (va === undefined && vb === undefined) return "";
    const max = Math.max(Math.abs(va ?? 0), Math.abs(vb ?? 0), 1);
    // For "lower wins" rows, the bar shows how good the result is, not the raw number.
    const share = (v, other) => {
      if (v === undefined) return 0;
      if (row.lowerWins) return other === undefined ? 1 : Math.min(v, other) / v;
      return Math.max(0, v) / max;
    };
    const winner =
      va === undefined || vb === undefined || va === vb ? -1 : row.lowerWins ? (va < vb ? 0 : 1) : va > vb ? 0 : 1;
    const fmt = (v) => (v === undefined ? "n/a" : `${row.prefix ?? ""}${v.toLocaleString("en-US")}`);
    const bar = (v, other, s) =>
      `<span class="cmp-track"><span class="cmp-bar" style="width:${share(v, other) * 100}%;background:${colorFor(s)}"></span></span>`;
    return `<tr>
      <td class="cmp-a${winner === 0 ? " win" : ""}"><span class="cmp-value">${fmt(va)}</span>${bar(va, vb, a)}</td>
      <th scope="row" class="cmp-label">${row.label}</th>
      <td class="cmp-b${winner === 1 ? " win" : ""}">${bar(vb, va, b)}<span class="cmp-value">${fmt(vb)}</span></td>
    </tr>`;
  }).join("");

  const person = (s, cls) => `<div class="${cls}">
    <span class="cmp-name" style="color:${colorFor(s)}">${esc(s.user.handle)}</span>
    <span class="cmp-rank">${s.user.rating === undefined ? "Unrated" : titleCase(rankForRating(s.user.rating).name)}</span>
  </div>`;

  return `${ladderHtml(
    [a, b].map((s) => ({ handle: s.user.handle, rating: s.user.rating, maxRating: s.user.maxRating })),
    true,
  )}
  <div class="cmp-people">${person(a, "cmp-person")}${person(b, "cmp-person cmp-person-b")}</div>
  <table class="cmp-table">
    <caption class="sr-only">${esc(a.user.handle)} compared with ${esc(b.user.handle)}</caption>
    <thead class="sr-only"><tr><th scope="col">${esc(a.user.handle)}</th><th scope="col">Stat</th><th scope="col">${esc(b.user.handle)}</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

async function compare(e) {
  e.preventDefault();
  const one = cleanHandle($("cmp-a").value || state.stats?.user.handle || "");
  const two = cleanHandle($("cmp-b").value);
  const error = $("cmp-error");
  if (!one || !two) {
    error.textContent = "Enter two handles to compare.";
    return;
  }
  if (one.toLowerCase() === two.toLowerCase()) {
    error.textContent = "Pick two different handles.";
    return;
  }
  error.textContent = "";
  const button = $("cmp-submit");
  button.disabled = true;
  button.innerHTML = `<span class="spinner" aria-label="Loading"></span>`;
  try {
    const result = await Promise.all(
      [one, two].map((h) =>
        fetchStats(h, true).catch((err) => {
          throw new Error(`${h}: ${err.message}`);
        }),
      ),
    );
    $("compare-result").innerHTML = compareHtml(result);
  } catch (err) {
    error.textContent = err instanceof Error ? err.message : "Couldn't load those handles.";
  } finally {
    button.disabled = false;
    button.textContent = "Compare";
  }
}

export function setupCompare() {
  $("compare-form").addEventListener("submit", compare);
}

/** Suggest the searched handle as the first person to compare. */
export function renderCompare() {
  if (state.stats && !$("cmp-a").value) $("cmp-a").placeholder = state.stats.user.handle;
}
