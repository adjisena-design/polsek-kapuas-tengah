const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const WA = '6285315515282';

// sticky header height drives scroll-padding so anchor jumps land below it
const hd = $('header');
const setH = () => document.documentElement.style.setProperty('--hh', hd.offsetHeight + 'px');
new ResizeObserver(setH).observe(hd); setH();

// collapsible menu: overlays the page (never pushes it); opens on hover, click pins it open
const mb = $('.menu-btn'), nav = $('#nav');
let pinned = false, hoverT;
const setOpen = o => { nav.classList.toggle('open', o); mb.setAttribute('aria-expanded', o); if (!o) pinned = false; };
mb.onclick = () => { if (pinned) setOpen(false); else { pinned = true; setOpen(true); } };
if (matchMedia('(hover: hover)').matches) {
  [mb, nav].forEach(el => {
    el.addEventListener('mouseenter', () => { clearTimeout(hoverT); if (getComputedStyle(mb).display !== 'none') setOpen(true); });
    el.addEventListener('mouseleave', () => { if (!pinned) hoverT = setTimeout(() => setOpen(false), 200); });
  });
}
document.addEventListener('click', e => { if (nav.classList.contains('open') && !nav.contains(e.target) && !mb.contains(e.target)) setOpen(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
// close when the user scrolls the page from outside the menu (wheel or touch), not on programmatic scrolls
['wheel', 'touchmove'].forEach(ev => addEventListener(ev, e => { if (nav.classList.contains('open') && !nav.contains(e.target) && !mb.contains(e.target)) setOpen(false); }, { passive: true }));

// in-page jumps: land the target just below the sticky header, then correct once late content (images, map) has settled
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const go = (t, smooth = true) => {
  const fix = () => { const d = t.getBoundingClientRect().top - hd.offsetHeight - ($('.svc-tabs')?.offsetHeight || 0) - 16; if (Math.abs(d) > 4) scrollBy({ top: d }); };
  t.scrollIntoView({ behavior: smooth && !reduce ? 'smooth' : 'auto' });
  // wait until the scroll has actually stopped, then correct for content that shifted on the way
  let last = -1, still = 0; const t0 = Date.now();
  const tick = () => { if (scrollY === last) still++; else { still = 0; last = scrollY; } if (still > 4 || Date.now() - t0 > 3000) { fix(); setTimeout(fix, 400); } else requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
};
document.addEventListener('click', e => {
  const a = e.target.closest('a[href*="#"]'); if (!a || a.hasAttribute('data-form')) return;
  const u = new URL(a.href); if (u.pathname !== location.pathname || !u.hash) return;
  const t = document.getElementById(decodeURIComponent(u.hash.slice(1))); if (!t) return;
  e.preventDefault(); setOpen(false); history.pushState(null, '', u.hash); go(t);
});
addEventListener('load', () => { const t = location.hash && document.getElementById(location.hash.slice(1)); if (t) go(t, false); });

// language toggle: shortcut: only switches state and <html lang>; EN and Dayak Ngaju copy still to be written
$$('.lang button').forEach(b => b.onclick = () => {
  $$('.lang button').forEach(x => x.setAttribute('aria-pressed', x.dataset.lang === b.dataset.lang));
  document.documentElement.lang = b.dataset.lang;
});

// hero carousel: fixed 6 s interval, pauses on hover/focus, off for reduced motion
const box = $('#slides');
if (box) {
  const slides = $$('.slide', box), dots = $$('.dots button', box);
  let cur = 0, timer;
  const show = i => { cur = (i + slides.length) % slides.length; slides.forEach((s, k) => s.classList.toggle('on', k === cur)); dots.forEach((d, k) => d.setAttribute('aria-current', k === cur)); };
  const play = () => { clearInterval(timer); if (!matchMedia('(prefers-reduced-motion: reduce)').matches) timer = setInterval(() => show(cur + 1), 6000); };
  $('.prev', box).onclick = () => { show(cur - 1); play(); };
  $('.next', box).onclick = () => { show(cur + 1); play(); };
  dots.forEach((d, k) => d.onclick = () => { show(k); play(); });
  ['mouseenter', 'focusin'].forEach(ev => box.addEventListener(ev, () => clearInterval(timer)));
  ['mouseleave', 'focusout'].forEach(ev => box.addEventListener(ev, play));
  play();
}

// generic dialog close (button, backdrop click)
$$('dialog').forEach(d => {
  $$('.x', d).forEach(x => x.onclick = () => d.close());
  d.addEventListener('click', e => { if (e.target === d) d.close(); });
});
const grow = dlg => { dlg.showModal(); dlg.scrollTop = 0; };
// on phones keep only the first detail panel of each service open
const collapse = root => { if (matchMedia('(max-width:640px)').matches) $$('.svc', root).forEach(s => $$('details.panel', s).forEach((d, i) => d.open = i === 0)); };
collapse(document);

// instagram reels play in a pop-up; clearing src on close stops the video
const rd = $('#reel-dlg');
if (rd) {
  const fr = $('#reel-frame'), op = $('#reel-open');
  $$('.reel').forEach(r => r.onclick = () => {
    fr.src = `https://www.instagram.com/reel/${r.dataset.reel}/embed/`;
    op.href = `https://www.instagram.com/reel/${r.dataset.reel}/`;
    rd.showModal();
  });
  rd.addEventListener('close', () => fr.src = 'about:blank');
}

// service detail sheet (homepage cards): content comes from <template id="svc-…">
const sd = $('#svc-dlg');
if (sd) $$('[data-svc]').forEach(c => c.onclick = () => {
  $('.body', sd).replaceChildren($('#svc-' + c.dataset.svc).content.cloneNode(true)); collapse(sd);
  $('.top b', sd).textContent = c.dataset.label || 'LAYANAN';
  grow(sd, c);
});

// booking + complaint form (one dialog, two modes). No backend yet:
// booking and complaint forms: saved through Supabase RPCs, the ticket number comes from the server
const fd = $('#form-dlg');
if (fd) {
  const f = $('form', fd), out = $('.result', fd), err = $('.err', fd), sub = $('[type=submit]', f);
  const jam = f.elements.jam, tgl = f.elements.tanggal;
  const slots = async () => {
    [...jam.options].forEach(o => { o.disabled = false; o.textContent = o.textContent.replace(' (penuh)', ''); });
    if (!tgl.value) return;
    try {
      const taken = await rpc('booked_slots', { p_tanggal: tgl.value });
      [...jam.options].forEach(o => { if (taken.includes(o.value)) { o.disabled = true; o.textContent += ' (penuh)'; } });
      if (jam.selectedOptions[0]?.disabled) jam.value = [...jam.options].find(o => !o.disabled)?.value ?? '';
    } catch { /* server checks again on submit */ }
  };
  tgl.addEventListener('change', slots);
  const open = (mode, from, pre = {}) => {
    f.reset(); err.textContent = ''; out.hidden = true; f.hidden = false;
    f.dataset.mode = mode;
    $$('[data-mode]', f).forEach(el => el.hidden = el.dataset.mode !== mode);
    $$('[data-mode] [name]', f).forEach(el => el.disabled = el.closest('[data-mode]').hidden);
    $('.top b', fd).textContent = mode === 'book' ? 'BOOKING KUNJUNGAN' : 'PENGADUAN DAN PERTANYAAN';
    Object.entries(pre).forEach(([k, v]) => { if (f.elements[k] && v) f.elements[k].value = v; });
    tgl.min = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    slots();
    grow(fd, from);
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-form]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); open(b.dataset.form, b, { layanan: b.dataset.layanan || '', kategori: b.dataset.kategori || '' });
  });
  f.onsubmit = async e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f)), mode = f.dataset.mode;
    const hp = (v.hp || '').replace(/\D/g, '');
    const files = mode === 'ask' ? [...(f.elements.files?.files || [])] : [];
    let msg = '';
    if (mode === 'book') {
      const day = v.tanggal && new Date(v.tanggal + 'T00:00').getDay();
      msg = !v.nama?.trim() ? 'Isi nama Anda.' : hp.length < 10 ? 'Isi nomor HP yang aktif.' : !v.layanan ? 'Pilih layanan.' : !v.tanggal || v.tanggal < tgl.min ? 'Pilih tanggal mulai besok.' : (day === 0 || day === 6) ? 'Kunjungan layanan administrasi hanya Senin–Jumat.' : !v.jam ? 'Semua jam pada tanggal ini sudah penuh. Pilih tanggal lain.' : '';
    } else {
      msg = !v.kategori ? 'Pilih kategori.' : (v.isi || '').trim().length < 20 ? 'Ceritakan minimal 20 karakter.' : (v.hp && hp.length < 10) ? 'Nomor HP tidak valid.'
        : files.length > 5 ? 'Maksimal 5 berkas.' : files.some(x => x.size > 50 * 1024 * 1024) ? 'Ukuran tiap berkas maksimal 50 MB.' : files.some(x => !/^(image|video)\//.test(x.type)) ? 'Lampiran hanya boleh foto atau video.' : '';
    }
    err.textContent = msg; if (msg) return;
    sub.disabled = true; const label = sub.textContent; sub.textContent = files.length ? 'Mengunggah lampiran…' : 'Mengirim…';
    try {
      let no;
      if (mode === 'book') {
        no = await rpc('book', { p_layanan: v.layanan, p_nama: v.nama, p_hp: v.hp, p_tanggal: v.tanggal, p_jam: v.jam, p_catatan: v.catatan || null });
      } else {
        const paths = [];
        for (const x of files) {
          const path = `${crypto.randomUUID()}/${safeName(x.name)}`;
          await sb(`/storage/v1/object/laporan/${path}`, { method: 'POST', body: x, headers: { 'Content-Type': x.type } });
          paths.push(path);
        }
        no = await rpc('report', { p_kategori: v.kategori, p_isi: v.isi, p_desa: v.desa || null, p_nama: v.nama || null, p_hp: v.hp || null, p_files: paths });
      }
      const lines = mode === 'book'
        ? [`Booking kunjungan Polsek Kapuas Tengah`, `Tiket: ${no}`, `Nama: ${v.nama}`, `Layanan: ${v.layanan}`, `Tanggal: ${v.tanggal} pukul ${v.jam} WIB`]
        : [`Pengaduan/pertanyaan Polsek Kapuas Tengah`, `Tiket: ${no}`, `Kategori: ${v.kategori}`, v.desa && `Desa: ${v.desa}`, files.length && `Lampiran: ${files.length} berkas`];
      $('.no', out).textContent = no;
      $('.sum', out).textContent = lines.filter(Boolean).slice(2).join(' · ');
      $('.send', out).href = `https://wa.me/${WA}?text=${encodeURIComponent(lines.filter(Boolean).join('\n'))}`;
      f.hidden = true; out.hidden = false;
    } catch (x) {
      err.textContent = x.message;
      if (mode === 'book') slots();
    } finally { sub.disabled = false; sub.textContent = label; }
  };
}

