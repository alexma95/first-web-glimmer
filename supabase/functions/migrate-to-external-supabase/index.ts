// TEMPORARY migration function. Delete after migration is complete.
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const DEST_URL = "https://smvypzqcjzcwhuehabri.supabase.co";
const TABLES = [
  "campaigns_new",
  "products_new",
  "product_text_options",
  "enrollments",
  "files",
  "assignments",
  "payment_info",
  "payment_records",
];
const BUCKET = "proofs";
const BATCH = 500;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function listAll(c: SupabaseClient, prefix = ""): Promise<{ path: string; mimetype?: string }[]> {
  const out: { path: string; mimetype?: string }[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await c.storage.from(BUCKET).list(prefix, { limit: 1000, offset });
    if (error) throw new Error(`list ${prefix || "/"}: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const p = prefix ? `${prefix}/${item.name}` : item.name;
      if (item.id === null) out.push(...(await listAll(c, p))); // folder
      else out.push({ path: p, mimetype: (item.metadata as any)?.mimetype });
    }
    if (data.length < 1000) break;
    offset += 1000;
  }
  return out;
}

async function countRows(c: SupabaseClient, t: string) {
  const { count, error } = await c.from(t).select("id", { count: "exact", head: true });
  return error ? `error: ${error.message}` : count;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = Deno.env.get("MIGRATION_TOKEN");
  const destKey = Deno.env.get("MIGRATION_DEST_SERVICE_ROLE_KEY");
  if (!token) return json({ error: "MIGRATION_TOKEN not configured" }, 500);
  const provided = req.headers.get("x-migration-token") ?? "";
  if (!safeEqual(provided, token)) return json({ error: "unauthorized" }, 401);
  if (!destKey) return json({ error: "MIGRATION_DEST_SERVICE_ROLE_KEY not configured" }, 500);

  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const src = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, opts);
  const dst = createClient(DEST_URL, destKey, opts);

  const body = await req.json().catch(() => ({}));
  const action = body?.action;

  try {
    if (action === "copy-data") {
      const results: Record<string, unknown> = {};
      for (const t of TABLES) {
        let copied = 0;
        let from = 0;
        let err: string | null = null;
        while (true) {
          const { data, error } = await src.from(t).select("*").order("id").range(from, from + BATCH - 1);
          if (error) { err = `read: ${error.message}`; break; }
          if (!data || data.length === 0) break;
          const { error: upErr } = await dst.from(t).upsert(data, { onConflict: "id" });
          if (upErr) { err = `write at offset ${from}: ${upErr.message}`; break; }
          copied += data.length;
          if (data.length < BATCH) break;
          from += BATCH;
        }
        results[t] = err ? { copied, error: err } : { copied };
        if (err) break; // stop to preserve dependency order
      }
      return json({ action, results });
    }

    if (action === "copy-storage") {
      const { data: bucket } = await dst.storage.getBucket(BUCKET);
      if (!bucket) {
        const { error } = await dst.storage.createBucket(BUCKET, { public: false });
        if (error) return json({ error: `create bucket: ${error.message}` }, 500);
      } else if (bucket.public) {
        const { error } = await dst.storage.updateBucket(BUCKET, { public: false });
        if (error) return json({ error: `make bucket private: ${error.message}` }, 500);
      }
      const objects = await listAll(src);
      let copied = 0;
      const errors: string[] = [];
      for (const o of objects) {
        const { data: blob, error: dlErr } = await src.storage.from(BUCKET).download(o.path);
        if (dlErr || !blob) { errors.push(`download ${o.path}: ${dlErr?.message}`); continue; }
        const { error: upErr } = await dst.storage.from(BUCKET).upload(o.path, blob, {
          upsert: true,
          contentType: o.mimetype || blob.type || "application/octet-stream",
        });
        if (upErr) errors.push(`upload ${o.path}: ${upErr.message}`);
        else copied++;
      }
      return json({ action, total: objects.length, copied, failed: errors.length, errors: errors.slice(0, 20) });
    }

    if (action === "verify") {
      const tables: Record<string, unknown> = {};
      for (const t of TABLES) {
        const [s, d] = await Promise.all([countRows(src, t), countRows(dst, t)]);
        tables[t] = { source: s, destination: d, match: s === d };
      }
      let storage: unknown;
      try {
        const [s, d] = await Promise.all([listAll(src), listAll(dst).catch(() => [])]);
        storage = { source: s.length, destination: d.length, match: s.length === d.length };
      } catch (e) {
        storage = { error: (e as Error).message };
      }
      let sourceAuthUsers: unknown;
      const { data: users, error: uErr } = await src.auth.admin.listUsers({ page: 1, perPage: 1000 });
      sourceAuthUsers = uErr ? { error: uErr.message } : { count: users.users.length, note: "not migrated; handle separately" };
      return json({ action, tables, storage, sourceAuthUsers });
    }

    return json({ error: "invalid action; use copy-data | copy-storage | verify" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
