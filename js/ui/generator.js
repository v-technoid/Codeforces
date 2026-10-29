// README generator: choose sections, preview them the way GitHub shows a
// profile README, then copy or download the whole README.md.
import { getCard } from "../lib/cards/index.js";
import { defaultParams } from "../lib/cards/params.js";
import { renderPlatformCard } from "../lib/cards/platform.js";
import { supportedCards } from "../lib/platforms/index.js";
import { SITE_NAME } from "../lib/site.js";
import { rankForRating, titleCase } from "../lib/ranks.js";
import { themes } from "../lib/themes.js";
import {
  $,
  BROWSER_TZ,
  copyText,
  currentPlatform,
  dataFor,
  isCodeforces,
  esc,
  handleOrPlaceholder,
  isReal,
  ORIGIN,
  shown,
  state,
  themeChipsHtml,
  toDataUri,
} from "./core.js";
import { paramsOf, showCardInBuilder } from "./builder.js";
import { cardAlt, cardLink, cardUrls, imageHtml } from "./snippets.js";

// Every section, in the order it appears in the README.
const SECTIONS = [
  { id: "typing", label: "Typing intro", group: "top", on: true },
  { id: "badge", label: "Rank badge", group: "top", on: true },
  { id: "about", label: "About me", group: "about", on: false },
  { id: "stats", label: "Profile card", group: "codeforces", on: true },
  { id: "rating", label: "Rating graph", group: "codeforces", on: true },
  { id: "solved", label: "Problems solved", group: "codeforces", on: true },
  { id: "heatmap", label: "Submission heatmap", group: "codeforces", on: false },
  { id: "contests", label: "Recent contests", group: "codeforces", on: false },
  { id: "combined", label: "All my platforms", group: "combined", on: false },
  { id: "stack", label: "Tech stack", group: "stack", on: true },
  { id: "upcoming", label: "Upcoming contests", group: "upcoming", on: true },
];

const HEADINGS = { about: "About me", stack: "Tech stack", upcoming: "Upcoming contests" };

const prefersDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

const g = {
  on: Object.fromEntries(SECTIONS.map((s) => [s.id, s.on])),
  introLines: null, // null until the person edits them, so they follow the handle
  about: "",
  stack: defaultParams(getCard("stack")).items,
  theme: "light",
  auto: true,
  darkTheme: "dark",
  pairs: true,
  tab: "preview",
  scheme: prefersDark() ? "dark" : "light",
  copied: false,
};

function defaultIntro() {
  if (!isReal()) return defaultParams(getCard("typing")).lines;
  const platform = currentPlatform();
  if (isCodeforces()) {
    const { user } = shown();
    const rank = user.rating === undefined ? "Competitive programmer" : titleCase(rankForRating(user.rating).name);
    return [`Hi, I'm ${user.handle}`, `${rank} on Codeforces`, "Solving one problem at a time"];
  }
  const p = state.pstats;
  const role = p.rankLabel && p.rating !== undefined ? `${p.rankLabel} on ${platform.name}` : `Solving problems on ${platform.name}`;
  return [`Hi, I'm ${p.handle}`, role, "Solving one problem at a time"];
}

const combinedHandles = () => {
  const params = paramsOf("combined");
  return Object.entries(params).some(([k, v]) => k !== "title" && v);
};

const introLines = () => g.introLines ?? defaultIntro();

/* ---------- The README, as a list of blocks ---------- */

function cardItem(type, extraParams = {}) {
  const card = getCard(type);
  const params = { ...defaultParams(card), ...extraParams };
  if (type === "upcoming") params.tz = BROWSER_TZ;
  return { type, params };
}

function buildBlocks() {
  const blocks = [];
  const top = [];
  if (g.on.typing) top.push(cardItem("typing", { lines: introLines() }));
  if (g.on.badge) top.push(cardItem("badge"));
  if (top.length) blocks.push({ kind: "center", items: top });

  if (g.on.about && g.about.trim()) {
    blocks.push({ kind: "h2", text: HEADINGS.about }, { kind: "p", text: g.about.trim() });
  }

  const platform = currentPlatform();
  const allowed = new Set(supportedCards(platform));
  const cf = SECTIONS.filter((s) => s.group === "codeforces" && g.on[s.id] && allowed.has(s.id)).map((s) => cardItem(s.id));
  if (cf.length) {
    blocks.push({ kind: "h2", text: platform.name });
    const per = g.pairs ? 2 : 1;
    for (let i = 0; i < cf.length; i += per) blocks.push({ kind: "row", items: cf.slice(i, i + per) });
  }

  if (g.on.combined && combinedHandles()) {
    const params = paramsOf("combined");
    blocks.push({ kind: "h2", text: params.title || "Coding profiles" }, { kind: "row", items: [{ type: "combined", params }] });
  }

  if (g.on.stack) {
    blocks.push({ kind: "h2", text: HEADINGS.stack }, { kind: "row", items: [cardItem("stack", { items: g.stack })] });
  }
  if (g.on.upcoming) {
    blocks.push({ kind: "h2", text: HEADINGS.upcoming }, { kind: "row", items: [cardItem("upcoming")] });
  }
  return blocks;
}

