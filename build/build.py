# Site generator: content.json (settings, hero, services, villages, page text) -> static HTML + assets/i18n.js.
# Run: python3 build/build.py   (build/fetch.py refreshes content.json from Supabase first; the Publish action does both)
import re, html, os, json
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
ADDR = 'Jl. Damang Raban No. 01 RT 002, Desa Pujon, Kec. Kapuas Tengah, Kab. Kapuas, Kalimantan Tengah 73555'
DIR = 'https://www.google.com/maps/dir/?api=1&destination=Polsek+Kapuas+Tengah,+Jl.+Damang+Raban+No.+01,+Pujon,+Kapuas,+Kalimantan+Tengah'
WA = 'https://wa.me/6285315515282'
B = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(B, 'content.json')))
S = C['settings']
# the templates below are written with these default values; settings replace them in every page at write time
DEFAULTS = {'0853 1551 5282': S['wa_display'], '6285315515282': S['wa'], 'https://www.instagram.com/polsek.kapuas.tengah/': S['instagram'],
            '@polsek.kapuas.tengah': S['instagram_handle'], 'https://www.facebook.com/Polsekkapuastengah01/': S['facebook'], ADDR: S['address'], DIR: S['maps']}
X = lambda o, k='id': html.escape((o or {}).get(k) or '')
# page text edited in the console: rows keyed by the original Indonesian phrase; changed rows replace that phrase on every page
OV = {t['key']: t['id'] for t in C.get('texts', []) if t.get('id') and t['id'] != t['key']}
ATTR_RE = re.compile(r'((?:placeholder|aria-label|alt|title|data-label)=")([^"]*)(")')
def texts(out):
    if not OV: return out
    def node(t):
        k = html.unescape(t.strip())
        return t.replace(t.strip(), html.escape(OV[k], quote=False)) if k in OV else t
    out = re.sub(r'(?<=>)([^<]+)(?=<)', lambda m: node(m.group(1)), out)
    return ATTR_RE.sub(lambda m: m.group(1) + (html.escape(OV[html.unescape(m.group(2))]) if html.unescape(m.group(2)) in OV else m.group(2)) + m.group(3), out)

ICON = {
 'search': '<path d="M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4M8 11h6"/>', 'doc': '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>',
 'chat': '<path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5"/>', 'shield': '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4"/>',
 'flag': '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', 'calendar': '<path d="M4 6h16v14H4zM4 10h16M9 3v4M15 3v4"/>', 'users': '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21a7 7 0 0 1 14 0M17 3a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>',
}
ICO = {
 'phone': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/></svg>',
 'wa': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l1.4-4.2A8 8 0 1 1 8.4 19z"/><path d="M9.5 9.5c.3 1.8 2.2 3.8 4 4.2l1-1.2 1.8.8-.4 1.6c-3 .3-6.4-3-6.2-6.2l1.6-.4.8 1.8z"/></svg>',
 'pin': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
 'user': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8" r="4.5"/><path d="M3 22c0-5 4-8 9-8s9 3 9 8z"/></svg>',
}
NAV = [('index.html', 'Beranda'), ('profil.html', 'Profil'), ('layanan.html', 'Layanan'), ('berita.html', 'Berita dan imbauan'), ('pencarian-orang.html', 'Pencarian orang'), ('index.html#wilayah', 'Peta wilayah'), ('index.html#kontak', 'Kontak')]

def head(title, desc, pre=''):
    return f'''<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="assets/polsek-kapuas-tengah.webp">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Red+Hat+Display:wght@700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/site.css?v=9">{pre}
</head>
<body>
'''

def header(active):
    links = '\n'.join(f'<a href="{h}"{" aria-current=\"page\"" if l == active else ""}>{l}</a>' for h, l in NAV)
    return f'''<div class="alert"><div class="wrap">
<span><span class="full">Keadaan darurat? Hubungi Call Center Polri 110, gratis 24 jam</span><span class="short">Keadaan darurat?</span></span>
<a href="tel:110">Telepon 110</a>
</div></div>
<header>
<div class="wrap hd">
<a class="brand" href="index.html">
<img src="assets/polri.webp" alt="Lambang Polri" width="52" height="50">
<img src="assets/polsek-kapuas-tengah.webp" alt="Lambang Polsek Kapuas Tengah" width="44" height="50">
<span class="sep"></span>
<span><b class="display">POLSEK KAPUAS TENGAH</b><small>Polres Kapuas · Polda Kalimantan Tengah</small></span>
</a>
<nav class="main" id="nav" aria-label="Menu utama">
{links}
<div class="lang lang-m" role="group" aria-label="Bahasa"><button type="button" data-lang="id" aria-pressed="true">ID</button><button type="button" data-lang="en" aria-pressed="false">EN</button><button type="button" data-lang="nij" aria-pressed="false">NGAJU</button></div>
</nav>
<div class="tools">
<div class="lang" role="group" aria-label="Bahasa">
<button type="button" data-lang="id" aria-pressed="true">ID</button>
<button type="button" data-lang="en" aria-pressed="false">EN</button>
<button type="button" data-lang="nij" aria-pressed="false" title="Bahasa Dayak Ngaju">NGAJU</button>
</div>
<button class="menu-btn" type="button" aria-label="Buka menu" aria-expanded="false" aria-controls="nav"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FAF8F3" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
</div>
</div>
<div class="stripe" aria-hidden="true"><span></span><span style="width:28px"></span><span style="width:18px"></span><span style="width:11px"></span><span style="width:6px"></span></div>
</header>
'''

