// Console: access-code login, lists for every table, edit forms, and a delete button on every row.
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $('#view'), dlg = $('#edit'), ef = $('#edit-f');
let token = sessionStorage.getItem('pkt-token'), me = null, cur = 'dashboard';

const toast = m => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 3500); };
const call = (name, args = {}) => rpc(name, { p_token: token, ...args }).catch(e => { if (/Sesi berakhir/.test(e.message)) out(); throw e; });
const fn = (name, body) => sb('/functions/v1/' + name, { method: 'POST', body: JSON.stringify({ token, ...body }) });
const boss = () => ['owner', 'kapolsek'].includes(me?.role);
const dt = d => d ? new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';
const day = d => new Date(d + 'T00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const wa = hp => hp ? `https://wa.me/${hp.replace(/^0/, '62')}` : null;
const ROLE = { owner: 'Owner', kapolsek: 'Kapolsek', staff: 'Staf' };
const delBtn = (entity, id) => `<button type="button" class="del" data-del="${entity}" data-id="${esc(id)}">Hapus</button>`;

// ---------- login ----------
$('#login-f').onsubmit = async e => {
  e.preventDefault();
  const err = $('#login-f .err'), b = $('#login-f button'); err.textContent = ''; b.disabled = true;
  try { const r = await rpc('admin_login', { p_code: $('#code').value }); token = r.token; sessionStorage.setItem('pkt-token', token); start(r); }
  catch (x) { err.textContent = x.message; } finally { b.disabled = false; }
};
async function out() { if (token) rpc('admin_logout', { p_token: token }).catch(() => {}); token = null; sessionStorage.removeItem('pkt-token'); $('#app').hidden = true; $('#login').hidden = false; $('#code').value = ''; }
$('#logout').onclick = out;
function start(m) {
  me = m; $('#login').hidden = true; $('#app').hidden = false;
  $('#who').textContent = `${m.name} · ${ROLE[m.role]}`;
  $$('[data-boss]').forEach(b => b.hidden = !boss());
  go(cur);
}
(async () => { if (!token) return $('#login').hidden = false; try { start(await call('admin_me')); } catch { $('#login').hidden = false; } })();

// ---------- navigation ----------
$('#menu').onclick = e => { const b = e.target.closest('[data-v]'); if (b) go(b.dataset.v); };
async function go(v) {
  cur = v; $$('#menu button').forEach(b => b.setAttribute('aria-current', b.dataset.v === v));
  view.onclick = null; view.innerHTML = '<p class="count">Memuat…</p>';
  try { await VIEWS[v](); } catch (x) { view.innerHTML = `<div class="empty-a">${esc(x.message)}</div>`; }
}

// two-step delete: first tap arms the button, second tap deletes (row and its files)
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-del]'); if (!b) return;
  if (!b.classList.contains('sure')) { b.classList.add('sure'); b.textContent = 'Yakin hapus?'; setTimeout(() => { b.classList.remove('sure'); b.textContent = 'Hapus'; }, 4000); return; }
  b.disabled = true; b.textContent = 'Menghapus…';
  try {
    const r = await fn('admin-files', { action: 'delete', entity: b.dataset.del, id: b.dataset.id });
    b.closest('.row')?.remove(); toast(r.warn?.length ? 'Data terhapus, sebagian berkas gagal dihapus.' : 'Data terhapus.');
    LISTS[b.dataset.del] = LISTS[b.dataset.del]?.filter(x => String(x.id) !== b.dataset.id);
  } catch (x) { toast(x.message); b.disabled = false; b.classList.remove('sure'); b.textContent = 'Hapus'; }
});