// status check on homepage
const ck = $('#cek');
if (ck) ck.onsubmit = async e => {
  e.preventDefault();
  const t = ck.tiket.value.trim(), h = ck.hp.value.replace(/\D/g, ''), m = $('#cek-msg');
  if (!/^[A-Z]{2}-\d{6}-[A-Z0-9]{5}$/i.test(t)) return m.textContent = 'Masukkan nomor tiket yang valid, contoh PG-261107-ABCDE.';
  m.textContent = 'Memeriksa…';
  try {
    const r = await rpc('ticket_status', { p_ticket: t, p_hp: h });
    m.textContent = !r ? 'Tiket tidak ditemukan. Periksa nomor tiket dan nomor HP yang didaftarkan.'
      : `${r.jenis}: status ${r.status.toUpperCase()}${r.jadwal ? ', jadwal ' + r.jadwal : ''}. Dicatat ${new Date(r.dibuat).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`;
  } catch (x) { m.textContent = x.message; }
};

// ---------- content from the database; the static HTML stays as fallback if the request fails ----------
const blankImg = '<span class="img blank"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h13v14H6a2 2 0 0 1-2-2zM17 9h3v8a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4"/></svg></span>';
const img = u => u ? `<span class="img"><img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.parentNode.outerHTML=blankImg"></span>` : blankImg;
const postLink = p => p.source_url ? ` href="${esc(p.source_url)}"${p.source_url.startsWith('http') ? ' target="_blank" rel="noopener"' : ''}` : '';
const postSrc = p => !p.source_url ? '' : p.source_url.startsWith('http') ? `Baca di ${esc(new URL(p.source_url).hostname.replace(/^www\./, ''))} ↗` : 'Baca selengkapnya →';
const postCard = p => {
  const tag = p.source_url ? 'a' : 'article', im = p.kind === 'imbauan';
  return `<${tag} class="post${im ? ' imb' : ''}" data-cat="${p.kind}"${postLink(p)}>${img(p.image_url)}<span class="b"><span class="meta"><b>${im ? 'Imbauan' : 'Berita'}</b>${esc(p.date_label)}${p.place ? ' · ' + esc(p.place) : ''}</span><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>${postSrc(p) ? `<span class="src">${postSrc(p)}</span>` : ''}</span></${tag}>`;
};
const feeds = $$('[data-feed]');
if (feeds.length) sb('/rest/v1/posts?select=*&order=published_on.desc,created_at.desc').then(ps => {
  if (!ps.length) return;
  const berita = ps.filter(p => p.kind === 'berita');
  const home = $('[data-feed=home]'); if (home) home.innerHTML = berita.slice(0, 3).map(postCard).join('');
  const feat = $('[data-feed=feature]'), grid = $('[data-feed=posts]');
  if (feat && berita[0]) {
    const p = berita[0];
    feat.outerHTML = `<a class="feature" data-feed="feature"${postLink(p) || ' href="#"'} style="margin-top:10px">${img(p.image_url)}<span class="b"><span class="meta" style="font-size:13px;color:#6B5D4F">${esc(p.date_label)}${p.place ? ' · ' + esc(p.place) : ''}</span><h2 class="display">${esc(p.title)}</h2><p style="color:var(--muted)">${esc(p.summary)}</p>${postSrc(p) ? `<span class="src" style="font-weight:700;color:var(--brown)">${postSrc(p)}</span>` : ''}</span></a>`;
  }
  if (grid) {
    grid.innerHTML = ps.filter(p => p !== berita[0]).map(postCard).join('');
    const n = { all: ps.length, berita: berita.length, imbauan: ps.length - berita.length };
    $$('.tabs button').forEach(b => { const s = $('sup', b); if (s) s.textContent = n[b.dataset.f]; });
  }
}).catch(() => {});

