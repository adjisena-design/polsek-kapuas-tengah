-- Jalankan SEBELUM atau BERSAMAAN dengan merge branch personel-ba-dan-pengaman ke main.
-- 1) Kelompok personel baru: BA Polsek dan BA Polsubsektor
alter table public.personnel drop constraint personnel_grp_check;
alter table public.personnel add constraint personnel_grp_check check (grp in
  ('kapolsek','wakil','kapolsubsektor','unit','kaspkt','banit','bapolsek','bapolsubsektor','bhabin'));

insert into public.site_text (key, page, sort, id, en, nij) values
  ('BA Polsek', 'Profil', 311, 'BA Polsek', 'Polsek NCOs', ''),
  ('BA Polsubsektor', 'Profil', 312, 'BA Polsubsektor', 'Sub-sector NCOs', '')
on conflict do nothing;

-- 2) Pengaman: Konsol versi lama (tab yang belum dimuat ulang) tidak boleh menyimpan atau menghapus.
--    Konsol mengirim header x-konsol-rev. Panggilan dari server (edge function, service role) dilewatkan.
create or replace function app.require_fresh_konsol() returns void
language plpgsql stable set search_path to '' as $$
declare
  h jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  c jsonb := coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb);
  rev int := case when (h->>'x-konsol-rev') ~ '^[0-9]+$' then (h->>'x-konsol-rev')::int else 0 end;
begin
  if c->>'role' = 'service_role' then return; end if;
  -- Revisi minimum. Naikkan bersama KONSOL_REV di assets/admin.js bila versi lama akan menyimpan data dengan salah.
  if rev < 2 then
    raise exception 'Konsol di perangkat ini masih versi lama. Muat ulang halaman Konsol, lalu simpan lagi.';
  end if;
end $$;

do $$
declare f text; d text;
begin
  foreach f in array array['admin_save', 'admin_delete'] loop
    select pg_get_functiondef(p.oid) into d from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = f;
    if position('app.require_fresh_konsol()' in d) = 0 then
      d := regexp_replace(d, E'\nbegin\n', E'\nbegin\n  perform app.require_fresh_konsol();\n');
      execute d;
    end if;
  end loop;
end $$;
