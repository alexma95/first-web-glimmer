import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const ALLOWED_TABLES = new Set([
  "campaigns_new",
  "products_new",
  "product_text_options",
  "enrollments",
  "assignments",
  "payment_info",
  "payment_records",
  "files",
]);

const ALLOWED_RPCS = new Set(["clone_campaign", "find_duplicate_text_options"]);

type Filter = {
  type: "eq" | "neq" | "in" | "is" | "gte" | "lte" | "not_null";
  column: string;
  value?: unknown;
};

type Spec = {
  table?: string;
  op: "select" | "insert" | "update" | "delete" | "rpc" | "signed_url";
  select?: string;
  values?: unknown;
  filters?: Filter[];
  order?: { column: string; ascending?: boolean }[];
  limit?: number;
  count?: "exact";
  head?: boolean;
  single?: boolean;
  maybeSingle?: boolean;
  fn?: string;
  args?: Record<string, unknown>;
  path?: string;
  expiresIn?: number;
};

function isAuthorized(key: unknown): boolean {
  if (typeof key !== "string" || key.length === 0) return false;
  const keys = [Deno.env.get("ADMIN_KEY"), Deno.env.get("ADMIN_KEY_2")].filter(
    (k): k is string => typeof k === "string" && k.length > 0,
  );
  return keys.some((k) => k === key);
}

function applyFilters(query: any, filters: Filter[] = []) {
  for (const f of filters) {
    if (typeof f?.column !== "string" || !/^[a-zA-Z0-9_.]+$/.test(f.column)) {
      throw new Error("invalid_filter_column");
    }
    switch (f.type) {
      case "eq":
        query = query.eq(f.column, f.value);
        break;
      case "neq":
        query = query.neq(f.column, f.value);
        break;
      case "in":
        query = query.in(f.column, Array.isArray(f.value) ? f.value : []);
        break;
      case "is":
        query = query.is(f.column, f.value ?? null);
        break;
      case "gte":
        query = query.gte(f.column, f.value);
        break;
      case "lte":
        query = query.lte(f.column, f.value);
        break;
      case "not_null":
        query = query.not(f.column, "is", null);
        break;
      default:
        throw new Error("invalid_filter_type");
    }
  }
  return query;
}

async function run(spec: Spec) {
  if (spec.op === "rpc") {
    if (!spec.fn || !ALLOWED_RPCS.has(spec.fn)) {
      return json({ error: "rpc_not_allowed" }, 400);
    }
    const { data, error } = await db.rpc(spec.fn, spec.args ?? {});
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }

  if (spec.op === "signed_url") {
    if (typeof spec.path !== "string" || spec.path.includes("..")) {
      return json({ error: "invalid_path" }, 400);
    }
    const { data, error } = await db.storage
      .from("proofs")
      .createSignedUrl(spec.path, Math.min(spec.expiresIn ?? 3600, 86400));
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }

  if (!spec.table || !ALLOWED_TABLES.has(spec.table)) {
    return json({ error: "table_not_allowed" }, 400);
  }

  let query: any = db.from(spec.table);

  if (spec.op === "select") {
    query = query.select(spec.select ?? "*", {
      count: spec.count,
      head: spec.head ?? false,
    });
    query = applyFilters(query, spec.filters);
    for (const o of spec.order ?? []) {
      query = query.order(o.column, { ascending: o.ascending ?? true });
    }
    if (typeof spec.limit === "number") query = query.limit(spec.limit);
  } else if (spec.op === "insert") {
    query = query.insert(spec.values as any);
    if (spec.select) query = query.select(spec.select);
  } else if (spec.op === "update") {
    query = query.update(spec.values as any);
    query = applyFilters(query, spec.filters);
    if (spec.select) query = query.select(spec.select);
  } else if (spec.op === "delete") {
    if (!spec.filters || spec.filters.length === 0) {
      return json({ error: "delete_requires_filter" }, 400);
    }
    query = query.delete();
    query = applyFilters(query, spec.filters);
    if (spec.select) query = query.select(spec.select);
  } else {
    return json({ error: "invalid_op" }, 400);
  }

  if (spec.single) query = query.single();
  else if (spec.maybeSingle) query = query.maybeSingle();

  const { data, error, count } = await query;
  if (error) return json({ error: error.message }, 400);
  return json({ data: data ?? null, count: count ?? null });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    if (!isAuthorized(body?.adminKey)) {
      return json({ error: "unauthorized" }, 401);
    }
    const spec = body?.spec as Spec | undefined;
    if (!spec || typeof spec !== "object" || typeof spec.op !== "string") {
      return json({ error: "invalid_spec" }, 400);
    }
    return await run(spec);
  } catch (error) {
    console.error("admin-db error", error);
    return json(
      { error: error instanceof Error ? error.message : "server_error" },
      400,
    );
  }
});