def call_boxes(short=False):
    return f'''<a class="call call-110" href="tel:110" aria-label="Telepon 110, darurat, gratis 24 jam">
<span style="display:flex;align-items:center;gap:18px"><span class="num display">110</span><span><span class="lbl">Darurat</span><small>{"Gratis, 24 jam" if short else "Call Center Polri, gratis 24 jam"}</small></span></span>
<span class="ico">{ICO["phone"]}</span>
</a>
<a class="call call-wa" href="{WA}" target="_blank" rel="noopener" aria-label="Chat WhatsApp Polsek 0853 1551 5282">
<span><span class="lbl">WhatsApp Polsek</span><span class="wa">0853 1551 5282</span><small>Informasi dan pelayanan</small></span>
<span class="ico">{ICO["wa"]}</span>
</a>'''

FOOTER = f'''<footer>
<div class="wrap">
<div class="top">
<div class="id">
<div class="logos">
<img src="assets/polri.webp" alt="Lambang Polri" loading="lazy">
<img src="assets/polda-kalteng.webp" alt="Lambang Polda Kalimantan Tengah" loading="lazy">
<img src="assets/polres-kapuas.webp" alt="Lambang Polres Kapuas" loading="lazy">
<img src="assets/polsek-kapuas-tengah.webp" alt="Lambang Polsek Kapuas Tengah" loading="lazy">
</div>
<b class="display" style="font-size:20px;color:var(--paper);letter-spacing:.02em">POLSEK KAPUAS TENGAH</b>
<a href="{DIR}" target="_blank" rel="noopener" style="font-size:14px">{ADDR}</a>
<div class="social"><a href="https://www.instagram.com/polsek.kapuas.tengah/" target="_blank" rel="noopener">Instagram</a><a href="https://www.facebook.com/Polsekkapuastengah01/" target="_blank" rel="noopener">Facebook</a></div>
<span style="font-size:13px;color:var(--gold);letter-spacing:.1em;font-weight:700">RASTRA SEWAKOTTAMA</span>
</div>
<nav aria-label="Tautan footer">{"".join(f'<a href="{h}">{l}</a>' for h, l in NAV[1:])}</nav>
</div>
<div class="bottom"><span>© 2026 Polsek Kapuas Tengah, Polres Kapuas</span><span>Darurat: 110 · WhatsApp: 0853 1551 5282</span></div>
</div>
</footer>
'''

SV = sorted([x for x in C['services'] if x.get('active')], key=lambda x: x['sort'])
OPT_LAYANAN = [x['name']['id'] for x in SV if x.get('bookable')]
OPT_KAT = ['Pertanyaan layanan', 'Tindak pidana (pencurian, penipuan, penganiayaan)', 'Kekerasan terhadap perempuan atau anak', 'Gangguan kamtibmas atau konflik warga', 'Narkoba', 'Kebakaran hutan dan lahan', 'Orang hilang', 'Pelayanan atau perilaku petugas', 'Lainnya']
opts = lambda xs: '<option value="">Pilih…</option>' + ''.join(f'<option value="{html.escape(x)}">{html.escape(x)}</option>' for x in xs)
FORM_DLG = f'''<dialog class="sheet" id="form-dlg" aria-label="Formulir">
<div class="top"><b>FORMULIR</b><button class="x" type="button" aria-label="Tutup">×</button></div>
<div class="body">
<form class="form" novalidate>
<div data-mode="book" class="form">
<p style="color:var(--muted)">Pesan jadwal datang ke Mako Polsek agar tidak menunggu lama. Anda akan menerima nomor tiket.</p>
<label for="f-layanan">Layanan</label><select id="f-layanan" name="layanan" required>{opts(OPT_LAYANAN)}</select>
<div class="two"><div class="form"><label for="f-nama">Nama lengkap</label><input id="f-nama" name="nama" autocomplete="name" required></div>
<div class="form"><label for="f-hp">Nomor HP (WhatsApp)</label><input id="f-hp" name="hp" type="tel" inputmode="tel" autocomplete="tel" required placeholder="0812 3456 7890"></div></div>
<div class="two"><div class="form"><label for="f-tgl">Tanggal kunjungan</label><input id="f-tgl" name="tanggal" type="date" required></div>
<div class="form"><label for="f-jam">Jam</label><select id="f-jam" name="jam">{''.join(f'<option value="{h:02d}:00">{h:02d}.00 WIB</option>' for h in (8, 9, 10, 11, 13, 14))}</select></div></div>
<label for="f-cat">Catatan (opsional)</label><textarea id="f-cat" name="catatan" style="min-height:80px"></textarea>
</div>
<div data-mode="ask" class="form">
<p style="color:var(--muted)">Sampaikan laporan, aspirasi, atau pertanyaan. Identitas boleh dikosongkan, tetapi cantumkan nomor HP jika ingin dihubungi kembali. Untuk keadaan darurat, hubungi 110.</p>
<label for="f-kat">Kategori</label><select id="f-kat" name="kategori" required>{opts(OPT_KAT)}</select>
<label for="f-isi">Ceritakan apa yang terjadi atau yang ingin ditanyakan</label><textarea id="f-isi" name="isi" required placeholder="Apa, kapan, di mana, siapa yang terlibat"></textarea>
<label for="f-desa">Desa (opsional)</label><input id="f-desa" name="desa">
<div class="two"><div class="form"><label for="f-nama2">Nama (opsional)</label><input id="f-nama2" name="nama" autocomplete="name"></div>
<div class="form"><label for="f-hp2">Nomor HP (opsional)</label><input id="f-hp2" name="hp" type="tel" inputmode="tel" autocomplete="tel"></div></div>
<label for="f-file">Foto atau video pendukung (opsional, maks. 5 berkas, 50 MB per berkas)</label><input id="f-file" name="files" type="file" accept="image/*,video/*" multiple>
</div>
<p class="err" role="alert"></p>
<button class="btn btn-gold" type="submit">Dapatkan nomor tiket</button>
</form>
<div class="result" hidden>
<div class="ticket"><span style="font-size:13px;font-weight:700;color:#8A6A1E">NOMOR TIKET ANDA</span><span class="no"></span><span class="sum" style="font-size:14px;color:var(--muted)"></span></div>
<p style="margin:16px 0;color:var(--muted)">Data Anda sudah tercatat di sistem Polsek dengan status <b>diterima</b>. Simpan nomor tiket ini untuk cek status. Anda juga bisa mengabari petugas lewat WhatsApp.</p>
<a class="btn send" style="background:var(--green);color:#fff" target="_blank" rel="noopener" href="#">Kabari lewat WhatsApp (opsional)</a>
</div>
</div>
</dialog>
'''

