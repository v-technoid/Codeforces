// Compare two handles on any platform: both on the rank ladder (for rated
// platforms), then stat by stat bars, with the better value highlighted.
import { fromCodeforces } from "../lib/platforms/codeforces.js";
import { colorFor, getPlatform, PLATFORMS } from "../lib/platforms/index.js";
import { streaksOf } from "../lib/cards/streak.js";
import { $, cleanHandle, esc, fetchProfile, fetchStats, isCodeforces, state } from "./core.js";
import { ladderHtml, scaleFor } from "./ladder.js";
import { isDark } from "./theme.js";

// Numbers that platforms show as text, like "#1,234" or "12 days".
const numeric = (v) => {
  if (typeof v === "number") return v;
  if (typeof v !== "string" || /★/.test(v)) return undefined;
  const m = v.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : undefined;
};

/** Every comparable number for a profile, keyed by label. */
function valuesOf(p) {
  const out = new Map();
  const put = (label, value, opts = {}) => {
    if (value !== undefined && value !== null && Number.isFinite(value)) out.set(label, { value, ...opts });
  };
  put("Rating", p.rating);
  put("Max rating", p.maxRating);
  put("Rated contests", p.contests);
  put("Best contest rank", p.bestRank, { lowerWins: true, prefix: "#" });
  put("Problems solved", p.solved);
  if (p.primary?.label && p.primary.label !== "solved") put(p.primary.label[0].toUpperCase() + p.primary.label.slice(1), numeric(p.primary.value));
  put("Hardest solved", p.hardest);
  if (p.activity) {
    const s = streaksOf(p.activity);
    put("Longest streak (year)", s.longest.length);
    put("Active days (year)", s.activeDays);
    put("Submissions (year)", s.total);
  }
  for (const f of p.facts ?? []) {
    const v = numeric(f.value);
    if (v === undefined || out.has(f.label)) continue;
    // The yearly numbers above already cover a platform's own streak and active days.
    if (p.activity && /^(max streak|active days)$/i.test(f.label)) continue;
    if (/^streak$/i.test(f.label)) {
      put("Current streak", v);
      continue;
    }
    const text = typeof f.value === "string" ? f.value.trim() : "";
    if (text.startsWith("#")) put(f.label, v, { lowerWins: true, prefix: "#" });
    else if (/top/i.test(f.label) || /^top\b/i.test(text)) put(f.label, v, { lowerWins: true, prefix: "Top ", suffix: "%" });
    else put(f.label, v);
  }
  return out;
}

