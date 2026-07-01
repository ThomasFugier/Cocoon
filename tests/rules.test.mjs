import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const coupleApi = readFileSync(new URL("../src/lib/coupleApi.ts", import.meta.url), "utf8");
const offlineQueue = readFileSync(new URL("../src/lib/offlineQueue.ts", import.meta.url), "utf8");
const easJson = readFileSync(new URL("../eas.json", import.meta.url), "utf8");
const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const deleteAccountFunction = readFileSync(new URL("../supabase/functions/delete-account/index.ts", import.meta.url), "utf8");
const notifyEvent = readFileSync(new URL("../supabase/functions/notify-event/index.ts", import.meta.url), "utf8");
const notifyScheduled = readFileSync(new URL("../supabase/functions/notify-scheduled/index.ts", import.meta.url), "utf8");
const pushShared = readFileSync(new URL("../supabase/functions/_shared/push.ts", import.meta.url), "utf8");
const privacyPage = readFileSync(new URL("../public/privacy.html", import.meta.url), "utf8");
const termsPage = readFileSync(new URL("../public/terms.html", import.meta.url), "utf8");
const deleteAccountPage = readFileSync(new URL("../public/delete-account.html", import.meta.url), "utf8");

const getMyCoupleStateStart = schema.indexOf("create or replace function public.get_my_couple_state");
const getChatMessagesStart = schema.indexOf("create or replace function public.get_chat_messages");
const getMyCoupleStateSql = getMyCoupleStateStart >= 0 && getChatMessagesStart > getMyCoupleStateStart
  ? schema.slice(getMyCoupleStateStart, getChatMessagesStart)
  : "";
const getRevealableMatchesStart = schema.indexOf("create or replace function public.get_revealable_matches");
const getMyCoupleStateDropStart = schema.indexOf("drop function if exists public.get_my_couple_state");
const getRevealableMatchesSql = getRevealableMatchesStart >= 0 && getMyCoupleStateDropStart > getRevealableMatchesStart
  ? schema.slice(getRevealableMatchesStart, getMyCoupleStateDropStart)
  : "";
const profileScreenStart = app.indexOf("function ProfileScreen");
const statusEditorStart = app.indexOf("function StatusEmojiEditor");
const profileScreen = profileScreenStart >= 0 && statusEditorStart > profileScreenStart
  ? app.slice(profileScreenStart, statusEditorStart)
  : "";

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

