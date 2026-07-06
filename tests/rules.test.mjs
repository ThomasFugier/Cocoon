import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const coupleApi = readFileSync(new URL("../src/lib/coupleApi.ts", import.meta.url), "utf8");
const uiTokens = readFileSync(new URL("../src/ui/tokens.ts", import.meta.url), "utf8");
const uiPrimitives = readFileSync(new URL("../src/ui/primitives.tsx", import.meta.url), "utf8");
const offlineQueue = readFileSync(new URL("../src/lib/offlineQueue.ts", import.meta.url), "utf8");
const easJson = readFileSync(new URL("../eas.json", import.meta.url), "utf8");
const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const envTypes = readFileSync(new URL("../src/env.d.ts", import.meta.url), "utf8");
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
const joinCoupleStart = schema.indexOf("create or replace function public.join_couple");
const getCoupleMembersStart = schema.indexOf("create or replace function public.get_couple_members");
const joinCoupleSql = joinCoupleStart >= 0 && getCoupleMembersStart > joinCoupleStart
  ? schema.slice(joinCoupleStart, getCoupleMembersStart)
  : "";
const profileScreenStart = app.indexOf("function ProfileScreen");
const statusEditorStart = app.indexOf("function StatusEmojiEditor");
const profileScreen = profileScreenStart >= 0 && statusEditorStart > profileScreenStart
  ? app.slice(profileScreenStart, statusEditorStart)
  : "";
const notificationRowStart = app.indexOf("function NotificationPreferenceRow");
const statusEditor = statusEditorStart >= 0 && notificationRowStart > statusEditorStart
  ? app.slice(statusEditorStart, notificationRowStart)
  : "";
const desireGameCardFaceStart = app.indexOf("function DesireGameCardFace");
const desireGameCardStart = app.indexOf("function DesireGameCard({");
const desireGameCardFace = desireGameCardFaceStart >= 0 && desireGameCardStart > desireGameCardFaceStart
  ? app.slice(desireGameCardFaceStart, desireGameCardStart)
  : "";
const enviesGameEmptyStart = app.indexOf("function EnviesGameEmpty");
const desireGameCard = desireGameCardStart >= 0 && enviesGameEmptyStart > desireGameCardStart
  ? app.slice(desireGameCardStart, enviesGameEmptyStart)
  : "";
const matchScreenStart = app.indexOf("function MatchScreen");
const matchRevealCardStart = app.indexOf("function MatchRevealCard");
const matchScreen = matchScreenStart >= 0 && matchRevealCardStart > matchScreenStart
  ? app.slice(matchScreenStart, matchRevealCardStart)
  : "";
const matchDetailModalStart = app.indexOf("function MatchDetailModal");
const hiddenMatchTeaserStart = app.indexOf("function HiddenMatchTeaser");
const matchDetailModal = matchDetailModalStart >= 0 && hiddenMatchTeaserStart > matchDetailModalStart
  ? app.slice(matchDetailModalStart, hiddenMatchTeaserStart)
  : "";
const categoryPickerStart = app.indexOf("function CategoryPickerModal");
const categoryChipsStart = app.indexOf("function CategoryChips");
const categoryPicker = categoryPickerStart >= 0 && categoryChipsStart > categoryPickerStart
  ? app.slice(categoryPickerStart, categoryChipsStart)
  : "";
const storeScreenStart = app.indexOf("function StoreScreen");
const storeCategoryOfferStart = app.indexOf("function StoreCategoryOffer");
const storeScreen = storeScreenStart >= 0 && storeCategoryOfferStart > storeScreenStart
  ? app.slice(storeScreenStart, storeCategoryOfferStart)
  : "";
const customDesireEditorStart = app.indexOf("function CustomDesireEditor");
const heroPanelStart = app.indexOf("function HeroPanel");
const customDesireEditor = customDesireEditorStart >= 0 && heroPanelStart > customDesireEditorStart
  ? app.slice(customDesireEditorStart, heroPanelStart)
  : "";
const purchaseLandingStart = app.indexOf("function PurchaseLandingModal");
const purchaseSuccessStart = app.indexOf("function PurchaseSuccessScreen");
const purchaseLanding = purchaseLandingStart >= 0 && purchaseSuccessStart > purchaseLandingStart
  ? app.slice(purchaseLandingStart, purchaseSuccessStart)
  : "";
const purchaseSuccessScreen = purchaseSuccessStart >= 0 && profileScreenStart > purchaseSuccessStart
  ? app.slice(purchaseSuccessStart, profileScreenStart)
  : "";
const coupleScreenStart = app.indexOf("function CoupleScreen");
const coupleStatStart = app.indexOf("function CoupleStat");
const coupleScreen = coupleScreenStart >= 0 && coupleStatStart > coupleScreenStart
  ? app.slice(coupleScreenStart, coupleStatStart)
  : "";
const leaveCoupleConfirmStart = app.indexOf("function LeaveCoupleConfirmScreen");
const statPillStart = app.indexOf("function StatPill");
const leaveCoupleConfirm = leaveCoupleConfirmStart >= 0 && statPillStart > leaveCoupleConfirmStart
  ? app.slice(leaveCoupleConfirmStart, statPillStart)
  : "";
const mainAppStart = app.indexOf("function MainShell");
const profileShortcutButtonStart = app.indexOf("function ProfileShortcutButton");
const mainApp = mainAppStart >= 0 && profileShortcutButtonStart > mainAppStart
  ? app.slice(mainAppStart, profileShortcutButtonStart)
  : "";
const homeMoodHeroStart = app.indexOf("function HomeMoodHero");
const homeMoodSettingsSheetStart = app.indexOf("function HomeMoodSettingsSheet");
const homeStatusTeaserStart = app.indexOf("function HomeStatusTeaser");
const homeMoodHero = homeMoodHeroStart >= 0 && homeMoodSettingsSheetStart > homeMoodHeroStart
  ? app.slice(homeMoodHeroStart, homeMoodSettingsSheetStart)
  : "";
const homeMoodSettingsSheet = homeMoodSettingsSheetStart >= 0 && homeStatusTeaserStart > homeMoodSettingsSheetStart
  ? app.slice(homeMoodSettingsSheetStart, homeStatusTeaserStart)
  : "";
const serverNoticeStart = app.indexOf("function ServerNoticeToast");
const secretVoteToastStart = app.indexOf("function SecretVoteToast");
const serverNoticeToast = serverNoticeStart >= 0 && secretVoteToastStart > serverNoticeStart
  ? app.slice(serverNoticeStart, secretVoteToastStart)
  : "";
const loadingContentStart = app.indexOf("function LoadingScreenContent");
const debugPreviewShellStart = app.indexOf("function DebugPreviewShell");
const loadingContent = loadingContentStart >= 0 && debugPreviewShellStart > loadingContentStart
  ? app.slice(loadingContentStart, debugPreviewShellStart)
  : "";
const chatScreenStart = app.indexOf("function ChatScreen");
const chatSuggestionPromptsStart = app.indexOf("function chatSuggestionPrompts");
const chatScreen = chatScreenStart >= 0 && chatSuggestionPromptsStart > chatScreenStart
  ? app.slice(chatScreenStart, chatSuggestionPromptsStart)
  : "";
const debugScreenStart = app.indexOf("function DebugScreen");
const debugInfoCellStart = app.indexOf("function DebugInfoCell");
const debugScreen = debugScreenStart >= 0 && debugInfoCellStart > debugScreenStart
  ? app.slice(debugScreenStart, debugInfoCellStart)
  : "";

function isPositiveMatchVote(level) {
  return typeof level === "number" && level >= 1;
}

function isMutualMatch(a, b) {
  return isPositiveMatchVote(a) && isPositiveMatchVote(b);
}

