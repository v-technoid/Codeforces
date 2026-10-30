// The sticky header, the occasional shine on "Star on GitHub", and sections
// that rise in as they scroll into view.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/** Slides the header away while scrolling down and back while scrolling up. */
function setupHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;
  let lastY = window.scrollY;
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    header.classList.toggle("is-scrolled", y > 8);
    // Small jitters (trackpads, the address bar on phones) shouldn't flip it.
    if (Math.abs(delta) < 6) return;
    const keep = y < 120 || header.contains(document.activeElement);
    header.classList.toggle("is-hidden", delta > 0 && !keep);
    lastY = y;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  // Tabbing into the header brings it back.
  header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
  update();
}

/**
 * Every so often the "Star on GitHub" button catches the light. Not on a loop:
 * the first one comes after a few seconds, then at most a few more per visit,
 * only while the button is on screen, and never again once it has been clicked.
 */
function setupStarShine() {
  const button = document.querySelector(".site-header .gh-button");
  if (!button || reduceMotion.matches) return;
  const FIRST = 5000;
  const EVERY = 40000;
  const MAX = 4;
  let shown = 0;
  let timer = 0;

  const visible = () =>
    document.visibilityState === "visible" && !button.closest(".is-hidden") && button.getBoundingClientRect().bottom > 0;

  const shine = () => {
    if (shown >= MAX) return;
    if (visible()) {
      button.classList.remove("is-shining");
      void button.offsetWidth; // restart the animation
      button.classList.add("is-shining");
      shown++;
    }
    timer = setTimeout(shine, EVERY);
  };

  button.addEventListener("animationend", (e) => {
    if (e.animationName === "star-pulse") button.classList.remove("is-shining");
  });
  button.addEventListener("click", () => {
    clearTimeout(timer);
    shown = MAX;
  });
  timer = setTimeout(shine, FIRST);
}

/** Sections fade and rise in the first time they come into view. */
function setupReveal() {
  if (reduceMotion.matches || !("IntersectionObserver" in window)) return;
  const targets = document.querySelectorAll("main > .section, main > .star-band, .site-footer");
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        observer.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.04 },
  );
  for (const el of targets) {
    // Anything already on screen (after a reload halfway down) shows right away.
    if (el.getBoundingClientRect().top < window.innerHeight) continue;
    el.classList.add("reveal");
    observer.observe(el);
  }
}

export function setupChrome() {
  setupHeader();
  setupStarShine();
  setupReveal();
}
