# Polsek Kapuas Tengah — website

Static site for Polsek Kapuas Tengah, Polres Kapuas, Polda Kalimantan Tengah. No build step: open `index.html`.

Pages: `index.html` (Beranda), `profil.html`, `layanan.html`, `berita.html`, `pencarian-orang.html`.
Shared styles and scripts: `assets/site.css`, `assets/site.js`. Header and footer are repeated in each page; edit all five when they change.

## Still placeholder / to confirm with the client
- Hero and Instagram cover photos are dummy Polri photos (`assets/hero-*.jpg`).
- News photos: save them as `assets/news-1.jpg`, `news-2.jpg`, `news-3.jpg` (order as on the page). Until then the page falls back to the analisnews.co.id originals.
- Kapolsek bio and welcome text, names of unit heads, Bhabinkamtibmas per desa, DPO / orang hilang lists.
- Polsek phone, address and service hours come from public sources (Facebook page, generic Polri hours).
- EN / Dayak Ngaju toggle only switches state; translations not written yet.
- Booking and complaint tickets are generated in the browser and sent by WhatsApp; nothing is stored until a backend (e.g. Supabase) is added. "Cek status" validates input only.
- Service guides (SKCK, SKTLK, pengaduan, SPKT) are compiled from public Polri sources; confirm with the Polsek before launch.