const grpBox = $$('[data-grp]');
if (grpBox.length) sb('/rest/v1/personnel?select=*&order=sort.asc').then(rows => {
  if (!rows.length) return;
  const user = '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';
  const person = r => `<article class="person"><div class="ph">${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="${esc(r.name)}" loading="lazy">` : user}</div><div class="t"><small>${esc(r.jabatan)}</small><b>${esc(r.name)}</b><span>${esc(r.description)}</span></div></article>`;
  grpBox.forEach(box => {
    const g = rows.filter(r => r.grp === box.dataset.grp); if (!g.length) return;
    if (box.dataset.grp === 'kapolsek') {
      const k = g[0];
      box.innerHTML = `<img src="${esc(k.photo_url || 'assets/kapolsek.webp')}" alt="${esc(k.name)}" width="520" height="450"><div class="t"><span class="rank">${esc(k.jabatan)}</span><h3 class="display" style="font-size:clamp(22px,2.6vw,30px)">${esc(k.name)}</h3><p style="color:var(--muted)">${esc(k.description)}</p></div>`;
    } else box.innerHTML = g.map(person).join('');
  });
}).catch(() => {});

// wanted list: Polsek's own entries plus weekly copies from Kejati Kalteng and Pusiknas Polri, each linked to its source
const wd = $('#wanted');
if (wd) Promise.all([
  sb('/rest/v1/wanted?select=id,kind,source,name,crime,detail,photo_url,source_url&published=eq.true&order=created_at.desc&limit=5000'),
  sb('/rest/v1/sync_runs?select=source,at&ok=eq.true&order=at.desc&limit=20'),
]).then(([rows, runs]) => {
  const grid = $('.wgrid', wd), more = $('.wmore', wd), note = $('.wnote', wd), q = $('.wsearch', wd), tabs = $$('.wtabs button', wd);
  const SRC = { polsek: 'Polsek Kapuas Tengah', kejati: 'Kejati Kalimantan Tengah', pusiknas: 'Pusiknas Polri' };
  let src = 'polsek', shown = 24;
  const fmt = d => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  const card = r => `<article class="wcard ${r.kind}">${r.photo_url ? `<img src="${esc(r.photo_url)}" alt="Foto ${esc(r.name)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}<div><span class="wtag">${r.kind === 'dpo' ? 'DPO' : 'Orang hilang'}</span><b>${esc(r.name)}</b>${r.crime ? `<span>${esc(r.crime)}</span>` : ''}${r.detail ? `<small>${esc(r.detail)}</small>` : ''}${r.source_url ? `<a href="${esc(r.source_url)}" target="_blank" rel="noopener">Lihat di ${SRC[r.source]} ↗</a>` : `<small>Sumber: ${SRC[r.source]}</small>`}</div></article>`;
  const draw = () => {
    const t = q.value.trim().toLowerCase();
    const list = rows.filter(r => r.source === src && (!t || `${r.name} ${r.crime ?? ''} ${r.detail ?? ''}`.toLowerCase().includes(t)));
    grid.innerHTML = list.slice(0, shown).map(card).join('') || `<div class="empty"><p>${t ? 'Tidak ada yang cocok dengan pencarian.' : 'Belum ada data yang dipublikasikan.'}</p></div>`;
    more.hidden = list.length <= shown;
    const run = runs.find(x => x.source === src);
    note.textContent = `${list.length} data` + (src === 'polsek' ? ', diterbitkan petugas Polsek.' : run ? `, disalin dari situs resmi ${SRC[src]} pada ${fmt(run.at)}.` : '.');
  };
  tabs.forEach(b => b.onclick = () => { src = b.dataset.src; shown = 24; tabs.forEach(x => x.setAttribute('aria-selected', x === b)); draw(); });
  q.oninput = () => { shown = 24; draw(); };
  more.onclick = () => { shown += 48; draw(); };
  draw();
}).catch(() => { $('.wnote', wd).textContent = 'Daftar belum bisa dimuat. Coba muat ulang halaman.'; });

