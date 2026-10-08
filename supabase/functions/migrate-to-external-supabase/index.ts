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

    if (action === "copy-storage" || action === "count-storage") {
      // Batched by top-level folder: body.offset (default 0), body.limit (default 40)
      const offset = Number(body?.offset ?? 0);
      const limit = Math.min(Number(body?.limit ?? 40), 200);
      if (action === "copy-storage" && offset === 0) {
        const { data: bucket } = await dst.storage.getBucket(BUCKET);
        if (!bucket) {
          const { error } = await dst.storage.createBucket(BUCKET, { public: false });
          if (error) return json({ error: `create bucket: ${error.message}` }, 500);
        } else if (bucket.public) {
          const { error } = await dst.storage.updateBucket(BUCKET, { public: false });
          if (error) return json({ error: `make bucket private: ${error.message}` }, 500);
        }
      }
      const client = action === "count-storage" && body?.side === "destination" ? dst : src;
      const { data: top, error: topErr } = await client.storage.from(BUCKET).list("", {
        limit, offset, sortBy: { column: "name", order: "asc" },
      });
      if (topErr) return json({ error: `list root: ${topErr.message}` }, 500);
      const objects: { path: string; mimetype?: string }[] = [];
      for (const item of top ?? []) {
        if (item.id === null) objects.push(...(await listAll(client, item.name)));
        else objects.push({ path: item.name, mimetype: (item.metadata as any)?.mimetype });
      }
      const done = (top?.length ?? 0) < limit;
      if (action === "count-storage") return json({ action, offset, entries: top?.length ?? 0, objects: objects.length, done });
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
      return json({ action, offset, total: objects.length, copied, failed: errors.length, errors: errors.slice(0, 10), done });
    }

    if (action === "verify") {
      const tables: Record<string, unknown> = {};
      for (const t of TABLES) {
        const [s, d] = await Promise.all([countRows(src, t), countRows(dst, t)]);
        tables[t] = { source: s, destination: d, match: s === d };
      }
      const { data: users, error: uErr } = await src.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const sourceAuthUsers = uErr ? { error: uErr.message } : { count: users.users.length, note: "not migrated" };
      return json({ action, tables, sourceAuthUsers, storage: "use count-storage (batched)" });
    }

    return json({ error: "invalid action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
