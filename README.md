# GONAIM STUDIO — Portfolio Site

Static portfolio site for **Ahmed Gonaim** — Post-Production Lead, Riyadh.
No build step, no framework, no backend. Open `index.html` and it runs.

Live domain: **https://gonaim.com** · Hosting: **Cloudflare Pages**

## Files

| File | Purpose |
|------|---------|
| `index.html` | The whole page — loader, hero, about/CV, work grid, the vault/archive, services, pipeline, clients, contact, footer, video modal |
| `studio.css` | All styling (neon cyberpunk design system: magenta `#ff2e97`, lime `#b9ff2e`, cyan `#2ff0ff` on `#060509`) |
| `studio.js` | Engine: project data, Vimeo/YouTube thumbnails + players, live Riyadh clock, dust particles, grain, scroll choreography, custom cursor, timeline scrub |
| `assets/` | Portrait (JPEG), favicons, and the `og.jpg` social share card |
| `404.html` / `notfound.*` | The not-found page — a monitor that lost its feed |
| `chrome.js` | Shared furniture: the Riyadh clock, the running timecode, the progress bar |
| `motion.js` | The slice of GSAP the site used, written out longhand — see *Security* |
| `grid.js` | How a row of work is arranged — shared by the site and the console |
| `studio-admin.*` | The work console: arrange the grid, then export a new `studio.js` |
| `functions/_middleware.js` | The edge lock on the console — username + password |
| `work/<slug>/` | One generated page per project (`tools/build-project-pages.mjs`) |
| `project.css` / `project.js` | Styling and behaviour for those pages |
| `_headers` | Cloudflare Pages security + caching headers |
| `robots.txt` / `sitemap.xml` | SEO — `sitemap.xml` is generated, don't hand-edit |
| `_routes.json` | Limits the edge Function to `/studio-admin*` so nothing else invokes it |

## Deploy

Hosted for free on **Cloudflare Pages**. Full step-by-step guide (Arabic):
see **[`DEPLOY-CLOUDFLARE.md`](DEPLOY-CLOUDFLARE.md)**.

Short version — any static host works, publish directory = repo root, build command = none.

## Editing content

All projects live in one array at the top of `studio.js`:

```js
const PROJECTS = [
  {title:"Damascus Int'l Fair 62", id:"1133450361", cat:"events", year:"2025"},
  {title:"Al Asima — Music Video", id:"0-qt2LptXHM", cat:"music", year:"", yt:true},
];
```

- `id` = Vimeo numeric ID, or a YouTube ID with `yt:true`
- **There is a UI for all of this** — `studio-admin.html`, see *The work
  console* below. Editing the array by hand still works exactly as before
- **Order is automatic** while `AUTO_ORDER` is `true`, driven by `CAT_RANK`: showreel, then commercials,
  films, national, music, BTS, with events last — strongest work first. Inside
  each group it's newest first, using the fact that Vimeo hands out IDs in
  ascending upload order, so a descending numeric sort is Vimeo's own publish
  order. `SHOWREEL_ID` is pinned to the very top; non-numeric (YouTube) IDs sort
  last within their group. Paste a new project anywhere in the array; it lands
  in the right place on load. Note `year` is the *production* year and can
  differ from the upload date
- **Phones use a two-column grid**, not a side-scrolling rail — a rail showed
  roughly one card at a time and hid the rest off-screen. `layout()` switches to
  2 columns there, banners still span the full width, and `fillLastRow()` widens
  a card left alone on the final row
- **Rows stay full.** A `hi` banner spans the whole row, so dropped in mid-row it
  would leave empty cells. `layout()` — in `grid.js`, shared with the console —
  holds each banner back until the row of normal cards is complete and releases
  one per break. Row 1 is always reserved for whatever is first, because
  `buildCards()` renders index 0 full-bleed whatever it is. For this to come out even,
  keep the number of non-highlight projects a multiple of `GRID_COLS` (3) — it's
  why two commercials were promoted out of the vault. A filtered view can still
  end on a short row; that's just the end of a list, not a hole
- `hi:true` promotes a project to a full-bleed 21:8 banner spanning the grid,
  the same treatment the opening showreel gets. Currently on AlUla Main Film,
  Glowhouse, The Conjuring Experience, Damascus, Sherlock, Alot Like Life and
  the Ministry of Finance short film
- `cat` must be one of the keys in `CAT` (showreel, films, national, commercials, events, music, bts)
- Thumbnails are pulled automatically (Vimeo oEmbed / YouTube) — no manual images needed
- Arabic titles are auto-detected and switch to IBM Plex Sans Arabic
- Hero background video + showreel: `SHOWREEL_ID` at the top of `studio.js`