function compareHtml(platform, [a, b]) {
  const dark = isDark();
  const color = (p) => colorFor(platform, p, dark);
  const va = valuesOf(a);
  const vb = valuesOf(b);
  const labels = [...new Set([...va.keys(), ...vb.keys()])];

  const rows = labels
    .map((label) => {
      const ra = va.get(label);
      const rb = vb.get(label);
      const x = ra?.value;
      const y = rb?.value;
      const lowerWins = (ra ?? rb).lowerWins;
      const prefix = (ra ?? rb).prefix ?? "";
      const suffix = (ra ?? rb).suffix ?? "";
      const max = Math.max(Math.abs(x ?? 0), Math.abs(y ?? 0), 1);
      // For "lower wins" rows, the bar shows how good the result is, not the raw number.
      const share = (v, other) => {
        if (v === undefined) return 0;
        if (lowerWins) return other === undefined ? 1 : Math.min(v, other) / v;
        return Math.max(0, v) / max;
      };
      const winner = x === undefined || y === undefined || x === y ? -1 : lowerWins ? (x < y ? 0 : 1) : x > y ? 0 : 1;
      const fmt = (v) => (v === undefined ? "n/a" : `${prefix}${v.toLocaleString("en-US")}${suffix}`);
      const bar = (v, other, p) =>
        `<span class="cmp-track"><span class="cmp-bar" style="width:${share(v, other) * 100}%;background:${color(p)}"></span></span>`;
      return `<tr>
      <td class="cmp-a${winner === 0 ? " win" : ""}"><span class="cmp-value">${fmt(x)}</span>${bar(x, y, a)}</td>
      <th scope="row" class="cmp-label">${esc(label)}</th>
      <td class="cmp-b${winner === 1 ? " win" : ""}">${bar(y, x, b)}<span class="cmp-value">${fmt(y)}</span></td>
    </tr>`;
    })
    .join("");

  // A quick score: who leads on more rows.
  let wa = 0;
  let wb = 0;
  for (const label of labels) {
    const x = va.get(label)?.value;
    const y = vb.get(label)?.value;
    if (x === undefined || y === undefined || x === y) continue;
    const low = (va.get(label) ?? vb.get(label)).lowerWins;
    if (low ? x < y : x > y) wa++;
    else wb++;
  }

  const person = (p, cls, wins) => `<div class="${cls}">
    <span class="cmp-name" style="color:${color(p)}">${esc(p.handle)}</span>
    <span class="cmp-rank">${esc(p.rankLabel || (p.rating === undefined ? "Unrated" : "Rated"))} · leads ${wins} of ${labels.length}</span>
  </div>`;

  const scale = scaleFor(platform);
  const ladder = scale
    ? ladderHtml(
        [a, b].map((p) => ({ handle: p.handle, rating: p.rating, maxRating: p.maxRating })),
        true,
        scale,
      )
    : "";

  return `${ladder}
  <div class="cmp-people">${person(a, "cmp-person", wa)}${person(b, "cmp-person cmp-person-b", wb)}</div>
  <table class="cmp-table">
    <caption class="sr-only">${esc(a.handle)} compared with ${esc(b.handle)} on ${esc(platform.name)}</caption>
    <thead class="sr-only"><tr><th scope="col">${esc(a.handle)}</th><th scope="col">Stat</th><th scope="col">${esc(b.handle)}</th></tr></thead>
    <tbody>${rows || `<tr><td colspan="3" class="cmp-empty">No numbers to compare yet.</td></tr>`}</tbody>
  </table>`;
}

/** Stats in the shared shape for any platform. Codeforces keeps its extra detail. */
async function load(platform, handle) {
  if (platform.id === "codeforces") {
    const s = await fetchStats(handle, true);
    return { ...fromCodeforces(s), hardest: s.solved?.hardest };
  }
  return fetchProfile(platform.id, handle, Boolean(platform.slowActivity));
}

let picked = false; // once someone picks a platform here, the hero no longer changes it
let last = null; // the last result, redrawn when the theme changes

async function compare(e) {
  e.preventDefault();
  const platform = getPlatform($("cmp-platform").value);
  const mine = platform.id === state.platform ? (isCodeforces() ? state.stats?.user.handle : state.pstats?.handle) : "";
  const one = cleanHandle($("cmp-a").value || mine || "");
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
        load(platform, h).catch((err) => {
          throw new Error(`${h}: ${err.message}`);
        }),
      ),
    );
    last = { platform, result };
    $("compare-result").innerHTML = compareHtml(platform, result);
  } catch (err) {
    error.textContent = err instanceof Error ? err.message : "Couldn't load those handles.";
  } finally {
    button.disabled = false;
    button.textContent = "Compare";
  }
}

export function setupCompare() {
  $("cmp-platform").innerHTML = PLATFORMS.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
  $("cmp-platform").value = state.platform;
  $("cmp-platform").addEventListener("change", () => {
    picked = true;
    $("compare-result").innerHTML = "";
    last = null;
    renderCompare();
  });
  $("compare-form").addEventListener("submit", compare);
  window.addEventListener("themechange", () => {
    if (last) $("compare-result").innerHTML = compareHtml(last.platform, last.result);
  });
}

/** Follows the hero's platform until picked here, and suggests the searched handle first. */
export function renderCompare() {
  if (!picked && $("cmp-platform").value !== state.platform) {
    $("cmp-platform").value = state.platform;
    $("compare-result").innerHTML = "";
    last = null;
  }
  const platform = getPlatform($("cmp-platform").value);
  const mine = platform.id === state.platform ? (isCodeforces() ? state.stats?.user.handle : state.pstats?.handle) : "";
  $("cmp-a").placeholder = mine || "First handle";
  $("compare-heading").textContent = `Compare two ${platform.name} coders`;
}