def ctas(layanan, kategori='Pertanyaan layanan'):
    return f'''<div class="ctas">
<button class="cta book" type="button" data-form="book" data-layanan="{layanan}"><b>Booking kunjungan</b><span>Pilih hari dan jam datang ke Polsek, dapatkan nomor tiket</span></button>
<button class="cta ask" type="button" data-form="ask" data-kategori="{kategori}"><b>Kirim pertanyaan atau pengaduan</b><span>Isi formulir online, dapatkan nomor tiket</span></button>
<a class="cta wa" href="{WA}" target="_blank" rel="noopener"><b>Chat WhatsApp Polsek</b><span>Untuk pertanyaan cepat</span></a>
</div>'''

def svc_html(v, cta=True):
    def lis(xs, tag): return f'<{tag}>' + ''.join(f'<li>{X(i)}</li>' for i in xs if i.get('id')) + f'</{tag}>'
    def sec(x):
        if x['type'] == 'cards':
            docs = ''.join(f'<details class="doc"><summary>{X(c["title"])}</summary>{lis(c["items"], "ul")}</details>' for c in x.get('cards', []))
            return f'<details class="panel wide" open><summary>{X(x["title"])}</summary><div class="docs">{docs}</div></details>'
        return f'<details class="panel" open><summary>{X(x["title"])}</summary>{lis(x["items"], "ol" if x["type"] == "steps" else "ul")}</details>'
    secs = v.get('sections', [])
    small = ''.join(sec(x) for x in secs if x['type'] != 'cards'); wide = ''.join(sec(x) for x in secs if x['type'] == 'cards')
    body = f'<h2 class="display">{X(v["title"])}</h2>'
    if v['intro'].get('id'): body += f'<p class="what">{X(v["intro"])}</p>'
    if v['note'].get('id'): body += f'<div class="note">{X(v["note"])}</div>'
    if small: body += f'<div class="cols">{small}</div>'
    body += wide
    if v['warning'].get('id'): body += f'<div class="note">{X(v["warning"])}</div>'
    if v['source'].get('id'): body += f'<p class="src">{X(v["source"])}</p>'
    nxt = f'\n<h3>Langkah berikutnya</h3>\n{ctas(v["name"]["id"] if v.get("bookable") else "")}' if cta else ''
    return f'<div class="svc">{body}{nxt}</div>'

SCRIPT = '<script src="assets/sb.js?v=5" defer></script>\n<script src="assets/i18n.js?v=1" defer></script>\n<script src="assets/site.js?v=9" defer></script>\n</body>\n</html>\n'

def page(fn, title, desc, active, body, pre='', svc_tpl=False):
    tpl = ''.join(f'<template id="svc-{v["slug"]}">{svc_html(v)}</template>\n' for v in SV) if svc_tpl else ''
    sd = '<dialog class="sheet" id="svc-dlg" aria-label="Detail layanan"><div class="top"><b>LAYANAN</b><button class="x" type="button" aria-label="Tutup">×</button></div><div class="body"></div></dialog>\n' if svc_tpl else ''
    out = head(title, desc, pre) + header(active) + '<main>\n' + body + '\n</main>\n' + FOOTER + FORM_DLG + sd + tpl + SCRIPT
    for a, b in DEFAULTS.items(): out = out.replace(a, html.escape(b, quote=False))
    out = out.replace('<body>', f'<body data-wa="{S["wa"]}">', 1)
    open(R + fn, 'w').write(texts(out))


# ---------- Beranda: patch the existing main ----------
m = open(R + 'build/home.html').read()
HERO = sorted([h for h in C['hero'] if h.get('active')], key=lambda h: h['sort'])
bars = '<div class="bars" aria-hidden="true"><span style="width:140px"></span><span style="width:24px"></span><span style="width:16px"></span><span style="width:10px"></span><span style="width:5px"></span></div>'
def slide(i, h):
    on = ' on' if i == 0 else ''
    if h['kind'] == 'dpo':
        return f'''<div class="slide sl-dpo{on}">
<div class="glow-b" aria-hidden="true"></div><div class="glow-r" aria-hidden="true"></div><div class="lightbar" aria-hidden="true"><span></span><span></span></div>
<div class="txt"><span class="eyebrow">{X(h['eyebrow'])}</span>
<h2 class="display">{X(h['title'])}</h2>
<div class="dpo-cards">
<a class="dc red" href="pencarian-orang.html#dpo"><img src="assets/polri.webp" alt="" width="64" height="64"><b>Daftar Pencarian Orang</b><span>Lihat DPO →</span></a>
<a class="dc yel" href="pencarian-orang.html#hilang"><img src="assets/polri.webp" alt="" width="64" height="64"><b>Lihat orang hilang</b><span>Bantu pertemukan keluarga →</span></a>
</div></div>
</div>'''
    href = h.get('href') or '#'
    go = (f'<a class="go" href="#" data-form="book">' if href == '#booking' else f'<a class="go" href="{html.escape(href)}">') + f'{X(h["cta"])} <span aria-hidden="true">→</span></a>' if h['cta'].get('id') else ''
    tag = 'h1' if i == 0 else 'h2'
    return f'''<div class="slide{on}">
<img src="{html.escape(h['image_url'] or '')}" alt="{X(h['alt'])}" width="1920" height="1280"{"" if i == 0 else " loading=\"lazy\""}>
<div class="txt"><span class="eyebrow">{X(h['eyebrow'])}</span>
<{tag} class="display">{X(h['title'])}</{tag}>
{bars}
<p>{X(h['body'])}</p>
{go}</div>
</div>'''
slides_html = [slide(i, h) for i, h in enumerate(HERO)]
m = m.replace('{{SLIDES}}', '\n'.join(slides_html))
m = m.replace('stroke="#2B2118"', 'stroke="currentColor"')
m = m.replace('{{DOTS}}', '<div class="dots">' + ''.join(f'<button type="button" aria-label="Slide {i+1}"{" aria-current=\"true\"" if i == 0 else ""}></button>' for i in range(len(HERO))) + '</div>')

