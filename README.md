# AHMED NAGUIB — THE WORKSHOP

Portfolio site for **Ahmed Naguib** — 3D artist, Marseille.
No build step, no framework, no backend, no third-party JavaScript.
Open `index.html` and it runs.

Live domain: **https://naguib.art** · Hosting: **Cloudflare Pages**

> The domain is a placeholder until a real one is bought — see
> *[If the domain changes](#if-the-domain-changes)*.

---

## The idea

He began on walls in Giza with a brush and a can, taught calligraphy and
street art in Cairo, painted murals for a living, and ended up in Marseille
sculpting characters for animated film. The site is that room: **a bench
under a warm lamp.**

Everything follows from it.

- **The ground is warm charcoal**, not black — `#17140F`, with the light
  falling from the upper left across every page. The accent is **burnt clay**,
  the ink is **bone**. There is no neon anywhere.
- **Objects sit in their own pool of shade.** Every render was cut out of the
  portfolio PDF with its alpha intact and re-composed onto that bench: a
  vertical gradient, a lamp above and left, a real contact shadow beneath the
  object, and a plaster tooth over the whole frame. A flat cut-out floating on
  a gradient reads as a sticker; a shadow is what makes it an object.
- **The page carries the same tooth** — one fixed layer of fractal noise as an
  inline SVG, painted once, never repainted.
- **The type is cut, not set.** [Fraunces](https://fonts.google.com/specimen/Fraunces)
  is a variable serif with a `SOFT` axis — a face that can be modelled, which
  is why it is here — for every name and heading. Inter carries what you read
  rather than look at. Nothing is set in a monospace: a workshop is not a
  terminal.
- **His story is the design, not a section of it.** The rule under the hero
  runs 2015 → 2026 and draws itself once as the page arrives.

## The work is files, not links

This is the one structural fact everything technical follows from.

A video portfolio stores an id and asks a host for a poster: an oEmbed call
per card, an iframe per play, four third parties in the content policy.
**Nothing here is fetched from anybody.** Every render ships from
`assets/work/` in two sizes — the page loads the small one, the lightbox the
large — so a card cannot go blank because somebody else's API throttled, and
`frame-src` is `'none'`.

## How the page is ordered

A portfolio's job is to show the work, so the work is the first thing under
the headline. Everything after it answers a question the work has raised.

    HERO        the piece the portfolio opens on, and the arc of his life
    WORK        fifteen plates — one object at a time
    INDEX       everything on the bench, as a list you read
    ABOUT       who made them, education and experience
    SKILLS      eight things, with an icon each
    PROCESS     nine steps, clay to render, lighting as you read them
    SKETCHBOOK  the 2D that came before the 3D
    THE RACK    what it is made in
    CONTACT     how to reach him, and what time it is where he is

### Plates, not tiles

A grid of tiles is how you show a hundred thumbnails. He has fifteen pieces
worth looking at, so each gets a **plate**: the render at the size it was made
to be seen, and beside it the few facts that matter. They alternate sides —
and the *columns* alternate with them, so a piece is never shown at half size
just because it landed on an even row.

`hi:true` makes a piece **lead**: full width at 21:9, facts in two columns
underneath. Three of the fifteen carry it, which breaks the left-right rhythm
without flattening it.

### The index

The plates are the argument; the index is the evidence. Every piece on the
site as one typographic list, with the render following the pointer as a
floating preview — a contact sheet you read rather than scroll. Rows that
have their own page are real links; detail passes open the lightbox.

## The data

All of it lives at the top of `studio.js`:

```js
const PROJECTS = [
  {title:"Mine Wagon", id:"mine-wagon", cat:"props", year:"2024",
   prod:"Fantasy Racers", soft:"3ds Max · Substance Painter",
   desc:"A hero prop for the mine track…"},
];
```

- `id` is the piece's whole identity: `assets/work/mine-wagon.jpg` is the full
  frame, `…-sm.jpg` the one the page loads, and `/work/mine-wagon/` is its page
- `cat` must be a key of `CAT` (characters, environment, props, hardsurface)
- `prod`, `soft` and `desc` show on the plate, in the lightbox and on the page
- `ARCHIVE` holds the detail passes — turnarounds and studies, index only
- `CONCEPTS` holds the sketchbook: a title and a file name is all a sheet is
- Ordering is by hand while `AUTO_ORDER` is `false`

**There is a UI for all of this** — see *The work console* below.

## Motion

Three primitives, and the whole site is built from them. Each is a transform
or an opacity, each waits for one shared IntersectionObserver, and each takes
its delay from a custom property so a group staggers without a line of
JavaScript per child.

    .rv      rises and fades in
    .rv-cut  is uncovered from below, the way a form comes out of a block
    .rv-w    grows from nothing along its own width

Plus: the headline cut in line by line, the lamp sweeping across each plate as
it arrives, the process steps lighting in sequence, the pointer-following
preview in the index, and a cursor that opens into a ring over anything worth
a closer look. All of it stops under `prefers-reduced-motion`.

> **An element hidden by `clip-path` cannot see itself arrive.** The browser
> computes an intersection against the *clipped* box, and `.rv-cut` starts at
> `inset(0 0 102% 0)` — an empty rect, never intersecting at any threshold.
> Watching those elements directly left every section title on the site
> clipped for good. They are watched through their parent, which has a real
> box. Worth knowing before adding a fourth primitive.

> **`content-visibility: auto` was here and had to go** for the same reason: a
> skipped section has no layout, so the observer cannot see what is inside it
> and the entrance fires late or never. The images already wait for the
> viewport, which is where the weight actually is.

## Files

| File | Purpose |
|------|---------|
| `index.html` | The whole page, plus the icon sprite every page draws from |
| `studio.css` | The design system — palette, type, motion primitives, every component |
| `studio.js` | The data, and everything built from it: plates, index, sketchbook, lightbox, loader |
| `chrome.js` | Shared furniture: cursor, progress, nav state, the reveal observer, his clock |
| `assets/work/` | Every render, twice: `<id>.jpg` (1600×900) and `<id>-sm.jpg` (880×495) |
| `assets/concept/` | The sheets, same pair at 1400×1050 and 760×570 |
| `work/<slug>/` | One generated page per piece (`tools/build-project-pages.mjs`) |
| `project.css` / `project.js` | Styling and behaviour for those pages |
| `404.html` / `notfound.*` | An empty plinth |
| `studio-admin.*` | The work console |
| `functions/_middleware.js` | The edge lock on the console — username + password |
| `_headers` | Cloudflare Pages security + caching headers |
| `robots.txt` / `sitemap.xml` | SEO — `sitemap.xml` is generated, don't hand-edit |

## Project pages

Every piece gets a page at `/work/<slug>/` — a real URL you can send a studio.
Generated, never hand-written:

```
node tools/build-project-pages.mjs
```

The *Build project pages* workflow runs it on any push that touches
`studio.js` or the generator. It **wipes and rewrites the whole `work/`
directory**, so put changes in `studio.js`.

`slugOf()` is lifted out of `studio.js` rather than copied, so the href a link
renders and the folder written here cannot disagree. Structured data is an
**ImageObject** per page, sharing the home page's `@id` for the Person so
fifteen pages reinforce one entity.

Writing `desc` is the single biggest SEO win there is — a generated sentence
ranks nothing. All fifteen have one.

## The 404

An empty plinth. The rest of the site puts an object on a lit bench; this page
has the bench and the lamp and nothing on it, with four motes of dust still
turning in the light. The path that failed is written with `textContent`,
never as markup, because it is whatever a stranger typed into the address bar.

## The work console

`studio-admin.html` — arrange the work and upload renders without touching
code.

- **The pictures are the point.** Every row has **UPLOAD RENDER**: choose one
  picture and the console decodes it, scales it to the two sizes the site
  actually draws, and queues both. PUBLISH writes every queued file *before*
  it writes `studio.js`, so a plate can never be published pointing at a file
  that is not there yet.
- **It knows what is missing.** On load it asks the server, once per name,
  whether each picture is actually there. A row naming a file nobody uploaded
  turns amber and CHECK says so — the one fault a wall of thumbnails cannot
  show you, because a blank card looks like a slow one.
- Drag to reorder (which sets `AUTO_ORDER = false`), rename categories, edit
  the brief, the production, the software and the web address.
- **DATA** measures rather than estimates: pieces by category and year, the
  bytes the site actually serves, the repository's commit history as a publish
  log, and an honest gap where visitor numbers would be.

It is **behind a password**: `functions/_middleware.js` runs on Cloudflare's
edge and checks HTTP Basic auth before any byte of `studio-admin.*` is served.
Credentials come from the Pages project's `ADMIN_USER` / `ADMIN_PASS`
variables and are never in this repository; until both are set the console
answers 404 to everyone, because forgetting to set them must leave the door
shut rather than standing open.

Publishing goes through GitHub's contents API with a fine-grained key held in
that browser's `localStorage` and nowhere else. Before writing it re-reads
`studio.js` from GitHub and refuses if somebody else has saved since.

> The console keeps its own palette bridge at the top of `studio-admin.css`:
> two thousand lines of internal tooling written against the old token names,
> pointed at the new ones. The site carries no compatibility shim it does not
> need.

## Security

`_headers` carries a **Content-Security-Policy** built on `default-src 'none'`.
Because the work is local files, the allow-list is: this origin, Google Fonts,
and Cloudflare's analytics beacon. `frame-src` is `'none'` — there is nothing
left to frame.

- **No inline `<script>`, no `onclick=`.** Put JS in a `.js` file and attach
  listeners.
- Inline `style="…"` is fine — the builders write `el.style.*` constantly.
- `base-uri 'none'`, `form-action 'none'`, `object-src 'none'`,
  `frame-ancestors 'self'`.
- JSON-LD is exempt: `<script type="application/ld+json">` is a data block.
- The console is `noindex`, disallowed in `robots.txt`, and answers 401
  without the password.

## Performance

- **Two sizes, never one.** The page never loads a 1600px frame for a plate a
  few hundred pixels wide. The lightbox and the project page do.
- **Images wait for the viewport** (`loading="lazy"` past the first two).
- **Everything that moves moves on transform or opacity**, gated by one shared
  observer. The scroll listener writes one transform and one class per frame
  and forces no layout — section offsets are cached and re-measured only when
  the document changes height.
- **The grain is a static SVG**, not a canvas. It paints once.
- **No library, no build step, no third-party JavaScript.** GSAP, the audio
  engine, the mascot and the layout helper are all gone; what replaced them is
  about 500 lines of CSS and two small files.

## If the domain changes

`naguib.art` appears in `index.html` (canonical, Open Graph, Twitter, JSON-LD),
`robots.txt`, `sitemap.xml`, and `SITE` at the top of
`tools/build-project-pages.mjs`. Change those four and re-run the generator.

## External dependencies

Google Fonts: **Fraunces**, **Inter**, **IBM Plex Sans Arabic**. That is the
whole list.

## Where the pictures came from

Every render was cut out of *Portfolio 2026* — the InDesign PDF, which ships in
`assets/` — at full resolution with its alpha channel intact, then composed
onto the studio's own bench. If a render is ever replaced, the console does
this for you. By hand, the rule is only that both sizes exist and share a
name: `assets/work/<id>.jpg` at 1600×900 and `<id>-sm.jpg` at 880×495.