// ---------- generic list with search and paging ----------
const LISTS = {};
function list({ title, entity, rows, row, filters = '', add = '', match, keep }) {
  LISTS[entity] = rows;
  view.innerHTML = `<h1>${title}</h1><div class="bar">${add}<input class="grow" type="search" placeholder="Cari" aria-label="Cari">${filters}</div><p class="count"></p><div class="rows"></div><button class="btn more" type="button" hidden style="align-self:center">Tampilkan lebih banyak</button>`;
  const box = $('.rows', view), q = $('input[type=search]', view), more = $('.more', view);
  let shown = 50;
  const draw = () => {
    const t = q.value.trim().toLowerCase();
    const xs = LISTS[entity].filter(r => (!keep || keep(r)) && (!t || match(r).toLowerCase().includes(t)));
    $('.count', view).textContent = `${xs.length} data`;
    box.innerHTML = xs.slice(0, shown).map(row).join('') || '<div class="empty-a">Belum ada data.</div>';
    more.hidden = xs.length <= shown;
  };
  q.oninput = () => { shown = 50; draw(); };
  more.onclick = () => { shown += 100; draw(); };
  $$('.bar select', view).forEach(s => s.onchange = () => { shown = 50; draw(); });
  draw();
  return draw;
}
const card = ({ img, meta, h, p = [], acts, off }) => `<article class="row${off ? ' off' : ''}">${img === undefined ? '<span class="noimg"></span>' : img ? `<img class="thumb" src="${esc(img)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">` : '<span class="thumb"></span>'}<div><div class="meta">${meta}</div><h3>${h}</h3>${p.filter(Boolean).map(x => `<p>${x}</p>`).join('')}</div><div class="acts">${acts}</div></article>`;

// ---------- edit form ----------
const FORMS = {
  posts: { t: 'BERITA / IMBAUAN', f: [['kind', 'Jenis', 'select', { berita: 'Berita', imbauan: 'Imbauan' }], ['title', 'Judul', 'text'], ['summary', 'Ringkasan', 'textarea'], ['date_label', 'Keterangan tanggal (tampil di kartu)', 'text'], ['published_on', 'Tanggal terbit (untuk urutan)', 'date'], ['place', 'Lokasi', 'text'], ['source_url', 'Tautan sumber berita (opsional)', 'text'], ['image_url', 'Foto', 'image'], ['published', 'Tampilkan di situs', 'check']] },
  wanted: { t: 'PENCARIAN ORANG', f: [['kind', 'Jenis', 'select', { dpo: 'DPO', hilang: 'Orang hilang' }], ['name', 'Nama', 'text'], ['crime', 'Tindak pidana / keterangan singkat', 'text'], ['detail', 'Ciri-ciri, lokasi terakhir, kontak keluarga', 'textarea'], ['photo_url', 'Foto', 'image'], ['published', 'Tampilkan di situs', 'check']] },
  personnel: { t: 'PERSONEL', f: [['grp', 'Kelompok', 'select', { kapolsek: 'Kapolsek', wakil: 'Wakil pimpinan', unit: 'Kepala unit dan seksi', bhabin: 'Bhabinkamtibmas' }], ['jabatan', 'Jabatan', 'text'], ['name', 'Nama dan pangkat', 'text'], ['description', 'Keterangan / desa binaan', 'textarea'], ['photo_url', 'Foto', 'image'], ['sort', 'Urutan', 'number']] },
};
function edit(entity, r = {}) {
  const F = FORMS[entity];
  $('#edit-t').textContent = (r.id ? 'UBAH ' : 'TAMBAH ') + F.t;
  ef.innerHTML = F.f.map(([k, l, type, o]) => {
    const v = r[k] ?? (type === 'check' ? true : type === 'date' ? new Date().toISOString().slice(0, 10) : '');
    if (type === 'select') return `<label for="e-${k}">${l}</label><select id="e-${k}" name="${k}">${Object.entries(o).map(([a, b]) => `<option value="${a}"${a === v ? ' selected' : ''}>${b}</option>`).join('')}</select>`;
    if (type === 'textarea') return `<label for="e-${k}">${l}</label><textarea id="e-${k}" name="${k}">${esc(v)}</textarea>`;
    if (type === 'check') return `<label class="check"><input type="checkbox" name="${k}"${v ? ' checked' : ''}> ${l}</label>`;
    if (type === 'image') return `<label for="e-${k}">${l}</label>${v ? `<img class="prev" src="${esc(v)}" alt="">` : ''}<input id="e-${k}" name="${k}" value="${esc(v)}" placeholder="Tautan foto, atau unggah di bawah"><input type="file" name="${k}__file" accept="image/*" aria-label="Unggah foto">`;
    return `<label for="e-${k}">${l}</label><input id="e-${k}" name="${k}" type="${type}" value="${esc(v)}">`;
  }).join('') + '<p class="err" role="alert"></p><button class="btn btn-gold" type="submit">Simpan</button>';
  ef.onsubmit = async e => {
    e.preventDefault();
    const err = $('.err', ef), b = $('[type=submit]', ef); err.textContent = ''; b.disabled = true;
    try {
      const row = { id: r.id || '' };
      for (const [k, , type] of F.f) {
        const el = ef.elements[k];
        row[k] = type === 'check' ? el.checked : el.value.trim();
        const file = type === 'image' && ef.elements[k + '__file'].files[0];
        if (file) {
          if (file.size > 10 * 1024 * 1024) throw new Error('Foto maksimal 10 MB.');
          b.textContent = 'Mengunggah foto…';
          const u = await fn('admin-files', { action: 'upload', name: safeName(file.name) });
          const put = await fetch(u.signedUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });
          if (!put.ok) throw new Error('Unggah foto gagal.');
          row[k] = u.publicUrl; // shortcut: a replaced photo stays in storage; it is removed only when the row is deleted
        }
      }
      if (!(row.title ?? row.name)) throw new Error(entity === 'posts' ? 'Isi judul.' : 'Isi nama.');
      await call('admin_save', { p_entity: entity, p_row: row });
      dlg.close(); toast('Tersimpan.'); go(cur);
    } catch (x) { err.textContent = x.message; } finally { b.disabled = false; b.textContent = 'Simpan'; }
  };
  dlg.showModal();
}
$('.x', dlg).onclick = () => dlg.close();
view.addEventListener('click', e => {
  const b = e.target.closest('[data-edit]'); if (!b) return;
  const ent = b.dataset.edit; edit(ent, LISTS[ent]?.find(x => x.id === b.dataset.id));
});