/* ---------- Markdown ---------- */

function itemHtml(item, width, indent) {
  const handle = handleOrPlaceholder();
  const card = getCard(item.type);
  // The title is shown by the README heading, so the stack card hides its own.
  const hide = item.type === "stack" ? ["title"] : [];
  // The combined card's title is shown by the README heading too.
  if (item.type === "combined") item = { ...item, params: { ...item.params, title: "" } };
  const config = { platform: state.platform, handle, type: item.type, theme: g.theme, hide, colors: {}, animate: true, params: item.params };
  const { light, dark } = cardUrls(config, g.auto && card.themed ? g.darkTheme : null);
  return imageHtml({
    light,
    dark,
    alt: cardAlt(item.type, handle, item.params, state.platform),
    href: cardLink(item.type, handle, state.platform),
    width,
    indent,
  });
}

function toMarkdown(blocks) {
  const out = [];
  for (const block of blocks) {
    if (block.kind === "center") {
      out.push(`<div align="center">\n`);
      for (const item of block.items) out.push(itemHtml(item, null, ""), "");
      out.push(`</div>`);
    } else if (block.kind === "h2") {
      out.push(`## ${block.text}`);
    } else if (block.kind === "p") {
      out.push(block.text);
    } else if (block.kind === "row") {
      const width = block.items.length > 1 ? "49%" : null;
      const inner = block.items.map((item) => `  ${itemHtml(item, width, "").replace(/\n/g, "\n  ")}`).join("\n");
      out.push(`<p align="center">\n${inner}\n</p>`);
    }
    out.push("");
  }
  out.push(`<p align="center"><sub>Cards made with <a href="${ORIGIN}">${SITE_NAME}</a></sub></p>`, "");
  return out.join("\n");
}

/* ---------- Preview ---------- */

function previewImg(item, width) {
  const card = getCard(item.type);
  const data = dataFor(card);
  const other = card.anyPlatform && !isCodeforces();
  if (card.needsSubmissions && !other && !data.solved) {
    return `<div class="gh-wait" style="width:${width ?? "495px"}">Loading submissions</div>`;
  }
  const themeId = g.auto && g.scheme === "dark" && card.themed ? g.darkTheme : g.theme;
  const options = {
    theme: themes[themeId],
    hide: new Set(item.type === "stack" ? ["title"] : []),
    animate: true,
    params: item.type === "combined" ? { ...item.params, title: "" } : item.params,
    now: new Date(),
  };
  const svg = other ? renderPlatformCard(item.type, state.platform, data, options) : card.render(data, options);
  const style = width ? ` style="width:${width}"` : "";
  return `<img src="${toDataUri(svg)}" alt="${esc(cardAlt(item.type, handleOrPlaceholder(), item.params, state.platform))}"${style} />`;
}

function toPreview(blocks) {
  const parts = blocks.map((block) => {
    if (block.kind === "center") return `<div class="gh-center">${block.items.map((i) => previewImg(i)).join("")}</div>`;
    if (block.kind === "h2") return `<h2 class="gh-h2">${esc(block.text)}</h2>`;
    if (block.kind === "p") return `<p class="gh-p">${esc(block.text).replace(/\n/g, "<br />")}</p>`;
    if (block.kind === "row") {
      const width = block.items.length > 1 ? "49%" : null;
      return `<p class="gh-row">${block.items.map((i) => previewImg(i, width)).join("")}</p>`;
    }
    return "";
  });
  parts.push(`<p class="gh-credit">Cards made with <a href="${ORIGIN}">${SITE_NAME}</a></p>`);
  return parts.join("");
}

/* ---------- Setup and render ---------- */

let pending = 0;
const soon = () => {
  clearTimeout(pending);
  pending = setTimeout(renderGenerator, 120);
};

