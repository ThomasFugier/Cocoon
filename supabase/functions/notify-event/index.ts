import {
  authenticatedUser,
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

type EventType = "chat_message" | "new_match" | "mood_aligned";

type NotificationBody = {
  card_id?: string;
  couple_id?: string;
  message_id?: string;
  type?: EventType;
};

type RecipientPayload = {
  body: string;
  data: Record<string, unknown>;
  dedupeKey: string;
  prefKey: "chat_message_enabled" | "match_reveal_enabled" | "mood_signal_enabled";
  title: string;
};

async function isCoupleMember(client: SupabaseServiceClient, coupleId: string, userId: string) {
  const { data, error } = await client
    .from("couple_members")
    .select("user_id")
    .eq("couple_id", coupleId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function coupleMembers(client: SupabaseServiceClient, coupleId: string) {
  const { data, error } = await client
    .from("couple_members")
    .select("user_id")
    .eq("couple_id", coupleId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((member) => member.user_id as string);
}

async function profileName(client: SupabaseServiceClient, userId: string) {
  const { data } = await client
    .from("profiles")
    .select("display_name")
    .eq("id", userId)
    .maybeSingle();

  return typeof data?.display_name === "string" ? data.display_name : "Ton/ta partenaire";
}

async function cardTitle(client: SupabaseServiceClient, coupleId: string, cardId: string) {
  const { data: baseCard } = await client
    .from("desire_cards")
    .select("title")
    .eq("id", cardId)
    .maybeSingle();

  if (baseCard?.title) {
    return baseCard.title as string;
  }

  const { data: customCard } = await client
    .from("custom_desire_cards")
    .select("title")
    .eq("couple_id", coupleId)
    .eq("id", cardId)
    .maybeSingle();

  return typeof customCard?.title === "string" ? customCard.title : "Une carte";
}

async function insertNotificationEvent({
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
  eventType: EventType;
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

async function dispatchToRecipients({
  client,
  coupleId,
  eventType,
  payload,
  recipients,
}: {
  client: SupabaseServiceClient;
  coupleId: string;
  eventType: EventType;
  payload: RecipientPayload;
  recipients: string[];
}) {
  if (!recipients.length) {
    return { queued: 0, sent: 0 };
  }

  const { data: prefs, error: prefsError } = await client
    .from("notification_preferences")
    .select(`user_id, ${payload.prefKey}`)
    .eq("couple_id", coupleId)
    .in("user_id", recipients);

  if (prefsError) {
    throw prefsError;
  }

  const optedInRecipients = (prefs ?? [])
    .filter((pref) => Boolean(pref[payload.prefKey]))
    .map((pref) => pref.user_id as string);

  const queuedEventIds: string[] = [];
  for (const recipientId of optedInRecipients) {
    const eventId = await insertNotificationEvent({
      client,
      coupleId,
      dedupeKey: payload.dedupeKey,
      eventType,
      payload: payload.data,
      recipientId,
    });

    if (eventId) {
      queuedEventIds.push(eventId);
    }
  }

  if (!queuedEventIds.length) {
    return { queued: 0, sent: 0 };
  }

  const tokens = await pushTokensForUsers(client, optedInRecipients);
  if (!tokens.length) {
    await client
      .from("notification_events")
      .update({ status: "skipped", error: "no_push_token" })
      .in("id", queuedEventIds);
    return { queued: queuedEventIds.length, sent: 0 };
  }

  const messages: ExpoPushMessage[] = tokens.map((token) => ({
    body: payload.body,
    channelId: "wespice-default",
    data: payload.data,
    sound: "default",
    title: payload.title,
    to: token.expo_push_token,
  }));

  try {
    const expoResponse = await sendExpoPushMessages(messages);
    await disableUnregisteredTokens(client, tokens.map((token) => token.expo_push_token), expoResponse);
    await client
      .from("notification_events")
      .update({ sent_at: new Date().toISOString(), status: "sent" })
      .in("id", queuedEventIds);

    return { queued: queuedEventIds.length, sent: messages.length };
  } catch (error) {
    await client
      .from("notification_events")
      .update({ error: error instanceof Error ? error.message : "push_failed", status: "failed" })
      .in("id", queuedEventIds);
    throw error;
  }
}

async function chatPayload(client: SupabaseServiceClient, body: NotificationBody, senderId: string): Promise<RecipientPayload | null> {
  if (!body.couple_id || !body.message_id) {
    return null;
  }

  const { data: message, error } = await client
    .from("chat_messages")
    .select("id, author_id, body")
    .eq("couple_id", body.couple_id)
    .eq("id", body.message_id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!message || message.author_id !== senderId) {
    return null;
  }

  const senderName = await profileName(client, senderId);
  const preview = typeof message.body === "string" && message.body.trim()
    ? message.body.trim().slice(0, 120)
    : "Photo envoyée dans votre chat privé.";

  return {
    body: preview,
    data: { couple_id: body.couple_id, message_id: body.message_id, type: "chat_message" },
    dedupeKey: `chat:${body.message_id}`,
    prefKey: "chat_message_enabled",
    title: `${senderName} t'a écrit`,
  };
}

async function matchPayload(client: SupabaseServiceClient, body: NotificationBody): Promise<RecipientPayload | null> {
  if (!body.couple_id || !body.card_id) {
    return null;
  }

  const { data: votes, error } = await client
    .from("desire_votes")
    .select("user_id, level")
    .eq("couple_id", body.couple_id)
    .eq("card_id", body.card_id);

  if (error) {
    throw error;
  }

  if ((votes ?? []).filter((vote) => Number(vote.level) >= 1).length < 2) {
    return null;
  }

  const title = await cardTitle(client, body.couple_id, body.card_id);

  return {
    body: `${title} est prêt à être révélé.`,
    data: { card_id: body.card_id, couple_id: body.couple_id, type: "new_match" },
    dedupeKey: `match:${body.card_id}`,
    prefKey: "match_reveal_enabled",
    title: "Nouveau match d'envie 🔥",
  };
}

function moodsAreAligned(levels: number[]) {
  if (levels.length < 2) {
    return false;
  }

  const [first, second] = levels;
  return (first > 0 && first === second) || (first >= 2 && second >= 2);
}

async function moodPayload(client: SupabaseServiceClient, body: NotificationBody): Promise<RecipientPayload | null> {
  if (!body.couple_id) {
    return null;
  }

  const { data: moods, error } = await client
    .from("couple_moods")
    .select("user_id, level")
    .eq("couple_id", body.couple_id);

  if (error) {
    throw error;
  }

  const levels = (moods ?? []).map((mood) => Number(mood.level));
  if (!moodsAreAligned(levels)) {
    return null;
  }

  return {
    body: "Votre mood vient de s'aligner. À vous de voir quoi en faire.",
    data: { couple_id: body.couple_id, type: "mood_aligned" },
    dedupeKey: `mood:${todayKey()}:${levels.join("-")}`,
    prefKey: "mood_signal_enabled",
    title: "Même mood au même moment ✨",
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  let client: SupabaseServiceClient;
  try {
    client = serviceClient();
  } catch {
    return jsonResponse({ error: "server_not_configured" }, 500);
  }

  const user = await authenticatedUser(request);
  if (!user) {
    return jsonResponse({ error: "not_authenticated" }, 401);
  }

  const body = await request.json().catch(() => null) as NotificationBody | null;
  if (!body?.type || !body.couple_id) {
    return jsonResponse({ error: "invalid_payload" }, 400);
  }

  if (!(await isCoupleMember(client, body.couple_id, user.id))) {
    return jsonResponse({ error: "not_couple_member" }, 403);
  }

  const members = await coupleMembers(client, body.couple_id);
  const recipients = members.filter((memberId) => memberId !== user.id);
  const payload = body.type === "chat_message"
    ? await chatPayload(client, body, user.id)
    : body.type === "new_match"
      ? await matchPayload(client, body)
      : await moodPayload(client, body);

  if (!payload) {
    return jsonResponse({ queued: 0, sent: 0, skipped: true });
  }

  const result = await dispatchToRecipients({
    client,
    coupleId: body.couple_id,
    eventType: body.type,
    payload,
    recipients,
  });

  return jsonResponse(result);
});
