// Starts the page. Each section lives in its own file in js/ui/.
// No framework and no build step: the browser loads these files as they are.
import { CARDS } from "./lib/cards/index.js";
import { getPlatform, PLATFORMS } from "./lib/platforms/index.js";
import { themeList } from "./lib/themes.js";
import { startBackground } from "./ui/background.js";
import { renderBuilder, setCombinedHandle, setupBuilder } from "./ui/builder.js";
import { renderCompare, setupCompare } from "./ui/compare.js";
import { $, cleanHandle, currentPlatform, esc, fetchProfile, fetchStats, loadUpcoming, state, subscribe } from "./ui/core.js";
import { renderGenerator, setupGenerator } from "./ui/generator.js";
import { loadRepoStats } from "./ui/github.js";
import { renderHero } from "./ui/hero.js";
import { renderStanding } from "./ui/ladder.js";

/* ---------- Loading a handle ---------- */

async function load(name) {
  const handle = cleanHandle(name);
  const platform = currentPlatform();
  const error = $("handle-error");
  const input = $("handle");
  const button = $("handle-submit");

  if (!handle) {
    error.textContent = `Type your ${platform.name} handle first.`;
    input.setAttribute("aria-invalid", "true");
    return;
  }
  error.textContent = "";
  input.removeAttribute("aria-invalid");
  button.disabled = true;
  button.innerHTML = `<span class="spinner" aria-hidden="true"></span> Loading`;

  const resetButton = () => {
    button.disabled = false;
    button.textContent = "Make my cards";
  };

  if (platform.id !== "codeforces") {
    try {
      state.pstats = await fetchProfile(platform.id, handle);
      setCombinedHandle(platform.id, handle);
      history.replaceState(null, "", `?platform=${platform.id}&handle=${encodeURIComponent(state.pstats.handle)}`);
      renderAll();
      $("standing").scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (err) {
      error.textContent = err instanceof Error ? err.message : "Couldn't load that handle.";
      input.setAttribute("aria-invalid", "true");
    } finally {
      resetButton();
    }
    return;
  }

  try {
    // Basic data is quick; submissions can take a few seconds, so they load after.
    state.stats = await fetchStats(handle);
    setCombinedHandle("codeforces", state.stats.user.handle);
    state.full = null;
    state.loadingFull = true;
    history.replaceState(null, "", `?handle=${encodeURIComponent(state.stats.user.handle)}`);
    renderAll();
    $("standing").scrollIntoView({ behavior: "smooth", block: "start" });
    resetButton();

    try {
      state.full = await fetchStats(handle, true);
    } catch {
      state.full = null;
    }
  } catch (err) {
    error.textContent = err instanceof Error ? err.message : "Couldn't load that handle.";
    input.setAttribute("aria-invalid", "true");
  } finally {
    state.loadingFull = false;
    resetButton();
    renderAll();
  }
}

function renderAll() {
  renderHero();
  renderStanding();
  renderBuilder();
  renderGenerator();
  renderCompare();
}

/* ---------- Housekeeping ---------- */

// This site never installs a service worker. If one is registered for this
// address, it was left by another project that ran here before (common on
// localhost:3000) and would show that old site instead of this one. Remove it
// and its saved files, then reload once so the real page shows.
async function removeStrayServiceWorkers() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    if (registrations.length === 0) return;
    await Promise.all(registrations.map((r) => r.unregister()));
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
    if (navigator.serviceWorker.controller) location.reload();
  } catch {
    // Not fatal: the page works either way.
  }
}

/* ---------- Start ---------- */

removeStrayServiceWorkers();

// The logo takes you back to the top of this page without reloading it.
$("brand").addEventListener("click", (e) => {
  e.preventDefault();
  history.replaceState(null, "", location.pathname);
  window.scrollTo({ top: 0, behavior: "smooth" });
});

$("opt-platforms").textContent = PLATFORMS.map((p) => p.id).join(", ");
$("opt-types").textContent = CARDS.map((c) => c.type).join(", ");
$("opt-themes").textContent = themeList.map((t) => t.id).join(", ");
for (const el of document.querySelectorAll("[data-year]")) el.textContent = String(new Date().getFullYear());

/* ---------- Platform picker ---------- */

function pickPlatform(id) {
  const platform = getPlatform(id) ?? getPlatform("codeforces");
  state.platform = platform.id;
  state.pstats = null;
  $("platform").value = platform.id;
  $("handle").placeholder = platform.id === "cses" ? "User number" : "Your handle";
  $("handle").title = platform.hint;
  $("handle-error").textContent = "";
  $("handle").removeAttribute("aria-invalid");
  for (const chip of $("platform-chips").querySelectorAll("[data-platform]")) {
    chip.setAttribute("aria-pressed", String(chip.dataset.platform === platform.id));
  }
  renderAll();
}

$("platform").innerHTML = PLATFORMS.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("");
$("platform-chips").innerHTML = PLATFORMS.map(
  (p) => `<button type="button" class="platform-chip" data-platform="${p.id}" aria-pressed="${p.id === "codeforces"}"
      style="--chip:${p.accent.light};--chip-dark:${p.accent.dark}">${esc(p.name)}${p.reads === "page" ? `<span class="sr-only"> (reads the profile page)</span>` : ""}</button>`,
).join("");
$("platform").addEventListener("change", (e) => pickPlatform(e.target.value));
$("platform-chips").addEventListener("click", (e) => {
  const chip = e.target.closest("[data-platform]");
  if (!chip) return;
  pickPlatform(chip.dataset.platform);
  $("handle").focus();
});

$("hero-form").addEventListener("submit", (e) => {
  e.preventDefault();
  load($("handle").value);
});

setupBuilder();
setupGenerator();
setupCompare();
subscribe(renderAll);
renderAll();

startBackground($("hero-bg"));
loadUpcoming();
loadRepoStats();

// A link like ?platform=leetcode&handle=you opens the page with that handle loaded.
const query = new URLSearchParams(location.search);
if (query.get("platform")) pickPlatform(query.get("platform"));
const fromUrl = query.get("handle");
if (fromUrl) {
  $("handle").value = fromUrl;
  load(fromUrl);
}
