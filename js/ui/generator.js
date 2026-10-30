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
import { isDark } from "./theme.js";
import { cardAlt, cardLink, cardUrls, imageHtml } from "./snippets.js";

// Every section, in the order it appears in the README.
const SECTIONS = [
  { id: "banner", label: "Header banner", group: "top", on: true },
  { id: "typing", label: "Typing intro", group: "top", on: true },
  { id: "badge", label: "Rank badge", group: "top", on: true },
  { id: "views", label: "Profile views counter", group: "top", on: false, github: true },
  { id: "about", label: "About me", group: "about", on: false },
  { id: "socials", label: "Connect with me", group: "socials", on: false },
  { id: "stats", label: "Profile card", group: "codeforces", on: true },
  { id: "rating", label: "Rating graph", group: "codeforces", on: true },
  { id: "solved", label: "Problems solved", group: "codeforces", on: true },
  { id: "streak", label: "Submission streak", group: "codeforces", on: true },
  { id: "heatmap", label: "Submission heatmap", group: "codeforces", on: false },
  { id: "contests", label: "Recent contests", group: "codeforces", on: false },
  { id: "combined", label: "All my platforms", group: "combined", on: false },
  { id: "github", label: "GitHub contribution streak", group: "github", on: false, github: true },
  { id: "stack", label: "Tech stack", group: "stack", on: true },
  { id: "upcoming", label: "Upcoming contests", group: "upcoming", on: true },
  { id: "footer", label: "Footer wave", group: "bottom", on: false },
];

// One click starting points. Anything not listed is switched off.
const PRESETS = {
  minimal: { label: "Minimal", on: ["typing", "badge", "stats", "stack"] },
  cp: {
    label: "Competitive programmer",
    on: ["banner", "badge", "stats", "rating", "solved", "streak", "contests", "combined", "upcoming"],
  },
  all: { label: "Everything", on: SECTIONS.map((s) => s.id) },
};

const HEADINGS = { about: "About me", socials: "Connect with me", github: "GitHub", stack: "Tech stack", upcoming: "Upcoming contests" };

// "Connect with me" links: what to ask for and how to turn it into a link.
const LINKS = [
  { site: "linkedin", label: "LinkedIn", placeholder: "Profile link or username", url: (v) => (isUrl(v) ? v : `https://www.linkedin.com/in/${v}`) },
  { site: "x", label: "X", placeholder: "Username", url: (v) => (isUrl(v) ? v : `https://x.com/${v.replace(/^@/, "")}`) },
  { site: "email", label: "Email", placeholder: "you@example.com", url: (v) => `mailto:${v}` },
  { site: "website", label: "Website", placeholder: "yoursite.com", url: (v) => (isUrl(v) ? v : `https://${v}`) },
  { site: "youtube", label: "YouTube", placeholder: "Channel link or @handle", url: (v) => (isUrl(v) ? v : `https://www.youtube.com/@${v.replace(/^@/, "")}`) },
  { site: "instagram", label: "Instagram", placeholder: "Username", url: (v) => (isUrl(v) ? v : `https://www.instagram.com/${v.replace(/^@/, "")}`) },
];

const isUrl = (v) => /^https?:\/\//i.test(v);
const GITHUB_USER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/;

const prefersDark = isDark;

