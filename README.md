# Coder Stats Card

Live cards for your GitHub profile README from 13 coding platforms: ratings, rating graphs, problems solved, a year of submissions and recent contests. Plus README extras like an animated typing intro, your tech stack, upcoming Codeforces contests and one card with all your platforms together. The cards update on their own, and the site can write your whole profile README for you.

![Codeforces card](https://coderstatscard.vercel.app/api/card?username=tourist&theme=dark)

## Supported platforms

| Platform | `platform=` | Cards | How it reads your data |
| -------- | ----------- | ----- | ---------------------- |
| Codeforces | `codeforces` (default) | profile, rating, solved, heatmap, streak, contests, badge | Official API |
| LeetCode | `leetcode` | profile, rating, solved, heatmap, streak, contests, badge | LeetCode's public GraphQL endpoint |
| AtCoder | `atcoder` | profile, rating, contests, badge | AtCoder's rating history JSON, plus AtCoder Problems for solved counts |
| CodeChef | `codechef` | profile, rating, contests, badge | Public profile page |
| GeeksforGeeks | `gfg` | profile, solved, badge | Public profile page and practice API |
| HackerRank | `hackerrank` | profile, solved, badge | HackerRank's website JSON |
| TopCoder | `topcoder` | profile, badge | Official members API |
| Codewars | `codewars` | profile, solved, badge | Official API |
| DMOJ | `dmoj` | profile, rating, badge | Official API |
| SPOJ | `spoj` | profile, badge | Public profile page |
| Kattis | `kattis` | profile, badge | Public profile page |
| UVa Online Judge | `uva` | profile, heatmap, streak, badge | uHunt API |
| CSES | `cses` | profile, badge | Public problem set page (use your user number) |

Platforms marked "public profile page" have no API, so their reader can break when the site redesigns its pages. If one stops working, run the check script below and open an issue with its output.

Not included: HackerEarth, Coding Ninjas and InterviewBit only show profile data after login or through JavaScript, so a server can't read it. LeetCode China uses a separate site with different data and could be added later.

## Use it

Open the site, pick your platform, type your handle, choose a card and a theme, and copy the snippet. Or use **Write your whole README** to pick sections, preview them the way GitHub shows them, and copy or download a finished `README.md`.

The generator starts from a template (Minimal, Competitive programmer or Everything) and can add a header banner, a "Connect with me" row of link badges, a profile views counter and your GitHub contribution streak, plus a footer wave. The views counter and GitHub streak come from two free outside services, [komarev.com](https://komarev.com/ghpvc/) and [streak-stats.demolab.com](https://github.com/DenverCoder1/github-readme-streak-stats); everything else is drawn by this site.

You can also write a link yourself:

```md
[![My LeetCode stats](https://coderstatscard.vercel.app/api/card?platform=leetcode&username=YOUR_HANDLE)](https://leetcode.com/u/YOUR_HANDLE/)
```

### Cards

Pick one with `type`:

| `type`     | What it shows                                                                  |
| ---------- | ------------------------------------------------------------------------------ |
| `stats`    | Rank, rating ring with progress to the next tier, key numbers. The default.    |
| `rating`   | Every rated contest drawn over the colored rank bands.                         |
| `solved`   | Problems solved, broken down by difficulty, badge or language.                 |
| `heatmap`  | Submissions per day over the last year.                                        |
| `streak`   | Current and longest run of days with a submission, with a flame that flickers. Codeforces, LeetCode and UVa. |
| `contests` | Your last five rated contests with rank and rating change.                     |
| `badge`    | A small one line badge showing your rank and rating.                           |

README extras, which don't need `platform` or `username`:

| `type`     | What it shows                                                                  | Its own options |
| ---------- | ------------------------------------------------------------------------------ | --------------- |
| `banner`   | A wide gradient header with your name and moving waves. Use `width="100%"`.    | `title`, `subtitle`, `shape` (`wave`, `slice`, `rounded`), `from`, `to`, `text_color`, `height`, `footer=true` for the bottom |
| `social`   | One link badge for a "Connect with me" row.                                    | `site` (`github`, `linkedin`, `x`, `email`, `website`, `youtube`, `instagram`, `discord`), `label` |
| `combined` | Your profile on every platform you use, as tiles in one card.                  | One handle per platform by its name, like `codeforces=you&leetcode=you`, plus `title` |
| `typing`   | Your lines typed out one after another with a blinking cursor.                 | `lines` (separated by `;`), `color`, `size`, `width`, `speed`, `pause`, `center`, `background` |
| `stack`    | Your languages and tools as colored chips.                                     | `items` (separated by `,`), `title` |
| `upcoming` | The next Codeforces contests with start time, length and a countdown.          | `count` (1 to 6), `tz` (like `Asia/Kolkata`) |

```md
![All my platforms](https://coderstatscard.vercel.app/api/card?type=combined&codeforces=YOU&leetcode=YOU&atcoder=YOU)
![Intro](https://coderstatscard.vercel.app/api/card?type=typing&lines=Hi,+I'm+Vishnu;Competitive+programmer;I+love+DP)
```

GitHub shows README images without running any scripts, so every animation here is built into the SVG image itself with CSS and SVG animation tags. That's why they play on GitHub.

### Options

| Option          | What it does                                                                                   | Example              |
| --------------- | ---------------------------------------------------------------------------------------------- | -------------------- |
| `platform`      | Which site, see the table above. Defaults to `codeforces`.                                     | `platform=atcoder`   |
| `username`      | Your handle on that platform. `handle` also works.                                             | `username=tourist`   |
| `type`          | Which card, see above. Defaults to `stats`.                                                    | `type=heatmap`       |
| `theme`         | `light`, `dark`, `abyss`, `ember`, `frost`, `dusk`, `aurora`, `twilight`, `paper`.              | `theme=dark`         |
| `hide`          | Comma separated parts to leave out. The builder on the site lists them for each card.          | `hide=country,trend` |
| `bg_color`, `title_color`, `text_color`, `muted_color`, `border_color` | Your own colors, hex without `#`.  | `bg_color=102a43`    |
| `hide_border`   | Removes the outline.                                                                           | `hide_border=true`   |
| `animate`       | `false` for a still card.                                                                      | `animate=false`      |

### Match GitHub light and dark mode

GitHub READMEs accept a `<picture>` tag, so visitors see the card that matches their theme:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://coderstatscard.vercel.app/api/card?username=YOUR_HANDLE&theme=dark" />
  <img src="https://coderstatscard.vercel.app/api/card?username=YOUR_HANDLE" alt="My Codeforces stats" />
</picture>
```

The builder on the site writes this for you when you tick "Match GitHub light and dark mode".

Links made with earlier versions of this project, including every `/api/codeforces` link, keep working. Platform cards are cached for 30 minutes, upcoming contests for 10, and typing and stack cards for a day.

## How it's built

Plain HTML, CSS and JavaScript. No framework, no build step, no packages to install.

* `index.html`, `css/style.css` and the files in `js/` are the website.
* `js/lib/` holds the card drawing and the platform readers. The website and the API share it, so previews look exactly like the real cards.
* The files in `api/` are the only server code. Vercel runs each one automatically. They're needed because GitHub has to fetch a fresh image from a server each time someone views your README.

```
index.html              The page
css/style.css           All styles
js/app.js               Starts the page, the platform picker and loading a handle
js/ui/                  One file per page section: hero, ladder, builder,
                        README generator, compare, GitHub stars, background,
                        theme switch, header (hide on scroll, star shine,
                        sections rising into view)
js/lib/platforms/       One reader per platform, all returning the same shape
js/lib/codeforces.js    Codeforces API calls, solved problems, streaks, activity,
                        upcoming contests
js/lib/cards/           One file per card, plus shared frame, helpers and params
js/lib/options.js       Link options and custom colors
js/lib/themes.js        Card themes
js/lib/site.js          The site's name and address (change both here if you move it)
js/lib/sample.js        Sample data shown before anyone searches
js/lib/url.js           Builds card links
api/card.js             The card image endpoint for every platform
api/codeforces.js       The original endpoint name, kept for old links
api/profile.js          JSON platform stats for previews
api/stats.js            JSON Codeforces stats for previews
api/contests.js         JSON upcoming contests for previews
scripts/check.js        Checks every platform reader against the real sites
icons/github.svg        Repository icon used on the site (see below)
server.js               Tiny local server for trying it on your computer
404.html                The page shown for unknown links
robots.txt, sitemap.xml For search engines
site.webmanifest        Name and icons when someone adds the site to a home screen
og.png                  The preview image shown when the link is shared
favicon.svg, icon-*.png, apple-touch-icon.png   Site icons
```

### Light and dark mode

The button next to "Star on GitHub" switches the site between Auto (follows your device), Light and Dark. The new colors spread out in a circle from the button in browsers that support view transitions, and fade in everywhere else. If your device asks for less motion, it switches instantly. The choice is saved in your browser.

## Run it locally

You only need Node.js 18 or newer (Vercel uses 22). There's nothing to install.

```bash
node server.js
```

Then open http://localhost:3000. A card lives at http://localhost:3000/api/card?username=tourist. Use `PORT=4000 node server.js` for another port.

Platforms other than Codeforces need the server, because their sites don't let a web page read them directly.

### Check the platform readers

```bash
node scripts/check.js codechef=YOUR_HANDLE gfg=YOUR_HANDLE spoj=YOUR_HANDLE
```

With no arguments it checks a few well known public profiles. For each platform it prints what it read, or the error.

## Deploy on Vercel

Push to GitHub and import the repo on Vercel. There's nothing to configure: `vercel.json` tells Vercel this is a plain site with no framework and nothing to install or build, which also takes care of projects that used to be set up for Next.js.

### Vercel Web Analytics

The page already contains the analytics script, so there's nothing to install. To start collecting visits:

1. Open the project on Vercel and go to the **Analytics** tab.
2. Click **Enable**.
3. Redeploy (Deployments, the three dots on the latest one, Redeploy).

Visits show up in the Analytics tab within a minute or so. The script is skipped on localhost so your own testing isn't counted. If Vercel shows a different script address for your project than `/_vercel/insights/script.js`, change `ANALYTICS_SRC` near the top of `index.html` to match.

### Using another address

The site's address appears in `js/lib/site.js`, `index.html` (canonical link, social preview tags and structured data), `robots.txt`, `sitemap.xml`, `package.json` and this README. Change it in all of them if you move the site.

## The GitHub icon

The site shows a simple repository icon from `icons/github.svg`. If you'd like GitHub's own mark there instead, download it from [github.com/logos](https://github.com/logos) and save it over that file as a single color SVG. The site colors it automatically.

## Contributing

Issues and pull requests are welcome.

* **Add a platform:** write a reader in `js/lib/platforms/` that returns the shared shape described in `js/lib/platforms/index.js`, add it to `PLATFORMS` and list its cards in `SUPPORT`. It appears in the picker, the builder and the combined card automatically.
* **Add a theme:** add an entry to `js/lib/themes.js`.
* **Add a card:** add a file in `js/lib/cards/` and register it in `js/lib/cards/index.js`. It appears in the builder automatically, including inputs for any `params` it declares.

© Vishnuppriyan PL. Not affiliated with GitHub or any of the coding platforms listed.
