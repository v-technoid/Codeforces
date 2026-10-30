// The card builder: pick a card, adjust it, copy the snippet.
import { CARDS, getCard } from "../lib/cards/index.js";
import { defaultParams } from "../lib/cards/params.js";
import { renderPlatformCard } from "../lib/cards/platform.js";
import { applyColors, cleanHex, COLOR_PARAMS } from "../lib/options.js";
import { supportedCards } from "../lib/platforms/index.js";
import { themes } from "../lib/themes.js";
import {
  $,
  BROWSER_TZ,
  copyText,
  currentPlatform,
  dataFor,
  isCodeforces,
  loadMulti,
  esc,
  handleOrPlaceholder,
  isReal,
  rememberFocus,
  shown,
  state as page,
  themeChipsHtml,
  toDataUri,
} from "./core.js";
import { cardAlt, cardLink, cardUrls, imageHtml } from "./snippets.js";

// The first group follows the platform picked in the hero.
const GROUPS = [
  { id: "codeforces", label: (platform) => `${platform.name} cards` },
  { id: "extra", label: () => "README extras" },
];

const COMMON_ZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dhaka",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Asia/Dubai",
  "Asia/Tehran",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Moscow",
  "Africa/Cairo",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "America/Sao_Paulo",
  "Australia/Sydney",
];

const NOTES = {
  badge: "The badge uses the same colors everywhere, so it reads well on both GitHub themes.",
  typing: "The typing intro has a see through background, so it fits both GitHub themes. Pick a text color that reads on light and dark.",
  banner: "Banners look best stretched to the full README width: add width=\"100%\" to the img tag. The README generator does this for you.",
  streak: "A streak counts days with at least one submission. It stays alive until the end of the day after your last one.",
  combined: "Fill in the platforms you use and leave the rest empty. Live previews need the site's server (node server.js).",
};

// Builder state. Each card type keeps its own hidden fields and params.
const b = {
  type: "stats",
  theme: "light",
  auto: false,
  darkTheme: "dark",
  hidden: {},
  params: {},
  colors: {},
  border: true,
  animate: true,
  embedTab: 0,
  copied: null,
  paramsFor: null, // which card the param inputs were last drawn for
  typesFor: null, // which platform the card tabs were last drawn for
};

/** Draws the card tabs; the first group only offers cards the platform can fill. */
function renderTypes(platform) {
  const allowed = new Set(supportedCards(platform));
  const visible = (c) => c.group !== "codeforces" || allowed.has(c.type);
  if (!visible(getCard(b.type))) b.type = "stats";
  $("types").innerHTML = GROUPS.map(
    (g) => `<div class="type-group">
      <p class="type-group-label">${g.label(platform)}</p>
      <div class="type-row" role="tablist" aria-label="${g.label(platform)}">
        ${CARDS.filter((c) => c.group === g.id && visible(c))
          .map(
            (c) => `<button type="button" role="tab" class="type" data-type="${c.type}" aria-selected="${c.type === b.type}">
              <span class="type-name">${c.label}</span>
              <span class="type-desc">${c.group === "codeforces" && platform.id !== "codeforces" ? c.description.replace(/Codeforces /g, "") : c.description}</span>
            </button>`,
          )
          .join("")}
      </div>
    </div>`,
  ).join("");
  b.typesFor = platform.id;
}

export function paramsOf(type) {
  if (!b.params[type]) {
    const card = getCard(type);
    const values = defaultParams(card);
    // Show contest times in the visitor's own time zone by default.
    if (type === "upcoming") values.tz = BROWSER_TZ;
    b.params[type] = values;
  }
  return b.params[type];
}

let snippets = [];

/* ---------- Setup ---------- */

