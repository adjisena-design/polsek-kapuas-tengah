# Polsek Kapuas Tengah — website

Static site for Polsek Kapuas Tengah, Polres Kapuas, Polda Kalimantan Tengah. No build step: open `index.html`.

Pages: `index.html` (Beranda), `profil.html`, `layanan.html`, `berita.html`, `pencarian-orang.html`, and the console `admin.html` (not linked, `noindex`).
Shared styles and scripts: `assets/site.css`, `assets/site.js`. Header and footer are repeated in each page; edit all five when they change.

## Still placeholder / to confirm with the client
- Hero and Instagram cover photos are dummy Polri photos (`assets/hero-*.jpg`).
- News photos are hotlinked from analisnews.co.id; upload proper ones from the console (Berita & imbauan → Ubah → Foto).
- Kapolsek bio and welcome text, names of unit heads, Bhabinkamtibmas per desa, DPO / orang hilang lists.
- Polsek phone, address and service hours come from public sources (Facebook page, generic Polri hours).
- EN / Dayak Ngaju toggle only switches state; translations not written yet.
- Service guides (SKCK, SKTLK, pengaduan, SPKT) are compiled from public Polri sources; confirm with the Polsek before launch.

## Backend (Supabase project `zybfcsdhpoqalmkvmhtu`)
- The site talks to Supabase with the publishable key in `assets/sb.js` (public by design). Tables are closed by RLS; everything goes through database functions that check input and the console session.
- Public: `book`, `booked_slots`, `report`, `ticket_status`; read-only `posts`, `wanted`, `personnel`, `sync_runs`. Complaint photos/videos upload to the private `laporan` bucket (max 5 files, 50 MB each).
- Console `admin.html`: login with an access code only (no email). Roles: Owner, Kapolsek, Staf. Everyone has the same access except Log and Akses (Owner and Kapolsek). Every row has Hapus; deleting a complaint also deletes its files.
- Access codes: Owner can create, regenerate, revoke and delete Kapolsek and Staf codes; Kapolsek can do it for Staf and regenerate their own. Codes are stored hashed and shown once. 8 wrong tries lock the login for 15 minutes.
- Lost Owner code: run `select app.reset_owner_code();` in the Supabase SQL Editor. It prints a new code and ends the old Owner sessions.
- Booking slots: Mon–Fri 08.00, 09.00, 10.00, 11.00, 13.00, 14.00 WIB (no 12.00, lunch), from tomorrow up to 60 days, one booking per slot.
- DPO: edge function `dpo-sync` copies Pusiknas Polri (JSON list) and Kejati Kalteng (HTML) every Monday 03.17 WIB (pg_cron). A failed or partial fetch keeps the last good copy. Entries removed at the source are removed here. "Sinkron sekarang" in the Dasbor runs it on demand (at most once an hour).
- Edge function `admin-files`: signed links for complaint attachments, photo uploads for the site (`media` bucket), and deletes with file cleanup.
- Function sources: `supabase/functions/`. Database schema and functions live in the project migrations (Supabase dashboard → Database → Migrations).
