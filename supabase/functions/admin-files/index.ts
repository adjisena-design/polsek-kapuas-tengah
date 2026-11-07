// Console file actions that need the service role: view complaint attachments, upload site media, delete rows with their files.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });
const mediaPath = (url: string) => url.split("/storage/v1/object/public/media/")[1];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { action, token, entity, id, paths, name } = await req.json();
    // every action is gated by the console session token (checked in SQL)
    const me = await db.rpc("admin_me", { p_token: token });
    if (me.error) return json({ error: me.error.message }, 401);

    if (action === "sign") {
      const { data, error } = await db.storage.from("laporan").createSignedUrls(paths ?? [], 3600);
      return error ? json({ error: error.message }, 400) : json(data);
    }
    if (action === "upload") {
      const safe = String(name ?? "foto").replace(/[^A-Za-z0-9._-]/g, "_").slice(-80);
      const path = `${crypto.randomUUID()}/${safe}`;
      const { data, error } = await db.storage.from("media").createSignedUploadUrl(path);
      if (error) return json({ error: error.message }, 400);
      return json({ ...data, publicUrl: db.storage.from("media").getPublicUrl(path).data.publicUrl });
    }
    if (action === "delete") {
      const { data, error } = await db.rpc("admin_delete", { p_token: token, p_entity: entity, p_id: String(id) });
      if (error) return json({ error: error.message }, 400);
      // row is gone; file cleanup failing only leaves orphans, so report it but do not fail
      const warn: string[] = [];
      if (data.laporan?.length) { const r = await db.storage.from("laporan").remove(data.laporan); if (r.error) warn.push(r.error.message); }
      const m = (data.media ?? []).map(mediaPath).filter(Boolean);
      if (m.length) { const r = await db.storage.from("media").remove(m); if (r.error) warn.push(r.error.message); }
      return json({ ok: true, warn });
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