# service cards -> buttons that open the detail sheet
m = m.replace('{{CARDS}}', '<div class="cards">\n' + '\n'.join(f'<button class="card" type="button" data-svc="{v["slug"]}" data-label="{X(v["name"]).upper()}"><span class="i"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{ICON.get(v.get("icon"), ICON["doc"])}</svg></span><h3 class="display">{X(v["name"])}</h3><p>{X(v["card"])}</p><span class="more">{X(v["cta"])}</span></button>' for v in SV) + '\n</div>')
VIL = sorted(C['villages'], key=lambda v: v['sort'])
m = m.replace('{{VILLAGES}}', '<ul class="desa">\n' + ''.join(f'<li>{html.escape(v["name"])}<span>{html.escape(v.get("bhabin") or "[Bhabinkamtibmas]")}</span></li>' for v in VIL) + '\n</ul>').replace('{{VCOUNT}}', str(len(VIL)))
R2 = [
 ('<a href="#" style="font-size:14px;font-weight:700">Semua layanan →</a>', '<a href="layanan.html" style="font-size:14px;font-weight:700">Semua layanan →</a>'),
 ('<a href="#">Izin keramaian</a><a href="#">Laporan polisi</a>', '<a href="layanan.html#pengaduan">Laporan polisi</a>'),
 ('<a class="btn" href="#berita">Baca imbauan →</a>', '<a class="btn" href="berita.html#imbauan">Baca imbauan →</a>'),
 ('<a href="#">Profil Polsek</a><a href="#">Struktur organisasi</a><a href="#">Tugas dan fungsi</a>', '<a href="profil.html">Profil Polsek</a><a href="profil.html#struktur">Struktur organisasi</a><a href="profil.html#tugas">Tugas dan fungsi</a>'),
 ('<!-- shortcut: no backend yet, the form only checks required fields; wire to Supabase when the ticket table exists -->\n', ''),
 ('placeholder="PKT-2026-000123"', 'placeholder="PG-261107-ABCDE"'),
 ('<div class="grid3">', '<div class="grid3" data-feed="home">'),
 ('<a href="#" style="font-size:14px;font-weight:700">Semua berita →</a>', '<a href="berita.html" style="font-size:14px;font-weight:700">Semua berita →</a>'),
 ('<div><a class="btn btn-gold" href="#">Buat pengaduan</a></div>', '<div><button class="btn btn-gold" type="button" data-form="ask">Buat pengaduan</button></div>'),
 ('<a class="notice red" href="#">', '<a class="notice red" href="pencarian-orang.html#dpo">'),
 ('<a class="notice yel" href="#">', '<a class="notice yel" href="pencarian-orang.html#hilang">'),
 ('<a href="#layanan"><b>Ajukan', '<a href="#" data-form="book"><b>Ajukan'),
 ('<span>SKCK dan surat kehilangan</span>', '<span>Booking kunjungan ke Polsek</span>'),
 ('<a href="#pengaduan"><b>Lapor', '<a href="#" data-form="ask"><b>Lapor'),
 ('<div class="box"><span>Alamat Mako</span><b>' + ADDR + '</b></div>',
  f'<a class="box" href="{DIR}" target="_blank" rel="noopener" style="text-decoration:none;color:var(--ink);display:flex;flex-direction:column;gap:6px"><span>Alamat Mako</span><b>{ADDR}</b><b style="color:var(--brown);display:inline-flex;gap:8px;align-items:center">{ICO["pin"]} Buka petunjuk arah ↗</b></a>'),
]
for a, b in R2:
    if a not in m: raise SystemExit('missing: ' + a[:60])
    m = m.replace(a, b)
page('index.html', 'Polsek Kapuas Tengah — Polres Kapuas, Polda Kalimantan Tengah',
     'Pusat informasi dan layanan digital Polsek Kapuas Tengah: surat kehilangan, izin keramaian, SPKT, pengaduan masyarakat, dan kontak darurat 110.',
     'Beranda', m, pre=''.join(f'\n<link rel="preload" as="image" href="{html.escape(h["image_url"])}">' for h in HERO[:1] if h['kind'] == 'photo'), svc_tpl=True)

# ---------- Profil ----------
def person(rank, name, role, img=None):
    ph = f'<img src="{img}" alt="{name}" loading="lazy">' if img else ICO['user']
    return f'<article class="person"><div class="ph">{ph}</div><div class="t"><small>{rank}</small><b>{name}</b><span>{role}</span></div></article>'
UNITS = [('Ka SPKT', 'Pelayanan laporan dan pengaduan, 24 jam'), ('Kanit Intelkam', 'Intelijen keamanan dan perizinan keramaian'), ('Kanit Reskrim', 'Penyelidikan dan penyidikan tindak pidana'),
         ('Kanit Binmas', 'Pembinaan masyarakat dan Bhabinkamtibmas'), ('Kanit Samapta', 'Patroli, penjagaan, dan pengamanan kegiatan'), ('Kasihumas', 'Hubungan masyarakat dan informasi publik'),
         ('Kasium', 'Urusan umum, administrasi, dan logistik'), ('Kasiwas', 'Pengawasan internal')]