### Dream Engine (AI reels)

The AI section ("DREAM ENGINE") sits between the work grid and the vault, and reads from
`AI_REELS` in `studio.js` — just Instagram reel codes:

```js
const AI_REELS = [
  {id:"DbyEq2GNEyR", t:"SAND TO GLASS"},   // cover: just drop assets/reels/DbyEq2GNEyR.jpg
  {id:"DbqHBi7ON7q", t:""},                            // no title yet → card shows GEN / 002
];
```

- `t` is the card title. Left empty the card falls back to its `GEN / NNN`
  number, so titles can be filled in one at a time
- Covers are picked up automatically: drop `assets/reels/<id>.jpg` and that card
  uses it — no code edit. See `assets/reels/README.md` for the filenames

Reels are 9:16, so they get a portrait grid rather than the 16:9 one, and
clicking one opens it in the portrait modal (on phones it hands off to the
Instagram app instead). `fillTrailingRow()` widens the last card when a row
comes up one short.

Instagram publishes no poster/thumbnail API, so rather than leave the cards
blank each one **generates its own still from the reel code**: a hash seeds an
xorshift RNG that dimensions a graded sky, a low sun and its rays, a ridge line
and a constellation — a composed frame, different for every reel and identical
on every load. Hues come from `LATENT_HUES`, inside the studio's palette. A turbulence grain sits on top and clears
on hover — the diffusion idea made literal. `PROMPTS` feeds the self-typing
prompt line above the rail (it only runs while the section is on screen).

Posters resolve in order: `assets/reels/<code>.jpg` first, then Instagram's
legacy `/p/<code>/media/` endpoint, then nothing — leaving the generated
artwork. When a real frame loads the card adds `.has-cover` and the artwork and
grain pull back so the photograph reads.

Instagram's endpoint is alive but refuses a burst — eleven requests at once and
only the first comes back. Requests to it therefore run through one global chain
with a ~700ms gap, so every card gets its turn; local files skip the queue.

Embedding the reel as a poster was tried and reverted: the embed's layout varies
per post — some render the full post UI with likes and a comment box, others a
play button and a "Watch on Instagram" overlay — so no fixed crop works.

Exported frames in `assets/reels/` remain the dependable route and always win.

### The Vault (archived work)

`FROM THE VAULT` is the second grid — the projects carried over from the
2016–2023 PDF portfolio. It lives in the `ARCHIVE` array in `studio.js` and uses
the exact same card engine, filters and modal as the live grid.

```js
const ARCHIVE = [
  {title:"Sabic — Summer Program", id:"GM-tpuWiAK0", cat:"films", yt:true},  // YouTube
  {title:"G-Colors",               id:"515703200",   cat:"motion"},          // Vimeo
  {title:"AI Power",               id:"CoFIAwMDn7c", cat:"lab", ig:true},    // Instagram reel
];
```

- `cat` must be a key of `ACAT` (films, commercials, motion, mapping, events, showreel, post, lab)
- Anything whose `id` already appears in `PROJECTS` is dropped automatically, so
  moving a project up into the live grid needs no edit here
- Instagram reels have no public poster image, so those cards show the generated
  line-art background and open the official reel embed
- Section counts (`36 PROJECTS · 7 CATEGORIES`, `51 ARCHIVED`) are computed at
  runtime — never hand-edit them

### Clients

The two counter-scrolling rows under *Selected Clients* come from the `CLIENTS`
array in `studio.js` — the roster merged from the live grid and the archived
portfolio (which carried the client list on its first page).

```js
{n:"Saudi Food & Drug Authority", m:"SFDA"}   // m = the plate mark
{n:"MCIT"}                                    // omit m and it derives one
```

`m` is optional: a single-word name is used as-is, multi-word names fall back to
their initials. These marks are typographic stand-ins — the old portfolio PDF
contained no logo artwork, so if real client logos are ever licensed, drop the
SVGs in and swap `.cc-m` for an `<img>`.

## The work console

`studio-admin.html` — arrange the work grid without touching code.

- **Grid preview** at the top: the actual row map in real thumbnails — banners
  full width, cards in threes — with each title *under* its tile so nothing is
  ever printed over the frame. It runs `grid.js`, the same `makeLayout()` the
  site builds with, so it is not an approximation. It also reports what the
  last row will come out at. One oEmbed lookup per video feeds both the map and
  the row below it
- **Drag to reorder.** Doing so sets `AUTO_ORDER = false`, and from then on the
  array is used exactly as listed. *Sort automatically* puts it back
