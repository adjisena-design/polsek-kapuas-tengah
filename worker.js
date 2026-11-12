// Routes requests by hostname, then serves the static files.
//   polsekkapuastengah.id        -> public website
//   www.polsekkapuastengah.id    -> redirects to polsekkapuastengah.id
//   admin.polsekkapuastengah.id  -> Konsol (admin.html) at the root
// Any other host (e.g. *.workers.dev) is served as-is, for testing.

const MAIN = 'polsekkapuastengah.id';
const ADMIN = 'admin.' + MAIN;
const PUBLIC_PAGES = ['/index', '/profil', '/layanan', '/berita', '/pencarian-orang'];

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
        return env.ASSETS.fetch(new Request(url, request));
      }
      // Public pages opened on admin. go back to the main site
      const page = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
      if (PUBLIC_PAGES.includes(page)) {
        url.hostname = MAIN;
        return Response.redirect(url.toString(), 301);
      }
      return env.ASSETS.fetch(request);
    }

    if (host === MAIN) {
      // Old Konsol address on the main site -> admin subdomain
      if (url.pathname === '/admin' || url.pathname === '/admin.html') {
        url.hostname = ADMIN;
        url.pathname = '/';
        return Response.redirect(url.toString(), 301);
      }
    }

    return env.ASSETS.fetch(request);
  },
};
