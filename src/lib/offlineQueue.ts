import AsyncStorage from "@react-native-async-storage/async-storage";

import { ChatAttachment, VoteLevel } from "../types";
import { saveRemoteVote, sendRemoteChatMessage, sendRemoteNotificationEvent } from "./coupleApi";

const OFFLINE_QUEUE_KEY = "wespice-offline-queue-v1";
const MAX_ATTEMPTS = 8;

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
    };

type FlushQueueResult = {
  failed: number;
  pending: number;
  sent: number;
};

function nowIso() {
  return new Date().toISOString();
}

function queueItemId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
}: {
  attachments: ChatAttachment[];
  body: string;
  coupleId: string;
  linkedCardId?: string;
}) {
  return enqueueItem({
    attempts: 0,
    attachments,
    body,
    coupleId,
    createdAt: nowIso(),
    id: queueItemId("chat"),
    kind: "chat_message",
    linkedCardId,
  });
}

export async function loadOfflineQueueCount() {
  return (await readQueue()).length;
}

async function flushItem(item: OfflineQueueItem) {
  if (item.kind === "vote") {
    await saveRemoteVote(item.coupleId, item.cardId, item.level);
    await sendRemoteNotificationEvent({
      cardId: item.cardId,
      coupleId: item.coupleId,
      type: "new_match",
    }).catch(() => undefined);
    return;
  }

  const messageId = await sendRemoteChatMessage({
    attachments: item.attachments,
    body: item.body,
    coupleId: item.coupleId,
    linkedCardId: item.linkedCardId,
  });
  await sendRemoteNotificationEvent({
    coupleId: item.coupleId,
    messageId,
    type: "chat_message",
  }).catch(() => undefined);
}

function shouldDropFailedItem(item: OfflineQueueItem, error: unknown) {
  const message = error instanceof Error ? error.message : "";

  return item.attempts + 1 >= MAX_ATTEMPTS
    || message.includes("daily_limit_reached")
    || message.includes("not_couple_member")
    || message.includes("unknown_card")
    || message.includes("empty_message");
}

export async function flushRemoteQueue(): Promise<FlushQueueResult> {
  const queue = await readQueue();
  const remaining: OfflineQueueItem[] = [];
  let sent = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      await flushItem(item);
      sent += 1;
    } catch (error) {
      failed += 1;

      if (!shouldDropFailedItem(item, error)) {
        remaining.push({
          ...item,
          attempts: item.attempts + 1,
          lastAttemptAt: nowIso(),
        } as OfflineQueueItem);
      }
    }
  }

  await writeQueue(remaining);

  return {
    failed,
    pending: remaining.length,
    sent,
  };
}
