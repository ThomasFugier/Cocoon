import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");

function isPositiveMatchVote(level) {
  return typeof level === "number" && level >= 1;
}

function isMutualMatch(a, b) {
  return isPositiveMatchVote(a) && isPositiveMatchVote(b);
}

function canUseDailyResponse({ count, hasUnlimited, limit = 5 }) {
  return hasUnlimited || count < limit;
}

function canCreateCustomCard({ count, hasUnlimited, freeLimit = 3 }) {
  return hasUnlimited || count < freeLimit;
}

function remainingMembersAfterLeave(members, leavingUserId) {
  return members.filter((member) => member.userId !== leavingUserId);
}

function isChatMessageExpired(expiresAt, now) {
  return new Date(expiresAt).getTime() <= new Date(now).getTime();
}

test("match rule: no answer is revealed if either partner says no or has not answered", () => {
  assert.equal(isMutualMatch(0, 2), false);
  assert.equal(isMutualMatch(2, 0), false);
  assert.equal(isMutualMatch(undefined, 2), false);
});

test("match rule: curious or flame from both partners creates a match", () => {
  assert.equal(isMutualMatch(1, 1), true);
  assert.equal(isMutualMatch(1, 2), true);
  assert.equal(isMutualMatch(2, 1), true);
});

test("daily quota: five free responses, unlimited entitlement bypasses it", () => {
  assert.equal(canUseDailyResponse({ count: 4, hasUnlimited: false }), true);
  assert.equal(canUseDailyResponse({ count: 5, hasUnlimited: false }), false);
  assert.equal(canUseDailyResponse({ count: 99, hasUnlimited: true }), true);
});

test("custom card limit: three free cards, unlimited entitlement bypasses it", () => {
  assert.equal(canCreateCustomCard({ count: 2, hasUnlimited: false }), true);
  assert.equal(canCreateCustomCard({ count: 3, hasUnlimited: false }), false);
  assert.equal(canCreateCustomCard({ count: 42, hasUnlimited: true }), true);
});

test("leave couple: leaving removes only the active user and deletes an empty couple", () => {
  const remaining = remainingMembersAfterLeave([
    { userId: "a" },
    { userId: "b" },
  ], "a");
  assert.deepEqual(remaining, [{ userId: "b" }]);
  assert.deepEqual(remainingMembersAfterLeave(remaining, "b"), []);
});

test("chat expiry: messages expire at or before the configured morning timestamp", () => {
  assert.equal(isChatMessageExpired("2026-06-27T04:00:00.000Z", "2026-06-27T04:00:00.000Z"), true);
  assert.equal(isChatMessageExpired("2026-06-27T04:00:01.000Z", "2026-06-27T04:00:00.000Z"), false);
});

test("RLS guardrails: sensitive tables have RLS and client cannot insert paid unlocks", () => {
  [
    "profiles",
    "couple_members",
    "desire_votes",
    "chat_messages",
    "chat_attachments",
    "push_tokens",
    "notification_preferences",
    "couple_moods",
    "notification_events",
    "purchase_entitlements",
  ].forEach((table) => {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security;`));
  });

  assert.doesNotMatch(schema, /create policy "couple_category_unlocks_insert_members"/);
  assert.doesNotMatch(schema, /create policy "couple_feature_unlocks_insert_members"/);
  assert.match(schema, /grant execute on function public\.unlock_category_for_couple\(uuid, text, text\) to service_role;/);
  assert.match(schema, /grant execute on function public\.unlock_feature_for_couple\(uuid, text, text\) to service_role;/);
});
