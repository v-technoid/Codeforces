// Typing intro: your own lines typed out one after another with a blinking
// cursor, the classic animated headline for a profile README.
//
// GitHub shows README images without running scripts, so the typing is done
// with SVG's own animation tags (SMIL), which GitHub, browsers and phones all play.
import { escapeXml } from "./shared.js";

const MONO = `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, 'DejaVu Sans Mono', monospace`;
// Monospace glyphs are about 0.6em wide. textLength pins every line to exactly
// that width, so the reveal and the cursor line up whatever font the viewer has.
const CHAR = 0.6;

export const TYPING_PARAMS = [
  {
    name: "lines",
    label: "Lines",
    kind: "list",
    separator: ";",
    maxItems: 8,
    maxLength: 70,
    default: ["Hi, I'm a competitive programmer", "Solving problems on Codeforces", "Always learning something new"],
    hint: "One line per row. They're typed one after another, then it starts over.",
  },
  { name: "color", label: "Text color", kind: "color", default: "4f6bed" },
  { name: "size", label: "Text size", kind: "number", min: 14, max: 48, default: 24 },
  { name: "width", label: "Width", kind: "number", min: 240, max: 900, default: 600 },
  { name: "speed", label: "Typing speed (ms per letter)", kind: "number", min: 20, max: 250, default: 70 },
  { name: "pause", label: "Pause after a line (ms)", kind: "number", min: 300, max: 6000, default: 1600 },
  { name: "center", label: "Centered", kind: "bool", default: true },
  { name: "background", label: "Background", kind: "color", default: "" },
];

const sec = (ms) => `${(ms / 1000).toFixed(3)}s`;

export function renderTypingCard(_data, options) {
  const p = options.params;
  const animate = options.animate !== false;
  const size = p.size;
  const cw = size * CHAR;
  const height = Math.round(size * 2.1);
  const baseline = Math.round(height / 2 + size * 0.35);
  // Lines that don't fit are trimmed so nothing spills off the edge.
  const maxChars = Math.max(4, Math.floor((p.width - 24) / cw));
  const lines = p.lines.map((l) => (l.length > maxChars ? `${l.slice(0, maxChars - 1)}…` : l));
  const color = `#${p.color}`;

  // Timeline: type, hold, erase, short gap, next line. Then everything loops.
  const speed = p.speed;
  const eraseStep = Math.max(15, Math.round(speed * 0.45));
  const gap = 350;
  const plan = [];
  let t = 0;
  for (const line of lines) {
    const n = line.length;
    const typed = t + n * speed;
    const held = typed + p.pause;
    const erased = held + n * eraseStep;
    plan.push({ line, n, start: t, typed, held, erased });
    t = erased + gap;
  }
  const total = t;

  const xFor = (n) => (p.center ? (p.width - n * cw) / 2 : 12);

  const bg = p.background ? `<rect width="${p.width}" height="${height}" rx="8" fill="#${p.background}"/>` : "";

  // Without animation, show the first line fully typed.
  if (!animate) {
    const { line, n } = plan[0];
    const x = xFor(n);
    return wrap(
      p,
      height,
      `${bg}<text x="${x.toFixed(1)}" y="${baseline}" class="t" textLength="${(n * cw).toFixed(1)}" lengthAdjust="spacing">${escapeXml(line)}</text>
  <rect x="${(x + n * cw + 2).toFixed(1)}" y="${baseline - size * 0.82}" width="${Math.max(2, size * 0.09).toFixed(1)}" height="${(size * 1.05).toFixed(1)}" fill="${color}"/>`,
      lines,
    );
  }

  const parts = plan.map((step, i) => {
    const { line, n, start, typed, held, erased } = step;
    const x = xFor(n);
    // One keyframe per letter typed and per letter erased.
    const times = [0];
    const widths = [0];
    for (let k = 1; k <= n; k++) {
      times.push(start + k * speed);
      widths.push(k * cw);
    }
    for (let k = 1; k <= n; k++) {
      times.push(held + k * eraseStep);
      widths.push((n - k) * cw);
    }
    // Make sure times strictly increase and stay inside the loop.
    for (let k = 1; k < times.length; k++) if (times[k] <= times[k - 1]) times[k] = times[k - 1] + 1;
    const keyTimes = times.map((v) => (v / total).toFixed(5)).join(";");
    const values = widths.map((w) => w.toFixed(1)).join(";");
    const cursorX = widths.map((w) => (x + w + 2).toFixed(1)).join(";");

    // The cursor shows only while this line is on screen.
    const visTimes = [0, start / total, Math.min(erased, total - 1) / total];
    if (visTimes[1] === 0) visTimes.splice(1, 1);
    const visValues = visTimes.length === 3 ? "0;1;0" : "1;0";

    return `<clipPath id="c${i}"><rect x="${x.toFixed(1)}" y="0" width="0" height="${height}">
      <animate attributeName="width" values="${values}" keyTimes="${keyTimes}" dur="${sec(total)}" calcMode="discrete" repeatCount="indefinite"/>
    </rect></clipPath>
  <text x="${x.toFixed(1)}" y="${baseline}" class="t" clip-path="url(#c${i})" textLength="${(n * cw).toFixed(1)}" lengthAdjust="spacing">${escapeXml(line)}</text>
  <g class="blink"><rect y="${(baseline - size * 0.82).toFixed(1)}" width="${Math.max(2, size * 0.09).toFixed(1)}" height="${(size * 1.05).toFixed(1)}" fill="${color}" opacity="0">
      <animate attributeName="x" values="${cursorX}" keyTimes="${keyTimes}" dur="${sec(total)}" calcMode="discrete" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="${visValues}" keyTimes="${visTimes.map((v) => v.toFixed(5)).join(";")}" dur="${sec(total)}" calcMode="discrete" repeatCount="indefinite"/>
    </rect></g>`;
  });

  return wrap(p, height, `${bg}\n  ${parts.join("\n  ")}`, lines);
}

function wrap(p, height, body, lines) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${p.width}" height="${height}" viewBox="0 0 ${p.width} ${height}" role="img" aria-label="${escapeXml(lines.join(". "))}">
  <title>${escapeXml(lines.join(". "))}</title>
  <style>
    .t { font: 600 ${p.size}px ${MONO}; fill: #${p.color}; white-space: pre; }
    .blink { animation: blink 1s steps(1) infinite; }
    @keyframes blink { 50% { opacity: 0; } }
    @media (prefers-reduced-motion: reduce) { .blink { animation: none; } }
  </style>
  ${body}
</svg>`;
}
