// The sticky header, the occasional shine on "Star on GitHub", and sections
// that rise in as they scroll into view.

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

/**
 * Slides the header away while scrolling down and back while scrolling up.
 * It waits for a deliberate scroll in one direction (a few dozen pixels)
 * before moving, so small wobbles don't make it flicker.
 */
function setupHeader() {
  const header = document.getElementById("site-header");
  if (!header) return;
  const HIDE_AFTER = 40; // px scrolled down before it hides
  const SHOW_AFTER = 16; // px scrolled up before it shows
  let lastY = window.scrollY;
  let travel = 0; // distance scrolled in the current direction
  let ticking = false;

  const update = () => {
    ticking = false;
    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;
    lastY = y;
    header.classList.toggle("is-scrolled", y > 8);
    if (delta === 0) return;
    // Reset the distance whenever the direction changes.
    travel = Math.sign(delta) === Math.sign(travel) ? travel + delta : delta;
    const nearTop = y < 120;
    // Stay put only while someone is moving through the header with the keyboard.
    // A mouse click (like the theme switch) leaves focus on the button, but
    // that shouldn't pin the header in place.
    const keep = nearTop || keyboardInside();
    if (keep) header.classList.remove("is-hidden");
    else if (travel > HIDE_AFTER) header.classList.add("is-hidden");
    else if (travel < -SHOW_AFTER) header.classList.remove("is-hidden");
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
  const keyboardInside = () => {
    const el = document.activeElement;
    if (!el || !header.contains(el)) return false;
    try {
      return el.matches(":focus-visible");
    } catch {
      return false;
    }
  };
  // Tabbing into the header brings it back.
  header.addEventListener("focusin", () => {
    if (keyboardInside()) header.classList.remove("is-hidden");
  });
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

/**
 * A burst of little glints around the star buttons when the pointer reaches them:
 * "Star on GitHub" in the header, "Star the repo" in the open source band and the
 * GitHub link in the footer. Drawn on a fixed layer above the page, then removed.
 */
function setupSparkles() {
  if (reduceMotion.matches || !Element.prototype.animate) return;
  // White glints vanish on the light page, so light mode uses deeper golds and violets.
  const DARK_COLORS = ["#ffd54a", "#ffffff", "#f5c04a", "#c9b8ff", "#8f80ff", "#ff9bd2"];
  const LIGHT_COLORS = ["#f2b200", "#7a5cff", "#e0a400", "#b847f2", "#ff7ab8", "#0eadc4"];
  const layer = document.createElement("div");
  layer.className = "sparkle-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.append(layer);

  const burst = (el) => {
    const r = el.getBoundingClientRect();
    const count = 16;
    // Buttons on the purple band always get the bright set.
    const onDark = document.documentElement.dataset.theme === "dark" || el.closest(".star-band");
    const COLORS = onDark ? DARK_COLORS : LIGHT_COLORS;
    for (let i = 0; i < count; i++) {
      const spark = document.createElement("span");
      spark.className = i % 3 === 0 ? "sparkle sparkle-dot" : "sparkle";
      const size = 9 + Math.random() * 10;
      // Start on the button's edge, spread evenly around it with a little jitter.
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
      const x0 = r.left + r.width / 2 + Math.cos(angle) * (r.width / 2) * 0.9;
      const y0 = r.top + r.height / 2 + Math.sin(angle) * (r.height / 2) * 0.9;
      const dist = 22 + Math.random() * 30;
      spark.style.cssText = `left:${x0}px;top:${y0}px;width:${size}px;height:${size}px;color:${COLORS[i % COLORS.length]}`;
      layer.append(spark);
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 6;
      spark
        .animate(
          [
            { transform: "translate(-50%, -50%) scale(0) rotate(0deg)", opacity: 1 },
            { transform: `translate(calc(-50% + ${dx * 0.6}px), calc(-50% + ${dy * 0.6}px)) scale(1.15) rotate(90deg)`, opacity: 1, offset: 0.45 },
            { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 8}px)) scale(0) rotate(180deg)`, opacity: 0 },
          ],
          { duration: 850 + Math.random() * 400, easing: "cubic-bezier(.2,.8,.3,1)", delay: Math.random() * 90 },
        )
        .finished.then(() => spark.remove(), () => spark.remove());
    }
  };

  const last = new WeakMap();
  const targets = document.querySelectorAll(".gh-button, .star-big, .footer-gh");
  for (const el of targets) {
    el.addEventListener("pointerenter", () => {
      // At most one burst every so often per button, so moving back and forth stays calm.
      const now = performance.now();
      if (now - (last.get(el) ?? 0) < 700) return;
      last.set(el, now);
      burst(el);
      el.classList.remove("is-glitter");
      void el.offsetWidth;
      el.classList.add("is-glitter");
    });
    el.addEventListener("animationend", (e) => {
      if (e.animationName === "glitter-glow") el.classList.remove("is-glitter");
    });
  }
}

export function setupChrome() {
  setupHeader();
  setupStarShine();
  setupReveal();
  setupSparkles();
}