- **CARD / FULL WIDTH** per project — that's the `hi` flag
- **Category, year and title** inline; **+ Add project** takes a Vimeo or
  YouTube link and works out the id
- **Categories tab**: rename the **label** a visitor sees, or the **key** a
  project stores — renaming a key carries every project using it across, so
  nothing is left pointing at a category that no longer exists. Drag to set
  which group leads the grid (`CAT_RANK`), add one, or delete one — refused
  while any project still uses it, with the count shown
- Every editable field is drawn as a field. They were styled as bare text at
  first and read as labels, which made a console for editing look like a report

It wears the site's own nav, phone dock and footer, with its own toolbar
sticky underneath — so it is recognisably part of the studio rather than a
loose tool.

**It is behind a password.** `functions/_middleware.js` runs on Cloudflare's
edge and checks HTTP Basic auth before any file is served, so an
unauthenticated visitor never receives a byte of `studio-admin.*` — not the
HTML, not the script. A password checked in the browser would be theatre: the
page is a static file, so anyone could read the password out of it. Credentials
come from the Pages project's `ADMIN_USER` / `ADMIN_PASS` environment
variables and are never in this repository; until both are set the console
answers 404 to everyone, including you, because forgetting to set them must
leave the door shut rather than standing open. Setup steps are in
[`DEPLOY-CLOUDFLARE.md`](DEPLOY-CLOUDFLARE.md); Cloudflare Access is the
stronger option and is described there too.

`_routes.json` limits the Function to `/studio-admin*`. Without it the
middleware would run on every request to the site — every page, every asset —
to say "not the console, carry on".

**Saving is a bar, not a hidden button.** It sits at the bottom of every tab
and always says where you stand: *All changes saved*, or *N unsaved changes*
with the bar lit. `Cmd/Ctrl+S` works. The save sheet then lists **what** changed
in words — renamed, moved, added, removed, reordered — because a count is not
an answer to "what am I about to publish". A renamed category key drags every
project using it along, so those fold into the one rename line instead of
repeating per project.

Whichever way it is saved, the file the console writes has only `PROJECTS`,
`CAT`, `CAT_RANK` and `AUTO_ORDER` rewritten — the other ~1200 lines come
across byte for byte, and Arabic titles go back as `\uXXXX` escapes, keeping
the file ASCII as it already was.

### Publishing

**PUBLISH TO SITE** writes `studio.js` straight to the repository and that is
the whole of it. The push does the rest on its own: Cloudflare Pages rebuilds
the site, and the *Build project pages* workflow
([`.github/workflows/build-pages.yml`](.github/workflows/build-pages.yml))
regenerates `work/` and `sitemap.xml`. Saving used to be four steps by hand —
download, drop in the repo, run the generator, commit and push — and three of
those were a computer's work.

It needs a key, once. In GitHub → *Settings → Developer settings →
Fine-grained tokens*, make one scoped to **this repository only** with a single
permission, **Contents: read and write**, and give it an expiry. Paste it into
the console's *one-time setup* panel. It is held in that browser's
`localStorage` and nowhere else — never in this repository, never in a file
that ships — and **DISCONNECT** wipes it. The narrowest possible key means the
worst it can do is the thing it is for.

Before writing, it re-reads `studio.js` from GitHub and compares it with the
file this page loaded. If they differ somebody else has saved in the meantime,
and it refuses rather than erasing their work — discard, load again, redo. The
commit carries the sha it read, so GitHub enforces the same thing a second
time.

`connect-src` has to reach `api.github.com` for any of this, and the site's
policy must not. So the console gets its own policy, set by the middleware on
the guarded paths only — the site policy verbatim plus that one origin, with
`frame-src` and `frame-ancestors` tightened to `'none'` on the way past. Every
other page keeps the strict policy from `_headers` untouched.

**DOWNLOAD INSTEAD** is still there for when there is no key to hand, and it
deliberately does *not* clear the unsaved-changes flag: a copy on your desktop
is not a save, the live site still has the old file, and pretending otherwise
is how work gets lost.

The console is `noindex` and disallowed in `robots.txt` regardless.

It parses those blocks rather than `eval`-ing them — `new Function` is exactly
what the CSP is there to stop, and the policy is worth more than the shortcut.

## Project pages

Every project in `PROJECTS` also gets its own page at `/work/<slug>/` — a real
URL you can send a client, and the thing that gives the work a chance in search
results. They're generated, never hand-written:

```
node tools/build-project-pages.mjs
```

Nobody has to remember to: the *Build project pages* workflow runs it on any
push that touches `studio.js` or the generator itself, and commits the result.
Run it by hand only when you want the pages before the push. It **wipes and
rewrites the whole `work/` directory** and regenerates `sitemap.xml`, so anything edited in there is lost —
put changes in `studio.js` instead. Two optional fields per project:

- `slug:"alula-main-film"` — fixes the URL. Required for Arabic-only titles,
  which otherwise fall back to `project-<id>`; the five that needed one have it
- `desc:"…"` — real copy for the page body, its `<meta description>` and its
  structured data. Without it the page composes an honest line from the fields
  it already has. **Writing these is the single biggest SEO win left** — a
  generated sentence ranks nothing; two sentences about the brief, the problem
  and what you did will

The URL a grid card links to comes from `slugOf()` in `studio.js`, and the
generator lifts that same function out of the file rather than copying it, so
the two cannot drift apart.

Every generated page carries the site's real `<nav>`, phone dock and footer,
emitted by `siteNav()` / `siteFooter()` in the generator with the hash links
pointed back up two levels. The clock and timecode in them are live, from
`chrome.js`, which is where `pad()`, `initClock()` and the 24fps ticker moved
so the home page, the project pages and the 404 share one implementation
rather than three.

Each page loads nothing from Vimeo or YouTube until the visitor presses play —
the poster is a still and the player is built on click. ESC returns to the grid;
← / → step through projects while the player is still a facade.

Under prev/next sits **MORE WORK** — six other projects with posters. They're
chosen at build time, not shuffled on load: a JS shuffle would hide those links
from a crawler, and reachable work is the entire point of the pages. The
shuffle is seeded with the project's own id, so each page's six differ from its
neighbours' and stay identical on every visit. Prev and next are excluded, being
linked directly above. Their posters wait for the viewport, so a page nobody
scrolls costs one thumbnail lookup instead of seven.

There are three ways in, because one of them had to work on a phone:

- **The modal.** Click a card, the video plays, and a lime `PROJECT PAGE →` chip
  sits under the frame next to the title. This is the discoverable route and the
  only one that works by touch. It appears only for the live grid — `BY_ID` maps
  an id back to its project, so a vault card or a reel simply doesn't show it
- **The title.** It's a real `<a>`, so clicking the words goes to the page while
  clicking the poster still plays. At rest it reads as the plain text it
  replaced; it only lights lime when the pointer is on the words themselves, so
  the card's own hover state is untouched
- **cmd/ctrl/middle-click** anywhere on the title, for a new tab

That the title is a genuine anchor is also what lets a crawler reach all 35.

The vault has no pages: those are archive entries, and 49 more thin pages would
hurt more than help.

## The 404

`404.html` is a monitor that lost its feed: colour bars in the studio's palette
that tear on a beat, framing brackets, a running REC timecode, and a 404 split
into magenta and cyan channels that slices apart every few seconds. Under it a
deck readout reports the status, the path that failed and the studio — and the
path is written with `textContent`, never as markup, because it is whatever a
stranger put in the address bar.

It wears the same nav, dock and footer as everything else, so a visitor who
lands there is one click from anywhere. Styling is `notfound.css` on top of
`studio.css`; all of the motion stops under `prefers-reduced-motion`.

## Security

`_headers` carries a **Content-Security-Policy** built on `default-src 'none'` —
the page may only reach the handful of origins it actually uses, and nothing
else.
Practical consequences when editing:

- **No inline `<script>` and no `onclick=` / `onerror=` attributes.** `script-src`
  is `'self'` plus Cloudflare's analytics beacon. Put JS in a `.js` file and
  attach listeners (this is why the Direct Group mark hides itself from `studio.js`
  instead of an inline `onerror`, and why the probe page's code lives in
  `reel-check.js`)
- **Inline `style="…"` is fine**, `style-src` keeps `'unsafe-inline'` — the card
  engine writes `el.style.*` constantly
- **A new external host needs a new entry.** Adding, say, a Cloudflare Stream
  embed means adding it to `frame-src`, or the browser silently refuses it.
  Check the console for `Refused to…` after any such change
- `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`, `frame-ancestors
  'self'` — the page cannot be reframed, cannot be made to submit anywhere, and
  a stray `<base>` tag cannot re-point its relative URLs
- Every `target="_blank"` carries `rel="noopener"`; the Vimeo/YouTube embeds use
  `dnt=1` and `youtube-nocookie.com` so visitors aren't tracked by third parties
- **JSON-LD is exempt.** `<script type="application/ld+json">` is a data block,
  not code, so the structured data in `index.html` and on every project page
  runs clean under the policy — verified, not assumed
- **The private paths are not in `robots.txt`.** A `Disallow` line is public,
  so listing them would advertise exactly where they are. The console answers
  401 without the password, and both it and the probe page carry
  `X-Robots-Tag: noindex` — which keeps a URL out of the index even when a
  crawler finds it another way, something `robots.txt` cannot do
