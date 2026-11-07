// Weekly copy of public DPO lists (Pusiknas Polri, Kejati Kalteng) into public.wanted, each row linked to its source page.
// Public endpoint on purpose: it only reads public data, and runs at most once an hour.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const UA = { "User-Agent": "PolsekKapuasTengah-DPO-sync/1.0 (website resmi Polsek Kapuas Tengah)" };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Row = { kind: "dpo"; source: string; external_id: string; name: string; crime: string | null; detail: string | null; photo_url: string | null; source_url: string };

async function pusiknas(): Promise<Row[]> {
  const base = "https://pusiknas.polri.go.id";
  const rows = new Map<string, Row>();
  let total = 0;
  for (let page = 1, pages = 1; page <= pages && page <= 200; page++) {
    const r = await fetch(`${base}/listDpo?nama=&klasifikasiKejahatan=&page=${page}&size=8`, { headers: { ...UA, Accept: "application/json" } });
    if (!r.ok) throw new Error(`Pusiknas HTTP ${r.status} di halaman ${page}`);
    const j = await r.json();
    const p = j.propertyPage ?? j;
    pages = p.totalPages ?? 1; total = p.totalElements ?? 0;
    for (const x of p.content ?? []) {
      const photo = x.photo ? new URL(String(x.photo), base + "/").href : null;
      rows.set(String(x.id), { kind: "dpo", source: "pusiknas", external_id: String(x.id), name: String(x.nama ?? "").trim(), crime: x.tindakPidana ?? null, detail: x.klasifikasiKejahatan ?? null, photo_url: photo, source_url: `${base}/dpo_detail?id=${x.id}` });
    }
    await sleep(250); // be gentle with the source
  }
  // a partial list would wrongly delete entries; refuse it
  if (rows.size < total * 0.9) throw new Error(`Pusiknas hanya ${rows.size} dari ${total} data`);
  return [...rows.values()];
}

async function kejati(): Promise<Row[]> {
  const base = "https://kejati-kalimantantengah.kejaksaan.go.id";
  const r = await fetch(`${base}/dpo`, { headers: UA });
  if (!r.ok) throw new Error(`Kejati HTTP ${r.status}`);
  const html = await r.text();
  const out: Row[] = [];
  const re = /<a href="([^"]*dpo\/detail\/[^"]+)"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<b>([^<]+)<\/b>/g;
  for (const m of html.matchAll(re)) {
    const url = new URL(m[1], base + "/").href, photo = new URL(m[2], base + "/").href;
    out.push({ kind: "dpo", source: "kejati", external_id: url.split("/dpo/detail/")[1], name: m[3].trim(), crime: null, detail: "Kejaksaan Tinggi Kalimantan Tengah", photo_url: photo, source_url: url });
  }
  if (!out.length && /dpo\/detail\//.test(html)) throw new Error("Format halaman Kejati berubah");
  return out;
}

async function run(source: string, get: () => Promise<Row[]>) {
  const started = new Date().toISOString();
  try {
    const rows = (await get()).filter((r) => r.name).map((r) => ({ ...r, last_seen_at: started }));
    // published is not in the payload, so a row the console hid stays hidden
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await db.from("wanted").upsert(rows.slice(i, i + 200), { onConflict: "source,external_id" });
      if (error) throw error;
    }
    // removed at the source: remove here too
    await db.from("wanted").delete().eq("source", source).lt("last_seen_at", started);
    await db.from("sync_runs").insert({ source, ok: true, items: rows.length });
    return { source, ok: true, items: rows.length };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await db.from("sync_runs").insert({ source, ok: false, error });
    return { source, ok: false, error }; // last good copy stays
  }
}

Deno.serve(async () => {
  const { data: last } = await db.from("sync_runs").select("at").order("at", { ascending: false }).limit(1);
  if (last?.[0] && Date.now() - new Date(last[0].at).getTime() < 3600e3) return Response.json({ skipped: "baru disinkron kurang dari 1 jam lalu" }, { headers: { "Access-Control-Allow-Origin": "*" } });
  const res = [await run("kejati", kejati), await run("pusiknas", pusiknas)];
  return Response.json(res, { headers: { "Access-Control-Allow-Origin": "*" } });
});