profil = f'''<section class="phero"><div class="wrap">
<p class="crumb"><a href="index.html">Beranda</a> / Profil</p>
<span class="eyebrow">Profil Polsek</span>
<h1 class="display">Melindungi, mengayomi, dan melayani masyarakat Kapuas Tengah</h1>
<p>Kepolisian Sektor Kapuas Tengah adalah unsur pelaksana Polres Kapuas, Polda Kalimantan Tengah, yang bertanggung jawab atas keamanan dan ketertiban di Kecamatan Kapuas Tengah, dengan Mako di Desa Pujon.</p>
</div></section>
<section style="padding:0 0 56px"><div class="wrap">
<div class="stats4"><div><b>13</b><span>Desa binaan</span></div><div><b>± 1.962 km²</b><span>Luas wilayah hukum</span></div><div><b>24 jam</b><span>Layanan SPKT</span></div><div><b>110</b><span>Call Center Polri, gratis</span></div></div>
</div></section>
<section id="tugas" style="background:var(--khaki)"><div class="wrap">
<span class="eyebrow">Tugas pokok</span>
<h2 class="h2" style="margin:6px 0 24px">Tiga tugas pokok Polri</h2>
<ol class="num-list"><li>Memelihara keamanan dan ketertiban masyarakat</li><li>Menegakkan hukum</li><li>Memberikan perlindungan, pengayoman, dan pelayanan kepada masyarakat</li></ol>
<p class="note" style="margin-top:16px">Berdasarkan Pasal 13 Undang-Undang Nomor 2 Tahun 2002 tentang Kepolisian Negara Republik Indonesia.</p>
</div></section>
<section id="struktur"><div class="wrap" style="display:flex;flex-direction:column;gap:28px">
<div><span class="eyebrow">Pimpinan dan personel</span><h2 class="h2">Struktur organisasi</h2></div>
<article class="lead" data-grp="kapolsek">
<img src="assets/kapolsek.webp" alt="Iptu Aldrin Oktavianto Renaldy" width="520" height="450">
<div class="t"><span class="rank">KAPOLSEK KAPUAS TENGAH</span>
<h3 class="display" style="font-size:clamp(22px,2.6vw,30px)">Iptu Aldrin Oktavianto Renaldy, S.Tr.K., S.I.K., M.H.</h3>
<p style="color:var(--muted)">[Profil singkat Kapolsek: riwayat pendidikan, penugasan sebelumnya, dan fokus kepemimpinan. Menjabat sebagai Kapolsek Kapuas Tengah sejak akhir Oktober 2026.]</p></div>
</article>
<h3 style="font-size:18px">Wakil pimpinan</h3>
<div class="people" data-grp="wakil">{person("Wakapolsek", "Iptu Achmad Saepudin", "Wakil Kepala Polsek Kapuas Tengah")}</div>
<h3 style="font-size:18px">Kepala unit dan seksi</h3>
<div class="people" data-grp="unit">{"".join(person(r, "[Nama dan pangkat]", d) for r, d in UNITS)}</div>
<h3 style="font-size:18px">Bhabinkamtibmas</h3>
<div class="people" data-grp="bhabin">{person("Bhabinkamtibmas", "Bripka Hansen S.B.", "[Desa binaan]")}{person("Bhabinkamtibmas", "Aipda Fordiansyah", "[Desa binaan]")}{person("Bhabinkamtibmas", "[Nama dan pangkat]", "[Desa binaan]")}</div>
<p class="note">Susunan jabatan mengikuti pola organisasi Polsek. Nama personel selain Kapolsek, Wakapolsek, dan dua Bhabinkamtibmas menunggu data resmi Polsek.</p>
</div></section>
<section style="background:var(--ink);color:var(--paper)"><div class="wrap" style="display:flex;flex-wrap:wrap;gap:24px;align-items:center;justify-content:space-between">
<div style="max-width:620px"><h2 class="h2">Ada yang bisa kami bantu?</h2><p style="color:var(--line)">Booking kunjungan, kirim pengaduan, atau hubungi kami langsung.</p></div>
<div style="display:flex;flex-wrap:wrap;gap:10px"><button class="btn btn-gold" type="button" data-form="book">Booking kunjungan</button><a class="btn" style="background:var(--green);color:#fff" href="{WA}" target="_blank" rel="noopener">WhatsApp Polsek</a></div>
</div></section>'''
page('profil.html', 'Profil — Polsek Kapuas Tengah', 'Profil, tugas pokok, dan struktur organisasi Polsek Kapuas Tengah.', 'Profil', profil)

# ---------- Layanan ----------
layanan = f'''<section class="phero"><div class="wrap">
<p class="crumb"><a href="index.html">Beranda</a> / Layanan</p>
<span class="eyebrow">Layanan kepolisian</span>
<h1 class="display">Urus keperluan Anda tanpa bolak-balik</h1>
<p>Pilih layanan, siapkan berkas dari rumah, lalu booking jam kunjungan ke Mako Polsek.</p>
</div></section>
<div class="svc-tabs" role="tablist" aria-label="Pilih layanan"><div class="wrap">{"".join(f'<button type="button" role="tab" data-tab="{v["slug"]}" data-layanan="{X(v["name"]) if v.get("bookable") else ""}" aria-selected="{str(i==0).lower()}">{X(v["name"])}</button>' for i, v in enumerate(SV))}</div></div>
<section style="padding:40px 0 24px"><div class="wrap">
{"".join(f'<div class="svc-panel" id="{v["slug"]}" role="tabpanel"{"" if i == 0 else " hidden"}>{svc_html(v, cta=False)}</div>' for i, v in enumerate(SV))}
</div></section>
<section style="background:var(--sand);padding:40px 0 56px"><div class="wrap next-steps">
<h2 class="h2" style="font-size:26px;margin-bottom:16px">Langkah berikutnya</h2>
{ctas(OPT_LAYANAN[0] if OPT_LAYANAN else '')}
</div></section>'''
page('layanan.html', 'Layanan — Polsek Kapuas Tengah', 'Panduan surat kehilangan, izin keramaian, pengaduan, dan SPKT Polsek Kapuas Tengah, dengan booking kunjungan dan nomor tiket.', 'Layanan', layanan)

