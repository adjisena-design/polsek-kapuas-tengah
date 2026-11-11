// Console Publish button: starts the GitHub Action that rebuilds the site, and reports its progress.
import { createClient } from "npm:@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const REPO = "adjisena-design/polsek-kapuas-tengah", WF = "publish.yml";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const { action, token } = await req.json();
    const me = await db.rpc("admin_me", { p_token: token });
    if (me.error) return json({ error: me.error.message }, 401);
    const gh = Deno.env.get("GH_TOKEN");
    if (!gh) return json({ error: "Token GitHub belum dipasang. Minta Owner memasang GH_TOKEN di Supabase." }, 400);
    const H = { Authorization: `Bearer ${gh}`, Accept: "application/vnd.github+json", "User-Agent": "polsek-konsol", "X-GitHub-Api-Version": "2022-11-28" };

    if (action === "run") {
      const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WF}/dispatches`, { method: "POST", headers: H, body: JSON.stringify({ ref: "main", inputs: { by: me.data.name } }) });
      if (r.status !== 204) {
        const msg = `GitHub menolak (${r.status}): ${(await r.text()).slice(0, 200)}`;
        await db.from("publish_runs").insert({ admin_name: me.data.name, ok: false, detail: msg });
        return json({ error: msg }, 502);
      }
      await db.from("publish_runs").insert({ admin_name: me.data.name, ok: true, detail: "Dikirim ke GitHub" });
      await db.from("activity_log").insert({ admin_id: me.data.id, admin_name: me.data.name, action: "publikasikan situs", entity: "publish" });
      return json({ ok: true });
    }
    if (action === "status") {
      const r = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${WF}/runs?per_page=1`, { headers: H });
      if (!r.ok) return json({ error: `GitHub (${r.status})` }, 502);
      const run = (await r.json()).workflow_runs?.[0];
      return json(run ? { status: run.status, conclusion: run.conclusion, at: run.created_at, url: run.html_url } : {});
    }
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
