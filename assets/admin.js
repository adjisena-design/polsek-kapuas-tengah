// Console: access-code login, sidebar pages (hash routes), inbox for bookings and complaints,
// slide-over editor for content, tables for log and access codes. Every row can be deleted.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $('#view'), dr = $('#drawer'), drBody = $('#dr-body'), drFoot = $('#dr-foot');
let token = sessionStorage.getItem('pkt-token'), me = null, D = {};
const LISTS = {};

const toast = m => { const t = $('#toast'); (dr.open ? dr : document.body).append(t); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3500); };
const call = (name, args = {}) => rpc(name, { p_token: token, ...args }).catch(e => { if (/Sesi berakhir/.test(e.message)) signOut('Sesi berakhir. Silakan masuk lagi.'); throw e; });
const fn = body => sb('/functions/v1/admin-files', { method: 'POST', body: JSON.stringify({ token, ...body }) });
const boss = () => ['owner', 'kapolsek'].includes(me?.role);
const ROLE = { owner: 'Owner', kapolsek: 'Kapolsek', staff: 'Staf' };
const dt = d => d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'belum pernah';
const day = d => new Date(d + 'T00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const today = () => new Date().toLocaleDateString('sv');
const jam = t => t.slice(0, 5).replace(':', '.') + ' WIB';
const waLink = (hp, text = '') => `https://wa.me/${hp.replace(/^0/, '62')}${text ? '?text=' + encodeURIComponent(text) : ''}`;
const I = (d, s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  home: '<path d="M3 11l9-8 9 8M5 10v10h14V10"/>', cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  inbox: '<path d="M3 13l3-8h12l3 8v6H3zM3 13h5l1 3h6l1-3h5"/>', news: '<path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-5-5"/>', users: '<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-5-6.7"/>',
  log: '<path d="M6 3h9l5 5v13H6zM14 3v6h6M9 13h8M9 17h8"/>', key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M17 6l3 3M14 9l2 2"/>',
  img: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
};
const PAGES = [
  ['UTAMA'], ['dasbor', 'Dasbor', IC.home],
  ['LAYANAN'], ['booking', 'Booking', IC.cal, 'bookings_new'], ['pengaduan', 'Pengaduan', IC.inbox, 'reports_new'],
  ['KONTEN SITUS'], ['berita', 'Berita dan imbauan', IC.news], ['pencarian', 'Pencarian orang', IC.search], ['personel', 'Personel', IC.users],
  ['SITUS'], ['publikasi', 'Publikasi', IC.home, 'unpublished'], ['pengaturan', 'Pengaturan', IC.key], ['hero', 'Hero Beranda', IC.img], ['layanan', 'Layanan', IC.news], ['teks', 'Teks situs', IC.log], ['desa', 'Desa', IC.users],
  ['SISTEM', true], ['log', 'Log', IC.log, null, true], ['akses', 'Kode akses', IC.key, null, true],
];

// ---------- login / session ----------
function signOut(msg) {
  if (token) rpc('admin_logout', { p_token: token }).catch(() => {});
  token = null; me = null; sessionStorage.removeItem('pkt-token');
  if (dr.open) dr.close();
  $('#app').hidden = true; $('#login').hidden = false; $('#code').value = '';
  const n = $('#login-msg'); n.hidden = !msg; n.className = 'notice'; n.textContent = msg || '';
  history.replaceState(null, '', location.pathname);
}
$('#logout').onclick = () => signOut('Anda sudah keluar.');
$('#login-f').onsubmit = async e => {
  e.preventDefault();
  const b = $('#login-f button'), n = $('#login-msg'), code = $('#code').value.trim();
  if (!code) { n.hidden = false; n.className = 'notice err'; n.textContent = 'Isi kode akses.'; return; }
  b.disabled = true; b.textContent = 'Memeriksa kode…'; n.hidden = true;
  try {
    const r = await rpc('admin_login', { p_code: code });
    token = r.token; sessionStorage.setItem('pkt-token', token);
    enter(r);
  } catch (x) { n.hidden = false; n.className = 'notice err'; n.textContent = x.message; }
  finally { b.disabled = false; b.textContent = 'Masuk'; }
};
function enter(m) {
  me = m;
  $('#login').hidden = true; $('#app').hidden = false; window.scrollTo(0, 0);
  $('#av').textContent = m.name.replace(/\(.*?\)/g, '').replace(/[^A-Za-z ]/g, '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'P';
  $('#me-name').textContent = m.name; $('#me-role').textContent = ROLE[m.role];
  if (!location.hash) location.hash = '#/dasbor'; else route();
  toast(`Selamat datang, ${m.name}.`);
}
(async () => {
  if (!token) return signOut();
  try { enter(await call('admin_me')); } catch { signOut(); }
})();

// ---------- shell ----------
function menu() {
  const page = location.hash.slice(2).split('?')[0] || 'dasbor';
  $('#menu').innerHTML = PAGES.map(p => {
    if (p.length <= 2 && typeof p[1] !== 'string') return p[1] && !boss() ? '' : `<h4>${p[0]}</h4>`;
    const [id, label, icon, dot, bossOnly] = p;
    if (bossOnly && !boss()) return '';
    const n = dot && D[dot];
    return `<a href="#/${id}"${id === page ? ' aria-current="page"' : ''}>${I(icon)}<span>${label}</span>${n ? `<span class="dot" aria-label="${n} baru">${n}</span>` : ''}</a>`;
  }).join('');
  const pb = $('#pubbar'); pb.hidden = !D.unpublished || page === 'publikasi'; pb.textContent = `${D.unpublished} perubahan belum dipublikasikan · Publikasikan`;
}
$('#menu-btn').onclick = () => { const o = $('#side').classList.toggle('open'); $('#menu-btn').setAttribute('aria-expanded', o); };
$('#menu').addEventListener('click', e => { if (e.target.closest('a')) $('#side').classList.remove('open'); });
addEventListener('hashchange', route);
async function route() {
  if (!me) return;
  const page = location.hash.slice(2).split('?')[0] || 'dasbor';
  const go = VIEWS[page] && (!['log', 'akses'].includes(page) || boss()) ? page : 'dasbor';
  if (dr.open) dr.close();
  view.onclick = null; view.innerHTML = '<p class="count">Memuat…</p>';
  try { D = await call('admin_list', { p_entity: 'dashboard' }); } catch { /* menu dots only */ }
  menu();
  try { await VIEWS[go](); } catch (x) { view.innerHTML = `<div class="empty">${esc(x.message)}</div>`; }
  window.scrollTo(0, 0);
}

// two-step delete used everywhere: first tap arms, second tap deletes (row and its files)
async function del(btn, entity, id, after) {
  if (!btn.classList.contains('sure')) {
    const t = btn.textContent; btn.classList.add('sure'); btn.textContent = 'Yakin hapus?';
    setTimeout(() => { if (btn.isConnected && !btn.disabled) { btn.classList.remove('sure'); btn.textContent = t; } }, 4000);
    return;
  }
  btn.disabled = true; btn.textContent = 'Menghapus…';
  try {
    const r = await fn({ action: 'delete', entity, id });
    toast(r.warn?.length ? 'Terhapus, tetapi sebagian berkas gagal dihapus.' : 'Terhapus.');
    if (dr.open) dr.close();
    after ? after() : route();
  } catch (x) { toast(x.message); btn.disabled = false; btn.classList.remove('sure'); btn.textContent = 'Hapus'; }
}

// ---------- drawer ----------
function drawer(kicker, title, body, foot) {
  $('#dr-kicker').textContent = kicker; $('#dr-title').textContent = title;
  drBody.innerHTML = body; drFoot.innerHTML = foot; drBody.scrollTop = 0;
  if (!dr.open) dr.showModal();
}
dr.addEventListener('click', e => { if (e.target === dr || e.target.closest('[data-close]')) dr.close(); });

// ---------- searchable list ----------
function listing({ rows, item, match, filter, empty = 'Belum ada data.', open }) {
  const box = $('.list', view), q = $('.search', view), more = $('.more', view), cnt = $('.count', view);
  let shown = 40, xs = [];
  const draw = () => {
    const t = (q?.value || '').trim().toLowerCase();
    xs = rows().filter(r => (!filter || filter(r)) && (!t || match(r).toLowerCase().includes(t)));
    cnt.textContent = `${xs.length} data`;
    box.innerHTML = xs.slice(0, shown).map((r, i) => item(r, i)).join('') || `<div class="empty">${empty}</div>`;
    more.hidden = xs.length <= shown;
  };
  if (q) q.oninput = () => { shown = 40; draw(); };
  more.onclick = () => { shown += 80; draw(); };
  box.onclick = e => { const b = e.target.closest('[data-i]'); if (b) open(xs[+b.dataset.i]); };
  draw();
  return draw;
}
const thumb = (u, round) => u ? `<img class="th${round ? ' round' : ''}" src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : `<span class="th ph${round ? ' round' : ''}">${I(round ? IC.user : IC.img, 24)}</span>`;
const tabsHtml = (opts, cur) => `<div class="tabs" role="group">${opts.map(([v, l, n]) => `<button type="button" data-f="${v}" aria-pressed="${v === cur}">${l}${n != null ? `<sup>${n}</sup>` : ''}</button>`).join('')}</div>`;

// ---------- edit forms ----------
// field spec: {k, l(label), t(type), o(options), req, hint, tr(translatable), aspect:[w,h] for photos}
// translatable fields: hero/services keep {id,en,nij} objects; posts/wanted/personnel keep Indonesian in the column and EN/NGAJU in i18n
const LANGS = [['id', 'ID'], ['en', 'EN'], ['nij', 'NGAJU']];
const HREFS = { 'layanan.html': 'Halaman Layanan', '#booking': 'Buka formulir booking', '#kontak': 'Bagian Kontak', '#wilayah': 'Peta wilayah dan desa', 'pencarian-orang.html': 'Halaman Pencarian orang', 'berita.html': 'Halaman Berita', 'profil.html': 'Halaman Profil' };
const ICONS = { search: 'Kaca pembesar', flag: 'Bendera / acara', chat: 'Balon pesan', shield: 'Perisai', doc: 'Dokumen', calendar: 'Kalender', users: 'Orang' };
const FORMS = {
  posts: { kicker: ['TAMBAH BERITA', 'UBAH BERITA'], title: 'title', mode: 'col', f: [
    { k: 'kind', l: 'Jenis', t: 'select', o: { berita: 'Berita kegiatan', imbauan: 'Imbauan kamtibmas' } },
    { k: 'title', l: 'Judul', t: 'textarea-s', req: 1, tr: 1, hint: 'Kalimat biasa: huruf besar hanya di awal dan pada nama.' },
    { k: 'summary', l: 'Ringkasan', t: 'textarea', tr: 1, hint: 'Satu atau dua kalimat yang tampil di kartu berita.' },
    [{ k: 'date_label', l: 'Tanggal tampil', t: 'text', tr: 1, hint: 'Contoh: 5 November 2026' }, { k: 'published_on', l: 'Tanggal terbit', t: 'date', req: 1, hint: 'Menentukan urutan; terbaru di atas.' }],
    { k: 'place', l: 'Lokasi', t: 'text', tr: 1, hint: 'Contoh: Desa Pujon' },
    { k: 'image_url', l: 'Foto utama', t: 'image', aspect: [1200, 900] },
    { k: 'source_url', l: 'Tautan berita lengkap', t: 'text', hint: 'Opsional, misalnya artikel di analisnews.co.id.' },
    { k: 'published', l: 'Tampilkan di situs', t: 'toggle', hint: 'Mati = disimpan sebagai draf, tidak tampil di situs.' },
  ] },
  wanted: { kicker: ['TERBITKAN PENCARIAN', 'UBAH PENCARIAN'], title: 'name', mode: 'col', f: [
    { k: 'kind', l: 'Jenis', t: 'select', o: { dpo: 'DPO (Daftar Pencarian Orang)', hilang: 'Orang hilang' } },
    { k: 'name', l: 'Nama lengkap', t: 'text', req: 1 },
    { k: 'crime', l: 'Tindak pidana / keterangan singkat', t: 'text', tr: 1, hint: 'DPO: jenis tindak pidana. Orang hilang: misalnya "Hilang sejak 3 November 2026".' },
    { k: 'detail', l: 'Ciri-ciri dan keterangan', t: 'textarea', tr: 1, hint: 'Ciri fisik, pakaian terakhir, lokasi terakhir terlihat, nomor yang bisa dihubungi.' },
    { k: 'photo_url', l: 'Foto', t: 'image', aspect: [800, 1000] },
    { k: 'published', l: 'Tampilkan di situs', t: 'toggle', hint: 'Matikan bila orang sudah ditemukan atau ditangkap, atau hapus datanya.' },
  ] },
  personnel: { kicker: ['TAMBAH PERSONEL', 'UBAH PERSONEL'], title: 'name', mode: 'col', f: [
    { k: 'name', l: 'Nama lengkap dengan pangkat dan gelar', t: 'text', req: 1 },
    [{ k: 'grp', l: 'Kelompok', t: 'select', o: { kapolsek: 'Kapolsek', wakil: 'Wakil pimpinan', unit: 'Kepala unit dan seksi', kaspkt: 'KA SPKT', banit: 'Banit', bhabin: 'Bhabinkamtibmas' } }, { k: 'jabatan', l: 'Jabatan', t: 'text', req: 1, tr: 1, hint: 'Contoh: Kanit Reskrim' }],
    { k: 'description', l: 'Keterangan', t: 'textarea', tr: 1, hint: 'Tugas singkat, atau desa binaan untuk Bhabinkamtibmas. Untuk Kapolsek: profil singkat.' },
    { k: 'photo_url', l: 'Foto', t: 'image', aspect: [800, 1000], hint: 'Setelah memilih foto, atur posisi dan ukurannya. Bagian kosong diisi putih.' },
    { k: 'sort', l: 'Urutan', t: 'number', hint: 'Angka kecil tampil lebih dulu.' },
  ] },
  hero: { kicker: ['TAMBAH SLIDE', 'UBAH SLIDE'], title: 'title', mode: 'obj', f: [
    [{ k: 'kind', l: 'Jenis slide', t: 'select', o: { photo: 'Foto dengan teks', dpo: 'Pencarian orang (lampu berkedip)' } }, { k: 'sort', l: 'Urutan', t: 'number', hint: 'Angka kecil tampil lebih dulu.' }],
    { k: 'active', l: 'Tampilkan di situs', t: 'toggle' },
    { k: 'image_url', l: 'Foto latar', t: 'image', aspect: [1920, 1280], hint: 'Foto lebar, minimal 1600 piksel. Tidak dipakai untuk slide Pencarian orang.' },
    { k: 'eyebrow', l: 'Teks kecil di atas judul', t: 'text', tr: 1 },
    { k: 'title', l: 'Judul', t: 'textarea-s', req: 1, tr: 1 },
    { k: 'body', l: 'Kalimat penjelas', t: 'textarea-s', tr: 1 },
    [{ k: 'cta', l: 'Tulisan tombol', t: 'text', tr: 1, hint: 'Kosongkan untuk tanpa tombol.' }, { k: 'href', l: 'Tombol menuju', t: 'select', o: HREFS }],
    { k: 'alt', l: 'Keterangan foto (untuk pembaca layar)', t: 'text', tr: 1 },
  ] },
  services: { kicker: ['TAMBAH LAYANAN', 'UBAH LAYANAN'], title: 'name', mode: 'obj', f: [
    { k: 'name', l: 'Nama layanan (singkat)', t: 'text', req: 1, tr: 1, hint: 'Tampil di kartu, tab Layanan, dan pilihan formulir booking. Contoh: Izin keramaian' },
    [{ k: 'active', l: 'Tampilkan di situs', t: 'toggle' }, { k: 'bookable', l: 'Bisa dipilih saat booking', t: 'toggle' }],
    [{ k: 'icon', l: 'Ikon kartu', t: 'select', o: ICONS }, { k: 'sort', l: 'Urutan', t: 'number' }],
    { k: 'card', l: 'Ringkasan di kartu Beranda', t: 'textarea-s', tr: 1 },
    { k: 'cta', l: 'Tulisan tautan kartu', t: 'text', tr: 1, hint: 'Contoh: Lihat panduan →' },
    { k: 'title', l: 'Judul lengkap', t: 'text', tr: 1, hint: 'Contoh: Surat Izin Keramaian (SIK)' },
    { k: 'intro', l: 'Penjelasan', t: 'textarea', tr: 1 },
    { k: 'note', l: 'Catatan di bawah penjelasan', t: 'textarea-s', tr: 1 },
    { k: 'sections', l: 'Bagian: persyaratan, alur, dan daftar dokumen', t: 'sections' },
    { k: 'warning', l: 'Peringatan di bawah', t: 'textarea-s', tr: 1 },
    { k: 'source', l: 'Sumber / catatan kecil', t: 'text', tr: 1 },
  ] },
};
const flat = f => f.flat();
const blankT = () => ({ id: '', en: '', nij: '' });
let FL = 'id'; // which language the open form shows
function langBar() {
  return `<div class="langbar"><span>Bahasa isian</span><div class="tabs" role="group">${LANGS.map(([l, n]) => `<button type="button" data-fl="${l}" aria-pressed="${l === FL}">${n}</button>`).join('')}</div><small>EN dan NGAJU boleh kosong; situs memakai teks Indonesia sebagai gantinya.</small></div>`;
}
function setFL(root, l) {
  FL = l;
  $$('[data-fl]', root).forEach(b => b.setAttribute('aria-pressed', b.dataset.fl === l));
  $$('[data-lang]', root).forEach(el => el.hidden = el.dataset.lang !== l);
}
const lfInput = (name, t, v, l) => {
  const ph = l === 'id' ? '' : ` placeholder="${l === 'en' ? 'English' : 'Dayak Ngaju'} (kosong = teks Indonesia)"`;
  const hid = l === FL ? '' : ' hidden';
  return t.startsWith('textarea') ? `<textarea name="${name}" data-lang="${l}"${ph}${hid}${t === 'textarea-s' ? ' style="min-height:80px"' : ''}>${esc(v)}</textarea>` : `<input name="${name}" data-lang="${l}" value="${esc(v)}"${ph}${hid}>`;
};
function field(s, v) {
  const { k, l, t, o, req, hint, tr } = s;
  const L = `<label for="e-${k}">${l}${req ? ' <span class="req">*</span>' : ''}${tr ? ' <span class="tri">ID · EN · NGAJU</span>' : ''}</label>`, H = hint ? `<p class="hint">${hint}</p>` : '';
  if (tr) { v = v || blankT(); return `<div class="fld">${L}${LANGS.map(([g]) => lfInput(`${k}.${g}`, t, v[g] || '', g)).join('')}${H}</div>`; }
  if (t === 'select') return `<div class="fld">${L}<select id="e-${k}" name="${k}">${Object.entries(o).map(([a, b]) => `<option value="${a}"${a === v ? ' selected' : ''}>${b}</option>`).join('')}${v && !(v in o) ? `<option value="${esc(v)}" selected>${esc(v)}</option>` : ''}</select>${H}</div>`;
  if (t === 'textarea' || t === 'textarea-s') return `<div class="fld">${L}<textarea id="e-${k}" name="${k}"${t === 'textarea-s' ? ' style="min-height:80px"' : ''}>${esc(v)}</textarea>${H}</div>`;
  if (t === 'toggle') return `<div class="fld"><span class="flab">${l}</span><label class="toggle"><input type="checkbox" role="switch" name="${k}" aria-label="${l}"${v ? ' checked' : ''}></label>${H}</div>`;
  if (t === 'image') return `<div class="fld"><span class="flab">${l}</span><div class="photo"><div class="box" style="aspect-ratio:${s.aspect[0]}/${s.aspect[1]};${v ? `background-image:url('${esc(v)}')` : ''}">${v ? '' : 'Belum ada foto'}</div><div class="ctl"><label class="btn" style="align-self:flex-start">${I(IC.img, 18)}Pilih dan atur foto<input type="file" name="${k}__file" accept="image/*" hidden></label>${v ? `<button class="btn ghost" type="button" data-recrop="${k}" style="align-self:flex-start">Atur ulang foto ini</button>` : ''}<input name="${k}" value="${esc(v)}" placeholder="atau tempel tautan foto" style="min-height:42px;border:1px solid var(--line);border-radius:10px;padding:0 14px">${H || '<p class="hint">Setelah memilih, Anda bisa memotong, memperbesar, dan menggeser foto.</p>'}</div></div></div>`;
  if (t === 'sections') return `<div class="fld"><span class="flab">${l}</span><div id="secs"></div><button class="btn" type="button" id="sec-add" style="align-self:flex-start">+ Tambah bagian</button></div>`;
  return `<div class="fld">${L}<input id="e-${k}" name="${k}" type="${t}" value="${esc(v)}">${H}</div>`;
}

// sections editor (services): list / numbered steps / per-document cards; items one per line in each language
const SECT = { list: 'Daftar berpoin', steps: 'Langkah bernomor', cards: 'Kartu per dokumen' };
const toLines = items => Object.fromEntries(LANGS.map(([l]) => [l, (items || []).map(i => i[l] || '').join('\n')]));
const fromLines = t => { const id = t.id.split('\n').map(s => s.trim()); const en = t.en.split('\n'), nij = t.nij.split('\n'); return id.map((x, i) => ({ id: x, en: (en[i] || '').trim(), nij: (nij[i] || '').trim() })).filter(x => x.id); };
function sectionsEditor(box, list) {
  const S = list.map(s => ({ type: s.type, title: { ...blankT(), ...s.title }, lines: toLines(s.items), cards: (s.cards || []).map(c => ({ title: { ...blankT(), ...c.title }, lines: toLines(c.items) })) }));
  const lfs = (path, t, obj) => LANGS.map(([g]) => lfInput(`${path}|${g}`, t, obj[g] || '', g)).join('');
  const draw = () => {
    box.innerHTML = S.map((s, i) => `<fieldset class="sec"><div class="sec-h"><select data-p="${i}|type" aria-label="Jenis bagian">${Object.entries(SECT).map(([a, b]) => `<option value="${a}"${a === s.type ? ' selected' : ''}>${b}</option>`).join('')}</select><span class="spacer"></span><button class="link" type="button" data-mv="${i}|-1"${i ? '' : ' disabled'}>Naik</button><button class="link" type="button" data-mv="${i}|1"${i < S.length - 1 ? '' : ' disabled'}>Turun</button><button class="link red" type="button" data-rm="${i}">Hapus bagian</button></div>
<label>Judul bagian</label>${lfs(`${i}|title`, 'text', s.title)}
${s.type === 'cards' ? `<div class="cardsed">${s.cards.map((c, j) => `<div class="card-ed"><div class="sec-h"><b>Kartu ${j + 1}</b><span class="spacer"></span><button class="link red" type="button" data-rmc="${i}|${j}">Hapus kartu</button></div><label>Nama dokumen</label>${lfs(`${i}|c${j}|title`, 'text', c.title)}<label>Persyaratan, satu per baris</label>${lfs(`${i}|c${j}|lines`, 'textarea', c.lines)}</div>`).join('')}<button class="btn ghost" type="button" data-addc="${i}" style="align-self:flex-start">+ Tambah kartu</button></div>`
  : `<label>Isi, satu per baris</label>${lfs(`${i}|lines`, 'textarea', s.lines)}<p class="hint">Baris ke-1 bahasa EN/NGAJU adalah terjemahan baris ke-1 bahasa Indonesia, dan seterusnya.</p>`}</fieldset>`).join('') || '<p class="hint">Belum ada bagian.</p>';
  };
  box.addEventListener('input', e => {
    const p = e.target.name?.split('|') || e.target.dataset.p?.split('|'); if (!p) return;
    const s = S[+p[0]];
    if (p[1] === 'type') { s.type = e.target.value; draw(); return; }
    if (p[1].startsWith('c')) { const c = s.cards[+p[1].slice(1)]; c[p[2]][p[3]] = e.target.value; } else s[p[1]][p[2]] = e.target.value;
  });
  box.addEventListener('change', e => { if (e.target.dataset.p?.endsWith('|type')) { S[+e.target.dataset.p.split('|')[0]].type = e.target.value; draw(); } });
  box.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.rm) S.splice(+b.dataset.rm, 1);
    else if (b.dataset.mv) { const [i, d] = b.dataset.mv.split('|').map(Number); [S[i], S[i + d]] = [S[i + d], S[i]]; }
    else if (b.dataset.rmc) { const [i, j] = b.dataset.rmc.split('|').map(Number); S[i].cards.splice(j, 1); }
    else if (b.dataset.addc) S[+b.dataset.addc].cards.push({ title: blankT(), lines: blankT() });
    else return;
    draw();
  });
  $('#sec-add').onclick = () => { S.push({ type: 'list', title: blankT(), lines: blankT(), cards: [] }); draw(); };
  draw();
  return () => S.map(s => ({ type: s.type, title: s.title, items: s.type === 'cards' ? [] : fromLines(s.lines), cards: s.type === 'cards' ? s.cards.map(c => ({ title: c.title, items: fromLines(c.lines) })) : [] }));
}

// photo cropper: drag to move, slider to zoom (zooming out leaves white space), rotate; returns a JPEG blob
function cropImage(src, [W, H]) {
  return new Promise(async resolve => {
    let img;
    try { img = await createImageBitmap(src instanceof Blob ? src : await (await fetch(src)).blob()); }
    catch { toast('Foto tidak bisa dibuka. Pilih file foto lain.'); return resolve(null); }
    const d = $('#crop'), cv = $('#crop canvas'), cx = cv.getContext('2d'), zoom = $('#crop-zoom');
    cv.width = W; cv.height = H;
    let rot = 0, x = 0, y = 0, sc = 1, cover = 1, contain = 1;
    const dims = () => rot % 2 ? [img.height, img.width] : [img.width, img.height];
    const fit = () => { const [iw, ih] = dims(); cover = Math.max(W / iw, H / ih); contain = Math.min(W / iw, H / ih); };
    const lo = () => contain * 0.5, hi = () => cover * 4;
    const toSlider = () => zoom.value = Math.round(100 * Math.log(sc / lo()) / Math.log(hi() / lo()));
    const draw = () => { cx.fillStyle = '#fff'; cx.fillRect(0, 0, W, H); cx.save(); cx.translate(W / 2 + x, H / 2 + y); cx.rotate(rot * Math.PI / 2); cx.drawImage(img, -img.width * sc / 2, -img.height * sc / 2, img.width * sc, img.height * sc); cx.restore(); };
    const set = s => { sc = s; x = y = 0; toSlider(); draw(); };
    fit(); set(cover);
    zoom.oninput = () => { sc = lo() * Math.pow(hi() / lo(), zoom.value / 100); draw(); };
    let drag = null;
    cv.onpointerdown = e => { drag = [e.clientX, e.clientY, x, y]; cv.setPointerCapture(e.pointerId); };
    cv.onpointermove = e => { if (!drag) return; const k = W / cv.getBoundingClientRect().width; x = drag[2] + (e.clientX - drag[0]) * k; y = drag[3] + (e.clientY - drag[1]) * k; draw(); };
    cv.onpointerup = cv.onpointercancel = () => drag = null;
    cv.onwheel = e => { e.preventDefault(); sc = Math.min(hi(), Math.max(lo(), sc * (e.deltaY < 0 ? 1.06 : 1 / 1.06))); toSlider(); draw(); };
    $('#crop-cover').onclick = () => set(cover);
    $('#crop-contain').onclick = () => set(contain);
    $('#crop-rot').onclick = () => { rot = (rot + 1) % 4; fit(); set(cover); };
    const done = blob => { d.close(); resolve(blob); };
    $('#crop-ok').onclick = () => cv.toBlob(done, 'image/jpeg', 0.9);
    $('#crop-cancel').onclick = () => done(null);
    d.oncancel = e => { e.preventDefault(); done(null); };
    d.showModal();
  });
}

function edit(entity, r, done) {
  const F = FORMS[entity], isNew = !r, obj = F.mode === 'obj';
  r = r || { published: true, active: true, bookable: true, published_on: today(), kind: { wanted: 'dpo', hero: 'photo' }[entity] || 'berita', grp: 'unit', icon: 'doc', href: 'layanan.html', sections: [], sort: (LISTS[entity]?.length || 0) + 1 };
  const val = s => s.tr ? (obj ? { ...blankT(), ...(r[s.k] || {}) } : { id: r[s.k] ?? '', en: r.i18n?.en?.[s.k] ?? '', nij: r.i18n?.nij?.[s.k] ?? '' }) : (r[s.k] ?? '');
  const titleOf = () => { const v = val(flat(F.f).find(s => s.k === F.title)); return (v.id ?? v) || 'Tanpa judul'; };
  const hasTr = flat(F.f).some(s => s.tr);
  drawer(F.kicker[isNew ? 0 : 1], isNew ? 'Tanpa judul' : titleOf(),
    `<form id="ef" novalidate style="display:flex;flex-direction:column;gap:16px">${hasTr ? langBar() : ''}${F.f.map(x => Array.isArray(x) ? `<div class="two">${x.map(y => field(y, val(y))).join('')}</div>` : field(x, val(x))).join('')}<p class="err-line" id="ef-err"></p></form>`,
    `<button class="btn primary" type="submit" form="ef">Simpan</button><button class="btn" type="button" data-close>Batal</button><span class="spacer"></span>${isNew ? '' : '<button class="btn danger" type="button" id="ef-del">Hapus</button>'}`);
  const f = $('#ef'), crops = {};
  $$('[data-fl]', f).forEach(b => b.onclick = () => setFL(f, b.dataset.fl));
  const getSecs = $('#secs') ? sectionsEditor($('#secs'), r.sections || []) : null;
  const pick = async (s, src) => {
    const blob = await cropImage(src, s.aspect); if (!blob) return;
    crops[s.k] = blob;
    const box = f.elements[s.k + '__file'].closest('.photo').querySelector('.box');
    box.textContent = ''; box.style.backgroundImage = `url('${URL.createObjectURL(blob)}')`;
  };
  flat(F.f).filter(s => s.t === 'image').forEach(s => {
    const inp = f.elements[s.k + '__file'];
    inp.onchange = () => { const file = inp.files[0]; inp.value = ''; if (!file) return; if (file.size > 25 * 1024 * 1024) return toast('Foto maksimal 25 MB.'); pick(s, file); };
    const re = $(`[data-recrop="${s.k}"]`, f); if (re) re.onclick = () => pick(s, f.elements[s.k].value);
  });
  const tIn = f.elements[F.title + '.id'] || f.elements[F.title]; tIn.addEventListener('input', () => $('#dr-title').textContent = tIn.value.trim() || 'Tanpa judul');
  if ($('#ef-del')) $('#ef-del').onclick = e => del(e.currentTarget, entity, r.id, done);
  f.onsubmit = async e => {
    e.preventDefault();
    const err = $('#ef-err'), b = $('[form=ef][type=submit]'); err.textContent = '';
    try {
      const row = { id: r.id || '' }, i18n = { en: { ...(r.i18n?.en || {}) }, nij: { ...(r.i18n?.nij || {}) } };
      for (const s of flat(F.f)) {
        const { k, t } = s;
        if (t === 'sections') { row[k] = getSecs(); continue; }
        if (s.tr) {
          const v = Object.fromEntries(LANGS.map(([g]) => [g, f.elements[`${k}.${g}`].value.trim()]));
          if (s.req && !v.id) { setFL(f, 'id'); throw new Error(`Isi ${s.l.toLowerCase()} (bahasa Indonesia).`); }
          if (obj) row[k] = v; else { row[k] = v.id; i18n.en[k] = v.en; i18n.nij[k] = v.nij; }
          continue;
        }
        const el = f.elements[k];
        row[k] = t === 'toggle' ? el.checked : t === 'number' ? (el.value === '' ? 0 : +el.value) : el.value.trim();
        if (s.req && !row[k]) throw new Error(`Isi ${s.l.toLowerCase()}.`);
        if (t === 'image' && crops[k]) {
          b.disabled = true; b.textContent = 'Mengunggah foto…';
          const u = await fn({ action: 'upload', name: `${entity}-${Date.now()}.jpg` });
          const put = await fetch(u.signedUrl, { method: 'PUT', body: crops[k], headers: { 'Content-Type': 'image/jpeg' } });
          if (!put.ok) throw new Error('Unggah foto gagal. Coba lagi.');
          row[k] = u.publicUrl; // shortcut: a replaced photo stays in storage until the row is deleted
        }
      }
      if (!obj) row.i18n = i18n;
      if (entity === 'services' && !row.id) row.slug = (row.name.id.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'layanan').slice(0, 30) + '-' + Date.now().toString(36).slice(-3);
      b.disabled = true; b.textContent = 'Menyimpan…';
      await call('admin_save', { p_entity: entity, p_row: row });
      dr.close(); toast(obj ? 'Tersimpan. Tekan Publikasikan agar tampil di situs.' : isNew ? 'Ditambahkan.' : 'Perubahan disimpan.'); done();
    } catch (x) { err.textContent = x.message; } finally { b.disabled = false; b.textContent = 'Simpan'; }
  };
}

// ---------- inbox (bookings, complaints) ----------
async function inbox(entity) {
  const isB = entity === 'bookings';
  let rows = await call('admin_list', { p_entity: entity }), tab = 'baru', when = 'semua';
  const n = s => rows.filter(r => s === 'semua' || r.inbox === s).length;
  view.innerHTML = `<div class="head"><h1>${isB ? 'Booking kunjungan' : 'Pengaduan dan pertanyaan'}</h1></div>
<p class="sub">${isB ? 'Jadwal kunjungan yang dipesan warga lewat situs. Satu jam hanya untuk satu booking.' : 'Laporan, aspirasi, dan pertanyaan dari formulir situs, termasuk lampiran foto dan video.'} Status yang dilihat warga tetap <b>diterima</b>; Baru, Dibaca, dan Arsip hanya untuk petugas.</p>
<div id="tabs"></div>
<div class="tools"><input class="search" type="search" placeholder="${isB ? 'Cari nama, nomor HP, tiket, layanan…' : 'Cari isi, kategori, desa, tiket…'}" aria-label="Cari">${isB ? '<select class="sel" id="when" aria-label="Tanggal kunjungan"><option value="semua">Semua tanggal</option><option value="hari">Hari ini</option><option value="depan">Mendatang</option><option value="lewat">Sudah lewat</option></select>' : ''}</div>
<p class="count"></p><div class="list"></div><button class="btn more" type="button" hidden>Tampilkan lebih banyak</button>`;
  const drawTabs = () => { $('#tabs').innerHTML = tabsHtml([['baru', 'Baru', n('baru')], ['dibaca', 'Dibaca', n('dibaca')], ['arsip', 'Arsip', n('arsip')], ['semua', 'Semua', n('semua')]], tab); };
  $('#tabs').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { tab = b.dataset.f; drawTabs(); draw(); } };
  if (isB) {
    if (location.hash.includes('hari')) { when = 'hari'; tab = 'semua'; }
    $('#when').value = when; $('#when').onchange = e => { when = e.target.value; draw(); };
  }
  drawTabs();
  const t0 = today();
  const draw = listing({
    rows: () => rows,
    filter: r => (tab === 'semua' || r.inbox === tab) && (!isB || when === 'semua' || (when === 'hari' ? r.tanggal === t0 : when === 'depan' ? r.tanggal >= t0 : r.tanggal < t0)),
    match: r => isB ? `${r.ticket} ${r.nama} ${r.hp} ${r.layanan} ${r.catatan ?? ''}` : `${r.ticket} ${r.kategori} ${r.isi} ${r.desa ?? ''} ${r.nama ?? ''} ${r.hp ?? ''}`,
    empty: tab === 'baru' ? 'Tidak ada yang baru.' : 'Belum ada data.',
    item: (r, i) => isB
      ? `<button type="button" class="item${r.inbox === 'baru' ? ' unread' : ''}" data-i="${i}">${r.inbox === 'baru' ? '<span class="new" aria-label="Baru"></span>' : ''}<span class="tx"><b>${esc(r.nama)} — ${esc(r.layanan)}</b><span>${day(r.tanggal)} · ${jam(r.jam)} · ${esc(r.ticket)}</span></span>${r.tanggal === t0 ? '<span class="pill red">Hari ini</span>' : r.tanggal < t0 ? '<span class="pill off">Lewat</span>' : '<span class="pill">Mendatang</span>'}<span class="when">dipesan<br>${dt(r.created_at)}</span></button>`
      : `<button type="button" class="item${r.inbox === 'baru' ? ' unread' : ''}" data-i="${i}">${r.inbox === 'baru' ? '<span class="new" aria-label="Baru"></span>' : ''}<span class="tx"><b>${esc(r.kategori)}</b><span>${esc(r.isi.slice(0, 140))}</span></span>${r.files.length ? `<span class="pill blue">${r.files.length} lampiran</span>` : ''}<span class="when">${esc(r.ticket)}<br>${dt(r.created_at)}</span></button>`,
    open: async r => {
      if (r.inbox === 'baru') { r.inbox = 'dibaca'; call('admin_set_inbox', { p_entity: entity, p_id: r.id, p_state: 'dibaca' }).then(() => { D[isB ? 'bookings_new' : 'reports_new']--; menu(); }).catch(() => {}); drawTabs(); draw(); }
      const setState = async s => { try { await call('admin_set_inbox', { p_entity: entity, p_id: r.id, p_state: s }); r.inbox = s; dr.close(); toast(s === 'arsip' ? 'Diarsipkan.' : s === 'baru' ? 'Ditandai belum dibaca.' : 'Dikembalikan ke kotak masuk.'); D[isB ? 'bookings_new' : 'reports_new'] = rows.filter(x => x.inbox === 'baru').length; menu(); drawTabs(); draw(); } catch (x) { toast(x.message); } };
      const kv = isB
        ? [['Tiket', r.ticket], ['Layanan', r.layanan], ['Jadwal', `${day(r.tanggal)}, pukul ${jam(r.jam)}`], ['Nama', r.nama], ['Nomor HP', r.hp], ['Status untuk warga', r.status], ['Dipesan', dt(r.created_at)]]
        : [['Tiket', r.ticket], ['Kategori', r.kategori], ['Desa', r.desa || '-'], ['Nama', r.nama || 'Tidak dicantumkan'], ['Nomor HP', r.hp || 'Tidak dicantumkan'], ['Status untuk warga', r.status], ['Masuk', dt(r.created_at)]];
      const msg = isB ? (r.catatan ? `<h3>Catatan dari warga</h3><div class="msg">${esc(r.catatan)}</div>` : '') : `<h3>Isi laporan</h3><div class="msg">${esc(r.isi)}</div>${r.files.length ? `<h3>Lampiran</h3><div class="att" id="att"><p class="count">Memuat lampiran…</p></div>` : ''}`;
      const wa = r.hp ? `<a class="btn wa" target="_blank" rel="noopener" href="${waLink(r.hp, `Polsek Kapuas Tengah, terkait tiket ${r.ticket}: `)}">WhatsApp warga</a>` : '';
      drawer(isB ? 'BOOKING KUNJUNGAN' : 'PENGADUAN', isB ? `${r.nama} — ${r.layanan}` : r.kategori,
        `<dl class="kv">${kv.map(([a, b]) => `<dt>${a}</dt><dd>${esc(b)}</dd>`).join('')}</dl>${msg}`,
        `${wa}${r.inbox === 'arsip' ? '<button class="btn" type="button" data-st="dibaca">Kembalikan ke kotak masuk</button>' : '<button class="btn" type="button" data-st="arsip">Arsipkan</button>'}<button class="btn ghost" type="button" data-st="baru">Tandai belum dibaca</button><span class="spacer"></span><button class="btn danger" type="button" id="dr-del">Hapus</button>`);
      $$('[data-st]', drFoot).forEach(b => b.onclick = () => setState(b.dataset.st));
      $('#dr-del').onclick = e => del(e.currentTarget, entity, r.id, () => { rows = rows.filter(x => x !== r); drawTabs(); draw(); });
      if (!isB && r.files.length) {
        try {
          const links = await fn({ action: 'sign', paths: r.files });
          $('#att').innerHTML = links.map((l, i) => {
            if (!l.signedUrl) return `<figure>Lampiran ${i + 1} tidak ditemukan</figure>`;
            const u = esc(l.signedUrl), video = /\.(mp4|mov|webm|3gp|mkv|avi)$/i.test(r.files[i]);
            return `<figure>${video ? `<video src="${u}" controls preload="metadata"></video>` : `<a href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="Lampiran ${i + 1}"></a>`}<a href="${u}" target="_blank" rel="noopener">Buka lampiran ${i + 1} ↗</a></figure>`;
          }).join('') + '<p class="count" style="grid-column:1/-1">Tautan lampiran berlaku 1 jam.</p>';
        } catch (x) { $('#att').innerHTML = `<p class="err-line">${esc(x.message)}</p>`; }
      }
    },
  });
}

// ---------- pages ----------
const VIEWS = {
  async dasbor() {
    const d = D, first = me.name.replace(/\(.*?\)/g, '').trim().split(/[ ,]/)[0];
    const fail = (d.last_sync || []).filter(s => !s.ok);
    const SRC = { kejati: 'Kejati Kalimantan Tengah', pusiknas: 'Pusiknas Polri' };
    const todo = [
      d.booking_today && ['#/booking?hari', 'Booking hari ini', 'Warga yang dijadwalkan datang hari ini', d.booking_today],
      d.reports_new && ['#/pengaduan', 'Pengaduan belum dibaca', 'Laporan dan pertanyaan baru dari situs', d.reports_new],
      d.bookings_new && ['#/booking', 'Booking belum dibaca', 'Pesanan kunjungan baru', d.bookings_new],
      fail.length && ['#/dasbor', 'Sinkron DPO gagal', fail.map(s => SRC[s.source]).join(', ') + ' — lihat di bawah', fail.length],
      d.placeholders && ['#/personel', 'Data personel belum diisi', 'Masih ada nama atau keterangan [ dalam kurung ]', d.placeholders],
      d.unpublished && ['#/publikasi', 'Perubahan belum dipublikasikan', 'Teks, layanan, atau pengaturan yang belum tampil di situs', d.unpublished],
    ].filter(Boolean);
    view.innerHTML = `<h1>Halo, ${esc(first)}</h1><p class="sub">Anda masuk sebagai ${ROLE[me.role]}.${boss() ? ' Akses penuh, termasuk Log dan Kode akses.' : ''}</p>
${todo.length ? `<section class="card action"><h2>Perlu tindakan</h2><div class="todo">${todo.map(([h, b, s, n]) => `<a href="${h}"><span><b>${b}</b><span>${s}</span></span><strong>${n}</strong></a>`).join('')}</div></section>` : '<section class="card ok"><h2>Semua beres</h2><p class="muted" style="margin:0">Tidak ada yang perlu ditindaklanjuti saat ini.</p></section>'}
<div class="stats">
<a class="stat" href="#/booking"><span>Booking mendatang</span><b>${d.booking_upcoming}</b><small>termasuk hari ini</small></a>
<a class="stat" href="#/pengaduan"><span>Pengaduan 7 hari terakhir</span><b>${d.reports_7d}</b><small>dari total ${d.reports_total}</small></a>
<a class="stat" href="#/berita"><span>Berita dan imbauan</span><b>${d.posts}</b><small>tampil di situs</small></a>
<a class="stat" href="#/pencarian"><span>DPO dan orang hilang</span><b>${d.wanted_polsek}</b><small>terbitan Polsek</small></a>
<a class="stat" href="#/pencarian"><span>DPO sumber resmi</span><b>${d.wanted_synced}</b><small>Kejati dan Pusiknas</small></a>
</div>
<section class="card"><h2>Sinkron DPO otomatis</h2><p class="muted" style="margin-top:0">Disalin otomatis setiap Senin pukul 03.17 WIB dari situs resmi. Bila gagal, situs tetap menampilkan salinan terakhir yang berhasil.</p>
<div class="tblwrap"><table class="tbl"><thead><tr><th>Sumber</th><th>Terakhir</th><th>Hasil</th></tr></thead><tbody>${(d.last_sync || []).map(s => `<tr><td><b>${SRC[s.source] || esc(s.source)}</b></td><td>${dt(s.at)}</td><td>${s.ok ? `<span class="pill">Berhasil · ${s.items} data</span>` : `<span class="pill red">Gagal</span><small>${esc(s.error)}</small>`}</td></tr>`).join('') || '<tr><td colspan="3">Belum pernah sinkron.</td></tr>'}</tbody></table></div>
<div class="tools" style="margin-top:14px"><button class="btn gold" type="button" id="sync">Sinkron sekarang</button><span class="count" id="sync-m"></span></div></section>`;
    $('#sync').onclick = async e => {
      e.target.disabled = true; $('#sync-m').textContent = 'Sinkron berjalan, sekitar 1 menit. Jangan tutup halaman ini.';
      try { const r = await sb('/functions/v1/dpo-sync', { method: 'POST', body: '{}' }); if (r.skipped) $('#sync-m').textContent = 'Baru saja disinkron. Bisa diulang 1 jam setelah sinkron terakhir.'; else { toast('Sinkron selesai.'); route(); } }
      catch (x) { $('#sync-m').textContent = x.message; } finally { e.target.disabled = false; }
    };
  },
  // ---------- site content (published with the Publish button) ----------
  async publikasi() {
    const runs = await call('admin_list', { p_entity: 'publish' }), n = D.unpublished || 0;
    view.innerHTML = `<div class="head"><h1>Publikasi</h1></div>
<p class="sub">Perubahan di Pengaturan, Hero, Layanan, Teks situs, dan Desa disimpan sebagai draf. Tekan Publikasikan agar situs dibangun ulang; biasanya tampil dalam 1–2 menit. Berita, Pencarian orang, dan Personel langsung tampil tanpa perlu dipublikasikan.</p>
<section class="card ${n ? 'action' : 'ok'}"><h2>${n ? `${n} perubahan belum dipublikasikan` : 'Situs sudah sesuai dengan konsol'}</h2>
<div class="tools" style="margin-top:12px"><button class="btn primary" type="button" id="pub">Publikasikan sekarang</button><a class="btn" href="index.html" target="_blank" rel="noopener">Buka situs ↗</a></div>
<p class="count" id="pub-st" style="margin-top:12px"></p></section>
<div class="tblwrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Oleh</th><th>Hasil</th></tr></thead><tbody>${runs.map(p => `<tr><td>${dt(p.at)}</td><td>${esc(p.admin_name || '-')}</td><td>${p.ok ? '<span class="pill">Dikirim</span>' : '<span class="pill red">Gagal</span>'} <small>${esc(p.detail || '')}</small></td></tr>`).join('') || '<tr><td colspan="3">Belum pernah.</td></tr>'}</tbody></table></div>`;
    const st = $('#pub-st');
    let since = 0; // set when Publish is pressed: wait for a run started after that moment
    const poll = async (tries = 0) => {
      if (location.hash !== '#/publikasi') return;
      try {
        const s = await sb('/functions/v1/publish', { method: 'POST', body: JSON.stringify({ token, action: 'status' }) });
        const fresh = s.at && new Date(s.at).getTime() >= since - 15000;
        if (since && !fresh) { st.textContent = 'Menunggu GitHub memulai pembangunan situs…'; if (tries < 60) setTimeout(() => poll(tries + 1), 4000); return; }
        if (!s.status) return;
        const doneOk = s.status === 'completed' && s.conclusion === 'success';
        const label = s.status === 'completed' ? (doneOk ? 'Selesai. Situs sudah diperbarui; muat ulang halaman situs untuk melihatnya.' : `Gagal (${s.conclusion}). Coba publikasikan lagi atau hubungi pengelola.`) : 'Sedang membangun situs… (biasanya 1–2 menit)';
        st.innerHTML = `Terakhir: ${dt(s.at)} · ${label} <a href="${esc(s.url)}" target="_blank" rel="noopener">detail</a>`;
        if (s.status !== 'completed' && tries < 60) setTimeout(() => poll(tries + 1), 5000);
        else if (since && doneOk) { since = 0; toast('Situs sudah diperbarui.'); setTimeout(route, 1500); }
      } catch (x) { st.textContent = x.message; }
    };
    poll();
    $('#pub').onclick = async e => {
      e.target.disabled = true; st.textContent = 'Mengirim…';
      try { await sb('/functions/v1/publish', { method: 'POST', body: JSON.stringify({ token, action: 'run' }) }); toast('Publikasi dimulai.'); since = Date.now(); D.unpublished = 0; menu(); setTimeout(() => poll(), 3000); }
      catch (x) { st.textContent = x.message; } finally { e.target.disabled = false; }
    };
  },
  async pengaturan() {
    const s = await call('admin_list', { p_entity: 'settings' });
    const F = [['wa', 'Nomor WhatsApp untuk tautan', 'Format internasional tanpa + dan spasi, contoh 6285315515282.'], ['wa_display', 'Nomor WhatsApp yang ditampilkan', 'Contoh: 0853 1551 5282'],
      ['address', 'Alamat Mako', ''], ['maps', 'Tautan petunjuk arah Google Maps', 'Diawali https://'], ['instagram', 'Tautan Instagram', ''], ['instagram_handle', 'Nama akun Instagram', 'Contoh: @polsek.kapuas.tengah'], ['facebook', 'Tautan Facebook', '']];
    view.innerHTML = `<div class="head"><h1>Pengaturan situs</h1></div><p class="sub">Kontak yang muncul di header, footer, tombol WhatsApp, dan bagian Kontak di semua halaman. Simpan, lalu Publikasikan.</p>
<form class="card" id="setf" style="display:flex;flex-direction:column;gap:14px">${F.map(([k, l, h]) => `<div class="fld"><label for="s-${k}">${l}</label>${k === 'address' ? `<textarea id="s-${k}" name="${k}" style="min-height:70px">${esc(s[k])}</textarea>` : `<input id="s-${k}" name="${k}" value="${esc(s[k])}">`}${h ? `<p class="hint">${h}</p>` : ''}</div>`).join('')}
<p class="err-line" id="set-err"></p><div class="tools"><button class="btn primary" type="submit">Simpan pengaturan</button></div></form>`;
    $('#setf').onsubmit = async e => {
      e.preventDefault(); const f = e.target, row = Object.fromEntries(F.map(([k]) => [k, f.elements[k].value.trim()]));
      row.wa = row.wa.replace(/\D/g, '').replace(/^0/, '62');
      try { await call('admin_save', { p_entity: 'settings', p_row: row }); toast('Tersimpan. Tekan Publikasikan agar tampil di situs.'); route(); } catch (x) { $('#set-err').textContent = x.message; }
    };
  },
  async hero() {
    const rows = LISTS.hero = await call('admin_list', { p_entity: 'hero' });
    view.innerHTML = `<div class="head"><h1>Hero Beranda</h1><button class="btn primary" type="button" id="add">+ Tambah slide</button></div><p class="sub">Slide besar di atas Beranda, berganti setiap 6 detik. Urutan kecil tampil lebih dulu. Simpan, lalu Publikasikan.</p>
<div class="tools"><input class="search" type="search" placeholder="Cari judul…" aria-label="Cari"></div><p class="count"></p><div class="list"></div><button class="btn more" type="button" hidden>Tampilkan lebih banyak</button>`;
    $('#add').onclick = () => edit('hero', null, route);
    listing({ rows: () => rows, match: r => `${r.title?.id} ${r.eyebrow?.id}`,
      item: (r, i) => `<button type="button" class="item" data-i="${i}">${r.kind === 'dpo' ? `<span class="th ph" style="background:#07090F;color:#FF5A5A">${I(IC.search, 24)}</span>` : thumb(r.image_url)}<span class="tx"><b>${esc(r.title?.id || 'Tanpa judul')}</b><span>${r.kind === 'dpo' ? 'Pencarian orang (lampu berkedip)' : esc(r.eyebrow?.id || '')} · urutan ${r.sort}</span></span>${r.active ? '<span class="pill">Tampil</span>' : '<span class="pill off">Disembunyikan</span>'}</button>`,
      open: r => edit('hero', r, route) });
  },
  async layanan() {
    const rows = LISTS.services = await call('admin_list', { p_entity: 'services' });
    view.innerHTML = `<div class="head"><h1>Layanan</h1><button class="btn primary" type="button" id="add">+ Tambah layanan</button></div><p class="sub">Kartu layanan di Beranda, halaman Layanan, dan pilihan formulir booking. Ubah persyaratan dan alur di sini. Simpan, lalu Publikasikan.</p>
<div class="tools"><input class="search" type="search" placeholder="Cari layanan…" aria-label="Cari"></div><p class="count"></p><div class="list"></div><button class="btn more" type="button" hidden>Tampilkan lebih banyak</button>`;
    $('#add').onclick = () => edit('services', null, route);
    listing({ rows: () => rows, match: r => `${r.name?.id} ${r.title?.id}`,
      item: (r, i) => `<button type="button" class="item" data-i="${i}"><span class="th ph round">${I({ search: IC.search, chat: IC.inbox, doc: IC.news, calendar: IC.cal, users: IC.users }[r.icon] || IC.log, 24)}</span><span class="tx"><b>${esc(r.name?.id)}</b><span>${esc(r.title?.id || '')} · ${r.sections.length} bagian · urutan ${r.sort}</span></span>${r.bookable ? '<span class="pill blue">Bisa booking</span>' : ''}${r.active ? '<span class="pill">Tampil</span>' : '<span class="pill off">Disembunyikan</span>'}</button>`,
      open: r => edit('services', r, route) });
  },
  async teks() {
    const rows = await call('admin_list', { p_entity: 'texts' });
    const pages = [...new Set(rows.map(r => r.page))];
    let pg = pages[0], only = false;
    view.innerHTML = `<div class="head"><h1>Teks situs</h1></div><p class="sub">Semua kalimat di halaman situs. Ubah langsung di kotak; tersimpan otomatis saat Anda pindah kotak. Kolom EN dan NGAJU yang kosong memakai teks Indonesia. Setelah selesai, Publikasikan.</p>
<div id="tabs"></div><div class="tools"><input class="search" type="search" placeholder="Cari di semua halaman…" aria-label="Cari"><label class="toggle" style="gap:10px;font-weight:600"><input type="checkbox" id="only"> Hanya yang belum diterjemahkan</label></div>
<p class="count"></p><div class="txts" id="txts"></div>`;
    const q = $('.search', view), box = $('#txts');
    const drawTabs = () => $('#tabs').innerHTML = tabsHtml(pages.map(p => [p, p, rows.filter(r => r.page === p).length]), q.value ? '' : pg);
    const draw = () => {
      const t = q.value.trim().toLowerCase();
      const xs = rows.filter(r => (t ? `${r.key} ${r.id} ${r.en} ${r.nij}`.toLowerCase().includes(t) : r.page === pg) && (!only || !r.en || !r.nij));
      $('.count', view).textContent = `${xs.length} kalimat`;
      box.innerHTML = xs.map(r => `<div class="txt${r.id !== r.key ? ' changed' : ''}" data-k="${esc(r.key)}">${LANGS.map(([l, n]) => `<label><span>${n}</span><textarea data-l="${l}" rows="${Math.min(6, Math.ceil(((r[l] || r.id).length + 1) / 44))}"${l === 'id' ? '' : ` placeholder="${esc(r.id)}"`}>${esc(r[l])}</textarea></label>`).join('')}<div class="txt-f"><small class="st"></small>${r.id !== r.key ? `<button class="link" type="button" data-reset title="${esc(r.key)}">Kembalikan teks asli</button>` : ''}</div></div>`).join('') || '<div class="empty">Tidak ada.</div>';
    };
    const save = async el => {
      const card = el.closest('.txt'), r = rows.find(x => x.key === card.dataset.k), st = $('.st', card);
      const row = { key: r.key, id: $('[data-l=id]', card).value, en: $('[data-l=en]', card).value, nij: $('[data-l=nij]', card).value };
      if (row.id === r.id && row.en === r.en && row.nij === r.nij) return;
      st.textContent = 'Menyimpan…';
      try { Object.assign(r, await call('admin_save', { p_entity: 'texts', p_row: row })); st.textContent = 'Tersimpan'; card.classList.toggle('changed', r.id !== r.key); D.unpublished = (D.unpublished || 0) + 1; menu(); }
      catch (x) { st.textContent = x.message; }
    };
    box.addEventListener('change', e => e.target.matches('textarea') && save(e.target));
    box.addEventListener('click', async e => {
      const b = e.target.closest('[data-reset]'); if (!b) return;
      const card = b.closest('.txt'); $('[data-l=id]', card).value = card.dataset.k; await save($('[data-l=id]', card)); draw();
    });
    $('#tabs').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { pg = b.dataset.f; q.value = ''; drawTabs(); draw(); } };
    q.oninput = () => { drawTabs(); draw(); };
    $('#only').onchange = e => { only = e.target.checked; draw(); };
    drawTabs(); draw();
  },
  async desa() {
    let rows = await call('admin_list', { p_entity: 'villages' });
    view.innerHTML = `<div class="head"><h1>Desa dan Bhabinkamtibmas</h1><button class="btn primary" type="button" id="add">+ Tambah desa</button></div><p class="sub">Daftar desa di bagian Peta wilayah Beranda. Jumlah desa dihitung otomatis. Tersimpan saat Anda pindah kotak; lalu Publikasikan.</p>
<div class="tblwrap"><table class="tbl"><thead><tr><th>Urutan</th><th>Desa</th><th>Bhabinkamtibmas</th><th></th></tr></thead><tbody id="vl"></tbody></table></div>`;
    const draw = () => $('#vl').innerHTML = rows.map(v => `<tr data-id="${v.id}"><td style="width:90px"><input type="number" data-f="sort" value="${v.sort}" style="width:70px" aria-label="Urutan"></td><td><input data-f="name" value="${esc(v.name)}" aria-label="Nama desa"></td><td><input data-f="bhabin" value="${esc(v.bhabin)}" placeholder="Nama dan pangkat" aria-label="Bhabinkamtibmas"></td><td><button class="link red" type="button" data-del>Hapus</button></td></tr>`).join('');
    draw();
    $('#vl').addEventListener('change', async e => {
      const tr = e.target.closest('tr'), v = rows.find(x => x.id === tr.dataset.id), f = e.target.dataset.f;
      try { Object.assign(v, await call('admin_save', { p_entity: 'villages', p_row: { id: v.id, [f]: f === 'sort' ? +e.target.value : e.target.value.trim() } })); toast('Tersimpan.'); D.unpublished = (D.unpublished || 0) + 1; menu(); if (f === 'sort') { rows.sort((a, b) => a.sort - b.sort); draw(); } }
      catch (x) { toast(x.message); }
    });
    $('#vl').addEventListener('click', e => { const b = e.target.closest('[data-del]'); if (b) { const id = b.closest('tr').dataset.id; del(b, 'villages', id, () => { rows = rows.filter(x => x.id !== id); draw(); }); } });
    $('#add').onclick = async () => {
      try { rows.push(await call('admin_save', { p_entity: 'villages', p_row: { name: 'Desa baru', sort: (rows.at(-1)?.sort || 0) + 1 } })); draw(); $('#vl tr:last-child [data-f=name]').select(); }
      catch (x) { toast(x.message); }
    };
  },
  booking: () => inbox('bookings'),
  pengaduan: () => inbox('reports'),
  async berita() {
    const rows = await call('admin_list', { p_entity: 'posts' }); let tab = 'all';
    view.innerHTML = `<div class="head"><h1>Berita dan imbauan</h1><button class="btn primary" type="button" id="add">+ Tulis berita atau imbauan</button></div>
<p class="sub">Yang tampil di halaman Beranda dan Berita. Berita terbaru otomatis menjadi berita utama.</p>
<div id="tabs"></div><div class="tools"><input class="search" type="search" placeholder="Cari berita dan imbauan…" aria-label="Cari"></div>
<p class="count"></p><div class="list"></div><button class="btn more" type="button" hidden>Tampilkan lebih banyak</button>`;
    const drawTabs = () => $('#tabs').innerHTML = tabsHtml([['all', 'Semua', rows.length], ['berita', 'Berita', rows.filter(r => r.kind === 'berita').length], ['imbauan', 'Imbauan', rows.filter(r => r.kind === 'imbauan').length]], tab);
    drawTabs(); $('#tabs').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { tab = b.dataset.f; drawTabs(); draw(); } };
    $('#add').onclick = () => edit('posts', null, route);
    const draw = listing({
      rows: () => rows, filter: r => tab === 'all' || r.kind === tab, match: r => `${r.title} ${r.summary ?? ''} ${r.place ?? ''}`,
      item: (r, i) => `<button type="button" class="item" data-i="${i}">${thumb(r.image_url)}<span class="tx"><b>${esc(r.title)}</b><span>${esc(r.date_label || r.published_on)}${r.place ? ' · ' + esc(r.place) : ''}</span></span>${r.kind === 'imbauan' ? '<span class="pill yel">Imbauan</span>' : ''}${r.published ? '<span class="pill">Tampil</span>' : '<span class="pill off">Draf</span>'}</button>`,
      open: r => edit('posts', r, route),
    });
  },
  async pencarian() {
    const rows = await call('admin_list', { p_entity: 'wanted' }); let tab = 'polsek';
    const SRC = { polsek: 'Polsek', kejati: 'Kejati Kalteng', pusiknas: 'Pusiknas Polri' };
    view.innerHTML = `<div class="head"><h1>Pencarian orang</h1><button class="btn primary" type="button" id="add">+ Terbitkan DPO atau orang hilang</button></div>
<p class="sub">Data terbitan Polsek bisa diubah dan dihapus. Data Kejati dan Pusiknas disalin otomatis tiap minggu: bisa disembunyikan atau dihapus, tetapi isinya mengikuti situs sumber.</p>
<div id="tabs"></div><div class="tools"><input class="search" type="search" placeholder="Cari nama atau tindak pidana…" aria-label="Cari"></div>
<p class="count"></p><div class="list"></div><button class="btn more" type="button" hidden>Tampilkan lebih banyak</button>`;
    const drawTabs = () => $('#tabs').innerHTML = tabsHtml(Object.entries(SRC).map(([k, v]) => [k, v, rows.filter(r => r.source === k).length]), tab);
    drawTabs(); $('#tabs').onclick = e => { const b = e.target.closest('[data-f]'); if (b) { tab = b.dataset.f; drawTabs(); draw(); } };
    $('#add').onclick = () => edit('wanted', null, route);
    const draw = listing({
      rows: () => rows, filter: r => r.source === tab, match: r => `${r.name} ${r.crime ?? ''} ${r.detail ?? ''}`,
      empty: tab === 'polsek' ? 'Belum ada DPO atau orang hilang yang diterbitkan Polsek.' : 'Belum ada data.',
      item: (r, i) => `<button type="button" class="item" data-i="${i}">${thumb(r.photo_url, true)}<span class="tx"><b>${esc(r.name)}</b><span>${esc(r.crime || r.detail || '')}</span></span><span class="pill ${r.kind === 'dpo' ? 'red' : 'yel'}">${r.kind === 'dpo' ? 'DPO' : 'Orang hilang'}</span>${r.published ? '<span class="pill">Tampil</span>' : '<span class="pill off">Disembunyikan</span>'}</button>`,
      open: r => {
        if (r.source === 'polsek') return edit('wanted', r, route);
        drawer(`DPO · ${SRC[r.source].toUpperCase()}`, r.name,
          `${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="" referrerpolicy="no-referrer" style="width:200px;border-radius:12px">` : ''}<dl class="kv"><dt>Tindak pidana</dt><dd>${esc(r.crime || '-')}</dd><dt>Keterangan</dt><dd>${esc(r.detail || '-')}</dd><dt>Tampil di situs</dt><dd>${r.published ? 'Ya' : 'Tidak (disembunyikan)'}</dd></dl><p class="hint muted">Data yang dihapus akan muncul lagi pada sinkron berikutnya jika masih ada di situs sumber. Untuk menyembunyikan permanen, gunakan Sembunyikan.</p>`,
          `<button class="btn primary" type="button" id="vis">${r.published ? 'Sembunyikan dari situs' : 'Tampilkan di situs'}</button><a class="btn" href="${esc(r.source_url)}" target="_blank" rel="noopener">Lihat di sumber ↗</a><span class="spacer"></span><button class="btn danger" type="button" id="dr-del">Hapus</button>`);
        $('#vis').onclick = async () => { try { Object.assign(r, await call('admin_save', { p_entity: 'wanted', p_row: { id: r.id, published: !r.published } })); dr.close(); toast(r.published ? 'Ditampilkan.' : 'Disembunyikan.'); draw(); } catch (x) { toast(x.message); } };
        $('#dr-del').onclick = e => del(e.currentTarget, 'wanted', r.id, () => { rows.splice(rows.indexOf(r), 1); drawTabs(); draw(); });
      },
    });
  },
  async personel() {
    const rows = LISTS.personnel = await call('admin_list', { p_entity: 'personnel' });
    const G = { kapolsek: 'Kapolsek', wakil: 'Wakil pimpinan', unit: 'Kepala unit dan seksi', kaspkt: 'KA SPKT', banit: 'Banit', bhabin: 'Bhabinkamtibmas' };
    view.innerHTML = `<div class="head"><h1>Personel</h1><button class="btn primary" type="button" id="add">+ Tambah personel</button></div>
<p class="sub">Tampil di halaman Profil, bagian Struktur organisasi. Isian yang masih di dalam [ kurung ] adalah placeholder yang perlu diganti.</p>
<div class="tools"><input class="search" type="search" placeholder="Cari nama atau jabatan…" aria-label="Cari"></div>
<p class="count"></p><div class="list"></div><button class="btn more" type="button" hidden>Tampilkan lebih banyak</button>`;
    $('#add').onclick = () => edit('personnel', null, route);
    listing({
      rows: () => rows, match: r => `${r.jabatan} ${r.name} ${r.description ?? ''}`,
      item: (r, i) => `<button type="button" class="item" data-i="${i}">${thumb(r.photo_url, true)}<span class="tx"><b>${esc(r.name)}</b><span>${esc(G[r.grp] || r.grp || 'Tanpa kelompok')} · ${esc(r.jabatan)}</span></span>${/^\[/.test(r.name) || /^\[/.test(r.description || '') ? '<span class="pill red">Perlu diisi</span>' : '<span class="pill">Tampil</span>'}</button>`,
      open: r => edit('personnel', r, route),
    });
  },
  async log() {
    let rows = await call('admin_list', { p_entity: 'log' });
    view.innerHTML = `<div class="head"><h1>Log</h1></div><p class="sub">Semua tindakan di konsol tercatat atas nama pemegang kode. Hanya Kapolsek dan Owner yang bisa melihat halaman ini.</p>
<div class="tools"><input class="search" type="search" placeholder="Cari nama, tindakan, atau detail…" aria-label="Cari"></div><p class="count"></p>
<div class="tblwrap"><table class="tbl"><thead><tr><th>Waktu</th><th>Oleh</th><th>Tindakan</th><th>Detail</th><th></th></tr></thead><tbody id="lg"></tbody></table></div><button class="btn more" type="button" hidden>Tampilkan lebih banyak</button>`;
    const q = $('.search', view), more = $('.more', view); let shown = 100, xs = [];
    const draw = () => {
      const t = q.value.trim().toLowerCase();
      xs = rows.filter(r => !t || `${r.admin_name} ${r.action} ${r.entity} ${r.detail?.judul ?? ''}`.toLowerCase().includes(t));
      $('.count', view).textContent = `${xs.length} catatan`;
      $('#lg').innerHTML = xs.slice(0, shown).map((r, i) => `<tr><td style="white-space:nowrap">${dt(r.at)}</td><td>${esc(r.admin_name || '-')}</td><td>${esc(r.action)} <small>${esc({ bookings: 'booking', reports: 'pengaduan', posts: 'berita', wanted: 'pencarian orang', personnel: 'personel', admins: 'kode akses', log: 'log' }[r.entity] || r.entity || '')}</small></td><td>${esc(r.detail?.judul || '–')}</td><td><button class="link red" type="button" data-i="${i}">Hapus</button></td></tr>`).join('') || '<tr><td colspan="5">Belum ada catatan.</td></tr>';
      more.hidden = xs.length <= shown;
    };
    q.oninput = draw; more.onclick = () => { shown += 200; draw(); };
    $('#lg').onclick = e => { const b = e.target.closest('[data-i]'); if (b) { const r = xs[+b.dataset.i]; del(b, 'log', r.id, () => { rows = rows.filter(x => x !== r); draw(); }); } };
    draw();
  },
  async akses() {
    const rows = await call('admin_list', { p_entity: 'admins' });
    const canManage = t => t.id !== me.id && t.role !== 'owner' && (me.role === 'owner' || t.role === 'staff');
    const canRegen = t => me.role === 'owner' || t.role === 'staff' || t.id === me.id;
    view.innerHTML = `<div class="head"><h1>Kode akses</h1></div><p class="sub">Setiap orang mendapat kode sendiri. Kode hanya tampil sekali saat dibuat; buat kode baru bila hilang. Kode baru atau pencabutan langsung mengeluarkan orang tersebut dari konsol.</p>
<section class="card"><h2>Buat kode akses</h2><form class="form-row" id="new-a" style="margin-top:12px"><input name="name" placeholder="Nama lengkap dan pangkat" required aria-label="Nama"><select name="role" aria-label="Peran"><option value="staff">Staf</option>${me.role === 'owner' ? '<option value="kapolsek">Kapolsek</option>' : ''}</select><button class="btn primary" type="submit">Buat kode</button></form>
<p class="hint muted" style="margin:10px 0 0">Staf: mengelola booking, pengaduan, berita, pencarian orang, dan personel. Kapolsek: sama, ditambah Log dan Kode akses.</p></section>
<div id="code-out"></div>
<div class="tblwrap"><table class="tbl"><thead><tr><th>Nama</th><th>Peran</th><th>Kode berakhiran</th><th>Terakhir masuk</th><th>Status</th><th></th></tr></thead><tbody>${rows.map(t => `<tr><td><b>${esc(t.name)}</b>${t.id === me.id ? ' <span class="muted">(Anda)</span>' : ''}<small>dibuat ${dt(t.created_at)}</small></td><td><span class="role ${t.role}">${ROLE[t.role]}</span></td><td class="mono">${t.code_tail ? '…' + esc(t.code_tail) : '—'}</td><td>${dt(t.last_login_at)}</td><td>${t.active ? '<span class="pill">Aktif</span>' : '<span class="pill off">Dicabut</span>'}</td><td><div class="acts">${canRegen(t) ? `<button class="link" type="button" data-regen="${t.id}">Kode baru</button>` : ''}${canManage(t) ? `<button class="link" type="button" data-act="${t.id}" data-on="${!t.active}">${t.active ? 'Cabut' : 'Pulihkan'}</button><button class="link red" type="button" data-del="${t.id}">Hapus</button>` : ''}</div></td></tr>`).join('')}</tbody></table></div>
<p class="hint muted">Kode Owner yang hilang hanya bisa direset dari backend: jalankan <code>select app.reset_owner_code();</code> di SQL Editor Supabase.</p>`;
    const show = (name, code, self) => {
      $('#code-out').innerHTML = `<div class="codebox"><div><small>Kode akses untuk ${esc(name)} — tampil sekali saja</small><br><code>${code}</code></div><button class="btn gold" type="button" id="copy">Salin kode</button></div>${self ? '<p class="notice">Kode Anda sudah diganti. Simpan kode baru ini; Anda akan keluar otomatis dalam 30 detik.</p>' : ''}`;
      $('#copy').onclick = () => navigator.clipboard.writeText(code).then(() => toast('Kode disalin.'));
      $('#code-out').scrollIntoView({ block: 'center', behavior: 'smooth' });
    };
    $('#new-a').onsubmit = async e => {
      e.preventDefault(); const f = e.target, name = f.name.value.trim(); if (!name) return toast('Isi nama.');
      try { const c = await call('admin_create', { p_name: name, p_role: f.role.value }); await VIEWS.akses(); show(name, c); } catch (x) { toast(x.message); }
    };
    view.onclick = async e => {
      const g = e.target.closest('[data-regen]'), a = e.target.closest('[data-act]'), d = e.target.closest('[data-del]');
      const t = rows.find(x => x.id === (g || a || d)?.dataset[g ? 'regen' : a ? 'act' : 'del']);
      if (!t) return;
      try {
        if (g) {
          const c = await call('admin_regen', { p_id: t.id });
          // own code: the session ends with it, so show the new code first and sign out after a moment
          if (t.id === me.id) { show(t.name, c, true); setTimeout(() => signOut('Kode Anda sudah diganti. Masuk dengan kode baru.'), 30000); }
          else { await VIEWS.akses(); show(t.name, c); }
        }
        if (a) { await call('admin_set_active', { p_id: t.id, p_active: a.dataset.on === 'true' }); toast(a.dataset.on === 'true' ? 'Akses dipulihkan.' : 'Akses dicabut.'); VIEWS.akses(); }
        if (d) del(d, 'admins', t.id, () => VIEWS.akses());
      } catch (x) { toast(x.message); }
    };
  },
};
