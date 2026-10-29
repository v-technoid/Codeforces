// Ordered from lowest to highest, matching the official Codeforces ladder.
export const RANKS = [
  { name: "newbie", min: -Infinity, light: "#808080", dark: "#a8a8a8" },
  { name: "pupil", min: 1200, light: "#008000", dark: "#3fbf5a" },
  { name: "specialist", min: 1400, light: "#03a89e", dark: "#2ed3c6" },
  { name: "expert", min: 1600, light: "#0000ff", dark: "#6b8cff" },
  { name: "candidate master", min: 1900, light: "#aa00aa", dark: "#d36bff" },
  { name: "master", min: 2100, light: "#ff8c00", dark: "#ffa94d" },
  { name: "international master", min: 2300, light: "#ff8c00", dark: "#ffa94d" },
  { name: "grandmaster", min: 2400, light: "#ff0000", dark: "#ff5c5c" },
  { name: "international grandmaster", min: 2600, light: "#ff0000", dark: "#ff5c5c" },
  { name: "legendary grandmaster", min: 3000, light: "#ff0000", dark: "#ff5c5c" },
];
export const UNRATED = {
  name: "unrated",
  min: -Infinity,
  light: "#6b7280",
  dark: "#9ca3af",
};
export function rankForRating(rating) {
  if (rating === undefined || Number.isNaN(rating)) return UNRATED;
  let found = RANKS[0];
  for (const rank of RANKS) {
    if (rating >= rank.min) found = rank;
  }
  return found;
}
/** The next rank above the given rating, or null at the top. */
export function nextRank(rating) {
  if (rating === undefined) return RANKS[1];
  return RANKS.find((r) => r.min > rating) ?? null;
}
/**
 * How far the user is from their current rank floor to the next one, 0 to 1.
 * Unrated users get 0 and legendary grandmasters get a full ring.
 */
export function progressToNext(rating) {
  if (rating === undefined) return 0;
  const current = rankForRating(rating);
  const next = nextRank(rating);
  if (!next) return 1;
  const floor = Number.isFinite(current.min) ? current.min : 0;
  const span = next.min - floor;
  return Math.min(1, Math.max(0, (rating - floor) / span));
}
export function titleCase(text) {
  return text.replace(/\b\w/g, (c) => c.toUpperCase());
}
