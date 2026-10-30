// Extra link options for cards that need more than a handle and a theme,
// like the lines of the typing intro or the items of the tech stack.
//
// Each card lists its params as plain objects:
//   { name, label, kind, default, ... }
// kind is one of: "list", "text", "number", "bool", "color", "timezone", "choice".
// A "choice" lists its allowed values as options: [{ value, label }].
// The same description drives link parsing, link building and the builder inputs.

const first = (v) => (Array.isArray(v) ? v[0] : v);
const HEX = /^([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isValidTimeZone(tz) {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function clean(spec, raw) {
  switch (spec.kind) {
    case "list": {
      if (raw === undefined) return spec.default;
      const items = String(raw)
        .split(spec.separator)
        .map((s) => s.trim().slice(0, spec.maxLength))
        .filter(Boolean)
        .slice(0, spec.maxItems);
      return items.length ? items : spec.default;
    }
    case "text":
      return raw === undefined ? spec.default : String(raw).trim().slice(0, spec.maxLength);
    case "number": {
      const n = Math.round(Number(raw));
      if (raw === undefined || raw === "" || !Number.isFinite(n)) return spec.default;
      return Math.min(spec.max, Math.max(spec.min, n));
    }
    case "bool":
      if (raw === undefined) return spec.default;
      return raw === "" || raw === "true" || raw === "1";
    case "color": {
      const v = String(raw ?? "").trim().replace(/^#/, "");
      return HEX.test(v) ? v.toLowerCase() : spec.default;
    }
    case "timezone":
      return isValidTimeZone(raw) ? raw : spec.default;
    case "choice": {
      const v = String(raw ?? "").trim().toLowerCase();
      return spec.options.some((o) => o.value === v) ? v : spec.default;
    }
    default:
      return spec.default;
  }
}

/** Reads a card's params from a query object, falling back to defaults. */
export function readParams(card, query = {}) {
  const out = {};
  for (const spec of card.params ?? []) out[spec.name] = clean(spec, first(query[spec.name]));
  return out;
}

const same = (a, b) => (Array.isArray(a) ? Array.isArray(b) && a.join("\u0000") === b.join("\u0000") : a === b);

/** Writes the params that differ from their defaults into URLSearchParams. */
export function writeParams(card, values, search) {
  for (const spec of card.params ?? []) {
    const v = values?.[spec.name];
    if (v === undefined || same(v, spec.default)) continue;
    if (spec.kind === "list") search.set(spec.name, v.join(spec.separator));
    else if (spec.kind === "bool") search.set(spec.name, v ? "true" : "false");
    else search.set(spec.name, String(v));
  }
}

/** Default values for every param of a card. */
export function defaultParams(card) {
  return readParams(card, {});
}