# ---------- Berita dan imbauan ----------
AN = 'https://analisnews.co.id/index.php/'
POSTS = [ # (cat, date, place, title, summary, url, img)
 ('berita', '5 November 2026', 'Desa Pujon', 'Polisi peduli pengangguran, Kapolsek Kapuas Tengah hadirkan pendekatan humanis dan bangun kedekatan dengan masyarakat', 'Program Polisi Peduli Pengangguran (POLIRAN) digelar di Desa Pujon untuk membuka ruang dialog dengan warga.', AN + '2026/11/05/polisi-peduli-pengangguran-kapolsek-kapuas-tengah-hadirkan-pendekatan-humanis-dan-bangun-kedekatan-dengan-masyarakat/', 'news-1.jpg|IMG-20261105-WA0133'),
 ('berita', '4 November 2026', 'Desa Pujon', 'Bahu membahu, Kapolres Kapuas bersama Kapolsek Kapuas Tengah dan tim gabungan padamkan api yang menghanguskan hutan di dekat permukiman Desa Pujon', 'Sekitar 2,5 hektare hutan terbakar di dekat permukiman. Warga diimbau tidak membuka lahan dengan cara membakar.', AN + '2026/11/04/bahu-membahu-kapolres-kapuas-bersama-kapolsek-kapuas-tengah-dan-tim-gabungan-padamkan-api-yang-menghanguskan-hutan-di-dekat-pemukiman-desa-pujon/', 'news-2.jpg|IMG-20261104-WA0192'),
 ('berita', '4 November 2026', 'Pasar Dayak Pujon', 'Kapolsek Kapuas Tengah kumpul bersama masyarakat, perkuat silaturahmi dan kerja sama harkamtibmas', 'Kapolsek menyapa warga di Pasar Dayak Pujon dan mengajak bersama menjaga keamanan lingkungan.', AN + '2026/11/04/kapolsek-kapuas-tengah-kumpul-bersama-masyarakat-perkuat-silaturahmi-dan-kerjasama-harkamtibmas/', 'news-3.jpg|IMG-20261104-WA0022'),
 ('berita', '26 Oktober 2026', 'SMPN 1 Kapuas Tengah', 'Polisi peduli pendidikan, Bhabinkamtibmas sosialisasi stop penyebaran berita hoaks dan perkelahian pelajar', 'Aipda Fordiansyah mengajak pelajar menyaring informasi dan bijak bermedia sosial.', AN + '2026/10/26/polisi-peduli-pendidikan-bhabinkamtibmas-polsek-kapuas-tengah-sosialisasi-stop-penyebaran-berita-hoax-dan-perkelahian-pelajar-di-smp-negeri-1-kapuas-tengah/', None),
 ('berita', '20 Oktober 2026', 'SMPN 2 Satu Atap Marapit', 'Bhabinkamtibmas sosialisasi stop penyebaran berita hoaks di SMPN 2 Satu Atap Marapit', 'Bripka Hansen S.B. memberi edukasi bahaya hoaks kepada siswa di Desa Marapit.', AN + '2026/10/20/polisi-peduli-pendidikan-bhabinkamtibmas-polsek-kapuas-tengah-sosialisasi-stop-penyebaran-berita-hoax-di-smpn-2-satu-atap-marapit/', None),
 ('berita', '19 Oktober 2026', 'Masjid Al-Furqan, Pujon', 'Subuh keliling dan dialog kamtibmas bersama tokoh agama Desa Pujon', 'Personel Polsek salat subuh berjamaah lalu berdialog dengan tokoh agama dan warga; masukan warga dicatat untuk ditindaklanjuti.', AN + '2026/10/20/polsek-kapuas-tengah-subuh-keliling-dan-dialog-kamtibmas-bersama-tokoh-agama-desa-pujon/', None),
 ('imbauan', 'Musim kemarau 2026', 'Seluruh desa', 'Buka lahan tanpa bakar', 'Jangan membersihkan lahan dengan cara membakar. Laporkan titik api ke 110 atau Bhabinkamtibmas desa Anda.', 'index.html#imbauan', None),
 ('imbauan', 'Oktober 2026', 'Sekolah dan pelajar', 'Saring sebelum sharing: stop hoaks', 'Periksa sumber informasi sebelum menyebarkannya. Hoaks dapat memicu keresahan dan perkelahian.', None, None),
 ('imbauan', 'November 2026', 'Sekolah dan pelajar', 'No narkoba, yes prestasi', 'Jauhi narkoba dan laporkan peredarannya di lingkungan Anda melalui formulir pengaduan atau WhatsApp Polsek.', None, None),
]
def news_img(img):
    if not img: return '<span class="img blank"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4"/></svg></span>'
    local, wa = img.split('|')
    return f'<span class="img"><img src="assets/{local}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=()=>this.remove();this.src=\'https://analisnews.co.id/wp-content/uploads/2026/11/{wa}.jpg\'"></span>'
