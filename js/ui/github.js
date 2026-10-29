// Live star and fork counts for the project's GitHub repository.
// GitHub's public API allows 60 requests an hour per visitor, so the result
// is kept for 10 minutes in this browser tab.
import { REPO } from "./core.js";

const KEY = "cf-card-repo-stats";
const MAX_AGE = 10 * 60 * 1000;

function readSaved() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (saved && Date.now() - saved.at < MAX_AGE) return saved;
  } catch {
    // Storage can be blocked; just fetch again.
  }
  return null;
}

function save(stats) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...stats, at: Date.now() }));
  } catch {
    // Not important if this fails.
  }
}

const compact = (n) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : String(n);

export async function loadRepoStats() {
  let stats = readSaved();
  if (!stats) {
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO.owner}/${REPO.name}`, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!res.ok) return;
      const body = await res.json();
      // Only trust a real answer from GitHub; anything else leaves the numbers hidden.
      if (typeof body?.stargazers_count !== "number") return;
      stats = { stars: body.stargazers_count, forks: body.forks_count ?? 0 };
      save(stats);
    } catch {
      return; // Offline or blocked: the buttons still work, just without numbers.
    }
  }

  for (const el of document.querySelectorAll("[data-repo-stat]")) {
    const value = stats[el.dataset.repoStat];
    // A "0" next to a star button reads as a reason not to click, so counts appear from 1 up.
    if (!value) continue;
    el.textContent = compact(value);
    el.title = `${value.toLocaleString("en-US")} ${el.dataset.repoStat}`;
    el.hidden = false;
  }
  for (const el of document.querySelectorAll("[data-repo-label]")) {
    const n = stats[el.dataset.repoLabel];
    if (n) el.textContent = n === 1 ? el.dataset.one : el.dataset.many;
  }
}