const g = {
  on: Object.fromEntries(SECTIONS.map((s) => [s.id, s.on])),
  introLines: null, // null until the person edits them, so they follow the handle
  bannerTitle: null, // same idea: follows the handle until edited
  bannerSubtitle: null,
  bannerShape: "wave",
  github: "",
  links: Object.fromEntries(LINKS.map((l) => [l.site, ""])),
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

const githubUser = () => (GITHUB_USER.test(g.github) ? g.github : "");

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

function defaultBanner() {
  const name = isReal() ? (isCodeforces() ? shown().user.handle : state.pstats.handle) : "YOUR NAME";
  const role = isReal() ? defaultIntro()[1] : "Competitive programmer and problem solver";
  return { title: `Hi, I'm ${name}`, subtitle: role };
}
const bannerTitle = () => g.bannerTitle ?? defaultBanner().title;
const bannerSubtitle = () => g.bannerSubtitle ?? defaultBanner().subtitle;

/* ---------- The README, as a list of blocks ---------- */

function cardItem(type, extraParams = {}) {
  const card = getCard(type);
  const params = { ...defaultParams(card), ...extraParams };
  if (type === "upcoming") params.tz = BROWSER_TZ;
  return { type, params };
}

/** An image from another service, used for the GitHub based sections. */
function externalItem(src, alt, href, dark = null) {
  return { external: true, src, dark, alt, href };
}

function buildBlocks() {
  const blocks = [];
  const gh = githubUser();

  if (g.on.banner) {
    blocks.push({
      kind: "wide",
      item: cardItem("banner", { title: bannerTitle(), subtitle: bannerSubtitle(), shape: g.bannerShape }),
    });
  }

  const top = [];
  if (g.on.typing) top.push(cardItem("typing", { lines: introLines() }));
  if (g.on.badge) top.push(cardItem("badge"));
  if (g.on.views && gh) {
    top.push(
      externalItem(
        `https://komarev.com/ghpvc/?username=${gh}&label=Profile%20views&color=5a45f0&style=flat`,
        "Profile views",
        null,
      ),
    );
  }
  if (top.length) blocks.push({ kind: "center", items: top });

  if (g.on.about && g.about.trim()) {
    blocks.push({ kind: "h2", text: HEADINGS.about }, { kind: "p", text: g.about.trim() });
  }

  if (g.on.socials) {
    const links = LINKS.filter((l) => g.links[l.site].trim()).map((l) => ({
      ...cardItem("social", { site: l.site, label: "" }),
      href: l.url(g.links[l.site].trim()),
    }));
    if (gh) links.unshift({ ...cardItem("social", { site: "github", label: "" }), href: `https://github.com/${gh}` });
    if (links.length) blocks.push({ kind: "h2", text: HEADINGS.socials }, { kind: "links", items: links });
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

  if (g.on.github && gh) {
    const streak = (theme) => `https://streak-stats.demolab.com/?user=${gh}&theme=${theme}&hide_border=true`;
    blocks.push(
      { kind: "h2", text: HEADINGS.github },
      {
        kind: "row",
        items: [externalItem(streak("default"), `${gh}'s GitHub contribution streak`, `https://github.com/${gh}`, g.auto ? streak("dark") : null)],
      },
    );
  }

  if (g.on.stack) {
    blocks.push({ kind: "h2", text: HEADINGS.stack }, { kind: "row", items: [cardItem("stack", { items: g.stack })] });
  }
  if (g.on.upcoming) {
    blocks.push({ kind: "h2", text: HEADINGS.upcoming }, { kind: "row", items: [cardItem("upcoming")] });
  }
  if (g.on.footer) {
    blocks.push({
      kind: "wide",
      item: cardItem("banner", { title: "", subtitle: "Thanks for stopping by", shape: "wave", footer: true, height: 130 }),
    });
  }
  return blocks;
}

/* ---------- Markdown ---------- */

function itemHtml(item, width, indent) {
  if (item.external) {
    return imageHtml({ light: item.src, dark: item.dark, alt: item.alt, href: item.href, width, indent });
  }
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
    href: item.href ?? cardLink(item.type, handle, state.platform),
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
    } else if (block.kind === "wide") {
      out.push(itemHtml(block.item, "100%", ""));
    } else if (block.kind === "links") {
      out.push(`<p align="center">\n${block.items.map((item) => `  ${itemHtml(item, null, "")}`).join("\n")}\n</p>`);
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
  const style = width ? ` style="width:${width}"` : "";
  if (item.external) {
    const src = g.scheme === "dark" && item.dark ? item.dark : item.src;
    return `<img src="${esc(src)}" alt="${esc(item.alt)}" loading="lazy"${style} />`;
  }
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
  return `<img src="${toDataUri(svg)}" alt="${esc(cardAlt(item.type, handleOrPlaceholder(), item.params, state.platform))}"${style} />`;
}

function toPreview(blocks) {
  const parts = blocks.map((block) => {
    if (block.kind === "center") return `<div class="gh-center">${block.items.map((i) => previewImg(i)).join("")}</div>`;
    if (block.kind === "wide") return `<p class="gh-wide">${previewImg(block.item, "100%")}</p>`;
    if (block.kind === "links") return `<p class="gh-links">${block.items.map((i) => previewImg(i)).join("")}</p>`;
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

function extraHtml(id) {
  switch (id) {
    case "banner":
      return `<input class="input" id="gen-banner-title" maxlength="40" aria-label="Banner big text" />
        <input class="input" id="gen-banner-sub" maxlength="80" aria-label="Banner line under it" />
        <select class="input select" id="gen-banner-shape" aria-label="Banner shape">
          <option value="wave">Waves</option><option value="slice">Slice</option><option value="rounded">Rounded box</option>
        </select>`;
    case "typing":
      return `<textarea class="input textarea" id="gen-intro" rows="4" aria-label="Typing intro lines, one per row"></textarea>
        <span class="hint">One line per row.</span>`;
    case "views":
    case "github":
      return `<span class="hint" data-needs-github></span>`;
    case "about":
      return `<textarea class="input textarea" id="gen-about" rows="3" aria-label="About me" placeholder="A sentence or two about you, what you're learning, how to reach you"></textarea>`;
    case "socials":
      return `${LINKS.map(
        (l) => `<label class="gen-link"><span>${l.label}</span>
          <input class="input" data-link="${l.site}" placeholder="${l.placeholder}" autocomplete="off" spellcheck="false" maxlength="120" /></label>`,
      ).join("")}
        <span class="hint">Leave out any you don't use. Your GitHub username adds a GitHub link too.</span>`;
    case "stack":
      return `<input class="input" id="gen-stack" aria-label="Languages and tools, separated by commas" />
        <span class="hint">Separate them with commas.</span>`;
    case "combined":
      return `<span class="hint" id="gen-combined-hint"></span>
        <button type="button" class="link-button" id="gen-edit-handles">Add your handles</button>`;
    default:
      return "";
  }
}

export function setupGenerator() {
  $("gen-presets").innerHTML = Object.entries(PRESETS)
    .map(([id, p]) => `<button type="button" class="preset" data-preset="${id}">${esc(p.label)}</button>`)
    .join("");
  $("gen-presets").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-preset]");
    if (!btn) return;
    const on = new Set(PRESETS[btn.dataset.preset].on);
    for (const sec of SECTIONS) {
      g.on[sec.id] = on.has(sec.id);
      const box = document.querySelector(`[data-section="${sec.id}"]`);
      if (box) box.checked = g.on[sec.id];
      const extra = $(`gen-extra-${sec.id}`);
      if (extra) extra.hidden = !g.on[sec.id];
    }
    btn.classList.remove("is-picked");
    void btn.offsetWidth;
    btn.classList.add("is-picked");
    renderGenerator();
  });

  $("gen-github").addEventListener("input", (e) => {
    g.github = e.target.value.trim().replace(/^@/, "").replace(/^https?:\/\/github\.com\//i, "").replace(/\/.*$/, "");
    e.target.setAttribute("aria-invalid", String(Boolean(g.github) && !githubUser()));
    soon();
  });

  $("gen-sections").innerHTML = SECTIONS.map((s) => {
    const extra = extraHtml(s.id);
    return `<div class="gen-section" data-id="${s.id}">
      <label class="check"><input type="checkbox" data-section="${s.id}"${g.on[s.id] ? " checked" : ""} /><span>${s.label}</span></label>
      ${extra ? `<div class="gen-extra" id="gen-extra-${s.id}"${g.on[s.id] ? "" : " hidden"}>${extra}</div>` : ""}
    </div>`;
  }).join("");

  $("gen-banner-title").addEventListener("input", (e) => {
    g.bannerTitle = e.target.value.trim() ? e.target.value.slice(0, 40) : null;
    soon();
  });
  $("gen-banner-sub").addEventListener("input", (e) => {
    g.bannerSubtitle = e.target.value.trim() ? e.target.value.slice(0, 80) : null;
    soon();
  });
  $("gen-banner-shape").addEventListener("change", (e) => {
    g.bannerShape = e.target.value;
    renderGenerator();
  });
  $("gen-extra-socials").addEventListener("input", (e) => {
    const site = e.target.dataset.link;
    if (!site) return;
    g.links[site] = e.target.value.slice(0, 120);
    soon();
  });

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
  // The banner text does the same.
  const banner = defaultBanner();
  if (g.bannerTitle === null && document.activeElement !== $("gen-banner-title")) $("gen-banner-title").value = banner.title;
  if (g.bannerSubtitle === null && document.activeElement !== $("gen-banner-sub")) $("gen-banner-sub").value = banner.subtitle;

  const gh = githubUser();
  for (const el of document.querySelectorAll("[data-needs-github]")) {
    el.textContent = gh ? `Uses github.com/${gh}, from a free service outside this site.` : "Add your GitHub username above to show this.";
    el.classList.toggle("hint-warn", !gh);
  }

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
