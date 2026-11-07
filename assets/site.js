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
// shortcut: ticket is generated in the browser and delivered by WhatsApp; replace with a Supabase insert when the table exists
const fd = $('#form-dlg');
if (fd) {
  const f = $('form', fd), out = $('.result', fd), err = $('.err', fd);
  const open = (mode, from, pre = {}) => {
    f.reset(); err.textContent = ''; out.hidden = true; f.hidden = false;
    f.dataset.mode = mode;
    $$('[data-mode]', f).forEach(el => el.hidden = el.dataset.mode !== mode);
    $$('[data-mode] [name]', f).forEach(el => el.disabled = el.closest('[data-mode]').hidden);
    $('.top b', fd).textContent = mode === 'book' ? 'BOOKING KUNJUNGAN' : 'PENGADUAN DAN PERTANYAAN';
    Object.entries(pre).forEach(([k, v]) => { if (f.elements[k]) f.elements[k].value = v; });
    const d = f.elements.tanggal; d.min = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    grow(fd, from);
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-form]'); if (!b) return;
    e.preventDefault(); e.stopPropagation(); open(b.dataset.form, b, { layanan: b.dataset.layanan || '', kategori: b.dataset.kategori || '' });
  });
  f.onsubmit = e => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(f)), mode = f.dataset.mode;
    const hp = (v.hp || '').replace(/\D/g, '');
    let msg = '';
    if (mode === 'book') {
      const day = v.tanggal && new Date(v.tanggal + 'T00:00').getDay();
      msg = !v.nama?.trim() ? 'Isi nama Anda.' : hp.length < 10 ? 'Isi nomor HP yang aktif.' : !v.layanan ? 'Pilih layanan.' : !v.tanggal || v.tanggal < f.elements.tanggal.min ? 'Pilih tanggal mulai besok.' : (day === 0 || day === 6) ? 'Kunjungan layanan administrasi hanya Senin–Jumat.' : '';
    } else {
      msg = !v.kategori ? 'Pilih kategori.' : (v.isi || '').trim().length < 20 ? 'Ceritakan minimal 20 karakter.' : (v.hp && hp.length < 10) ? 'Nomor HP tidak valid.' : '';
    }
    err.textContent = msg; if (msg) return;
    const no = (mode === 'book' ? 'BK-' : 'PG-') + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
    const lines = mode === 'book'
      ? [`Booking kunjungan Polsek Kapuas Tengah`, `Tiket: ${no}`, `Nama: ${v.nama}`, `HP: ${v.hp}`, `Layanan: ${v.layanan}`, `Tanggal: ${v.tanggal} pukul ${v.jam}`, v.catatan && `Catatan: ${v.catatan}`]
      : [`Pengaduan/pertanyaan Polsek Kapuas Tengah`, `Tiket: ${no}`, `Kategori: ${v.kategori}`, v.desa && `Desa: ${v.desa}`, `Isi: ${v.isi}`, `Nama: ${v.nama || '-'}`, `HP: ${v.hp || '-'}`];
    $('.no', out).textContent = no;
    $('.sum', out).textContent = lines.filter(Boolean).slice(2).join(' · ');
    $('.send', out).href = `https://wa.me/${WA}?text=${encodeURIComponent(lines.filter(Boolean).join('\n'))}`;
    f.hidden = true; out.hidden = false;
  };
}

// status check on homepage: validate only, no backend yet
const ck = $('#cek');
if (ck) ck.onsubmit = e => {
  e.preventDefault();
  const t = ck.tiket.value.trim(), h = ck.hp.value.replace(/\D/g, ''), m = $('#cek-msg');
  m.textContent = !/^[A-Z0-9-]{6,}$/i.test(t) ? 'Masukkan nomor tiket yang valid.' : h.length < 10 ? 'Masukkan nomor HP yang didaftarkan.' : 'Fitur cek status akan aktif setelah sistem pengaduan tersambung. Sementara, tanyakan lewat WhatsApp Polsek.';
};

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