function appStyleSheetBody() {
  const marker = "const styles = StyleSheet.create({";
  const start = app.indexOf(marker);
  assert.notEqual(start, -1);

  let depth = 1;
  let index = start + marker.length;

  for (; index < app.length; index += 1) {
    if (app[index] === "{") {
      depth += 1;
    } else if (app[index] === "}") {
      depth -= 1;

      if (depth === 0) {
        break;
      }
    }
  }

  return {
    body: app.slice(start + marker.length, index),
    start,
  };
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

test("style sheet does not keep unreferenced app styles", () => {
  const { body, start } = appStyleSheetBody();
  const styleKeys = new Set([...body.matchAll(/^\s{2}([A-Za-z_$][\w$]*): \{/gm)].map((match) => match[1]));
  const styleRefs = new Set([...app.slice(0, start).matchAll(/styles\.([A-Za-z_$][\w$]*)/g)].map((match) => match[1]));
  const unused = [...styleKeys].filter((key) => !styleRefs.has(key)).sort();
  const missing = [...styleRefs].filter((key) => !styleKeys.has(key)).sort();

  assert.deepEqual(unused, []);
  assert.deepEqual(missing, []);
});

test("leave couple: leaving removes only the active user and deletes an empty couple", () => {
  const remaining = remainingMembersAfterLeave([
    { userId: "a" },
    { userId: "b" },
  ], "a");
  assert.deepEqual(remaining, [{ userId: "b" }]);
  assert.deepEqual(remainingMembersAfterLeave(remaining, "b"), []);
});

test("leave couple confirmation requires typing the partner goodbye", () => {
  assert.match(app, /const expectedConfirmation = `Aurevoir \$\{partnerName\}`/);
  assert.match(app, /confirmationInput\.trim\(\)\.toLocaleLowerCase\("fr-FR"\)/);
  assert.match(app, /expectedConfirmation\.toLocaleLowerCase\("fr-FR"\)/);
  assert.match(app, /placeholder=\{`Écris « \$\{expectedConfirmation\} » pour confirmer`\}/);
  assert.match(app, />😭</);
  assert.match(app, /disabled=\{!canConfirm\}/);
  assert.match(leaveCoupleConfirm, /emoji: \{[\s\S]{0,80}fontSize: 58 \* leaveScale[\s\S]{0,80}lineHeight: 66 \* leaveScale/);
  assert.match(leaveCoupleConfirm, /useSafeAreaInsets\(\)/);
  assert.match(leaveCoupleConfirm, /useWindowDimensions\(\)/);
  assert.match(leaveCoupleConfirm, /leaveContentWidth = Math\.min\(620, Math\.max\(0, viewportWidth - leaveSideInset \* 2\)\)/);
  assert.match(leaveCoupleConfirm, /contentContainerStyle=\{\[styles\.leaveScrollContent, leaveLayout\.scroll\]\}/);
  assert.match(leaveCoupleConfirm, /style=\{\[styles\.leaveInner, leaveLayout\.inner\]\}/);
  assert.match(leaveCoupleConfirm, /style=\{\[styles\.leaveContentStage, leaveLayout\.contentStage\]\}/);
  assert.match(leaveCoupleConfirm, /Tu pourras toujours te remettre en couple avec \{partnerName\} plus tard\./);
  assert.match(leaveCoupleConfirm, /style=\{\[styles\.leaveReassurance, leaveLayout\.reassurance\]\}[\s\S]{0,900}style=\{\[styles\.leaveConfirmBlock, leaveLayout\.confirmBlock\]\}/);
  assert.match(leaveCoupleConfirm, /style=\{\[styles\.leaveConfirmBlock, leaveLayout\.confirmBlock\]\}[\s\S]{0,1400}style=\{\[styles\.leaveActions, leaveLayout\.actions\]\}/);
  assert.match(app, /leaveInner: \{[\s\S]{0,160}justifyContent: "center"/);
  assert.match(app, /leaveEmoji: \{[\s\S]{0,80}alignSelf: "center"[\s\S]{0,160}textAlign: "center"/);
  assert.match(app, /leaveReassuranceText: \{[\s\S]{0,120}textAlign: "center"/);
  assert.match(app, /leaveTopBar: \{[\s\S]{0,160}position: "absolute"/);
  assert.doesNotMatch(app, /leaveInner: \{[\s\S]{0,180}maxWidth: 430/);
  assert.doesNotMatch(app, /leaveInner: \{[\s\S]{0,180}justifyContent: "space-between"/);
});

test("couple membership is unique and join switches atomically server-side", () => {
  assert.match(schema, /couple_members_one_active_couple_per_user_idx/);
  assert.match(schema, /on public\.couple_members \(user_id\)/);
  assert.match(schema, /perform pg_advisory_xact_lock\(hashtext\(v_user_id::text\)\)/);
  assert.match(schema, /where couples\.invite_code = upper\(trim\(p_invite_code\)\)\s+for update;/);
  assert.match(schema, /with old_couples as \(/);
  assert.match(schema, /delete from public\.couple_members members[\s\S]*returning members\.couple_id/);
  assert.match(joinCoupleSql, /delete from public\.couples couples[\s\S]*select deleted_memberships\.couple_id from deleted_memberships[\s\S]*not exists \(/);
  assert.doesNotMatch(joinCoupleSql, /select couple_id from deleted_memberships/);
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
  assert.match(offlineQueue, /return item\.kind === "vote" \|\| item\.kind === "chat_message"/);
  assert.match(offlineQueue, /clearVisibleOfflineQueue/);
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
  assert.match(app, /if \(session && hasSupabaseConfig\) \{\s+if \(!remoteAccountReady\) \{/);
  assert.match(app, /const canWriteRemote = canWriteRemoteCouple\(couple\)/);
  assert.match(app, /if \(!canWriteRemote && !localModeEnabled\) \{[\s\S]{0,180}return false;/);
  assert.match(app, /if \(!canWriteRemote\) \{[\s\S]{0,220}withLocalDesireVote\(current, cardId, level\)[\s\S]{0,260}\} else \{[\s\S]{0,900}saveRemoteVote/);
  assert.match(app, /if \(!canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,180}return;[\s\S]{0,900}saveRemoteCustomDesire/);
  assert.match(app, /if \(canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,900}sendRemoteChatMessage/);
  assert.match(app, /if \(!canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,260}Achat impossible/);
  assert.match(app, /if \(!session \|\| !couple \|\| !canWriteRemoteCouple\(couple\)\) \{/);
  assert.match(app, /if \(!canWriteRemoteCouple\(currentCouple\)\) \{[\s\S]{0,80}return;/);
  assert.match(app, /if \(!canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,180}return;[\s\S]{0,300}markRemoteMatchRevealed/);
});

test("full reset signs out so Supabase cannot auto-hydrate the previous couple", () => {
  assert.match(app, /const handleReset = useCallback\(async \(\) => \{\s+await signOut\(\);\s+await clearCoupleState\(\);/);
  assert.match(app, /const handleReset = useCallback\(async \(\) => \{[\s\S]*setSession\(null\);[\s\S]*setGuestMode\(false\);[\s\S]*updateIntroSeen\(false\);/);
  assert.match(app, /const handleReset = useCallback\(async \(\) => \{[\s\S]*setRemoteHydrating\(false\);/);
});

test("profile screen puts app profile first and account second", () => {
  const profileIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Profil</Text>");
  const accountIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Compte</Text>");
  const notificationsIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Notifications</Text>");
  const applicationIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Application</Text>");

  assert.match(profileScreen, /styles\.profileHeader/);
  assert.match(profileScreen, /<Text style=\{styles\.profileHeaderTitle\}>Profil<\/Text>/);
  assert.match(profileScreen, /onBack: \(\) => void/);
  assert.match(profileScreen, /useSafeAreaInsets\(\)/);
  assert.match(profileScreen, /useWindowDimensions\(\)/);
  assert.match(app, /function fullScreenSurfaceMetrics\(viewportWidth: number\)/);
  assert.match(profileScreen, /const profileSurface = fullScreenSurfaceMetrics\(viewportWidth\)/);
  assert.match(profileScreen, /const profileContentWidth = profileSurface\.contentWidth/);
  assert.match(profileScreen, /contentContainerStyle=\{\[styles\.profileScreen, profileScreenStyle\]\}/);
  assert.match(profileScreen, /style=\{\[styles\.profileHeader, profileContentFrameStyle\]\}/);
  assert.match(profileScreen, /style=\{\[styles\.profileMainArea, profileContentFrameStyle\]\}/);
  assert.match(profileScreen, /width: profileContentWidth/);
  assert.doesNotMatch(app, /profileHeader: \{[\s\S]{0,140}maxWidth: 430/);
  assert.doesNotMatch(app, /profileMainArea: \{[\s\S]{0,100}maxWidth: 430/);
  assert.ok(profileIndex >= 0);
  assert.ok(accountIndex >= 0);
  assert.ok(profileIndex < accountIndex);
  assert.ok(accountIndex < notificationsIndex);
  assert.ok(notificationsIndex < applicationIndex);
  assert.match(profileScreen, /<StatusEmojiEditor profile=\{activeProfile\} onChange=\{onStatusEmojiChange\} onNameChange=\{onProfileNameChange\} \/>/);
  assert.doesNotMatch(profileScreen, /<Text style=\{styles\.profileSectionTitle\}>Avatar<\/Text>/);
  assert.doesNotMatch(profileScreen, />Statut<\/Text>/);
  assert.doesNotMatch(profileScreen, /<Text style=\{styles\.profileSectionTitle\}>Actions<\/Text>/);
  ["Réinitialiser le test", "Revoir l'intro", "Restaurer les achats", "Quitter le couple", "Supprimer mon compte", "Se déconnecter"].forEach((label) => {
    assert.ok(profileScreen.includes(label));
  });
  assert.doesNotMatch(profileScreen, /Données privées par couple/);
  assert.match(profileScreen, /\{PROJECT_VERSION\.label\}/);
  assert.match(statusEditor, /TextInput/);
  assert.match(statusEditor, /onNameChange: \(name: string\) => void/);
  assert.match(statusEditor, /accessibilityLabel="Nom d'utilisateur"/);
  assert.match(statusEditor, /onBlur=\{submitProfileName\}/);
  assert.match(statusEditor, /onSubmitEditing=\{submitProfileName\}/);
  assert.match(app, /function normalizeProfileDisplayName\(value: string, fallback = "Moi"\)/);
  assert.match(app, /function withUpdatedProfileName\(couple: CoupleState, partnerId: PartnerId, displayName: string\)/);
  assert.match(app, /const handleProfileNameChange = useCallback/);
  assert.match(coupleApi, /export async function saveRemoteProfileName\(displayName: string\)/);
  assert.match(statusEditor, /maxLength=\{8\}/);
  assert.match(statusEditor, /onChangeText=\{handleCustomEmojiChange\}/);
  assert.match(statusEditor, /statusEmojiPresets\.slice\(0, 8\)\.map/);
  assert.match(statusEditor, /Ton nom et ton avatar visibles/);
  assert.doesNotMatch(statusEditor, /Utiliser|submitCustomEmoji|statusCustomButton/);
  assert.doesNotMatch(statusEditor, /Ton signal du moment|Suggestions rapides|Emoji perso/);
  assert.match(app, /statusPresetGrid: \{[\s\S]{0,120}flexWrap: "nowrap"/);
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

test("sync error toast uses the compact yellow offline notice", () => {
  assert.match(app, /Hors ligne\. Vos r.ponses sont gard.es au chaud et repartiront toutes seules\./);
  assert.match(serverNoticeToast, /<Send size=\{15\} color="#6D7CFF" \/>/);
  assert.doesNotMatch(serverNoticeToast, /serverNoticeTitle|serverNoticeClose|syncNoticeTitle/);
  assert.match(app, /serverNoticeCard: \{[\s\S]{0,140}backgroundColor: candy\.yellow/);
  assert.match(app, /serverNoticeCard: \{[\s\S]{0,220}borderRadius: 14/);
  assert.match(app, /serverNoticeText: \{[\s\S]{0,120}color: candy\.black/);
});

test("loading state uses the fake app skeleton", () => {
  assert.match(app, /return <AppSkeletonLoadingScreen \/>/);
  assert.match(loadingContent, /function AppSkeletonLoadingContent/);
  assert.match(loadingContent, /const loadingSkeletonLayouts = \["home", "envies", "store"\] as const/);
  assert.match(loadingContent, /const loadingSkeletonRevealCount = 14/);
  assert.match(loadingContent, /setLayoutIndex/);
  assert.match(loadingContent, /Math\.random\(\)/);
  assert.match(loadingContent, /Animated\.stagger\(\s+78/);
  assert.match(loadingContent, /Animated\.stagger\(\s+18/);
  assert.match(loadingContent, /styles\.loadingSkeletonTopRow/);
  assert.match(loadingContent, /styles\.loadingSkeletonHeroCard/);
  assert.match(loadingContent, /styles\.loadingSkeletonList/);
  assert.match(loadingContent, /styles\.loadingSkeletonPackGrid/);
  assert.match(loadingContent, /function SkeletonBlock\(\{ reveal, style \}/);
  assert.match(loadingContent, /outputRange: \[-18, 0\]/);
  assert.match(loadingContent, /Synchronisation de votre espace/);
  assert.match(loadingContent, /styles\.loadingSyncSpinner/);
  assert.doesNotMatch(loadingContent, /ActivityIndicator|Pr.paration de WeSpice/);
  assert.match(app, /loadingSkeletonBlock: \{[\s\S]{0,120}backgroundColor: "rgba\(255,144,187,0\.58\)"/);
  assert.match(app, /loadingSyncPill: \{[\s\S]{0,180}backgroundColor: "rgba\(178,32,94,0\.88\)"/);
});

test("debug screen can simulate store purchases locally", () => {
  assert.match(app, /function withUnlockedCategories/);
  assert.match(app, /function withUnlockedFeatures/);
  assert.match(app, /function withLocalDesireVote/);
  assert.match(app, /function purchaseSuccessForFeature/);
  assert.match(app, /const handleDebugUnlockCategory = useCallback/);
  assert.match(app, /const handleDebugUnlockFeature = useCallback/);
  assert.match(app, /const handleDebugUnlockAllPurchases = useCallback/);
  assert.match(app, /message\.includes\("daily_limit_reached"\) && localModeEnabled && hasUnlimitedResponses\(couple\)/);
  assert.match(app, /setResponseLimitPromptVisible\(false\)/);
  assert.match(app, /withLocalDesireVote\(current, cardId, level\)/);
  assert.match(app, /Achat debug simul. localement/);
  assert.match(app, /setPurchaseSuccess\(\{ kind: "category", category \}\)/);
  assert.match(app, /setPurchaseSuccess\(purchaseSuccessForFeature\(feature\)\)/);
  assert.match(debugScreen, /Boutique debug/);
  assert.match(debugScreen, /Simule les achats localement sans RevenueCat/);
  assert.match(debugScreen, /PAID_PACK_CATEGORIES\.map/);
  assert.match(debugScreen, /debugFeaturePurchases\.map/);
  assert.match(debugScreen, /onDebugUnlockAllPurchases/);
  assert.match(debugScreen, /onDebugUnlockCategory\(category\)/);
  assert.match(debugScreen, /onDebugUnlockFeature\(item\.feature\)/);
});

test("web store purchases unlock locally without the debug screen", () => {
  assert.match(app, /function withPurchaseTargetUnlocked/);
  assert.match(app, /if \(storeBypassEnabled \|\| Platform\.OS === "web"\) \{/);
  assert.match(app, /setCouple\(withPurchaseTargetUnlocked\(couple, config\)\)/);
  assert.match(app, /setPurchaseSuccess\(success\)/);
  assert.match(app, /setResponseLimitPromptVisible\(false\)/);
  assert.match(app, /await Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Success\)/);
  assert.match(app, /if \(session\) \{[\s\S]{0,260}purchaseWithRevenueCat/);
});

test("store bypass mode keeps Supabase active while skipping RevenueCat", () => {
  assert.match(app, /const storeBypassEnabled = process\.env\.EXPO_PUBLIC_ENABLE_STORE_BYPASS === "true"/);
  assert.match(app, /storeBypassEnabled \? "Mode test: achat/);
  assert.match(app, /if \(storeBypassEnabled\) \{[\s\S]{0,700}withUnlockedFeatures\(withUnlockedCategories\(couple, PAID_PACK_CATEGORIES\), PAID_FEATURES\)/);
  assert.match(app, /storeBypassEnabled \? \(fallback\?\.unlockedCategories \?\? \[\]\)\.filter/);
  assert.match(app, /storeBypassEnabled \? \(fallback\?\.unlockedFeatures \?\? \[\]\)\.filter/);
  assert.match(envExample, /EXPO_PUBLIC_ENABLE_STORE_BYPASS=false/);
  assert.match(envTypes, /EXPO_PUBLIC_ENABLE_STORE_BYPASS\?: string/);
  assert.match(readFileSync(new URL("../README.md", import.meta.url), "utf8"), /EXPO_PUBLIC_ENABLE_STORE_BYPASS=true/);
});

test("chat screen uses the dark ephemeral conversation layout", () => {
  assert.doesNotMatch(mainApp, /tab !== "chat" \? \(/);
  assert.match(mainApp, /const chatBottomNavInset = tabDockPaddingBottom \+ TAB_DOCK_VISIBLE_HEIGHT \+ CHAT_COMPOSER_NAV_GAP/);
  assert.match(mainApp, /const tabDockFadeColors: readonly \[string, string, string\] = tab === "chat"[\s\S]{0,140}candy\.darkColor/);
  assert.match(app, /<CandyFrame dark=\{tab === "chat"\}>/);
  assert.match(app, /function CandyFrame\(\{ children, dark = false, hideDoodles = false \}/);
  assert.match(app, /colors=\{dark \? \[candy\.darkColor, candy\.darkColor\] : \[candy\.red, candy\.red\]\}/);
  assert.match(mainApp, /styles\.app, tab === "chat" && styles\.appDark/);
  assert.match(mainApp, /styles\.tabDock, tab === "chat" && styles\.tabDockDark/);
  assert.match(mainApp, /colors=\{tabDockFadeColors\}/);
  assert.match(mainApp, /bottomNavInset=\{chatBottomNavInset\}/);
  assert.match(mainApp, /hasLinkedPartner\(couple\) \? \(/);
  assert.match(mainApp, /<ChatScreen[\s\S]{0,260}onBack=\{\(\) => onTabChange\("home"\)\}/);
  assert.match(mainApp, /<ChatUnavailableScreen[\s\S]{0,220}onGoCouple=\{\(\) => onTabChange\("couple"\)\}/);
  assert.match(app, /function ChatUnavailableScreen/);
  assert.match(app, /Chat impossible/);
  assert.match(app, /Inviter ou rejoindre/);
  assert.match(chatScreen, /bottomNavInset: number/);
  assert.match(chatScreen, /const composerBottomPadding = Math\.max\(bottomNavInset, safeAreaInsets\.bottom \+ TAB_DOCK_VISIBLE_HEIGHT \+ CHAT_COMPOSER_NAV_GAP\)/);
  assert.match(chatScreen, /const scrollBottomPadding = Math\.max\(22, safeAreaInsets\.bottom \+ 14\)/);
  assert.doesNotMatch(chatScreen, /composerBottomOffset/);
  assert.match(chatScreen, /style=\{\[styles\.chatComposerDock, \{ paddingBottom: composerBottomPadding \}\]\}/);
  assert.match(chatScreen, /onBack: \(\) => void/);
  assert.match(chatScreen, /<SpringPressable onPress=\{onBack\} style=\{styles\.chatBackButton\}>/);
  assert.match(chatScreen, /chatHeaderAvatarStack/);
  assert.match(chatScreen, /Éphémère · s'efface demain à 6:00/);
  assert.match(chatScreen, /À propos de votre match/);
  assert.match(chatScreen, /placeholder="Message éphémère\.\.\."/);
  assert.match(chatScreen, /<Camera size=\{20\} color=\{candy\.cream\} \/>/);
  assert.match(app, /Photo privée · vue unique · 10 s/);
  assert.match(app, /chatPhotoEye/);
  assert.match(chatScreen, /!hasMessageContent && !hasMessages/);
  assert.match(uiTokens, /export const darkColor = "#26122E"/);
  assert.match(uiTokens, /darkColor,\s+black: darkColor/);
  assert.match(uiPrimitives, /primary: \{[\s\S]{0,90}backgroundColor: wsColors\.darkColor/);
  assert.match(app, /flex: \{[\s\S]{0,80}alignSelf: "stretch"[\s\S]{0,80}width: "100%"/);
  assert.match(app, /frame: \{[\s\S]{0,100}alignSelf: "stretch"[\s\S]{0,100}width: "100%"/);
  assert.match(app, /frameDark: \{[\s\S]{0,80}backgroundColor: candy\.darkColor/);
  assert.match(app, /safeArea: \{[\s\S]{0,100}alignSelf: "stretch"[\s\S]{0,100}width: "100%"/);
  assert.match(app, /safeAreaDark: \{[\s\S]{0,80}backgroundColor: candy\.darkColor/);
  assert.match(app, /app: \{[\s\S]{0,100}alignSelf: "stretch"[\s\S]{0,100}width: "100%"/);
  assert.match(app, /appDark: \{[\s\S]{0,80}backgroundColor: candy\.darkColor/);
  assert.match(app, /content: \{[\s\S]{0,100}alignSelf: "stretch"[\s\S]{0,100}width: "100%"/);
  assert.match(app, /chatFrame: \{[\s\S]{0,80}backgroundColor: candy\.darkColor/);
  assert.match(app, /chatFrame: \{[\s\S]{0,120}alignSelf: "stretch"[\s\S]{0,120}width: "100%"/);
  assert.match(app, /chatScroller: \{[\s\S]{0,80}flex: 1[\s\S]{0,80}width: "100%"/);
  assert.match(app, /chatUnavailableScreen: \{[\s\S]{0,160}backgroundColor: candy\.darkColor/);
  assert.match(app, /chatUnavailablePrimary: \{[\s\S]{0,140}backgroundColor: candy\.cream/);
  assert.match(app, /tabDockDark: \{[\s\S]{0,80}backgroundColor: candy\.darkColor/);
  assert.match(app, /chatHeaderMiniAvatarMine: \{[\s\S]{0,120}borderColor: candy\.darkColor/);
  assert.match(app, /chatPhotoEye: \{[\s\S]{0,120}backgroundColor: candy\.darkColor/);
  assert.doesNotMatch(app, /#2A1230/);
  assert.match(app, /chatComposerDock: \{[\s\S]{0,180}backgroundColor: candy\.darkColor[\s\S]{0,180}paddingHorizontal: 16[\s\S]{0,120}width: "100%"/);
  assert.doesNotMatch(app, /chatComposerDock: \{[\s\S]{0,160}position: "absolute"/);
  assert.match(app, /chatComposer: \{[\s\S]{0,140}backgroundColor: "transparent"/);
  assert.match(app, /chatComposer: \{[\s\S]{0,180}overflow: "visible"[\s\S]{0,80}width: "100%"/);
  assert.match(app, /chatIconButton: \{[\s\S]{0,160}flexShrink: 0/);
  assert.match(app, /chatInput: \{[\s\S]{0,320}minWidth: 0/);
  assert.match(app, /chatSendButton: \{[\s\S]{0,160}flexShrink: 0/);
  assert.match(app, /chatInput: \{[\s\S]{0,120}backgroundColor: candy\.cream/);
  assert.match(app, /chatSendButton: \{[\s\S]{0,120}backgroundColor: candy\.red/);
});

test("bottom navigation keeps five main tabs and profile shortcut stays on home", () => {
  const tabsStart = app.indexOf("function CandyTabs");
  const enviesStart = app.indexOf("function EnviesScreen");
  const candyTabs = tabsStart >= 0 && enviesStart > tabsStart ? app.slice(tabsStart, enviesStart) : "";

  ["Accueil", "Envies", "Matchs", "Chat", "Nous"].forEach((label) => {
    assert.ok(candyTabs.includes(`label: "${label}"`));
  });

  assert.doesNotMatch(candyTabs, /key: "profil"|label: "Profil"/);
  assert.match(app, /style=\{styles\.homeProfileButton\}/);
  assert.match(app, /onOpenProfile=\{\(\) => onTabChange\("profil"\)\}/);
  assert.doesNotMatch(app, /<ProfileShortcutButton/);
});

test("home keeps a next-action quest cue", () => {
  assert.match(app, /Prochaine action/);
  assert.match(app, /homeNextQuestLabel/);
});

test("home header keeps the larger brand and profile affordances", () => {
  assert.match(app, /const headerHeight = 57 \* scale/);
  assert.match(app, /minHeight: 54 \* homeScale, paddingHorizontal: 27 \* homeScale/);
  assert.match(app, /fontSize: 21 \* homeScale, lineHeight: 26 \* homeScale/);
  assert.match(app, /height: 57 \* homeScale, width: 57 \* homeScale/);
  assert.match(app, /fontSize: 27 \* homeScale, lineHeight: 33 \* homeScale/);
});

test("home keeps no-scroll priority with a responsive fallback", () => {
  assert.match(app, /PixelRatio/);
  assert.match(app, /const homeFontScale = PixelRatio\.getFontScale\(\)/);
  assert.match(app, /const homeScrollFallback = \(/);
  assert.match(app, /homeFontScale > 1\.08/);
  assert.match(app, /viewportWidth < 360/);
  assert.match(app, /homeFrameHeight < 690/);
  assert.match(app, /homeRhythm <= 10/);
  assert.match(app, /homeSurpriseHeight < 132/);
  assert.match(app, /overflow: homeScrollFallback \? "visible" : "hidden"/);
  assert.match(app, /paddingBottom: homeScrollFallback \? homeBottomPadding \+ homeRhythm : homeBottomPadding/);
  assert.match(app, /\.\.\.\(homeScrollFallback \? \{\} : \{ height: homeFrameHeight \}\)/);
  assert.match(app, /scrollEnabled=\{homeScrollFallback\}/);
  assert.doesNotMatch(app, /scrollEnabled=\{false\}/);
  assert.match(app, /<Text\s+adjustsFontSizeToFit[\s\S]{0,120}numberOfLines=\{2\}[\s\S]{0,120}styles\.homeHeroTitle/);
  assert.match(app, /<Text adjustsFontSizeToFit minimumFontScale=\{0\.76\} numberOfLines=\{3\} style=\{\[styles\.homeSurpriseTitle/);
});

test("home mood gear opens a mood and notification bottom sheet", () => {
  assert.match(homeMoodHero, /onOpenMoodPanel/);
  assert.match(homeMoodHero, /<Settings color=\{candy\.white\} size=\{18 \* heroScale\}/);
  assert.match(homeMoodSettingsSheet, /Ton mood/);
  assert.match(homeMoodSettingsSheet, /Envoyer le signal/);
  assert.match(homeMoodSettingsSheet, /animationType="none"/);
  assert.doesNotMatch(homeMoodSettingsSheet, /animationType="fade"/);
  assert.match(homeMoodSettingsSheet, /const sheetHiddenY = Math\.max\(420, height\)/);
  assert.match(homeMoodSettingsSheet, /new Animated\.Value\(sheetHiddenY\)/);
  assert.match(homeMoodSettingsSheet, /const \[sheetMounted, setSheetMounted\] = useState\(visible\)/);
  assert.match(homeMoodSettingsSheet, /Animated\.spring\(dragY,[\s\S]{0,240}toValue: 0/);
  assert.match(homeMoodSettingsSheet, /const requestSheetClose = useCallback/);
  assert.match(homeMoodSettingsSheet, /Animated\.timing\(dragY,[\s\S]{0,240}toValue: sheetHiddenY/);
  assert.match(homeMoodSettingsSheet, /const modalVisible = visible \|\| sheetMounted/);
  assert.match(homeMoodSettingsSheet, /onRequestClose=\{\(\) => requestSheetClose\(\)\}/);
  assert.match(homeMoodSettingsSheet, /onPress=\{\(\) => requestSheetClose\(\)\} style=\{styles\.homeMoodSheetBackdrop\}/);
  assert.match(homeMoodSettingsSheet, /<SpringPressable onPress=\{\(\) => requestSheetClose\(\)\} style=\{styles\.homeMoodSheetClose\}/);
  assert.match(homeMoodSettingsSheet, /styles\.homeMoodSheetHandle/);
  assert.match(homeMoodSettingsSheet, /onStartShouldSetPanResponder: \(\) => true/);
  assert.match(homeMoodSettingsSheet, /onPanResponderTerminationRequest: \(\) => false/);
  assert.match(homeMoodSettingsSheet, /requestSheetClose\(\);\s+return;/);
  assert.match(homeMoodSettingsSheet, /isMoodNotificationEnabled\(couple, activeId\)/);
  assert.match(homeMoodSettingsSheet, /<NotificationPreferenceRow/);
  assert.match(homeMoodSettingsSheet, /title="Humeur partagée"/);
  assert.match(homeMoodSettingsSheet, /onMoodNotificationPreference\(!notificationsEnabled\)/);
  assert.doesNotMatch(homeMoodSettingsSheet, /statusEmojiPresets\.map/);
  assert.doesNotMatch(homeMoodSettingsSheet, /onStatusEmojiChange/);
  assert.match(app, /homeMoodSettingsChip/);
  assert.match(app, /label: "Tendre"[\s\S]{0,120}label: "C.lin"[\s\S]{0,120}label: "Joueur"[\s\S]{0,120}label: "Chaud"/);
  assert.match(app, /homeMoodSheetOverlay: \{[\s\S]{0,80}backgroundColor: "rgba\(38,18,46,0\.48\)"/);
  assert.match(app, /homeMoodSheet: \{[\s\S]{0,180}maxWidth: 430/);
  assert.match(app, /homeMoodSheet: \{[\s\S]{0,220}minHeight: "78%"/);
  assert.match(app, /homeMoodSheetHandleHitArea: \{[\s\S]{0,120}alignSelf: "stretch"[\s\S]{0,80}height: 52/);
  assert.match(app, /homeMoodSheetHandleHitArea: \{[\s\S]{0,220}marginHorizontal: -18/);
  assert.match(app, /homeMoodSignalRow: \{[\s\S]{0,260}minHeight: 68/);
  assert.match(app, /homeMoodSignalRow: \{[\s\S]{0,300}paddingVertical: 10/);
  assert.match(app, /moodSignalOptions/);
});

test("home daily card prioritizes unanswered cards and labels answered states", () => {
  assert.match(app, /function homeSurpriseStatusLabel/);
  assert.match(app, /return "Nouveau"/);
  assert.match(app, /isCardMatch\(couple, card\.id\) \? "Match" : "Répondu"/);
  assert.match(app, /const cardCandidates = unansweredCards\.length \? unansweredCards : answeredCards/);
  assert.match(app, /\? `\$\{partnerName\} a r.pondu\.`\s*: `\$\{partnerName\} n'a pas encore r.pondu\.`/);
  assert.doesNotMatch(app, /R.ponds sans voir son choix/);
  assert.match(app, /Jouer maintenant/);
  assert.doesNotMatch(app, /R.pondre maintenant/);
  assert.match(app, /styles\.homeSurpriseActionStack/);
  assert.match(app, /homeSurpriseTitle: \{[\s\S]{0,140}textAlign: "center"/);
  assert.match(app, /minHeight: 61 \* cardScale/);
  assert.match(app, /fontSize: 17\.5 \* cardScale/);
  assert.match(app, /paddingBottom: 23 \* cardScale/);
  assert.match(app, /\{statusLabel\}<\/Text>/);
});

test("join prompt returns to invite only when explicitly requested", () => {
  assert.match(app, /const handleShowJoinPrompt = useCallback\(\(returnToInvite = false\) => \{/);
  assert.match(app, /setJoinReturnToInvite\(returnToInvite === true\)/);
  assert.match(app, /onJoin=\{\(\) => handleShowJoinPrompt\(true\)\}/);
  assert.match(app, /onJoinPartner=\{handleShowJoinPrompt\}/);
});

test("game cards use title as prompt and blurb as footer description", () => {
  assert.match(desireGameCardFace, /function DesireGameCardFace/);
  assert.match(desireGameCardFace, /styles\.desireGameDeck/);
  assert.match(desireGameCardFace, /styles\.desireGameCard/);
  assert.match(desireGameCardFace, /<Text adjustsFontSizeToFit numberOfLines=\{5\} style=\{\[styles\.desireGameTitle, titleStyle\]\}>\{prompt\}<\/Text>/);
  assert.match(desireGameCardFace, /<Text numberOfLines=\{2\} style=\{\[styles\.desireGameText, textStyle\]\}>\{description\}<\/Text>/);
  assert.match(desireGameCard, /const prompt = card\.title \|\| card\.blurb/);
  assert.match(desireGameCard, /const description = card\.blurb \|\| card\.title/);
  assert.match(desireGameCard, /const activeVote = confirmingVote \?\? selectedVote/);
  assert.match(desireGameCard, /<DesireGameCardFace[\s\S]{0,280}description=\{description\}[\s\S]{0,160}prompt=\{prompt\}/);
  assert.doesNotMatch(desireGameCard, /privacyCopy|partnerName/);
});

test("tutorial demo card reuses the game card face", () => {
  assert.match(app, /<DesireGameCardFace[\s\S]{0,180}cardStyle=\{demoLayout\.practiceGameCard\}[\s\S]{0,80}category="Vanille"[\s\S]{0,120}deckStyle=\{demoLayout\.practiceDeck\}/);
  assert.match(app, /prompt="Un bain . deux, lumi.re tamis.e, t.l.phones interdits\."/);
  assert.match(app, /description="R.ponse priv.e\."/);
  assert.doesNotMatch(app, /welcomePracticeCard|welcomePracticeCorner|welcomePracticePrompt|welcomePracticeCaption/);
});

test("game card stage sits lower and validates the selected answer", () => {
  assert.match(app, /const \[gameTransitionVoteLevel, setGameTransitionVoteLevel\] = useState<VoteLevel \| null>\(null\)/);
  assert.match(app, /setGameTransitionVoteLevel\(level\)/);
  assert.match(app, /voteLevel=\{gameTransitionVoteLevel \?\? undefined\}/);
  assert.match(app, /confirmingVote=\{activeGameCard\.id === gameTransitionCardId \? gameTransitionVoteLevel \?\? undefined : undefined\}/);
  assert.match(app, /gameCardStageHost: \{[\s\S]{0,80}flexGrow: 1,[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /gameCardTransitionBody: \{[\s\S]{0,60}flexGrow: 1/);
  assert.match(app, /exitTranslateY = exit\.interpolate\(\{[\s\S]{0,120}outputRange: \[0, 28\]/);
  assert.match(app, /desireGameStage: \{[\s\S]{0,120}flexGrow: 1/);
  assert.match(desireGameCard, /const gameVerticalDrop = Math\.round\(Math\.min\(roomy \? 86 : 72, Math\.max\(38, height \* 0\.075\)\)\)/);
  assert.match(desireGameCard, /\{ paddingTop: gameVerticalDrop \}/);
  assert.match(app, /desireGameDeck: \{[\s\S]{0,120}maxWidth: 400,[\s\S]{0,80}minHeight: 388/);
  assert.match(app, /desireGameCard: \{[\s\S]{0,300}minHeight: 360,[\s\S]{0,240}width: "86%"/);
  assert.match(desireGameCard, /styles\.desireGameValidationVeil/);
  assert.match(desireGameCard, /styles\.desireGameValidationPulse/);
  assert.match(desireGameCard, /styles\.desireGameValidationBadge/);
  assert.match(desireGameCard, /<Check color=\{validationTone\.iconColor\} size=\{28\} strokeWidth=\{4\} \/>/);
  assert.doesNotMatch(app, /PersistentBurstLayer|HeartBurst|responseBurstParticles/);
  assert.match(app, /desireGameVoteDock: \{[\s\S]{0,160}flexGrow: 1,[\s\S]{0,80}justifyContent: "center"/);
});

test("game mode can replay an already answered pack", () => {
  assert.match(app, /const \[replayDeckIds, setReplayDeckIds\] = useState<string\[\]>\(\[\]\)/);
  assert.match(app, /const replayAnsweredCards = replayDeckIds\.length > 0/);
  assert.match(app, /setReplayDeckIds\(shuffledCards\(categoryCards\)\.map\(\(card\) => card\.id\)\)/);
  assert.match(app, /const replaySameVote = replayAnsweredCards && ownVotes\[cardId\] === level/);
  assert.match(app, /const accepted = replaySameVote \|\| \(await onVote\(cardId, level\)\)/);
  assert.match(app, /onReplayAnsweredCards=\{replayAnsweredPack\}/);
  assert.match(app, /Pack explor. . fond/);
  assert.match(app, /Rejouer les cartes/);
});

test("envies header top gap matches the bottom navbar rhythm", () => {
  assert.match(app, /const safeAreaInsets = useSafeAreaInsets\(\);[\s\S]{0,90}const \{ height: viewportHeight, width \} = useWindowDimensions\(\);/);
  assert.match(app, /const enviesHeaderTopSpace = homeLayoutMetrics\(viewportHeight, width, safeAreaInsets\)\.rhythm/);
  assert.match(app, /outputRange: \[enviesHeaderTopSpace, enviesHeaderTopSpace\]/);
  assert.match(app, /const tabDockPaddingBottom = homeLayoutMetrics\(viewportHeight, viewportWidth, mainSafeAreaInsets\)\.rhythm/);
  assert.doesNotMatch(app, /ENVIES_HEADER_TOP_SPACE/);
});

test("match empty screen follows the simple centered layout", () => {
  assert.match(matchScreen, /const matchLayout = homeLayoutMetrics\(viewportHeight, viewportWidth, safeAreaInsets\)/);
  assert.match(matchScreen, /<Text style=\{styles\.matchScreenTitle\}>Matchs<\/Text>/);
  assert.match(matchScreen, /<NoMatchEmptyState onOpenGameMode=\{onOpenGameMode\} \/>/);
  assert.match(app, /Pas encore de match/);
  assert.match(app, /<Text style=\{styles\.matchEmptyCTAText\}>Jouer<\/Text>/);
  assert.doesNotMatch(app, /Tirer une carte/);
  assert.match(app, /const handleOpenEnviesGameMode = useCallback/);
  assert.match(app, /setEnviesGameModeRequest\(\(current\) => current \+ 1\)/);
  assert.match(app, /startInGameRequest=\{enviesGameModeRequest\}/);
  assert.match(app, /startInGameRequest <= 0/);
  assert.match(app, /onStartInGameRequestHandled\(\)/);
  assert.match(app, /matchEmptySymbol/);
  assert.match(app, /matchEmptyCTA: \{[\s\S]{0,120}backgroundColor: candy\.black/);
  assert.match(app, /!hasAnyMatch && styles\.matchPrimaryStageEmpty/);
  assert.match(app, /matchPrimaryStageEmpty: \{[\s\S]{0,80}flexGrow: 1,[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /matchEmpty: \{[\s\S]{0,140}paddingBottom: 0/);
});

test("match tab reveals hidden matches first then lists all common matches", () => {
  assert.match(matchScreen, /const \[spotlightMatch, setSpotlightMatch\] = useState<DesireCard \| null>\(null\)/);
  assert.match(matchScreen, /const listedMatches = hasHiddenReveal \? revealedMatches : matches/);
  assert.match(matchScreen, /const hasSecondaryMatchContent = hasHiddenReveal \? revealedMatches\.length > 0 : listedMatches\.length > 0/);
  assert.match(matchScreen, /const inlineRevealMatch = spotlightMatch \?\? \(isNewestOpening \? newestHiddenMatch \?\? null : null\)/);
  assert.match(matchScreen, /const showInlineReveal = Boolean\(inlineRevealMatch\)/);
  assert.doesNotMatch(matchScreen, /const revealedMatchPageMode/);
  assert.doesNotMatch(matchScreen, /revealedMatchPageMode/);
  assert.match(matchScreen, /<Text style=\{styles\.matchScreenTitle\}>Matchs<\/Text>/);
  assert.match(matchScreen, /showInlineReveal \|\| hasHiddenReveal \|\| !hasAnyMatch \? \(/);
  assert.match(matchScreen, /showInlineReveal \? \(\s*<MatchRevealTheater/);
  assert.match(matchScreen, /onDismiss=\{closeInlineReveal\}/);
  assert.doesNotMatch(matchScreen, /setSelectedMatch\(newestHiddenMatch\)/);
  assert.match(matchScreen, /<Text style=\{styles\.matchListTitle\}>Tous vos matchs<\/Text>/);
  assert.match(matchScreen, /listedMatches\.map\(\(card, index\) => \(/);
  assert.match(matchScreen, /<MatchListItem card=\{card\} index=\{index\} key=\{card\.id\} onOpen=\{\(\) => setSelectedMatch\(card\)\} \/>/);
  assert.match(app, /function MatchRevealTheater/);
  assert.match(app, /matchRevealTheaterBackdrop/);
  assert.match(app, /matchRevealedPanelInline/);
  assert.match(app, /matchListItem: \{[\s\S]{0,120}backgroundColor: "rgba\(255,255,255,0\.76\)"/);
});

test("opened match detail uses the dark revealed-match layout", () => {
  assert.match(matchDetailModal, /const detailSideInset = viewportWidth >= 700 \? 22 : viewportWidth >= 520 \? 20 : 18/);
  assert.match(matchDetailModal, /const detailStageMaxWidth = Math\.min\(334, Math\.max\(0, viewportWidth - detailSideInset \* 2\)\)/);
  assert.match(matchDetailModal, /const detailContentMinHeight = Math\.max\(0, viewportHeight - safeAreaInsets\.top - safeAreaInsets\.bottom\)/);
  assert.match(matchDetailModal, /const detailVerticalPadding = Math\.round\(Math\.min\(54, Math\.max\(20, viewportHeight \* 0\.045\)\)\)/);
  assert.match(matchDetailModal, /const detailActionTopGap = Math\.round\(Math\.min\(46, Math\.max\(26, viewportHeight \* 0\.035\)\)\)/);
  assert.match(matchDetailModal, /colors=\{\[candy\.darkColor, "#210D27", "#16051A"\]\}/);
  assert.match(matchDetailModal, /C'est un match/);
  assert.match(matchDetailModal, /Vous avez r.pondu oui, tous les deux/);
  assert.match(matchDetailModal, /styles\.matchRevealedCardShell/);
  assert.match(matchDetailModal, /styles\.matchRevealedBigCard/);
  assert.match(matchDetailModal, /styles\.matchRevealedCategory/);
  assert.match(matchDetailModal, /styles\.matchRevealedAnswerRow/);
  assert.match(matchDetailModal, /<MatchAnswerPill label="Toi" mine value=\{activeVoteText\} \/>/);
  assert.match(matchDetailModal, /<MatchAnswerPill label=\{partnerName\} value=\{partnerVoteText\} \/>/);
  assert.match(matchDetailModal, /En parler maintenant/);
  assert.match(matchDetailModal, /Plus tard/);
  assert.doesNotMatch(matchDetailModal, /Vous avez choisi la m.me envie/);
  assert.doesNotMatch(matchDetailModal, /<MatchVoteComparison cardId=\{match\.id\} couple=\{couple\} detail \/>/);
  assert.doesNotMatch(matchDetailModal, /styles\.matchDetailTopBar/);
  assert.match(app, /matchDetailContent: \{[\s\S]{0,90}alignItems: "center"/);
  assert.match(matchDetailModal, /styles\.matchDetailActions, \{ marginTop: detailActionTopGap, maxWidth: detailStageMaxWidth \}/);
  assert.match(app, /matchDetailContent: \{[\s\S]{0,140}justifyContent: "center"/);
  assert.doesNotMatch(app, /matchDetailContent: \{[\s\S]{0,140}justifyContent: "flex-start"/);
  assert.match(app, /matchDetailStage: \{[\s\S]{0,140}maxWidth: 334/);
  assert.match(app, /matchDetailPrimaryAction: \{[\s\S]{0,140}backgroundColor: candy\.red/);
  assert.match(app, /matchDetailSecondaryAction: \{[\s\S]{0,140}backgroundColor: "transparent"/);
});

test("hidden match reveal uses the mystery card layout", () => {
  assert.match(matchScreen, /const hasSecondaryMatchContent = hasHiddenReveal/);
  assert.match(matchScreen, /const centerPrimaryMatchStage = hasHiddenReveal && !hasSecondaryMatchContent/);
  assert.match(matchScreen, /styles\.matchPrimaryStage[\s\S]{0,180}showInlineReveal && styles\.matchPrimaryStageReveal[\s\S]{0,180}centerPrimaryMatchStage && styles\.matchPrimaryStageCentered/);
  assert.match(matchScreen, /hasHiddenReveal \? \(\s*<HiddenMatchRevealPanel/);
  assert.match(matchScreen, /hiddenMatchCount=\{hiddenMatchCount\}/);
  assert.match(matchScreen, /revealAnim=\{revealAnim\}/);
  assert.match(matchScreen, /function HiddenMatchRevealPanel/);
  assert.match(app, /revealedOpacity = revealAnim\.interpolate/);
  assert.match(app, /actionsMotionStyle = revealAnim \? \{/);
  assert.match(app, /hiddenMatchPatternDots/);
  assert.match(app, /Match cach./);
  assert.match(app, /Ni titre, ni indice/);
  assert.match(app, /Z.ro pub/);
  assert.match(app, /matchPrimaryStageCentered: \{[\s\S]{0,80}flexGrow: 1,[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /matchScreenRevealMode: \{[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /hiddenRevealMysteryCard: \{[\s\S]{0,120}backgroundColor: candy\.black/);
  assert.match(app, /hiddenRevealButton: \{[\s\S]{0,140}backgroundColor: candy\.cream/);
});

test("pack selector opens as a full-screen pack grid", () => {
  assert.match(app, /const PACK_PICKER_CATEGORIES: DesireCategory\[\] = \["Vanille", PERSONAL_CATEGORY, \.\.\.PACK_CATEGORIES\.filter\(\(category\) => category !== "Vanille"\)\]/);
  assert.match(categoryPicker, /<Text style=\{styles\.categoryPickerTitle\}>Packs<\/Text>/);
  assert.match(categoryPicker, /Des univers . explorer, . deux\./);
  assert.match(categoryPicker, /PACK_PICKER_CATEGORIES\.map/);
  assert.match(categoryPicker, /const countLabel = personal\s+\? customUnlimited\s+\?\s+"Illimit./);
  assert.doesNotMatch(categoryPicker, /onCreateCustom/);
  assert.match(categoryPicker, /badgeLabel = selected[\s\S]{0,120}"Actif"[\s\S]{0,120}personal[\s\S]{0,120}"Choisir"/);
  assert.match(categoryPicker, /const action = unlocked \? \(\) => onSelect\(category\) : \(\) => onLockedCategory\(category\)/);
  assert.match(categoryPicker, /<CategoryPickerPattern category=\{category\} \/>/);
  assert.match(categoryPicker, /<LockKeyhole size=\{17\}/);
  assert.match(app, /categoryPickerOverlay: \{[\s\S]{0,80}backgroundColor: candy\.red/);
  assert.match(app, /categoryPickerSheet: \{[\s\S]{0,120}paddingHorizontal: 18/);
  assert.match(app, /categoryPickerGrid: \{[\s\S]{0,120}gap: 14/);
  assert.match(app, /categoryPickerCard: \{[\s\S]{0,120}aspectRatio: 1/);
  assert.match(app, /categoryPickerCard: \{[\s\S]{0,180}borderRadius: 28/);
  assert.match(app, /categoryPickerCardTitle: \{[\s\S]{0,120}fontSize: 21/);
  assert.match(app, /categoryPickerLock: \{[\s\S]{0,160}minHeight: 32/);
});

test("store uses the responsive boutique layout", () => {
  assert.doesNotMatch(app, /STORE_FEATURED_PACK_CATEGORIES/);
  assert.match(storeScreen, /<Text style=\{styles\.storeTitle\}>Boutique<\/Text>/);
  assert.match(storeScreen, /Des extensions de jeu, pas des murs\./);
  assert.match(storeScreen, /Am.liorer l'exp.rience/);
  assert.match(storeScreen, /const storeBottomPadding = Math\.max\(18, safeAreaInsets\.bottom \+ 12\)/);
  assert.match(storeScreen, /const storeSurface = fullScreenSurfaceMetrics\(viewportWidth\)/);
  assert.match(storeScreen, /const storePackColumns = 3/);
  assert.match(storeScreen, /const storePackGap = viewportWidth >= 700 \? 16 : viewportWidth >= 520 \? 14 : 10/);
  assert.match(storeScreen, /const storeInnerWidth = storeSurface\.contentWidth/);
  assert.match(storeScreen, /const packCardWidth = Math\.max\(84, \(storeInnerWidth - storePackGap \* \(storePackColumns - 1\)\) \/ storePackColumns\)/);
  assert.match(storeScreen, /const packCardHeight = Math\.round\(packCardWidth \* \(viewportWidth >= 700 \? 1\.32 : 1\.42\)\)/);
  assert.match(storeScreen, /const storeContentMinHeight = Math\.max\(0, viewportHeight - safeAreaInsets\.top - safeAreaInsets\.bottom - storeBottomPadding\)/);
  assert.match(storeScreen, /title="R.ponses illimit.es"/);
  assert.match(storeScreen, /price=\{unlimitedResponsesUnlocked \? "Actif" : UNLIMITED_RESPONSES_PRICE\}/);
  assert.match(storeScreen, /title="Cartes perso illimit.es"/);
  assert.match(storeScreen, /price=\{customUnlimited \? "Actif" : CUSTOM_CARDS_UNLIMITED_PRICE\}/);
  assert.match(storeScreen, /title="Z.ro pub"/);
  assert.match(storeScreen, /price=\{noAdsUnlocked \? "Actif" : NO_ADS_PRICE\}/);
  assert.match(storeScreen, /Pack d'envies/);
  assert.doesNotMatch(storeScreen, /Tout voir/);
  assert.doesNotMatch(storeScreen, /maxWidth: storeContentMaxWidth/);
  assert.match(storeScreen, /minHeight: storeContentMinHeight/);
  assert.match(storeScreen, /paddingHorizontal: storeSurface\.sideInset/);
  assert.match(storeScreen, /style=\{\[styles\.storePackGrid, \{ gap: storePackGap \}\]\}/);
  assert.match(storeScreen, /PAID_PACK_CATEGORIES\.map/);
  assert.match(storeScreen, /height=\{packCardHeight\}/);
  assert.match(storeScreen, /<CategoryPickerPattern category=\{category\} \/>/);
  assert.match(storeScreen, /Restaurer mes achats/);
  assert.match(app, /onRestorePurchases=\{onRestorePurchases\}/);
  assert.match(app, /storeContent: \{[\s\S]{0,160}flexGrow: 1,[\s\S]{0,160}width: "100%"/);
  assert.match(app, /storePackGrid: \{[\s\S]{0,160}flexWrap: "wrap"[\s\S]{0,160}justifyContent: "space-between"[\s\S]{0,80}width: "100%"/);
  assert.doesNotMatch(app, /storeFooter: \{[\s\S]{0,120}marginTop: "auto"/);
  assert.doesNotMatch(app, /storeFooter: \{[\s\S]{0,140}paddingTop: 70/);
  assert.match(app, /storePackCard: \{[\s\S]{0,120}borderRadius: 24/);
  assert.match(app, /storePackTitle: \{[\s\S]{0,120}fontSize: 20/);
  assert.match(app, /storeUpgradeCardHighlight: \{[\s\S]{0,80}backgroundColor: candy\.yellow/);
  assert.match(app, /storeUpgradePriceDark: \{[\s\S]{0,80}backgroundColor: candy\.black/);
});

test("custom card editor uses a full-screen preview layout", () => {
  assert.match(app, /const customDesireQuickEmojis = \[".*?", ".*?", ".*?", ".*?", ".*?"\]/);
  assert.match(app, /const customDesireAmbianceOptions = \["Complice", "Tendre", "Chaud", "Discussion"\] as const/);
  assert.match(customDesireEditor, /const safeAreaInsets = useSafeAreaInsets\(\)/);
  assert.match(customDesireEditor, /<Modal animationType="slide" visible=\{visible\}/);
  assert.match(customDesireEditor, /<LinearGradient colors=\{\[candy\.red, candy\.red\]\} style=\{styles\.editorScreen\}>/);
  assert.match(customDesireEditor, /Votre carte . vous/);
  assert.match(customDesireEditor, /Perso . aper.u/);
  assert.match(customDesireEditor, /placeholder="Ecrivez quelque chose\.\.\."/);
  assert.match(customDesireEditor, /placeholder="Ajoutez une precision\.\.\."/);
  assert.match(customDesireEditor, /styles\.editorEditableField/);
  assert.match(customDesireEditor, /styles\.editorTitleField/);
  assert.match(customDesireEditor, /styles\.editorBlurbField/);
  assert.match(customDesireEditor, />Titre<\/Text>/);
  assert.match(customDesireEditor, />Pr.cision<\/Text>/);
  assert.match(customDesireEditor, /const \{ height: viewportHeight, width: viewportWidth \} = useWindowDimensions\(\)/);
  assert.match(customDesireEditor, /const editorSurface = fullScreenSurfaceMetrics\(viewportWidth\)/);
  assert.match(customDesireEditor, /const editorSideInset = editorSurface\.sideInset/);
  assert.match(customDesireEditor, /const editorContentWidth = editorSurface\.contentWidth/);
  assert.match(customDesireEditor, /const editorLayoutRhythm = Math\.round\(Math\.min\(34, Math\.max\(18, viewportHeight \* 0\.02\)\)\)/);
  assert.match(customDesireEditor, /const editorPreviewMinHeight = Math\.round\(Math\.min\(306, Math\.max\(226, viewportHeight \* 0\.2\)\)\)/);
  assert.match(customDesireEditor, /const editorContentMinHeight = Math\.max\(0, viewportHeight - safeAreaInsets\.top - editorBottomReserve\)/);
  assert.match(customDesireEditor, /paddingHorizontal: editorSideInset/);
  assert.match(customDesireEditor, /width: editorContentWidth/);
  assert.match(customDesireEditor, /gap: editorLayoutRhythm/);
  assert.match(customDesireEditor, /minHeight: editorPreviewMinHeight/);
  assert.match(customDesireEditor, /customDesireQuickEmojis\.map/);
  assert.match(customDesireEditor, /customDesireAmbianceOptions\.map/);
  assert.match(customDesireEditor, /<View style=\{styles\.editorEmojiPresetRow\}>/);
  assert.match(customDesireEditor, /Ajouter . notre jeu/);
  assert.match(customDesireEditor, /Plus que 1 carte gratuite/);
  assert.doesNotMatch(customDesireEditor, /horizontal\s+showsHorizontalScrollIndicator/);
  assert.doesNotMatch(customDesireEditor, /transparent visible/);
  assert.doesNotMatch(customDesireEditor, /editorBackdrop|editorSheet|editorHandle/);
  assert.match(app, /editorScrollContent: \{[\s\S]{0,120}flexGrow: 1/);
  assert.match(app, /editorScrollContent: \{[\s\S]{0,160}width: "100%"/);
  assert.match(app, /editorContent: \{[\s\S]{0,160}maxWidth: "100%"/);
  assert.match(app, /editorMainArea: \{[\s\S]{0,120}justifyContent: "center"/);
  assert.match(app, /editorPreviewCard: \{[\s\S]{0,120}backgroundColor: candy\.cream/);
  assert.match(app, /editorPreviewCard: \{[\s\S]{0,160}minHeight: 218/);
  assert.match(app, /editorPreviewCard: \{[\s\S]{0,220}width: "100%"/);
  assert.match(app, /editorEditableField: \{[\s\S]{0,160}borderColor: "rgba\(59,23,55,0\.14\)"/);
  assert.match(app, /editorIconPreview: \{[\s\S]{0,180}borderWidth: 1\.5/);
  assert.match(app, /editorControls: \{[\s\S]{0,80}width: "100%"/);
  assert.match(app, /editorEmojiPresetRow: \{[\s\S]{0,120}flexDirection: "row"[\s\S]{0,120}width: "100%"/);
  assert.match(app, /editorEmojiPreset: \{[\s\S]{0,220}flexBasis: 0[\s\S]{0,120}flexGrow: 1[\s\S]{0,120}minWidth: 0/);
  assert.match(app, /editorAmbianceRow: \{[\s\S]{0,120}flexDirection: "row"[\s\S]{0,120}width: "100%"/);
  assert.match(app, /editorAmbianceChip: \{[\s\S]{0,220}flexBasis: 0[\s\S]{0,120}flexGrow: 1[\s\S]{0,120}minWidth: 0/);
  assert.match(app, /editorBottomBar: \{[\s\S]{0,240}position: "absolute"/);
  assert.match(app, /editorBottomContent: \{[\s\S]{0,120}maxWidth: "100%"/);
  assert.match(app, /editorSubmitButton: \{[\s\S]{0,120}backgroundColor: candy\.black/);
});

test("purchase screens use the full-screen landing layout", () => {
  assert.equal((app.match(/<PurchaseLandingModal/g) ?? []).length, 4);
  assert.match(purchaseLanding, /colors=\{\[candy\.red, candy\.red\]\}/);
  assert.match(purchaseLanding, /styles\.purchaseOverlay/);
  assert.match(purchaseLanding, /styles\.purchaseBackButton/);
  assert.match(purchaseLanding, /styles\.purchaseContent/);
  assert.match(purchaseLanding, /styles\.purchasePackVisual/);
  assert.match(purchaseLanding, /styles\.purchasePreviewRow/);
  assert.match(purchaseLanding, /styles\.purchaseBottomBar/);
  assert.match(app, /ctaLabel=\{`D.bloquer · \$\{price\}`\}/);
  assert.match(app, /ctaLabel=\{`D.bloquer · \$\{NO_ADS_PRICE\}`\}/);
  assert.match(app, /ctaLabel=\{`D.bloquer · \$\{UNLIMITED_RESPONSES_PRICE\}`\}/);
  assert.match(app, /ctaLabel=\{`D.bloquer · \$\{CUSTOM_CARDS_UNLIMITED_PRICE\}`\}/);
  assert.match(app, /purchaseContent: \{[\s\S]{0,180}flex: 1,[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /purchaseText: \{[\s\S]{0,180}maxWidth: 392/);
  assert.doesNotMatch(app, /purchaseBottomBar: \{[\s\S]{0,80}marginTop: "auto"/);
  assert.match(app, /purchasePrimary: \{[\s\S]{0,120}backgroundColor: candy\.yellow/);
});

test("purchase success uses the unlocked confirmation layout", () => {
  assert.match(app, /<PurchaseSuccessScreen[\s\S]{0,160}partnerName=\{couple\?\.profiles\[otherPartnerId\(couple\.activePartnerId\)\]\.displayName\}/);
  assert.match(app, /if \(purchaseSuccess\.kind === "category"\) \{[\s\S]{0,220}setEnviesFocusCategory\(purchaseSuccess\.category\)[\s\S]{0,220}setEnviesGameModeRequest\(\(current\) => current \+ 1\)[\s\S]{0,220}setTab\("envies"\)/);
  assert.match(app, /if \(purchaseSuccess\.kind === "custom"\) \{[\s\S]{0,220}setEnviesFocusCategory\(purchaseSuccess\.category\)[\s\S]{0,220}setTab\("envies"\)/);
  assert.match(purchaseSuccessScreen, /function PurchaseSuccessScreen/);
  assert.match(purchaseSuccessScreen, /Pack \$\{categoryLabel\(category\)\}\\nd.bloqu./);
  assert.match(purchaseSuccessScreen, /Commencer . jouer/);
  assert.match(purchaseSuccessScreen, /Re.u v.rifi./);
  assert.match(purchaseSuccessScreen, /Restaurable . tout moment/);
  assert.match(purchaseSuccessScreen, /styles\.purchaseSuccessPackVisual/);
  assert.match(purchaseSuccessScreen, /const unlockAnim = useRef\(new Animated\.Value\(0\)\)\.current/);
  assert.match(purchaseSuccessScreen, /Animated\.sequence\(\[/);
  assert.match(purchaseSuccessScreen, /Animated\.spring\(unlockAnim/);
  assert.match(purchaseSuccessScreen, /purchaseUnlockParticles\.map/);
  assert.match(purchaseSuccessScreen, /styles\.purchaseSuccessUnlockGlow/);
  assert.match(purchaseSuccessScreen, /styles\.purchaseSuccessUnlockBadge/);
  assert.match(purchaseSuccessScreen, /<CategoryPickerPattern category=\{category\} \/>/);
  assert.match(purchaseSuccessScreen, /<PurchaseFeaturePattern kind=\{featureKind\} \/>/);
  assert.match(purchaseSuccessScreen, /styles\.purchaseSuccessClose/);
  assert.match(purchaseSuccessScreen, /styles\.purchaseSuccessCenter/);
  assert.match(app, /purchaseSuccessScreen: \{[\s\S]{0,120}justifyContent: "space-between"/);
  assert.match(app, /purchaseSuccessCenter: \{[\s\S]{0,120}flex: 1,[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /purchaseSuccessUnlockStage: \{[\s\S]{0,80}overflow: "visible"/);
  assert.doesNotMatch(app, /purchaseSuccessBottom: \{[\s\S]{0,120}marginTop: "auto"/);
  assert.match(app, /purchaseSuccessCTA: \{[\s\S]{0,140}backgroundColor: candy\.cream/);
});

test("daily response limit uses a dedicated full-screen upsell", () => {
  assert.match(app, /function DailyLimitReachedModal/);
  assert.match(app, /<DailyLimitReachedModal/);
  assert.match(app, /usedToday=\{usedToday\}/);
  assert.match(app, /partnerName=\{couple\?\.profiles\[otherPartnerId\(couple\.activePartnerId\)\]\.displayName\}/);
  assert.match(app, /C'est tout/);
  assert.match(app, /pour aujourd'hui/);
  assert.match(app, /Tes \{DAILY_FREE_RESPONSE_LIMIT\} r.ponses gratuites sont utilis.es/);
  assert.match(app, /R.ponses illimit.es[\s\S]{0,8}\{UNLIMITED_RESPONSES_PRICE\}/);
  assert.match(app, /Revenir demain/);
  assert.match(app, /dailyLimitBadge: \{[\s\S]{0,120}backgroundColor: candy\.yellow/);
  assert.match(app, /dailyLimitPrimary: \{[\s\S]{0,120}backgroundColor: candy\.yellow/);
});

test("game vote buttons put hot as the featured middle action", () => {
  assert.match(desireGameCard, /label="Non"[\s\S]{0,120}onVote\(card\.id, 0\)[\s\S]{0,160}label="Chaud"[\s\S]{0,120}onVote\(card\.id, 2\)[\s\S]{0,160}label="Pourquoi pas"[\s\S]{0,120}onVote\(card\.id, 1\)/);
  assert.match(desireGameCard, /featured label="Chaud"/);
  assert.match(desireGameCard, /flame label="Pourquoi pas"/);
});

test("gallery card filters default to all cards", () => {
  assert.match(app, /type DesireFilterKey = "all" \| "todo" \| "hot" \| "curious" \| "no"/);
  assert.match(app, /\{ key: "all", label: "Toutes" \}/);
  assert.match(app, /\{ key: "hot", label: "Chaud" \}/);
  assert.match(app, /\{ key: "no", label: "Non" \}/);
  assert.match(app, /useState<DesireFilterKey>\("all"\)/);
  assert.match(app, /setFilter\("all"\)/);
  assert.match(app, /const galleryCards = useMemo/);
  assert.match(app, /filter === "all"/);
  assert.match(app, /filter === "hot"/);
  assert.match(app, /if \(filter !== "all"\) \{[\s\S]{0,80}return filteredCards;/);
  assert.match(app, /function galleryVoteAnswerLabel\(level\?: VoteLevel\)/);
  assert.match(app, /return "Chaud"/);
  assert.match(app, /const responseLabel = answered \? galleryVoteAnswerLabel\(ownVote\) : ""/);
  assert.match(app, /styles\.desireGalleryMetaRow/);
  assert.match(app, /styles\.desireGalleryAnswerPill/);
  assert.match(app, /ownVote === 0 && styles\.desireGalleryAnswerPillNo/);
  assert.match(app, /ownVote === 1 && styles\.desireGalleryAnswerPillCurious/);
  assert.match(app, /isFlameVote\(ownVote\) && styles\.desireGalleryAnswerPillHot/);
  assert.match(app, /const firstAnswered = ownVotes\[firstCard\.id\] !== undefined/);
  assert.match(app, /return firstAnswered \? 1 : -1/);
  assert.match(app, /style=\{styles\.enviesGalleryPackCenter\}/);
  assert.match(app, /styles\.enviesGalleryPackPill/);
  assert.match(app, /styles\.enviesGameBackButton/);
  assert.match(app, /enviesGameBackButton: \{[\s\S]{0,120}position: "absolute"[\s\S]{0,80}top: 5/);
  assert.match(app, /enviesStickyHeader: \{[\s\S]{0,120}paddingBottom: 10/);
  assert.match(app, /desireFilterRow: \{[\s\S]{0,160}marginTop: 22/);
  assert.match(app, /cardStack: \{[\s\S]{0,120}paddingTop: 0/);
  assert.match(app, /desireGalleryMetaRow: \{[\s\S]{0,120}flexDirection: "row"[\s\S]{0,120}flexWrap: "wrap"/);
  assert.match(app, /desireGalleryAnswerPill: \{[\s\S]{0,180}borderRadius: 999/);
  assert.match(app, /desireGalleryAnswerPillHot: \{[\s\S]{0,80}backgroundColor: candy\.yellow/);
  assert.match(app, /prominent \? styles\.voteButtonProminent : styles\.voteButton/);
  assert.match(app, /const desiredSideVoteSize = roomy \? 124 : 106/);
  assert.match(app, /const desiredFeaturedVoteSize = roomy \? 148 : 130/);
  assert.match(app, /size=\{sideVoteSize\}/);
  assert.match(app, /size=\{featuredVoteSize\}/);
  assert.match(app, /voteButtonProminent: \{[\s\S]{0,220}flexGrow: 0[\s\S]{0,120}minWidth: 106/);
  assert.match(app, /desireFilterRow: \{[\s\S]{0,120}flexGrow: 1[\s\S]{0,160}justifyContent: "center"/);
});

test("couple tab keeps the partner invite code visible for resync", () => {
  assert.match(app, /coupleReconnectCard/);
  assert.match(app, /Code partenaire/);
  assert.match(app, /resynchroniser facilement/);
  assert.match(app, /selectable style=\{styles\.coupleReconnectCode\}>\{couple\.inviteCode\}/);
});

test("couple tab uses the compact nous dashboard", () => {
  assert.match(coupleScreen, /const coupleSurface = fullScreenSurfaceMetrics\(viewportWidth\)/);
  assert.match(coupleScreen, /const coupleContentWidth = coupleSurface\.contentWidth/);
  assert.match(coupleScreen, /const coupleContentGap = Math\.round\(Math\.min\(18, Math\.max\(11, viewportHeight \* 0\.012\)\)\)/);
  assert.match(coupleScreen, /contentContainerStyle=\{\[styles\.coupleScreen, coupleContentStyle\]\}/);
  assert.match(coupleScreen, /width: coupleContentWidth/);
  assert.doesNotMatch(coupleScreen, /paddingHorizontal: coupleSideInset/);
  assert.doesNotMatch(coupleScreen, /contentContainerStyle=\{\[styles\.profileScreen, styles\.coupleScreen\]\}/);
  assert.match(coupleScreen, /<Text style=\{styles\.coupleScreenTitle\}>Nous<\/Text>/);
  assert.match(coupleScreen, /onPress=\{onOpenSettings\} style=\{styles\.coupleSettingsButton\}/);
  assert.match(coupleScreen, /function CoupleProfileCard/);
  assert.match(coupleScreen, /styles\.coupleCodePill/);
  assert.match(coupleScreen, /Notre code :/);
  assert.match(coupleScreen, /setStoreOpen\(true\)/);
  assert.match(coupleScreen, /<Text style=\{styles\.coupleBoutiqueText\}>Boutique<\/Text>/);
  assert.match(coupleScreen, /packCount=\{unlockedPackCount\}/);
  assert.match(coupleScreen, /coupleProfilePackText/);
  assert.doesNotMatch(coupleScreen, /Packs disponibles/);
  assert.doesNotMatch(coupleScreen, /CouplePackMini/);
  assert.match(app, /Ouvrir/);
  assert.match(app, /coupleScreen: \{[\s\S]{0,140}alignSelf: "center"[\s\S]{0,140}width: "100%"/);
  assert.match(app, /coupleProfileGrid: \{[\s\S]{0,100}width: "100%"/);
  assert.match(app, /coupleSection: \{[\s\S]{0,180}width: "100%"/);
  assert.match(app, /coupleStatPill: \{[\s\S]{0,120}backgroundColor: candy\.black/);
  assert.match(app, /coupleProfileCardHighlight: \{[\s\S]{0,80}backgroundColor: candy\.yellow/);
  assert.match(app, /couplePackSummary: \{[\s\S]{0,140}backgroundColor: "rgba\(255,102,158,0\.62\)"/);
  assert.doesNotMatch(app, /couplePackCompactGridWide/);
  assert.doesNotMatch(app, /couplePackCompactCellWide/);
  assert.match(app, /coupleReconnectCard: \{[\s\S]{0,260}width: "100%"/);
});

test("couple solo screen keeps invite and join actions", () => {
  assert.match(coupleScreen, /const coupleLayout = homeLayoutMetrics\(viewportHeight, viewportWidth, safeAreaInsets\)/);
  assert.match(coupleScreen, /<Text style=\{styles\.coupleSoloScreenTitle\}>Nous<\/Text>/);
  assert.match(coupleScreen, /Il manque quelqu'un/);
  assert.match(coupleScreen, /WeSpice se joue . deux/);
  assert.match(coupleScreen, /onPress=\{onCopyInvite\} style=\{styles\.coupleSoloInviteButton\}/);
  assert.match(coupleScreen, /<Text style=\{styles\.coupleSoloInviteText\}>Inviter<\/Text>/);
  assert.match(coupleScreen, /onPress=\{onJoinPartner\} style=\{styles\.coupleSoloJoinButton\}/);
  assert.match(coupleScreen, /<Text style=\{styles\.coupleSoloJoinText\}>Rejoindre<\/Text>/);
  assert.match(coupleScreen, /selectable style=\{styles\.coupleSoloCode\}>\{couple\.inviteCode\}/);
  assert.match(app, /coupleSoloInviteButton: \{[\s\S]{0,120}backgroundColor: candy\.yellow/);
  assert.match(app, /coupleSoloJoinButton: \{[\s\S]{0,120}backgroundColor: candy\.black/);
});

test("debug partner profiles count as linked in the couple tab", () => {
  assert.match(app, /function isDebugCouple\(couple: CoupleState\) \{[\s\S]{0,260}couple\.inviteCode === "DEV420"[\s\S]{0,120}couple\.inviteCode === "FULL69"[\s\S]{0,160}partner\.vibe === "Profil de test pour QA\."/);
  assert.match(app, /function hasLinkedPartner\(couple: CoupleState\) \{\s+if \(isDebugCouple\(couple\)\) \{\s+return true;/);
  assert.match(app, /if \(preferredCoupleId && !isRemoteCoupleId\(preferredCoupleId\)\) \{\s+return false;\s+\}\s+const coupleId = preferredCoupleId \?\? null;/);
  assert.match(app, /const currentCouple = coupleRef\.current;[\s\S]{0,260}if \(nextTab === "couple" && canWriteRemoteCouple\(currentCouple\)\) \{\s+void refreshRemoteCoupleState\(currentCouple\.id\);/);
  assert.match(app, /const handleActorChange = useCallback\(\(nextId: PartnerId\) => \{\s+setCouple\(\(current\) => \{/);
  assert.match(app, /nextId !== "partner" \|\| hasLinkedPartner\(current\)/);
  assert.match(app, /displayName: "Sam"/);
  assert.match(app, /vibe: "Profil de test pour QA\."/);
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
  assert.match(app, /const remoteChatMessages = await chatMessagesFromRemote\(remoteMessages\)/);
  assert.match(app, /const messages = mergePendingChatMessages\(remoteChatMessages, cleanCouple\)/);
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
  assert.match(app, /queueChatAttachmentConsumption\(\{[\s\S]{0,140}attachmentId,[\s\S]{0,140}delayMs,[\s\S]{0,140}messageId,/);
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