- **Cloudflare Web Analytics is pre-cleared** (`static.cloudflareinsights.com` in
  `script-src`, `cloudflareinsights.com` in `connect-src`). Turn it on in the
  dashboard and it works; without those two entries the CSP would have killed it
  silently

> **There is no third-party JavaScript left to trust.** GSAP used to come from
> cdnjs — 110KB of someone else's script, unpinned, running with full rights on
> the page. The site used four things from it: fade/slide entrances, the section
> title wipe, the magnetic button, and two scroll callbacks. `motion.js` is that
> arithmetic written out (4KB gzipped), using GSAP's own easing formulas so the
> motion is unchanged, under the same `gsap` / `ScrollTrigger` names so
> `initChoreo()` did not have to change. `script-src` is now `'self'` plus
> Cloudflare's analytics beacon, and SRI is moot.
>
> One subtlety worth keeping in mind if you extend it: `.h-l1`, `.s-title`,
> `.btn-y` and friends all run infinite CSS keyframes on `transform`, and a CSS
> animation outranks an inline style. So on those elements the x/y half of a
> tween never rendered — only opacity did. `motion.js` writes the same inline
> styles GSAP did, which reproduces that faithfully. Switch it to the `translate`
> property or the Web Animations API and motion appears that was never there.

## Performance

Everything below is invisible — the design is untouched.

- **Posters load as cards approach the viewport.** Both grids used to resolve all
  84 thumbnails the moment the loader lifted: ~84 oEmbed calls plus ~84 image
  downloads, nearly all of them screens below the fold, which was enough for
  Vimeo to throttle and starve the cards actually on screen. An
  IntersectionObserver with a 400px margin now drives it — third-party requests
  at load went from **87 to 5**, and no card is ever on screen without its poster
- **The grain canvas is gone.** It repainted forever whether anyone was looking
  or not, and read as a permanent haze. In its place is a four-layer glitch
  system in `chrome.js` + `studio.css`, all transform and opacity, costing
  nothing between events:
  - `#roll` — a soft band drifting down the screen continuously, head-switching
    noise on a VHS deck. This is what keeps the page alive when nobody is
    touching it
  - `#tear` — RGB tearing whose strength follows **scroll velocity** through one
    custom property, `--gi`. A scroll frame writes a number; the compositor does
    the rest. The easing is scaled by real elapsed time, not per frame — without
    that the tear lingers on a slow machine and snaps on a fast one, a five-fold
    difference measured between two boxes here
  - `#glx` — the hard hit, fired at random and when a new section arrives:
    coloured tears plus two blocks that shift sideways and lift the interface
    behind them. `hue-rotate` alone was invisible on a near-black page, so the
    blocks raise brightness first — that is what makes them read as signal
    damage rather than an overlay
  - `#scan` — the standing scanlines, now drifting, and opening up as you move
    faster
  The scroll loop stops itself once the value settles, so an idle page runs no
  JavaScript at all
- **The dust particles use pre-rendered glow sprites** instead of setting
  `shadowBlur` per particle per frame — the single most expensive canvas
  operation there is
- Both canvases **stop when the tab is hidden** and restart on return
- **GSAP is gone**, replaced by `motion.js` — 110KB of CDN JavaScript and two
  network round-trips traded for 4KB gzipped served from the same origin
- `defer` on the scripts, so the parser no longer waits on them at all.
  `DOMContentLoaded` went **1050ms → ~90ms**, third-party requests **87 → 3**
- Project pages load nothing from Vimeo or YouTube until the visitor presses play
- The portrait was a 1254px JPEG for a slot that is never wider than 230 CSS px.
  It's now 640px (155KB → 74KB), still over 2× the pixels a retina screen can
  show there. If you ever re-export it, 640px is the number

## If the domain changes

The domain `gonaim.com` is referenced in: `index.html` (canonical + Open Graph +
Twitter tags), `robots.txt`, and `sitemap.xml`. Find-and-replace `gonaim.com`
across those three files if you switch domains.

## External dependencies

No package manager, no build step, no third-party JavaScript.

- Google Fonts: Bebas Neue, Oswald, JetBrains Mono, IBM Plex Sans Arabic
- Vimeo player + oEmbed thumbnails · YouTube nocookie embed · Instagram reel embeds
- The Direct Group mark is hotlinked from `directgroup.sa` and hides itself if it 404s

> **Vimeo privacy:** every embedded video must have `gonaim.com` whitelisted in
> the Vimeo video's privacy settings, otherwise the player shows "not authorized".
