/* ════════════════════════════════════════════════════════════════════════
   functions/_middleware.js — the lock on the work console.

   This runs on Cloudflare's edge, before any file is served. A password
   checked in the browser would be theatre: the page is a static file, so
   anyone could read the password straight out of it and open the console
   anyway. This one runs on the server, so an unauthenticated visitor never
   receives a single byte of studio-admin.* — not the HTML, not the script.

   The credentials live in the Pages project's environment variables, never
   in this repository. Set them under
     Workers & Pages → naguib → Settings → Variables and Secrets
   as ADMIN_USER and ADMIN_PASS (add them as **Secret**, not plaintext).

   Until both are set the console answers 404 for everyone, including you.
   That is deliberate: forgetting to set them must leave the door shut, not
   standing open.
   ════════════════════════════════════════════════════════════════════════ */

/* Everything under this prefix is the console. Nothing public lives there, so
   the guard is a prefix and not a list of exact filenames: a list has to be
   right about every spelling a server might answer to, and being wrong once
   leaves that spelling open. `/studio-admin` and `/studio-admin.html` were
   locked, but `/studio-admin/` was not — Pages answers that too, and it walked
   straight past a name-by-name guard. A prefix cannot be short by one name. */
const GUARDED = /^\/studio-admin/i;
const REALM = 'NAGUIB STUDIO';

/* The path is compared after it has been unpicked, because the same file can
   be asked for under more than one spelling. `%2F` and a doubled slash and a
   backslash all reach the same asset, so they are all folded down to the one
   form the guard tests. A path that will not decode is treated as guarded: an
   unreadable request is never a reason to open the door. */
function isConsole(pathname) {
  let p = pathname;
  for (let i = 0; i < 3; i++) {
    let once;
    try { once = decodeURIComponent(p); } catch { return true; }
    if (once === p) break;
    p = once;
  }
  p = p.replace(/\\/g, '/').replace(/\/{2,}/g, '/');
  return GUARDED.test(p) || GUARDED.test(pathname);
}

/* The console publishes by calling the GitHub contents API, so it needs one
   origin the rest of the site must never be allowed to reach. This is the
   site policy from _headers with api.github.com added to connect-src and
   nothing else loosened — no 'unsafe-eval', no wildcard, no extra script
   source. It is applied further down, only on the guarded paths, so the
   widening cannot leak onto a page a visitor can open. */
const CONSOLE_CSP = [
  "default-src 'none'",
  "script-src 'self' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data:",
  "connect-src 'self' https://api.github.com",
  "media-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

/* Compare in constant time so the response can't be timed character by
   character. Length is compared first and leaks only the length. */
function same(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const hidden = () => new Response('Not found', {
  status: 404,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
});

const askForPassword = () => new Response('Authentication required', {
  status: 401,
  headers: {
    /* the browser's own username/password dialog */
    'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  },
});

export const onRequest = async ({ request, next, env }) => {
  const path = new URL(request.url).pathname;
  if (!isConsole(path)) return next();             /* the site itself, untouched */

  const user = env.ADMIN_USER, pass = env.ADMIN_PASS;
  if (!user || !pass) return hidden();             /* fail shut, never open */

  const header = request.headers.get('Authorization') || '';
  const [scheme, encoded] = header.split(' ');
  if (scheme !== 'Basic' || !encoded) return askForPassword();

  /* atob yields one character per byte, so a password with an accent or an
     Arabic letter would arrive as its raw UTF-8 bytes and never match the
     variable it was compared against. Decode the bytes properly. */
  let decoded;
  try {
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
    decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch { return askForPassword(); }
  const cut = decoded.indexOf(':');
  if (cut < 0) return askForPassword();

  /* both comparisons always run, so a wrong username and a wrong password
     take the same time and neither tells the caller which one was wrong */
  const okUser = same(decoded.slice(0, cut), user);
  const okPass = same(decoded.slice(cut + 1), pass);
  if (!(okUser && okPass)) return askForPassword();

  /* headers off a served asset are immutable, so copy the response to edit it */
  const upstream = await next();
  const res = new Response(upstream.body, upstream);
  res.headers.set('Cache-Control', 'no-store');
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  /* set, not appended: two policies both apply and the strict one from
     _headers would veto the GitHub call this page exists to make */
  res.headers.set('Content-Security-Policy', CONSOLE_CSP);
  res.headers.set('X-Frame-Options', 'DENY');
  return res;
};
