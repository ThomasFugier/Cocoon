import * as Crypto from "expo-crypto";
import * as ImageManipulator from "expo-image-manipulator";
import type { Action } from "expo-image-manipulator";

import {
  ChatAttachment,
  CoupleState,
  DesireCategory,
  NotificationSettings,
  PartnerProfile,
  UnlockedFeature,
  VoteLevel,
} from "../types";
import { supabase } from "./supabase";

type CoupleRow = {
  couple_id: string;
  invite_code: string;
};

export type RemoteCoupleMember = {
  user_id?: string;
  color: string;
  display_name: string;
  is_current_user: boolean;
  role: "creator" | "partner";
  status_emoji: string;
  status_updated_at: string | null;
  vibe: string;
};

export type RemoteMatch = {
  card_id: string;
  title: string;
  emoji: string | null;
  category: DesireCategory;
  kind: "practice" | "discussion";
  mood: "calme" | "sensuel" | "aventureux";
  blurb: string;
  safety: string | null;
  my_level: VoteLevel;
  partner_level: VoteLevel;
  first_matched_at: string | null;
  revealed_at: string | null;
};

export type RemoteChatAttachment = {
  id: string;
  storage_path: string;
  mime_type: string;
  name: string | null;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
};

export type RemoteChatMessage = {
  id: string;
  author_id: string;
  author_is_current_user: boolean;
  body: string;
  linked_card_id: string | null;
  created_at: string;
  expires_at: string;
  attachments: RemoteChatAttachment[];
};

export type RemoteCustomDesire = {
  id: string;
  title: string;
  emoji: string | null;
  category: DesireCategory;
  kind: "practice" | "discussion";
  mood: "calme" | "sensuel" | "aventureux";
  blurb: string;
  created_at: string;
  created_by_current_user: boolean;
};

export type RemoteCoupleState = {
  couple: {
    id: string;
    invite_code: string;
    created_at: string;
  };
  members: RemoteCoupleMember[];
  own_votes: Record<string, VoteLevel>;
  custom_desires: RemoteCustomDesire[];
  category_unlocks: DesireCategory[];
  feature_unlocks: UnlockedFeature[];
  purchase_entitlements: Array<{
    entitlement: string;
    product_id: string;
    store: string;
    status: string;
    expires_at: string | null;
    created_at: string;
  }>;
  notification_preferences: {
    chat_message_enabled: boolean;
    daily_reminder_enabled: boolean;
    match_reveal_enabled: boolean;
    mood_signal_enabled: boolean;
    mood_signal_prompt_seen: boolean;
    promotion_enabled: boolean;
    updated_at: string;
  } | null;
  moods: Array<{
    user_id: string;
    level: 0 | 1 | 2 | 3;
    updated_at: string;
  }>;
  daily_response_usage: {
    count: number;
    date_key: string;
    updated_at: string;
  } | null;
  matches: RemoteMatch[];
  match_reveals: Array<{
    card_id: string;
    first_matched_at: string;
    revealed_at: string | null;
    revealed_by_current_user: boolean;
  }>;
  chat_messages: RemoteChatMessage[];
};

type PendingRemoteAttachment = ChatAttachment & {
  mimeType?: string;
};

const CHAT_ATTACHMENT_JPEG_QUALITY = 0.72;
const CHAT_ATTACHMENT_MAX_EDGE = 1600;

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase n'est pas configuré.");
  }

  return supabase;
}

function resizeActionsForAttachment(attachment: PendingRemoteAttachment): Action[] {
  const width = attachment.width ?? 0;
  const height = attachment.height ?? 0;
  const longestEdge = Math.max(width, height);

  if (!width || !height || longestEdge <= CHAT_ATTACHMENT_MAX_EDGE) {
    return [];
  }

  return [
    {
      resize: width >= height
        ? { width: CHAT_ATTACHMENT_MAX_EDGE }
        : { height: CHAT_ATTACHMENT_MAX_EDGE },
    },
  ];
}

export async function createRemoteCouple(profile: Omit<PartnerProfile, "id">) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("create_couple", {
    p_display_name: profile.displayName,
    p_color: profile.color,
    p_status_emoji: profile.statusEmoji,
    p_vibe: profile.vibe,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as CoupleRow | undefined) : (data as CoupleRow | null);

  if (!row) {
    throw new Error("La création du couple n'a retourné aucune donnée.");
  }

  return row;
}

