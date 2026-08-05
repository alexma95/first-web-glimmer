/**
 * Public reviewer API.
 *
 * Reviewer-facing pages no longer read or write the database directly — the
 * `gig-api` edge function performs every operation server-side so campaign,
 * enrollment and payment data is never exposed to anonymous clients.
 */

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gig-api`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

export class GigApiError extends Error {
  code: string;
  constructor(code: string, message?: string) {
    super(message ?? code);
    this.code = code;
  }
}

export async function gigApi<T = any>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok || body?.error) {
    throw new GigApiError(body?.error ?? `request_failed_${response.status}`);
  }

  return body as T;
}