// ---------- views ----------
const VIEWS = {
  async dashboard() {
    const d = await call('admin_list', { p_entity: 'dashboard' });
    const SRC = { kejati: 'Kejati Kalteng', pusiknas: 'Pusiknas Polri' };
    view.innerHTML = `<h1>Dasbor</h1>
<div class="stats">
<div class="stat"><b>${d.booking_today}</b><span>Booking hari ini</span></div>
<div class="stat"><b>${d.booking_upcoming}</b><span>Booking mendatang</span></div>
<div class="stat"><b>${d.reports_7d}</b><span>Pengaduan 7 hari terakhir</span></div>
<div class="stat"><b>${d.reports_total}</b><span>Total pengaduan</span></div>
<div class="stat"><b>${d.posts}</b><span>Berita dan imbauan</span></div>
<div class="stat"><b>${d.wanted_polsek}</b><span>DPO dan orang hilang (Polsek)</span></div>
<div class="stat"><b>${d.wanted_synced}</b><span>DPO dari sumber resmi</span></div>
</div>
<h2 style="font:900 20px 'Red Hat Display',sans-serif;margin:12px 0 0">Sinkron DPO otomatis</h2>
<p class="count">Berjalan otomatis setiap Senin pukul 03.17 WIB dari Pusiknas Polri dan Kejati Kalimantan Tengah.</p>
<div class="rows">${(d.last_sync || []).map(s => card({ meta: s.ok ? 'Berhasil' : 'Gagal', h: SRC[s.source] || s.source, p: [dt(s.at) + (s.ok ? ` · ${s.items} data` : ''), s.error && esc(s.error)], acts: '' })).join('') || '<div class="empty-a">Belum pernah sinkron.</div>'}</div>
<div class="bar"><button class="btn btn-gold" type="button" id="sync">Sinkron sekarang</button><span class="count" id="sync-m"></span></div>`;
    $('#sync').onclick = async e => {
      e.target.disabled = true; $('#sync-m').textContent = 'Sinkron berjalan, sekitar 1 menit…';
      try { const r = await sb('/functions/v1/dpo-sync', { method: 'POST', body: '{}' }); $('#sync-m').textContent = r.skipped ? 'Baru saja disinkron. Bisa diulang 1 jam setelah sinkron terakhir.' : 'Selesai.'; if (!r.skipped) go('dashboard'); }
      catch (x) { $('#sync-m').textContent = x.message; } finally { e.target.disabled = false; }
    };
  },
  async bookings() {
    const rows = await call('admin_list', { p_entity: 'bookings' }), today = new Date().toLocaleDateString('sv');
    list({
      title: 'Booking kunjungan', entity: 'bookings', rows,
      filters: '<select aria-label="Saring"><option value="up">Hari ini dan mendatang</option><option value="all">Semua</option></select>',
      keep: r => $('.bar select', view).value === 'all' || r.tanggal >= today,
      match: r => `${r.ticket} ${r.nama} ${r.hp} ${r.layanan} ${r.catatan ?? ''}`,
      row: r => card({ meta: `${esc(r.ticket)} · ${esc(r.status)}`, h: `${day(r.tanggal)}, pukul ${r.jam.slice(0, 5).replace(':', '.')} WIB — ${esc(r.layanan)}`, p: [`${esc(r.nama)} · ${esc(r.hp)}`, r.catatan && esc(r.catatan), `Dibuat ${dt(r.created_at)}`], acts: `<a href="${wa(r.hp)}" target="_blank" rel="noopener">WhatsApp</a>${delBtn('bookings', r.id)}` }),
    });
  },
  async reports() {
    const rows = await call('admin_list', { p_entity: 'reports' });
    list({
      title: 'Pengaduan dan pertanyaan', entity: 'reports', rows,
      match: r => `${r.ticket} ${r.kategori} ${r.isi} ${r.desa ?? ''} ${r.nama ?? ''} ${r.hp ?? ''}`,
      row: r => card({ meta: `${esc(r.ticket)} · ${esc(r.status)} · ${dt(r.created_at)}`, h: esc(r.kategori), p: [esc(r.isi), [r.desa && 'Desa ' + esc(r.desa), r.nama ? esc(r.nama) : 'Tanpa nama', r.hp && esc(r.hp)].filter(Boolean).join(' · '), r.files.length && `<span class="files" data-files="${esc(JSON.stringify(r.files))}"><button type="button" class="btn" style="min-height:34px;font-size:13px">Lihat ${r.files.length} lampiran</button></span>`], acts: `${r.hp ? `<a href="${wa(r.hp)}" target="_blank" rel="noopener">WhatsApp</a>` : ''}${delBtn('reports', r.id)}` }),
    });
    view.onclick = async e => {
      const s = e.target.closest('[data-files]'); if (!s || !e.target.closest('button')) return;
      try {
        const links = await fn('admin-files', { action: 'sign', paths: JSON.parse(s.dataset.files) });
        s.innerHTML = links.map((l, i) => l.signedUrl ? `<a href="${esc(l.signedUrl)}" target="_blank" rel="noopener">Lampiran ${i + 1} ↗</a>` : `<span>Lampiran ${i + 1} tidak ditemukan</span>`).join('') + '<small class="count">Tautan berlaku 1 jam.</small>';
      } catch (x) { toast(x.message); }
    };
  },
  async posts() {
    const rows = await call('admin_list', { p_entity: 'posts' });
    list({
      title: 'Berita dan imbauan', entity: 'posts', rows,
      add: '<button class="btn btn-gold" type="button" data-edit="posts">+ Tambah</button>',
      filters: '<select aria-label="Saring"><option value="">Semua</option><option value="berita">Berita</option><option value="imbauan">Imbauan</option></select>',
      keep: r => !$('.bar select', view).value || r.kind === $('.bar select', view).value,
      match: r => `${r.title} ${r.summary ?? ''} ${r.place ?? ''}`,
      row: r => card({ img: r.image_url, off: !r.published, meta: `${r.kind} · ${esc(r.date_label ?? '')}${r.place ? ' · ' + esc(r.place) : ''}${r.published ? '' : ' · disembunyikan'}`, h: esc(r.title), p: [esc(r.summary)], acts: `<button type="button" data-edit="posts" data-id="${r.id}">Ubah</button>${delBtn('posts', r.id)}` }),
    });
  },
  async wanted() {
    const rows = await call('admin_list', { p_entity: 'wanted' });
    const SRC = { polsek: 'Polsek', kejati: 'Kejati Kalteng', pusiknas: 'Pusiknas Polri' };
    const draw = list({
      title: 'Pencarian orang', entity: 'wanted', rows,
      add: '<button class="btn btn-gold" type="button" data-edit="wanted">+ Terbitkan DPO / orang hilang</button>',
      filters: '<select aria-label="Sumber"><option value="polsek">Terbitan Polsek</option><option value="kejati">Kejati Kalteng (sinkron)</option><option value="pusiknas">Pusiknas Polri (sinkron)</option><option value="">Semua sumber</option></select>',
      keep: r => !$('.bar select', view).value || r.source === $('.bar select', view).value,
      match: r => `${r.name} ${r.crime ?? ''} ${r.detail ?? ''}`,
      row: r => card({ img: r.photo_url, off: !r.published, meta: `${r.kind === 'dpo' ? 'DPO' : 'Orang hilang'} · ${SRC[r.source]}${r.published ? '' : ' · disembunyikan'}`, h: esc(r.name), p: [r.crime && esc(r.crime), r.detail && esc(r.detail)],
        acts: (r.source === 'polsek' ? `<button type="button" data-edit="wanted" data-id="${r.id}">Ubah</button>` : `<button type="button" data-vis="${r.id}">${r.published ? 'Sembunyikan' : 'Tampilkan'}</button><a href="${esc(r.source_url)}" target="_blank" rel="noopener">Sumber ↗</a>`) + delBtn('wanted', r.id) }),
    });
    view.insertAdjacentHTML('beforeend', '<p class="count">Data sinkron yang dihapus akan muncul lagi pada sinkron mingguan berikutnya jika masih ada di situs sumber. Untuk menyembunyikan permanen, gunakan Sembunyikan.</p>');
    view.onclick = async e => {
      const b = e.target.closest('[data-vis]'); if (!b) return;
      const r = LISTS.wanted.find(x => x.id === b.dataset.vis);
      try { const n = await call('admin_save', { p_entity: 'wanted', p_row: { id: r.id, published: !r.published } }); Object.assign(r, n); draw(); toast(n.published ? 'Ditampilkan.' : 'Disembunyikan.'); } catch (x) { toast(x.message); }
    };
  },
  async personnel() {
    const rows = await call('admin_list', { p_entity: 'personnel' });
    const G = { kapolsek: 'Kapolsek', wakil: 'Wakil pimpinan', unit: 'Kepala unit dan seksi', bhabin: 'Bhabinkamtibmas' };
    list({
      title: 'Personel', entity: 'personnel', rows,
      add: '<button class="btn btn-gold" type="button" data-edit="personnel">+ Tambah</button>',
      match: r => `${r.jabatan} ${r.name} ${r.description ?? ''}`,
      row: r => card({ img: r.photo_url || null, meta: `${G[r.grp]} · urutan ${r.sort}`, h: `${esc(r.jabatan)} — ${esc(r.name)}`, p: [esc(r.description)], acts: `<button type="button" data-edit="personnel" data-id="${r.id}">Ubah</button>${delBtn('personnel', r.id)}` }),
    });
  },
  async log() {
    const rows = await call('admin_list', { p_entity: 'log' });
    list({
      title: 'Log aktivitas', entity: 'log', rows,
      match: r => `${r.admin_name} ${r.action} ${r.entity} ${r.detail?.judul ?? ''}`,
      row: r => card({ meta: `${dt(r.at)} · ${esc(r.admin_name ?? '-')}`, h: `${esc(r.action)} ${esc(r.entity ?? '')}`, p: [r.detail?.judul && esc(r.detail.judul)], acts: delBtn('log', r.id) }),
    });
  },
  async admins() {
    const rows = await call('admin_list', { p_entity: 'admins' });
    const can = t => t.id !== me.id && t.role !== 'owner' && (me.role === 'owner' || t.role === 'staff');
    const canRegen = t => me.role === 'owner' || t.role === 'staff' || t.id === me.id;
    view.innerHTML = `<h1>Akses</h1>
<p class="count">Setiap orang masuk dengan kode akses sendiri. Kode hanya tampil sekali saat dibuat; simpan dan berikan langsung kepada orangnya. Membuat ulang atau mencabut kode langsung mengeluarkan orang tersebut dari konsol.</p>
<form class="bar" id="new-a"><input class="grow" name="name" placeholder="Nama, misal Bripka Hansen S.B." required><select name="role"><option value="staff">Staf</option>${me.role === 'owner' ? '<option value="kapolsek">Kapolsek</option>' : ''}</select><button class="btn btn-gold" type="submit">Buat kode akses</button></form>
<div id="code-out"></div>
<div class="rows">${rows.map(t => card({ off: !t.active, meta: `${ROLE[t.role]} · ${t.active ? 'aktif' : 'dicabut'}${t.id === me.id ? ' · Anda' : ''}`, h: esc(t.name), p: [`Terakhir masuk ${dt(t.last_login_at)} · dibuat ${dt(t.created_at)}`],
      acts: (canRegen(t) ? `<button type="button" data-regen="${t.id}" data-name="${esc(t.name)}">Buat ulang kode</button>` : '') + (can(t) ? `<button type="button" data-act="${t.id}" data-on="${!t.active}">${t.active ? 'Cabut akses' : 'Pulihkan akses'}</button>${delBtn('admins', t.id)}` : '') })).join('')}</div>
<p class="count">Kode Owner yang hilang hanya bisa direset dari backend: jalankan <code>select app.reset_owner_code();</code> di SQL Editor Supabase.</p>`;
    const show = (name, code) => { $('#code-out').innerHTML = `<div class="codebox"><div><small style="color:#CFC4AE">Kode akses untuk ${esc(name)}</small><br><code>${code}</code></div><button class="btn btn-gold" type="button" id="copy">Salin</button></div>`; $('#copy').onclick = () => navigator.clipboard.writeText(code).then(() => toast('Kode disalin.')); };
    $('#new-a').onsubmit = async e => {
      e.preventDefault(); const f = e.target;
      try { const c = await call('admin_create', { p_name: f.name.value, p_role: f.role.value }); const n = f.name.value; await VIEWS.admins(); show(n, c); } catch (x) { toast(x.message); }
    };
    view.onclick = async e => {
      const g = e.target.closest('[data-regen]'), a = e.target.closest('[data-act]');
      try {
        if (g) {
          const c = await call('admin_regen', { p_id: g.dataset.regen });
          // own code: the session ends with it, so show the code first and sign out after a moment
          if (g.dataset.regen === me.id) { show(g.dataset.name, c); toast('Kode Anda diganti. Simpan kode baru, Anda akan keluar dalam 30 detik.'); setTimeout(out, 30000); }
          else { await VIEWS.admins(); show(g.dataset.name, c); }
        }
        if (a) { await call('admin_set_active', { p_id: a.dataset.act, p_active: a.dataset.on === 'true' }); toast(a.dataset.on === 'true' ? 'Akses dipulihkan.' : 'Akses dicabut.'); VIEWS.admins(); }
      } catch (x) { toast(x.message); }
    };
  },
};
