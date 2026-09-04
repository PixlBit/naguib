# NAGUIB STUDIO — Portfolio Site

Static portfolio site for **Ahmed Naguib** — 3D Artist, Marseille.
No build step, no framework, no backend. Open `index.html` and it runs.

Live domain: **https://naguib.art** · Hosting: **Cloudflare Pages**

> The domain above is a placeholder until a real one is bought. It is written
> into four places — see *[If the domain changes](#if-the-domain-changes)* —
> and nothing else depends on it.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The whole page — loader, hero, work grid, about/CV, the concept lab, the detail passes, skills, process, toolkit, contact, footer, lightbox |
| `studio.css` | All styling (copper `#e0803c`, aqua `#3ee0d0`, ice `#5fd4ff` on `#04070a`) |
| `studio.js` | Engine: the work data, the card engine, the lightbox, dust particles, scroll choreography, custom cursor, the process timeline |
| `assets/work/` | Every render, twice: `<id>.jpg` (1600×900) and `<id>-sm.jpg` (880×495) |
| `assets/concept/` | The 2D sheets, same pair at 1400×1050 and 760×570 |
| `assets/` | The hero cut-out, the portrait, the favicons, the `og.jpg` share card, the portfolio PDF |
| `404.html` / `notfound.*` | The not-found page — a monitor that lost its feed |
| `chrome.js` | Shared furniture: the Marseille clock (in the contact block), the running timecode, the progress bar |
| `motion.js` | The slice of GSAP the site used, written out longhand — see *Security* |
| `grid.js` | How a row of work is arranged — shared by the site and the console |
| `sound.js` | The interface's voice, off until a visitor turns it on |
| `studio-admin.*` | The work console: arrange the grid, upload renders, publish |
| `functions/_middleware.js` | The edge lock on the console — username + password |
| `work/<slug>/` | One generated page per piece (`tools/build-project-pages.mjs`) |
| `project.css` / `project.js` | Styling and behaviour for those pages |
| `_headers` | Cloudflare Pages security + caching headers |
| `robots.txt` / `sitemap.xml` | SEO — `sitemap.xml` is generated, don't hand-edit |
| `_routes.json` | Limits the edge Function to `/studio-admin*` so nothing else invokes it |

## How the page is ordered

A portfolio's job is to show the work, so the work is the first thing under
the headline — before the biography, before the process, before anything
about the person. Everything after it is there to answer a question the work
has already raised:

    HERO      the piece the portfolio opens on
    WORK      the selected grid — fifteen renders
    ABOUT     who made them, and where he learned to
    CONCEPT   the 2D that came before the 3D
    DETAIL    turnarounds and studies of the same assets
    SKILLS    what he does
    PROCESS   how, from blockout to final render
    TOOLKIT   what he does it in
    CONTACT   how to reach him, and what time it is where he is

## What this site deliberately does not have

It is built on the bones of a film-studio site, and a 3D portfolio is not a
film studio. Everything below was in that lineage and has been taken out
rather than renamed, because furniture borrowed from another trade reads as
costume:

- **A clock in the navigation.** The time in a city the visitor is not in,
  ticking in the corner of every page, above the fold, more animated than
  anything else in the header. It moved to the contact block, beside the
  phone number, where it answers the question somebody in another country is
  actually asking. The header says whether he is taking work instead
- **A mascot.** A small CRT character that wandered the window, watched the
  cursor and commented on each section. It was charming and it was the first
  thing a studio art director would see moving
- **A "NOW PLAYING" readout** naming each section as you scrolled into it
- **A running 24fps timecode** in the nav, the hero, the lightbox and the
  footer. A clock counting frames belongs to a site that plays them; over a
  still render it is a playhead pretending
- **The camera HUD** — REC dot, 2.39:1, frame rate, corner framing brackets,
  two floating spec decks. A film set's furniture on a page about sculpting
- **Sprocket-hole filmstrips** between every section
- **A timecode on every card**, counting up as if the grid were a timeline
- **A headline that tore into RGB channels every five seconds, forever.** A
  screen fault on a loop reads as a broken screen, not as a flourish — and
  because off-screen sections are paused, it resumed at unpredictable
  moments, often the first moment anybody looked
- **A flickering signal meter** across the foot of every page, measuring
  nothing. It is a still ruled strip now

What is kept is what belongs to any studio that works in frames: the loader,
the custom cursor, the section glyphs, the scroll choreography, the grain of
the type. Restraint, not sterility.

## Deploy

Hosted for free on **Cloudflare Pages**. Full step-by-step guide (Arabic):
see **[`DEPLOY-CLOUDFLARE.md`](DEPLOY-CLOUDFLARE.md)**.

Short version — any static host works, publish directory = repo root, build
command = none.

## The work is files, not links

This is the one structural difference from a film portfolio, and everything
else follows from it.

A video site stores an id and asks a host for a poster: an oEmbed call per
card, an iframe per play, and a Content-Security-Policy holding the door open
for four third parties. **Nothing here is fetched from anybody.** Every render
ships from `assets/work/` in two sizes — the grid loads the small one, the
lightbox the large — so a card cannot go blank because somebody else's API
throttled, `frame-src` is `'none'`, and the site makes exactly zero
third-party requests for the work itself.

All of it lives in one array at the top of `studio.js`:

```js
const PROJECTS = [
  {title:"Mine Wagon", id:"mine-wagon", cat:"props", year:"2024",
   prod:"Fantasy Racers", soft:"3ds Max · Substance Painter",
   desc:"A hero prop for the mine track…"},
];
```

- `id` is the piece's whole identity: `assets/work/mine-wagon.jpg` is the full
  frame, `…-sm.jpg` the one the grid loads, and `/work/mine-wagon/` is its page
- **There is a UI for all of this** — `studio-admin.html`, see *The work
  console* below. It makes both sizes from one picture and uploads them.
  Editing the array by hand still works exactly as before
- `hi:true` promotes a piece to a full-bleed 21:8 banner spanning the grid.
  Currently on the Hawaiian Alien Dancer, the Corporation Hangar Wall and the
  Astranova Billboard
- `cat` must be one of the keys in `CAT` (characters, environment, props,
  hardsurface)
- `prod` and `soft` show on the card and in the lightbox, and become the
  PRODUCTION and SOFTWARE rows on the piece's own page
- Ordering is by hand while `AUTO_ORDER` is `false`. Set it `true` and the
  array sorts itself by `CAT_RANK` — characters, environments, props, then the
  hard-surface studies. There is no upload date to sort within a group by (a
  render has no upload date), so inside a category the file order stands
- **Rows stay full.** A `hi` banner spans the whole row, so dropped in mid-row
  it would leave empty cells. `layout()` — in `grid.js`, shared with the
  console — holds each banner back until the row of normal cards is complete
  and releases one per break. Row 1 is always reserved for whatever is first,
  because `buildCards()` renders index 0 full-bleed whatever it is. For this to
  come out even, keep the number of non-highlight pieces a multiple of
  `GRID_COLS` (3) — twelve of them, today
- **Phones use a two-column grid**, not a side-scrolling rail. `layout()`
  switches to 2 columns there, banners still span the full width, and
  `fillLastRow()` widens a card left alone on the final row
- Arabic titles are auto-detected and switch to IBM Plex Sans Arabic

### The lightbox

Clicking a card opens the full frame. The small rendition — already decoded,
it is what the card was showing — is painted underneath while the large one
arrives, so the frame is never empty for a beat. `←` / `→` and the two buttons
walk whichever list it was opened from without closing it, and a lime
`PROJECT PAGE →` chip sits under the frame for anything in the selected grid.

The panel beside the title says the production, the software and the year. It
used to run a timecode, inherited from a site where the modal held a film — a
clock counting up over a still photograph is a playhead pretending, so
`chrome.js` no longer writes there at all.

### Hovering a banner

A film card previews by starting a player. A render has nothing to play, so
hovering a banner quietly swaps its small rendition for the full one under the
pointer — the same promise ("there is more here than the thumbnail") paid in
the image the lightbox is about to want anyway, so opening it afterwards costs
nothing.

### The detail passes

`THE OTHER ANGLES` is the second grid — turnarounds, back views and the
studies that sit behind a hero render. Same card engine, same filters, same
lightbox, its own `ARCHIVE` array and `ACAT` categories. Anything whose `id`
already appears in `PROJECTS` is dropped automatically, so promoting a study
into the selected grid needs no edit here. These have no page of their own:
eight more thin pages would hurt more than help.

### The concept lab

`THE 2D BEFORE THE 3D` reads from `CONCEPTS` — a title and a file name, and
nothing else, because that is all a sheet is:

```js
const CONCEPTS = [
  {title:"Cockpit & Helm Layout", id:"cockpit-helm-layout"},
];
```

They come from `assets/concept/` and get **4:3 cards** rather than 16:9: a
drawing cropped into a film frame loses the half with the annotations on it.
The card's caption sits on its own scrim, because these sheets are on white
paper and white type on white paper is not a caption. `PROMPTS` feeds the
self-typing brief line above the grid — it only runs while the section is on
screen.

### Section counts

`15 ASSETS · 4 CATEGORIES`, `8 DETAIL PASSES` and the rest are computed at
runtime. Never hand-edit them.

### The toolkit

The two counter-scrolling rows under *Software I Live In* come from the
`CLIENTS` array in `studio.js` — the software the work is actually made in.

```js
{n:"Autodesk 3ds Max", m:"3DS"}   // m = the plate mark
{n:"ZBrush"}                       // omit m and it derives one
```

`m` is optional: a single-word name is used as-is, multi-word names fall back
to their initials. These marks are typographic stand-ins — no vendor logo
artwork ships here, so if any is ever licensed, drop the SVGs in and swap
`.cc-m` for an `<img>`.

## The work console

`studio-admin.html` — arrange the grid and upload renders without touching
code.

- **The pictures are the point.** Every row has **UPLOAD RENDER**: choose one
  picture and the console decodes it, scales it to the two sizes the site
  actually draws (1600×900 and 880×495; concept sheets 1400×1050 and 760×570)
  and queues both. A 4K render straight out of Marmoset is not what should
  land in a repository, and asking somebody to export two sizes by hand is
  asking them to forget one
- **It knows what is missing.** On load it asks the server, once per name,
  whether each picture is actually there. A row that names a file nobody
  uploaded turns amber and CHECK says so — which is the one fault a wall of
  thumbnails cannot show you, because a blank card looks like a slow one
- **Drag to reorder.** Doing so sets `AUTO_ORDER = false`, and from then on the
  array is used exactly as listed. *Sort automatically* puts it back
- **CARD / FULL WIDTH** per piece — that's the `hi` flag
- **The file name is a field.** Rename it and the row keeps its title,
  category, year and place in the grid; anything queued for the old name comes
  with it, and anything already uploaded does not — so the row says its render
  is missing until one is uploaded under the new name. That is the honest thing
  for it to say, and it is said the moment it becomes true rather than after a
  publish
- **DETAILS** opens what the *page* needs, as against what the grid needs: the
  brief, the production, the software, the role, the web address and any extra
  facts. Every one of them is optional — each field shows the automatic answer
  as its placeholder, so you are never guessing what you are overriding
- **Categories tab**: rename the **label** a visitor sees, or the **key** a
  piece stores — renaming a key carries every piece using it across. Drag to
  set which group leads the grid (`CAT_RANK`), add one, or delete one — refused
  while anything still uses it, with the count shown
- **Studio tab**: the hero cut-out and the portrait, the two pictures the
  markup names directly. Both are re-encoded as **PNG**, because the whole
  point of both is their transparency
- **CHECK** runs `makeLayout()` from `grid.js` — the very function the site
  builds its grid with, not a copy — so what it says about the last row is
  what the site will actually do
- **DATA** measures rather than estimates: the pieces by category and year from
  the file being edited, the bytes the site actually serves, the repository's
  own commit history as a publish log, and an honest gap where visitor numbers
  would be if anything counted them

It wears the site's own nav, phone dock and footer, with its own toolbar sticky
underneath — so it is recognisably part of the studio rather than a loose tool.

**It is behind a password.** `functions/_middleware.js` runs on Cloudflare's
edge and checks HTTP Basic auth before any file is served, so an
unauthenticated visitor never receives a byte of `studio-admin.*` — not the
HTML, not the script. A password checked in the browser would be theatre: the
page is a static file, so anyone could read the password out of it. Credentials
come from the Pages project's `ADMIN_USER` / `ADMIN_PASS` environment variables
and are never in this repository; until both are set the console answers 404 to
everyone, including you, because forgetting to set them must leave the door
shut rather than standing open. Setup steps are in
[`DEPLOY-CLOUDFLARE.md`](DEPLOY-CLOUDFLARE.md); Cloudflare Access is the
stronger option and is described there too.

`_routes.json` limits the Function to `/studio-admin*`. Without it the
middleware would run on every request to the site — every page, every asset —
to say "not the console, carry on".

**Saving is a bar, not a hidden button.** It sits at the bottom of every tab
and always says where you stand: *All changes saved*, or *N unsaved changes*
with the bar lit. `Cmd/Ctrl+S` works. The save sheet then lists **what**
changed in words — renamed, moved, added, removed, reordered, uploaded —
because a count is not an answer to "what am I about to publish".

Whichever way it is saved, the file the console writes has only `PROJECTS`,
`CAT`, `CAT_RANK`, `AUTO_ORDER`, `ARCHIVE`, `ACAT`, `CONCEPTS` and `HERO_ART`
rewritten — the rest comes across byte for byte, and Arabic titles go back as
`\uXXXX` escapes, keeping the file ASCII as it already was.

### Publishing

**PUBLISH TO SITE** writes to the repository and that is the whole of it. The
push does the rest on its own: Cloudflare Pages rebuilds the site, and the
*Build project pages* workflow
([`.github/workflows/build-pages.yml`](.github/workflows/build-pages.yml))
regenerates `work/` and `sitemap.xml`.

**Pictures go up before the code that names them.** Every queued file is
written first, one at a time; only then is `studio.js` touched. The other way
round would publish a card pointing at a file that is not there yet, and if any
upload fails `studio.js` is not touched at all.

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
is how work gets lost. Note that a download carries the *code* only — queued
pictures are uploaded by publishing, so those have to be added to the
repository by hand if you take this route.

The console is `noindex` and disallowed in `robots.txt` regardless.

It parses the data blocks rather than `eval`-ing them — `new Function` is
exactly what the CSP is there to stop, and the policy is worth more than the
shortcut.

## Project pages

Every piece in `PROJECTS` also gets its own page at `/work/<slug>/` — a real
URL you can send a studio, and the thing that gives the work a chance in search
results. They're generated, never hand-written:

```
node tools/build-project-pages.mjs
```

Nobody has to remember to: the *Build project pages* workflow runs it on any
push that touches `studio.js` or the generator itself, and commits the result.
Run it by hand only when you want the pages before the push. It **wipes and
rewrites the whole `work/` directory** and regenerates `sitemap.xml`, so
anything edited in there is lost — put changes in `studio.js` instead.

The optional fields per piece:

- `slug:"alien-dancer"` — fixes the URL, when the one derived from the title is
  wrong
- `desc:"…"` — real copy for the page body, its `<meta description>` and its
  structured data. Without it the page composes an honest line from the fields
  it already has. **Writing these is the single biggest SEO win there is** — a
  generated sentence ranks nothing; two sentences about the brief, the problem
  and what you did will. All fifteen have one
- `prod` / `soft` / `role` / `facts` — the list beside the brief

The URL a grid card links to comes from `slugOf()` in `studio.js`, and the
generator lifts that same function out of the file rather than copying it, so
the two cannot drift apart.

Every generated page carries the site's real `<nav>`, phone dock and footer,
emitted by `siteNav()` / `siteFooter()` in the generator with the hash links
pointed back up two levels. The clock and timecode in them are live, from
`chrome.js`, which is where `pad()`, `initClock()` and the 24fps ticker live so
the home page, the project pages and the 404 share one implementation rather
than three.

The page's own frame is a picture, in the markup, at the top — there is no
facade and no player, so the fastest thing the page can do is the only thing it
does. Pressing it puts the same file on the whole screen; Escape puts it back.
`←` / `→` step between pieces.

Under prev/next sits **MORE WORK** — six other pieces with their frames.
They're chosen at build time, not shuffled on load: a JS shuffle would hide
those links from a crawler, and reachable work is the entire point of the
pages. The shuffle is seeded with the piece's own id, so each page's six differ
from its neighbours' and stay identical on every visit. Prev and next are
excluded, being linked directly above. Their pictures wait for the viewport, so
a page nobody scrolls costs one image instead of seven.

There are three ways in, because one of them had to work on a phone:

- **The lightbox.** Click a card, the frame opens, and a lime `PROJECT PAGE →`
  chip sits under it next to the title. This is the discoverable route and the
  only one that works by touch. It appears only for the selected grid — `BY_ID`
  maps a name back to its piece, so a detail pass or a concept sheet simply
  doesn't show it
- **The title.** It's a real `<a>`, so clicking the words goes to the page while
  clicking the frame still opens the lightbox
- **cmd/ctrl/middle-click** anywhere on the title, for a new tab

That the title is a genuine anchor is also what lets a crawler reach all
fifteen.

Structured data is an **ImageObject** per page — `contentUrl`, `thumbnailUrl`,
`dateCreated`, the software and production as `keywords` — with the same
`@id` for the Person as the home page, so fifteen pages reinforce one entity
rather than describing fifteen strangers who happen to share a name.

## The 404

`404.html` is a monitor that lost its feed: colour bars in the studio's
palette that tear on a beat, framing brackets, a running REC timecode, and a
404 split into copper and ice channels that slices apart every few seconds.
Under it a deck readout reports the status, the path that failed and the
studio — and the path is written with `textContent`, never as markup, because
it is whatever a stranger put in the address bar.

It wears the same nav, dock and footer as everything else, so a visitor who
lands there is one click from anywhere. Styling is `notfound.css` on top of
`studio.css`; all of the motion stops under `prefers-reduced-motion`.

## Security

`_headers` carries a **Content-Security-Policy** built on `default-src 'none'`
— the page may only reach the handful of origins it actually uses, and nothing
else. Because the work is local files, that list is now: this origin, Google
Fonts, and Cloudflare's analytics beacon. `frame-src` is `'none'`; there is
nothing left to frame.

Practical consequences when editing:

- **No inline `<script>` and no `onclick=` / `onerror=` attributes.**
  `script-src` is `'self'` plus Cloudflare's analytics beacon. Put JS in a
  `.js` file and attach listeners
- **Inline `style="…"` is fine**, `style-src` keeps `'unsafe-inline'` — the
  card engine writes `el.style.*` constantly
- **A new external host needs a new entry.** Check the console for
  `Refused to…` after any such change
- `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`,
  `frame-ancestors 'self'` — the page cannot be reframed, cannot be made to
  submit anywhere, and a stray `<base>` tag cannot re-point its relative URLs
- Every `target="_blank"` carries `rel="noopener"`
- **JSON-LD is exempt.** `<script type="application/ld+json">` is a data block,
  not code, so the structured data in `index.html` and on every project page
  runs clean under the policy
- **The private paths are not in `robots.txt`.** A `Disallow` line is public,
  so listing them would advertise exactly where they are. The console answers
  401 without the password and carries `X-Robots-Tag: noindex` — which keeps a
  URL out of the index even when a crawler finds it another way, something
  `robots.txt` cannot do
- **Cloudflare Web Analytics is pre-cleared** (`static.cloudflareinsights.com`
  in `script-src`, `cloudflareinsights.com` in `connect-src`). Turn it on in
  the dashboard and it works

> **There is no third-party JavaScript to trust.** GSAP used to come from
> cdnjs — 110KB of someone else's script, unpinned, running with full rights on
> the page. The site used four things from it: fade/slide entrances, the section
> title wipe, the magnetic button, and two scroll callbacks. `motion.js` is that
> arithmetic written out (4KB gzipped), using GSAP's own easing formulas so the
> motion is unchanged, under the same `gsap` / `ScrollTrigger` names.
>
> One subtlety worth keeping in mind if you extend it: `.h-l1`, `.s-title`,
> `.btn-y` and friends all run infinite CSS keyframes on `transform`, and a CSS
> animation outranks an inline style. So on those elements the x/y half of a
> tween never rendered — only opacity did. `motion.js` writes the same inline
> styles GSAP did, which reproduces that faithfully. Switch it to the
> `translate` property or the Web Animations API and motion appears that was
> never there.

## Performance

- **Frames load as cards approach the viewport.** An IntersectionObserver with
  a 400–900px margin drives both grids, and the card stays observed rather than
  being unobserved once painted: a decoded bitmap costs width × height × 4
  bytes for as long as it is referenced, and a grid of them left decoded is
  what gets a phone tab discarded and silently reloaded underneath you. Leaving
  the band drops the reference; the bytes stay in the HTTP cache, so coming
  back costs a decode and nothing else
- **Two sizes, not one.** The grid never loads a 1600px frame for a card a few
  hundred pixels wide. The lightbox and the project page do
- **The grain canvas is gone.** It repainted forever whether anyone was looking
  or not. In its place is a four-layer glitch system in `chrome.js` +
  `studio.css`, all transform and opacity, costing nothing between events:
  - `#roll` — a soft band drifting down the screen continuously. This is what
    keeps the page alive when nobody is touching it
  - `#tear` — RGB tearing whose strength follows **scroll velocity** through
    one custom property, `--gi`. A scroll frame writes a number; the compositor
    does the rest. The easing is scaled by real elapsed time, not per frame —
    without that the tear lingers on a slow machine and snaps on a fast one
  - `#glx` — the hard hit, fired at random and when a new section arrives:
    coloured tears plus two blocks that shift sideways and lift the interface
    behind them. `hue-rotate` alone was invisible on a near-black page, so the
    blocks raise brightness first — that is what makes them read as signal
    damage rather than an overlay
  - `#scan` — the standing scanlines, drifting, and opening up as you move
    faster

  The scroll loop stops itself once the value settles, so an idle page runs no
  JavaScript at all
- **The dust particles use pre-rendered glow sprites** instead of setting
  `shadowBlur` per particle per frame — the single most expensive canvas
  operation there is
- Both canvases **stop when the tab is hidden** and restart on return
- `defer` on the scripts, so the parser never waits on them
- The hero cut-out is a quantised PNG: 178KB for a picture that is the first
  thing anyone sees, and the loader waits for its `decode()` so the screen
  never lifts onto an empty hero

## If the domain changes

`naguib.art` is referenced in: `index.html` (canonical + Open Graph + Twitter
tags + the JSON-LD block), `robots.txt`, `sitemap.xml`, and `SITE` at the top
of `tools/build-project-pages.mjs`. Change it in those four and re-run the
generator.

## External dependencies

No package manager, no build step, no third-party JavaScript, and no
third-party images.

- Google Fonts: Bebas Neue, Oswald, JetBrains Mono, IBM Plex Sans Arabic

That is the whole list.

## Where the pictures came from

Every render on the site was cut out of *Portfolio 2026* — the InDesign PDF —
at full resolution with its alpha channel intact, then composed onto the
studio's own ground: a vertical gradient, a soft radial glow behind the
subject, and a contact shadow beneath it. The gradient is the same near-black
teal the page is built on, which is why the cut-outs sit in the page rather
than on it.

If a render is ever replaced, the console does this part for you. By hand, the
rule is only that both sizes exist and share a name:
`assets/work/<id>.jpg` at 1600×900 and `assets/work/<id>-sm.jpg` at 880×495.