test("couple membership is unique and join switches atomically server-side", () => {
  assert.match(schema, /couple_members_one_active_couple_per_user_idx/);
  assert.match(schema, /on public\.couple_members \(user_id\)/);
  assert.match(schema, /perform pg_advisory_xact_lock\(hashtext\(v_user_id::text\)\)/);
  assert.match(schema, /where couples\.invite_code = upper\(trim\(p_invite_code\)\)\s+for update;/);
  assert.match(schema, /with old_couples as \(/);
  assert.match(schema, /delete from public\.couple_members members[\s\S]*returning members\.couple_id/);
  assert.match(schema, /delete from public\.couples couples[\s\S]*not exists \(/);
  assert.doesNotMatch(app, /previousCoupleId/);
  assert.doesNotMatch(app, /leaveRemoteCouple\(previousCoupleId\)/);
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
    "chat_attachment_tombstones",
    "chat_attachment_upload_intents",
    "push_tokens",
    "push_receipts",
    "app_rate_limits",
    "notification_preferences",
    "couple_moods",
    "notification_events",
    "purchase_entitlements",
  ].forEach((table) => {
    assert.match(schema, new RegExp(`alter table public\\.${table} enable row level security;`));
  });

  assert.doesNotMatch(schema, /create policy "couple_category_unlocks_insert_members"/);
  assert.doesNotMatch(schema, /create policy "couple_feature_unlocks_insert_members"/);
  assert.doesNotMatch(schema, /create policy "chat_storage_insert_members"/);
  assert.doesNotMatch(schema, /create policy "chat_storage_delete_members"/);
  assert.match(schema, /create policy "chat_storage_insert_pending_chat_attachment"/);
  assert.match(schema, /from public\.chat_attachment_upload_intents intents/);
  assert.match(schema, /primary key \(couple_id, user_id, card_id\)/);
  assert.match(schema, /using \(user_id = auth\.uid\(\) and public\.is_couple_member\(couple_id\)\)/);
  assert.match(schema, /grant execute on function public\.get_chat_messages\(uuid, int\) to authenticated;/);
  assert.match(schema, /grant execute on function public\.prepare_chat_attachment_upload\(uuid, uuid, uuid\) to authenticated;/);
  assert.match(schema, /grant execute on function public\.discard_chat_attachment_uploads\(text\[\]\) to authenticated;/);
  assert.match(schema, /grant execute on function public\.consume_chat_attachment\(uuid, uuid, uuid\) to authenticated;/);
  assert.match(schema, /grant execute on function public\.unlock_category_for_couple\(uuid, text, text\) to service_role;/);
  assert.match(schema, /grant execute on function public\.unlock_feature_for_couple\(uuid, text, text\) to service_role;/);
});

test("offline chat queue persists photo attachments outside cache and cleans them up", () => {
  assert.match(packageJson, /"expo-file-system":/);
  assert.match(offlineQueue, /expo-file-system\/legacy/);
  assert.match(offlineQueue, /wespice-offline-chat\//);
  assert.match(offlineQueue, /messageId: string/);
  assert.match(offlineQueue, /messageId: item\.messageId/);
  assert.match(offlineQueue, /FileSystem\.copyAsync/);
  assert.match(offlineQueue, /FileSystem\.deleteAsync/);
  assert.match(offlineQueue, /persistQueuedAttachments\(itemId, attachments\)/);
  assert.match(offlineQueue, /cleanupQueuedAttachments\(item\.attachments\)/);
});

test("notification events retry through the offline queue without surfacing user-facing sync banners", () => {
  assert.match(offlineQueue, /kind: "notification_event"/);
  assert.match(offlineQueue, /sendOrQueueRemoteNotificationEvent/);
  assert.match(offlineQueue, /notificationEventId\(payload\)/);
  assert.match(offlineQueue, /return item\.kind === "vote"/);
  assert.match(offlineQueue, /visiblePending: nextQueue\.filter\(isVisibleQueueItem\)\.length/);
  assert.match(app, /sendOrQueueRemoteNotificationEvent\(\{ cardId, coupleId, type: "new_match" \}\)/);
  assert.match(app, /sendOrQueueRemoteNotificationEvent\(\{ coupleId: couple\.id, messageId, type: "chat_message" \}\)/);
  assert.match(app, /result\.visiblePending > 0/);
  assert.doesNotMatch(app, /sendRemoteNotificationEvent/);
});

test("authenticated onboarding checks the existing Supabase account before creating a couple", () => {
  assert.match(app, /remoteAccountCheckedUserId/);
  assert.match(app, /waitingForRemoteAccount/);
  assert.match(app, /RemoteAccountLookupScreen/);
  assert.match(app, /const existingRemote = await fetchMyCoupleState\(null\)/);
  assert.match(app, /if \(existingRemote\) \{/);
  assert.match(schema, /v_existing_couple_id uuid/);
  assert.match(schema, /return query select v_existing_couple_id, v_existing_invite_code/);
  assert.doesNotMatch(app, /Compte créé localement\. Synchro serveur/);
  assert.match(app, /Création serveur impossible/);
});

test("remote writes wait for Supabase hydration and a remote couple id", () => {
  assert.match(app, /const remoteAccountReady = Boolean\(/);
  assert.match(app, /remoteAccountCheckedUserId === session\.user\.id/);
  assert.match(app, /&& !remoteHydrating/);
  assert.match(app, /const canWriteRemoteCouple = useCallback/);
  assert.match(app, /remoteAccountReady && targetCouple && isRemoteCoupleId\(targetCouple\.id\)/);
  assert.match(app, /if \(!remoteAccountReady \|\| \(preferredCoupleId && !isRemoteCoupleId\(preferredCoupleId\)\)\) \{/);
  assert.match(app, /\|\| !remoteAccountReady[\s\S]*\|\| isRemoteCoupleId\(couple\.id\)/);
  assert.match(app, /if \(session && hasSupabaseConfig && !remoteAccountReady\)/);
  assert.match(app, /if \(canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,500}saveRemoteVote/);
  assert.match(app, /if \(canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,700}saveRemoteCustomDesire/);
  assert.match(app, /if \(canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,900}sendRemoteChatMessage/);
  assert.match(app, /if \(!canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,260}Achat impossible/);
  assert.match(app, /if \(!session \|\| !couple \|\| !canWriteRemoteCouple\(couple\)\) \{/);
  assert.match(app, /if \(!canWriteRemoteCouple\(currentCouple\)\) \{[\s\S]{0,80}return;/);
  assert.match(app, /if \(canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,260}markRemoteMatchRevealed/);
});

test("full reset signs out so Supabase cannot auto-hydrate the previous couple", () => {
  assert.match(app, /const handleReset = useCallback\(async \(\) => \{\s+await signOut\(\);\s+await clearCoupleState\(\);/);
  assert.match(app, /const handleReset = useCallback\(async \(\) => \{[\s\S]*setSession\(null\);[\s\S]*setGuestMode\(localModeEnabled\);[\s\S]*updateIntroSeen\(false\);/);
  assert.match(app, /const handleReset = useCallback\(async \(\) => \{[\s\S]*setRemoteHydrating\(false\);/);
});

test("profile screen puts account first and merges app actions", () => {
  const accountIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Compte</Text>");
  const statusIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Statut</Text>");
  const notificationsIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Notifications</Text>");
  const applicationIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Application</Text>");

  assert.ok(accountIndex >= 0);
  assert.ok(accountIndex < statusIndex);
  assert.ok(statusIndex < notificationsIndex);
  assert.ok(notificationsIndex < applicationIndex);
  assert.doesNotMatch(profileScreen, /<Text style=\{styles\.profileSectionTitle\}>Actions<\/Text>/);
  ["Réinitialiser le test", "Revoir l'intro", "Restaurer les achats", "Quitter le couple", "Supprimer mon compte", "Se déconnecter"].forEach((label) => {
    assert.ok(profileScreen.includes(label));
  });
  assert.doesNotMatch(profileScreen, /Données privées par couple/);
  assert.match(profileScreen, /\{PROJECT_VERSION\.label\}/);
});

test("account and data deletion is authenticated, server-side, and partner-safe", () => {
  assert.match(coupleApi, /deleteRemoteAccount/);
  assert.match(coupleApi, /functions\.invoke\("delete-account"/);
  assert.match(app, /confirmDeleteAccount/);
  assert.match(app, /Supprimer mon compte/);
  assert.match(app, /await deleteRemoteAccount\(\)/);
  assert.match(deleteAccountFunction, /authenticatedUser\(request\)/);
  assert.match(deleteAccountFunction, /DELETE_CONFIRMATION = "delete-my-account"/);
  assert.match(deleteAccountFunction, /\.from\("chat_attachments"\)/);
  assert.match(deleteAccountFunction, /uploaded_by/);
  assert.match(deleteAccountFunction, /emptyCoupleIdsBeforeDelete/);
  assert.match(deleteAccountFunction, /\.from\(CHAT_ATTACHMENTS_BUCKET\)[\s\S]*\.remove\(paths\)/);
  assert.match(deleteAccountFunction, /\.update\(\{ created_by: nextOwnerId \}\)/);
  assert.match(deleteAccountFunction, /auth\.admin\.deleteUser\(user\.id\)/);
  assert.match(deleteAccountFunction, /\.from\("couples"\)[\s\S]*\.delete\(\)/);
  assert.match(deleteAccountFunction, /cleaned_couples/);
  assert.match(schema, /created_by uuid references auth\.users \(id\) on delete set null/);
  assert.doesNotMatch(schema, /created_by uuid not null references auth\.users \(id\) on delete cascade/);
});

test("store submission has legal pages and non-empty EAS submit profiles", () => {
  const eas = JSON.parse(easJson);
  const packageData = JSON.parse(packageJson);

  assert.equal(eas.submit.production.ios.ascAppId, "CHANGE_ME_ASC_APP_ID");
  assert.equal(eas.submit.production.ios.appleTeamId, "CHANGE_ME_APPLE_TEAM_ID");
  assert.equal(eas.submit.production.android.serviceAccountKeyPath, "@secret:GOOGLE_SERVICE_ACCOUNT");
  assert.equal(eas.submit.production.android.track, "internal");
  assert.equal(eas.submit.production.android.releaseStatus, "draft");
  assert.match(packageData.scripts["submit:ios"], /eas-cli@latest submit -p ios --profile production --latest/);
  assert.match(packageData.scripts["submit:android"], /eas-cli@latest submit -p android --profile production --latest/);
  assert.match(privacyPage, /Politique de confidentialité/);
  assert.match(privacyPage, /Supprimer mon compte/);
  assert.match(privacyPage, /Supabase/);
  assert.match(termsPage, /Conditions d'utilisation/);
  assert.match(termsPage, /Usage réservé aux adultes/);
  assert.match(deleteAccountPage, /Suppression compte et données/);
  assert.match(deleteAccountPage, /Profil/);
});

test("profile notifications use simple single-line labels", () => {
  ["Humeur partagée", "Carte du jour", "Nouveaux matchs", "Messages privés", "Promotions"].forEach((label) => {
    assert.ok(profileScreen.includes(`title: "${label}"`));
  });

  assert.doesNotMatch(profileScreen, /offText[:=]|onText[:=]|eyebrow[:=]|Envies croisées|Packs et nouveautés/);
});

test("bottom navigation keeps five main tabs and opens profile from the avatar shortcut", () => {
  const tabsStart = app.indexOf("function CandyTabs");
  const enviesStart = app.indexOf("function EnviesScreen");
  const candyTabs = tabsStart >= 0 && enviesStart > tabsStart ? app.slice(tabsStart, enviesStart) : "";

  ["Accueil", "Envies", "Matchs", "Chat", "Nous"].forEach((label) => {
    assert.ok(candyTabs.includes(`label: "${label}"`));
  });

  assert.doesNotMatch(candyTabs, /key: "profil"|label: "Profil"/);
  assert.match(app, /function ProfileShortcutButton/);
  assert.match(app, /onPress=\{\(\) => onTabChange\("profil"\)\}/);
});

test("home keeps a next-action quest cue", () => {
  assert.match(app, /Prochaine action/);
  assert.match(app, /homeNextQuestLabel/);
});

test("library card filters default to all cards", () => {
  assert.match(app, /type DesireFilterKey = "all" \| "todo" \| "flame" \| "curious" \| "matches"/);
  assert.match(app, /\{ key: "all", label: "Toutes" \}/);
  assert.match(app, /useState<DesireFilterKey>\("all"\)/);
  assert.match(app, /setFilter\("all"\)/);
  assert.match(app, /refreshLibrarySnapshot\(category, "all"\)/);
  assert.match(app, /nextFilter === "all"/);
});

test("couple tab keeps the partner invite code visible for resync", () => {
  assert.match(app, /coupleReconnectCard/);
  assert.match(app, /Code partenaire/);
  assert.match(app, /resynchroniser facilement/);
  assert.match(app, /selectable style=\{styles\.coupleReconnectCode\}>\{couple\.inviteCode\}/);
});

test("revealable matches RPC qualifies card columns to avoid PL/pgSQL output ambiguity", () => {
  assert.match(getRevealableMatchesSql, /cards\.title/);
  assert.match(getRevealableMatchesSql, /cards\.id/);
  assert.doesNotMatch(getRevealableMatchesSql, /\n\s+id,\s*\n\s+title,\s*\n\s+emoji,/);
  assert.match(getMyCoupleStateSql, /'title', custom_cards\.title/);
});

test("hidden match details stay server-side until the current user reveals", () => {
  assert.match(getRevealableMatchesSql, /join public\.match_reveals reveals/);
  assert.match(getRevealableMatchesSql, /reveals\.revealed_at is not null/);
  assert.match(getMyCoupleStateSql, /'hidden_match_count'/);
  assert.match(getMyCoupleStateSql, /and reveals\.revealed_at is null/);
  assert.match(getMyCoupleStateSql, /and revealed_at is not null/);
  assert.match(schema, /create or replace function public\.reveal_next_match/);
  assert.match(schema, /grant execute on function public\.reveal_next_match\(uuid\) to authenticated;/);
  assert.match(coupleApi, /markRemoteNextMatchRevealed/);
  assert.match(app, /hiddenMatchCountForCouple/);
  assert.match(app, /markRemoteNextMatchRevealed\(couple\.id\)/);
});

test("match push notifications do not leak hidden card identifiers or titles", () => {
  assert.match(notifyEvent, /body: "Un match est pr.t/);
  assert.match(notifyEvent, /data: \{ couple_id: body\.couple_id, type: "new_match" \}/);
  assert.match(notifyEvent, /privateDedupeKey\("match", body\.couple_id, body\.card_id\)/);
  assert.doesNotMatch(notifyEvent, /cardTitle/);
  assert.doesNotMatch(notifyEvent, /data: \{ card_id: body\.card_id/);
  assert.doesNotMatch(notifyEvent, /body: `\$\{title\}/);
});

test("chat push notifications do not leak private message previews", () => {
  assert.match(notifyEvent, /\.select\("id, author_id"\)/);
  assert.match(notifyEvent, /body: "Nouveau message priv/);
  assert.match(notifyEvent, /title: "WeSpice"/);
  assert.match(notifyEvent, /data: \{ couple_id: body\.couple_id, message_id: body\.message_id, type: "chat_message" \}/);
  assert.doesNotMatch(notifyEvent, /message\.body/);
  assert.doesNotMatch(notifyEvent, /Photo envoy/);
  assert.doesNotMatch(notifyEvent, /profileName/);
  assert.doesNotMatch(notifyEvent, /t'a .crit/);
});

test("expo push receipts are stored and checked after push send", () => {
  assert.match(schema, /create table if not exists public\.push_receipts/);
  assert.match(schema, /expo_ticket_id text not null unique/);
  assert.match(schema, /create index if not exists push_receipts_pending_idx/);
  assert.match(schema, /alter table public\.push_receipts enable row level security/);
  assert.match(pushShared, /push\/getReceipts/);
  assert.match(pushShared, /fetchExpoPushReceipts/);
  assert.match(pushShared, /recordExpoPushTickets/);
  assert.match(pushShared, /checkPendingExpoPushReceipts/);
  assert.match(pushShared, /DeviceNotRegistered/);
  assert.match(pushShared, /\.from\("push_receipts"\)/);
  assert.match(notifyEvent, /recordExpoPushTickets\(client, deliveries, expoResponse\)/);
  assert.match(notifyScheduled, /recordExpoPushTickets\(client, deliveries, expoResponse\)/);
  assert.match(notifyScheduled, /checkPendingExpoPushReceipts\(client\)/);
  assert.match(notifyScheduled, /body\.type === "receipt_check"/);
  assert.match(notifyScheduled, /receiptCheck/);
});

test("queued chat photos use bubble-level delivery feedback instead of a global sync banner", () => {
  assert.match(app, /deliveryStatus: "sending"/);
  assert.match(app, /withChatMessageDeliveryStatus\(current, messageId, queued \? "queued" : "failed"\)/);
  assert.match(app, /En attente d'envoi/);
  assert.match(app, /result\.sentChatMessages > 0/);
  assert.match(app, /refreshRemoteChatMessages\(preferredCoupleId, \{ force: true \}\)/);
  assert.doesNotMatch(app, /Message gardé en attente/);
});

test("chat auto-refresh uses realtime plus a lightweight foreground marker fallback", () => {
  assert.match(schema, /create or replace function public\.get_chat_sync_marker/);
  assert.match(schema, /grant execute on function public\.get_chat_sync_marker\(uuid\) to authenticated;/);
  assert.match(coupleApi, /fetchRemoteChatSyncMarker/);
  assert.match(app, /AppState\.addEventListener\("change"/);
  assert.match(app, /CHAT_ACTIVE_SYNC_POLL_MS = 8000/);
  assert.match(app, /tab !== "chat"/);
  assert.match(app, /fetchRemoteChatSyncMarker\(preferredCoupleId\)/);
  assert.match(app, /refreshRemoteChatMessages\(preferredCoupleId, \{ force: true \}\)/);
  assert.match(app, /setInterval\(\(\) => \{/);
});

test("received chat photos are view-once and deleted through server RPC", () => {
  assert.match(schema, /create table if not exists public\.chat_attachment_tombstones/);
  assert.match(schema, /create policy "chat_attachment_tombstones_read_members"/);
  assert.match(schema, /create or replace function public\.consume_chat_attachment/);
  assert.match(schema, /own_attachment_not_consumable/);
  assert.match(schema, /delete from storage\.objects objects/);
  assert.match(schema, /delete from public\.chat_attachments attachments/);
  assert.match(schema, /'disappeared', true/);
  assert.match(schema, /chat_attachment_tombstones tombstones/);
  assert.match(coupleApi, /consumeRemoteChatAttachment/);
  assert.match(offlineQueue, /kind: "consume_attachment"/);
  assert.match(offlineQueue, /enqueueRemoteChatAttachmentConsumption/);
  assert.match(offlineQueue, /consumeRemoteChatAttachment/);
  assert.match(offlineQueue, /consumeAfter/);
  assert.match(offlineQueue, /removeRemoteChatAttachmentConsumption/);
  assert.match(offlineQueue, /sentAttachmentConsumptions/);
  assert.match(coupleApi, /"chat_attachment_tombstones"/);
  assert.match(app, /blurRadius=\{18\}/);
  assert.match(app, /onQueuePhotoConsumption/);
  assert.match(app, /openPhoto\(attachment, message\.id\)/);
  assert.match(app, /enqueueRemoteChatAttachmentConsumption/);
  assert.match(app, /delayMs: EPHEMERAL_PHOTO_VIEW_MS/);
  assert.match(app, /removeRemoteChatAttachmentConsumption/);
  assert.match(app, /result\.sentAttachmentConsumptions > 0/);
  assert.match(app, /queueChatAttachmentConsumption\(\{ attachmentId, coupleId, messageId \}\)/);
  assert.match(app, /setTimeout\(finish, EPHEMERAL_PHOTO_VIEW_MS\)/);
  assert.match(app, /Photo disparue/);
});

test("couple state refresh stays lightweight and profile realtime is scoped", () => {
  assert.doesNotMatch(getMyCoupleStateSql, /'chat_messages'/);
  assert.match(schema, /create or replace function public\.get_chat_messages/);
  assert.match(coupleApi, /chat_messages\?: RemoteChatMessage\[\]/);
  assert.match(coupleApi, /profileUserIds: string\[\] = \[\]/);
  assert.match(coupleApi, /filter: `id=eq\.\$\{profileUserId\}`/);
  assert.match(app, /remoteUserId: row\.user_id/);
  assert.match(app, /Array\.isArray\(remote\.chat_messages\)/);
  assert.match(app, /fallback\?\.chat\?\.messages/);
  assert.match(app, /coupleRemoteProfileIds\(couple\)/);
});
