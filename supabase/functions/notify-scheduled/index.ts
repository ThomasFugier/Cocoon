import {
  corsHeaders,
  disableUnregisteredTokens,
  ExpoPushMessage,
  jsonResponse,
  pushTokensForUsers,
  sendExpoPushMessages,
  serviceClient,
  todayKey,
  type SupabaseServiceClient,
} from "../_shared/push.ts";

type ScheduledNotificationBody = {
  body?: string;
  campaign_id?: string;
  title?: string;
  type?: "daily_reminder" | "promotion";
};

type PreferenceRow = {
  couple_id: string;
  user_id: string;
};

function hasValidSecret(request: Request) {
  const secret = Deno.env.get("WESPICE_NOTIFICATION_SECRET") ?? Deno.env.get("SUPABASE_NOTIFICATION_SECRET");

  if (!secret) {
    return false;
  }

  const bearer = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const headerSecret = request.headers.get("x-wespice-cron-secret");

  return bearer === secret || headerSecret === secret;
}

async function optedInRows(client: SupabaseServiceClient, type: "daily_reminder" | "promotion") {
  const preferenceColumn = type === "daily_reminder" ? "daily_reminder_enabled" : "promotion_enabled";
  const { data, error } = await client
    .from("notification_preferences")
    .select("couple_id, user_id")
    .eq(preferenceColumn, true);

  if (error) {
    throw error;
  }

  return (data ?? []) as PreferenceRow[];
}

async function queueEvent({
  client,
  coupleId,
  dedupeKey,
  eventType,
  payload,
  recipientId,
}: {
  client: SupabaseServiceClient;
  coupleId: string;
  dedupeKey: string;
  eventType: "daily_reminder" | "promotion";
  payload: Record<string, unknown>;
  recipientId: string;
}) {
  const { data, error } = await client
    .from("notification_events")
    .insert({
      couple_id: coupleId,
      dedupe_key: dedupeKey,
      event_type: eventType,
      payload,
      recipient_id: recipientId,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") {
      return null;
    }

    throw error;
  }

  return data.id as string;
}

async function sendScheduledNotification(client: SupabaseServiceClient, body: ScheduledNotificationBody) {
  const type = body.type ?? "daily_reminder";
  const title = type === "daily_reminder"
    ? body.title ?? "Ta carte du jour t'attend"
    : body.title ?? "Nouveau pack WeSpice";
  const text = type === "daily_reminder"
    ? body.body ?? "Tu as 5 choix aujourd'hui. Un match peut arriver plus vite que prévu."
    : body.body ?? "Une nouveauté est disponible dans la boutique.";
  const dedupeKey = type === "daily_reminder"
    ? `daily:${todayKey()}`
    : `promo:${body.campaign_id ?? todayKey()}`;
  const rows = await optedInRows(client, type);
  const eventIds: string[] = [];
  const recipients: string[] = [];

  for (const row of rows) {
    const eventId = await queueEvent({
      client,
      coupleId: row.couple_id,
      dedupeKey,
      eventType: type,
      payload: { campaign_id: body.campaign_id ?? null, type },
      recipientId: row.user_id,
    });

    if (eventId) {
      eventIds.push(eventId);
      recipients.push(row.user_id);
    }
  }

  if (!eventIds.length) {
    return { queued: 0, sent: 0 };
  }

  const tokens = await pushTokensForUsers(client, Array.from(new Set(recipients)));
  if (!tokens.length) {
    await client
      .from("notification_events")
      .update({ error: "no_push_token", status: "skipped" })
      .in("id", eventIds);

    return { queued: eventIds.length, sent: 0 };
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    body: text,
    channelId: "wespice-default",
    data: { campaign_id: body.campaign_id ?? null, type },
    sound: "default",
    title,
    to: token.expo_push_token,
  }));

  try {
    const expoResponse = await sendExpoPushMessages(messages);
    await disableUnregisteredTokens(client, tokens.map((token) => token.expo_push_token), expoResponse);
    await client
      .from("notification_events")
      .update({ sent_at: new Date().toISOString(), status: "sent" })
      .in("id", eventIds);

    return { queued: eventIds.length, sent: messages.length };
  } catch (error) {
    await client
      .from("notification_events")
      .update({ error: error instanceof Error ? error.message : "push_failed", status: "failed" })
      .in("id", eventIds);
    throw error;
  }
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  if (!hasValidSecret(request)) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  let client: SupabaseServiceClient;
  try {
    client = serviceClient();
  } catch {
    return jsonResponse({ error: "server_not_configured" }, 500);
  }

  const body = await request.json().catch(() => ({})) as ScheduledNotificationBody;
  if (body.type && body.type !== "daily_reminder" && body.type !== "promotion") {
    return jsonResponse({ error: "invalid_type" }, 400);
  }

  const result = await sendScheduledNotification(client, body);
  return jsonResponse(result);
});
