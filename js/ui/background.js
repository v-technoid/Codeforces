// The hero background: a faint grid of squares, like a submission heatmap,
// where squares light up in Codeforces rank colors as if accepted solutions
// were landing. Strongest behind the card stack, fading out toward the text.

const CELL = 14;
const GAP = 5;
const STEP = CELL + GAP;
const LIFE = 2600; // ms a square stays lit
const SPAWN_EVERY = 90; // ms between new squares

export function startBackground(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  // Older browsers without rounded rectangles get square ones.
  const square = (x, y) => (ctx.roundRect ? ctx.roundRect(x, y, CELL, CELL, 3) : ctx.rect(x, y, CELL, CELL));
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  let w = 0;
  let h = 0;
  let cols = 0;
  let rows = 0;
  let colors = [];
  let base = "";
  let lit = []; // { c, r, color, born }
  let running = false;
  let visible = true;
  let last = 0;
  let lastSpawn = 0;

  function readColors() {
    const css = getComputedStyle(document.documentElement);
    const v = (name) => css.getPropertyValue(name).trim();
    colors = ["--r-pupil", "--r-specialist", "--r-expert", "--r-cm", "--r-master", "--r-gm", "--r-pupil", "--r-expert"].map(v);
    base = v("--grid");
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = rect.width;
    h = rect.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / STEP) + 1;
    rows = Math.ceil(h / STEP) + 1;
    lit = lit.filter((s) => s.c < cols && s.r < rows);
    draw(performance.now());
  }

  // How strongly a square shows. On wide screens: strongest on the right,
  // behind the card stack, fading toward the text and the bottom. On phones the
  // text fills the width, so squares only show lower down, behind the cards.
  function weight(x, y) {
    const clamp = (v) => Math.min(1, Math.max(0, v));
    if (w < 900) {
      const stack = document.getElementById("hero-stack")?.getBoundingClientRect();
      const top = stack ? stack.top + window.scrollY - 40 : h * 0.6;
      const bottom = stack ? stack.bottom + window.scrollY + 20 : h - 90;
      return clamp((y - top) / 120) * clamp(1 - (y - bottom) / 70) * 0.8;
    }
    const fx = clamp((x / w - 0.47) / 0.3);
    const fy = clamp(1 - (y / h - 0.55) / 0.45);
    return fx * fy;
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h);
    const ox = (w % STEP) / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = ox + c * STEP;
        const y = r * STEP;
        const k = weight(x, y);
        if (k <= 0.02) continue;
        ctx.globalAlpha = k;
        ctx.fillStyle = base;
        ctx.beginPath();
        square(x, y);
        ctx.fill();
      }
    }
    for (const s of lit) {
      const age = (now - s.born) / LIFE;
      if (age >= 1) continue;
      const x = ox + s.c * STEP;
      const y = s.r * STEP;
      // Quick fade in, slow fade out.
      const glow = age < 0.12 ? age / 0.12 : 1 - (age - 0.12) / 0.88;
      ctx.globalAlpha = glow * weight(x, y) * 0.75;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      square(x, y);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function spawn(now) {
    for (let tries = 0; tries < 6; tries++) {
      const c = Math.floor(Math.random() * cols);
      const r = Math.floor(Math.random() * rows);
      const ox = (w % STEP) / 2;
      if (weight(ox + c * STEP, r * STEP) < 0.25) continue;
      lit.push({ c, r, color: colors[Math.floor(Math.random() * colors.length)], born: now });
      return;
    }
  }

  function frame(now) {
    if (!running) return;
    // About 30 frames a second is plenty for a slow background.
    if (now - last > 33) {
      last = now;
      while (now - lastSpawn > SPAWN_EVERY) {
        spawn(now);
        lastSpawn += SPAWN_EVERY;
        if (now - lastSpawn > 1000) lastSpawn = now;
      }
      lit = lit.filter((s) => now - s.born < LIFE);
      draw(now);
    }
    requestAnimationFrame(frame);
  }

  function update() {
    const shouldRun = visible && !document.hidden && !reduce.matches;
    if (shouldRun && !running) {
      running = true;
      lastSpawn = last = performance.now();
      requestAnimationFrame(frame);
    } else if (!shouldRun) {
      running = false;
      if (reduce.matches) {
        // A still pattern for people who prefer less motion.
        const now = performance.now();
        lit = [];
        for (let i = 0; i < 26; i++) spawn(now - LIFE * 0.3);
        draw(now);
      }
    }
  }

  readColors();
  resize();
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    update();
  }).observe(canvas);
  document.addEventListener("visibilitychange", update);
  reduce.addEventListener?.("change", update);
  // The page's light and dark switch changes the square colors.
  window.addEventListener("themechange", () => {
    readColors();
    draw(performance.now());
  });
  update();
}
