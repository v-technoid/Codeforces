// Light, dark or automatic (following the device) theme for the page.
//
// The choice is remembered in this browser only. A tiny script in index.html
// applies it before the first paint so the page never flashes the wrong colors;
// this file adds the switch, the animation and keeps everything in sync.

const KEY = "coder-stats-card-theme";
const ORDER = ["system", "light", "dark"];
const LABELS = { system: "Auto (device setting)", light: "Light", dark: "Dark" };
const BG = { light: "#f6f5fc", dark: "#0d0c1c" };

const media = window.matchMedia("(prefers-color-scheme: dark)");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function readChoice() {
  try {
    const v = localStorage.getItem(KEY);
    return ORDER.includes(v) ? v : "system";
  } catch {
    return "system";
  }
}

function saveChoice(choice) {
  try {
    if (choice === "system") localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, choice);
  } catch {
    // Private windows can block storage; the switch still works for this visit.
  }
}

let choice = readChoice();

const resolve = (c) => (c === "system" ? (media.matches ? "dark" : "light") : c);

/** Whether the page is showing dark colors right now. */
export const isDark = () => document.documentElement.dataset.theme === "dark";

function apply() {
  const theme = resolve(choice);
  const root = document.documentElement;
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", BG[theme]);
  const button = document.getElementById("theme-toggle");
  if (button) {
    button.dataset.choice = choice;
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    button.setAttribute("aria-label", `Theme: ${LABELS[choice]}. Switch to ${LABELS[next]}`);
    button.title = `Theme: ${LABELS[choice]}`;
  }
  window.dispatchEvent(new CustomEvent("themechange", { detail: { theme, choice } }));
}

/** Switches theme, with a circle that grows from the button when the browser can. */
function switchTo(next, origin) {
  const before = resolve(choice);
  choice = next;
  saveChoice(choice);
  const after = resolve(choice);

  // Same colors (e.g. Auto while the device is already light): just update the button.
  if (before === after || reduceMotion.matches || !document.startViewTransition) {
    if (before !== after && !reduceMotion.matches) {
      // Older browsers: a short cross fade instead of the circle.
      document.documentElement.classList.add("theme-fade");
      setTimeout(() => document.documentElement.classList.remove("theme-fade"), 400);
    }
    apply();
    return;
  }

  const rect = origin.getBoundingClientRect();
  const x = rect.left + rect.width / 2;
  const y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));

  const transition = document.startViewTransition(apply);
  transition.ready
    .then(() => {
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        { duration: 600, easing: "cubic-bezier(.4, 0, .2, 1)", pseudoElement: "::view-transition-new(root)" },
      );
    })
    .catch(() => {});
}

export function setupTheme() {
  apply();
  const button = document.getElementById("theme-toggle");
  button?.addEventListener("click", () => {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    switchTo(next, button);
  });
  // Auto follows the device when it changes, for example at sunset.
  media.addEventListener?.("change", () => {
    if (choice === "system") apply();
  });
}
