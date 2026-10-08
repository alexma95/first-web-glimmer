// TEMPORARY internal runner. Delete right after migration.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ALLOWED = new Set(["copy-data", "copy-storage", "count-storage", "verify", "signed-urls", "bucket-status", "object-exists"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));
  if (!ALLOWED.has(body?.action)) {
    return new Response(JSON.stringify({ error: "invalid action" }), { status: 400, headers: corsHeaders });
  }
  const payload = { action: body.action, offset: body.offset, limit: body.limit, side: body.side, path: body.path, concurrency: body.concurrency };
  const r = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/migrate-to-external-supabase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-migration-token": Deno.env.get("MIGRATION_TOKEN") ?? "",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY") ?? ""}`,
    },
    body: JSON.stringify(payload),
  });
  return new Response(await r.text(), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
