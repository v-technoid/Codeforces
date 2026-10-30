// Header banner: a wide gradient shape with your name and a line under it,
// for the very top of a README (or, flipped, the very bottom).
// The waves move with SVG animation tags and the text fades in with CSS, so
// both play inside GitHub's image proxy, which runs no scripts.
import { escapeXml, FONT } from "./shared.js";

export const BANNER_WIDTH = 900;

export const BANNER_PARAMS = [
  { name: "title", label: "Big text", kind: "text", maxLength: 40, default: "Hi, I'm YOUR NAME" },
  { name: "subtitle", label: "Line under it", kind: "text", maxLength: 80, default: "Competitive programmer and problem solver" },
  {
    name: "shape",
    label: "Shape",
    kind: "choice",
    default: "wave",
    options: [
      { value: "wave", label: "Waves" },
      { value: "slice", label: "Slice" },
      { value: "rounded", label: "Rounded box" },
    ],
  },
  { name: "from", label: "Gradient start", kind: "color", default: "5a45f0" },
  { name: "to", label: "Gradient end", kind: "color", default: "c04cf5" },
  { name: "text_color", label: "Text color", kind: "color", default: "ffffff" },
  { name: "height", label: "Height", kind: "number", min: 100, max: 320, default: 190 },
  { name: "footer", label: "Flip it for the bottom of the README", kind: "bool", default: false },
];

/** A wave edge along y = base, as one path with a fixed list of commands, so two of them can morph. */
function wavePath(w, h, base, amp, phase) {
  const n = 5;
  const seg = w / n;
  const yAt = (i) => base + amp * Math.sin(phase + i * 1.9);
  let d = `M0 0H${w}V${yAt(n).toFixed(1)}`;
  // Right to left, with flat tangents at each point so the joins stay smooth.
  for (let i = n - 1; i >= 0; i--) {
    const x = i * seg;
    const cx = (x + seg * 0.5).toFixed(1);
    d += `C${cx} ${yAt(i + 1).toFixed(1)} ${cx} ${yAt(i).toFixed(1)} ${x.toFixed(1)} ${yAt(i).toFixed(1)}`;
  }
  return `${d}Z`;
}

export function renderBannerCard(_data, options) {
  const p = options.params;
  const animate = options.animate !== false;
  const w = BANNER_WIDTH;
  const h = p.height;
  const flip = p.footer;
  const from = `#${p.from || "5a45f0"}`;
  const to = `#${p.to || "c04cf5"}`;
  const ink = `#${p.text_color || "ffffff"}`;

  let shapes;
  if (p.shape === "slice") {
    shapes = `<path d="M0 0H${w}V${(h * 0.62).toFixed(1)}L0 ${h}Z" fill="url(#g)"/>`;
  } else if (p.shape === "rounded") {
    shapes = `<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="18" fill="url(#g)"/>`;
  } else {
    // Two layers of waves: a pale one behind, the full color one in front.
    const base = h * 0.8;
    const amp = Math.max(10, h * 0.1);
    const back = [wavePath(w, h, base, amp, 0.8), wavePath(w, h, base, amp, 2.6)];
    const front = [wavePath(w, h, base - amp * 0.6, amp, 0), wavePath(w, h, base - amp * 0.6, amp, 1.7)];
    const morph = (pair, dur) =>
      animate ? `<animate attributeName="d" dur="${dur}s" repeatCount="indefinite" values="${pair[0]};${pair[1]};${pair[0]}" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>` : "";
    shapes = `<path d="${back[0]}" fill="url(#g)" opacity=".45" transform="translate(0, ${(amp * 0.9).toFixed(1)})">${morph(back, 9)}</path>
  <path d="${front[0]}" fill="url(#g)">${morph(front, 7)}</path>`;
  }

  // Soft light drifting across the color, clipped to the shape.
  const glow = animate
    ? `<g clip-path="url(#shape)" style="mix-blend-mode:soft-light">
    <circle cx="${w * 0.2}" cy="${h * 0.2}" r="${h * 0.9}" fill="url(#light)">
      <animateTransform attributeName="transform" type="translate" values="0 0;${w * 0.5} ${h * 0.1};0 0" dur="16s" repeatCount="indefinite"/>
    </circle>
    <circle cx="${w * 0.85}" cy="${h * 0.6}" r="${h * 0.7}" fill="url(#light)" opacity=".7">
      <animateTransform attributeName="transform" type="translate" values="0 0;${-w * 0.45} ${-h * 0.15};0 0" dur="19s" repeatCount="indefinite"/>
    </circle>
  </g>`
    : "";

  const titleSize = Math.round(Math.min(46, Math.max(24, h * 0.21)));
  const hasSub = Boolean(p.subtitle);
  // On its own, the line under the title is shown larger.
  const subSize = p.title ? Math.round(Math.min(19, Math.max(13, h * 0.088))) : Math.round(titleSize * 0.62);
  // Text sits in the colored part: a bit higher on waves and slices, lower when flipped.
  const center = p.shape === "rounded" ? h / 2 : flip ? h * 0.6 : h * 0.4;
  const titleY = center + (hasSub ? -subSize * 0.35 : titleSize * 0.35);
  const subY = p.title ? titleY + subSize + 14 : center + subSize * 0.35;

  const shapeGroup = flip ? `<g transform="translate(0 ${h}) scale(1 -1)">${shapes}</g>` : shapes;
  const clipShape = flip ? `<g transform="translate(0 ${h}) scale(1 -1)">${shapes}</g>` : shapes;

  const motion = animate
    ? `.t { opacity: 0; animation: rise .9s cubic-bezier(.2,.8,.2,1) .15s forwards; }
    .s { opacity: 0; animation: rise .9s cubic-bezier(.2,.8,.2,1) .45s forwards; }
    @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
    @media (prefers-reduced-motion: reduce) { .t, .s { animation: none; opacity: 1; } }`
    : "";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" role="img" aria-labelledby="title desc">
  <title id="title">${escapeXml(p.title || "Banner")}</title>
  <desc id="desc">${escapeXml(p.subtitle || "")}</desc>
  <style>
    .t { font: 800 ${titleSize}px ${FONT}; fill: ${ink}; letter-spacing: -.5px; }
    .s { font: 500 ${subSize}px ${FONT}; fill: ${ink}; fill-opacity: .9; }
    ${motion}
  </style>
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
    <radialGradient id="light"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    <clipPath id="shape">${clipShape.replace(/<animate[\s\S]*?\/>/g, "")}</clipPath>
  </defs>
  ${shapeGroup}
  ${glow}
  ${p.title ? `<text class="t" x="${w / 2}" y="${titleY.toFixed(1)}" text-anchor="middle">${escapeXml(p.title)}</text>` : ""}
  ${hasSub ? `<text class="s" x="${w / 2}" y="${subY.toFixed(1)}" text-anchor="middle">${escapeXml(p.subtitle)}</text>` : ""}
</svg>`;
}