def card(p):
    cat, date, place, t, s, url, img = p
    tag = 'a' if url else 'article'
    ext = url and url.startswith('http')
    attrs = f' href="{url}"' + (' target="_blank" rel="noopener"' if ext else '') if url else ''
    src = 'Baca di analisnews.co.id ↗' if ext else ('Baca imbauan →' if url else '')
    return f'<{tag} class="post{" imb" if cat == "imbauan" else ""}" data-cat="{cat}"{attrs}>{news_img(img)}<span class="b"><span class="meta"><b>{"Imbauan" if cat == "imbauan" else "Berita"}</b>{date} · {place}</span><h3>{t}</h3><p>{s}</p>{f"<span class=src>{src}</span>" if src else ""}</span></{tag}>'
f0 = POSTS[0]
nb, ni = sum(p[0] == 'berita' for p in POSTS), sum(p[0] == 'imbauan' for p in POSTS)
berita = f'''<section class="phero"><div class="wrap">
<p class="crumb"><a href="index.html">Beranda</a> / Berita dan imbauan</p>
<span class="eyebrow">Berita dan imbauan</span>
<h1 class="display">Kabar dan imbauan dari Polsek Kapuas Tengah</h1>
<p>Kegiatan kepolisian, informasi kamtibmas, dan imbauan untuk masyarakat Kecamatan Kapuas Tengah.</p>
</div></section>
<section style="background:var(--sand)"><div class="wrap">
<span class="eyebrow">Terbaru</span>
<a class="feature" data-feed="feature" href="{f0[5]}" target="_blank" rel="noopener" style="margin-top:10px">{news_img(f0[6]).replace('class="img"', 'class="img"', 1)}<span class="b"><span class="meta" style="font-size:13px;color:#6B5D4F">{f0[1]} · {f0[2]}</span><h2 class="display">{f0[3]}</h2><p style="color:var(--muted)">{f0[4]}</p><span class="src" style="font-weight:700;color:var(--brown)">Baca di analisnews.co.id ↗</span></span></a>
<div class="tabs" role="group" aria-label="Saring kategori" id="imbauan"><button type="button" data-f="all" aria-pressed="true">Semua<sup>{len(POSTS)}</sup></button><button type="button" data-f="berita" aria-pressed="false">Berita<sup>{nb}</sup></button><button type="button" data-f="imbauan" aria-pressed="false">Imbauan<sup>{ni}</sup></button></div>
<div class="grid3" data-feed="posts">{"".join(card(p) for p in POSTS[1:])}</div>
<p class="note" style="margin-top:24px">Berita kegiatan bersumber dari analisnews.co.id. Kirim informasi kegiatan atau koreksi melalui WhatsApp Polsek.</p>
</div></section>'''
page('berita.html', 'Berita dan imbauan — Polsek Kapuas Tengah', 'Berita kegiatan dan imbauan kamtibmas Polsek Kapuas Tengah.', 'Berita dan imbauan', berita)

