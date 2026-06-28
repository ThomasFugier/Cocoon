import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

type PurchaseTarget =
  | { kind: "category"; category: string }
  | { kind: "feature"; feature: string };

type ProductConfig = {
  entitlement: string;
  productId: string;
  target: PurchaseTarget;
};

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

const productConfigs: ProductConfig[] = [
  { entitlement: "pack_sensuel", productId: "wespice_pack_sensuel", target: { kind: "category", category: "Sensuel" } },
  { entitlement: "pack_seduction", productId: "wespice_pack_seduction", target: { kind: "category", category: "Séduction" } },
  { entitlement: "pack_hot", productId: "wespice_pack_hot", target: { kind: "category", category: "Hot" } },
  { entitlement: "pack_jeux_defis", productId: "wespice_pack_jeux_defis", target: { kind: "category", category: "Jeux & Défis" } },
  { entitlement: "pack_scenarios", productId: "wespice_pack_scenarios", target: { kind: "category", category: "Scénarios" } },
  { entitlement: "pack_kinky_soft", productId: "wespice_pack_kinky_soft", target: { kind: "category", category: "Kinky Soft" } },
  { entitlement: "pack_bdsm", productId: "wespice_pack_bdsm", target: { kind: "category", category: "BDSM" } },
  { entitlement: "pack_plaisirs_explicites", productId: "wespice_pack_plaisirs_explicites", target: { kind: "category", category: "Plaisirs explicites" } },
  { entitlement: "pack_tabous", productId: "wespice_pack_tabous", target: { kind: "category", category: "Tabous" } },
  { entitlement: "custom_cards_unlimited", productId: "wespice_custom_cards_unlimited", target: { kind: "feature", feature: "custom_cards_unlimited" } },
  { entitlement: "no_ads", productId: "wespice_no_ads", target: { kind: "feature", feature: "no_ads" } },
  { entitlement: "unlimited_responses", productId: "wespice_unlimited_responses", target: { kind: "feature", feature: "unlimited_responses" } },
];

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
}

function isEntitlementActive(entitlement: Record<string, unknown> | undefined) {
  if (!entitlement) {
    return false;
  }

  const expiresDate = typeof entitlement.expires_date === "string" ? entitlement.expires_date : null;
  return !expiresDate || Date.parse(expiresDate) > Date.now();
}

function revenueCatEntitlement(subscriber: Record<string, unknown>, entitlement: string) {
  const entitlements = subscriber.entitlements as Record<string, Record<string, unknown> | undefined> | undefined;
  return entitlements?.[entitlement];
}

function normalizeRevenueCatStore(value: unknown) {
  const store = typeof value === "string" ? value.toLowerCase() : "";

  if (store === "app_store" || store === "mac_app_store") {
    return "apple";
  }

  if (store === "play_store") {
    return "google";
  }

  if (store === "stripe") {
    return "stripe";
  }

  return "unknown";
}

function revenueCatPurchaseRecord(subscriber: Record<string, unknown>, productId: string) {
  const subscriptions = subscriber.subscriptions as Record<string, Record<string, unknown> | undefined> | undefined;
  const subscription = subscriptions?.[productId];

  if (subscription) {
    return subscription;
  }

  const nonSubscriptions = subscriber.non_subscriptions as Record<string, Record<string, unknown>[] | undefined> | undefined;
  const purchases = nonSubscriptions?.[productId] ?? [];

  return purchases[0] ?? null;
}

