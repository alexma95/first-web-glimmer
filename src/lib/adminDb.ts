/**
 * Server-side proxied database access for the admin panel.
 *
 * The public (anon) key can no longer read or write admin tables directly.
 * Every query below is executed by the `admin-db` edge function using the
 * service role, gated behind the admin key.
 *
 * The API intentionally mirrors the small subset of the Supabase query builder
 * that the admin pages use.
 */

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-db`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

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

export type AdminResult<T = any> = {
  data: T;
  error: { message: string } | null;
  count: number | null;
};

async function execute<T = any>(
  adminKey: string,
  spec: Spec,
): Promise<AdminResult<T>> {
  try {
    const response = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ANON_KEY}`,
        apikey: ANON_KEY,
      },
      body: JSON.stringify({ adminKey, spec }),
    });

    const body = await response.json().catch(() => ({}));

    if (!response.ok || body?.error) {
      return {
        data: null as T,
        error: { message: body?.error ?? `Request failed (${response.status})` },
        count: null,
      };
    }

    return {
      data: (body?.data ?? null) as T,
      error: null,
      count: body?.count ?? null,
    };
  } catch (e) {
    return {
      data: null as T,
      error: { message: e instanceof Error ? e.message : "Network error" },
      count: null,
    };
  }
}

class Builder<T = any> implements PromiseLike<AdminResult<T>> {
  private spec: Spec;

  constructor(private adminKey: string, spec: Spec) {
    this.spec = spec;
  }

  private push(filter: Filter) {
    this.spec.filters = [...(this.spec.filters ?? []), filter];
    return this;
  }

  select(select = "*", options?: { count?: "exact"; head?: boolean }) {
    this.spec.select = select;
    if (options?.count) this.spec.count = options.count;
    if (options?.head) this.spec.head = options.head;
    return this;
  }

  eq(column: string, value: unknown) {
    return this.push({ type: "eq", column, value });
  }
  neq(column: string, value: unknown) {
    return this.push({ type: "neq", column, value });
  }
  in(column: string, value: unknown[]) {
    return this.push({ type: "in", column, value });
  }
  is(column: string, value: unknown) {
    return this.push({ type: "is", column, value });
  }
  gte(column: string, value: unknown) {
    return this.push({ type: "gte", column, value });
  }
  lte(column: string, value: unknown) {
    return this.push({ type: "lte", column, value });
  }
  notNull(column: string) {
    return this.push({ type: "not_null", column });
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.spec.order = [
      ...(this.spec.order ?? []),
      { column, ascending: options?.ascending ?? true },
    ];
    return this;
  }

  limit(count: number) {
    this.spec.limit = count;
    return this;
  }

  single() {
    this.spec.single = true;
    return this;
  }

  maybeSingle() {
    this.spec.maybeSingle = true;
    return this;
  }

  then<R1 = AdminResult<T>, R2 = never>(
    onfulfilled?: ((value: AdminResult<T>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return execute<T>(this.adminKey, this.spec).then(onfulfilled, onrejected);
  }
}

class Table {
  constructor(private adminKey: string, private table: string) {}

  select(select = "*", options?: { count?: "exact"; head?: boolean }) {
    return new Builder(this.adminKey, {
      table: this.table,
      op: "select",
      select,
      count: options?.count,
      head: options?.head,
    });
  }

  insert(values: unknown) {
    return new Builder(this.adminKey, {
      table: this.table,
      op: "insert",
      values,
    });
  }

  update(values: unknown) {
    return new Builder(this.adminKey, {
      table: this.table,
      op: "update",
      values,
    });
  }

  delete() {
    return new Builder(this.adminKey, { table: this.table, op: "delete" });
  }
}

export function adminDb(adminKey: string) {
  return {
    from(table: string) {
      return new Table(adminKey, table);
    },
    rpc(fn: string, args: Record<string, unknown> = {}) {
      return new Builder(adminKey, { op: "rpc", fn, args });
    },
    createSignedUrl(path: string, expiresIn = 3600) {
      return execute<{ signedUrl: string }>(adminKey, {
        op: "signed_url",
        path,
        expiresIn,
      });
    },
  };
}