export function setupBuilder() {
  $("types").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-type]");
    if (!btn) return;
    b.type = btn.dataset.type;
    b.embedTab = 0;
    renderBuilder();
  });

  const pickTheme = (key) => (e) => {
    const btn = e.target.closest("[data-theme]");
    if (!btn) return;
    b[key] = btn.dataset.theme;
    renderBuilder();
  };
  $("theme-chips").addEventListener("click", pickTheme("theme"));
  $("dark-chips").addEventListener("click", pickTheme("darkTheme"));

  $("auto-mode").addEventListener("change", (e) => {
    b.auto = e.target.checked;
    b.embedTab = 0;
    renderBuilder();
  });

  $("fields").addEventListener("change", (e) => {
    const input = e.target;
    if (input.dataset.field === "__border") b.border = input.checked;
    else if (input.dataset.field === "__animate") b.animate = input.checked;
    else {
      const cur = b.hidden[b.type] ?? [];
      b.hidden[b.type] = input.checked ? cur.filter((x) => x !== input.dataset.field) : [...cur, input.dataset.field];
    }
    renderBuilder();
  });

  $("colors").innerHTML = COLOR_PARAMS.map(
    (c) => `<label class="color"><input type="color" data-param="${c.param}" /><span>${c.label}</span></label>`,
  ).join("");
  $("colors").addEventListener("input", (e) => {
    const input = e.target.closest("[data-param]");
    if (!input) return;
    b.colors = { ...b.colors, [input.dataset.param]: input.value.slice(1) };
    renderBuilder();
  });
  $("reset-colors").addEventListener("click", () => {
    b.colors = {};
    renderBuilder();
  });

  // Card content inputs update the preview without being redrawn, so typing isn't interrupted.
  const onParam = (e) => {
    const input = e.target.closest("[data-param]");
    if (!input) return;
    const card = getCard(b.type);
    const spec = card.params.find((s) => s.name === input.dataset.param);
    if (!spec) return;
    const values = paramsOf(b.type);
    if (input.dataset.action === "clear") {
      values[spec.name] = "";
      b.paramsFor = null;
    } else values[spec.name] = readInput(spec, input);
    if (b.type === "combined") loadMulti(values);
    renderBuilder();
  };
  $("params").addEventListener("input", onParam);
  $("params").addEventListener("change", onParam);
  $("params").addEventListener("click", (e) => {
    if (e.target.closest("[data-action='clear']")) onParam(e);
  });

  $("embed-tabs").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-tab]");
    if (!btn) return;
    b.embedTab = Number(btn.dataset.tab);
    renderBuilder();
  });

  $("copy").addEventListener("click", async () => {
    const code = snippets[b.embedTab]?.code;
    if (!code) return;
    if (await copyText(code, $("embed-code"))) {
      b.copied = code;
      renderBuilder();
      setTimeout(() => {
        if (b.copied === code) {
          b.copied = null;
          renderBuilder();
        }
      }, 2200);
    }
  });
}

/* ---------- Card content inputs ---------- */

function readInput(spec, input) {
  switch (spec.kind) {
    case "list": {
      const parts = spec.separator === ";" ? input.value.split("\n") : input.value.split(",");
      const items = parts.map((s) => s.trim().slice(0, spec.maxLength)).filter(Boolean).slice(0, spec.maxItems);
      return items.length ? items : spec.default;
    }
    case "number": {
      const n = Math.round(Number(input.value));
      return Number.isFinite(n) ? Math.min(spec.max, Math.max(spec.min, n)) : spec.default;
    }
    case "bool":
      return input.checked;
    case "color":
      return input.value.replace("#", "").toLowerCase();
    default:
      return input.value.trim().slice(0, spec.maxLength ?? 200);
  }
}

function paramInputHtml(spec, value) {
  const id = `param-${spec.name}`;
  const hint = spec.hint ? `<span class="hint">${esc(spec.hint)}</span>` : "";
  switch (spec.kind) {
    case "list":
      return spec.separator === ";"
        ? `<label class="param" for="${id}"><span class="param-label">${spec.label}</span>
            <textarea id="${id}" class="input textarea" data-param="${spec.name}" rows="${Math.min(6, Math.max(3, value.length))}" spellcheck="true">${esc(value.join("\n"))}</textarea>${hint}</label>`
        : `<label class="param" for="${id}"><span class="param-label">${spec.label}</span>
            <input id="${id}" class="input" data-param="${spec.name}" value="${esc(value.join(", "))}" />${hint}</label>`;
    case "text":
      return `<label class="param" for="${id}"><span class="param-label">${spec.label}</span>
        <input id="${id}" class="input" data-param="${spec.name}" value="${esc(value)}" maxlength="${spec.maxLength}" />${hint}</label>`;
    case "number":
      return `<label class="param param-inline" for="${id}"><span class="param-label">${spec.label}</span>
        <input id="${id}" class="input input-number" type="number" data-param="${spec.name}" value="${value}" min="${spec.min}" max="${spec.max}" /></label>`;
    case "bool":
      return `<label class="check"><input type="checkbox" data-param="${spec.name}"${value ? " checked" : ""} /><span>${spec.label}</span></label>`;
    case "color":
      return `<div class="param param-inline"><label class="color"><input type="color" data-param="${spec.name}" value="#${value || "ffffff"}" /><span>${spec.label}${value ? "" : " (none)"}</span></label>
        ${value && !spec.default ? `<button type="button" class="link-button" data-param="${spec.name}" data-action="clear">Remove</button>` : ""}</div>`;
    case "choice":
      return `<label class="param" for="${id}"><span class="param-label">${spec.label}</span>
        <select id="${id}" class="input select" data-param="${spec.name}">
          ${spec.options.map((o) => `<option value="${o.value}"${o.value === value ? " selected" : ""}>${esc(o.label)}</option>`).join("")}
        </select>${hint}</label>`;
    case "timezone": {
      const zones = [...new Set([BROWSER_TZ, ...COMMON_ZONES, value])];
      return `<label class="param" for="${id}"><span class="param-label">${spec.label}</span>
        <select id="${id}" class="input select" data-param="${spec.name}">
          ${zones.map((z) => `<option value="${esc(z)}"${z === value ? " selected" : ""}>${esc(z.replace(/_/g, " "))}${z === BROWSER_TZ ? " (yours)" : ""}</option>`).join("")}
        </select>${hint}</label>`;
    }
    default:
      return "";
  }
}