function stringField(record: Record<string, unknown> | undefined | null, keys: string[]) {
  for (const key of keys) {
    const value = record?.[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }

  return null;
}

async function grantEntitlement({
  config,
  coupleId,
  expiresAt,
  serviceClient,
  source,
  store,
  transactionId,
  userId,
}: {
  config: ProductConfig;
  coupleId: string;
  expiresAt: string | null;
  serviceClient: ReturnType<typeof createClient>;
  source: string;
  store: string;
  transactionId: string | null;
  userId: string;
}) {
  const entitlementRow = {
    couple_id: coupleId,
    entitlement: config.entitlement,
    expires_at: expiresAt,
    product_id: config.productId,
    purchased_by: userId,
    source,
    status: "active",
    store,
    transaction_id: transactionId,
  };
  const { error: entitlementError } = await serviceClient
    .from("purchase_entitlements")
    .upsert(entitlementRow, { onConflict: "couple_id,entitlement" });

  if (entitlementError) {
    throw entitlementError;
  }

  if (config.target.kind === "category") {
    const { error } = await serviceClient
      .from("couple_category_unlocks")
      .upsert({
        category: config.target.category,
        couple_id: coupleId,
        source,
        unlocked_by: userId,
      }, { onConflict: "couple_id,category" });

    if (error) {
      throw error;
    }
  } else {
    const { error } = await serviceClient
      .from("couple_feature_unlocks")
      .upsert({
        couple_id: coupleId,
        feature: config.target.feature,
        source,
        unlocked_by: userId,
      }, { onConflict: "couple_id,feature" });

    if (error) {
      throw error;
    }
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const revenueCatSecret = Deno.env.get("REVENUECAT_SECRET_API_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !revenueCatSecret) {
    return jsonResponse({ error: "server_not_configured" }, 500);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData.user;

  if (userError || !user) {
    return jsonResponse({ error: "not_authenticated" }, 401);
  }

  const body = await request.json().catch(() => null) as {
    app_user_id?: string;
    couple_id?: string;
    entitlement?: string;
    product_id?: string;
    restore?: boolean;
    target?: PurchaseTarget;
  } | null;

  if (!body?.couple_id) {
    return jsonResponse({ error: "missing_couple_id" }, 400);
  }

  if (body.app_user_id && body.app_user_id !== user.id) {
    return jsonResponse({ error: "invalid_app_user_id" }, 403);
  }

  const { data: member, error: memberError } = await serviceClient
    .from("couple_members")
    .select("couple_id")
    .eq("couple_id", body.couple_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    return jsonResponse({ error: "membership_check_failed", detail: memberError.message }, 500);
  }

  if (!member) {
    return jsonResponse({ error: "not_couple_member" }, 403);
  }

  const revenueCatResponse = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(user.id)}`, {
    headers: {
      "Authorization": `Bearer ${revenueCatSecret}`,
      "Content-Type": "application/json",
    },
  });

  if (!revenueCatResponse.ok) {
    return jsonResponse({
      error: "revenuecat_validation_failed",
      status: revenueCatResponse.status,
      detail: await revenueCatResponse.text(),
    }, 502);
  }

  const revenueCatPayload = await revenueCatResponse.json();
  const subscriber = revenueCatPayload.subscriber as Record<string, unknown> | undefined;

  if (!subscriber) {
    return jsonResponse({ error: "missing_revenuecat_subscriber" }, 502);
  }

  const candidates = body.restore
    ? productConfigs
    : productConfigs.filter((config) => config.entitlement === body.entitlement && config.productId === body.product_id);

  if (!candidates.length) {
    return jsonResponse({ error: "unknown_product" }, 400);
  }

  const grants: ProductConfig[] = [];

  for (const config of candidates) {
    const entitlement = revenueCatEntitlement(subscriber, config.entitlement);

    if (!isEntitlementActive(entitlement)) {
      continue;
    }

    const productIdentifier = typeof entitlement?.product_identifier === "string" ? entitlement.product_identifier : null;
    if (!body.restore && productIdentifier && productIdentifier !== config.productId) {
      return jsonResponse({ error: "product_mismatch", expected: config.productId, actual: productIdentifier }, 403);
    }

    const purchaseRecord = revenueCatPurchaseRecord(subscriber, config.productId);
    const expiresAt = stringField(entitlement, ["expires_date"]);
    const store = normalizeRevenueCatStore(entitlement?.store ?? purchaseRecord?.store);
    const transactionId = stringField(purchaseRecord, [
      "original_transaction_id",
      "transaction_id",
      "store_transaction_id",
      "id",
    ]);

    await grantEntitlement({
      config,
      coupleId: body.couple_id,
      expiresAt,
      serviceClient,
      source: body.restore ? "revenuecat_restore" : "revenuecat",
      store,
      transactionId,
      userId: user.id,
    });
    grants.push(config);
  }

  if (!grants.length) {
    return jsonResponse({ error: "no_active_entitlement" }, 402);
  }

  return jsonResponse({
    grants: grants.map((grant) => ({
      entitlement: grant.entitlement,
      product_id: grant.productId,
      target: grant.target,
    })),
  });
});