export function setupGenerator() {
  $("gen-sections").innerHTML = SECTIONS.map((s) => {
    const extra =
      s.id === "typing"
        ? `<textarea class="input textarea" id="gen-intro" rows="4" aria-label="Typing intro lines, one per row"></textarea>
           <span class="hint">One line per row.</span>`
        : s.id === "about"
          ? `<textarea class="input textarea" id="gen-about" rows="3" aria-label="About me" placeholder="A sentence or two about you, what you're learning, how to reach you"></textarea>`
          : s.id === "stack"
            ? `<input class="input" id="gen-stack" aria-label="Languages and tools, separated by commas" />
               <span class="hint">Separate them with commas.</span>`
            : s.id === "combined"
              ? `<span class="hint" id="gen-combined-hint"></span>
                 <button type="button" class="link-button" id="gen-edit-handles">Add your handles</button>`
              : "";
    return `<div class="gen-section" data-id="${s.id}">
      <label class="check"><input type="checkbox" data-section="${s.id}"${g.on[s.id] ? " checked" : ""} /><span>${s.label}</span></label>
      ${extra ? `<div class="gen-extra" id="gen-extra-${s.id}"${g.on[s.id] ? "" : " hidden"}>${extra}</div>` : ""}
    </div>`;
  }).join("");

  $("gen-stack").value = g.stack.join(", ");
  $("gen-edit-handles").addEventListener("click", () => showCardInBuilder("combined"));

  $("gen-sections").addEventListener("change", (e) => {
    const box = e.target.closest("[data-section]");
    if (!box) return;
    g.on[box.dataset.section] = box.checked;
    const extra = $(`gen-extra-${box.dataset.section}`);
    if (extra) extra.hidden = !box.checked;
    renderGenerator();
  });

  $("gen-intro").addEventListener("input", (e) => {
    const lines = e.target.value.split("\n").map((l) => l.trim().slice(0, 70)).filter(Boolean).slice(0, 8);
    g.introLines = lines.length ? lines : null;
    soon();
  });
  $("gen-about").addEventListener("input", (e) => {
    g.about = e.target.value.slice(0, 600);
    soon();
  });
  $("gen-stack").addEventListener("input", (e) => {
    const items = e.target.value.split(",").map((s) => s.trim().slice(0, 24)).filter(Boolean).slice(0, 30);
    g.stack = items.length ? items : defaultParams(getCard("stack")).items;
    soon();
  });

  const pick = (key) => (e) => {
    const btn = e.target.closest("[data-theme]");
    if (!btn) return;
    g[key] = btn.dataset.theme;
    renderGenerator();
  };
  $("gen-theme-chips").addEventListener("click", pick("theme"));
  $("gen-dark-chips").addEventListener("click", pick("darkTheme"));
  $("gen-auto").addEventListener("change", (e) => {
    g.auto = e.target.checked;
    renderGenerator();
  });
  $("gen-pairs").addEventListener("change", (e) => {
    g.pairs = e.target.checked;
    renderGenerator();
  });

  $("gen-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    g.tab = btn.dataset.tab;
    renderGenerator();
  });
  $("gen-scheme").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-scheme]");
    if (!btn) return;
    g.scheme = btn.dataset.scheme;
    renderGenerator();
  });

  $("gen-copy").addEventListener("click", async () => {
    if (await copyText(toMarkdown(buildBlocks()), $("gen-code"))) {
      g.copied = true;
      renderGenerator();
      setTimeout(() => {
        g.copied = false;
        renderGenerator();
      }, 2200);
    }
  });

  $("gen-download").addEventListener("click", () => {
    const blob = new Blob([toMarkdown(buildBlocks())], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: "README.md" });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
}

export function renderGenerator() {
  // Platform cards the picked platform can't fill are hidden from the list.
  const allowed = new Set(supportedCards(currentPlatform()));
  for (const s of SECTIONS.filter((x) => x.group === "codeforces")) {
    document.querySelector(`#gen-sections [data-id="${s.id}"]`).hidden = !allowed.has(s.id);
  }
  const filled = combinedHandles();
  $("gen-combined-hint").textContent = filled
    ? "Uses the handles from the All platforms card."
    : "Add your handles in the All platforms card first.";
  $("gen-edit-handles").textContent = filled ? "Edit handles" : "Add your handles";

  // The intro follows the handle until the person writes their own lines.
  const intro = $("gen-intro");
  if (g.introLines === null && document.activeElement !== intro) intro.value = defaultIntro().join("\n");

  $("gen-theme-legend").textContent = g.auto ? "Theme in light mode" : "Theme";
  $("gen-theme-chips").innerHTML = themeChipsHtml(g.theme);
  $("gen-auto").checked = g.auto;
  $("gen-dark-group").hidden = !g.auto;
  $("gen-dark-chips").innerHTML = themeChipsHtml(g.darkTheme);
  $("gen-pairs").checked = g.pairs;

  for (const btn of $("gen-tabs").querySelectorAll("[data-tab]")) {
    btn.setAttribute("aria-selected", String(btn.dataset.tab === g.tab));
  }
  for (const btn of $("gen-scheme").querySelectorAll("[data-scheme]")) {
    btn.setAttribute("aria-pressed", String(btn.dataset.scheme === g.scheme));
  }
  $("gen-scheme").hidden = g.tab !== "preview";

  const blocks = buildBlocks();
  const markdown = toMarkdown(blocks);
  $("gen-code").textContent = markdown;
  $("gen-code-wrap").hidden = g.tab !== "markdown";
  $("gen-preview").hidden = g.tab !== "preview";
  if (g.tab === "preview") {
    $("gen-preview").className = `gh-frame gh-${g.scheme}`;
    $("gen-preview-body").innerHTML = blocks.length
      ? toPreview(blocks)
      : `<p class="gh-p gh-empty">Pick at least one section to start your README.</p>`;
  }

  $("gen-copy").querySelector("span").textContent = g.copied ? "Copied" : "Copy README";
  $("gen-hint").textContent = isReal()
    ? `Paste this into the README.md of a repository named exactly like your GitHub username. GitHub shows that README on your profile page.`
    : `Enter your ${currentPlatform().name} handle at the top first, so the cards show your stats instead of YOUR_HANDLE.`;
}
