// Console: access-code login, sidebar pages (hash routes), inbox for bookings and complaints,
// slide-over editor for content, tables for log and access codes. Every row can be deleted.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $('#view'), dr = $('#drawer'), drBody = $('#dr-body'), drFoot = $('#dr-foot');
let token = sessionStorage.getItem('pkt-token'), me = null, D = {};

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
  ['LAYANAN'], ['booking', 'Booking kunjungan', IC.cal, 'bookings_new'], ['pengaduan', 'Pengaduan', IC.inbox, 'reports_new'],
  ['KONTEN SITUS'], ['berita', 'Berita dan imbauan', IC.news], ['pencarian', 'Pencarian orang', IC.search], ['personel', 'Personel', IC.users],
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

// ---------- edit forms (posts, wanted, personnel) ----------
const FORMS = {
  posts: { kicker: ['TAMBAH BERITA', 'UBAH BERITA'], title: 'title', f: [
    ['kind', 'Jenis', 'select', { berita: 'Berita kegiatan', imbauan: 'Imbauan kamtibmas' }],
    ['title', 'Judul', 'textarea-s', null, true, 'Tulis seperti judul berita, kalimat biasa (huruf besar hanya di awal dan nama).'],
    ['summary', 'Ringkasan', 'textarea', null, false, 'Satu atau dua kalimat yang tampil di kartu berita.'],
    ['two', [['date_label', 'Tanggal tampil', 'text', null, false, 'Contoh: 5 November 2026 atau Musim kemarau 2026'], ['published_on', 'Tanggal terbit', 'date', null, true, 'Menentukan urutan; terbaru di atas.']]],
    ['place', 'Lokasi', 'text', null, false, 'Contoh: Desa Pujon'],
    ['image_url', 'Foto utama', 'image'],
    ['source_url', 'Tautan berita lengkap', 'text', null, false, 'Opsional, misalnya artikel di analisnews.co.id. Kosongkan untuk imbauan.'],
    ['published', 'Tampilkan di situs', 'toggle', null, false, 'Mati = disimpan sebagai draf, tidak tampil di situs.'],
  ] },
  wanted: { kicker: ['TERBITKAN PENCARIAN', 'UBAH PENCARIAN'], title: 'name', f: [
    ['kind', 'Jenis', 'select', { dpo: 'DPO (Daftar Pencarian Orang)', hilang: 'Orang hilang' }],
    ['name', 'Nama lengkap', 'text', null, true],
    ['crime', 'Tindak pidana / keterangan singkat', 'text', null, false, 'DPO: pasal atau jenis tindak pidana. Orang hilang: misalnya "Hilang sejak 3 November 2026".'],
    ['detail', 'Ciri-ciri dan keterangan', 'textarea', null, false, 'Ciri fisik, pakaian terakhir, lokasi terakhir terlihat, nomor yang bisa dihubungi.'],
    ['photo_url', 'Foto', 'image'],
    ['published', 'Tampilkan di situs', 'toggle', null, false, 'Matikan bila orang sudah ditemukan atau ditangkap, atau hapus datanya.'],
  ] },
  personnel: { kicker: ['TAMBAH PERSONEL', 'UBAH PERSONEL'], title: 'name', f: [
    ['name', 'Nama lengkap dengan pangkat dan gelar', 'text', null, true],
    ['two', [['grp', 'Kelompok', 'select', { kapolsek: 'Kapolsek', wakil: 'Wakil pimpinan', unit: 'Kepala unit dan seksi', bhabin: 'Bhabinkamtibmas' }], ['jabatan', 'Jabatan', 'text', null, true, 'Contoh: Kanit Reskrim']]],
    ['description', 'Keterangan', 'textarea', null, false, 'Tugas singkat, atau desa binaan untuk Bhabinkamtibmas. Untuk Kapolsek: profil singkat.'],
    ['photo_url', 'Foto', 'image'],
    ['sort', 'Urutan', 'number', null, false, 'Angka kecil tampil lebih dulu.'],
  ] },
};
const flat = f => f.flatMap(x => x[0] === 'two' ? x[1] : [x]);
function field([k, label, type, opts, req, hint], v) {
  const L = `<label for="e-${k}">${label}${req ? ' <span class="req">*</span>' : ''}</label>`, H = hint ? `<p class="hint">${hint}</p>` : '';
  if (type === 'select') return `<div class="fld">${L}<select id="e-${k}" name="${k}">${Object.entries(opts).map(([a, b]) => `<option value="${a}"${a === v ? ' selected' : ''}>${b}</option>`).join('')}</select>${H}</div>`;
  if (type === 'textarea' || type === 'textarea-s') return `<div class="fld">${L}<textarea id="e-${k}" name="${k}"${type === 'textarea-s' ? ' style="min-height:90px"' : ''}>${esc(v)}</textarea>${H}</div>`;
  if (type === 'toggle') return `<div class="fld"><span style="font-weight:800">${label}</span><label class="toggle"><input type="checkbox" name="${k}"${v ? ' checked' : ''}><span>${v ? 'Ya' : 'Tidak'}</span></label>${H}</div>`;
  if (type === 'image') return `<div class="fld"><span style="font-weight:800">${label}</span><div class="photo"><div class="box" style="${v ? `background-image:url('${esc(v)}')` : ''}">${v ? '' : 'Belum ada foto'}</div><div class="ctl"><label class="btn" style="align-self:flex-start">${I(IC.img, 18)}Pilih foto<input type="file" name="${k}__file" accept="image/*" hidden></label><input name="${k}" value="${esc(v)}" placeholder="atau tempel tautan foto" style="min-height:46px;border:1px solid var(--line);border-radius:12px;padding:0 14px"><p class="hint">JPG, PNG, atau WebP, maksimal 10 MB.</p></div></div></div>`;
  return `<div class="fld">${L}<input id="e-${k}" name="${k}" type="${type}" value="${esc(v)}">${H}</div>`;
}
function edit(entity, r, done) {
  const F = FORMS[entity], isNew = !r;
  r = r || { published: true, published_on: today(), kind: entity === 'wanted' ? 'dpo' : 'berita', grp: 'unit', sort: (D.personnel || 0) + 1 };
  const val = k => r[k] ?? '';
  drawer(F.kicker[isNew ? 0 : 1], isNew ? 'Tanpa judul' : r[F.title],
    `<form id="ef" class="dr-form" novalidate style="display:flex;flex-direction:column;gap:18px">${F.f.map(x => x[0] === 'two' ? `<div class="two">${x[1].map(y => field(y, val(y[0]))).join('')}</div>` : field(x, val(x[0]))).join('')}<p class="err-line" id="ef-err"></p></form>`,
    `<button class="btn primary" type="submit" form="ef">Simpan</button><button class="btn" type="button" data-close>Batal</button><span class="spacer"></span>${isNew ? '' : '<button class="btn danger" type="button" id="ef-del">Hapus</button>'}`);
  const f = $('#ef');
  $$('.toggle input', f).forEach(t => t.onchange = () => t.nextElementSibling.textContent = t.checked ? 'Ya' : 'Tidak');
  $$('input[type=file]', f).forEach(inp => inp.onchange = () => {
    const file = inp.files[0]; if (!file) return;
    const box = inp.closest('.photo').querySelector('.box'); box.textContent = ''; box.style.backgroundImage = `url('${URL.createObjectURL(file)}')`;
  });
  const t = f.elements[F.title]; t.oninput = () => $('#dr-title').textContent = t.value.trim() || 'Tanpa judul';
  if ($('#ef-del')) $('#ef-del').onclick = e => del(e.currentTarget, entity, r.id, done);
  f.onsubmit = async e => {
    e.preventDefault();
    const err = $('#ef-err'), b = $('[form=ef][type=submit]'); err.textContent = '';
    try {
      const row = { id: r.id || '' };
      for (const [k, label, type, , req] of flat(F.f)) {
        const el = f.elements[k];
        row[k] = type === 'toggle' ? el.checked : el.value.trim();
        if (req && !row[k]) throw new Error(`Isi ${label.toLowerCase()}.`);
        const file = type === 'image' && f.elements[k + '__file'].files[0];
        if (file) {
          if (file.size > 10 * 1024 * 1024) throw new Error('Foto maksimal 10 MB.');
          b.disabled = true; b.textContent = 'Mengunggah foto…';
          const u = await fn({ action: 'upload', name: safeName(file.name) });
          const put = await fetch(u.signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          if (!put.ok) throw new Error('Unggah foto gagal. Coba lagi.');
          row[k] = u.publicUrl; // shortcut: a replaced photo stays in storage until the row is deleted
        }
      }
      b.disabled = true; b.textContent = 'Menyimpan…';
      await call('admin_save', { p_entity: entity, p_row: row });
      dr.close(); toast(isNew ? 'Ditambahkan.' : 'Perubahan disimpan.'); done();
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
    const rows = await call('admin_list', { p_entity: 'personnel' });
    const G = { kapolsek: 'Kapolsek', wakil: 'Wakil pimpinan', unit: 'Kepala unit dan seksi', bhabin: 'Bhabinkamtibmas' };
    view.innerHTML = `<div class="head"><h1>Personel</h1><button class="btn primary" type="button" id="add">+ Tambah personel</button></div>
<p class="sub">Tampil di halaman Profil, bagian Struktur organisasi. Isian yang masih di dalam [ kurung ] adalah placeholder yang perlu diganti.</p>
<div class="tools"><input class="search" type="search" placeholder="Cari nama atau jabatan…" aria-label="Cari"></div>
<p class="count"></p><div class="list"></div><button class="btn more" type="button" hidden>Tampilkan lebih banyak</button>`;
    $('#add').onclick = () => edit('personnel', null, route);
    listing({
      rows: () => rows, match: r => `${r.jabatan} ${r.name} ${r.description ?? ''}`,
      item: (r, i) => `<button type="button" class="item" data-i="${i}">${thumb(r.photo_url, true)}<span class="tx"><b>${esc(r.name)}</b><span>${G[r.grp]} · ${esc(r.jabatan)}</span></span>${/^\[/.test(r.name) || /^\[/.test(r.description || '') ? '<span class="pill red">Perlu diisi</span>' : '<span class="pill">Tampil</span>'}</button>`,
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
