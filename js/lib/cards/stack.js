// Tech stack: your languages and tools as chips, each with a colored dot.
// Dot colors follow the colors GitHub uses for languages where one exists.
import { escapeXml, frame, FONT } from "./shared.js";

export const STACK_PARAMS = [
  {
    name: "items",
    label: "Languages and tools",
    kind: "list",
    separator: ",",
    maxItems: 30,
    maxLength: 24,
    default: ["C++", "Python", "JavaScript", "Git", "Linux"],
    hint: "Separate them with commas.",
  },
  { name: "title", label: "Title", kind: "text", maxLength: 40, default: "Tech stack" },
];

export const STACK_FIELDS = [{ id: "title", label: "Title" }];

const COLORS = {
  "c++": "#f34b7d", cpp: "#f34b7d", c: "#555555", "c#": "#178600", csharp: "#178600",
  python: "#3572a5", py: "#3572a5", java: "#b07219", javascript: "#f1e05a", js: "#f1e05a",
  typescript: "#3178c6", ts: "#3178c6", go: "#00add8", golang: "#00add8", rust: "#dea584",
  kotlin: "#a97bff", swift: "#f05138", ruby: "#701516", php: "#4f5d95", dart: "#00b4ab",
  haskell: "#5e5086", scala: "#c22d40", r: "#198ce7", julia: "#a270ba", ocaml: "#ef7a08",
  lua: "#000080", perl: "#0298c3", elixir: "#6e4a7e", zig: "#ec915c", nim: "#ffc200",
  html: "#e34c26", css: "#563d7c", sass: "#a53b70", shell: "#89e051", bash: "#89e051",
  powershell: "#012456", sql: "#e38c00", matlab: "#e16737", assembly: "#6e4c13",
  react: "#61dafb", "react native": "#61dafb", vue: "#41b883", angular: "#dd0031", svelte: "#ff3e00",
  "node.js": "#5fa04e", nodejs: "#5fa04e", node: "#5fa04e", "next.js": "#7a7a7a", express: "#7a7a7a",
  django: "#0c7a4a", flask: "#7a7a7a", fastapi: "#009688", spring: "#6db33f", "spring boot": "#6db33f",
  flutter: "#02569b", tailwind: "#06b6d4", tailwindcss: "#06b6d4", bootstrap: "#7952b3",
  graphql: "#e10098", redux: "#764abc", jquery: "#0769ad",
  docker: "#2496ed", kubernetes: "#326ce5", k8s: "#326ce5", git: "#f05032", github: "#7a7a7a",
  linux: "#fcc624", ubuntu: "#e95420", aws: "#ff9900", gcp: "#4285f4", azure: "#0078d4",
  firebase: "#ffca28", vercel: "#7a7a7a", nginx: "#009639", jenkins: "#d24939",
  mongodb: "#47a248", postgresql: "#4169e1", postgres: "#4169e1", mysql: "#4479a1",
  redis: "#dc382d", sqlite: "#0f80cc", tensorflow: "#ff6f00", pytorch: "#ee4c2c",
  numpy: "#4dabcf", pandas: "#150458", "scikit-learn": "#f7931e", opencv: "#5c3ee8",
  figma: "#a259ff", vim: "#019733", neovim: "#57a143", "vs code": "#007acc", vscode: "#007acc",
};
const FALLBACK = ["#4f6bed", "#0ea5a4", "#d9480f", "#7c3aed", "#2f9e44", "#e8590c", "#1c7ed6", "#c2255c"];

export function stackColor(item) {
  const key = item.trim().toLowerCase();
  if (COLORS[key]) return COLORS[key];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length];
}

// Rough widths for 12.5px semibold text, enough to lay chips out in rows.
function textWidth(text) {
  let w = 0;
  for (const ch of text) {
    if ("iljtfI.,:;|!'()[] ".includes(ch)) w += 4;
    else if ("mwMW@".includes(ch)) w += 11;
    else if (/[A-Z0-9#+&]/.test(ch)) w += 8.4;
    else w += 7;
  }
  return Math.ceil(w);
}

export function renderStackCard(_data, options) {
  const { theme: t } = options;
  const p = options.params;
  const hide = options.hide ?? new Set();
  const showTitle = !hide.has("title") && p.title;

  const left = 25;
  const right = 470;
  const top = showTitle ? 58 : 24;
  const chipH = 28;
  const rowGap = 10;
  const gapX = 8;

  let x = left;
  let row = 0;
  const chips = p.items.map((item, i) => {
    const w = textWidth(item) + 36;
    if (x + w > right && x > left) {
      x = left;
      row++;
    }
    const chip = `<g class="fade" style="animation-delay:${120 + i * 55}ms" transform="translate(${x.toFixed(1)}, ${top + row * (chipH + rowGap)})">
    <rect width="${w}" height="${chipH}" rx="${chipH / 2}" fill="${t.track}"/>
    <circle cx="14" cy="${chipH / 2}" r="4.5" fill="${stackColor(item)}" stroke="${t.border}" stroke-width="1"/>
    <text class="chip" x="25" y="${chipH / 2 + 4.5}">${escapeXml(item)}</text>
  </g>`;
    x += w + gapX;
    return chip;
  });

  const height = top + (row + 1) * chipH + row * rowGap + 22;

  return frame({
    options,
    height,
    accent: t.title,
    title: p.title || "Tech stack",
    desc: p.items.join(", "),
    css: `.chip { font: 600 12.5px ${FONT}; fill: ${t.text}; }`,
    body: `${showTitle ? `<text class="eyebrow" x="25" y="36">${escapeXml(p.title.toUpperCase())}</text>` : ""}
  ${chips.join("\n  ")}`,
  });
}