# ---------- Pencarian orang ----------
po = f'''<section class="phero night" style="padding:80px 0 72px"><div class="glow-b" aria-hidden="true"></div><div class="glow-r" aria-hidden="true"></div><div class="wrap">
<p class="crumb"><a href="index.html">Beranda</a> / Pencarian orang</p>
<span class="eyebrow">Informasi publik</span>
<h1 class="display">Pencarian orang</h1>
<p>Daftar orang yang dicari polisi dan warga yang dilaporkan hilang di wilayah hukum Polsek Kapuas Tengah. Informasi sekecil apa pun dari Anda bisa membantu.</p>
<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:20px"><button class="btn btn-gold" type="button" data-form="ask" data-kategori="Orang hilang">Laporkan orang hilang</button><a class="btn" style="background:var(--red);color:#fff" href="tel:110">Telepon 110</a></div>
</div></section>
<section class="night" style="padding:56px 0"><div class="wrap" style="display:flex;flex-direction:column;gap:24px">
<div class="explain swipe">
<article class="r" id="dpo"><span class="eyebrow" style="color:#FF8A80">Merah</span><h2 class="display" style="font-size:30px">Daftar Pencarian Orang (DPO)</h2>
<p style="color:#E6DED0">Orang yang telah ditetapkan sebagai tersangka atau diduga kuat terlibat tindak pidana, lalu tidak diketahui keberadaannya atau tidak memenuhi panggilan penyidik secara sah.</p>
<h3 style="font-size:16px">Siapa yang masuk daftar ini</h3><ul><li>Tersangka yang melarikan diri</li><li>Tersangka yang tidak memenuhi panggilan resmi</li><li>Terpidana yang belum menjalani putusan</li></ul>
<div class="note" style="background:#3A1512;color:#FFD9D4">Jika melihat orang dalam DPO, jangan bertindak sendiri. Catat lokasi dan waktu, lalu hubungi 110 atau Polsek.</div></article>
<article class="y" id="hilang"><span class="eyebrow" style="color:#F2C230">Kuning</span><h2 class="display" style="font-size:30px">Orang hilang</h2>
<p style="color:#E6DED0">Warga yang dilaporkan keluarganya tidak diketahui keberadaannya. Tujuannya mempertemukan kembali dengan keluarga, bukan penindakan.</p>
<h3 style="font-size:16px">Kategori yang dapat dilaporkan</h3><ul><li>Anak dan remaja yang tidak pulang</li><li>Lansia atau orang dengan demensia</li><li>Orang dengan gangguan kejiwaan</li><li>Korban kecelakaan di sungai, hutan, atau area tambang</li><li>Dugaan korban penculikan atau perdagangan orang</li></ul>
<div class="note" style="background:#3A3214;color:#FFF1C2">Untuk anak, lansia, dan orang rentan, segera laporkan. Tidak perlu menunggu 1×24 jam.</div></article>
</div>
<article style="background:rgba(10,14,24,.78);border:1px solid rgba(255,255,255,.16);border-radius:4px;padding:28px;color:#fff">
<h2 class="display" style="font-size:26px;margin-bottom:16px">Cara melaporkan orang hilang</h2>
<div class="svc"><div class="cols swipe">
<div class="panel" style="background:rgba(255,255,255,.06)"><h3>Siapkan</h3><ul style="color:#E6DED0"><li>KTP pelapor dan Kartu Keluarga (bukti hubungan keluarga)</li><li>Foto terbaru orang yang hilang</li><li>Ciri fisik, pakaian terakhir, dan barang yang dibawa</li><li>Waktu dan lokasi terakhir terlihat</li><li>Nomor HP dan akun media sosial orang tersebut, bila ada</li></ul></div>
<div class="panel" style="background:rgba(255,255,255,.06)"><h3>Alur</h3><ol style="color:#E6DED0"><li>Hubungi 110 atau datang ke SPKT Polsek</li><li>Buat laporan dan serahkan data di atas</li><li>Petugas memverifikasi dan mulai pencarian bersama Bhabinkamtibmas</li><li>Informasi disebarkan, termasuk di halaman ini bila keluarga setuju</li><li>Kabari polisi segera bila orang tersebut sudah ditemukan</li></ol></div>
</div></div></article>
<h2 class="display" style="font-size:26px" id="daftar">Daftar saat ini</h2>
<div class="wanted" id="wanted">
<div class="wtabs" role="tablist" aria-label="Sumber data"><button type="button" role="tab" data-src="polsek" aria-selected="true">Polsek Kapuas Tengah</button><button type="button" role="tab" data-src="kejati" aria-selected="false">Kejati Kalimantan Tengah</button><button type="button" role="tab" data-src="pusiknas" aria-selected="false">Nasional (Pusiknas Polri)</button></div>
<input class="wsearch" type="search" placeholder="Cari nama atau tindak pidana" aria-label="Cari nama atau tindak pidana">
<p class="wnote" role="status"></p>
<div class="wgrid"><div class="empty"><b style="color:#FF8A80">DPO</b><p>Belum ada data yang dipublikasikan.</p></div><div class="empty"><b style="color:#F2C230">Orang hilang</b><p>Belum ada data yang dipublikasikan.</p></div></div>
<button class="btn wmore" type="button" hidden>Tampilkan lebih banyak</button>
</div>
<p style="font-size:13px;color:#AEB8CC">Data Polsek diterbitkan oleh petugas Polsek Kapuas Tengah. Data Kejati dan nasional disalin otomatis setiap minggu dari situs resminya; tiap kartu menautkan ke halaman sumber. Punya informasi? Kirim lewat <a href="{WA}" target="_blank" rel="noopener" style="color:#8FB4FF">WhatsApp Polsek</a> atau formulir pengaduan.</p>
</div></section>'''
page('pencarian-orang.html', 'Pencarian orang — Polsek Kapuas Tengah', 'Daftar Pencarian Orang (DPO) dan orang hilang di wilayah hukum Polsek Kapuas Tengah, serta cara melaporkan orang hilang.', 'Pencarian orang', po)
# ---------- assets/i18n.js: Indonesian text -> [English, Ngaju] from page text, hero, services ----------
TEMPLATES = {'{n} data, diterbitkan petugas Polsek.': ['{n} entries, published by Polsek officers.', '{n} data, iterbit awi petugas Polsek.'], '{n} data, disalin dari situs resmi {src} pada {date}.': ['{n} entries, copied from the official {src} site on {date}.', '{n} data, isalin bara situs resmi {src} intu {date}.'], '{n} data.': ['{n} entries.', '{n} data.'], 'Lihat di {src} ↗': ['View on {src} ↗', 'Ite intu {src} ↗'], 'Sumber: {src}': ['Source: {src}', 'Sumber: {src}'], 'Baca di {src} ↗': ['Read on {src} ↗', 'Baca intu {src} ↗'], '{jenis}: status {status}{jadwal}. Dicatat {tgl}.': ['{jenis}: status {status}{jadwal}. Recorded {tgl}.', '{jenis}: status {status}{jadwal}. Isurat {tgl}.'], ', jadwal {j}': [', scheduled {j}', ', jadwal {j}'], ' (penuh)': [' (full)', ' (penuh)'], 'Booking kunjungan': ['Visit booking', 'Booking kunjungan'], 'Pengaduan': ['Report', 'Pengaduan'], 'DPO': ['Wanted', 'DPO'], 'Orang hilang': ['Missing', 'Oloh nihau']}
DICT = {}
def walk(o):
    if isinstance(o, dict):
        if isinstance(o.get('id'), str) and 'en' in o and 'nij' in o:
            if o['id'] and (o.get('en') or o.get('nij')): DICT.setdefault(o['id'], [o.get('en') or o['id'], o.get('nij') or o['id']])
        else:
            for v in o.values(): walk(v)
    elif isinstance(o, list):
        for v in o: walk(v)
for t in C.get('texts', []):
    if t.get('id') and (t.get('en') or t.get('nij')): DICT[t['id']] = [t.get('en') or t['id'], t.get('nij') or t['id']]
walk(C['hero']); walk(C['services'])
for v in SV: DICT.setdefault(v['name']['id'].upper(), [(v['name'].get('en') or v['name']['id']).upper(), (v['name'].get('nij') or v['name']['id']).upper()])
open(R + 'assets/i18n.js', 'w').write('// Generated by build/build.py from the console content. Indonesian text -> [English, Dayak Ngaju].\nconst I18N = ' + json.dumps(DICT, ensure_ascii=False, separators=(',', ':')) + ';\nconst I18F = ' + json.dumps(TEMPLATES, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('built', len(DICT), 'phrases')