function renderParams(card) {
  const values = paramsOf(card.type);
  $("params-group").hidden = card.params.length === 0;
  $("params").innerHTML = card.params.map((spec) => paramInputHtml(spec, values[spec.name])).join("");
  $("params").classList.toggle("params-grid", card.type === "combined");
  b.paramsFor = card.type;
}

/* ---------- Render ---------- */

export function renderBuilder() {
  const restoreFocus = rememberFocus();
  const platform = currentPlatform();
  if (b.typesFor !== platform.id) renderTypes(platform);
  const real = isReal();
  const card = getCard(b.type);
  const onOtherPlatform = card.anyPlatform && !isCodeforces();
  if (card.needs === "multi") loadMulti(paramsOf("combined"));
  const data = dataFor(card);
  const hide = b.hidden[b.type] ?? [];
  const params = paramsOf(b.type);
  const handle = handleOrPlaceholder();
  const hasColors = COLOR_PARAMS.some((c) => cleanHex(b.colors[c.param]));
  const waiting = card.needsSubmissions && !onOtherPlatform && !shown().solved;
  const useAuto = b.auto && card.themed;
  const ready =
    card.needs === "multi"
      ? Object.entries(params).some(([key, value]) => key !== "title" && value)
      : real || !card.needsHandle;

  $("builder-heading").textContent = real ? `Cards for ${handle}` : "Build your card";
  $("builder-note").textContent = real
    ? "Pick a card, make it yours, then copy the snippet."
    : `${platform.name} cards show sample data until you enter a handle.`;

  for (const btn of $("types").querySelectorAll("[data-type]")) {
    btn.setAttribute("aria-selected", String(btn.dataset.type === b.type));
  }

  // Controls
  if (b.paramsFor !== card.type) renderParams(card);
  $("themed-controls").hidden = !card.themed;
  $("card-note").hidden = !NOTES[card.type];
  $("card-note").textContent = NOTES[card.type] ?? "";
  $("theme-legend").textContent = useAuto ? "Theme in light mode" : "Theme";
  $("theme-chips").innerHTML = themeChipsHtml(b.theme);
  $("auto-mode").checked = b.auto;
  $("dark-group").hidden = !useAuto;
  $("dark-chips").innerHTML = themeChipsHtml(b.darkTheme);

  // The profile and solved cards on other platforms have no optional parts.
  const cardFields = onOtherPlatform && (card.type === "stats" || card.type === "solved") ? [] : card.fields;
  const fieldRows = [
    ...cardFields.map((f) => ({ id: f.id, label: f.label, checked: !hide.includes(f.id) })),
    ...(card.themed ? [{ id: "__border", label: "Border", checked: b.border }] : []),
    { id: "__animate", label: "Animation", checked: b.animate },
  ];
  $("fields-group").hidden = card.type === "badge";
  $("fields").innerHTML = fieldRows
    .map(
      (f) =>
        `<label class="check"><input type="checkbox" data-field="${f.id}"${f.checked ? " checked" : ""} /><span>${f.label}</span></label>`,
    )
    .join("");
  $("colors-details").hidden = !card.themed;

  // Color pickers start from the colors the card actually uses.
  const effective = applyColors(themes[b.theme], b.colors);
  for (const input of $("colors").querySelectorAll("[data-param]")) {
    const c = COLOR_PARAMS.find((p) => p.param === input.dataset.param);
    const value = cleanHex(b.colors[c.param]) ?? effective[c.key].replace("#", "");
    input.value = `#${value.slice(0, 6).padEnd(6, "0")}`;
  }
  $("reset-colors").hidden = !hasColors;
  $("colors-note").hidden = !(useAuto && hasColors);

  // Previews
  const render = (themeId) => {
    const options = {
      theme: applyColors(themes[themeId], b.colors),
      hide: new Set(hide),
      hideBorder: !b.border,
      animate: b.animate,
      params,
      now: new Date(),
    };
    return toDataUri(onOtherPlatform ? renderPlatformCard(card.type, platform.id, data, options) : card.render(data, options));
  };
  const alt = cardAlt(b.type, handle, params, platform.id);

  if (waiting) {
    $("preview-area").innerHTML = `<div class="waiting" role="status">${
      page.loadingFull
        ? "Counting your submissions. Big accounts take a few seconds."
        : "Submissions couldn't be loaded. Try again in a minute."
    }</div>`;
  } else {
    const previews = useAuto
      ? [
          { label: "In GitHub light mode", src: render(b.theme), scheme: "light" },
          { label: "In GitHub dark mode", src: render(b.darkTheme), scheme: "dark" },
        ]
      : [{ label: "", src: render(b.theme), scheme: "" }];
    const note =
      card.needs === "upcoming" && page.upcomingIsSample
        ? `<p class="caption">Sample contests shown here. The real card always lists the live schedule.</p>`
        : "";
    $("preview-area").innerHTML =
      previews
        .map(
          (p) => `<figure class="figure${card.type === "typing" ? " figure-typing" : ""}">
          <img src="${p.src}" alt="${esc(alt)}" class="${b.type === "badge" ? "preview-badge" : "preview"}" />
          ${p.label ? `<figcaption class="caption">${p.label}</figcaption>` : ""}
        </figure>`,
        )
        .join("") + note;
  }

  // Snippets
  const config = {
    platform: platform.id,
    handle,
    type: b.type,
    theme: b.theme,
    hide,
    colors: b.colors,
    hideBorder: !b.border,
    animate: b.animate,
    params,
  };
  const { light, dark } = cardUrls(config, useAuto ? b.darkTheme : null);
  const href = cardLink(b.type, handle, platform.id);
  const center = b.type === "typing";

  const html = imageHtml({ light, dark, alt, href });
  const wrapCenter = (s) => (center ? `<p align="center">\n  ${s.replace(/\n/g, "\n  ")}\n</p>` : s);

  snippets = useAuto
    ? [
        {
          label: "Markdown",
          code: wrapCenter(html),
          hint: "GitHub READMEs accept this HTML inside Markdown. Visitors see the theme that matches their GitHub mode.",
        },
        { label: "Links", code: `Light: ${light}\nDark:  ${dark}`, hint: "The two image links, if you want to place them yourself." },
      ]
    : [
        {
          label: "Markdown",
          code: center ? wrapCenter(html) : href ? `[![${alt}](${light})](${href})` : `![${alt}](${light})`,
          hint: center
            ? "Paste this at the top of your profile README. It's centered, like a headline."
            : href
              ? "Paste this into your profile README. The card links to your Codeforces page."
              : "Paste this into your profile README.",
        },
        {
          label: "HTML",
          code: html,
          hint: "Use this where HTML works better, like inside a table or a centered block.",
        },
        { label: "Link", code: light, hint: "The plain image link, for anywhere that shows images." },
      ];

  if (b.embedTab >= snippets.length) b.embedTab = 0;
  const current = snippets[b.embedTab];
  $("embed-tabs").innerHTML = snippets
    .map(
      (s, i) =>
        `<button type="button" role="tab" class="embed-tab" data-tab="${i}" aria-selected="${i === b.embedTab}">${s.label}</button>`,
    )
    .join("");
  $("embed-code").textContent = current.code;
  $("embed-hint").textContent = ready
    ? current.hint
    : card.needs === "multi"
      ? "Add at least one handle above and the snippet fills in."
      : "Make your cards first and your handle will fill in here.";
  $("copy").disabled = !ready;
  $("copy").querySelector("span").textContent = b.copied === current.code ? "Copied" : "Copy";

  restoreFocus();
}

/** Lets other sections open the builder on a given card. */
export function showCardInBuilder(type) {
  b.type = type;
  b.embedTab = 0;
  renderBuilder();
  $("build").scrollIntoView({ behavior: "smooth", block: "start" });
}

/** Fills a platform's handle into the combined card, e.g. after loading it in the hero. */
export function setCombinedHandle(platformId, handle) {
  const params = paramsOf("combined");
  if (params[platformId] === handle) return;
  params[platformId] = handle;
  if (b.paramsFor === "combined") b.paramsFor = null; // redraw the inputs with the new value
}