export async function joinRemoteCouple(profile: Omit<PartnerProfile, "id">, inviteCode: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("join_couple", {
    p_invite_code: inviteCode.toUpperCase(),
    p_display_name: profile.displayName,
    p_color: profile.color,
    p_status_emoji: profile.statusEmoji,
    p_vibe: profile.vibe,
  });

  if (error) {
    throw error;
  }

  const row = Array.isArray(data) ? (data[0] as CoupleRow | undefined) : (data as CoupleRow | null);

  if (!row) {
    throw new Error("Le code d'invitation n'a pas pu être rejoint.");
  }

  return row;
}

export async function leaveRemoteCouple(coupleId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("leave_couple", {
    p_couple_id: coupleId,
  });

  if (error) {
    throw error;
  }
}

export async function saveRemoteVote(coupleId: string, cardId: string, level: VoteLevel) {
  const client = requireSupabase();
  const { error } = await client.rpc("save_desire_vote", {
    p_couple_id: coupleId,
    p_card_id: cardId,
    p_level: level,
  });

  if (error) {
    throw error;
  }
}

export async function fetchMyCoupleState(coupleId?: string | null) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_my_couple_state", {
    p_couple_id: coupleId ?? null,
  });

  if (error) {
    throw error;
  }

  return data as RemoteCoupleState | null;
}

export async function fetchRevealableMatches(coupleId: string, threshold = 1) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_revealable_matches", {
    p_couple_id: coupleId,
    p_threshold: threshold,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as RemoteMatch[];
}

export async function markRemoteMatchRevealed(coupleId: string, cardId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("mark_match_revealed", {
    p_card_id: cardId,
    p_couple_id: coupleId,
  });

  if (error) {
    throw error;
  }
}

export async function saveRemoteCustomDesire({
  blurb,
  cardId,
  category,
  coupleId,
  emoji,
  title,
}: {
  blurb: string;
  cardId: string;
  category: DesireCategory;
  coupleId: string;
  emoji: string;
  title: string;
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("create_custom_desire", {
    p_blurb: blurb,
    p_card_id: cardId,
    p_category: category,
    p_couple_id: coupleId,
    p_emoji: emoji,
    p_title: title,
  });

  if (error) {
    throw error;
  }
}

export async function saveRemoteProfileStatus(coupleId: string, statusEmoji: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("update_profile_status", {
    p_couple_id: coupleId,
    p_status_emoji: statusEmoji,
  });

  if (error) {
    throw error;
  }
}

export async function saveRemoteNotificationPreferences(coupleId: string, settings: NotificationSettings, activePartnerId: "me" | "partner") {
  const client = requireSupabase();
  const { error } = await client.rpc("upsert_notification_preferences", {
    p_chat_message_enabled: settings.chatMessageEnabled[activePartnerId],
    p_couple_id: coupleId,
    p_daily_reminder_enabled: settings.dailyReminderEnabled[activePartnerId],
    p_match_reveal_enabled: settings.matchRevealEnabled[activePartnerId],
    p_mood_signal_enabled: settings.moodSignalEnabled[activePartnerId],
    p_mood_signal_prompt_seen: settings.moodSignalPromptSeen[activePartnerId],
    p_promotion_enabled: settings.promotionEnabled[activePartnerId],
  });

  if (error) {
    throw error;
  }
}

export async function saveRemoteMood(coupleId: string, level: 0 | 1 | 2 | 3) {
  const client = requireSupabase();
  const { error } = await client.rpc("update_couple_mood", {
    p_couple_id: coupleId,
    p_level: level,
  });

  if (error) {
    throw error;
  }
}

export async function registerRemotePushToken({
  deviceId,
  enabled = true,
  platform,
  token,
}: {
  deviceId?: string;
  enabled?: boolean;
  platform: "ios" | "android" | "web" | "unknown";
  token: string;
}) {
  const client = requireSupabase();
  const { error } = await client.rpc("register_push_token", {
    p_device_id: deviceId ?? null,
    p_enabled: enabled,
    p_expo_push_token: token,
    p_platform: platform,
  });

  if (error) {
    throw error;
  }
}

export async function sendRemoteNotificationEvent({
  cardId,
  coupleId,
  messageId,
  type,
}: {
  cardId?: string;
  coupleId: string;
  messageId?: string;
  type: "chat_message" | "new_match" | "mood_aligned";
}) {
  const client = requireSupabase();
  const { error } = await client.functions.invoke("notify-event", {
    body: {
      card_id: cardId,
      couple_id: coupleId,
      message_id: messageId,
      type,
    },
  });

  if (error) {
    throw error;
  }
}

export async function fetchRemoteCoupleMembers(coupleId: string) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("get_couple_members", {
    p_couple_id: coupleId,
  });

  if (error) {
    throw error;
  }

  return (data ?? []) as RemoteCoupleMember[];
}

