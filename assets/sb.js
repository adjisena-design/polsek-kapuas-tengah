// Supabase over plain fetch. The publishable key is meant to be public; all access rules live in the database functions.
const SB = 'https://zybfcsdhpoqalmkvmhtu.supabase.co';
const SB_KEY = 'sb_publishable_ENDYCMKsm0ISXG-4mR0Pow_KstchvPW';

async function sb(path, opt = {}) {
  const r = await fetch(SB + path, { ...opt, headers: { apikey: SB_KEY, 'Content-Type': 'application/json', ...opt.headers } });
  const t = await r.text();
  let j = null; try { j = t ? JSON.parse(t) : null; } catch { j = t; }
  if (!r.ok) throw new Error(j?.message || j?.error || 'Gagal terhubung ke server. Coba lagi.');
  return j;
}
const rpc = (fn, args = {}) => sb('/rest/v1/rpc/' + fn, { method: 'POST', body: JSON.stringify(args) });
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeName = n => n.normalize('NFKD').replace(/[^A-Za-z0-9._-]/g, '_').slice(-100) || 'berkas';
