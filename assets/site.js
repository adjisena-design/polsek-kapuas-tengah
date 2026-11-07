const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const WA = '6285315515282';

// sticky header height drives scroll-padding so anchor jumps land below it
const hd = $('header');
const setH = () => document.documentElement.style.setProperty('--hh', hd.offsetHeight + 'px');
new ResizeObserver(setH).observe(hd); setH();

// mobile menu
const mb = $('.menu-btn'), nav = $('#nav');
mb.onclick = () => mb.setAttribute('aria-expanded', nav.classList.toggle('open'));
nav.addEventListener('click', e => { if (e.target.tagName === 'A') { nav.classList.remove('open'); mb.setAttribute('aria-expanded', false); } });

// language toggle: shortcut: only switches state and <html lang>; EN and Dayak Ngaju copy still to be written
$$('.lang button').forEach(b => b.onclick = () => {
  $$('.lang button').forEach(x => x.setAttribute('aria-pressed', x === b));
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
const grow = (dlg, from) => { // open the sheet so it appears to grow out of the clicked element
  const r = from.getBoundingClientRect();
  dlg.style.transformOrigin = `${r.left + r.width / 2}px ${r.top + r.height / 2}px`;
  dlg.showModal(); dlg.scrollTop = 0;
};

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
  $('.body', sd).replaceChildren($('#svc-' + c.dataset.svc).content.cloneNode(true));
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
