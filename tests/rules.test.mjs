import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const schema = readFileSync(new URL("../supabase/schema.sql", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const appJson = readFileSync(new URL("../app.json", import.meta.url), "utf8");
const googleServicesJson = readFileSync(new URL("../google-services.json", import.meta.url), "utf8");
const sourceCardsCsv = readFileSync(new URL("../cocoon_packs_cartes.csv", import.meta.url), "utf8");
const desirePackContent = readFileSync(new URL("../content/desire-packs.json", import.meta.url), "utf8");
const generatedDesires = readFileSync(new URL("../src/data/desires.generated.ts", import.meta.url), "utf8");
const packThemesSource = readFileSync(new URL("../src/data/pack-themes.ts", import.meta.url), "utf8");
const importDesiresCsvScript = readFileSync(new URL("../scripts/import-desires-csv.js", import.meta.url), "utf8");
const coupleApi = readFileSync(new URL("../src/lib/coupleApi.ts", import.meta.url), "utf8");
const uiTokens = readFileSync(new URL("../src/ui/tokens.ts", import.meta.url), "utf8");
const uiPrimitives = readFileSync(new URL("../src/ui/primitives.tsx", import.meta.url), "utf8");
const appLayoutHook = readFileSync(new URL("../src/ui/use-app-layout.ts", import.meta.url), "utf8");
const onboardingScreen = readFileSync(new URL("../src/features/onboarding/onboarding-screen.tsx", import.meta.url), "utf8");
const offlineQueue = readFileSync(new URL("../src/lib/offlineQueue.ts", import.meta.url), "utf8");
const notificationsLib = readFileSync(new URL("../src/lib/notifications.ts", import.meta.url), "utf8");
const easJson = readFileSync(new URL("../eas.json", import.meta.url), "utf8");
const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
const gitignore = readFileSync(new URL("../.gitignore", import.meta.url), "utf8");
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const envExample = readFileSync(new URL("../.env.example", import.meta.url), "utf8");
const envTypes = readFileSync(new URL("../src/env.d.ts", import.meta.url), "utf8");
const deleteAccountFunction = readFileSync(new URL("../supabase/functions/delete-account/index.ts", import.meta.url), "utf8");
const notifyEvent = readFileSync(new URL("../supabase/functions/notify-event/index.ts", import.meta.url), "utf8");
const notifyScheduled = readFileSync(new URL("../supabase/functions/notify-scheduled/index.ts", import.meta.url), "utf8");
const pushShared = readFileSync(new URL("../supabase/functions/_shared/push.ts", import.meta.url), "utf8");
const joinCoupleAmbiguityFixMigration = readFileSync(new URL("../supabase/migrations/202607060001_reapply_join_couple_couple_id_ambiguity_fix.sql", import.meta.url), "utf8");
const revealNextMatchAmbiguityFixMigration = readFileSync(new URL("../supabase/migrations/202607060002_fix_reveal_next_match_revealed_at_ambiguity.sql", import.meta.url), "utf8");
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
const revealNextMatchStart = schema.indexOf("create or replace function public.reveal_next_match");
const markMatchRevealedStart = schema.indexOf("drop function if exists public.mark_match_revealed");
const revealNextMatchSql = revealNextMatchStart >= 0 && markMatchRevealedStart > revealNextMatchStart
  ? schema.slice(revealNextMatchStart, markMatchRevealedStart)
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
const enviesScreenStart = app.indexOf("function EnviesScreen");
const enviesScreen = enviesScreenStart >= 0 && customDesireEditorStart > enviesScreenStart
  ? app.slice(enviesScreenStart, customDesireEditorStart)
  : "";
const heroPanelStart = app.indexOf("function HeroPanel");
const customDesireEditor = customDesireEditorStart >= 0 && heroPanelStart > customDesireEditorStart
  ? app.slice(customDesireEditorStart, heroPanelStart)
  : "";
const categoryPurchaseModalStart = app.indexOf("function CategoryPurchaseModal");
const customCardsPurchaseModalStart = app.indexOf("function CustomCardsPurchaseModal");
const categoryPurchaseModal = categoryPurchaseModalStart >= 0 && customCardsPurchaseModalStart > categoryPurchaseModalStart
  ? app.slice(categoryPurchaseModalStart, customCardsPurchaseModalStart)
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
const fakeInterstitialAdStart = app.indexOf("function FakeInterstitialAd");
const serverNoticeToast = serverNoticeStart >= 0 && fakeInterstitialAdStart > serverNoticeStart
  ? app.slice(serverNoticeStart, fakeInterstitialAdStart)
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
const unsupportedBitingLipEmoji = String.fromCodePoint(0x1FAE6);

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
  assert.match(schema, /return query select v_couple\.id as couple_id, v_couple\.invite_code as invite_code/);
  assert.match(joinCoupleAmbiguityFixMigration, /create or replace function public\.join_couple/);
  assert.match(joinCoupleAmbiguityFixMigration, /select deleted_memberships\.couple_id from deleted_memberships/);
  assert.doesNotMatch(joinCoupleAmbiguityFixMigration, /select couple_id from deleted_memberships/);
  assert.match(joinCoupleAmbiguityFixMigration, /return query select v_couple\.id as couple_id, v_couple\.invite_code as invite_code/);
  assert.match(app, /friendlyKnownErrorMessage/);
  assert.match(app, /42702\|ambiguous\|ambigu/);
  assert.match(app, /Le serveur n'est pas encore . jour pour rejoindre cet espace/);
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
  assert.match(app, /result\.visiblePending === 0 && result\.pending === 0/);
  assert.doesNotMatch(app, /result\.visiblePending > 0/);
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
  assert.match(app, /const votedCard = allDesireCards\(couple\)\.find\(\(card\) => card\.id === cardId\)/);
  assert.match(app, /if \(!canWriteRemote && !localModeEnabled\) \{[\s\S]{0,180}return false;/);
  assert.match(app, /if \(!canWriteRemote\) \{[\s\S]{0,220}withLocalDesireVote\(current, cardId, level\)[\s\S]{0,260}\} else \{[\s\S]{0,900}saveRemoteVote/);
  assert.match(app, /const failureSignal = errorSignalText\(error, message\)/);
  assert.match(app, /const localPaidPackVote =[\s\S]{0,180}PAID_PACK_CATEGORIES\.includes\(votedCard\.category\)[\s\S]{0,120}isCategoryUnlocked\(couple, votedCard\.category\)/);
  assert.match(app, /isSilentConnectivityNotice\(failureSignal\)[\s\S]{0,260}enqueueRemoteVote\(\{ cardId, coupleId, level \}\)/);
  assert.match(app, /localPaidPackVote && localModeEnabled && \/unknown_card\|card_available\|not\.\*available\/i\.test\(failureSignal\)[\s\S]{0,220}withLocalDesireVote\(current, cardId, level\)/);
  assert.match(app, /if \(!canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,180}return;[\s\S]{0,900}saveRemoteCustomDesire/);
  assert.match(app, /if \(canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,900}sendRemoteChatMessage/);
  assert.match(app, /if \(!canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,260}Achat impossible/);
  assert.match(app, /if \(!session \|\| !couple \|\| !canWriteRemoteCouple\(couple\)\) \{/);
  assert.match(app, /if \(!canWriteRemoteCouple\(currentCouple\)\) \{[\s\S]{0,80}return;/);
  assert.match(app, /if \(!canWriteRemoteCouple\(couple\)\) \{[\s\S]{0,260}setRevealedMatchIds[\s\S]{0,260}return allDesireCards\(couple\)\.find/);
  assert.match(app, /setSyncError\("Attends que ton espace soit synchronisé avant de révéler un match\."\);[\s\S]{0,80}return null;/);
  assert.match(app, /let revealedMatch: RemoteMatch \| null = null;[\s\S]{0,160}markRemoteMatchRevealed/);
});

test("full reset signs out so Supabase cannot auto-hydrate the previous couple", () => {
  assert.match(app, /const handleReset = useCallback\(async \(\) => \{\s+await signOut\(\);\s+await clearCoupleState\(\);/);
  assert.match(app, /const handleReset = useCallback\(async \(\) => \{[\s\S]*setSession\(null\);[\s\S]*setGuestMode\(false\);[\s\S]*updateIntroSeen\(false\);/);
  assert.match(app, /const handleReset = useCallback\(async \(\) => \{[\s\S]*setRemoteHydrating\(false\);/);
});

test("profile screen puts app profile first and account second", () => {
  const profileIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Profil</Text>");
  const accountIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Compte</Text>");
  const purchasedPacksIndex = profileScreen.indexOf("<Text style={styles.profileSectionTitle}>Packs achetés</Text>");
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
  assert.ok(purchasedPacksIndex >= 0);
  assert.ok(profileIndex < accountIndex);
  assert.ok(accountIndex < purchasedPacksIndex);
  assert.ok(purchasedPacksIndex < notificationsIndex);
  assert.ok(notificationsIndex < applicationIndex);
  assert.match(profileScreen, /<StatusEmojiEditor profile=\{activeProfile\} onChange=\{onStatusEmojiChange\} onNameChange=\{onProfileNameChange\} \/>/);
  assert.match(profileScreen, /const purchasedPackCategories = useMemo/);
  assert.match(profileScreen, /PAID_PACK_CATEGORIES\.filter\(\(category\) => isCategoryUnlocked\(couple, category\)\)/);
  assert.match(profileScreen, /<ProfilePurchasedPacks categories=\{purchasedPackCategories\} couple=\{couple\} totalCount=\{PAID_PACK_CATEGORIES\.length\} \/>/);
  assert.match(profileScreen, /function ProfilePurchasedPacks/);
  assert.match(profileScreen, /Packs actifs/);
  assert.match(profileScreen, /Aucun pack payant acheté/);
  assert.match(profileScreen, /categories\.map\(\(category\) =>/);
  assert.match(profileScreen, /categoryVisual\(category\)/);
  assert.match(profileScreen, /const pack = packPresentation\(category, couple\)/);
  assert.match(profileScreen, /\{pack\.title\}/);
  assert.match(profileScreen, /\{pack\.statusLabel\}/);
  assert.doesNotMatch(profileScreen, />AchetÃ©<\/Text>/);
  assert.match(profileScreen, /profilePurchasedPackRow/);
  assert.match(app, /profilePurchasedPanel: \{[\s\S]{0,120}backgroundColor: candy\.cream/);
  assert.match(app, /profilePurchasedCountBadge: \{[\s\S]{0,80}backgroundColor: candy\.red/);
  assert.match(app, /profilePurchasedPackRow: \{[\s\S]{0,240}minHeight: 62/);
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
  assert.match(app, /const statusEmojiPresets = \["🍒", "🔥", "💋", "🍆", "👀", "😇", "👄", "🖤", "🫧", "✨"\]/);
  assert.match(app, /const customDesireEmojiPresets = \["🍑", "🍆", "💖", "🔥", "💋", "👀", "👄"/);
  assert.match(app, /function firstEmojiGrapheme\(value: string\)/);
  assert.match(app, /function isStandardEmojiGrapheme\(value: string\)/);
  assert.match(app, /function standardEmojiFromValue\(value: string\)/);
  assert.match(app, /baseCharacters\.some\(\(char\) => \/\[\\p\{Letter\}\\p\{Number\}\]\/u\.test\(char\)\)/);
  assert.match(app, /isTextSymbolEmoji\(value\)/);
  assert.match(app, /function normalizeSingleEmoji\(value: string, fallback = stickers\.heart\)/);
  assert.match(app, /return standardEmojiFromValue\(value\) \?\? fallback/);
  assert.match(app, /function normalizeStatusEmoji\(value: string\) \{[\s\S]{0,80}return normalizeSingleEmoji\(value, stickers\.heart\);[\s\S]{0,40}\}/);
  assert.match(statusEditor, /const normalizedEmoji = standardEmojiFromValue\(nextEmoji\)/);
  assert.match(statusEditor, /if \(!normalizedEmoji\) \{[\s\S]{0,80}setCustomEmoji\(currentEmoji\);[\s\S]{0,80}return;/);
  assert.match(statusEditor, /const nextEmoji = standardEmojiFromValue\(insertedValue \|\| rawValue\)/);
  assert.doesNotMatch(statusEditor, /\/\[a-z0-9\]\/i/);
  assert.match(app, /\["\\u\{1FAE6\}"\]: "👄"/);
  assert.doesNotMatch(app, new RegExp(unsupportedBitingLipEmoji, "u"));
  assert.doesNotMatch(desirePackContent, new RegExp(unsupportedBitingLipEmoji, "u"));
  assert.doesNotMatch(generatedDesires, new RegExp(unsupportedBitingLipEmoji, "u"));
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
  const appConfig = JSON.parse(appJson);
  const googleServices = JSON.parse(googleServicesJson);
  const eas = JSON.parse(easJson);
  const packageData = JSON.parse(packageJson);

  assert.equal(appConfig.expo.android.softwareKeyboardLayoutMode, "pan");
  assert.equal(appConfig.expo.android.package, "app.wespice.mobile");
  assert.equal(appConfig.expo.android.googleServicesFile, "./google-services.json");
  const imagePickerPlugin = appConfig.expo.plugins.find((plugin) => Array.isArray(plugin) && plugin[0] === "expo-image-picker")?.[1];
  assert.ok(imagePickerPlugin);
  assert.notEqual(imagePickerPlugin.cameraPermission, false);
  assert.equal(imagePickerPlugin.microphonePermission, false);
  assert.equal(googleServices.project_info.project_id, "wespice-a1874");
  assert.equal(googleServices.client[0].client_info.android_client_info.package_name, "app.wespice.mobile");
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
  assert.match(gitignore, /fcm-service-account\*\.json/);
  assert.match(gitignore, /google-service-account\*\.json/);
  assert.match(readme, /Package Android attendu dans Firebase: app\.wespice\.mobile/);
  assert.match(readme, /Fichier attendu a la racine du repo: google-services\.json/);
  assert.match(readme, /eas credentials/);
  assert.match(readme, /La cle de service FCM V1 est sensible/);
});

test("profile notifications use simple single-line labels", () => {
  ["Humeur partagée", "Carte du jour", "Nouveaux matchs", "Messages privés", "Promotions"].forEach((label) => {
    assert.ok(profileScreen.includes(`title: "${label}"`));
  });

  assert.doesNotMatch(profileScreen, /offText[:=]|onText[:=]|eyebrow[:=]|Envies croisées|Packs et nouveautés/);
});

test("desire CSV import stores rewritten cards and pack descriptions", () => {
  const content = JSON.parse(desirePackContent);
  const packageData = JSON.parse(packageJson);

  assert.equal(packageData.scripts["cards:import"], "node scripts/import-desires-csv.js");
  assert.equal(content.version, 4);
  assert.equal(content.updatedAt, "2026-07-06");
  assert.equal(content.packs.length, 10);
  assert.equal(content.packs.reduce((total, pack) => total + pack.cards.length, 0), 500);
  assert.equal(content.packs[0].description, "Le pack inclus : douceur, tendresse et petits gestes qui rapprochent sans brusquer.");
  assert.equal(content.packs[0].cards[0].blurb, "Organiser un rendez-vous où vous faites comme si vous veniez de vous rencontrer.");
  assert.equal(
    content.packs.find((pack) => pack.category === "Plaisirs explicites")?.description,
    "Pratiques sexuelles directes, orales, pénétratives et plus audacieuses.",
  );
  assert.match(sourceCardsCsv, /description_pack/);
  assert.match(sourceCardsCsv, /wespice_cartes_reecrites_v4|Organiser un rendez-vous où vous faites comme si vous veniez de vous rencontrer/);
  assert.match(importDesiresCsvScript, /description_pack/);
  assert.match(generatedDesires, /import type \{ DesireCard, DesireCategory, DesirePack \} from "\.\.\/types"/);
  assert.match(generatedDesires, /export const DESIRE_PACKS: DesirePack\[\]/);
  assert.match(generatedDesires, /"description": "Pratiques sexuelles directes, orales, pénétratives et plus audacieuses\."/);
  assert.match(readme, /cards:import/);
  assert.match(readme, /description_pack/);
});

test("push notification setup errors stay user-facing", () => {
  assert.match(notificationsLib, /function notificationTokenFailure\(error: unknown\): PushRegistrationResult/);
  assert.match(notificationsLib, /firebase\|messaging\|fcm\|google-\?services\|initializeapp/i);
  assert.match(notificationsLib, /Notifications indisponibles sur ce build Android\. Il manque la configuration Firebase\/FCM\./);
  assert.match(notificationsLib, /status: "misconfigured"/);
  assert.match(notificationsLib, /try \{[\s\S]{0,220}Notifications\.getExpoPushTokenAsync\(\{ projectId \}\)[\s\S]{0,260}\} catch \(error\) \{[\s\S]{0,80}return notificationTokenFailure\(error\);/);
  assert.match(notificationsLib, /const tokenResult = await expoPushToken\(\);[\s\S]{0,120}return tokenResult;/);
  assert.match(app, /firebase\|fcm\|messaging\|google-\?services\|initializeapp/i);
  assert.match(app, /Notifications indisponibles sur ce build Android\. Il manque la configuration Firebase\/FCM\./);
});

test("network and offline sync state does not surface as a global notice", () => {
  assert.match(app, /function isSilentConnectivityNotice\(message: string\)/);
  assert.match(app, /if \(isSilentConnectivityNotice\(message\)\) \{\s+return "";\s+\}/);
  assert.match(app, /if \(result\.visiblePending === 0 && result\.pending === 0\) \{\s+setSyncError\(""\);\s+\}/);
  assert.doesNotMatch(app, /Hors ligne\. Vos r.ponses sont gard.es au chaud et repartiront toutes seules\./);
  assert.doesNotMatch(app, /en attente de reconnexion/);
  assert.doesNotMatch(app, /connecte-toi\|connexion/);
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

test("purchase errors explain build and store setup instead of a generic toast", () => {
  assert.match(app, /function purchaseFailureNotice/);
  assert.match(app, /Achats de test indisponibles sur ce build/);
  assert.match(app, /build de développement\/TestFlight\/Play Console/);
  assert.match(app, /mode bypass/);
  assert.match(app, /TEST_STORE_SIMULATED_PURCHASE_ERROR/);
  assert.match(app, /Produit non disponible sur ce build/);
  assert.match(app, /PRODUCT_NOT_AVAILABLE_FOR_PURCHASE_ERROR/);
  assert.match(app, /Achat reçu par le store/);
  assert.match(app, /setSyncError\(message\)/);
  assert.match(app, /if \(message\) \{\s+await Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Error\)/);
  assert.doesNotMatch(app, /setSyncError\(`Achat non validé: \$\{message\}`\)/);
  assert.doesNotMatch(app, /Achat impossible pour le moment/);
});

test("shared text and button primitives shrink Android labels before overlapping", () => {
  assert.match(app, /const appTextBaseStyles = StyleSheet\.create\(\{[\s\S]{0,180}includeFontPadding: false[\s\S]{0,120}flexShrink: 1[\s\S]{0,80}minWidth: 0/);
  assert.match(app, /function Text\(\{ minimumFontScale = 0\.78, style, \.\.\.props \}: TextProps\)/);
  assert.match(app, /minimumFontScale=\{minimumFontScale\}/);
  assert.match(app, /Platform\.OS === "android" && appTextBaseStyles\.androidLabel/);
  assert.match(uiPrimitives, /const androidLabelText = Platform\.OS === "android" \? \(\{ includeFontPadding: false \} satisfies TextStyle\) : null/);
  assert.match(uiPrimitives, /export function WsText\(\{ minimumFontScale = 0\.78, style, \.\.\.props \}: TextProps\)/);
  assert.match(uiPrimitives, /style=\{\[styles\.textBase, wsType\.app, androidLabelText, style\]\}/);
  assert.match(uiPrimitives, /type WsButtonLabelLines = 1 \| 2/);
  assert.match(uiPrimitives, /const CTA_BUTTON_VARIANTS = new Set<WsButtonVariant>\(\["primary", "secondary", "accent", "hot", "danger"\]\)/);
  assert.match(uiPrimitives, /numberOfLines\?: WsButtonLabelLines/);
  assert.match(uiPrimitives, /const labelLineCount = numberOfLines \?\? \(CTA_BUTTON_VARIANTS\.has\(variant\) \? 2 : 1\)/);
  assert.match(uiPrimitives, /minimumFontScale=\{minimumFontScale\}[\s\S]{0,80}numberOfLines=\{labelLineCount\}/);
  assert.match(uiPrimitives, /style=\{\[styles\.buttonText, androidLabelText, buttonTextVariants\[variant\], textStyle\]\}/);
  assert.match(uiPrimitives, /style=\{\[styles\.fieldLabel, androidLabelText, labelStyle\]\}/);
  assert.match(uiPrimitives, /style=\{\[styles\.choicePillText, androidLabelText, selected && styles\.choicePillTextSelected\]\}/);
  assert.match(uiPrimitives, /textBase: \{[\s\S]{0,80}flexShrink: 1[\s\S]{0,80}minWidth: 0/);
  assert.match(uiPrimitives, /button: \{[\s\S]{0,180}flexShrink: 1[\s\S]{0,120}minWidth: 0/);
  assert.match(uiPrimitives, /buttonText: \{[\s\S]{0,120}flexShrink: 1[\s\S]{0,120}minWidth: 0/);
  assert.match(uiPrimitives, /textInput: \{[\s\S]{0,220}includeFontPadding: false[\s\S]{0,80}minWidth: 0/);
  assert.match(uiPrimitives, /choicePill: \{[\s\S]{0,180}flexShrink: 1[\s\S]{0,120}minWidth: 0/);
});

test("chat screen uses the dark ephemeral conversation layout", () => {
  assert.doesNotMatch(mainApp, /tab !== "chat" \? \(/);
  assert.match(app, /import \{ SafeAreaProvider, useSafeAreaInsets \} from "react-native-safe-area-context"/);
  assert.match(app, /<SafeAreaProvider>/);
  assert.doesNotMatch(app, /SafeAreaView/);
  assert.match(app, /import \{ DEFAULT_TAB_DOCK_HEIGHT, useAppLayout \} from "\.\/src\/ui\/use-app-layout"/);
  assert.match(appLayoutHook, /export function useAppLayout/);
  assert.match(appLayoutHook, /safeTop/);
  assert.match(appLayoutHook, /safeBottom/);
  assert.match(appLayoutHook, /contentWidth/);
  assert.match(appLayoutHook, /tabDockHeight/);
  assert.match(appLayoutHook, /bottomInteractiveInset/);
  assert.match(appLayoutHook, /isCompact/);
  assert.match(appLayoutHook, /fontScale/);
  assert.doesNotMatch(app, /TAB_DOCK_VISIBLE_HEIGHT/);
  assert.doesNotMatch(app, /paddingBottom: 138/);
  assert.doesNotMatch(app, /paddingBottom: 184/);
  assert.match(mainApp, /const \[tabBarHeight, setTabBarHeight\] = useState\(DEFAULT_TAB_DOCK_HEIGHT\)/);
  assert.match(mainApp, /const \[tabDockOverlayHeight, setTabDockOverlayHeight\] = useState\(DEFAULT_TAB_DOCK_HEIGHT\)/);
  assert.match(mainApp, /const \[androidKeyboardVisible, setAndroidKeyboardVisible\] = useState\(false\)/);
  assert.match(mainApp, /const appLayout = useAppLayout\(\{[\s\S]{0,140}tabDockHeight: tabBarHeight/);
  assert.match(mainApp, /const bottomNavInset = tabDockPaddingBottom \+ appLayout\.tabDockHeight \+ CHAT_COMPOSER_NAV_GAP/);
  assert.match(mainApp, /const bottomInteractiveInset = Math\.max\(bottomNavInset, appLayout\.bottomInteractiveInset\)/);
  assert.match(mainApp, /const bottomContentInset = Math\.max\(bottomNavInset, tabDockOverlayHeight \+ CHAT_COMPOSER_NAV_GAP\)/);
  assert.match(mainApp, /const tabDockHiddenForKeyboard = Platform\.OS === "android" && androidKeyboardVisible/);
  assert.match(mainApp, /const keyboardBottomInset = appLayout\.safeBottom \+ CHAT_COMPOSER_NAV_GAP/);
  assert.match(mainApp, /const visibleBottomNavInset = tabDockHiddenForKeyboard \? keyboardBottomInset : bottomNavInset/);
  assert.match(mainApp, /const visibleBottomInteractiveInset = tabDockHiddenForKeyboard \? keyboardBottomInset : bottomInteractiveInset/);
  assert.match(mainApp, /const visibleBottomContentInset = tabDockHiddenForKeyboard \? keyboardBottomInset : bottomContentInset/);
  assert.match(mainApp, /const visibleTabDockHeight = tabDockHiddenForKeyboard \? 0 : appLayout\.tabDockHeight/);
  assert.match(mainApp, /const handleTabBarLayout = useCallback\(\(event: LayoutChangeEvent\) => \{[\s\S]{0,260}setTabBarHeight/);
  assert.match(mainApp, /const handleTabDockLayout = useCallback\(\(event: LayoutChangeEvent\) => \{[\s\S]{0,260}setTabDockOverlayHeight/);
  assert.match(mainApp, /Keyboard\.addListener\("keyboardDidShow", \(\) => setAndroidKeyboardVisible\(true\)\)/);
  assert.match(mainApp, /Keyboard\.addListener\("keyboardDidHide", \(\) => setAndroidKeyboardVisible\(false\)\)/);
  assert.match(mainApp, /const tabDockFadeColors: readonly \[string, string, string\] = tab === "chat"[\s\S]{0,140}candy\.darkColor/);
  assert.match(app, /<CandyFrame dark=\{tab === "chat"\}>/);
  assert.match(app, /function CandyFrame\(\{ children, dark = false, hideDoodles = false \}/);
  assert.match(app, /colors=\{dark \? \[candy\.darkColor, candy\.darkColor\] : \[candy\.red, candy\.red\]\}/);
  assert.match(app, /<View style=\{\[styles\.safeArea, dark && styles\.safeAreaDark\]\}>\{children\}<\/View>/);
  assert.match(app, /style=\{\[\s+styles\.fakeAdSafe,[\s\S]{0,220}paddingBottom: Math\.max\(20, safeAreaInsets\.bottom \+ 20\),[\s\S]{0,80}paddingTop: Math\.max\(20, safeAreaInsets\.top \+ 20\),/);
  assert.match(mainApp, /styles\.app, tab === "chat" && styles\.appDark/);
  assert.match(mainApp, /styles\.tabDock, tab === "chat" && styles\.tabDockDark/);
  assert.match(mainApp, /\{tabDockHiddenForKeyboard \? null : \(/);
  assert.match(mainApp, /onLayout=\{handleTabDockLayout\}/);
  assert.match(mainApp, /colors=\{tabDockFadeColors\}/);
  assert.match(mainApp, /bottomContentInset=\{visibleBottomContentInset\}/);
  assert.match(mainApp, /bottomInteractiveInset=\{visibleBottomInteractiveInset\}/);
  assert.match(mainApp, /bottomNavInset=\{visibleBottomNavInset\}/);
  assert.match(mainApp, /tabDockHeight=\{visibleTabDockHeight\}/);
  assert.match(mainApp, /onLayout=\{handleTabBarLayout\}/);
  assert.match(mainApp, /hasLinkedPartner\(couple\) \? \(/);
  assert.match(mainApp, /<ChatScreen[\s\S]{0,380}onBack=\{\(\) => onTabChange\("home"\)\}/);
  assert.match(mainApp, /<ChatUnavailableScreen[\s\S]{0,220}onGoCouple=\{\(\) => onTabChange\("couple"\)\}/);
  assert.match(app, /function ChatUnavailableScreen/);
  assert.match(app, /Chat impossible/);
  assert.match(app, /Inviter ou rejoindre/);
  assert.match(chatScreen, /bottomInteractiveInset: number/);
  assert.match(chatScreen, /bottomNavInset: number/);
  assert.match(chatScreen, /tabDockHeight: number/);
  assert.match(chatScreen, /const appLayout = useAppLayout\(\{[\s\S]{0,140}tabDockHeight,/);
  assert.match(chatScreen, /const composerBottomPadding = Math\.max\(bottomInteractiveInset, bottomNavInset, appLayout\.bottomInteractiveInset\)/);
  assert.match(chatScreen, /const scrollBottomPadding = Math\.max\(22, appLayout\.safeBottom \+ 14\)/);
  assert.doesNotMatch(chatScreen, /composerBottomOffset/);
  assert.match(chatScreen, /style=\{\[styles\.chatComposerDock, \{ paddingBottom: composerBottomPadding \}\]\}/);
  assert.match(chatScreen, /onBack: \(\) => void/);
  assert.match(chatScreen, /<SpringPressable onPress=\{onBack\} style=\{styles\.chatBackButton\}>/);
  assert.match(chatScreen, /chatHeaderAvatarStack/);
  assert.match(chatScreen, /Éphémère · s'efface demain à 6:00/);
  assert.match(chatScreen, /À propos de votre match/);
  assert.match(chatScreen, /placeholder="Message éphémère\.\.\."/);
  assert.match(chatScreen, /<Camera size=\{20\} color=\{candy\.cream\} \/>/);
  assert.match(chatScreen, /function openPhotoSourcePicker\(\)/);
  assert.match(chatScreen, /onPress=\{openPhotoSourcePicker\}/);
  assert.match(chatScreen, /Prendre une photo/);
  assert.match(chatScreen, /Choisir depuis la galerie/);
  assert.match(chatScreen, /ImagePicker\.requestCameraPermissionsAsync\(\)/);
  assert.match(chatScreen, /ImagePicker\.launchCameraAsync\(\{[\s\S]{0,120}mediaTypes: ImagePicker\.MediaTypeOptions\.Images[\s\S]{0,80}quality: 0\.8/);
  assert.match(chatScreen, /ImagePicker\.requestMediaLibraryPermissionsAsync\(\)/);
  assert.match(chatScreen, /ImagePicker\.launchImageLibraryAsync\(\{/);
  assert.match(chatScreen, /await addPhotoAssets\(result\.assets\)/);
  assert.match(app, /Photo privée · vue unique · 10 s/);
  assert.match(app, /chatPhotoEye/);
  assert.match(app, /chatPhotoRevealLabel: \{[\s\S]{0,120}backgroundColor: "rgba\(38,18,46,0\.84\)"/);
  assert.match(app, /chatPhotoRevealLabel: \{[\s\S]{0,180}color: candy\.cream/);
  assert.match(app, /chatPhotoRevealLabel: \{[\s\S]{0,260}paddingVertical: 5/);
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
  assert.match(chatScreen, /<View style=\{styles\.chatInputShell\}>[\s\S]{0,240}<TextInput/);
  assert.match(app, /chatInputShell: \{[\s\S]{0,160}backgroundColor: candy\.cream[\s\S]{0,160}minHeight: 58/);
  assert.match(app, /chatInputShell: \{[\s\S]{0,220}overflow: "hidden"[\s\S]{0,120}paddingVertical: 0/);
  assert.match(app, /chatInput: \{[\s\S]{0,220}backgroundColor: "transparent"[\s\S]{0,160}includeFontPadding: true/);
  assert.match(app, /chatInput: \{[\s\S]{0,320}paddingVertical: 4/);
  assert.match(app, /chatInput: \{[\s\S]{0,360}width: "100%"/);
  assert.match(app, /chatSendButton: \{[\s\S]{0,160}flexShrink: 0/);
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
  assert.doesNotMatch(candyTabs, /chatNotificationsEnabled|tabNotificationBadge|BellOff|<Bell /);
  assert.doesNotMatch(app, /tabNotificationBadge/);
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

test("non-home header controls stay thumb-friendly on Android", () => {
  assert.match(app, /const headerButtonScale = Math\.min\(1\.22, Math\.max\(0\.9,/);
  assert.match(app, /const headerButtonSize = Math\.max\(44, 44 \* headerButtonScale\)/);
  assert.match(app, /stepPill: \{[\s\S]{0,120}minHeight: Math\.max\(40, 40 \* headerButtonScale\)[\s\S]{0,100}minWidth: Math\.max\(74, 74 \* headerButtonScale\)/);
  assert.match(app, /onboardingBackButton: \{[\s\S]{0,120}height: 46[\s\S]{0,80}width: 46/);
  assert.match(app, /onboardingStepPill: \{[\s\S]{0,160}minHeight: 40[\s\S]{0,80}minWidth: 74/);
  assert.match(onboardingScreen, /const backButtonSize = Math\.max\(44, 44 \* onboardingScale\)/);
  assert.match(onboardingScreen, /height: Math\.max\(40, 40 \* onboardingScale\)/);
  assert.match(app, /chatBackButton: \{[\s\S]{0,120}height: 46[\s\S]{0,80}width: 46/);
  assert.match(app, /storeCloseButton: \{[\s\S]{0,120}height: 46[\s\S]{0,80}width: 46/);
  assert.match(app, /purchaseBackButton: \{[\s\S]{0,120}height: 46[\s\S]{0,80}width: 46/);
  assert.match(app, /rulesBackButton: \{[\s\S]{0,260}minHeight: 44/);
  assert.match(app, /categoryPickerClose: \{[\s\S]{0,180}minHeight: 48/);
  assert.match(app, /backButton: \{[\s\S]{0,80}height: Math\.max\(44, 44 \* leaveScale\)[\s\S]{0,80}width: Math\.max\(44, 44 \* leaveScale\)/);
});

test("home keeps a static-first responsive fallback", () => {
  assert.match(app, /const appLayout = useAppLayout\(\)/);
  assert.match(app, /const homeFontScale = appLayout\.fontScale/);
  assert.match(app, /const compactHome = frameHeight < 850 \|\| viewportWidth < 700/);
  assert.match(app, /const targetRhythm = compactHome \? 24 : 42/);
  assert.match(app, /const minimumRhythm = compactHome \? 6 : 8/);
  assert.match(app, /const surpriseAspectRatio = compactHome \? 2\.24 : 1\.72/);
  assert.match(app, /compactHome,/);
  assert.match(app, /const homeScrollFallback = \(/);
  assert.match(app, /homeFontScale > 1\.08/);
  assert.match(app, /viewportWidth < 360/);
  assert.match(app, /homeFrameHeight < 690/);
  assert.match(app, /homeRhythm <= 10/);
  assert.match(app, /homeSurpriseHeight < 132/);
  assert.match(app, /const homeSectionGap = homeScrollFallback \? Math\.max\(homeRhythm, 14\) : homeRhythm/);
  assert.match(app, /const homeBottomScrollPadding = homeBottomPadding \+ \(homeScrollFallback \? homeSectionGap : 0\)/);
  assert.match(app, /gap: homeSectionGap/);
  assert.match(app, /paddingBottom: homeBottomScrollPadding/);
  assert.match(app, /scrollEnabled=\{homeScrollFallback\}/);
  assert.match(app, /showsVerticalScrollIndicator=\{homeScrollFallback\}/);
  assert.doesNotMatch(app, /overflow: homeScrollFallback \? "visible" : "hidden"/);
  assert.doesNotMatch(app, /\.\.\.\(homeScrollFallback \? \{\} : \{ height: homeFrameHeight \}\)/);
  assert.doesNotMatch(app, /scrollEnabled=\{false\}/);
  assert.doesNotMatch(app, /height=\{homeHeroHeight\}/);
  assert.doesNotMatch(app, /height=\{homeSurpriseHeight\}/);
  assert.doesNotMatch(app, /height=\{homeAdviceHeight\}/);
  assert.doesNotMatch(app, /height=\{homeStoreHeight\}/);
  assert.match(app, /targetHeight=\{homeHeroHeight\}/);
  assert.match(app, /targetHeight=\{homeSurpriseHeight\}/);
  assert.match(app, /targetHeight=\{homeAdviceHeight\}/);
  assert.match(app, /targetHeight=\{homeStoreHeight\}/);
  assert.match(app, /compact=\{compactHome\}/);
  assert.match(app, /aspectRatio: 1\.92/);
  assert.match(app, /const emptyCardMinHeight = compact[\s\S]{0,120}Math\.min\(targetHeight \* 0\.7, 176 \* verticalScale\)/);
  assert.match(app, /const emptyCardMaxHeight = compact[\s\S]{0,120}Math\.min\(targetHeight, 232 \* verticalScale\)/);
  assert.match(app, /const cardAspectRatio = compactCard \? 2\.24 : 1\.72/);
  assert.match(app, /const compactCardMinHeight = Math\.max\(132 \* verticalScale, Math\.min\(targetHeight \* 0\.72, 176 \* verticalScale\)\)/);
  assert.match(app, /Math\.min\(targetHeight, 232 \* verticalScale\)/);
  assert.match(app, /aspectRatio: 4\.15/);
  assert.match(app, /const packAspectRatio = compact \? 2\.62 : 2\.18/);
  assert.match(app, /<Text\s+adjustsFontSizeToFit[\s\S]{0,120}numberOfLines=\{2\}[\s\S]{0,120}styles\.homeHeroTitle/);
  assert.match(app, /<Text adjustsFontSizeToFit minimumFontScale=\{0\.76\} numberOfLines=\{3\} style=\{\[styles\.homeSurpriseTitle/);
});

test("home mood gear opens a mood and notification bottom sheet", () => {
  assert.match(homeMoodHero, /onOpenMoodPanel/);
  assert.match(homeMoodHero, /<Settings color=\{candy\.white\} size=\{18 \* heroScale\}/);
  assert.match(homeMoodSettingsSheet, /Ton mood/);
  assert.match(homeMoodSettingsSheet, /Valider/);
  assert.doesNotMatch(homeMoodSettingsSheet, /Envoyer le signal/);
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
  assert.match(app, /homeMoodSheetOverlay: \{[\s\S]{0,80}alignItems: "stretch"[\s\S]{0,80}backgroundColor: "rgba\(38,18,46,0\.48\)"/);
  assert.match(app, /homeMoodSheet: \{[\s\S]{0,80}alignSelf: "stretch"/);
  assert.match(app, /homeMoodSheet: \{[\s\S]{0,420}width: "100%"/);
  assert.doesNotMatch(app, /homeMoodSheet: \{[\s\S]{0,220}maxWidth: 430/);
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
  assert.match(app, /const actionButtonHeight = \(compactCard \? 49 : 61\) \* cardScale/);
  assert.match(app, /fontSize: 17\.5 \* cardScale/);
  assert.match(app, /paddingBottom: \(compactCard \? 15 : 23\) \* cardScale/);
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
  assert.match(desireGameCardFace, /<Text numberOfLines=\{3\} style=\{\[styles\.desireGameText, textStyle\]\}>\{description\}<\/Text>/);
  assert.match(app, /desireGameTitle: \{[\s\S]{0,180}textAlign: "center"/);
  assert.match(app, /desireGameText: \{[\s\S]{0,180}fontSize: 15[\s\S]{0,80}lineHeight: 19/);
  assert.match(app, /desireGameText: \{[\s\S]{0,240}textAlign: "center"/);
  assert.match(app, /desireGameCard: \{[\s\S]{0,420}paddingBottom: 44[\s\S]{0,80}paddingTop: 24/);
  assert.match(app, /desireGameCardRoomy: \{[\s\S]{0,240}paddingBottom: 54[\s\S]{0,80}paddingTop: 30/);
  assert.match(app, /desireGameCopy: \{[\s\S]{0,120}paddingTop: 0/);
  assert.match(app, /desireGameCopyRoomy: \{[\s\S]{0,120}paddingTop: 0/);
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
  assert.match(app, /const GAME_CARD_CONFIRM_MS = 160/);
  assert.match(app, /const GAME_CARD_EXIT_MS = 260/);
  assert.match(app, /const \[gameTransitionVoteLevel, setGameTransitionVoteLevel\] = useState<VoteLevel \| null>\(null\)/);
  assert.match(app, /setGameTransitionVoteLevel\(level\)/);
  assert.match(app, /voteLevel=\{gameTransitionVoteLevel \?\? undefined\}/);
  assert.match(app, /confirmingVote=\{activeGameCard\.id === gameTransitionCardId \? gameTransitionVoteLevel \?\? undefined : undefined\}/);
  assert.match(app, /gameCardStageHost: \{[\s\S]{0,80}flexGrow: 1,[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /gameCardTransitionBody: \{[\s\S]{0,60}flexGrow: 1/);
  assert.match(app, /exitTranslateX = exit\.interpolate\(\{[\s\S]{0,140}outputRange: \[0, voteLevel === 0 \? -154 : voteLevel === 1 \? 154 : 0\]/);
  assert.match(app, /exitTranslateY = exit\.interpolate\(\{[\s\S]{0,140}outputRange: \[0, voteLevel === 2 \? -46 : 34\]/);
  assert.match(app, /desireGameStage: \{[\s\S]{0,120}flexGrow: 1/);
  assert.match(desireGameCard, /const gameVerticalDrop = Math\.round\(Math\.min\(roomy \? 86 : 72, Math\.max\(38, height \* 0\.075\)\)\)/);
  assert.match(desireGameCard, /\{ paddingTop: gameVerticalDrop \}/);
  assert.match(app, /desireGameDeck: \{[\s\S]{0,120}maxWidth: 400,[\s\S]{0,80}minHeight: 388/);
  assert.match(app, /desireGameCard: \{[\s\S]{0,300}minHeight: 360,[\s\S]{0,240}width: "86%"/);
  assert.match(desireGameCard, /styles\.desireGameValidationVeil/);
  assert.match(desireGameCard, /styles\.desireGameValidationPulse/);
  assert.match(desireGameCard, /styles\.desireGameValidationBadge/);
  assert.match(desireGameCard, /<Check color=\{validationTone\.iconColor\} size=\{28\} strokeWidth=\{4\} \/>/);
  assert.doesNotMatch(app, /Choix enregistr.|SecretVoteToast|secretToast/);
  assert.doesNotMatch(app, /PersistentBurstLayer|HeartBurst|responseBurstParticles/);
  assert.match(app, /desireGameVoteDock: \{[\s\S]{0,160}flexGrow: 1,[\s\S]{0,80}justifyContent: "center"/);
});

test("game mode can replay an already answered pack", () => {
  assert.match(app, /const \[replayDeckIds, setReplayDeckIds\] = useState<string\[\]>\(\[\]\)/);
  assert.match(app, /const replayAnsweredCards = replayDeckIds\.length > 0/);
  assert.match(app, /setReplayDeckIds\(shuffledCards\(categoryCards\)\.map\(\(card\) => card\.id\)\)/);
  assert.match(app, /const replaySameVote = replayAnsweredCards && ownVotes\[cardId\] === level/);
  assert.match(app, /const gameTransitionActive = useRef\(false\)/);
  assert.match(app, /const gameTransitionNonce = useRef\(0\)/);
  assert.match(app, /gameTransitionActive\.current = true[\s\S]{0,120}setGameTransitionCardId\(cardId\)[\s\S]{0,120}setGameTransitionVoteLevel\(level\)/);
  assert.match(app, /const acceptedPromise = replaySameVote \? Promise\.resolve\(true\) : onVote\(cardId, level\)/);
  assert.match(app, /void acceptedPromise[\s\S]{0,180}cancelTransition/);
  assert.doesNotMatch(app, /const accepted = replaySameVote \|\| \(await onVote\(cardId, level\)\)/);
  assert.match(app, /onReplayAnsweredCards=\{replayAnsweredPack\}/);
  assert.match(app, /Pack explor. . fond/);
  assert.match(app, /Rejouer les cartes/);
});

test("envies header top gap matches the bottom navbar rhythm", () => {
  assert.match(app, /const safeAreaInsets = useSafeAreaInsets\(\);[\s\S]{0,90}const \{ height: viewportHeight, width \} = useWindowDimensions\(\);/);
  assert.match(app, /const enviesHeaderTopSpace = homeLayoutMetrics\(viewportHeight, width, safeAreaInsets, tabDockHeight\)\.rhythm/);
  assert.match(app, /const enviesBottomInsetStyle = useMemo<ViewStyle>\(\(\) => \(\{\s+paddingBottom: bottomContentInset,/);
  assert.match(app, /contentContainerStyle=\{\[styles\.screen, styles\.enviesScreenContent, enviesBottomInsetStyle\]\}/);
  assert.match(app, /contentContainerStyle=\{\[styles\.screen, styles\.enviesGameContent, enviesBottomInsetStyle\]\}/);
  assert.match(app, /outputRange: \[enviesHeaderTopSpace, enviesHeaderTopSpace\]/);
  assert.match(app, /const tabDockPaddingBottom = homeLayoutMetrics\(\s+appLayout\.viewportHeight,\s+appLayout\.viewportWidth,\s+\{ bottom: appLayout\.safeBottom, top: appLayout\.safeTop \},\s+appLayout\.tabDockHeight,\s+\)\.rhythm/);
  assert.doesNotMatch(app, /ENVIES_HEADER_TOP_SPACE/);
});

test("match empty screen follows the simple centered layout", () => {
  assert.match(matchScreen, /const matchLayout = homeLayoutMetrics\(viewportHeight, viewportWidth, safeAreaInsets, tabDockHeight\)/);
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
  assert.match(matchDetailModal, /<View style=\{styles\.matchDetailSafe\}>/);
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
  assert.match(app, /function desireCardFromRemoteMatch\(match: RemoteMatch\)/);
  assert.match(app, /const revealedMatch = await onRevealMatch\(newestHiddenMatch\?\.id\)/);
  assert.match(app, /nextSpotlightMatch = newestHiddenMatch \?\? revealedMatch/);
  assert.match(app, /setSpotlightMatch\(nextSpotlightMatch\)/);
  assert.match(matchScreen, /revealAnim\.setValue\(0\)/);
  assert.match(app, /hiddenMatchPatternDots/);
  assert.match(app, /Match cach./);
  assert.match(app, /Ni titre, ni indice/);
  assert.doesNotMatch(app, /Une courte pub avant la r.v.lation/);
  assert.doesNotMatch(app, /styles\.hiddenRevealAdText|styles\.hiddenRevealAdLink/);
  assert.doesNotMatch(app, /en attente d'alignement/);
  assert.doesNotMatch(app, /hiddenRevealPendingLine|hiddenRevealPendingDot|hiddenRevealPendingText/);
  assert.match(app, /matchPrimaryStageCentered: \{[\s\S]{0,80}flexGrow: 1,[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /matchScreenRevealMode: \{[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /hiddenRevealMysteryCard: \{[\s\S]{0,120}backgroundColor: candy\.black/);
  assert.match(app, /hiddenRevealButton: \{[\s\S]{0,140}backgroundColor: candy\.cream/);
});

test("pack selector opens as a full-screen pack grid", () => {
  assert.match(app, /const PACK_PICKER_CATEGORIES: DesireCategory\[\] = \["Vanille", PERSONAL_CATEGORY, \.\.\.PACK_CATEGORIES\.filter\(\(category\) => category !== "Vanille"\)\]/);
  assert.match(categoryPicker, /<Text style=\{styles\.categoryPickerTitle\}>Packs<\/Text>/);
  assert.match(categoryPicker, /Des univers . explorer, . deux\./);
  assert.match(categoryPicker, /styles\.categoryPickerHeaderShell/);
  assert.match(categoryPicker, /<ArrowLeft size=\{20\} color=\{candy\.red\} strokeWidth=\{3\} \/>/);
  assert.match(categoryPicker, /<Text numberOfLines=\{1\} style=\{styles\.categoryPickerCloseText\}>Retour<\/Text>/);
  assert.doesNotMatch(categoryPicker, /<X size=\{20\} color=\{candy\.red\} \/>/);
  assert.match(categoryPicker, /colors=\{\[candy\.red, "rgba\(245,40,110,0\.18\)", "rgba\(245,40,110,0\)"\]\}/);
  assert.match(categoryPicker, /style=\{styles\.categoryPickerHeaderFade\}/);
  assert.match(categoryPicker, /PACK_PICKER_CATEGORIES\.map/);
  assert.match(app, /function packPresentation\(category: DesireCategory, couple: CoupleState/);
  assert.match(categoryPicker, /const pack = packPresentation\(category, couple/);
  assert.match(categoryPicker, /const \{ countLabel, personal, unlocked \} = pack/);
  assert.doesNotMatch(categoryPicker, /onCreateCustom/);
  assert.match(app, /statusLabel = options\.selected[\s\S]{0,160}"Actif"[\s\S]{0,160}personal[\s\S]{0,120}"Choisir"[\s\S]{0,180}\? "Disponible"/);
  assert.match(categoryPicker, /const badgeLabel = pack\.statusLabel/);
  assert.doesNotMatch(categoryPicker, /\? "Ouvert"/);
  assert.match(categoryPicker, /const action = unlocked \? \(\) => onSelect\(category\) : \(\) => onLockedCategory\(category\)/);
  assert.match(enviesScreen, /useState<"picker" \| "store" \| null>\(null\)/);
  assert.match(enviesScreen, /const requestCategoryPurchase = \(nextCategory: DesireCategory\) => \{[\s\S]{0,120}setCategoryPickerOpen\(false\);[\s\S]{0,80}setPurchaseCategorySource\("picker"\);[\s\S]{0,80}setPurchaseCategory\(nextCategory\);/);
  assert.match(enviesScreen, /const closeCategoryPurchase = \(\) => \{[\s\S]{0,120}purchaseCategorySource === "picker"[\s\S]{0,180}setCategoryPickerOpen\(true\);/);
  assert.match(enviesScreen, /onClose=\{closeCategoryPurchase\}/);
  assert.match(enviesScreen, /const requestStoreCategoryPurchase = \(nextCategory: DesireCategory\) => \{[\s\S]{0,80}setPurchaseCategorySource\("store"\);[\s\S]{0,80}setPurchaseCategory\(nextCategory\);/);
  assert.match(enviesScreen, /onOpenPack=\{requestStoreCategoryPurchase\}/);
  assert.match(categoryPicker, /<CategoryPickerPattern category=\{category\} \/>/);
  assert.match(categoryPicker, /styles\.categoryPickerPackEmoji/);
  assert.match(categoryPicker, /\{visual\.sticker\}/);
  assert.match(categoryPicker, /const tileTitleColor = categoryTileTitleText\(category\)/);
  assert.match(categoryPicker, /const tileMetaColor = categoryTileMetaText\(category\)/);
  assert.match(categoryPicker, /const tileIconColor = categoryTileIconText\(category\)/);
  assert.match(categoryPicker, /const showPartnerPackStatus = pack\.locked/);
  assert.match(app, /function partnerPackOwnershipLabel\(couple: CoupleState, category: DesireCategory\) \{[\s\S]{0,120}Partenaire ne l'a pas/);
  assert.match(categoryPicker, /\{ color: tileIconColor \}/);
  assert.match(categoryPicker, /\{ color: tileTitleColor \}/);
  assert.match(categoryPicker, /\{ color: tileMetaColor \}/);
  assert.match(categoryPicker, /styles\.categoryPickerPartnerTag/);
  assert.match(categoryPicker, /\{pack\.partnerStatusLabel\}/);
  assert.doesNotMatch(categoryPicker, /const lightCard = !creamCard/);
  assert.match(categoryPicker, /testID="category-picker-card-coming-soon"/);
  assert.match(categoryPicker, /Bient.t/);
  assert.match(categoryPicker, /Nouveaux packs/);
  assert.match(categoryPicker, /À venir/);
  assert.match(categoryPicker, /<View style=\{\[styles\.categoryPickerCard, styles\.categoryPickerComingSoonCard\]\}/);
  assert.doesNotMatch(categoryPicker, /<SpringPressable[\s\S]{0,160}testID="category-picker-card-coming-soon"/);
  assert.match(categoryPicker, /<LockKeyhole size=\{22\}[\s\S]{0,80}strokeWidth=\{2\.8\}/);
  assert.match(app, /categoryPickerOverlay: \{[\s\S]{0,80}backgroundColor: candy\.red/);
  assert.match(app, /categoryPickerSheet: \{[\s\S]{0,120}paddingHorizontal: 18/);
  assert.match(app, /categoryPickerHeaderShell: \{[\s\S]{0,80}elevation: 18[\s\S]{0,80}zIndex: 18/);
  assert.match(app, /categoryPickerHeader: \{[\s\S]{0,120}backgroundColor: candy\.red[\s\S]{0,160}paddingBottom: 20/);
  assert.match(app, /categoryPickerHeaderFade: \{[\s\S]{0,80}bottom: -10[\s\S]{0,80}height: 18/);
  assert.match(app, /categoryPickerClose: \{[\s\S]{0,120}backgroundColor: candy\.cream[\s\S]{0,160}minHeight: 48/);
  assert.match(app, /categoryPickerCloseText: \{[\s\S]{0,80}color: candy\.red[\s\S]{0,80}fontWeight: "900"/);
  assert.match(app, /categoryPickerGrid: \{[\s\S]{0,120}gap: 14/);
  assert.match(app, /categoryPickerGrid: \{[\s\S]{0,160}paddingTop: 8/);
  assert.match(app, /categoryPickerCard: \{[\s\S]{0,120}aspectRatio: 1/);
  assert.match(app, /categoryPickerCard: \{[\s\S]{0,180}borderRadius: 28/);
  assert.match(app, /categoryPickerComingSoonCard: \{[\s\S]{0,120}borderStyle: "dashed"[\s\S]{0,80}borderWidth: 2/);
  assert.match(app, /categoryPickerPackEmoji: \{[\s\S]{0,180}fontSize: 48/);
  assert.match(app, /categoryPickerPackEmoji: \{[\s\S]{0,360}top: 68/);
  assert.match(app, /categoryPickerCardTitle: \{[\s\S]{0,120}fontSize: 24[\s\S]{0,80}lineHeight: 26/);
  assert.match(app, /categoryPickerCardText: \{[\s\S]{0,120}fontSize: 15[\s\S]{0,80}lineHeight: 18/);
  assert.match(app, /categoryPickerLock: \{[\s\S]{0,180}marginTop: 13[\s\S]{0,80}minHeight: 38[\s\S]{0,80}paddingHorizontal: 17/);
  assert.match(app, /categoryPickerBadgeText: \{[\s\S]{0,120}fontSize: 14[\s\S]{0,80}lineHeight: 17/);
  assert.match(app, /categoryPickerPartnerTag: \{[\s\S]{0,120}backgroundColor: "rgba\(255,249,240,0\.92\)"/);
  assert.match(app, /categoryPickerPartnerTagText: \{[\s\S]{0,80}color: candy\.red/);
  assert.match(app, /categoryPickerLockIcon: \{[\s\S]{0,120}height: 36[\s\S]{0,160}width: 36/);
  assert.match(categoryPicker, /personal && !selected && styles\.categoryPickerBadgeCreate[\s\S]{0,80}selected && styles\.categoryPickerBadgeActive/);
  assert.match(categoryPicker, /personal && !selected && styles\.categoryPickerBadgeTextCreate[\s\S]{0,80}selected && styles\.categoryPickerBadgeTextActive/);
  assert.match(app, /categoryPickerBadgeActive: \{[\s\S]{0,80}backgroundColor: candy\.red/);
  assert.match(app, /categoryPickerBadgeTextActive: \{[\s\S]{0,80}color: candy\.white/);
  assert.doesNotMatch(app, /categoryPickerBadgeActive: \{[\s\S]{0,80}backgroundColor: candy\.white/);
  assert.match(app, /categoryPickerComingSoonIcon: \{[\s\S]{0,120}height: 38[\s\S]{0,160}width: 38/);
  assert.match(app, /import \{ packThemeForCategory \} from "\.\/src\/data\/pack-themes"/);
  assert.match(app, /function categoryVisual\(category: DesireCategory\) \{[\s\S]{0,80}return packThemeForCategory\(category\);[\s\S]{0,40}\}/);
  assert.doesNotMatch(app, /const categoryVisuals/);
  assert.doesNotMatch(app, /type CategoryCardTone/);
  assert.match(packThemesSource, /export const PACK_THEMES: Record<DesireCategory, PackTheme>/);
  assert.match(packThemesSource, /Vanille: \{[\s\S]{0,240}colors: \["#FFF8EF", "#FFF0DF", "#F1D1B1"\][\s\S]{0,180}sticker: "✨"/);
  assert.match(packThemesSource, /Sensuel: \{[\s\S]{0,240}colors: \["#FF8FA6", "#FF527F", "#F02A68"\][\s\S]{0,180}sticker: "💧"/);
  assert.match(packThemesSource, /"Jeux & Défis": \{[\s\S]{0,240}colors: \["#321044", "#451659", "#1A0826"\][\s\S]{0,180}sticker: "🎲"/);
  assert.match(packThemesSource, /Scénarios: \{[\s\S]{0,320}sticker: "🎬"/);
  assert.match(packThemesSource, /"Kinky Soft": \{[\s\S]{0,320}sticker: "🎀"/);
  assert.match(packThemesSource, /BDSM: \{[\s\S]{0,320}sticker: "💍"/);
  assert.match(packThemesSource, /"Plaisirs explicites": \{[\s\S]{0,320}sticker: "⚡"/);
  assert.match(packThemesSource, /Tabous: \{[\s\S]{0,320}sticker: "🙈"/);
  assert.match(packThemesSource, /Perso: \{[\s\S]{0,320}sticker: "💗"/);
  assert.match(packThemesSource, /tileIconText:/);
  assert.match(packThemesSource, /tileTitleText:/);
  assert.match(packThemesSource, /tileMetaText:/);
  assert.match(packThemesSource, /pattern: "dots"/);
  assert.match(packThemesSource, /pattern: "stripes"/);
  assert.match(packThemesSource, /pattern: "none"/);
  assert.match(app, /const visual = categoryVisual\(category\);[\s\S]{0,120}visual\.pattern === "none"/);
  assert.doesNotMatch(app, /categoryPickerCardTitleDark|categoryPickerCardTextDark|categoryPickerBadgeTextHot|categoryPickerPackEmojiHot|categoryPickerPackEmojiLight|categoryPickerPackEmojiCream|categoryPickerCardTitleLight|categoryPickerCardTextLight/);
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
  assert.match(storeScreen, /<View style=\{styles\.storeSafe\}>/);
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
  assert.match(storeScreen, /styles\.storePackEmoji/);
  assert.match(storeScreen, /\{visual\.sticker\}/);
  assert.match(storeScreen, /styles\.storePackLockIcon/);
  assert.match(storeScreen, /color=\{visual\.tileIconText\}/);
  assert.match(storeScreen, /\{ color: visual\.tileTitleText \}/);
  assert.match(storeScreen, /\{ color: visual\.tileMetaText \}/);
  assert.match(storeScreen, /const pack = packPresentation\(category, couple\)/);
  assert.match(storeScreen, /const unlocked = pack\.unlocked/);
  assert.match(storeScreen, /styles\.storePackPartnerTag/);
  assert.match(storeScreen, /\{pack\.partnerStatusLabel\}/);
  assert.match(storeScreen, /\{pack\.countLabel\} · \{pack\.statusLabel\}/);
  assert.match(app, /const pack = packPresentation\(category, couple, \{ included \}\)/);
  assert.match(app, /<Text style=\{styles\.storeOfferPrice\}>\{pack\.statusLabel\}<\/Text>/);
  assert.match(app, /coupleCategoryStatusText\}>\{pack\.statusLabel\}<\/Text>/);
  assert.doesNotMatch(storeScreen, /const packStatus = unlocked \? "Actif"/);
  assert.match(storeScreen, /Restaurer mes achats/);
  assert.match(app, /onRestorePurchases=\{onRestorePurchases\}/);
  assert.match(app, /storeContent: \{[\s\S]{0,160}flexGrow: 1,[\s\S]{0,160}width: "100%"/);
  assert.match(app, /storePackGrid: \{[\s\S]{0,160}flexWrap: "wrap"[\s\S]{0,160}justifyContent: "space-between"[\s\S]{0,80}width: "100%"/);
  assert.doesNotMatch(app, /storeFooter: \{[\s\S]{0,120}marginTop: "auto"/);
  assert.doesNotMatch(app, /storeFooter: \{[\s\S]{0,140}paddingTop: 70/);
  assert.match(app, /storePackCard: \{[\s\S]{0,120}borderRadius: 24/);
  assert.match(app, /storePackEmoji: \{[\s\S]{0,120}fontSize: 42/);
  assert.match(app, /storePackLockIcon: \{[\s\S]{0,120}height: 32[\s\S]{0,120}width: 32/);
  assert.match(app, /storePackTitle: \{[\s\S]{0,120}fontSize: 20/);
  assert.match(app, /storePackPartnerTag: \{[\s\S]{0,120}backgroundColor: "rgba\(255,249,240,0\.92\)"/);
  assert.match(app, /storeOfferPartnerTag: \{[\s\S]{0,120}backgroundColor: "rgba\(245,40,110,0\.12\)"/);
  assert.doesNotMatch(app, /storePackTitleLight|storePackPriceLight/);
  assert.match(app, /storeUpgradeCardHighlight: \{[\s\S]{0,80}backgroundColor: candy\.yellow/);
  assert.match(app, /storeUpgradePriceDark: \{[\s\S]{0,80}backgroundColor: candy\.black/);
});

test("custom card editor uses a full-screen preview layout", () => {
  assert.match(app, /const customDesireQuickEmojis = \[".*?", ".*?", ".*?", ".*?", ".*?"\]/);
  assert.match(app, /const customDesireAmbianceOptions = \["Complice", "Tendre", "Chaud", "Discussion"\] as const/);
  assert.match(customDesireEditor, /const safeAreaInsets = useSafeAreaInsets\(\)/);
  assert.match(customDesireEditor, /<Modal animationType="slide" visible=\{visible\}/);
  assert.match(customDesireEditor, /<LinearGradient colors=\{\[candy\.red, candy\.red\]\} style=\{styles\.editorScreen\}>/);
  assert.match(customDesireEditor, /<View style=\{styles\.editorSafe\}>/);
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
  assert.doesNotMatch(customDesireEditor, /footerCopy|Plus que 1 carte gratuite|cartes gratuites restantes/);
  assert.doesNotMatch(customDesireEditor, /styles\.editorFooterText/);
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
  assert.match(app, /editorSubmitButton: \{[\s\S]{0,160}borderRadius: 33[\s\S]{0,120}minHeight: 66[\s\S]{0,80}paddingVertical: 18/);
  assert.match(app, /editorSubmitText: \{[\s\S]{0,80}fontSize: 17/);
  assert.doesNotMatch(app, /editorFooterText: \{/);
});

test("purchase screens use the full-screen landing layout", () => {
  assert.equal((app.match(/<PurchaseLandingModal/g) ?? []).length, 4);
  assert.match(purchaseLanding, /colors=\{\[candy\.red, candy\.red\]\}/);
  assert.match(purchaseLanding, /styles\.purchaseOverlay/);
  assert.match(purchaseLanding, /styles\.purchaseBackButton/);
  assert.match(purchaseLanding, /styles\.purchaseContent/);
  assert.match(purchaseLanding, /styles\.purchasePackVisual/);
  assert.match(purchaseLanding, /styles\.purchasePackEmoji/);
  assert.match(purchaseLanding, /visual\.tileIconText/);
  assert.match(purchaseLanding, /visual\.tileTitleText/);
  assert.match(purchaseLanding, /visual\.tileMetaText/);
  assert.match(purchaseLanding, /styles\.purchasePreviewRow/);
  assert.match(purchaseLanding, /styles\.purchaseBottomBar/);
  assert.match(purchaseLanding, /partnerPackStatusLabel/);
  assert.match(purchaseLanding, /styles\.purchasePartnerPackTag/);
  assert.match(app, /ctaLabel=\{`Acheter - \$\{pack\.price\}`\}/);
  assert.match(app, /ctaLabel=\{`Acheter - \$\{NO_ADS_PRICE\}`\}/);
  assert.match(app, /ctaLabel=\{`Acheter - \$\{UNLIMITED_RESPONSES_PRICE\}`\}/);
  assert.match(app, /ctaLabel=\{`Acheter - \$\{CUSTOM_CARDS_UNLIMITED_PRICE\}`\}/);
  assert.match(categoryPurchaseModal, /const pack = packPresentation\(category, couple\)/);
  assert.match(categoryPurchaseModal, /couple: CoupleState/);
  assert.match(categoryPurchaseModal, /partnerPackStatusLabel=\{pack\.partnerStatusLabel\}/);
  assert.match(categoryPurchaseModal, /subtitle=\{pack\.description \|\| `Des envies \$\{pack\.title\.toLowerCase\(\)\}, . d.couvrir sans pression\.`\}/);
  assert.doesNotMatch(categoryPurchaseModal, /curiosit. ne demande qu'. jouer/);
  assert.match(app, /purchaseContent: \{[\s\S]{0,180}flex: 1,[\s\S]{0,80}justifyContent: "center"/);
  assert.match(app, /purchaseText: \{[\s\S]{0,180}maxWidth: 392/);
  assert.match(app, /purchasePartnerPackTag: \{[\s\S]{0,120}backgroundColor: "rgba\(255,249,240,0\.92\)"/);
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
  assert.doesNotMatch(purchaseSuccessScreen, /Re.u v.rifi./);
  assert.doesNotMatch(purchaseSuccessScreen, /Restaurable . tout moment/);
  assert.doesNotMatch(purchaseSuccessScreen, /styles\.purchaseSuccessLegal/);
  assert.match(purchaseSuccessScreen, /styles\.purchaseSuccessPackVisual/);
  assert.match(purchaseSuccessScreen, /styles\.purchaseSuccessPackEmoji/);
  assert.match(purchaseSuccessScreen, /packVisual\.tileIconText/);
  assert.match(purchaseSuccessScreen, /packVisual\?\.tileTitleText/);
  assert.match(purchaseSuccessScreen, /packVisual\?\.tileMetaText/);
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
  assert.match(app, /const \[showPurchaseLanding, setShowPurchaseLanding\] = useState\(false\)/);
  assert.match(app, /limitReached && !showPurchaseLanding/);
  assert.match(app, /onUnlock=\{\(\) => setShowPurchaseLanding\(true\)\}/);
  assert.match(app, /onClose=\{limitReached && showPurchaseLanding \? \(\) => setShowPurchaseLanding\(false\) : onClose\}/);
  assert.match(app, /title="R.ponses illimit.es"/);
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
  assert.match(desireGameCard, /const desiredSideVoteSize = roomy \? 124 : 106/);
  assert.match(desireGameCard, /const desiredFeaturedVoteSize = roomy \? 156 : 140/);
  assert.match(app, /featured && styles\.voteButtonFeatured,[\s\S]{0,80}prominentSizeStyle/);
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
  assert.match(app, /<ArrowLeft size=\{20\} color=\{candy\.red\} strokeWidth=\{3\} \/>/);
  assert.match(app, /enviesTopGameBar: \{[\s\S]{0,120}minHeight: 58/);
  assert.match(app, /enviesPackPill: \{[\s\S]{0,180}minHeight: 48[\s\S]{0,80}paddingHorizontal: 20/);
  assert.match(app, /enviesGamePackPill: \{[\s\S]{0,80}justifyContent: "center"[\s\S]{0,80}minWidth: 112/);
  assert.match(app, /enviesGameProgress: \{[\s\S]{0,180}fontSize: 15[\s\S]{0,120}minHeight: 48[\s\S]{0,80}minWidth: 82/);
  assert.match(app, /enviesGalleryBackButton: \{[\s\S]{0,220}minHeight: 48[\s\S]{0,80}paddingHorizontal: 18/);
  assert.match(app, /enviesStickyHeader: \{[\s\S]{0,120}paddingBottom: 10/);
  assert.match(app, /<View pointerEvents="none" style=\{styles\.enviesStickyBackdrop\} \/>/);
  assert.match(app, /enviesStickyHeader: \{[\s\S]{0,120}backgroundColor: candy\.red[\s\S]{0,160}elevation: 24[\s\S]{0,220}zIndex: 40/);
  assert.match(app, /enviesStickyBackdrop: \{[\s\S]{0,120}backgroundColor: candy\.red[\s\S]{0,120}bottom: 0/);
  assert.doesNotMatch(app, /styles\.enviesStickyFade/);
  assert.match(app, /desireFilterRow: \{[\s\S]{0,160}marginTop: 22/);
  assert.match(app, /cardStack: \{[\s\S]{0,120}paddingTop: 0/);
  assert.match(app, /desireGalleryMetaRow: \{[\s\S]{0,120}flexDirection: "row"[\s\S]{0,120}flexWrap: "wrap"/);
  assert.match(app, /desireGalleryAnswerPill: \{[\s\S]{0,180}borderRadius: 999/);
  assert.match(app, /desireGalleryAnswerPillHot: \{[\s\S]{0,80}backgroundColor: candy\.yellow/);
  assert.match(app, /prominent \? styles\.voteButtonProminent : styles\.voteButton/);
  assert.match(app, /const desiredSideVoteSize = roomy \? 124 : 106/);
  assert.match(app, /const desiredFeaturedVoteSize = roomy \? 156 : 140/);
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
  assert.match(coupleScreen, /const coupleLayout = homeLayoutMetrics\(viewportHeight, viewportWidth, safeAreaInsets, tabDockHeight\)/);
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
  assert.match(revealNextMatchSql, /set revealed_at = coalesce\(reveals\.revealed_at, now\(\)\)/);
  assert.doesNotMatch(revealNextMatchSql, /coalesce\(revealed_at, now\(\)\)/);
  assert.match(revealNextMatchAmbiguityFixMigration, /set revealed_at = coalesce\(reveals\.revealed_at, now\(\)\)/);
  assert.match(schema, /grant execute on function public\.reveal_next_match\(uuid\) to authenticated;/);
  assert.match(coupleApi, /markRemoteNextMatchRevealed/);
  assert.match(coupleApi, /return \(\(data \?\? \[\]\)\[0\] \?\? null\) as RemoteMatch \| null/);
  assert.match(app, /hiddenMatchCountForCouple/);
  assert.match(app, /revealedMatch = await markRemoteNextMatchRevealed\(couple\.id\)/);
  assert.match(app, /return revealedMatch \? desireCardFromRemoteMatch\(revealedMatch\) : null/);
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
  assert.match(app, /function withChatAttachmentDisappeared\(current: CoupleState \| null, messageId: string, attachmentId: string\)/);
  assert.match(app, /setCouple\(\(current\) => withChatAttachmentDisappeared\(current, messageId, attachmentId\)\)/);
  assert.match(app, /const preservedRemoteMessages = remoteMessages\.map/);
  assert.match(app, /localAttachment\?\.disappeared/);
  assert.match(app, /uri: "",/);
  assert.match(app, /const \[openedPhotoIds, setOpenedPhotoIds\] = useState<Set<string>>/);
  assert.match(app, /const openedPhotoIdsRef = useRef\(openedPhotoIds\)/);
  assert.match(app, /openedPhotoIdsRef\.current\.has\(attachment\.id\)/);
  assert.match(app, /openedPhotoIds=\{openedPhotoIds\}/);
  assert.match(app, /openedPhotoIds\?: ReadonlySet<string>/);
  assert.match(app, /const opened = openedPhotoIds\?\.has\(attachment\.id\) \?\? false/);
  assert.match(app, /if \(attachment\.disappeared \|\| opened\)/);
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
