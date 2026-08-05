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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const isUuid = (v: unknown): v is string =>
  typeof v === "string" && UUID_RE.test(v);

async function notify(body: Record<string, unknown>) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/notify-submission`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error("notify failed", e);
  }
}

/* ------------------------------- actions -------------------------------- */

async function enroll(payload: Record<string, unknown>) {
  const rawEmail = typeof payload.email === "string" ? payload.email : "";
  const email = rawEmail.toLowerCase().trim();
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return json({ error: "invalid_email" }, 400);
  }
  const campaignId = payload.campaignId;
  if (campaignId !== undefined && campaignId !== null && !isUuid(campaignId)) {
    return json({ error: "campaign_not_found" }, 404);
  }

  // Resolve campaign
  let campaign: { id: string; name: string } | null = null;
  if (isUuid(campaignId)) {
    const { data } = await db
      .from("campaigns_new")
      .select("id, name")
      .eq("id", campaignId)
      .eq("status", "active")
      .maybeSingle();
    campaign = data ?? null;
    if (!campaign) return json({ error: "campaign_not_found" }, 404);
  } else {
    const { data } = await db
      .from("campaigns_new")
      .select("id, name")
      .eq("status", "active")
      .order("created_at", { ascending: true })
      .limit(1);
    campaign = data?.[0] ?? null;
    if (!campaign) return json({ error: "no_active_campaign" }, 404);
  }

  const { data: products, error: productsError } = await db
    .from("products_new")
    .select("id, title")
    .eq("campaign_id", campaign.id)
    .eq("status", "active")
    .order("position");

  if (productsError) throw productsError;
  if (!products || products.length === 0) {
    return json({ error: "no_products" }, 404);
  }

  const { data: existing } = await db
    .from("enrollments")
    .select("id")
    .eq("email", email)
    .eq("campaign_id", campaign.id)
    .maybeSingle();

  let enrollmentId = existing?.id as string | undefined;

  if (!enrollmentId) {
    // Availability check before creating anything
    const availability: { product: { id: string; title: string }; count: number }[] = [];
    for (const product of products) {
      const { count } = await db
        .from("product_text_options")
        .select("id", { count: "exact", head: true })
        .eq("product_id", product.id)
        .eq("status", "available");
      availability.push({ product, count: count ?? 0 });
    }

    if (availability.some((a) => a.count === 0)) {
      return json({ error: "out_of_texts" }, 409);
    }

    const { data: created, error: createError } = await db
      .from("enrollments")
      .insert({
        email,
        campaign_id: campaign.id,
        state: "assigned",
        user_id: null,
      })
      .select("id")
      .single();
    if (createError) throw createError;
    enrollmentId = created.id;

    for (const product of products) {
      const { data: textId } = await db.rpc("claim_text_option", {
        p_product_id: product.id,
        p_email: email,
      });
      if (!textId) continue;

      const { data: textOption } = await db
        .from("product_text_options")
        .select("text_md")
        .eq("id", textId)
        .single();
      if (!textOption) continue;

      await db.from("assignments").insert({
        enrollment_id: enrollmentId,
        product_id: product.id,
        text_option_id: textId,
        text_snapshot_md: textOption.text_md,
        status: "assigned",
        user_id: null,
      });
    }

    const lowStock = availability.filter((a) => a.count > 0 && a.count < 5);
    if (lowStock.length > 0) {
      await notify({
        type: "low_stock",
        campaignName: campaign.name,
        campaignId: campaign.id,
        lowStockProducts: lowStock.map((a) => ({
          productTitle: a.product.title,
          remainingCount: a.count,
        })),
      });
    }
  } else {
    // Existing enrollment: repair assignments with empty text
    const { data: assignments } = await db
      .from("assignments")
      .select("id, product_id, text_option_id, text_snapshot_md")
      .eq("enrollment_id", enrollmentId);

    for (const product of products) {
      const assignment = assignments?.find((a) => a.product_id === product.id);
      if (!assignment) continue;
      if (assignment.text_snapshot_md && assignment.text_snapshot_md.trim() !== "") {
        continue;
      }

      if (assignment.text_option_id) {
        await db
          .from("product_text_options")
          .update({ status: "available", assigned_to_email: null, assigned_at: null })
          .eq("id", assignment.text_option_id);
      }

      const { data: textId } = await db.rpc("claim_text_option", {
        p_product_id: product.id,
        p_email: email,
      });
      if (!textId) continue;

      const { data: textOption } = await db
        .from("product_text_options")
        .select("text_md")
        .eq("id", textId)
        .single();
      if (!textOption) continue;

      await db
        .from("assignments")
        .update({
          text_option_id: textId,
          text_snapshot_md: textOption.text_md,
        })
        .eq("id", assignment.id);
    }
  }

  return json({ enrollmentId });
}

async function instructions(payload: Record<string, unknown>) {
  const enrollmentId = payload.enrollmentId;
  if (!isUuid(enrollmentId)) return json({ error: "not_found" }, 404);

  const { data: enrollment } = await db
    .from("enrollments")
    .select("id, campaigns_new(welcome_text_md, support_email)")
    .eq("id", enrollmentId)
    .maybeSingle();

  if (!enrollment) return json({ error: "not_found" }, 404);

  const { data: assignments } = await db
    .from("assignments")
    .select(
      "id, product_id, text_option_id, text_snapshot_md, status, proof_file_id, products_new(title, review_link_url, resource_link_url, position)",
    )
    .eq("enrollment_id", enrollmentId)
    .order("products_new(position)");

  const enriched = [];
  for (const assignment of assignments ?? []) {
    let text = assignment.text_snapshot_md;
    if ((!text || text.trim() === "") && assignment.text_option_id) {
      const { data: textOption } = await db
        .from("product_text_options")
        .select("text_md")
        .eq("id", assignment.text_option_id)
        .maybeSingle();
      if (textOption?.text_md) text = textOption.text_md;
    }
    enriched.push({ ...assignment, text_snapshot_md: text });
  }

  const campaign = (enrollment as Record<string, any>).campaigns_new;
  return json({
    welcomeText: campaign?.welcome_text_md ?? "",
    supportEmail: campaign?.support_email ?? null,
    assignments: enriched,
  });
}

async function proofUploadUrl(payload: Record<string, unknown>) {
  const enrollmentId = payload.enrollmentId;
  const assignmentId = payload.assignmentId;
  const ext = typeof payload.ext === "string" ? payload.ext : "";
  if (!isUuid(enrollmentId) || !isUuid(assignmentId)) {
    return json({ error: "invalid_request" }, 400);
  }
  if (!/^[a-z0-9]{1,10}$/i.test(ext)) return json({ error: "invalid_extension" }, 400);

  const { data: assignment } = await db
    .from("assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();
  if (!assignment) return json({ error: "not_found" }, 404);

  const storageKey = `${enrollmentId}/${assignmentId}.${ext.toLowerCase()}`;
  const { data, error } = await db.storage
    .from("proofs")
    .createSignedUploadUrl(storageKey, { upsert: true });
  if (error) throw error;

  return json({ storageKey, token: data.token, path: data.path });
}

async function recordProof(payload: Record<string, unknown>) {
  const enrollmentId = payload.enrollmentId;
  const assignmentId = payload.assignmentId;
  const storageKey = payload.storageKey;
  const filename = payload.filename;
  const mimeType = payload.mimeType;
  const sizeBytes = payload.sizeBytes;

  if (
    !isUuid(enrollmentId) ||
    !isUuid(assignmentId) ||
    typeof storageKey !== "string" ||
    storageKey !== `${enrollmentId}/${assignmentId}.${storageKey.split(".").pop()}` ||
    typeof filename !== "string" ||
    filename.length > 300 ||
    typeof mimeType !== "string" ||
    mimeType.length > 120 ||
    typeof sizeBytes !== "number" ||
    !Number.isFinite(sizeBytes) ||
    sizeBytes < 0
  ) {
    return json({ error: "invalid_request" }, 400);
  }

  const { data: assignment } = await db
    .from("assignments")
    .select("id")
    .eq("id", assignmentId)
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();
  if (!assignment) return json({ error: "not_found" }, 404);

  const { data: file, error: fileError } = await db
    .from("files")
    .insert({
      storage_key: storageKey,
      original_filename: filename,
      mime_type: mimeType,
      size_bytes: Math.round(sizeBytes),
    })
    .select("id")
    .single();
  if (fileError) throw fileError;

  const { error: updateError } = await db
    .from("assignments")
    .update({ proof_file_id: file.id, status: "proof_uploaded" })
    .eq("id", assignmentId);
  if (updateError) throw updateError;

  return json({ ok: true });
}

async function submitPayment(payload: Record<string, unknown>) {
  const enrollmentId = payload.enrollmentId;
  const rawEmail = typeof payload.email === "string" ? payload.email : "";
  const email = rawEmail.toLowerCase().trim();
  if (!isUuid(enrollmentId)) return json({ error: "not_found" }, 404);
  if (!EMAIL_RE.test(email) || email.length > 320) {
    return json({ error: "invalid_email" }, 400);
  }

  const { data: enrollment } = await db
    .from("enrollments")
    .select("id, campaigns_new(name)")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!enrollment) return json({ error: "not_found" }, 404);

  await db.from("payment_info").delete().eq("enrollment_id", enrollmentId);

  const { error: insertError } = await db.from("payment_info").insert({
    enrollment_id: enrollmentId,
    method: "paypal",
    email,
    full_name: null,
    bank_account_number: null,
    bank_details: null,
    address_full: null,
  });
  if (insertError) throw insertError;

  const { error: stateError } = await db
    .from("enrollments")
    .update({ state: "submitted" })
    .eq("id", enrollmentId);
  if (stateError) throw stateError;

  const campaignName = (enrollment as Record<string, any>).campaigns_new?.name;
  await notify({ enrollmentId, email, campaignName });

  return json({ ok: true });
}

async function confirmation(payload: Record<string, unknown>) {
  const enrollmentId = payload.enrollmentId;
  if (!isUuid(enrollmentId)) return json({ error: "not_found" }, 404);

  const { data: enrollment } = await db
    .from("enrollments")
    .select("email")
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!enrollment) return json({ error: "not_found" }, 404);

  const { data: payment } = await db
    .from("payment_info")
    .select("method")
    .eq("enrollment_id", enrollmentId)
    .maybeSingle();

  return json({ email: enrollment.email, method: payment?.method ?? "" });
}

/* --------------------------------- entry -------------------------------- */

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    switch (action) {
      case "enroll":
        return await enroll(body);
      case "instructions":
        return await instructions(body);
      case "proof_upload_url":
        return await proofUploadUrl(body);
      case "record_proof":
        return await recordProof(body);
      case "submit_payment":
        return await submitPayment(body);
      case "confirmation":
        return await confirmation(body);
      default:
        return json({ error: "unknown_action" }, 400);
    }
  } catch (error) {
    console.error("gig-api error", error);
    return json({ error: "server_error" }, 500);
  }
});
