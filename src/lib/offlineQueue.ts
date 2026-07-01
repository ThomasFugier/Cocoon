import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";

import { ChatAttachment, VoteLevel } from "../types";
import {
  consumeRemoteChatAttachment,
  saveRemoteVote,
  sendRemoteChatMessage,
  sendRemoteNotificationEvent,
} from "./coupleApi";

const OFFLINE_QUEUE_KEY = "wespice-offline-queue-v1";
const OFFLINE_CHAT_ATTACHMENT_DIR = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}wespice-offline-chat/`
  : "";
const MAX_ATTEMPTS = 8;
const RETRY_BASE_DELAY_MS = 5000;
const RETRY_MAX_DELAY_MS = 5 * 60 * 1000;

export type RemoteNotificationQueuePayload = {
  cardId?: string;
  coupleId: string;
  messageId?: string;
  type: "chat_message" | "new_match" | "mood_aligned";
};

export type OfflineQueueItem =
  | {
      attempts: number;
      cardId: string;
      coupleId: string;
      createdAt: string;
      id: string;
      kind: "vote";
      lastAttemptAt?: string;
      level: VoteLevel;
    }
  | {
      attempts: number;
      attachments: ChatAttachment[];
      body: string;
      coupleId: string;
      createdAt: string;
      id: string;
      kind: "chat_message";
      lastAttemptAt?: string;
      linkedCardId?: string;
      messageId: string;
    }
  | {
      attempts: number;
      cardId?: string;
      coupleId: string;
      createdAt: string;
      id: string;
      kind: "notification_event";
      lastAttemptAt?: string;
      messageId?: string;
      type: RemoteNotificationQueuePayload["type"];
    }
  | {
      attempts: number;
      attachmentId: string;
      consumeAfter?: string;
      coupleId: string;
      createdAt: string;
      id: string;
      kind: "consume_attachment";
      lastAttemptAt?: string;
      messageId: string;
    };

type FlushQueueResult = {
  failed: number;
  pending: number;
  sentAttachmentConsumptions: number;
  sentChatMessages: number;
  sent: number;
  visiblePending: number;
};

function nowIso() {
  return new Date().toISOString();
}

function notificationEventId(payload: RemoteNotificationQueuePayload) {
  const targetId = payload.messageId ?? payload.cardId ?? "couple";
  return `notification:${payload.type}:${payload.coupleId}:${targetId}`;
}

function attachmentConsumptionItemId(coupleId: string, messageId: string, attachmentId: string) {
  return `consume:${coupleId}:${messageId}:${attachmentId}`;
}

function notificationQueueItem(payload: RemoteNotificationQueuePayload): OfflineQueueItem {
  return {
    attempts: 0,
    cardId: payload.cardId,
    coupleId: payload.coupleId,
    createdAt: nowIso(),
    id: notificationEventId(payload),
    kind: "notification_event",
    messageId: payload.messageId,
    type: payload.type,
  };
}

function isVisibleQueueItem(item: OfflineQueueItem) {
  return item.kind === "vote";
}

function queuedAttachmentUri(uri?: string) {
  return Boolean(uri && OFFLINE_CHAT_ATTACHMENT_DIR && uri.startsWith(OFFLINE_CHAT_ATTACHMENT_DIR));
}

function queuedAttachmentExtension(attachment: ChatAttachment) {
  const mimeExtension = attachment.mimeType?.split("/")[1]?.split(";")[0]?.trim().toLowerCase();
  const nameExtension = attachment.name?.split(".").pop()?.trim().toLowerCase();
  const extension = mimeExtension || nameExtension || "jpg";

  return extension.replace(/[^a-z0-9]/g, "") || "jpg";
}

async function ensureQueuedAttachmentDirectory() {
  if (!OFFLINE_CHAT_ATTACHMENT_DIR) {
    return "";
  }

  await FileSystem.makeDirectoryAsync(OFFLINE_CHAT_ATTACHMENT_DIR, { intermediates: true }).catch(() => undefined);

  return OFFLINE_CHAT_ATTACHMENT_DIR;
}

async function persistQueuedAttachment(itemId: string, attachment: ChatAttachment, index: number) {
  if (!attachment.uri || queuedAttachmentUri(attachment.uri)) {
    return attachment;
  }

  const directory = await ensureQueuedAttachmentDirectory();
  if (!directory) {
    return attachment;
  }

  const destinationUri = `${directory}${itemId}-${index}-${attachment.id}.${queuedAttachmentExtension(attachment)}`;

  try {
    await FileSystem.copyAsync({
      from: attachment.uri,
      to: destinationUri,
    });

    return {
      ...attachment,
      uri: destinationUri,
    };
  } catch {
    return attachment;
  }
}

async function persistQueuedAttachments(itemId: string, attachments: ChatAttachment[]) {
  return Promise.all(attachments.map((attachment, index) => persistQueuedAttachment(itemId, attachment, index)));
}

async function cleanupQueuedAttachments(attachments: ChatAttachment[]) {
  await Promise.all(attachments.map(async (attachment) => {
    if (!queuedAttachmentUri(attachment.uri)) {
      return;
    }

    await FileSystem.deleteAsync(attachment.uri, { idempotent: true }).catch(() => undefined);
  }));
}

async function readQueue() {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);

  if (!raw) {
    return [] as OfflineQueueItem[];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as OfflineQueueItem[] : [];
  } catch {
    return [];
  }
}

async function writeQueue(items: OfflineQueueItem[]) {
  if (!items.length) {
    await AsyncStorage.removeItem(OFFLINE_QUEUE_KEY);
    return;
  }

  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

async function enqueueItem(item: OfflineQueueItem) {
  const queue = await readQueue();
  await writeQueue([...queue.filter((queued) => queued.id !== item.id), item]);

  return item.id;
}

function dedupeQueueItems(items: OfflineQueueItem[]) {
  const byId = new Map<string, OfflineQueueItem>();

  items.forEach((item) => {
    const existing = byId.get(item.id);

    if (!existing || item.attempts > existing.attempts) {
      byId.set(item.id, item);
    }
  });

  return Array.from(byId.values());
}

function retryDelayForAttempts(attempts: number) {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(RETRY_MAX_DELAY_MS, RETRY_BASE_DELAY_MS * 2 ** exponent);
}

function isRetryDue(item: OfflineQueueItem, now: number) {
  if (item.kind === "consume_attachment" && item.consumeAfter) {
    const consumeAfter = Date.parse(item.consumeAfter);

    if (!Number.isNaN(consumeAfter) && now < consumeAfter) {
      return false;
    }
  }

  if (!item.lastAttemptAt) {
    return true;
  }

  const lastAttemptAt = Date.parse(item.lastAttemptAt);

  if (Number.isNaN(lastAttemptAt)) {
    return true;
  }

  return now - lastAttemptAt >= retryDelayForAttempts(item.attempts);
}

export async function enqueueRemoteVote({
  cardId,
  coupleId,
  level,
}: {
  cardId: string;
  coupleId: string;
  level: VoteLevel;
}) {
  return enqueueItem({
    attempts: 0,
    cardId,
    coupleId,
    createdAt: nowIso(),
    id: `vote:${coupleId}:${cardId}:${level}`,
    kind: "vote",
    level,
  });
}

export async function enqueueRemoteChatMessage({
  attachments,
  body,
  coupleId,
  linkedCardId,
  messageId,
}: {
  attachments: ChatAttachment[];
  body: string;
  coupleId: string;
  linkedCardId?: string;
  messageId: string;
}) {
  const itemId = messageId;
  const durableAttachments = await persistQueuedAttachments(itemId, attachments);

  return enqueueItem({
    attempts: 0,
    attachments: durableAttachments,
    body,
    coupleId,
    createdAt: nowIso(),
    id: itemId,
    kind: "chat_message",
    linkedCardId,
    messageId,
  });
}

export async function enqueueRemoteChatAttachmentConsumption({
  attachmentId,
  coupleId,
  delayMs = 0,
  messageId,
}: {
  attachmentId: string;
  coupleId: string;
  delayMs?: number;
  messageId: string;
}) {
  const consumeAfter = delayMs > 0 ? new Date(Date.now() + delayMs).toISOString() : undefined;

  return enqueueItem({
    attempts: 0,
    attachmentId,
    consumeAfter,
    coupleId,
    createdAt: nowIso(),
    id: attachmentConsumptionItemId(coupleId, messageId, attachmentId),
    kind: "consume_attachment",
    messageId,
  });
}

export async function removeRemoteChatAttachmentConsumption({
  attachmentId,
  coupleId,
  messageId,
}: {
  attachmentId: string;
  coupleId: string;
  messageId: string;
}) {
  const itemId = attachmentConsumptionItemId(coupleId, messageId, attachmentId);
  const queue = await readQueue();
  await writeQueue(queue.filter((item) => item.id !== itemId));
}

export async function loadOfflineQueueCount() {
  return (await readQueue()).length;
}

export async function enqueueRemoteNotificationEvent(payload: RemoteNotificationQueuePayload) {
  return enqueueItem(notificationQueueItem(payload));
}

export async function sendOrQueueRemoteNotificationEvent(payload: RemoteNotificationQueuePayload) {
  try {
    await sendRemoteNotificationEvent(payload);
    return false;
  } catch {
    await enqueueRemoteNotificationEvent(payload).catch(() => undefined);
    return true;
  }
}

async function sendNotificationOrReturnQueueItem(payload: RemoteNotificationQueuePayload) {
  try {
    await sendRemoteNotificationEvent(payload);
    return [] as OfflineQueueItem[];
  } catch {
    return [notificationQueueItem(payload)];
  }
}

async function flushItem(item: OfflineQueueItem) {
  if (item.kind === "vote") {
    await saveRemoteVote(item.coupleId, item.cardId, item.level);
    return sendNotificationOrReturnQueueItem({
      cardId: item.cardId,
      coupleId: item.coupleId,
      type: "new_match",
    });
  }

  if (item.kind === "notification_event") {
    await sendRemoteNotificationEvent({
      cardId: item.cardId,
      coupleId: item.coupleId,
      messageId: item.messageId,
      type: item.type,
    });
    return [] as OfflineQueueItem[];
  }

  if (item.kind === "consume_attachment") {
    await consumeRemoteChatAttachment({
      attachmentId: item.attachmentId,
      coupleId: item.coupleId,
      messageId: item.messageId,
    });
    return [] as OfflineQueueItem[];
  }

  const messageId = await sendRemoteChatMessage({
    attachments: item.attachments,
    body: item.body,
    coupleId: item.coupleId,
    linkedCardId: item.linkedCardId,
    messageId: item.messageId,
  });
  return sendNotificationOrReturnQueueItem({
    coupleId: item.coupleId,
    messageId,
    type: "chat_message",
  });
}

function shouldDropFailedItem(item: OfflineQueueItem, error: unknown) {
  const message = error instanceof Error ? error.message : "";

  return item.attempts + 1 >= MAX_ATTEMPTS
    || message.includes("daily_limit_reached")
    || message.includes("not_couple_member")
    || message.includes("own_attachment_not_consumable")
    || message.includes("unknown_card")
    || message.includes("invalid_payload")
    || message.includes("empty_message");
}

export async function flushRemoteQueue(): Promise<FlushQueueResult> {
  const queue = await readQueue();
  const remaining: OfflineQueueItem[] = [];
  const now = Date.now();
  let sent = 0;
  let sentAttachmentConsumptions = 0;
  let sentChatMessages = 0;
  let failed = 0;

  for (const item of queue) {
    if (!isRetryDue(item, now)) {
      remaining.push(item);
      continue;
    }

    try {
      const followUpItems = await flushItem(item);
      if (item.kind === "chat_message") {
        await cleanupQueuedAttachments(item.attachments);
        sentChatMessages += 1;
      } else if (item.kind === "consume_attachment") {
        sentAttachmentConsumptions += 1;
      }
      remaining.push(...followUpItems);
      sent += 1;
    } catch (error) {
      failed += 1;

      if (!shouldDropFailedItem(item, error)) {
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          lastAttemptAt: nowIso(),
        } as OfflineQueueItem);
      } else if (item.kind === "chat_message") {
        await cleanupQueuedAttachments(item.attachments);
      }
    }
  }

  const nextQueue = dedupeQueueItems(remaining);
  await writeQueue(nextQueue);

  return {
    failed,
    pending: nextQueue.length,
    sentAttachmentConsumptions,
    sentChatMessages,
    sent,
    visiblePending: nextQueue.filter(isVisibleQueueItem).length,
  };
}
