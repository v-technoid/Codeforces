// Checks every platform reader against the real sites, from your own computer.
//
//   node scripts/check.js codeforces=tourist leetcode=neal_wu atcoder=tourist
//
// With no arguments it tries a few well known public profiles. Pass your own
// handles to check the other platforms. For each platform it prints what it
// read, or the error, so a broken reader is easy to spot.
import { CONTEST_SITES, getAllUpcoming } from "../js/lib/contests.js";
import { PLATFORMS } from "../js/lib/platforms/index.js";

// Profiles known to exist. Pass handles for the other platforms yourself.
const SAMPLES = {
  codeforces: "tourist",
  leetcode: "neal_wu",
  atcoder: "tourist",
  topcoder: "tourist",
  codewars: "g964",
  uva: "felix_halim",
};

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.split("=")));
const wanted = Object.keys(args).length ? args : SAMPLES;
if (!Object.keys(args).length) {
  console.log("Checking a few known profiles. Add yours like: node scripts/check.js codechef=you gfg=you spoj=you");
}
const show = (v) => (v === undefined || v === null || v === "" ? "-" : v);

let failures = 0;
for (const p of PLATFORMS) {
  const handle = wanted[p.id];
  if (!handle) continue;
  const started = Date.now();
  try {
    const s = await p.fetch(handle, { submissions: true });
    const facts = (s.facts ?? []).filter((f) => f.value !== undefined && f.value !== null && f.value !== "");
    console.log(`\n✓ ${p.name} (${handle}) in ${Date.now() - started} ms`);
    console.log(`  rating ${show(s.rating)}, max ${show(s.maxRating)}, rank ${show(s.rankLabel)}, contests ${show(s.contests)}`);
    console.log(`  solved ${show(s.solved)}, ${s.primary ? `${show(s.primary.value)} ${s.primary.label}` : "no main number"}`);
    if (s.difficulty) console.log(`  breakdown ${s.difficulty.map((d) => `${d.label} ${d.count}`).join(", ")}`);
    if (s.history?.length) console.log(`  history ${s.history.length} contests, last ${show(s.history.at(-1).name)}`);
    if (s.activity) console.log(`  activity ${s.activity.total} submissions in the last year`);
    if (facts.length) console.log(`  ${facts.map((f) => `${f.label} ${f.value}`).join(", ")}`);
  } catch (err) {
    failures++;
    console.log(`\n✗ ${p.name} (${handle}): ${err.kind ?? "error"}: ${err.message}`);
  }
}
// Upcoming contests, one site at a time, so a broken source is easy to spot.
console.log("\nUpcoming contests:");
for (const site of CONTEST_SITES) {
  try {
    const list = await getAllUpcoming([site.id]);
    console.log(`  ✓ ${site.name}: ${list.length} upcoming${list[0] ? `, next "${list[0].name}" at ${new Date(list[0].startTimeSeconds * 1000).toISOString()}` : ""}`);
  } catch (err) {
    failures++;
    console.log(`  ✗ ${site.name}: ${err.message}`);
  }
}

console.log(failures ? `\n${failures} check(s) failed. Copy this output into a GitHub issue.` : "\nEverything read correctly.");