async function uploadRemoteChatAttachment({
  attachment,
  coupleId,
  messageId,
}: {
  attachment: PendingRemoteAttachment;
  coupleId: string;
  messageId: string;
}) {
  const client = requireSupabase();
  const compressed = await ImageManipulator.manipulateAsync(
    attachment.uri,
    resizeActionsForAttachment(attachment),
    {
      compress: CHAT_ATTACHMENT_JPEG_QUALITY,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );
  const response = await fetch(compressed.uri);
  const arrayBuffer = await response.arrayBuffer();
  const attachmentId = Crypto.randomUUID();
  const storagePath = `${coupleId}/${messageId}/${attachmentId}.jpg`;
  const { error } = await client.storage
    .from("chat-attachments")
    .upload(storagePath, arrayBuffer, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) {
    throw error;
  }

  return {
    id: attachmentId,
    mime_type: "image/jpeg",
    name: attachment.name ?? "photo.jpg",
    height: compressed.height ?? null,
    size_bytes: arrayBuffer.byteLength,
    storage_path: storagePath,
    width: compressed.width ?? null,
  };
}

export async function sendRemoteChatMessage({
  attachments,
  body,
  coupleId,
  linkedCardId,
}: {
  attachments: PendingRemoteAttachment[];
  body: string;
  coupleId: string;
  linkedCardId?: string;
}) {
  const client = requireSupabase();
  const messageId = Crypto.randomUUID();
  const uploadedAttachments: Awaited<ReturnType<typeof uploadRemoteChatAttachment>>[] = [];

  try {
    for (const attachment of attachments) {
      uploadedAttachments.push(await uploadRemoteChatAttachment({ attachment, coupleId, messageId }));
    }

    const { error } = await client.rpc("send_chat_message", {
      p_attachments: uploadedAttachments,
      p_body: body,
      p_couple_id: coupleId,
      p_linked_card_id: linkedCardId ?? null,
      p_message_id: messageId,
    });

    if (error) {
      throw error;
    }

    return messageId;
  } catch (error) {
    if (uploadedAttachments.length) {
      await client.storage
        .from("chat-attachments")
        .remove(uploadedAttachments.map((attachment) => attachment.storage_path));
    }

    throw error;
  }
}

export async function createSignedChatAttachmentUrl(storagePath: string) {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from("chat-attachments")
    .createSignedUrl(storagePath, 60 * 60 * 6);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export function subscribeToCoupleRealtime(coupleId: string, onChange: () => void) {
  const client = requireSupabase();
  const channel = client.channel(`couple-state:${coupleId}`);
  const notify = () => onChange();
  const coupleTables = [
    "chat_messages",
    "chat_attachments",
    "match_reveals",
    "notification_preferences",
    "couple_moods",
    "notification_events",
    "purchase_entitlements",
    "couple_category_unlocks",
    "couple_feature_unlocks",
    "custom_desire_cards",
    "daily_response_usage",
  ];

  coupleTables.forEach((table) => {
    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter: `couple_id=eq.${coupleId}` },
      notify,
    );
  });

  channel.on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, notify);

  channel.subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export function hydrateRemoteShell(local: CoupleState, remote: CoupleRow): CoupleState {
  return {
    ...local,
    id: remote.couple_id,
    inviteCode: remote.invite_code,
  };
}