// news page filter
const tabs = $$('.tabs button');
tabs.forEach(t => t.onclick = () => {
  tabs.forEach(x => x.setAttribute('aria-pressed', x === t));
  $$('[data-cat]').forEach(p => p.hidden = t.dataset.f !== 'all' && p.dataset.cat !== t.dataset.f);
});

// layanan page: one service at a time; the single CTA block follows the chosen tab
const tabs2 = $$('.svc-tabs [data-tab]');
if (tabs2.length) {
  const nb = $('.next-steps [data-form="book"]');
  const pick = (id, scroll) => {
    if (!document.getElementById(id)) id = tabs2[0].dataset.tab;
    tabs2.forEach(b => b.setAttribute('aria-selected', b.dataset.tab === id));
    $$('.svc-panel').forEach(p => p.hidden = p.id !== id);
    nb.dataset.layanan = { skck: 'SKCK', kehilangan: 'Surat keterangan kehilangan', pengaduan: 'Pengaduan dan pendampingan', spkt: 'SPKT lainnya' }[id];
    if (scroll) { history.replaceState(null, '', '#' + id); scrollTo({ top: $('.svc-tabs').offsetTop - hd.offsetHeight + 1, behavior: reduce ? 'auto' : 'smooth' }); }
  };
  tabs2.forEach(b => b.onclick = () => pick(b.dataset.tab, true));
  pick(location.hash.slice(1), false);
}
