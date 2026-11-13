// Routes requests by hostname, then serves the static files.
//   polsekkapuastengah.id        -> public website
//   www.polsekkapuastengah.id    -> redirects to polsekkapuastengah.id
//   admin.polsekkapuastengah.id  -> Konsol (admin.html) at the root
// Any other host (e.g. *.workers.dev) is served as-is, for testing.

const MAIN = 'polsekkapuastengah.id';
const ADMIN = 'admin.' + MAIN;
const PUBLIC_PAGES = ['/index', '/profil', '/layanan', '/berita', '/pencarian-orang'];

// Pages must never be served stale: each page names its scripts and styles with a content
// hash (?v=...), so a fresh page always pulls the current code. Hashed assets can be cached long.
async function serve(env, request) {
  const res = await env.ASSETS.fetch(request);
  const u = new URL(request.url);
  const type = res.headers.get('content-type') || '';
  if (res.status !== 200) return res;
  const out = new Response(res.body, res);
  if (type.includes('text/html')) out.headers.set('Cache-Control', 'no-cache, must-revalidate');
  else if (u.searchParams.has('v') && /\.(js|css)$/.test(u.pathname)) out.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  return out;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const host = url.hostname;

    // www -> bare domain
    if (host === 'www.' + MAIN) {
      url.hostname = MAIN;
      return Response.redirect(url.toString(), 301);
    }

    if (host === ADMIN) {
      // Konsol opens directly at admin.polsekkapuastengah.id/
      if (url.pathname === '/' || url.pathname === '/index.html') {
        url.pathname = '/admin';
        return serve(env, new Request(url, request));
      }
      // Public pages opened on admin. go back to the main site
      const page = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      if (PUBLIC_PAGES.includes(page)) {
        url.hostname = MAIN;
        return Response.redirect(url.toString(), 301);
      }
      return serve(env, request);
    }

    if (host === MAIN) {
      // Old Konsol address on the main site -> admin subdomain
      if (url.pathname === '/admin' || url.pathname === '/admin.html') {
        url.hostname = ADMIN;
        url.pathname = '/';
        return Response.redirect(url.toString(), 301);
      }
    }

    return serve(env, request);
  },
};
