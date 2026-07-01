import { createClient } from "https://esm.sh/@supabase/supabase-js@2.108.2";

export type SupabaseServiceClient = ReturnType<typeof createClient>;

export const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-wespice-cron-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Origin": "*",
};

export type ExpoPushMessage = {
  body: string;
  channelId?: string;
  data?: Record<string, unknown>;
  sound?: "default";
  title: string;
  to: string;
};

export type PushTokenRow = {
  expo_push_token: string;
  user_id: string;
};

export type ExpoPushTicket = {
  details?: { error?: string };
  id?: string;
  message?: string;
  status: "ok" | "error";
};

export type ExpoPushReceipt = {
  details?: { error?: string };
  message?: string;
  status: "ok" | "error";
};

export type PushDelivery = {
  expoPushToken: string;
  notificationEventId?: string | null;
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
    status,
  });
}

export function serviceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("server_not_configured");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export function userClient(request: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !anonKey) {
    throw new Error("server_not_configured");
  }

  return createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: request.headers.get("Authorization") ?? "",
      },
    },
  });
}

export async function authenticatedUser(request: Request) {
  const client = userClient(request);
  const { data, error } = await client.auth.getUser();

  if (error || !data.user) {
    return null;
  }

  return data.user;
}

export async function pushTokensForUsers(client: SupabaseServiceClient, userIds: string[]) {
  if (!userIds.length) {
    return [] as PushTokenRow[];
  }

  const { data, error } = await client
    .from("push_tokens")
    .select("user_id, expo_push_token")
    .in("user_id", userIds)
    .eq("enabled", true);

  if (error) {
    throw error;
  }

  return (data ?? []) as PushTokenRow[];
}

export async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  if (!messages.length) {
    return { data: [] };
  }

  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch("https://exp.host/--/api/v2/push/send", {
    body: JSON.stringify(messages),
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
    },
    method: "POST",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(JSON.stringify(payload ?? { status: response.status }));
  }

  return payload as {
    data?: ExpoPushTicket[];
  };
}

export async function fetchExpoPushReceipts(receiptIds: string[]) {
  if (!receiptIds.length) {
    return { data: {} };
  }

  const accessToken = Deno.env.get("EXPO_ACCESS_TOKEN");
  const response = await fetch("https://exp.host/--/api/v2/push/getReceipts", {
    body: JSON.stringify({ ids: receiptIds }),
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(accessToken ? { "Authorization": `Bearer ${accessToken}` } : {}),
    },
    method: "POST",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(JSON.stringify(payload ?? { status: response.status }));
  }

  return payload as {
    data?: Record<string, ExpoPushReceipt>;
  };
}

export async function disableUnregisteredTokens(
  client: SupabaseServiceClient,
  tokens: string[],
  expoResponse: Awaited<ReturnType<typeof sendExpoPushMessages>>,
) {
  const unregistered = (expoResponse.data ?? [])
    .map((ticket, index) => ticket.details?.error === "DeviceNotRegistered" ? tokens[index] : null)
    .filter((token): token is string => Boolean(token));

  if (!unregistered.length) {
    return;
  }

  await client
    .from("push_tokens")
    .update({ enabled: false })
    .in("expo_push_token", unregistered);
}

export async function recordExpoPushTickets(
  client: SupabaseServiceClient,
  deliveries: PushDelivery[],
  expoResponse: Awaited<ReturnType<typeof sendExpoPushMessages>>,
) {
  const rows = (expoResponse.data ?? [])
    .map((ticket, index) => {
      const delivery = deliveries[index];

      if (!delivery?.notificationEventId || ticket.status !== "ok" || !ticket.id) {
        return null;
      }

      return {
        expo_push_token: delivery.expoPushToken,
        expo_ticket_id: ticket.id,
        notification_event_id: delivery.notificationEventId,
      };
    })
    .filter((row): row is {
      expo_push_token: string;
      expo_ticket_id: string;
      notification_event_id: string;
    } => Boolean(row));

  if (!rows.length) {
    return 0;
  }

  const { error } = await client
    .from("push_receipts")
    .upsert(rows, { ignoreDuplicates: true, onConflict: "expo_ticket_id" });

  if (error) {
    throw error;
  }

  return rows.length;
}

export async function checkPendingExpoPushReceipts(client: SupabaseServiceClient, limit = 100) {
  const readyBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data, error } = await client
    .from("push_receipts")
    .select("id, expo_ticket_id, expo_push_token, notification_event_id")
    .eq("status", "pending")
    .lte("created_at", readyBefore)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  const pendingRows = (data ?? []) as Array<{
    expo_push_token: string;
    expo_ticket_id: string;
    id: string;
    notification_event_id: string | null;
  }>;

  if (!pendingRows.length) {
    return { checked: 0, disabled: 0, errors: 0, pending: 0 };
  }

  const expoResponse = await fetchExpoPushReceipts(pendingRows.map((row) => row.expo_ticket_id));
  const now = new Date().toISOString();
  const disabledTokens = new Set<string>();
  let checked = 0;
  let errors = 0;

  for (const row of pendingRows) {
    const receipt = expoResponse.data?.[row.expo_ticket_id];

    if (!receipt) {
      continue;
    }

    checked += 1;

    if (receipt.status === "ok") {
      const { error: updateError } = await client
        .from("push_receipts")
        .update({
          checked_at: now,
          details: receipt.details ?? {},
          error: null,
          status: "ok",
        })
        .eq("id", row.id);

      if (updateError) {
        throw updateError;
      }
      continue;
    }

    const receiptError = receipt.details?.error ?? receipt.message ?? "receipt_error";
    errors += 1;

    const { error: updateError } = await client
      .from("push_receipts")
      .update({
        checked_at: now,
        details: receipt.details ?? {},
        error: receiptError,
        status: "error",
      })
      .eq("id", row.id);

    if (updateError) {
      throw updateError;
    }

    if (row.notification_event_id) {
      const { error: eventUpdateError } = await client
        .from("notification_events")
        .update({ error: `expo_receipt:${receiptError}` })
        .eq("id", row.notification_event_id);

      if (eventUpdateError) {
        throw eventUpdateError;
      }
    }

    if (receipt.details?.error === "DeviceNotRegistered") {
      disabledTokens.add(row.expo_push_token);
    }
  }

  if (disabledTokens.size) {
    await client
      .from("push_tokens")
      .update({ enabled: false })
      .in("expo_push_token", Array.from(disabledTokens));
  }

  return {
    checked,
    disabled: disabledTokens.size,
    errors,
    pending: pendingRows.length - checked,
  };
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
