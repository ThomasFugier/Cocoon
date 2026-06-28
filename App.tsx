import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import type { Session } from "@supabase/supabase-js";
import {
  Apple,
  ArrowLeft,
  Bell,
  BellOff,
  ChevronRight,
  Code2,
  Copy,
  Flame,
  Heart,
  Home,
  ImagePlus,
  LockKeyhole,
  LogOut,
  MessageCircle,
  RefreshCcw,
  Search,
  Send,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
} from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import {
  ProfileAccountPanel,
  SessionStatusPill,
  authAccountInfo,
  type AuthAccountInfo,
} from "./src/components/AuthStatus";
import { DESIRE_CATEGORIES, DESIRE_PACKS, desireCards } from "./src/data/desires";
import { AuthProvider, signInWithProvider, signOut } from "./src/lib/auth";
import {
  createSignedChatAttachmentUrl,
  createRemoteCouple,
  fetchRemoteChatMessages,
  fetchRemoteCoupleMembers,
  fetchMyCoupleState,
  hydrateRemoteShell,
  joinRemoteCouple,
  leaveRemoteCouple,
  markRemoteMatchRevealed,
  saveRemoteCustomDesire,
  saveRemoteMood,
  saveRemoteNotificationPreferences,
  saveRemoteProfileStatus,
  saveRemoteVote,
  sendRemoteNotificationEvent,
  sendRemoteChatMessage,
  subscribeToCoupleRealtime,
  type RemoteChatMessage,
  type RemoteCoupleState,
} from "./src/lib/coupleApi";
import {
  categoryPurchaseConfig,
  featurePurchaseConfig,
  purchaseWithRevenueCat,
  restoreRevenueCatPurchases,
} from "./src/lib/purchases";
import {
  clearDebugBackupState,
  clearCoupleState,
  createInitialCouple,
  createJoinedCouple,
  loadCoupleState,
  loadDebugBackupState,
  loadGuestMode,
  loadIntroSeen,
  saveCoupleState,
  saveDebugBackupState,
  saveGuestMode,
  saveIntroSeen,
} from "./src/lib/localStore";
import {
  enqueueRemoteChatMessage,
  enqueueRemoteVote,
  flushRemoteQueue,
  loadOfflineQueueCount,
} from "./src/lib/offlineQueue";
import {
  configureNotificationChannel,
  requestPushPermissionAndRegister,
  syncPushTokenIfAlreadyGranted,
} from "./src/lib/notifications";
import { hasSupabaseConfig, supabase } from "./src/lib/supabase";
import {
  ChatAttachment,
  ChatMessage,
  CoupleMoodLevel,
  CoupleState,
  CustomDesireCard,
  DesireCard,
  DesireCategory,
  NotificationSettings,
  OnboardingMode,
  PartnerId,
  PartnerProfile,
  UnlockedFeature,
  VoteLevel,
} from "./src/types";
import { PROJECT_VERSION } from "./src/version";

type TabKey = "home" | "envies" | "match" | "couple" | "profil" | "debug" | "chat" | "rules";
type VisibleTabKey = Exclude<TabKey, "rules">;
type DebugPresetId = "empty" | "mood" | "reveal" | "full";
type DesireFilterKey = "todo" | "flame" | "curious" | "matches";
type RemoteRefreshOptions = {
  force?: boolean;
};
type RemoteRefreshState = {
  coupleKey: string | null;
  inFlight: Promise<boolean> | null;
  lastCompletedAt: number;
  lastStartedAt: number;
};
type ChatRefreshState = {
  coupleId: string | null;
  inFlight: Promise<boolean> | null;
  lastStartedAt: number;
};
type HomeNextStepConfig = {
  badge: string;
  cta: string;
  emoji: string;
  onPress: () => void;
  phase: string;
  secondary?: string;
  secondaryPress?: () => void;
  text: string;
  title: string;
};
type DailyAdvice = {
  category: string;
  emoji: string;
  text: string;
  title: string;
};
type NotificationToggleKey =
  | "chatMessageEnabled"
  | "dailyReminderEnabled"
  | "matchRevealEnabled"
  | "moodSignalEnabled"
  | "promotionEnabled";
type PurchaseSuccess =
  | { kind: "category"; category: DesireCategory }
  | { kind: "custom"; category: "Perso" }
  | { kind: "no_ads" }
  | { kind: "unlimited_responses" };
type CustomDesireDraft = {
  blurb: string;
  category: DesireCategory;
  emoji: string;
  title: string;
};
type FakeAdPlacement = "game_break" | "match_reveal";
type FakeAdRequest = {
  cta: string;
  emoji: string;
  placement: FakeAdPlacement;
  sponsor: string;
  text: string;
  title: string;
};

const MATCH_THRESHOLD = 1;
const FLAME_THRESHOLD = 2;
const CUSTOM_CARD_FREE_LIMIT = 3;
const CUSTOM_CARDS_UNLIMITED_PRICE = "2,99 €";
const CUSTOM_CARDS_UNLIMITED_FEATURE: UnlockedFeature = "custom_cards_unlimited";
const NO_ADS_FEATURE: UnlockedFeature = "no_ads";
const NO_ADS_PRICE = "3,99 €";
const DAILY_FREE_RESPONSE_LIMIT = 5;
const UNLIMITED_RESPONSES_FEATURE: UnlockedFeature = "unlimited_responses";
const UNLIMITED_RESPONSES_PRICE = "3,99 €";
const GAME_CARD_SETTLE_MS = 500;
const GAME_CARD_EXIT_MS = 420;
const HEART_BURST_MS = 3000;
const GAME_CARD_TOTAL_TRANSITION_MS = GAME_CARD_SETTLE_MS + GAME_CARD_EXIT_MS;
const AD_REVEAL_COOLDOWN_MS = 30000;
const AD_GAME_COOLDOWN_MS = 90000;
const AD_GAME_MIN_RESPONSES = 6;
const AD_GAME_VOTE_INTERVAL = 8;
const AD_GAME_MATCH_INTERVAL = 3;
const AD_AFTER_VOTE_DELAY_MS = GAME_CARD_SETTLE_MS + HEART_BURST_MS + 260;
const CHAT_REFRESH_COOLDOWN_MS = 300;
const REMOTE_REFRESH_COOLDOWN_MS = 1500;
const SIGNED_CHAT_ATTACHMENT_URL_CACHE_MS = 5 * 60 * 60 * 1000;
const PERSONAL_CATEGORY: DesireCategory = "Perso";
const PACK_CATEGORIES: DesireCategory[] = DESIRE_CATEGORIES.filter((category) => category !== PERSONAL_CATEGORY);
const COUPLE_PACK_CATEGORIES: DesireCategory[] = [...PACK_CATEGORIES, PERSONAL_CATEGORY];
const PAID_PACK_CATEGORIES: DesireCategory[] = PACK_CATEGORIES.filter((category) => category !== "Vanille");
const FREE_CATEGORIES: DesireCategory[] = ["Vanille", PERSONAL_CATEGORY];
const PARTNER_IDS: PartnerId[] = ["me", "partner"];
const CATEGORY_PRICES = Object.fromEntries(
  PAID_PACK_CATEGORIES.map((category) => [category, "4,99 €"]),
) as Partial<Record<DesireCategory, string>>;
const desirePackByCategory = new Map(DESIRE_PACKS.map((pack) => [pack.category as DesireCategory, pack]));
const desireCardCountsByCategory = desireCards.reduce((counts, card) => {
  counts.set(card.category, (counts.get(card.category) ?? 0) + 1);
  return counts;
}, new Map<DesireCategory, number>());
const useNativeAnimations = Platform.OS !== "web";
const localModeEnabled = process.env.NODE_ENV !== "production" || process.env.EXPO_PUBLIC_ENABLE_LOCAL_MODE === "true";

function desireCardCount(category: DesireCategory) {
  return desireCardCountsByCategory.get(category) ?? 0;
}

function errorMessage(error: unknown, fallback = "erreur inconnue") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const messageParts = ["message", "details", "hint", "code"]
      .map((key) => record[key])
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0);

    if (messageParts.length) {
      return messageParts.join(" ");
    }
  }

  return fallback;
}

function userFacingSyncNotice(message: string) {
  if (!message) {
    return "";
  }

  if (/achat/i.test(message)) {
    return "Achat impossible pour le moment. Réessaie dans un instant.";
  }

  if (/connecte-toi|connexion/i.test(message)) {
    return message;
  }

  return "Connexion instable. Tes changements sont gardés automatiquement.";
}

type BurstParticle = { emoji: string; floatX: number; rotate: string; size: number; x: number; y: number };
const responseBurstParticles: Partial<Record<VoteLevel, BurstParticle[]>> = {
  0: [
    { emoji: "🙅‍♀️", floatX: -18, x: -166, y: -370, rotate: "-16deg", size: 54 },
    { emoji: "🙅", floatX: 22, x: 118, y: -430, rotate: "13deg", size: 50 },
    { emoji: "👎", floatX: -18, x: -74, y: -470, rotate: "-12deg", size: 48 },
    { emoji: "🚫", floatX: 18, x: 48, y: -520, rotate: "16deg", size: 52 },
    { emoji: "🙅‍♂️", floatX: 20, x: 178, y: -320, rotate: "18deg", size: 48 },
    { emoji: "✋", floatX: -22, x: -198, y: -258, rotate: "-20deg", size: 44 },
    { emoji: "👎", floatX: 12, x: 132, y: -190, rotate: "10deg", size: 42 },
    { emoji: "🚫", floatX: -14, x: -20, y: -300, rotate: "-8deg", size: 40 },
  ],
  1: [
    { emoji: "😏", floatX: -24, x: -168, y: -390, rotate: "-18deg", size: 54 },
    { emoji: "💕", floatX: 22, x: -112, y: -470, rotate: "12deg", size: 44 },
    { emoji: "👀", floatX: -16, x: -42, y: -430, rotate: "-8deg", size: 52 },
    { emoji: "💗", floatX: 18, x: 34, y: -510, rotate: "16deg", size: 48 },
    { emoji: "😉", floatX: -18, x: 118, y: -410, rotate: "-14deg", size: 50 },
    { emoji: "💞", floatX: 24, x: 186, y: -345, rotate: "18deg", size: 50 },
    { emoji: "😏", floatX: 16, x: -202, y: -250, rotate: "20deg", size: 42 },
    { emoji: "💕", floatX: -22, x: 206, y: -230, rotate: "-22deg", size: 42 },
    { emoji: "✨", floatX: -14, x: -132, y: -172, rotate: "-12deg", size: 44 },
    { emoji: "👀", floatX: 14, x: 142, y: -160, rotate: "10deg", size: 44 },
  ],
  2: [
    { emoji: "🔥", floatX: -24, x: -168, y: -390, rotate: "-18deg", size: 58 },
    { emoji: "💖", floatX: 22, x: -112, y: -470, rotate: "12deg", size: 56 },
    { emoji: "❤️‍🔥", floatX: -16, x: -42, y: -430, rotate: "-8deg", size: 62 },
    { emoji: "💘", floatX: 18, x: 34, y: -510, rotate: "16deg", size: 54 },
    { emoji: "🔥", floatX: -18, x: 118, y: -410, rotate: "-14deg", size: 56 },
    { emoji: "💞", floatX: 24, x: 186, y: -345, rotate: "18deg", size: 52 },
    { emoji: "💋", floatX: 16, x: -202, y: -250, rotate: "20deg", size: 48 },
    { emoji: "❤️‍🔥", floatX: -22, x: 206, y: -230, rotate: "-22deg", size: 50 },
    { emoji: "🔥", floatX: -14, x: -132, y: -172, rotate: "-12deg", size: 48 },
    { emoji: "💖", floatX: 14, x: 142, y: -160, rotate: "10deg", size: 48 },
    { emoji: "💓", floatX: -20, x: -6, y: -560, rotate: "6deg", size: 48 },
    { emoji: "💝", floatX: 20, x: 82, y: -442, rotate: "-16deg", size: 46 },
  ],
};
const displayFont = Platform.select({
  ios: "Avenir Next",
  android: "sans-serif",
  default: "Arial Rounded MT Bold, Arial, sans-serif",
});
const emojiFont = Platform.select({
  ios: "Apple Color Emoji",
  android: "sans-serif",
  default: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
});
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const weSpiceLogoAsset = require("./ASO/WeSpice_Logo.png");

const stickers = {
  cherries: "🍒",
  flame: "🔥",
  heart: "💖",
  lock: "🔐",
  speech: "💬",
  sparkles: "✨",
  blackHeart: "🖤",
  wand: "🪄",
};

const statusEmojiPresets = ["🍒", "🔥", "💋", "🍆", "👀", "😇", "🫦", "🖤", "🫧", "✨"];
const customDesireEmojiPresets = ["🍑", "🍆", "💖", "🔥", "💋", "👀", "🫦", "✨", "🖤", "🌶️", "🍒", "🔐"];

const candy = {
  ink: "#231224",
  text: "#3B1737",
  muted: "#7C4B69",
  pink: "#FF8BC8",
  pinkHot: "#FF1E70",
  pinkSoft: "#FFE1F1",
  rose: "#FF0F64",
  roseDeep: "#7A123C",
  roseMist: "#FFF2F8",
  roseSoft: "#FFD4E8",
  roseWarm: "#FF6EA8",
  red: "#FF245F",
  yellow: "#FFE16F",
  yellowSoft: "#FFF4B8",
  blue: "#72D3FF",
  blueDeep: "#1378D8",
  violet: "#BA6EFF",
  violetSoft: "#EFC8FF",
  cream: "#FFF9F2",
  white: "#FFFFFF",
  mint: "#9DFFD7",
  green: "#0DA66C",
  black: "#20101F",
  shadow: "rgba(118, 22, 78, 0.18)",
};

const moodOptions: Array<{ emoji: string; hint: string; label: string; level: CoupleMoodLevel }> = [
  { level: 0, emoji: "🫧", label: "Calme", hint: "Besoin de douceur" },
  { level: 1, emoji: "🍬", label: "Tendre", hint: "Envie de flirt" },
  { level: 2, emoji: "🔥", label: "Chaud", hint: "Envie plus directe" },
  { level: 3, emoji: "💋", label: "Très chaud", hint: "Envie assumée" },
];

const desireFilterOptions: Array<{ key: DesireFilterKey; label: string }> = [
  { key: "todo", label: "À répondre" },
  { key: "flame", label: "Flamme" },
  { key: "curious", label: "Pourquoi pas" },
  { key: "matches", label: "Matchs" },
];

const dailyAdviceItems: DailyAdvice[] = [
  {
    category: "Communication",
    emoji: "💬",
    title: "Parler avant de toucher",
    text: "Une intimité plus fluide commence souvent par des mots simples : ce que j'aime, ce que j'aimerais essayer, ce que je préfère éviter.",
  },
  {
    category: "Consentement",
    emoji: "🤝",
    title: "Chercher un vrai oui",
    text: "Un oui enthousiaste vaut mieux qu'un silence interprété trop vite. La confiance grandit quand chacun peut aussi dire non.",
  },
  {
    category: "Désir",
    emoji: "🫧",
    title: "Accepter les variations",
    text: "Le désir bouge avec la fatigue, le stress, l'âge, la santé ou les émotions. Une baisse ne dit pas forcément quelque chose de l'amour.",
  },
  {
    category: "Jeu",
    emoji: "🎲",
    title: "Sortir de la performance",
    text: "Une sexualité satisfaisante n'est pas un examen. Le plaisir partagé compte plus qu'un scénario parfaitement réussi.",
  },
  {
    category: "Tendresse",
    emoji: "🫶",
    title: "Valoriser les préliminaires émotionnels",
    text: "Une attention, une écoute ou un geste tendre dans la journée peut préparer le désir bien avant le moment intime.",
  },
  {
    category: "Limites",
    emoji: "🔐",
    title: "Nommer ses limites",
    text: "Dire ce qu'on ne souhaite pas faire est aussi important que dire ce qu'on aime. Les limites protègent la relation.",
  },
  {
    category: "Rythme",
    emoji: "🐢",
    title: "Ralentir",
    text: "Beaucoup de couples gagnent en plaisir en ralentissant. L'attention portée aux sensations peut compter plus que l'intensité.",
  },
  {
    category: "Routine",
    emoji: "✨",
    title: "Ne pas confondre routine et échec",
    text: "La routine peut devenir une base rassurante. Une petite variation suffit parfois à remettre du jeu sans pression.",
  },
  {
    category: "Feedback",
    emoji: "💌",
    title: "Dire ce qui fait du bien",
    text: "Les indications positives sont souvent mieux reçues que les corrections. Dire j'aime quand tu fais ça guide sans blesser.",
  },
  {
    category: "Après",
    emoji: "🌙",
    title: "Soigner l'après",
    text: "Parler, rire, se câliner ou rester proches après un moment intime renforce la sécurité affective.",
  },
  {
    category: "Curiosité",
    emoji: "🪄",
    title: "Privilégier la curiosité",
    text: "Au lieu de juger une envie, demander ce que cela représente pour l'autre apaise souvent la gêne et ouvre la discussion.",
  },
  {
    category: "Présence",
    emoji: "📵",
    title: "Mettre les écrans à distance",
    text: "Un moment sans téléphone peut suffire à recréer de la disponibilité émotionnelle et du rapprochement.",
  },
  {
    category: "Sécurité",
    emoji: "🧯",
    title: "Avoir un mot de pause",
    text: "Même dans une sexualité simple, prévoir un mot ou un signe pour ralentir sécurise les deux partenaires.",
  },
  {
    category: "Pudeur",
    emoji: "🕯️",
    title: "Respecter le rythme de l'autre",
    text: "Tout le monde n'est pas à l'aise avec une parole sexuelle directe. On peut avancer progressivement, avec des mots simples.",
  },
  {
    category: "Lien",
    emoji: "💖",
    title: "Cultiver l'admiration",
    text: "Se sentir désiré passe aussi par le fait de se sentir apprécié comme personne. Les compliments sincères nourrissent l'intimité.",
  },
  {
    category: "Fantasmes",
    emoji: "🌶️",
    title: "Distinguer fantasme et projet",
    text: "Partager un fantasme ne veut pas forcément dire vouloir le réaliser. Le passage à l'acte demande accord clair et limites.",
  },
  {
    category: "Douleur",
    emoji: "🩹",
    title: "Prendre la douleur au sérieux",
    text: "Une douleur pendant les rapports n'est pas à banaliser. Elle mérite écoute, adaptation et parfois aide professionnelle.",
  },
  {
    category: "Équipe",
    emoji: "🤍",
    title: "Faire équipe face aux difficultés",
    text: "Le problème n'est pas toi ou moi, mais quelque chose que le couple peut comprendre ensemble. Cette posture réduit la honte.",
  },
];

function isFlameVote(level?: VoteLevel) {
  return typeof level === "number" && level >= FLAME_THRESHOLD;
}

function isPositiveMatchVote(level?: VoteLevel) {
  return typeof level === "number" && level >= MATCH_THRESHOLD;
}

function isCardMatch(couple: CoupleState, cardId: string) {
  return isPositiveMatchVote(couple.votes.me[cardId]) && isPositiveMatchVote(couple.votes.partner[cardId]);
}

function allDesireCards(couple: CoupleState) {
  return [...(couple.customDesires ?? []), ...desireCards];
}

function unlockedCategories(couple: CoupleState) {
  return Array.from(new Set([...FREE_CATEGORIES, ...(couple.unlockedCategories ?? [])]));
}

function isCategoryUnlocked(couple: CoupleState, category: DesireCategory) {
  return unlockedCategories(couple).includes(category);
}

function unlockedFeatures(couple: CoupleState) {
  return couple.unlockedFeatures ?? [];
}

function isFeatureUnlocked(couple: CoupleState, feature: UnlockedFeature) {
  return unlockedFeatures(couple).includes(feature);
}

function isRemoteCoupleId(coupleId: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(coupleId);
}

function dailyDateKey(date = new Date()) {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function dailyAdviceForCouple(couple: CoupleState) {
  const seed = `${dailyDateKey()}-${couple.id}`;
  return dailyAdviceItems[hashText(seed) % dailyAdviceItems.length] ?? dailyAdviceItems[0];
}

function hasCustomCardsUnlimited(couple: CoupleState) {
  return isFeatureUnlocked(couple, CUSTOM_CARDS_UNLIMITED_FEATURE);
}

function hasNoAds(couple: CoupleState) {
  return isFeatureUnlocked(couple, NO_ADS_FEATURE);
}

function hasUnlimitedResponses(couple: CoupleState) {
  return isFeatureUnlocked(couple, UNLIMITED_RESPONSES_FEATURE);
}

function fakeAdCopy(placement: FakeAdPlacement): FakeAdRequest {
  if (placement === "match_reveal") {
    return {
      cta: "Révéler le match",
      emoji: "🔥",
      placement,
      sponsor: "Sponsor prototype",
      text: "Un petit interlude avant la révélation. Dans la vraie app, cet emplacement pourra accueillir une pub interstitielle native.",
      title: "La tension monte...",
    };
  }

  return {
    cta: "Continuer à jouer",
    emoji: "💘",
    placement,
    sponsor: "Pause sponsorisée",
    text: "Une respiration courte entre deux cartes. Le pack No Ads retire ce type d'écran.",
    title: "Mini pause WeSpice",
  };
}

function customDesireCount(couple: CoupleState) {
  return couple.customDesires?.length ?? 0;
}

function customDesireSlotsLeft(couple: CoupleState) {
  return Math.max(0, CUSTOM_CARD_FREE_LIMIT - customDesireCount(couple));
}

function availableDesireCards(couple: CoupleState) {
  return allDesireCards(couple).filter((card) => isCategoryUnlocked(couple, card.category));
}

function matchedCards(couple: CoupleState) {
  return availableDesireCards(couple).filter((card) => isCardMatch(couple, card.id));
}

function hasLinkedPartner(couple: CoupleState) {
  const partner = couple.profiles.partner;
  return !(partner.displayName === "Partenaire" && partner.vibe === "Invitation en attente");
}

function activeResponseCount(couple: CoupleState) {
  return Object.keys(couple.votes[couple.activePartnerId] ?? {}).length;
}

function dailyResponseCount(couple: CoupleState, partnerId: PartnerId, dateKey = dailyDateKey()) {
  const usage = couple.dailyResponses?.[partnerId];
  return usage?.dateKey === dateKey ? usage.count : 0;
}

function dailyResponsesLeft(couple: CoupleState, partnerId: PartnerId) {
  if (hasUnlimitedResponses(couple)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, DAILY_FREE_RESPONSE_LIMIT - dailyResponseCount(couple, partnerId));
}

function canAnswerNewCardToday(couple: CoupleState, partnerId: PartnerId) {
  return hasUnlimitedResponses(couple) || dailyResponsesLeft(couple, partnerId) > 0;
}

function withDailyResponseIncrement(couple: CoupleState, partnerId: PartnerId, dateKey = dailyDateKey()): CoupleState {
  const currentCount = dailyResponseCount(couple, partnerId, dateKey);

  return {
    ...couple,
    dailyResponses: {
      ...couple.dailyResponses,
      [partnerId]: {
        count: currentCount + 1,
        dateKey,
      },
    },
  };
}

function otherPartnerId(partnerId: PartnerId): PartnerId {
  return partnerId === "me" ? "partner" : "me";
}

function moodLevel(couple: CoupleState, partnerId: PartnerId) {
  return couple.mood?.[partnerId] ?? 0;
}

function isMoodAligned(couple: CoupleState) {
  const me = moodLevel(couple, "me");
  const partner = moodLevel(couple, "partner");
  const sameNonFlatMood = me > 0 && me === partner;
  const bothAboveHalf = me >= 2 && partner >= 2;

  return sameNonFlatMood || bothAboveHalf;
}

function partnerFlags(value = false): Record<PartnerId, boolean> {
  return {
    me: value,
    partner: value,
  };
}

function createNotificationSettings(overrides?: Partial<NotificationSettings>): NotificationSettings {
  return {
    chatMessageEnabled: {
      ...partnerFlags(false),
      ...(overrides?.chatMessageEnabled ?? {}),
    },
    dailyReminderEnabled: {
      ...partnerFlags(false),
      ...(overrides?.dailyReminderEnabled ?? {}),
    },
    matchRevealEnabled: {
      ...partnerFlags(false),
      ...(overrides?.matchRevealEnabled ?? {}),
    },
    moodSignalEnabled: {
      ...partnerFlags(false),
      ...(overrides?.moodSignalEnabled ?? {}),
    },
    moodSignalPromptSeen: {
      ...partnerFlags(false),
      ...(overrides?.moodSignalPromptSeen ?? {}),
    },
    promotionEnabled: {
      ...partnerFlags(false),
      ...(overrides?.promotionEnabled ?? {}),
    },
  };
}

function notificationSettings(couple: CoupleState) {
  return createNotificationSettings(couple.notificationSettings);
}

function isMoodNotificationEnabled(couple: CoupleState, partnerId: PartnerId) {
  return isNotificationPreferenceEnabled(couple, partnerId, "moodSignalEnabled");
}

function isNotificationPreferenceEnabled(couple: CoupleState, partnerId: PartnerId, key: NotificationToggleKey) {
  return notificationSettings(couple)[key][partnerId];
}

function hasSeenMoodNotificationPrompt(couple: CoupleState, partnerId: PartnerId) {
  return notificationSettings(couple).moodSignalPromptSeen[partnerId];
}

function setNotificationPreference(
  couple: CoupleState,
  partnerId: PartnerId,
  key: NotificationToggleKey,
  enabled: boolean,
): CoupleState {
  const currentSettings = notificationSettings(couple);

  return {
    ...couple,
    notificationSettings: {
      ...currentSettings,
      [key]: {
        ...currentSettings[key],
        [partnerId]: enabled,
      },
      moodSignalPromptSeen: {
        ...currentSettings.moodSignalPromptSeen,
        [partnerId]: key === "moodSignalEnabled" ? true : currentSettings.moodSignalPromptSeen[partnerId],
      },
    },
  };
}

function setMoodNotificationPreference(couple: CoupleState, partnerId: PartnerId, enabled: boolean): CoupleState {
  const nextCouple = setNotificationPreference(couple, partnerId, "moodSignalEnabled", enabled);
  const currentSettings = notificationSettings(nextCouple);

  return {
    ...nextCouple,
    notificationSettings: {
      ...currentSettings,
      moodSignalEnabled: {
        ...currentSettings.moodSignalEnabled,
        [partnerId]: enabled,
      },
      moodSignalPromptSeen: {
        ...currentSettings.moodSignalPromptSeen,
        [partnerId]: true,
      },
    },
  };
}

function nextSixAM(date = new Date()) {
  const next = new Date(date);
  next.setHours(6, 0, 0, 0);

  if (next <= date) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function chatExpiryLabel(now = new Date()) {
  const expiry = nextSixAM(now);
  return expiry.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function purgeExpiredChat(couple: CoupleState, now = new Date()): CoupleState {
  const messages = couple.chat?.messages ?? [];
  const nextMessages = messages.filter((message) => new Date(message.expiresAt) > now);

  if (nextMessages.length === messages.length && couple.chat) {
    return couple;
  }

  return {
    ...couple,
    chat: {
      messages: nextMessages,
      lastPurgedAt: now.toISOString(),
    },
  };
}

function createChatMessage({
  attachments,
  authorId,
  body,
  id,
  linkedCardId,
}: {
  attachments: ChatAttachment[];
  authorId: PartnerId;
  body: string;
  id?: string;
  linkedCardId?: string;
}): ChatMessage {
  const now = new Date();

  return {
    id: id ?? `chat-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    authorId,
    body,
    createdAt: now.toISOString(),
    expiresAt: nextSixAM(now).toISOString(),
    attachments,
    linkedCardId,
  };
}

function createCustomDesire({
  blurb,
  category,
  createdBy,
  emoji,
  title,
}: {
  blurb: string;
  category: DesireCategory;
  createdBy: PartnerId;
  emoji: string;
  title: string;
}): CustomDesireCard {
  const now = new Date();

  return {
    id: `custom-${now.getTime().toString(36)}-${Math.random().toString(16).slice(2, 6)}`,
    title: title.trim(),
    emoji: normalizeEmoji(emoji, stickers.heart),
    category,
    kind: "practice",
    mood: "sensuel",
    blurb: blurb.trim(),
    custom: true,
    createdAt: now.toISOString(),
    createdBy,
  };
}

function createDebugCouple(preset: DebugPresetId): CoupleState {
  const base: CoupleState = {
    id: `debug-${preset}-${Date.now()}`,
    inviteCode: "DEV420",
    createdAt: new Date().toISOString(),
    activePartnerId: "me",
    profiles: {
      me: {
        id: "me",
        displayName: "Alex",
        color: "rose",
        statusEmoji: "🍒",
        statusUpdatedAt: new Date().toISOString(),
        vibe: "Curieux, joueur, attentif.",
      },
      partner: {
        id: "partner",
        displayName: "Sam",
        color: "mint",
        statusEmoji: "👀",
        statusUpdatedAt: new Date().toISOString(),
        vibe: "Profil de test pour QA.",
      },
    },
    votes: {
      me: {},
      partner: {},
    },
    dailyResponses: {
      me: { count: 0, dateKey: "" },
      partner: { count: 0, dateKey: "" },
    },
    customDesires: [],
    unlockedCategories: FREE_CATEGORIES,
    unlockedFeatures: [],
    mood: {
      me: 0,
      partner: 0,
    },
    notificationSettings: createNotificationSettings(),
    chat: {
      messages: [],
    },
  };

  if (preset === "mood") {
    return {
      ...base,
      mood: { me: 2, partner: 2 },
    };
  }

  if (preset === "reveal") {
    return {
      ...base,
      votes: {
        me: { "vanille-01": 2, "vanille-02": 2 },
        partner: { "vanille-01": 2 },
      },
      mood: { me: 1, partner: 2 },
    };
  }

  if (preset === "full") {
    return {
      ...base,
      inviteCode: "FULL69",
      unlockedCategories: [...PACK_CATEGORIES, PERSONAL_CATEGORY],
      unlockedFeatures: [CUSTOM_CARDS_UNLIMITED_FEATURE],
      votes: {
        me: { "vanille-01": 2, "vanille-02": 2, "hard-01": 2, "bdsm-01": 1 },
        partner: { "vanille-01": 2, "hard-01": 2, "bdsm-01": 2 },
      },
      mood: { me: 3, partner: 2 },
    };
  }

  return base;
}

function isDebugCouple(couple: CoupleState) {
  return couple.id.startsWith("debug-");
}

function fallbackProfileFromSession(session: Session | null): Omit<PartnerProfile, "id"> {
  const metadataName = session?.user.user_metadata?.full_name;
  const emailName = session?.user.email?.split("@")[0];
  const displayName = typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : emailName
      ? emailName
      : "Moi";

  return {
    color: "rose",
    displayName,
    statusEmoji: stickers.heart,
    statusUpdatedAt: new Date().toISOString(),
    vibe: session ? "Mon vrai compte" : "Mode local",
  };
}

function normalizeEmoji(value: string, fallback = stickers.heart) {
  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  return Array.from(trimmed).slice(0, 4).join("");
}

function normalizeStatusEmoji(value: string) {
  return normalizeEmoji(value, stickers.heart);
}

function randomCustomDesireEmoji() {
  return customDesireEmojiPresets[Math.floor(Math.random() * customDesireEmojiPresets.length)] ?? stickers.heart;
}

function profileEmoji(profile: PartnerProfile) {
  const first = normalizeStatusEmoji(profile.statusEmoji || profile.vibe);

  if (!first || /[a-z0-9]/i.test(first)) {
    return stickers.heart;
  }

  return first;
}

function profilePayload(profile: PartnerProfile): Omit<PartnerProfile, "id"> {
  return {
    color: profile.color,
    displayName: profile.displayName,
    statusEmoji: profileEmoji(profile),
    statusUpdatedAt: profile.statusUpdatedAt ?? new Date().toISOString(),
    vibe: profile.vibe,
  };
}

function withUpdatedProfileStatus(couple: CoupleState, partnerId: PartnerId, statusEmoji: string): CoupleState {
  return {
    ...couple,
    profiles: {
      ...couple.profiles,
      [partnerId]: {
        ...couple.profiles[partnerId],
        statusEmoji,
        statusUpdatedAt: new Date().toISOString(),
      },
    },
  };
}

function profileFromRemoteMember(
  row: Awaited<ReturnType<typeof fetchRemoteCoupleMembers>>[number],
  partnerId: PartnerId,
): PartnerProfile {
  return {
    id: partnerId,
    color: row.color || "rose",
    displayName: row.display_name || (partnerId === "me" ? "Moi" : "Partenaire"),
    statusEmoji: normalizeStatusEmoji(row.status_emoji || stickers.heart),
    statusUpdatedAt: row.status_updated_at ?? undefined,
    vibe: row.vibe || "",
  };
}

function withRemoteCoupleMembers(
  couple: CoupleState,
  rows: Awaited<ReturnType<typeof fetchRemoteCoupleMembers>>,
): CoupleState {
  const currentRow = rows.find((row) => row.is_current_user);
  const otherRow = rows.find((row) => !row.is_current_user);
  const activeId = couple.activePartnerId;
  const inactiveId = otherPartnerId(activeId);

  return {
    ...couple,
    profiles: {
      ...couple.profiles,
      ...(currentRow ? { [activeId]: profileFromRemoteMember(currentRow, activeId) } : {}),
      ...(otherRow ? { [inactiveId]: profileFromRemoteMember(otherRow, inactiveId) } : {}),
    },
  };
}

function isKnownCategory(value: string): value is DesireCategory {
  return DESIRE_CATEGORIES.includes(value as DesireCategory);
}

function isKnownFeature(value: string): value is UnlockedFeature {
  return [CUSTOM_CARDS_UNLIMITED_FEATURE, NO_ADS_FEATURE, UNLIMITED_RESPONSES_FEATURE].includes(value as UnlockedFeature);
}

function notificationSettingsFromRemote(
  remote: RemoteCoupleState["notification_preferences"],
  fallback?: NotificationSettings,
) {
  const base = createNotificationSettings(fallback);

  if (!remote) {
    return base;
  }

  return {
    ...base,
    chatMessageEnabled: {
      ...base.chatMessageEnabled,
      me: Boolean(remote.chat_message_enabled),
    },
    dailyReminderEnabled: {
      ...base.dailyReminderEnabled,
      me: Boolean(remote.daily_reminder_enabled),
    },
    matchRevealEnabled: {
      ...base.matchRevealEnabled,
      me: Boolean(remote.match_reveal_enabled),
    },
    moodSignalEnabled: {
      ...base.moodSignalEnabled,
      me: Boolean(remote.mood_signal_enabled),
    },
    moodSignalPromptSeen: {
      ...base.moodSignalPromptSeen,
      me: Boolean(remote.mood_signal_prompt_seen),
    },
    promotionEnabled: {
      ...base.promotionEnabled,
      me: Boolean(remote.promotion_enabled),
    },
  };
}

function moodLevelFromRemote(
  remote: RemoteCoupleState,
  member: RemoteCoupleState["members"][number] | undefined,
  fallback: CoupleMoodLevel,
): CoupleMoodLevel {
  const remoteMood = remote.moods?.find((mood) => mood.user_id === member?.user_id);
  const level = remoteMood?.level;

  return level === 0 || level === 1 || level === 2 || level === 3 ? level : fallback;
}

const signedChatAttachmentUrlCache = new Map<string, { expiresAt: number; url: string }>();

async function getSignedChatAttachmentUrl(storagePath: string) {
  const cached = signedChatAttachmentUrlCache.get(storagePath);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.url;
  }

  const url = await createSignedChatAttachmentUrl(storagePath);
  signedChatAttachmentUrlCache.set(storagePath, {
    expiresAt: now + SIGNED_CHAT_ATTACHMENT_URL_CACHE_MS,
    url,
  });

  return url;
}

async function chatMessagesFromRemote(remoteMessages: RemoteChatMessage[]): Promise<ChatMessage[]> {
  return Promise.all((remoteMessages ?? []).map(async (message) => {
    const attachments = await Promise.all((message.attachments ?? []).map(async (attachment) => {
      let signedUrl = "";

      try {
        signedUrl = await getSignedChatAttachmentUrl(attachment.storage_path);
      } catch {
        signedChatAttachmentUrlCache.delete(attachment.storage_path);
        signedUrl = "";
      }

      return {
        id: attachment.id,
        height: attachment.height ?? undefined,
        mimeType: attachment.mime_type,
        name: attachment.name ?? "Photo",
        sizeBytes: attachment.size_bytes ?? undefined,
        storagePath: attachment.storage_path,
        type: "image" as const,
        uri: signedUrl,
        width: attachment.width ?? undefined,
      };
    }));

    return {
      id: message.id,
      attachments,
      authorId: message.author_is_current_user ? "me" as const : "partner" as const,
      body: message.body,
      createdAt: message.created_at,
      expiresAt: message.expires_at,
      linkedCardId: message.linked_card_id ?? undefined,
    };
  }));
}

function areChatAttachmentsEqual(left: ChatAttachment[], right: ChatAttachment[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((attachment, index) => {
    const other = right[index];

    return Boolean(other)
      && attachment.id === other.id
      && attachment.storagePath === other.storagePath
      && attachment.uri === other.uri
      && attachment.name === other.name
      && attachment.mimeType === other.mimeType
      && attachment.width === other.width
      && attachment.height === other.height
      && attachment.sizeBytes === other.sizeBytes;
  });
}

function areChatMessagesEqual(left: ChatMessage[], right: ChatMessage[]) {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((message, index) => {
    const other = right[index];

    return Boolean(other)
      && message.id === other.id
      && message.authorId === other.authorId
      && message.body === other.body
      && message.createdAt === other.createdAt
      && message.expiresAt === other.expiresAt
      && message.linkedCardId === other.linkedCardId
      && areChatAttachmentsEqual(message.attachments, other.attachments);
  });
}

async function coupleFromRemoteState(remote: RemoteCoupleState, fallback?: CoupleState | null): Promise<CoupleState> {
  const currentMember = remote.members.find((member) => member.is_current_user);
  const partnerMember = remote.members.find((member) => !member.is_current_user);
  const now = new Date().toISOString();
  const ownVotes = { ...(remote.own_votes ?? {}) } as Record<string, VoteLevel>;
  const partnerVotes: Record<string, VoteLevel> = {};

  (remote.matches ?? []).forEach((match) => {
    if (typeof match.my_level === "number") {
      ownVotes[match.card_id] = match.my_level;
    }
    if (typeof match.partner_level === "number") {
      partnerVotes[match.card_id] = match.partner_level;
    }
  });

  const chatMessages = await chatMessagesFromRemote(remote.chat_messages ?? []);

  return {
    id: remote.couple.id,
    inviteCode: remote.couple.invite_code,
    createdAt: remote.couple.created_at,
    activePartnerId: "me",
    profiles: {
      me: currentMember ? profileFromRemoteMember(currentMember, "me") : fallback?.profiles.me ?? {
        id: "me",
        color: "rose",
        displayName: "Moi",
        statusEmoji: stickers.heart,
        statusUpdatedAt: now,
        vibe: "Connecté",
      },
      partner: partnerMember ? profileFromRemoteMember(partnerMember, "partner") : {
        id: "partner",
        color: "mint",
        displayName: "Partenaire",
        statusEmoji: "💌",
        statusUpdatedAt: now,
        vibe: "Invitation en attente",
      },
    },
    votes: {
      me: ownVotes,
      partner: partnerVotes,
    },
    dailyResponses: {
      me: {
        count: remote.daily_response_usage?.count ?? 0,
        dateKey: remote.daily_response_usage?.date_key ?? dailyDateKey(),
      },
      partner: fallback?.dailyResponses.partner ?? {
        count: 0,
        dateKey: dailyDateKey(),
      },
    },
    customDesires: (remote.custom_desires ?? []).filter((desire) => isKnownCategory(desire.category)).map((desire) => ({
      id: desire.id,
      blurb: desire.blurb,
      category: desire.category,
      createdAt: desire.created_at,
      createdBy: desire.created_by_current_user ? "me" : "partner",
      custom: true,
      emoji: desire.emoji ?? stickers.heart,
      kind: desire.kind,
      mood: desire.mood,
      title: desire.title,
    })),
    unlockedCategories: Array.from(new Set([
      "Vanille" as DesireCategory,
      PERSONAL_CATEGORY,
      ...(remote.category_unlocks ?? []).filter(isKnownCategory),
    ])),
    unlockedFeatures: Array.from(new Set((remote.feature_unlocks ?? []).filter(isKnownFeature))),
    mood: {
      me: moodLevelFromRemote(remote, currentMember, fallback?.mood.me ?? 0),
      partner: moodLevelFromRemote(remote, partnerMember, fallback?.mood.partner ?? 0),
    },
    notificationSettings: notificationSettingsFromRemote(remote.notification_preferences, fallback?.notificationSettings),
    chat: {
      messages: chatMessages,
      lastPurgedAt: fallback?.chat?.lastPurgedAt,
    },
  };
}

async function mirrorSoloStateToRemote(couple: CoupleState, remoteCoupleId: string) {
  const activeId = couple.activePartnerId;
  const customDesires = (couple.customDesires ?? []).filter((desire) => desire.createdBy === activeId);
  const ownVotes = Object.entries(couple.votes[activeId] ?? {}) as Array<[string, VoteLevel]>;
  const tasks: Array<Promise<unknown>> = [
    ...ownVotes.map(([cardId, level]) => saveRemoteVote(remoteCoupleId, cardId, level)),
    ...customDesires.map((desire) => saveRemoteCustomDesire({
      blurb: desire.blurb,
      cardId: desire.id,
      category: desire.category,
      coupleId: remoteCoupleId,
      emoji: desire.emoji ?? stickers.heart,
      title: desire.title,
    })),
    saveRemoteMood(remoteCoupleId, moodLevel(couple, activeId)),
    saveRemoteNotificationPreferences(remoteCoupleId, notificationSettings(couple), activeId),
  ];

  await Promise.allSettled(tasks);
}

function voteRevealLabel(level?: VoteLevel) {
  if (level === 0) {
    return "Non";
  }

  if (level === 1) {
    return "Pourquoi pas";
  }

  if (typeof level === "number" && level >= FLAME_THRESHOLD) {
    return "Flamme";
  }

  return "Pas répondu";
}

function voteRevealEmoji(level?: VoteLevel) {
  if (level === 0) {
    return "✕";
  }

  if (level === 1) {
    return "👀";
  }

  if (typeof level === "number" && level >= FLAME_THRESHOLD) {
    return "🔥";
  }

  return "…";
}

function cardResponseStatusLabel(level?: VoteLevel) {
  return typeof level === "undefined" ? "Non répondu" : voteRevealLabel(level);
}

type CategoryCardTone = {
  accent: string;
  bodyText: string;
  chipBg: string;
  colors: readonly [string, string, string];
  glow: string;
  patternEmoji: string;
  sticker: string;
  tagBg: string;
  tagText: string;
  titleText: string;
};

const categoryVisuals: Partial<Record<DesireCategory, CategoryCardTone>> = {
  Vanille: {
    accent: "#D98F1F",
    bodyText: "#5A3412",
    chipBg: "#FFF1B8",
    colors: ["#FFF8D7", "#FFE7A0", "#FFD36B"],
    glow: "rgba(255,196,64,0.34)",
    patternEmoji: "🍦",
    sticker: "🍦",
    tagBg: "rgba(255,255,255,0.62)",
    tagText: "#B96E00",
    titleText: "#B96E00",
  },
  Sensuel: {
    accent: "#FF4FA0",
    bodyText: "#5C1942",
    chipBg: "#FFD6EA",
    colors: ["#FFF0F7", "#FFB6D9", "#FF7DBB"],
    glow: "rgba(255,79,160,0.36)",
    patternEmoji: "🫧",
    sticker: "🧴",
    tagBg: "rgba(255,255,255,0.62)",
    tagText: "#D51C78",
    titleText: "#D51C78",
  },
  Séduction: {
    accent: candy.red,
    bodyText: "#5A123C",
    chipBg: "#FFD5E7",
    colors: ["#FFE3F0", "#FF7CAD", "#FF245F"],
    glow: "rgba(255,36,95,0.38)",
    patternEmoji: "💋",
    sticker: "😏",
    tagBg: "rgba(255,255,255,0.64)",
    tagText: candy.red,
    titleText: candy.red,
  },
  Hot: {
    accent: "#FF3B33",
    bodyText: "#4A1114",
    chipBg: "#FFD8D2",
    colors: ["#FFE1D8", "#FF7A63", "#F3314C"],
    glow: "rgba(255,59,51,0.38)",
    patternEmoji: "🌶️",
    sticker: "🌶️",
    tagBg: "rgba(255,255,255,0.66)",
    tagText: "#D32721",
    titleText: "#D32721",
  },
  "Jeux & Défis": {
    accent: "#1E93FF",
    bodyText: "#123956",
    chipBg: "#D7F0FF",
    colors: ["#E8F7FF", "#8BD5FF", "#4AA9FF"],
    glow: "rgba(30,147,255,0.34)",
    patternEmoji: "🎲",
    sticker: "🎲",
    tagBg: "rgba(255,255,255,0.66)",
    tagText: "#0B74D1",
    titleText: "#0B74D1",
  },
  Scénarios: {
    accent: "#9B4DFF",
    bodyText: "#3B1B5E",
    chipBg: "#EAD7FF",
    colors: ["#F5EAFF", "#D9AEFF", "#A96BFF"],
    glow: "rgba(155,77,255,0.34)",
    patternEmoji: "🎭",
    sticker: "🎭",
    tagBg: "rgba(255,255,255,0.68)",
    tagText: "#7A2DE2",
    titleText: "#7A2DE2",
  },
  "Kinky Soft": {
    accent: "#6D5CFF",
    bodyText: "#2C2463",
    chipBg: "#DED9FF",
    colors: ["#F0EDFF", "#BDB4FF", "#7D6CFF"],
    glow: "rgba(109,92,255,0.34)",
    patternEmoji: "👑",
    sticker: "👑",
    tagBg: "rgba(255,255,255,0.68)",
    tagText: "#5848D9",
    titleText: "#5848D9",
  },
  BDSM: {
    accent: "#5557FF",
    bodyText: "rgba(255,255,255,0.84)",
    chipBg: "#DDD8FF",
    colors: ["#332246", "#202E63", "#11152F"],
    glow: "rgba(42,37,92,0.4)",
    patternEmoji: "🎭",
    sticker: stickers.lock,
    tagBg: "rgba(255,255,255,0.16)",
    tagText: "#E8E3FF",
    titleText: "#E8E3FF",
  },
  "Plaisirs explicites": {
    accent: "#E3007A",
    bodyText: "#521232",
    chipBg: "#FFD0EC",
    colors: ["#FFE0F3", "#FF79C2", "#E3007A"],
    glow: "rgba(227,0,122,0.34)",
    patternEmoji: "💦",
    sticker: "💦",
    tagBg: "rgba(255,255,255,0.66)",
    tagText: "#C00068",
    titleText: "#C00068",
  },
  Tabous: {
    accent: candy.black,
    bodyText: candy.white,
    chipBg: "#F1D6E5",
    colors: ["#2A1023", "#7A123C", "#20101F"],
    glow: "rgba(32,16,31,0.38)",
    patternEmoji: "🗝️",
    sticker: "🗝️",
    tagBg: "rgba(255,255,255,0.18)",
    tagText: "#FFE1F1",
    titleText: "#FFE1F1",
  },
  Perso: {
    accent: candy.green,
    bodyText: candy.text,
    chipBg: candy.mint,
    colors: ["#D7FFF1", "#9DFFD7", "#66F0C1"],
    glow: "rgba(13,166,108,0.32)",
    patternEmoji: "🪄",
    sticker: stickers.wand,
    tagBg: "rgba(255,255,255,0.62)",
    tagText: candy.green,
    titleText: candy.green,
  },
};

function categoryVisual(category: DesireCategory) {
  return categoryVisuals[category] ?? categoryVisuals.Vanille!;
}

function categoryLabel(category: DesireCategory) {
  return desirePackByCategory.get(category)?.label ?? category;
}

function categoryDescription(category: DesireCategory) {
  return desirePackByCategory.get(category)?.description ?? "";
}

function categoryTone(category: DesireCategory) {
  const visual = categoryVisual(category);
  return { bg: visual.chipBg, active: visual.accent, icon: visual.sticker };
}

function categoryGlow(category: DesireCategory, active = false) {
  const visual = categoryVisual(category);
  return active ? visual.glow : visual.glow.replace(/,0\.\d+\)/, ",0.18)");
}

function categoryChipShadow(category: DesireCategory, active = false, unlocked = true): ViewStyle {
  const glow = unlocked ? categoryGlow(category, active) : "rgba(87,8,58,0.12)";

  if (Platform.OS === "web") {
    return {
      boxShadow: active
        ? `0 9px 16px -5px ${glow}, 0 3px 7px -4px ${glow}`
        : `0 5px 12px -7px ${glow}`,
    } as ViewStyle;
  }

  return {
    elevation: active ? 5 : 2,
    shadowColor: glow,
    shadowOffset: { width: 0, height: active ? 8 : 4 },
    shadowOpacity: active ? 0.72 : 0.34,
    shadowRadius: active ? 13 : 8,
  };
}

function categoryChipTextColor(category: DesireCategory, active = false, unlocked = true) {
  if (!active || !unlocked) {
    return candy.ink;
  }

  return category === "Vanille" ? candy.ink : candy.white;
}

function categoryCardTone(category: DesireCategory) {
  return categoryVisual(category);
}

function cardStickerEmoji(card: DesireCard) {
  return card.emoji ?? categoryCardTone(card.category).sticker;
}

function CardMetaCluster({
  category,
  compact,
  large,
  status,
}: {
  category: DesireCategory;
  compact?: boolean;
  large?: boolean;
  status: string;
}) {
  const tone = categoryCardTone(category);

  return (
    <View style={[styles.cardMetaCluster, large && styles.cardMetaClusterLarge, compact && styles.cardMetaClusterCompact]}>
      <View
        style={[
          styles.cardCategoryPill,
          large && styles.cardCategoryPillLarge,
          compact && styles.cardCategoryPillCompact,
          { backgroundColor: tone.tagBg, borderColor: tone.tagText },
        ]}
      >
        <Text style={[styles.cardCategoryPillText, large && styles.cardCategoryPillTextLarge, { color: tone.tagText }]}>
          {categoryLabel(category)}
        </Text>
      </View>
      <View style={[styles.cardStatusLine, compact && styles.cardStatusLineCompact]}>
        <View style={[styles.cardStatusDot, { backgroundColor: tone.tagText }]} />
        <Text style={[styles.cardStatusInlineText, { color: tone.titleText }]}>{status}</Text>
      </View>
    </View>
  );
}

function categorySurfaceTagText(category: DesireCategory) {
  const tone = categoryCardTone(category);
  return category === "BDSM" || category === "Tabous" ? tone.accent : tone.tagText;
}

function shuffledCards(cards: DesireCard[]) {
  const nextCards = [...cards];

  for (let index = nextCards.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [nextCards[index], nextCards[swapIndex]] = [nextCards[swapIndex], nextCards[index]];
  }

  return nextCards;
}

function useLoop(duration: number, delay = 0) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(value, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNativeAnimations,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: useNativeAnimations,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [delay, duration, value]);

  return value;
}

function useEntrance(delay = 0) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(value, {
      toValue: 1,
      delay,
      duration: 560,
      easing: Easing.out(Easing.back(1.1)),
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [delay, value]);

  return value;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <Root />
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("App render crash", error, info);
  }

  retry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <CandyFrame>
        <View style={styles.appCrashScreen}>
          <Text style={styles.appCrashEmoji}>🫠</Text>
          <Text style={styles.appCrashTitle}>Petit bug d'affichage</Text>
          <Text style={styles.appCrashText}>
            WeSpice a bloqué sur cet écran. Relance l'interface, tes tests locaux restent sauvegardés.
          </Text>
          <Pressable onPress={this.retry} style={styles.appCrashButton}>
            <Text style={styles.appCrashButtonText}>Relancer l'interface</Text>
          </Pressable>
          <Text style={styles.appCrashDetails}>{this.state.error.message}</Text>
        </View>
      </CandyFrame>
    );
  }
}

function Root() {
  const [booting, setBooting] = useState(true);
  const [remoteHydrating, setRemoteHydrating] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [couple, setCouple] = useState<CoupleState | null>(null);
  const [authError, setAuthError] = useState("");
  const [chatContextCardId, setChatContextCardId] = useState<string | undefined>(undefined);
  const [introSeen, setIntroSeen] = useState(false);
  const [invitePromptVisible, setInvitePromptVisible] = useState(false);
  const [joinPromptVisible, setJoinPromptVisible] = useState(false);
  const [joinReturnToInvite, setJoinReturnToInvite] = useState(false);
  const [tutorialReplayVisible, setTutorialReplayVisible] = useState(false);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<PurchaseSuccess | null>(null);
  const [enviesFocusCategory, setEnviesFocusCategory] = useState<DesireCategory | null>(null);
  const [revealedMatchIds, setRevealedMatchIds] = useState<string[]>([]);
  const [secretToastVisible, setSecretToastVisible] = useState(false);
  const [secretToastNonce, setSecretToastNonce] = useState(0);
  const [responseLimitPromptVisible, setResponseLimitPromptVisible] = useState(false);
  const [fakeAd, setFakeAd] = useState<FakeAdRequest | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const secretToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fakeAdResolver = useRef<(() => void) | null>(null);
  const fakeAdLastShownAt = useRef(0);
  const fakeAdScheduleTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const fakeAdStats = useRef({ matchesSinceAd: 0, votesSinceAd: 0 });
  const soloServerRecoveryRunning = useRef(false);
  const coupleRef = useRef<CoupleState | null>(null);
  const chatRefreshRef = useRef<ChatRefreshState>({
    coupleId: null,
    inFlight: null,
    lastStartedAt: 0,
  });
  const remoteRefreshRef = useRef<RemoteRefreshState>({
    coupleKey: null,
    inFlight: null,
    lastCompletedAt: 0,
    lastStartedAt: 0,
  });
  const [providerLoading, setProviderLoading] = useState<AuthProvider | null>(null);
  const [syncError, setSyncError] = useState("");
  const [tab, setTab] = useState<TabKey>("home");

  const updateIntroSeen = useCallback((seen: boolean) => {
    setIntroSeen(seen);
    void saveIntroSeen(seen);
  }, []);

  useEffect(() => {
    coupleRef.current = couple;
  }, [couple]);

  useEffect(() => {
    configureNotificationChannel().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session || !hasSupabaseConfig) {
      return;
    }

    syncPushTokenIfAlreadyGranted().catch(() => undefined);
  }, [session]);

  useEffect(() => {
    loadOfflineQueueCount().then(setOfflineQueueCount).catch(() => undefined);
  }, []);

  const refreshRemoteCoupleState = useCallback(
    async (preferredCoupleId?: string | null, options: RemoteRefreshOptions = {}) => {
      if (!session || !hasSupabaseConfig) {
        return false;
      }

      const coupleId = preferredCoupleId && isRemoteCoupleId(preferredCoupleId) ? preferredCoupleId : null;
      const coupleKey = coupleId ?? "latest";
      const now = Date.now();
      const currentRefresh = remoteRefreshRef.current;

      if (!options.force && currentRefresh.inFlight && currentRefresh.coupleKey === coupleKey) {
        return currentRefresh.inFlight;
      }

      if (!options.force && currentRefresh.coupleKey === coupleKey && now - currentRefresh.lastStartedAt < REMOTE_REFRESH_COOLDOWN_MS) {
        return false;
      }

      let refreshTask: Promise<boolean> = Promise.resolve(false);
      refreshTask = (async () => {
        try {
          const remote = await fetchMyCoupleState(coupleId);
          if (!remote) {
            return false;
          }

          const nextCouple = await coupleFromRemoteState(remote, coupleRef.current);
          setCouple(purgeExpiredChat(nextCouple));
          setRevealedMatchIds((remote.match_reveals ?? []).filter((reveal) => reveal.revealed_at).map((reveal) => reveal.card_id));
          setSyncError("");
          return true;
        } catch (error) {
          const message = errorMessage(error);
          setSyncError(`La synchro serveur n'a pas abouti: ${message}`);
          return false;
        } finally {
          if (remoteRefreshRef.current.inFlight === refreshTask) {
            remoteRefreshRef.current = {
              coupleKey,
              inFlight: null,
              lastCompletedAt: Date.now(),
              lastStartedAt: remoteRefreshRef.current.lastStartedAt,
            };
          }
        }
      })();

      remoteRefreshRef.current = {
        coupleKey,
        inFlight: refreshTask,
        lastCompletedAt: currentRefresh.lastCompletedAt,
        lastStartedAt: now,
      };

      return refreshTask;
    },
    [session],
  );

  const refreshRemoteChatMessages = useCallback(
    async (preferredCoupleId?: string | null, options: RemoteRefreshOptions = {}) => {
      if (!session || !hasSupabaseConfig || !preferredCoupleId || !isRemoteCoupleId(preferredCoupleId)) {
        return false;
      }

      const coupleId = preferredCoupleId;
      const now = Date.now();
      const currentRefresh = chatRefreshRef.current;

      if (!options.force && currentRefresh.inFlight && currentRefresh.coupleId === coupleId) {
        return currentRefresh.inFlight;
      }

      if (!options.force && currentRefresh.coupleId === coupleId && now - currentRefresh.lastStartedAt < CHAT_REFRESH_COOLDOWN_MS) {
        return false;
      }

      let refreshTask: Promise<boolean> = Promise.resolve(false);
      refreshTask = (async () => {
        try {
          const remoteMessages = await fetchRemoteChatMessages(coupleId);
          const messages = await chatMessagesFromRemote(remoteMessages);

          setCouple((current) => {
            if (!current || current.id !== coupleId) {
              return current;
            }

            const cleanCouple = purgeExpiredChat(current);
            const currentMessages = cleanCouple.chat?.messages ?? [];

            if (areChatMessagesEqual(currentMessages, messages)) {
              return cleanCouple;
            }

            return {
              ...cleanCouple,
              chat: {
                ...cleanCouple.chat,
                messages,
              },
            };
          });

          return true;
        } catch (error) {
          console.warn("Silent chat refresh failed", error);
          return false;
        } finally {
          if (chatRefreshRef.current.inFlight === refreshTask) {
            chatRefreshRef.current = {
              coupleId,
              inFlight: null,
              lastStartedAt: chatRefreshRef.current.lastStartedAt,
            };
          }
        }
      })();

      chatRefreshRef.current = {
        coupleId,
        inFlight: refreshTask,
        lastStartedAt: now,
      };

      return refreshTask;
    },
    [session],
  );

  const flushQueuedRemoteWork = useCallback(
    async (preferredCoupleId?: string | null) => {
      if (!session || !hasSupabaseConfig) {
        return;
      }

      const beforeCount = await loadOfflineQueueCount();
      setOfflineQueueCount(beforeCount);

      if (!beforeCount) {
        return;
      }

      const result = await flushRemoteQueue();
      setOfflineQueueCount(result.pending);

      if (result.sent > 0) {
        await refreshRemoteCoupleState(preferredCoupleId);
      }

      if (result.pending > 0) {
        setSyncError(`${result.pending} action${result.pending > 1 ? "s" : ""} en attente de reconnexion.`);
      }
    },
    [refreshRemoteCoupleState, session],
  );

  useEffect(() => {
    if (!session || !couple || !isRemoteCoupleId(couple.id)) {
      return;
    }

    flushQueuedRemoteWork(couple.id).catch(() => undefined);
  }, [couple?.id, flushQueuedRemoteWork, session]);

  useEffect(() => {
    let mounted = true;

    async function boot() {
      const [storedCouple, storedGuestMode, storedIntroSeen] = await Promise.all([
        loadCoupleState(),
        loadGuestMode(),
        loadIntroSeen(),
      ]);
      let nextSession: Session | null = null;

      if (!mounted) {
        return;
      }

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        nextSession = data.session;
      }

      if (!mounted) {
        return;
      }

      setSession(nextSession);
      setCouple(!nextSession && !localModeEnabled ? null : storedCouple ? purgeExpiredChat(storedCouple) : null);
      setGuestMode(localModeEnabled && storedGuestMode);
      setIntroSeen(storedIntroSeen);

      if (mounted) {
        setBooting(false);
      }
    }

    void boot();

    if (!supabase) {
      return () => {
        mounted = false;
      };
    }

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (couple) {
      void saveCoupleState(couple);
    }
  }, [couple]);

  useEffect(() => {
    if (!couple) {
      setRevealedMatchIds([]);
      return;
    }

    const currentMatchIds = new Set(matchedCards(couple).map((card) => card.id));
    setRevealedMatchIds((current) => current.filter((id) => currentMatchIds.has(id)));
  }, [couple]);

  useEffect(() => {
    if (!couple) {
      return undefined;
    }

    const interval = setInterval(() => {
      setCouple((current) => (current ? purgeExpiredChat(current) : current));
    }, 60000);

    return () => clearInterval(interval);
  }, [couple?.id]);

  useEffect(() => {
    if (!session || !hasSupabaseConfig) {
      return;
    }

    let cancelled = false;

    async function hydrateRemote() {
      setRemoteHydrating(true);
      await refreshRemoteCoupleState(couple?.id);
      if (!cancelled) {
        setRemoteHydrating(false);
      }
    }

    void hydrateRemote();

    return () => {
      cancelled = true;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (
      !session
      || !hasSupabaseConfig
      || !couple
      || isRemoteCoupleId(couple.id)
      || hasLinkedPartner(couple)
      || isDebugCouple(couple)
      || soloServerRecoveryRunning.current
    ) {
      return undefined;
    }

    let cancelled = false;

    async function recoverSoloServerState() {
      soloServerRecoveryRunning.current = true;

      try {
        const existingRemote = await fetchMyCoupleState(null);

        if (cancelled) {
          return;
        }

        if (existingRemote) {
          const nextCouple = await coupleFromRemoteState(existingRemote, coupleRef.current);

          if (!cancelled) {
            setCouple(purgeExpiredChat(nextCouple));
            setRevealedMatchIds((existingRemote.match_reveals ?? []).filter((reveal) => reveal.revealed_at).map((reveal) => reveal.card_id));
            setSyncError("");
          }

          return;
        }

        const current = coupleRef.current;

        if (!current || isRemoteCoupleId(current.id) || hasLinkedPartner(current) || isDebugCouple(current)) {
          return;
        }

        const remote = await createRemoteCouple(profilePayload(current.profiles[current.activePartnerId]));

        if (cancelled) {
          return;
        }

        const latest = coupleRef.current;

        if (!latest || isRemoteCoupleId(latest.id) || hasLinkedPartner(latest) || isDebugCouple(latest)) {
          return;
        }

        const remoteShell = hydrateRemoteShell(latest, remote);
        setCouple(remoteShell);
        setSyncError("");
        await mirrorSoloStateToRemote(remoteShell, remote.couple_id);
        await refreshRemoteCoupleState(remote.couple_id);
      } catch (error) {
        console.warn("Silent solo server recovery failed", error);
      } finally {
        soloServerRecoveryRunning.current = false;
      }
    }

    void recoverSoloServerState();

    return () => {
      cancelled = true;
    };
  }, [couple?.id, refreshRemoteCoupleState, session?.user.id]);

  useEffect(() => {
    if (!session || !couple || !hasSupabaseConfig || !isRemoteCoupleId(couple.id)) {
      return undefined;
    }

    let chatRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeToCoupleRealtime(couple.id, (table) => {
      if (table === "chat_messages" || table === "chat_attachments") {
        if (chatRefreshTimer) {
          clearTimeout(chatRefreshTimer);
        }

        chatRefreshTimer = setTimeout(() => {
          void refreshRemoteChatMessages(couple.id);
        }, 120);
        return;
      }

      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      refreshTimer = setTimeout(() => {
        void refreshRemoteCoupleState(couple.id);
      }, 250);
    });

    return () => {
      if (chatRefreshTimer) {
        clearTimeout(chatRefreshTimer);
      }
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      unsubscribe();
    };
  }, [couple?.id, refreshRemoteChatMessages, refreshRemoteCoupleState, session?.user.id]);

  useEffect(() => {
    return () => {
      if (secretToastTimer.current) {
        clearTimeout(secretToastTimer.current);
      }
      if (fakeAdResolver.current) {
        fakeAdResolver.current();
        fakeAdResolver.current = null;
      }
      fakeAdScheduleTimers.current.forEach((timer) => clearTimeout(timer));
      fakeAdScheduleTimers.current = [];
    };
  }, []);

  const completeFakeAd = useCallback(() => {
    const resolver = fakeAdResolver.current;
    fakeAdResolver.current = null;
    setFakeAd(null);
    resolver?.();
  }, []);

  const requestFakeAd = useCallback(
    (placement: FakeAdPlacement) => {
      if (!couple || hasNoAds(couple) || fakeAd || fakeAdResolver.current) {
        return Promise.resolve();
      }

      if (placement === "game_break" && tab !== "envies") {
        return Promise.resolve();
      }

      const now = Date.now();
      const cooldown = placement === "match_reveal" ? AD_REVEAL_COOLDOWN_MS : AD_GAME_COOLDOWN_MS;

      if (now - fakeAdLastShownAt.current < cooldown) {
        return Promise.resolve();
      }

      if (placement === "game_break" && activeResponseCount(couple) < AD_GAME_MIN_RESPONSES) {
        return Promise.resolve();
      }

      fakeAdLastShownAt.current = now;
      if (placement === "game_break") {
        fakeAdStats.current = { matchesSinceAd: 0, votesSinceAd: 0 };
      }

      return new Promise<void>((resolve) => {
        fakeAdResolver.current = resolve;
        setFakeAd(fakeAdCopy(placement));
      });
    },
    [couple, fakeAd, tab],
  );

  const scheduleGameBreakAd = useCallback(() => {
    const timer = setTimeout(() => {
      fakeAdScheduleTimers.current = fakeAdScheduleTimers.current.filter((item) => item !== timer);
      void requestFakeAd("game_break");
    }, AD_AFTER_VOTE_DELAY_MS);
    fakeAdScheduleTimers.current.push(timer);
  }, [requestFakeAd]);

  const handleBeforeRevealMatch = useCallback(async () => {
    await requestFakeAd("match_reveal");
    return true;
  }, [requestFakeAd]);

  const handleDebugFakeAd = useCallback(() => {
    fakeAdScheduleTimers.current.forEach((timer) => clearTimeout(timer));
    fakeAdScheduleTimers.current = [];
    if (fakeAdResolver.current) {
      fakeAdResolver.current();
      fakeAdResolver.current = null;
    }
    fakeAdLastShownAt.current = Date.now();
    setFakeAd(fakeAdCopy("game_break"));
    void Haptics.selectionAsync();
  }, []);

  const handleDemo = useCallback(async () => {
    if (!localModeEnabled) {
      setAuthError("Le mode test local est désactivé sur le build production.");
      return;
    }

    setAuthError("");
    await saveGuestMode(true);
    setGuestMode(true);
  }, []);

  const handleProvider = useCallback(async (provider: AuthProvider) => {
    try {
      setAuthError("");
      setProviderLoading(provider);
      const nextSession = await signInWithProvider(provider);
      if (nextSession) {
        setSession(nextSession);
        void saveGuestMode(false);
        setGuestMode(false);
      }
    } catch (error) {
      const message = errorMessage(error, "Connexion impossible.");
      setAuthError(message);
    } finally {
      setProviderLoading(null);
    }
  }, []);

  const handleOnboardingComplete = useCallback(
    async (mode: OnboardingMode, profile: Omit<PartnerProfile, "id">, inviteCode: string) => {
      if (!session && !localModeEnabled) {
        setAuthError("Connecte-toi pour créer ou rejoindre un couple.");
        return;
      }

      const localCouple =
        mode === "create" ? createInitialCouple(profile) : createJoinedCouple(profile, inviteCode.trim());

      if (session && hasSupabaseConfig) {
        try {
          const remote =
            mode === "create" ? await createRemoteCouple(profile) : await joinRemoteCouple(profile, inviteCode.trim());
          setCouple(hydrateRemoteShell(localCouple, remote));
          void refreshRemoteCoupleState(remote.couple_id);
          setSyncError("");
        } catch (error) {
          const message = errorMessage(error);
          setCouple(localCouple);
          setSyncError(`Compte créé localement. Synchro serveur à corriger: ${message}`);
        }
        setInvitePromptVisible(mode === "create");
        setJoinPromptVisible(false);
        setLeaveConfirmVisible(false);
        setPurchaseSuccess(null);
        setTab("home");
        return;
      }

      setCouple(localCouple);
      setInvitePromptVisible(mode === "create");
      setJoinPromptVisible(false);
      setLeaveConfirmVisible(false);
      setPurchaseSuccess(null);
      setSyncError("");
      setRevealedMatchIds([]);
      setTab("home");
    },
    [refreshRemoteCoupleState, session],
  );

  const handleVote = useCallback(
    (cardId: string, level: VoteLevel) => {
      if (!couple) {
        return false;
      }

      const activeId = couple.activePartnerId;
      const coupleId = couple.id;
      const partnerId = otherPartnerId(activeId);
      const previousActiveVote = couple.votes[activeId][cardId];
      const isVoteChange = previousActiveVote !== level;

      if (!isVoteChange) {
        return false;
      }

      if (!canAnswerNewCardToday(couple, activeId)) {
        setResponseLimitPromptVisible(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return false;
      }

      const partnerVote = couple.votes[partnerId][cardId];
      const wasAlreadyMatch = isPositiveMatchVote(previousActiveVote) && isPositiveMatchVote(partnerVote);
      const becomesMatch = isPositiveMatchVote(level) && isPositiveMatchVote(partnerVote);
      const newMatchCreated = becomesMatch && !wasAlreadyMatch;
      const responseCountBeforeVote = activeResponseCount(couple);

      setCouple((current) => {
        if (!current) {
          return current;
        }

        const nextCouple = {
          ...current,
          votes: {
            ...current.votes,
            [activeId]: {
              ...current.votes[activeId],
              [cardId]: level,
            },
          },
        };

        return current.votes[activeId]?.[cardId] !== level
          ? withDailyResponseIncrement(nextCouple, activeId)
          : nextCouple;
      });

      setSecretToastVisible(true);
      setSecretToastNonce((current) => current + 1);
      if (secretToastTimer.current) {
        clearTimeout(secretToastTimer.current);
      }
      secretToastTimer.current = setTimeout(() => {
        setSecretToastVisible(false);
      }, 1150);

      void Haptics.selectionAsync();

      fakeAdStats.current.votesSinceAd += 1;
      if (newMatchCreated) {
        fakeAdStats.current.matchesSinceAd += 1;
      }

      if (
        responseCountBeforeVote >= AD_GAME_MIN_RESPONSES
        && (
          fakeAdStats.current.votesSinceAd >= AD_GAME_VOTE_INTERVAL
          || fakeAdStats.current.matchesSinceAd >= AD_GAME_MATCH_INTERVAL
        )
      ) {
        scheduleGameBreakAd();
      }

      if (session && hasSupabaseConfig) {
        saveRemoteVote(coupleId, cardId, level)
          .then(async () => {
            await sendRemoteNotificationEvent({ cardId, coupleId, type: "new_match" }).catch(() => undefined);
            await refreshRemoteCoupleState(coupleId);
          })
          .catch((error) => {
            const message = errorMessage(error, "");
            if (message.includes("daily_limit_reached")) {
              setResponseLimitPromptVisible(true);
              setSyncError("Limite quotidienne atteinte côté serveur.");
              void refreshRemoteCoupleState(coupleId);
              return;
            }

            enqueueRemoteVote({ cardId, coupleId, level })
              .then(() => loadOfflineQueueCount())
              .then(setOfflineQueueCount)
              .then(() => {
                setTimeout(() => {
                  flushQueuedRemoteWork(coupleId).catch(() => undefined);
                }, 5000);
              })
              .catch(() => undefined);
            setSyncError("Vote gardé en attente. Il sera synchronisé automatiquement.");
          });
      }

      return true;
    },
    [couple, flushQueuedRemoteWork, refreshRemoteCoupleState, scheduleGameBreakAd, session],
  );

  const handleActorChange = useCallback((nextId: PartnerId) => {
    setCouple((current) => (current ? { ...current, activePartnerId: nextId } : current));
  }, []);

  const handleMoodChange = useCallback(
    (level: CoupleMoodLevel) => {
      if (!couple) {
        return;
      }

      const nextCouple: CoupleState = {
        ...couple,
        mood: {
          ...couple.mood,
          [couple.activePartnerId]: level,
        },
      };
      const didReveal = !isMoodAligned(couple) && isMoodAligned(nextCouple);

      setCouple(nextCouple);
      void (didReveal
        ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
        : Haptics.selectionAsync());

      if (session && hasSupabaseConfig && isRemoteCoupleId(couple.id)) {
        saveRemoteMood(couple.id, level)
          .then(async () => {
            await sendRemoteNotificationEvent({ coupleId: couple.id, type: "mood_aligned" }).catch(() => undefined);
            await refreshRemoteCoupleState(couple.id);
          })
          .catch(() => {
            setSyncError("Le mood n'a pas pu être synchronisé.");
          });
      }
    },
    [couple, refreshRemoteCoupleState, session],
  );

  const ensurePushReadyForPreference = useCallback(async () => {
    if (!session || !hasSupabaseConfig) {
      setSyncError("Connecte-toi pour activer les notifications sur ce téléphone.");
      return false;
    }

    const result = await requestPushPermissionAndRegister();

    if (result.status === "registered") {
      return true;
    }

    setSyncError(result.reason ?? "Les notifications n'ont pas pu être activées.");
    return false;
  }, [session]);

  const handleMoodNotificationPreference = useCallback(async (enabled: boolean) => {
    if (enabled && !(await ensurePushReadyForPreference())) {
      return;
    }

    setCouple((current) => {
      if (!current) {
        return current;
      }

      const nextCouple = setMoodNotificationPreference(current, current.activePartnerId, enabled);
      if (session && hasSupabaseConfig && isRemoteCoupleId(nextCouple.id)) {
        saveRemoteNotificationPreferences(nextCouple.id, notificationSettings(nextCouple), nextCouple.activePartnerId).catch(() => {
          setSyncError("Les préférences de notification n'ont pas pu être synchronisées.");
        });
      }

      return nextCouple;
    });

    void Haptics.selectionAsync();
  }, [ensurePushReadyForPreference, session]);

  const handleNotificationPreference = useCallback(async (key: NotificationToggleKey, enabled: boolean) => {
    if (enabled && !(await ensurePushReadyForPreference())) {
      return;
    }

    setCouple((current) => {
      if (!current) {
        return current;
      }

      const nextCouple = setNotificationPreference(current, current.activePartnerId, key, enabled);
      if (session && hasSupabaseConfig && isRemoteCoupleId(nextCouple.id)) {
        saveRemoteNotificationPreferences(nextCouple.id, notificationSettings(nextCouple), nextCouple.activePartnerId).catch(() => {
          setSyncError("Les préférences de notification n'ont pas pu être synchronisées.");
        });
      }

      return nextCouple;
    });

    void Haptics.selectionAsync();
  }, [ensurePushReadyForPreference, session]);

  const handleStatusEmojiChange = useCallback(
    (nextEmoji: string) => {
      if (!couple) {
        return;
      }

      const statusEmoji = normalizeStatusEmoji(nextEmoji);
      const activeId = couple.activePartnerId;
      setCouple((current) => (current ? withUpdatedProfileStatus(current, activeId, statusEmoji) : current));
      void Haptics.selectionAsync();

      if (session && hasSupabaseConfig && isRemoteCoupleId(couple.id)) {
        saveRemoteProfileStatus(couple.id, statusEmoji).catch(() => {
          setSyncError("Le statut n'a pas pu être synchronisé. Il reste sauvegardé localement.");
        });
      }
    },
    [couple, session],
  );

  const handleAddCustomDesire = useCallback(
    ({ blurb, category, emoji, title }: CustomDesireDraft) => {
      if (!couple) {
        return;
      }

      if (!hasCustomCardsUnlimited(couple) && customDesireCount(couple) >= CUSTOM_CARD_FREE_LIMIT) {
        setSyncError("Les 3 cartes perso gratuites sont utilisées. Débloque la création sans limite pour en ajouter.");
        void Haptics.selectionAsync();
        return;
      }

      const customDesire = createCustomDesire({
        blurb,
        category,
        createdBy: couple.activePartnerId,
        emoji,
        title,
      });

      setCouple((current) => {
        if (!current) {
          return current;
        }

        return {
          ...current,
          customDesires: [customDesire, ...(current.customDesires ?? [])],
        };
      });

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (session && hasSupabaseConfig) {
        saveRemoteCustomDesire({
          blurb: customDesire.blurb,
          cardId: customDesire.id,
          category: customDesire.category,
          coupleId: couple.id,
          emoji: customDesire.emoji ?? stickers.heart,
          title: customDesire.title,
        }).catch(() => {
          setSyncError("La synchro de la carte perso n'a pas abouti. Elle reste sauvegardée localement.");
        });
      }
    },
    [couple, session],
  );

  const runPurchaseOrLocalUnlock = useCallback(
    async ({
      applyLocalUnlock,
      config,
      success,
    }: {
      applyLocalUnlock: () => void;
      config: ReturnType<typeof categoryPurchaseConfig> | ReturnType<typeof featurePurchaseConfig>;
      success: PurchaseSuccess;
    }) => {
      if (!couple) {
        return;
      }

      if (session) {
        if (!hasSupabaseConfig || !isRemoteCoupleId(couple.id)) {
          setSyncError("Achat impossible tant que l'espace n'est pas synchronisé avec Supabase.");
          return;
        }

        try {
          await purchaseWithRevenueCat({
            appUserId: session.user.id,
            config,
            coupleId: couple.id,
          });
          await refreshRemoteCoupleState(couple.id);
          if (config.target.kind === "feature" && config.target.feature === NO_ADS_FEATURE) {
            fakeAdStats.current = { matchesSinceAd: 0, votesSinceAd: 0 };
            completeFakeAd();
          }
          setResponseLimitPromptVisible(false);
          setPurchaseSuccess(success);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
          const message = errorMessage(error, "achat impossible");
          setSyncError(`Achat non validé: ${message}`);
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
        return;
      }

      if (!localModeEnabled) {
        setSyncError("Connecte-toi pour valider l'achat côté serveur.");
        return;
      }

      applyLocalUnlock();
      setPurchaseSuccess(success);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [completeFakeAd, couple, refreshRemoteCoupleState, session],
  );

  const handleUnlockCustomCards = useCallback(() => {
    if (!couple || hasCustomCardsUnlimited(couple)) {
      return;
    }

    void runPurchaseOrLocalUnlock({
      applyLocalUnlock: () => {
        setCouple((current) => {
          if (!current || hasCustomCardsUnlimited(current)) {
            return current;
          }

          return {
            ...current,
            unlockedFeatures: [...unlockedFeatures(current), CUSTOM_CARDS_UNLIMITED_FEATURE],
          };
        });
      },
      config: featurePurchaseConfig(CUSTOM_CARDS_UNLIMITED_FEATURE),
      success: { kind: "custom", category: "Perso" },
    });
  }, [couple, runPurchaseOrLocalUnlock]);

  const handleUnlockNoAds = useCallback(() => {
    if (!couple || hasNoAds(couple)) {
      return;
    }

    void runPurchaseOrLocalUnlock({
      applyLocalUnlock: () => {
        setCouple((current) => {
          if (!current || hasNoAds(current)) {
            return current;
          }

          return {
            ...current,
            unlockedFeatures: [...unlockedFeatures(current), NO_ADS_FEATURE],
          };
        });
        fakeAdStats.current = { matchesSinceAd: 0, votesSinceAd: 0 };
        completeFakeAd();
      },
      config: featurePurchaseConfig(NO_ADS_FEATURE),
      success: { kind: "no_ads" },
    });
  }, [completeFakeAd, couple, runPurchaseOrLocalUnlock]);

  const handleUnlockUnlimitedResponses = useCallback(() => {
    if (!couple || hasUnlimitedResponses(couple)) {
      return;
    }

    void runPurchaseOrLocalUnlock({
      applyLocalUnlock: () => {
        setCouple((current) => {
          if (!current || hasUnlimitedResponses(current)) {
            return current;
          }

          return {
            ...current,
            unlockedFeatures: [...unlockedFeatures(current), UNLIMITED_RESPONSES_FEATURE],
          };
        });
        setResponseLimitPromptVisible(false);
      },
      config: featurePurchaseConfig(UNLIMITED_RESPONSES_FEATURE),
      success: { kind: "unlimited_responses" },
    });
  }, [couple, runPurchaseOrLocalUnlock]);

  const handleUnlockCategory = useCallback(
    (category: DesireCategory) => {
      if (!couple || isCategoryUnlocked(couple, category)) {
        return;
      }

      if (category === "Vanille" || category === "Perso") {
        return;
      }

      void runPurchaseOrLocalUnlock({
        applyLocalUnlock: () => {
          setCouple((current) => {
            if (!current || isCategoryUnlocked(current, category)) {
              return current;
            }

            return {
              ...current,
              unlockedCategories: [...unlockedCategories(current), category],
            };
          });
        },
        config: categoryPurchaseConfig(category as Exclude<DesireCategory, "Vanille" | "Perso">),
        success: { kind: "category", category },
      });
    },
    [couple, runPurchaseOrLocalUnlock],
  );

  const handleDiscoverPurchase = useCallback(() => {
    if (!purchaseSuccess) {
      return;
    }

    if (purchaseSuccess.kind === "no_ads" || purchaseSuccess.kind === "unlimited_responses") {
      setPurchaseSuccess(null);
      setTab("home");
      return;
    }

    setEnviesFocusCategory(purchaseSuccess.category);
    setPurchaseSuccess(null);
    setTab("envies");
  }, [purchaseSuccess]);

  const handleRestorePurchases = useCallback(async () => {
    if (!session || !couple || !hasSupabaseConfig || !isRemoteCoupleId(couple.id)) {
      setSyncError("Connecte-toi avec un espace Supabase synchronisé pour restaurer les achats.");
      return;
    }

    try {
      await restoreRevenueCatPurchases(session.user.id, couple.id);
      await refreshRemoteCoupleState(couple.id);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSyncError("Achats restaurés.");
    } catch (error) {
      const message = errorMessage(error, "restauration impossible");
      setSyncError(`Restauration impossible: ${message}`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [couple, refreshRemoteCoupleState, session]);

  const handleCopyInvite = useCallback(async () => {
    if (!couple) {
      return;
    }

    await Clipboard.setStringAsync(couple.inviteCode);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [couple]);

  const handleOpenChat = useCallback(
    (cardId?: string) => {
      setChatContextCardId(cardId);
      setTab("chat");
      void refreshRemoteChatMessages(coupleRef.current?.id, { force: true });
    },
    [refreshRemoteChatMessages],
  );

  const handleTabChange = useCallback(
    (nextTab: TabKey) => {
      setTab(nextTab);

      if (nextTab === "couple") {
        void refreshRemoteCoupleState(coupleRef.current?.id);
      }

      if (nextTab === "chat") {
        void refreshRemoteChatMessages(coupleRef.current?.id, { force: true });
      }
    },
    [refreshRemoteChatMessages, refreshRemoteCoupleState],
  );

  const handleSendChatMessage = useCallback(
    async ({ attachments, body }: { attachments: ChatAttachment[]; body: string }) => {
      if (!couple) {
        return;
      }

      const trimmedBody = body.trim();
      if (!trimmedBody && attachments.length === 0) {
        return;
      }

      if (session && hasSupabaseConfig && isRemoteCoupleId(couple.id)) {
        const messageId = Crypto.randomUUID();
        const cleanCouple = purgeExpiredChat(couple);
        const optimisticMessage = createChatMessage({
          attachments,
          authorId: cleanCouple.activePartnerId,
          body: trimmedBody || "Photo",
          id: messageId,
          linkedCardId: chatContextCardId,
        });

        setCouple({
          ...cleanCouple,
          chat: {
            ...cleanCouple.chat,
            messages: [
              ...(cleanCouple.chat?.messages ?? []).filter((message) => message.id !== messageId),
              optimisticMessage,
            ],
          },
        });

        try {
          await sendRemoteChatMessage({
            attachments,
            body: trimmedBody,
            coupleId: couple.id,
            linkedCardId: chatContextCardId,
            messageId,
          });
          void sendRemoteNotificationEvent({ coupleId: couple.id, messageId, type: "chat_message" }).catch(() => undefined);
          await refreshRemoteChatMessages(couple.id, { force: true });
          await Haptics.selectionAsync();
        } catch (error) {
          const message = errorMessage(error);
          await enqueueRemoteChatMessage({
            attachments,
            body: trimmedBody,
            coupleId: couple.id,
            linkedCardId: chatContextCardId,
          })
            .then(() => loadOfflineQueueCount())
            .then(setOfflineQueueCount)
            .then(() => {
              setTimeout(() => {
                flushQueuedRemoteWork(couple.id).catch(() => undefined);
              }, 5000);
            })
            .catch(() => undefined);
          setSyncError(`Message gardé en attente. Retry automatique dès que possible. (${message})`);
        }
        return;
      }

      const cleanCouple = purgeExpiredChat(couple);
      const message = createChatMessage({
        attachments,
        authorId: cleanCouple.activePartnerId,
        body: trimmedBody,
        linkedCardId: chatContextCardId,
      });

      setCouple({
        ...cleanCouple,
        chat: {
          ...cleanCouple.chat,
          messages: [...(cleanCouple.chat?.messages ?? []), message],
        },
      });
      await Haptics.selectionAsync();
    },
    [chatContextCardId, couple, flushQueuedRemoteWork, refreshRemoteChatMessages, session],
  );

  const handleReplayTutorial = useCallback(() => {
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setTutorialReplayVisible(true);
  }, []);

  const handleApplyDebugPreset = useCallback(async (preset: DebugPresetId) => {
    if (!localModeEnabled) {
      setSyncError("Les profils de test sont désactivés sur le build production.");
      return;
    }

    const nextCouple = createDebugCouple(preset);
    if (couple && !isDebugCouple(couple)) {
      await saveDebugBackupState(couple);
    }
    await saveGuestMode(true);
    setGuestMode(true);
    setCouple(nextCouple);
    updateIntroSeen(true);
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setTab("debug");
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [couple, updateIntroSeen]);

  const handleDisableDebugProfiles = useCallback(async () => {
    const backup = await loadDebugBackupState();
    const nextCouple = backup ? purgeExpiredChat(backup) : createInitialCouple(fallbackProfileFromSession(session));

    setCouple(nextCouple);
    setChatContextCardId(undefined);
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setEnviesFocusCategory(null);
    setTab("debug");

    await clearDebugBackupState();
    if (session) {
      await saveGuestMode(false);
      setGuestMode(false);
    }
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [session]);

  const handleShowInvitePrompt = useCallback(() => {
    if (!couple) {
      return;
    }

    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setJoinPromptVisible(false);
    setInvitePromptVisible(true);
  }, [couple]);

  const handleShowJoinPrompt = useCallback((returnToInvite = false) => {
    if (!couple || hasLinkedPartner(couple)) {
      return;
    }

    setJoinReturnToInvite(returnToInvite);
    setInvitePromptVisible(false);
    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setJoinPromptVisible(true);
  }, [couple]);

  const handleJoinExistingCouple = useCallback(
    async (inviteCode: string) => {
      if (!couple) {
        throw new Error("Aucun espace solo à relier.");
      }

      const activeProfile = couple.profiles[couple.activePartnerId];
      const profile = profilePayload(activeProfile);
      const trimmedCode = inviteCode.trim();
      const localCouple = createJoinedCouple(profile, trimmedCode);

      if (session && hasSupabaseConfig) {
        try {
          const previousCoupleId = isRemoteCoupleId(couple.id) ? couple.id : null;
          const remote = await joinRemoteCouple(profile, trimmedCode);

          if (previousCoupleId && previousCoupleId !== remote.couple_id) {
            await leaveRemoteCouple(previousCoupleId).catch(() => undefined);
          }

          setCouple(hydrateRemoteShell(localCouple, remote));
          await refreshRemoteCoupleState(remote.couple_id);
          setSyncError("");
        } catch (error) {
          const message = errorMessage(error);
          setSyncError(`Impossible de rejoindre ce couple: ${message}`);
          throw new Error(message);
        }
      } else if (localModeEnabled) {
        setCouple(localCouple);
        setSyncError("");
      } else {
        throw new Error("Connecte-toi pour rejoindre un couple.");
      }

      setInvitePromptVisible(false);
      setJoinPromptVisible(false);
      setJoinReturnToInvite(false);
      setLeaveConfirmVisible(false);
      setPurchaseSuccess(null);
      setChatContextCardId(undefined);
      setRevealedMatchIds([]);
      setTab("home");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [couple, refreshRemoteCoupleState, session],
  );

  const handleRequestLeaveCouple = useCallback(() => {
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setTutorialReplayVisible(false);
    setPurchaseSuccess(null);
    setLeaveConfirmVisible(true);
  }, []);

  const handleConfirmLeaveCouple = useCallback(async () => {
    if (!couple) {
      return;
    }

    const activeProfile = couple.profiles[couple.activePartnerId];
    const soloCouple = createInitialCouple(profilePayload(activeProfile));
    let nextCouple = soloCouple;

    if (session && hasSupabaseConfig) {
      try {
        if (isRemoteCoupleId(couple.id)) {
          await leaveRemoteCouple(couple.id);
        }

        const remote = await createRemoteCouple(profilePayload(activeProfile));
        nextCouple = hydrateRemoteShell(soloCouple, remote);
        setSyncError("");
      } catch {
        setSyncError("Le couple a été quitté localement. La synchro serveur devra être relancée plus tard.");
      }
    }

    setCouple(nextCouple);
    setChatContextCardId(undefined);
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setRevealedMatchIds([]);
    setTab("home");

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [couple, session]);

  const handleShowOnboarding = useCallback(async () => {
    await clearCoupleState();
    await clearDebugBackupState();
    setCouple(null);
    updateIntroSeen(true);
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setChatContextCardId(undefined);
    setRevealedMatchIds([]);
    setTab("home");
  }, [updateIntroSeen]);

  const handleReset = useCallback(async () => {
    await clearCoupleState();
    await clearDebugBackupState();
    await saveGuestMode(localModeEnabled);
    setGuestMode(localModeEnabled);
    setCouple(null);
    updateIntroSeen(false);
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setChatContextCardId(undefined);
    setSyncError("");
    setTab("home");
  }, [updateIntroSeen]);

  const handleLogout = useCallback(async () => {
    await signOut();
    await saveGuestMode(false);
    await clearDebugBackupState();
    setSession(null);
    setGuestMode(false);
    setCouple(null);
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setChatContextCardId(undefined);
    setTab("home");
  }, []);

  if (booting || (remoteHydrating && !couple)) {
    return <SplashScreen />;
  }

  if (!session && !guestMode) {
    return (
      <CandyFrame>
        <AuthGate
          authError={authError}
          localModeEnabled={localModeEnabled}
          providerLoading={providerLoading}
          onDemo={handleDemo}
          onProvider={handleProvider}
        />
      </CandyFrame>
    );
  }

  if (tutorialReplayVisible) {
    return (
      <CandyFrame>
        <WelcomeTutorialScreen
          account={authAccountInfo(session)}
          guestMode={guestMode}
          onStart={() => {
            setTutorialReplayVisible(false);
            updateIntroSeen(true);
            setTab("home");
          }}
        />
      </CandyFrame>
    );
  }

  if (!couple) {
    return (
      <CandyFrame>
        {introSeen ? (
          <Entrance delay={30} style={styles.flex}>
            <OnboardingScreen onComplete={handleOnboardingComplete} />
          </Entrance>
        ) : (
          <WelcomeTutorialScreen account={authAccountInfo(session)} guestMode={guestMode} onStart={() => updateIntroSeen(true)} />
        )}
      </CandyFrame>
    );
  }

  if (joinPromptVisible) {
    return (
      <CandyFrame>
        <JoinCoupleScreen
          couple={couple}
          onCancel={() => {
            setJoinPromptVisible(false);
            if (joinReturnToInvite) {
              setInvitePromptVisible(true);
            }
            setJoinReturnToInvite(false);
          }}
          onJoin={handleJoinExistingCouple}
        />
      </CandyFrame>
    );
  }

  if (invitePromptVisible) {
    return (
      <CandyFrame>
        <InvitePartnerScreen
          couple={couple}
          onContinue={() => {
            setInvitePromptVisible(false);
            setTab("home");
          }}
          onJoin={() => handleShowJoinPrompt(true)}
        />
      </CandyFrame>
    );
  }

  if (leaveConfirmVisible) {
    return (
      <CandyFrame>
        <LeaveCoupleConfirmScreen couple={couple} onCancel={() => setLeaveConfirmVisible(false)} onConfirm={handleConfirmLeaveCouple} />
      </CandyFrame>
    );
  }

  if (purchaseSuccess) {
    return (
      <CandyFrame>
        <PurchaseSuccessScreen purchase={purchaseSuccess} onDiscover={handleDiscoverPurchase} />
      </CandyFrame>
    );
  }

  return (
    <CandyFrame>
      <MainShell
        allowActorSwitch={!session || guestMode}
        authError={authError}
        chatContextCardId={chatContextCardId}
        couple={couple}
        debugEnabled={localModeEnabled}
        enviesFocusCategory={enviesFocusCategory}
        providerLoading={providerLoading}
        revealedMatchIds={revealedMatchIds}
        session={session}
        syncError={syncError}
        tab={tab}
        onActorChange={handleActorChange}
        onAddCustomDesire={handleAddCustomDesire}
        onApplyDebugPreset={handleApplyDebugPreset}
        onBeforeRevealMatch={handleBeforeRevealMatch}
        onCopyInvite={handleCopyInvite}
        onDisableDebugProfiles={handleDisableDebugProfiles}
        onDebugFakeAd={handleDebugFakeAd}
        onLogout={handleLogout}
        onMoodChange={handleMoodChange}
        onMoodNotificationPreference={handleMoodNotificationPreference}
        onNotificationPreference={handleNotificationPreference}
        onJoinPartner={handleShowJoinPrompt}
        onOpenChat={handleOpenChat}
        onProvider={handleProvider}
        onRevealMatch={(cardId) => {
          setRevealedMatchIds((current) => (current.includes(cardId) ? current : [...current, cardId]));
          if (session && hasSupabaseConfig && isRemoteCoupleId(couple.id)) {
            markRemoteMatchRevealed(couple.id, cardId)
              .then(() => refreshRemoteCoupleState(couple.id))
              .catch(() => {
                setSyncError("La révélation du match n'a pas pu être synchronisée.");
              });
          }
        }}
        onRequestLeaveCouple={handleRequestLeaveCouple}
        onReplayTutorial={handleReplayTutorial}
        onRestorePurchases={handleRestorePurchases}
        onReset={handleReset}
        onSendChatMessage={handleSendChatMessage}
        onShowInvitePrompt={handleShowInvitePrompt}
        onShowOnboarding={handleShowOnboarding}
        onStatusEmojiChange={handleStatusEmojiChange}
        onTabChange={handleTabChange}
        onUnlockCustomCards={handleUnlockCustomCards}
        onUnlockCategory={handleUnlockCategory}
        onUnlockNoAds={handleUnlockNoAds}
        onUnlockUnlimitedResponses={handleUnlockUnlimitedResponses}
        onVote={handleVote}
      />
      <UnlimitedResponsesPurchaseModal
        dailyUsed={couple ? dailyResponseCount(couple, couple.activePartnerId) : DAILY_FREE_RESPONSE_LIMIT}
        limitReached
        onClose={() => setResponseLimitPromptVisible(false)}
        onUnlock={handleUnlockUnlimitedResponses}
        visible={responseLimitPromptVisible}
      />
      <SecretVoteToast nonce={secretToastNonce} visible={secretToastVisible} />
      <FakeInterstitialAd ad={fakeAd} onComplete={completeFakeAd} />
    </CandyFrame>
  );
}

function CandyFrame({ children }: { children: React.ReactNode }) {
  return (
    <LinearGradient colors={["#FF97CF", "#FFC2DE", "#FF83BC"]} style={styles.frame}>
      <View style={styles.doodleOne} />
      <View style={styles.doodleTwo} />
      <View style={styles.doodleThree} />
      <SafeAreaView style={styles.safeArea}>{children}</SafeAreaView>
      <StatusBar style="dark" />
    </LinearGradient>
  );
}

function SecretVoteToast({ nonce, visible }: { nonce: number; visible: boolean }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
    }

    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 180 : 140,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [nonce, progress, visible]);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.secretToast,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
        },
      ]}
    >
      <Sparkles size={14} color={candy.white} />
      <Text style={styles.secretToastText}>Choix enregistré</Text>
    </Animated.View>
  );
}

function FakeInterstitialAd({ ad, onComplete }: { ad: FakeAdRequest | null; onComplete: () => void }) {
  const entrance = useRef(new Animated.Value(0)).current;
  const pulse = useLoop(1500);
  const [canContinue, setCanContinue] = useState(false);

  useEffect(() => {
    if (!ad) {
      setCanContinue(false);
      entrance.setValue(0);
      return undefined;
    }

    setCanContinue(false);
    entrance.setValue(0);
    Animated.timing(entrance, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: useNativeAnimations,
    }).start();

    const readyTimer = setTimeout(() => {
      setCanContinue(true);
    }, 1800);

    return () => clearTimeout(readyTimer);
  }, [ad, entrance]);

  if (!ad) {
    return null;
  }

  const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const progressWidth = canContinue ? "100%" : "58%";

  return (
    <Modal animationType="fade" transparent={false} visible onRequestClose={() => {
      if (canContinue) {
        onComplete();
      }
    }}>
      <LinearGradient colors={[candy.rose, "#FF4F96", "#FF9BCB"]} style={styles.fakeAdScreen}>
        <SafeAreaView style={styles.fakeAdSafe}>
          <Animated.View
            style={[
              styles.fakeAdCard,
              {
                opacity: entrance,
                transform: [
                  { translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
                  { scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                ],
              },
            ]}
          >
            <Animated.View pointerEvents="none" style={[styles.fakeAdGlow, { transform: [{ scale: glowScale }] }]} />
            <Text style={styles.fakeAdLabel}>Publicité test</Text>
            <Text style={styles.fakeAdSponsor}>{ad.sponsor}</Text>
            <Text style={styles.fakeAdEmoji}>{ad.emoji}</Text>
            <Text style={styles.fakeAdTitle}>{ad.title}</Text>
            <Text style={styles.fakeAdText}>{ad.text}</Text>

            <View style={styles.fakeAdProgressTrack}>
              <View style={[styles.fakeAdProgressFill, { width: progressWidth }]} />
            </View>

            <SpringPressable
              disabled={!canContinue}
              onPress={onComplete}
              style={[styles.fakeAdCTA, !canContinue && styles.fakeAdCTADisabled]}
            >
              <Text style={styles.fakeAdCTAText}>{canContinue ? ad.cta : "Encore un instant..."}</Text>
              <ChevronRight size={20} color={candy.white} />
            </SpringPressable>

            <Text style={styles.fakeAdFinePrint}>
              Placeholder interne. Le pack No Ads retire ces écrans.
            </Text>
          </Animated.View>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

function SplashScreen() {
  return (
    <CandyFrame>
      <View style={styles.loadingScreen}>
        <WeSpiceLogo />
        <ActivityIndicator color={candy.red} />
        <Text style={styles.loadingText}>Préparation de WeSpice...</Text>
      </View>
    </CandyFrame>
  );
}

function EmojiSticker({
  animated,
  emoji,
  size,
  style,
}: {
  animated?: boolean;
  emoji: string;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  const containerStyle = [
    styles.emojiSticker,
    {
      height: size,
      width: size,
    },
    style,
  ];
  const stickerText = (
    <Text
      adjustsFontSizeToFit
      allowFontScaling={false}
      numberOfLines={1}
      style={[
        styles.emojiStickerText,
        {
          fontSize: size * 0.82,
          lineHeight: size,
        },
      ]}
    >
      {emoji}
    </Text>
  );

  if (animated) {
    return (
      <Animated.View pointerEvents="none" style={containerStyle}>
        {stickerText}
      </Animated.View>
    );
  }

  return (
    <View pointerEvents="none" style={containerStyle}>
      {stickerText}
    </View>
  );
}

function MainShell({
  allowActorSwitch,
  authError,
  chatContextCardId,
  couple,
  debugEnabled,
  enviesFocusCategory,
  providerLoading,
  revealedMatchIds,
  session,
  syncError,
  tab,
  onActorChange,
  onAddCustomDesire,
  onApplyDebugPreset,
  onBeforeRevealMatch,
  onCopyInvite,
  onDebugFakeAd,
  onDisableDebugProfiles,
  onLogout,
  onMoodChange,
  onMoodNotificationPreference,
  onNotificationPreference,
  onOpenChat,
  onJoinPartner,
  onProvider,
  onRevealMatch,
  onRequestLeaveCouple,
  onReplayTutorial,
  onRestorePurchases,
  onReset,
  onSendChatMessage,
  onShowInvitePrompt,
  onShowOnboarding,
  onStatusEmojiChange,
  onTabChange,
  onUnlockCustomCards,
  onUnlockCategory,
  onUnlockNoAds,
  onUnlockUnlimitedResponses,
  onVote,
}: {
  allowActorSwitch: boolean;
  authError: string;
  chatContextCardId?: string;
  couple: CoupleState;
  debugEnabled: boolean;
  enviesFocusCategory: DesireCategory | null;
  providerLoading: AuthProvider | null;
  revealedMatchIds: string[];
  session: Session | null;
  syncError: string;
  tab: TabKey;
  onActorChange: (id: PartnerId) => void;
  onAddCustomDesire: (desire: CustomDesireDraft) => void;
  onApplyDebugPreset: (preset: DebugPresetId) => void;
  onBeforeRevealMatch: (cardId: string) => Promise<boolean>;
  onCopyInvite: () => void;
  onDebugFakeAd: () => void;
  onDisableDebugProfiles: () => void;
  onLogout: () => void;
  onMoodChange: (level: CoupleMoodLevel) => void;
  onMoodNotificationPreference: (enabled: boolean) => void;
  onNotificationPreference: (key: NotificationToggleKey, enabled: boolean) => void;
  onOpenChat: (cardId?: string) => void;
  onJoinPartner: () => void;
  onProvider: (provider: AuthProvider) => void;
  onRevealMatch: (cardId: string) => void;
  onRequestLeaveCouple: () => void;
  onReplayTutorial: () => void;
  onRestorePurchases: () => void;
  onReset: () => void;
  onSendChatMessage: (message: { attachments: ChatAttachment[]; body: string }) => void;
  onShowInvitePrompt: () => void;
  onShowOnboarding: () => void;
  onStatusEmojiChange: (emoji: string) => void;
  onTabChange: (tab: TabKey) => void;
  onUnlockCustomCards: () => void;
  onUnlockCategory: (category: DesireCategory) => void;
  onUnlockNoAds: () => void;
  onUnlockUnlimitedResponses: () => void;
  onVote: (cardId: string, level: VoteLevel) => boolean;
}) {
  const syncNotice = userFacingSyncNotice(syncError);
  const chatNotificationsEnabled = isNotificationPreferenceEnabled(couple, couple.activePartnerId, "chatMessageEnabled");

  return (
    <View style={styles.app}>
      {syncNotice ? <Text style={styles.syncText}>{syncNotice}</Text> : null}

      <View style={styles.content}>
        {tab === "home" ? (
          <HomeScreen
            couple={couple}
            onGoEnvies={() => onTabChange("envies")}
            onGoMatch={() => onTabChange("match")}
            onInvitePartner={onShowInvitePrompt}
            onJoinPartner={onJoinPartner}
            onMoodChange={onMoodChange}
            onMoodNotificationPreference={onMoodNotificationPreference}
            onOpenChat={onOpenChat}
            onOpenProfile={() => onTabChange("profil")}
            revealedMatchIds={revealedMatchIds}
            onStatusEmojiChange={onStatusEmojiChange}
            onUnlockCustomCards={onUnlockCustomCards}
            onUnlockCategory={onUnlockCategory}
            onUnlockNoAds={onUnlockNoAds}
            onUnlockUnlimitedResponses={onUnlockUnlimitedResponses}
            onVote={onVote}
          />
        ) : null}
        {tab === "envies" ? (
          <EnviesScreen
            couple={couple}
            focusCategory={enviesFocusCategory}
            onAddCustomDesire={onAddCustomDesire}
            onUnlockCustomCards={onUnlockCustomCards}
            onUnlockCategory={onUnlockCategory}
            onUnlockNoAds={onUnlockNoAds}
            onUnlockUnlimitedResponses={onUnlockUnlimitedResponses}
            onVote={onVote}
          />
        ) : null}
        {tab === "match" ? (
          <Entrance delay={0} style={styles.flex}>
            <MatchScreen
              couple={couple}
              revealedMatchIds={revealedMatchIds}
              onGoEnvies={() => onTabChange("envies")}
              onOpenChat={onOpenChat}
              onBeforeRevealMatch={onBeforeRevealMatch}
              onRevealMatch={onRevealMatch}
            />
          </Entrance>
        ) : null}
        {tab === "couple" ? (
          <Entrance delay={0} style={styles.flex}>
            <CoupleScreen
              couple={couple}
              revealedMatchIds={revealedMatchIds}
              onCopyInvite={onCopyInvite}
              onGoMatch={() => onTabChange("match")}
              onJoinPartner={onJoinPartner}
            />
          </Entrance>
        ) : null}
        {tab === "profil" ? (
          <Entrance delay={0} style={styles.flex}>
            <ProfileScreen
              authError={authError}
              couple={couple}
              providerLoading={providerLoading}
              session={session}
              onLogout={onLogout}
              onMoodNotificationPreference={onMoodNotificationPreference}
              onNotificationPreference={onNotificationPreference}
              onProvider={onProvider}
              onRequestLeaveCouple={onRequestLeaveCouple}
              onReplayTutorial={onReplayTutorial}
              onRestorePurchases={onRestorePurchases}
              onReset={onReset}
              onStatusEmojiChange={onStatusEmojiChange}
            />
          </Entrance>
        ) : null}
        {debugEnabled && tab === "debug" ? (
          <Entrance delay={0} style={styles.flex}>
            <DebugScreen
              couple={couple}
              onActorChange={onActorChange}
              onApplyPreset={onApplyDebugPreset}
              onDebugFakeAd={onDebugFakeAd}
              onDisableDebugProfiles={onDisableDebugProfiles}
              onReplayTutorial={onReplayTutorial}
              onReset={onReset}
              onShowInvitePrompt={onShowInvitePrompt}
              onShowOnboarding={onShowOnboarding}
            />
          </Entrance>
        ) : null}
        {tab === "chat" ? (
          <Entrance delay={0} style={styles.flex}>
            <ChatScreen
              contextCardId={chatContextCardId}
              couple={couple}
              onSendMessage={onSendChatMessage}
            />
          </Entrance>
        ) : null}
        {tab === "rules" ? (
          <Entrance delay={0} style={styles.flex}>
            <RulesScreen onBack={() => onTabChange("home")} />
          </Entrance>
        ) : null}
      </View>
      <View pointerEvents="box-none" style={styles.tabDock}>
        <LinearGradient
          colors={["rgba(255,151,207,0)", "rgba(255,151,207,0.74)", "rgba(255,151,207,0.96)"]}
          pointerEvents="none"
          style={styles.tabDockFade}
        />
        <CandyTabs
          active={tab === "rules" || (!debugEnabled && tab === "debug") ? "envies" : tab}
          chatNotificationsEnabled={chatNotificationsEnabled}
          showDebug={debugEnabled}
          onChange={onTabChange}
        />
      </View>
    </View>
  );
}

function WeSpiceLogo({
  compact = false,
  small = false,
  style,
}: {
  compact?: boolean;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.logoWrap, compact && styles.logoWrapCompact, small && styles.logoWrapSmall, style]}>
      <Image
        accessibilityIgnoresInvertColors
        resizeMode="contain"
        source={weSpiceLogoAsset}
        style={[styles.logoImage, compact && styles.logoImageCompact, small && styles.logoImageSmall]}
      />
    </View>
  );
}

function CandyTabs({
  active,
  chatNotificationsEnabled,
  onChange,
  showDebug,
}: {
  active: VisibleTabKey;
  chatNotificationsEnabled: boolean;
  onChange: (tab: TabKey) => void;
  showDebug: boolean;
}) {
  const allItems: Array<{ key: VisibleTabKey; label: string; icon: React.ReactNode }> = [
    { key: "home", label: "Accueil", icon: <Home size={18} /> },
    { key: "envies", label: "Envies", icon: <Flame size={18} /> },
    { key: "match", label: "Matchs", icon: <Sparkles size={18} /> },
    { key: "chat", label: "Chat", icon: <MessageCircle size={18} /> },
    { key: "couple", label: "Nous", icon: <Heart size={18} /> },
    { key: "profil", label: "Profil", icon: <User size={18} /> },
    { key: "debug", label: "Debug", icon: <Code2 size={18} /> },
  ];
  const items = showDebug ? allItems : allItems.filter((item) => item.key !== "debug");

  return (
    <View style={styles.tabs}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <SpringPressable key={item.key} onPress={() => onChange(item.key)} style={[styles.tab, isActive && styles.tabActive]}>
            <View style={styles.tabIconWrap}>
              {React.cloneElement(item.icon as React.ReactElement<{ color?: string }>, { color: isActive ? candy.red : candy.text })}
              {item.key === "chat" ? (
                <View
                  style={[
                    styles.tabNotificationBadge,
                    chatNotificationsEnabled && styles.tabNotificationBadgeOn,
                    chatNotificationsEnabled && isActive && styles.tabNotificationBadgeActive,
                  ]}
                >
                  {chatNotificationsEnabled ? (
                    <Bell size={8} color={isActive ? candy.white : candy.red} />
                  ) : (
                    <BellOff size={8} color="rgba(35,18,36,0.55)" />
                  )}
                </View>
              ) : null}
            </View>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.tabText, isActive && styles.tabTextActive]}>
              {item.label}
            </Text>
          </SpringPressable>
        );
      })}
    </View>
  );
}

function EnviesScreen({
  couple,
  focusCategory,
  onAddCustomDesire,
  onUnlockCustomCards,
  onUnlockCategory,
  onUnlockNoAds,
  onUnlockUnlimitedResponses,
  onVote,
}: {
  couple: CoupleState;
  focusCategory: DesireCategory | null;
  onAddCustomDesire: (desire: CustomDesireDraft) => void;
  onUnlockCustomCards: () => void;
  onUnlockCategory: (category: DesireCategory) => void;
  onUnlockNoAds: () => void;
  onUnlockUnlimitedResponses: () => void;
  onVote: (cardId: string, level: VoteLevel) => boolean;
}) {
  const [category, setCategory] = useState<DesireCategory>("Vanille");
  const [filter, setFilter] = useState<DesireFilterKey>("todo");
  const [editorOpen, setEditorOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [libraryCardIds, setLibraryCardIds] = useState<string[]>([]);
  const [gameTransitionCardId, setGameTransitionCardId] = useState<string | null>(null);
  const [exitingGameCardId, setExitingGameCardId] = useState<string | null>(null);
  const [gameBurstNonce, setGameBurstNonce] = useState(0);
  const [gameBurstVoteLevel, setGameBurstVoteLevel] = useState<VoteLevel>(2);
  const [purchaseCategory, setPurchaseCategory] = useState<DesireCategory | null>(null);
  const [customPurchaseOpen, setCustomPurchaseOpen] = useState(false);
  const [noAdsPurchaseOpen, setNoAdsPurchaseOpen] = useState(false);
  const [unlimitedPurchaseOpen, setUnlimitedPurchaseOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const gameTransitionTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const ownVotes = couple.votes[couple.activePartnerId] ?? {};
  const [answeredInSession, setAnsweredInSession] = useState<Record<string, boolean>>({});
  const allCards = useMemo(() => allDesireCards(couple), [couple]);
  const categoryCards = useMemo(() => allCards.filter((card) => card.category === category), [allCards, category]);
  const unansweredCards = useMemo(
    () => categoryCards.filter((card) => ownVotes[card.id] === undefined),
    [categoryCards, ownVotes],
  );
  const filterCounts = useMemo<Record<DesireFilterKey, number>>(() => ({
    todo: unansweredCards.length,
    flame: categoryCards.filter((card) => isFlameVote(ownVotes[card.id])).length,
    curious: categoryCards.filter((card) => ownVotes[card.id] === 1).length,
    matches: categoryCards.filter((card) => isCardMatch(couple, card.id)).length,
  }), [categoryCards, couple, ownVotes, unansweredCards.length]);
  const buildLibraryCardIds = useCallback((nextCategory: DesireCategory, nextFilter: DesireFilterKey) => allCards.filter((card) => {
    if (card.category !== nextCategory) {
      return false;
    }

    const vote = ownVotes[card.id];

    if (nextFilter === "todo") {
      return vote === undefined;
    }
    if (nextFilter === "flame") {
      return isFlameVote(vote);
    }
    if (nextFilter === "curious") {
      return vote === 1;
    }

    return isCardMatch(couple, card.id);
  }).map((card) => card.id), [allCards, couple, ownVotes]);
  const libraryCardLookup = useMemo(() => new Map(categoryCards.map((card) => [card.id, card])), [categoryCards]);
  const libraryCards = useMemo(
    () => libraryCardIds
      .map((cardId) => libraryCardLookup.get(cardId))
      .filter((card): card is DesireCard => Boolean(card)),
    [libraryCardIds, libraryCardLookup],
  );
  const gameCards = useMemo(() => categoryCards.filter((card) => {
    if (answeredInSession[card.id]) {
      return false;
    }

    return ownVotes[card.id] === undefined || card.id === gameTransitionCardId;
  }), [answeredInSession, categoryCards, gameTransitionCardId, ownVotes]);
  const activeGameCard = gameCards[0];
  const customCount = customDesireCount(couple);
  const customUnlimited = hasCustomCardsUnlimited(couple);
  const customSlotsLeft = customDesireSlotsLeft(couple);
  const canCreateCustom = customUnlimited || customSlotsLeft > 0;
  const unlimitedResponses = hasUnlimitedResponses(couple);
  const dailyLeft = dailyResponsesLeft(couple, couple.activePartnerId);
  const dailyQuotaLabel = unlimitedResponses ? "Réponses illimitées" : `${dailyLeft}/${DAILY_FREE_RESPONSE_LIMIT} choix restants`;
  const openCustomDesire = () => (canCreateCustom ? setEditorOpen(true) : setStoreOpen(true));
  const refreshLibrarySnapshot = useCallback((nextCategory = category, nextFilter = filter) => {
    setLibraryCardIds(buildLibraryCardIds(nextCategory, nextFilter));
  }, [buildLibraryCardIds, category, filter]);
  const openLibrary = () => {
    refreshLibrarySnapshot();
    setLibraryOpen(true);
  };
  const closeLibrary = () => setLibraryOpen(false);
  const clearGameTransitionTimers = () => {
    gameTransitionTimers.current.forEach((timer) => clearTimeout(timer));
    gameTransitionTimers.current = [];
  };
  const changeCategory = (nextCategory: DesireCategory) => {
    setCategory(nextCategory);
    if (libraryOpen) {
      refreshLibrarySnapshot(nextCategory, filter);
    }
  };
  const changeFilter = (nextFilter: DesireFilterKey) => {
    setFilter(nextFilter);
    if (libraryOpen) {
      refreshLibrarySnapshot(category, nextFilter);
    }
  };
  const voteInGame = (cardId: string, level: VoteLevel) => {
    if (gameTransitionCardId) {
      return;
    }

    const accepted = onVote(cardId, level);
    if (!accepted) {
      return;
    }

    setGameTransitionCardId(cardId);
    setGameBurstVoteLevel(level);

    const exitTimer = setTimeout(() => {
      setExitingGameCardId(cardId);
      setGameBurstNonce((current) => current + 1);
    }, GAME_CARD_SETTLE_MS);
    const nextTimer = setTimeout(() => {
      setAnsweredInSession((current) => ({ ...current, [cardId]: true }));
      setExitingGameCardId(null);
      setGameTransitionCardId(null);
      gameTransitionTimers.current = gameTransitionTimers.current.filter((timer) => timer !== exitTimer && timer !== nextTimer);
    }, GAME_CARD_TOTAL_TRANSITION_MS);

    gameTransitionTimers.current.push(exitTimer, nextTimer);
  };
  const addDesireButton = (
    <SpringPressable
      onPress={openCustomDesire}
      style={[styles.addDesireButton, !canCreateCustom && styles.addDesireButtonLocked]}
    >
      <Text style={styles.addDesireText}>
        {canCreateCustom ? "+ Carte perso" : "Cartes perso"}
      </Text>
      <Text style={styles.addDesireLimitText}>
        {customUnlimited ? "Illimité actif" : `${customCount}/${CUSTOM_CARD_FREE_LIMIT} gratuites`}
      </Text>
      <View style={styles.addDesireIcon}>
        <Text style={styles.addDesireIconText}>{canCreateCustom ? "✎" : "🔐"}</Text>
      </View>
    </SpringPressable>
  );

  useEffect(() => {
    if (focusCategory) {
      setCategory(focusCategory);
      if (libraryOpen) {
        refreshLibrarySnapshot(focusCategory, filter);
      }
    }
  }, [filter, focusCategory, libraryOpen, refreshLibrarySnapshot]);

  useEffect(() => {
    clearGameTransitionTimers();
    setGameTransitionCardId(null);
    setExitingGameCardId(null);
    setAnsweredInSession({});
  }, [category, couple.activePartnerId]);

  useEffect(() => {
    if (libraryOpen) {
      refreshLibrarySnapshot(category, filter);
    }
  }, [category, couple.activePartnerId, filter, libraryOpen, refreshLibrarySnapshot]);

  useEffect(() => () => clearGameTransitionTimers(), []);

  return (
    <>
      <View style={styles.enviesScreenFrame}>
        <View pointerEvents="box-none" style={styles.enviesStickyHeader}>
          <LinearGradient
            colors={["rgba(255,139,200,0.96)", "rgba(255,139,200,0.72)", "rgba(255,139,200,0)"]}
            pointerEvents="none"
            style={styles.enviesStickyFade}
          />
          <Entrance delay={0} style={styles.enviesStickyContent}>
            {!libraryOpen ? (
              <View style={styles.enviesTopGameBar}>
                <View style={styles.enviesTopGameCopy}>
                  <View style={styles.enviesTopGameLabelRow}>
                    <Text style={styles.enviesGameEyebrow}>Mode jeu</Text>
                    <Text style={styles.enviesTopGameHint}>
                      {activeGameCard ? dailyQuotaLabel : "Pack terminé"}
                    </Text>
                  </View>
                  <Text style={styles.enviesGameTitle}>Une carte à la fois</Text>
                </View>
                <SpringPressable onPress={openLibrary} style={styles.enviesLibraryButton}>
                  <Text style={styles.enviesLibraryButtonText}>Voir toutes</Text>
                </SpringPressable>
              </View>
            ) : null}
            <CategoryChips
              active={category}
              couple={couple}
              onChange={changeCategory}
              onLockedCategory={() => setStoreOpen(true)}
            />
            {libraryOpen ? (
              <DesireFilterChips
                active={filter}
                counts={filterCounts}
                onChange={changeFilter}
              />
            ) : null}
          </Entrance>
        </View>

        {libraryOpen ? (
          <ScrollView contentContainerStyle={[styles.screen, styles.enviesScreenContent]} showsVerticalScrollIndicator={false}>
            <View style={styles.libraryHeader}>
              <View style={styles.libraryHeaderCopy}>
                <Text style={styles.libraryEyebrow}>{categoryLabel(category)}</Text>
                <Text style={styles.libraryTitle}>Toutes les cartes</Text>
                <Text style={styles.libraryText}>
                  {libraryCards.length} envie{libraryCards.length > 1 ? "s" : ""} dans ce filtre.
                </Text>
              </View>
              <SpringPressable onPress={closeLibrary} style={styles.libraryBackButton}>
                <Text style={styles.libraryBackText}>Retour au jeu</Text>
              </SpringPressable>
            </View>
            <View style={styles.cardStack}>
              {libraryCards.map((card, index) => (
                <Entrance delay={70 + index * 70} key={card.id}>
                  <DesireCandyCard card={card} couple={couple} onVote={onVote} />
                </Entrance>
              ))}
            </View>
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={[styles.screen, styles.enviesGameContent]} showsVerticalScrollIndicator={false}>
            <View style={styles.gameCardBurstHost}>
              {activeGameCard ? (
                <GameCardTransition
                  exiting={exitingGameCardId === activeGameCard.id}
                  key={activeGameCard.id}
                >
                  <DesireGameCard
                    card={activeGameCard}
                    disabled={Boolean(gameTransitionCardId)}
                    selectedVote={ownVotes[activeGameCard.id]}
                    onVote={voteInGame}
                  />
                </GameCardTransition>
              ) : (
                <Entrance delay={80}>
                  <EnviesGameEmpty
                    category={category}
                    onOpenLibrary={openLibrary}
                    onOpenCustomDesire={openCustomDesire}
                  />
                </Entrance>
              )}
              <PersistentBurstLayer triggerKey={gameBurstNonce} voteLevel={gameBurstVoteLevel} />
            </View>
          </ScrollView>
        )}
        <View pointerEvents="box-none" style={styles.addDesireFloatingDock}>
          <Entrance delay={120}>{addDesireButton}</Entrance>
        </View>
      </View>

      <CustomDesireEditor
        customCount={customCount}
        customUnlimited={customUnlimited}
        onClose={() => setEditorOpen(false)}
        onSave={(desire) => {
          onAddCustomDesire(desire);
          setCategory(desire.category);
          closeLibrary();
          setEditorOpen(false);
        }}
        visible={editorOpen}
      />
      <CustomCardsPurchaseModal
        customCount={customCount}
        onClose={() => setCustomPurchaseOpen(false)}
        onUnlock={() => {
          onUnlockCustomCards();
          setCustomPurchaseOpen(false);
          setEditorOpen(true);
        }}
        visible={customPurchaseOpen}
      />
      <CategoryPurchaseModal
        category={purchaseCategory}
        onClose={() => setPurchaseCategory(null)}
        onUnlock={(nextCategory) => {
          onUnlockCategory(nextCategory);
          setCategory(nextCategory);
          setPurchaseCategory(null);
          setStoreOpen(false);
        }}
      />
      <StoreScreen
        couple={couple}
        onClose={() => setStoreOpen(false)}
        onGoEnvies={() => setStoreOpen(false)}
        onOpenCustomPack={() => setCustomPurchaseOpen(true)}
        onOpenNoAds={() => setNoAdsPurchaseOpen(true)}
        onOpenUnlimitedResponses={() => setUnlimitedPurchaseOpen(true)}
        onOpenPack={setPurchaseCategory}
        visible={storeOpen}
      />
      <NoAdsPurchaseModal
        onClose={() => setNoAdsPurchaseOpen(false)}
        onUnlock={() => {
          onUnlockNoAds();
          setNoAdsPurchaseOpen(false);
          setStoreOpen(false);
        }}
        visible={noAdsPurchaseOpen}
      />
      <UnlimitedResponsesPurchaseModal
        dailyUsed={dailyResponseCount(couple, couple.activePartnerId)}
        onClose={() => setUnlimitedPurchaseOpen(false)}
        onUnlock={() => {
          onUnlockUnlimitedResponses();
          setUnlimitedPurchaseOpen(false);
          setStoreOpen(false);
        }}
        visible={unlimitedPurchaseOpen}
      />
    </>
  );
}

function CustomDesireEditor({
  customCount,
  customUnlimited,
  onClose,
  onSave,
  visible,
}: {
  customCount: number;
  customUnlimited: boolean;
  onClose: () => void;
  onSave: (desire: CustomDesireDraft) => void;
  visible: boolean;
}) {
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [emoji, setEmoji] = useState(() => randomCustomDesireEmoji());
  const cleanTitle = title.trim();
  const cleanBlurb = blurb.trim();
  const previewEmoji = normalizeEmoji(emoji, stickers.heart);
  const canSave = cleanTitle.length >= 3 && cleanBlurb.length >= 8;

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTitle("");
    setBlurb("");
    setEmoji(randomCustomDesireEmoji());
  }, [visible]);

  function save() {
    if (!canSave) {
      void Haptics.selectionAsync();
      return;
    }

    onSave({
      title: cleanTitle.slice(0, 70),
      blurb: cleanBlurb.slice(0, 150),
      category: PERSONAL_CATEGORY,
      emoji: previewEmoji,
    });
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.editorOverlay}>
        <Pressable style={styles.editorBackdrop} onPress={onClose} />
        <View style={styles.editorSheet}>
          <View style={styles.editorHandle} />
          <View style={styles.editorHeader}>
            <View style={styles.editorHeaderCopy}>
              <Text style={styles.editorEyebrow}>Envie perso</Text>
              <Text style={styles.editorTitle}>Ajouter votre propre carte</Text>
              <Text style={styles.editorIntro}>Elle sera rangée dans la catégorie Perso.</Text>
              <Text style={styles.editorQuota}>
                {customUnlimited ? "Pack illimité actif" : `${Math.min(customCount, CUSTOM_CARD_FREE_LIMIT)}/${CUSTOM_CARD_FREE_LIMIT} cartes gratuites utilisées`}
              </Text>
            </View>
            <SpringPressable onPress={onClose} style={styles.editorCloseButton}>
              <X size={18} color={candy.red} />
            </SpringPressable>
          </View>

          <View style={styles.editorIconField}>
            <View style={styles.editorIconPreview}>
              <Text style={styles.editorIconPreviewEmoji}>{previewEmoji}</Text>
            </View>
            <View style={styles.editorIconCopy}>
              <Text style={styles.editorLabel}>Icône de la carte</Text>
              <TextInput
                maxLength={8}
                onChangeText={setEmoji}
                placeholder="🍑"
                placeholderTextColor="rgba(59,23,55,0.38)"
                style={styles.editorEmojiInput}
                value={emoji}
              />
              <View style={styles.editorEmojiPresetRow}>
                {customDesireEmojiPresets.map((preset) => {
                  const active = previewEmoji === preset;
                  return (
                    <SpringPressable
                      key={preset}
                      onPress={() => setEmoji(preset)}
                      style={[styles.editorEmojiPreset, active && styles.editorEmojiPresetActive]}
                    >
                      <Text style={styles.editorEmojiPresetText}>{preset}</Text>
                    </SpringPressable>
                  );
                })}
              </View>
            </View>
          </View>

          <View style={styles.editorField}>
            <Text style={styles.editorLabel}>Titre</Text>
            <TextInput
              maxLength={70}
              onChangeText={setTitle}
              placeholder="Ex: Bain moussant interdit"
              placeholderTextColor="rgba(59,23,55,0.46)"
              style={styles.editorInput}
              value={title}
            />
          </View>

          <View style={styles.editorField}>
            <Text style={styles.editorLabel}>Phrase courte</Text>
            <TextInput
              maxLength={150}
              multiline
              onChangeText={setBlurb}
              placeholder="Une phrase claire, concrète, qui donne envie."
              placeholderTextColor="rgba(59,23,55,0.46)"
              style={[styles.editorInput, styles.editorTextArea]}
              value={blurb}
            />
          </View>

          <View style={styles.editorField}>
            <Text style={styles.editorLabel}>Rangement</Text>
            <View style={styles.editorPersonalCategory}>
              <Text style={styles.editorPersonalEmoji}>💭</Text>
              <View style={styles.editorPersonalCopy}>
                <Text style={styles.editorPersonalTitle}>Catégorie Perso</Text>
                <Text style={styles.editorPersonalText}>Vos cartes perso restent séparées des packs officiels.</Text>
              </View>
            </View>
          </View>

          <View style={styles.editorStorageHint}>
            <LockKeyhole size={14} color={candy.red} />
            <Text style={styles.editorStorageHintText}>L'icône et le texte sont sauvegardés ensemble. Les votes restent séparés.</Text>
          </View>

          <View style={styles.editorActions}>
            <SpringPressable onPress={onClose} style={styles.editorSecondaryButton}>
              <Text style={styles.editorSecondaryText}>Annuler</Text>
            </SpringPressable>
            <SpringPressable onPress={save} style={[styles.editorPrimaryButton, !canSave && styles.editorPrimaryButtonDisabled]}>
              <Text style={styles.editorPrimaryText}>Créer la carte</Text>
            </SpringPressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function HeroPanel({ onOpenRules }: { onOpenRules?: () => void }) {
  return (
    <LinearGradient colors={[candy.roseMist, candy.pinkSoft, candy.pink]} style={styles.heroPanel}>
      <EmojiSticker emoji={stickers.wand} size={70} style={styles.heroWand} />
      <EmojiSticker emoji={stickers.cherries} size={92} style={styles.heroCherries} />
      <EmojiSticker emoji={stickers.heart} size={54} style={styles.heroHeart} />
      <Text style={styles.heroEyebrow}>Mode secret</Text>
      <Text style={styles.heroTitle}>Envies secrètes</Text>
      <Text style={styles.heroCopy}>
        Réponds pour toi. Une envie ne s'affiche que si vous la choisissez tous les deux.
      </Text>
      <View style={styles.heroActions}>
        <View style={styles.privatePill}>
          <LockKeyhole size={16} color={candy.white} />
          <Text style={styles.privatePillText}>Privé</Text>
        </View>
        <SpringPressable onPress={onOpenRules} style={styles.howButton}>
          <Text style={styles.howButtonText}>Voir les règles</Text>
          <ChevronRight size={17} color={candy.black} />
        </SpringPressable>
      </View>
    </LinearGradient>
  );
}

function MoodWidget({
  couple,
  onChange,
  onNotificationPreference,
}: {
  couple: CoupleState;
  onChange: (level: CoupleMoodLevel) => void;
  onNotificationPreference: (enabled: boolean) => void;
}) {
  const [notificationPromptVisible, setNotificationPromptVisible] = useState(false);
  const activeId = couple.activePartnerId;
  const partnerId = otherPartnerId(activeId);
  const activeLevel = moodLevel(couple, activeId);
  const partnerLevel = moodLevel(couple, partnerId);
  const partnerName = couple.profiles[partnerId].displayName;
  const aligned = isMoodAligned(couple);
  const sharedHotMood = activeLevel >= 2 && partnerLevel >= 2;
  const notificationsEnabled = isMoodNotificationEnabled(couple, activeId);
  const promptSeen = hasSeenMoodNotificationPrompt(couple, activeId);
  const statusMessage = aligned
    ? sharedHotMood
      ? `${partnerName} est dans le même élan.`
      : `Même état que ${partnerName}.`
    : "Ton choix reste privé tant qu'il ne croise pas le sien.";
  const heatProgress = useRef(new Animated.Value(activeLevel)).current;
  const glowPulse = useLoop(2600);

  useEffect(() => {
    Animated.timing(heatProgress, {
      toValue: activeLevel,
      duration: 560,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [activeLevel, heatProgress]);

  const glowOpacity = heatProgress.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0.02, 0.14, 0.28, 0.42],
    extrapolate: "clamp",
  });
  const hotGlowOpacity = heatProgress.interpolate({
    inputRange: [0, 1.4, 2.2, 3],
    outputRange: [0, 0, 0.14, 0.28],
    extrapolate: "clamp",
  });
  const glowScale = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.992, 1.018] });

  function selectMood(level: CoupleMoodLevel) {
    onChange(level);

    if (!promptSeen && level > 0) {
      setNotificationPromptVisible(true);
    }
  }

  function chooseNotificationPreference(enabled: boolean) {
    onNotificationPreference(enabled);
    setNotificationPromptVisible(false);
  }

  return (
    <View style={styles.moodWidgetShell}>
      <Animated.View
        pointerEvents="none"
        style={[styles.moodOuterGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
      />
      <Animated.View
        pointerEvents="none"
        style={[styles.moodOuterGlowHot, { opacity: hotGlowOpacity, transform: [{ scale: glowScale }] }]}
      />
      <LinearGradient colors={["rgba(255,255,255,0.9)", "#FFE4F3"]} style={styles.moodWidget}>
        <MoodAtmosphere heat={heatProgress} pulse={glowPulse} />
        <View style={styles.moodWidgetContent}>
          <View style={styles.moodWidgetHeader}>
            <View style={styles.moodWidgetCopy}>
              <Text style={styles.moodWidgetTitle}>Tu te sens comment ?</Text>
              <Text style={styles.moodWidgetText}>{statusMessage}</Text>
            </View>
            <SpringPressable
              onPress={() => setNotificationPromptVisible(true)}
              style={[styles.moodBellButton, notificationsEnabled && styles.moodBellButtonEnabled]}
            >
              {notificationsEnabled ? (
                <Bell size={18} color={candy.white} />
              ) : (
                <BellOff size={18} color={candy.red} />
              )}
            </SpringPressable>
          </View>

          <View style={styles.moodToggleRow}>
            {moodOptions.map((option) => {
              const selected = option.level === activeLevel;

              return (
                <SpringPressable
                  key={option.level}
                  onPress={() => selectMood(option.level)}
                  style={[styles.moodToggle, selected && styles.moodToggleSelected, aligned && selected && styles.moodToggleSelectedLit]}
                >
                  <Text style={styles.moodToggleEmoji}>{option.emoji}</Text>
                  <Text style={[styles.moodToggleLabel, selected && styles.moodToggleLabelSelected]}>{option.label}</Text>
                </SpringPressable>
              );
            })}
          </View>
        </View>
      </LinearGradient>
      <MoodNotificationPrompt
        enabled={notificationsEnabled}
        partnerName={partnerName}
        visible={notificationPromptVisible}
        onChoose={chooseNotificationPreference}
      />
    </View>
  );
}

function MoodNotificationPrompt({
  enabled,
  partnerName,
  visible,
  onChoose,
}: {
  enabled: boolean;
  partnerName: string;
  visible: boolean;
  onChoose: (enabled: boolean) => void;
}) {
  const title = enabled ? "Alertes activées" : "Recevoir une alerte ?";
  const text = enabled
    ? `Tu recevras une alerte quand ton état rejoint celui de ${partnerName}. Un choix isolé reste privé.`
    : `On peut te prévenir seulement quand ton état rejoint celui de ${partnerName}. Rien n'est envoyé si ce choix reste de ton côté.`;

  return (
    <Modal animationType="fade" transparent visible={visible}>
      <View style={styles.moodNotificationOverlay}>
        <View style={styles.moodNotificationBackdrop} />
        <Entrance delay={40} style={styles.moodNotificationSheetWrap}>
          <LinearGradient colors={["#FF1F65", "#FF4FA0", "#FFC0DD"]} style={styles.moodNotificationSheet}>
            <EmojiSticker emoji={stickers.sparkles} size={76} style={styles.moodNotificationSparkle} />
            <View style={styles.moodNotificationIcon}>
              {enabled ? <Bell size={28} color={candy.white} /> : <BellOff size={28} color={candy.white} />}
            </View>
            <Text style={styles.moodNotificationTitle}>{title}</Text>
            <Text style={styles.moodNotificationText}>{text}</Text>
            <View style={styles.moodNotificationActions}>
              <SpringPressable onPress={() => onChoose(true)} style={styles.moodNotificationPrimary}>
                <Text style={styles.moodNotificationPrimaryText}>{enabled ? "Garder activé" : "Activer"}</Text>
                <ChevronRight size={19} color={candy.red} />
              </SpringPressable>
              <SpringPressable onPress={() => onChoose(false)} style={styles.moodNotificationSecondary}>
                <Text style={styles.moodNotificationSecondaryText}>{enabled ? "Désactiver" : "Pas maintenant"}</Text>
              </SpringPressable>
            </View>
          </LinearGradient>
        </Entrance>
      </View>
    </Modal>
  );
}

function MoodAtmosphere({ heat, pulse }: { heat: Animated.Value; pulse: Animated.Value }) {
  const blushOpacity = heat.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0.04, 0.18, 0.34, 0.48],
    extrapolate: "clamp",
  });
  const emberOpacity = heat.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 0.08, 0.28, 0.46],
    extrapolate: "clamp",
  });
  const rimOpacity = heat.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 0.12, 0.34, 0.56],
    extrapolate: "clamp",
  });
  const shimmerOpacity = heat.interpolate({
    inputRange: [0, 1, 2, 3],
    outputRange: [0, 0.08, 0.16, 0.24],
    extrapolate: "clamp",
  });
  const emberLift = pulse.interpolate({ inputRange: [0, 1], outputRange: [8, -8] });
  const emberLiftSlow = pulse.interpolate({ inputRange: [0, 1], outputRange: [3, -12] });
  const emberDrift = pulse.interpolate({ inputRange: [0, 1], outputRange: [-8, 10] });
  const emberDriftAlt = pulse.interpolate({ inputRange: [0, 1], outputRange: [12, -6] });
  const emberScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1.06] });
  const shimmerX = pulse.interpolate({ inputRange: [0, 1], outputRange: [-46, 46] });
  const rimScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.995, 1.012] });

  return (
    <View pointerEvents="none" style={styles.moodAtmosphere}>
      <Animated.View style={[styles.moodGradientLayer, { opacity: blushOpacity }]}>
        <LinearGradient
          colors={["rgba(255,255,255,0.08)", "rgba(255,182,212,0.52)", "rgba(255,79,160,0.34)"]}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.moodGradientFill}
        />
      </Animated.View>
      <Animated.View style={[styles.moodGradientLayer, { opacity: emberOpacity }]}>
        <LinearGradient
          colors={["rgba(255,36,95,0)", "rgba(255,36,95,0.42)", "rgba(255,139,200,0.58)"]}
          end={{ x: 0.5, y: 1 }}
          start={{ x: 0.5, y: 0 }}
          style={styles.moodGradientFill}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.moodEmberPool,
          styles.moodEmberPoolLeft,
          {
            opacity: emberOpacity,
            transform: [{ translateX: emberDrift }, { translateY: emberLift }, { scale: emberScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.moodEmberPool,
          styles.moodEmberPoolRight,
          {
            opacity: emberOpacity,
            transform: [{ translateX: emberDriftAlt }, { translateY: emberLiftSlow }, { scale: emberScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.moodHeatRim,
          {
            opacity: rimOpacity,
            transform: [{ scale: rimScale }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.moodShimmer,
          {
            opacity: shimmerOpacity,
            transform: [{ translateX: shimmerX }, { rotate: "-12deg" }],
          },
        ]}
      />
    </View>
  );
}

function CategoryChips({
  active,
  couple,
  onChange,
  onLockedCategory,
}: {
  active: DesireCategory;
  couple: CoupleState;
  onChange: (category: DesireCategory) => void;
  onLockedCategory: (category: DesireCategory) => void;
}) {
  return (
    <View style={styles.categoryBar}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow} style={styles.categoryScroll}>
      {DESIRE_CATEGORIES.map((category) => {
        const tone = categoryTone(category);
        const isActive = category === active;
        const unlocked = isCategoryUnlocked(couple, category);
        return (
          <SpringPressable
            key={category}
            onPress={() => (unlocked ? onChange(category) : onLockedCategory(category))}
            style={[
              styles.categoryChip,
              {
                backgroundColor: isActive && unlocked ? tone.active : tone.bg,
              },
              isActive && styles.categoryChipActive,
              !unlocked && styles.categoryChipLocked,
              categoryChipShadow(category, isActive && unlocked, unlocked),
            ]}
          >
            <Text
              style={[
                styles.categoryChipText,
                isActive && unlocked && styles.categoryChipTextActive,
                { color: categoryChipTextColor(category, isActive, unlocked) },
              ]}
            >
              {categoryLabel(category)}
            </Text>
            {!unlocked ? <Text style={styles.categoryChipLock}>🔒</Text> : null}
          </SpringPressable>
        );
      })}
      </ScrollView>
    </View>
  );
}

function DesireFilterChips({
  active,
  counts,
  onChange,
}: {
  active: DesireFilterKey;
  counts: Record<DesireFilterKey, number>;
  onChange: (filter: DesireFilterKey) => void;
}) {
  return (
    <View style={styles.desireFilterRow}>
      {desireFilterOptions.map((option) => {
        const selected = option.key === active;

        return (
          <SpringPressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.desireFilterChip, selected && styles.desireFilterChipActive]}
          >
            <Text style={[styles.desireFilterText, selected && styles.desireFilterTextActive]}>{option.label}</Text>
            <Text style={[styles.desireFilterCount, selected && styles.desireFilterCountActive]}>{counts[option.key]}</Text>
          </SpringPressable>
        );
      })}
    </View>
  );
}

function CardPattern({ emoji }: { emoji: string }) {
  const rows = [
    { opacity: 0.28, top: "5%" },
    { opacity: 0.22, top: "30%" },
    { opacity: 0.15, top: "55%" },
    { opacity: 0.08, top: "80%" },
  ] as const;
  const columns = [-6, 17, 40, 63, 86, 109];
  const rotations = ["-10deg", "8deg", "-4deg", "12deg", "-8deg", "5deg"];

  return (
    <View pointerEvents="none" style={styles.cardPatternLayer}>
      {rows.map((row, rowIndex) => (
        columns.map((column, index) => (
          <Text
            key={`${emoji}-${rowIndex}-${index}`}
            style={[
              styles.cardPatternEmoji,
              {
                left: `${column + (rowIndex % 2 ? 11 : 0)}%`,
                opacity: row.opacity,
                top: row.top,
                transform: [{ rotate: rotations[(rowIndex + index) % rotations.length] }],
              },
            ]}
          >
            {emoji}
          </Text>
        ))
      ))}
    </View>
  );
}

function DesireCandyCard({
  card,
  couple,
  onVote,
}: {
  card: DesireCard;
  couple: CoupleState;
  onVote: (cardId: string, level: VoteLevel) => void;
}) {
  const ownVote = couple.votes[couple.activePartnerId][card.id];
  const tone = categoryCardTone(card.category);

  return (
    <LinearGradient colors={tone.colors} style={styles.desireCard} testID={`desire-card-${card.id}`}>
      <CardPattern emoji={tone.patternEmoji} />
      <EmojiSticker emoji={cardStickerEmoji(card)} size={88} style={styles.cardSticker} />
      <View style={styles.desireCopy}>
        <CardMetaCluster category={card.category} compact status={cardResponseStatusLabel(ownVote)} />
        <Text numberOfLines={2} style={[styles.cardTitle, { color: tone.titleText }]}>
          {card.title}
        </Text>
        <Text numberOfLines={2} style={[styles.cardText, { color: tone.bodyText }]}>{card.blurb}</Text>
      </View>

      <View style={styles.voteRow}>
        <VoteButton label="Non" onPress={() => onVote(card.id, 0)} selected={ownVote === 0} testID={`vote-${card.id}-0`} />
        <VoteButton label="Pourquoi pas" onPress={() => onVote(card.id, 1)} selected={ownVote === 1} testID={`vote-${card.id}-1`} />
        <VoteButton accent={tone.accent} flame onPress={() => onVote(card.id, 2)} selected={isFlameVote(ownVote)} testID={`vote-${card.id}-2`} />
      </View>
    </LinearGradient>
  );
}

type BurstInstance = {
  id: string;
  voteLevel: VoteLevel;
};

function HeartBurst({ burstKey, voteLevel = 2 }: { burstKey: number | string; voteLevel?: VoteLevel }) {
  const progress = useRef(new Animated.Value(0)).current;
  const particles = responseBurstParticles[voteLevel] ?? responseBurstParticles[2] ?? [];
  const shadowColor =
    voteLevel === 0
      ? "rgba(35,18,36,0.22)"
      : voteLevel === 1
        ? "rgba(255,36,95,0.24)"
        : "rgba(255,36,95,0.34)";

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      duration: HEART_BURST_MS,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [burstKey, progress]);

  return (
    <View pointerEvents="none" style={styles.heartBurstLayer}>
      {particles.map((particle, index) => (
        <Animated.Text
          key={`${burstKey}-${index}`}
          style={[
            styles.heartBurstParticle,
            {
              fontSize: particle.size,
              textShadowColor: shadowColor,
              opacity: progress.interpolate({
                inputRange: [0, 0.05, 0.78, 1],
                outputRange: [0, 1, 0.92, 0],
              }),
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 0.22, 0.78, 1],
                    outputRange: [0, particle.x * 0.58, particle.x + particle.floatX, particle.x + particle.floatX * 0.42],
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 0.18, 0.78, 1],
                    outputRange: [0, particle.y * 0.26, particle.y * 0.84, particle.y],
                  }),
                },
                {
                  scale: progress.interpolate({
                    inputRange: [0, 0.12, 0.72, 1],
                    outputRange: [0.34, 1.2, 1.08, 0.84],
                  }),
                },
                { rotate: particle.rotate },
              ],
            },
          ]}
        >
          {particle.emoji}
        </Animated.Text>
      ))}
    </View>
  );
}

function PersistentBurstLayer({
  triggerKey,
  voteLevel,
}: {
  triggerKey: number;
  voteLevel: VoteLevel;
}) {
  const [bursts, setBursts] = useState<BurstInstance[]>([]);
  const lastTrigger = useRef(triggerKey);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  useEffect(() => () => {
    timers.current.forEach((timer) => clearTimeout(timer));
    timers.current = [];
  }, []);

  useEffect(() => {
    if (triggerKey === 0 || triggerKey === lastTrigger.current) {
      return;
    }

    lastTrigger.current = triggerKey;
    const id = `${triggerKey}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setBursts((current) => [...current, { id, voteLevel }]);

    const timer = setTimeout(() => {
      setBursts((current) => current.filter((burst) => burst.id !== id));
      timers.current = timers.current.filter((item) => item !== timer);
    }, HEART_BURST_MS + 180);

    timers.current.push(timer);
  }, [triggerKey, voteLevel]);

  return (
    <View pointerEvents="none" style={styles.persistentBurstLayer}>
      {bursts.map((burst) => (
        <HeartBurst burstKey={burst.id} key={burst.id} voteLevel={burst.voteLevel} />
      ))}
    </View>
  );
}

function GameCardTransition({
  children,
  exiting,
}: {
  children: React.ReactNode;
  exiting: boolean;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      duration: 280,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [entrance]);

  useEffect(() => {
    if (!exiting) {
      exit.setValue(0);
      return;
    }

    Animated.sequence([
      Animated.timing(exit, {
        duration: 260,
        easing: Easing.in(Easing.cubic),
        toValue: 0.72,
        useNativeDriver: useNativeAnimations,
      }),
      Animated.timing(exit, {
        duration: 160,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: useNativeAnimations,
      }),
    ]).start();
  }, [exit, exiting]);

  const exitOpacity = exit.interpolate({
    inputRange: [0, 0.72, 0.86, 1],
    outputRange: [1, 1, 0.34, 0],
  });
  const exitScale = exit.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [1, 0.4, 0.5],
  });
  const exitRotate = exit.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: ["0deg", "-1deg", "4deg"],
  });

  return (
    <View style={[styles.gameCardTransitionHost, exiting ? styles.gameCardTransitionHostExiting : styles.gameCardTransitionHostEntering]}>
      <Animated.View
        style={{
          opacity: exiting ? exitOpacity : entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
            {
              scale: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [0.96, 1],
              }),
            },
            { scale: exitScale },
            { rotate: exitRotate },
          ],
        }}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function DesireGameCard({
  card,
  disabled,
  selectedVote,
  onVote,
}: {
  card: DesireCard;
  disabled?: boolean;
  selectedVote?: VoteLevel;
  onVote: (cardId: string, level: VoteLevel) => void;
}) {
  const tone = categoryCardTone(card.category);

  return (
    <LinearGradient colors={tone.colors} style={styles.desireGameCard} testID={`desire-game-card-${card.id}`}>
      <CardPattern emoji={tone.patternEmoji} />
      <EmojiSticker emoji={cardStickerEmoji(card)} size={138} style={styles.desireGameSticker} />
      <View style={styles.desireGameTopRow}>
        <CardMetaCluster category={card.category} large status={cardResponseStatusLabel(selectedVote)} />
      </View>
      <View style={styles.desireGameCopy}>
        <Text style={[styles.desireGameTitle, { color: tone.titleText }]}>{card.title}</Text>
        <Text style={[styles.desireGameText, { color: tone.bodyText }]}>{card.blurb}</Text>
      </View>
      <View style={styles.desireGameVoteRow}>
        <VoteButton disabled={disabled} icon="×" label="Non" onPress={() => onVote(card.id, 0)} prominent selected={selectedVote === 0} testID={`game-vote-${card.id}-0`} />
        <VoteButton disabled={disabled} icon="?" label="Pourquoi pas" onPress={() => onVote(card.id, 1)} prominent selected={selectedVote === 1} testID={`game-vote-${card.id}-1`} />
        <VoteButton accent={tone.accent} disabled={disabled} flame onPress={() => onVote(card.id, 2)} prominent selected={isFlameVote(selectedVote)} testID={`game-vote-${card.id}-2`} />
      </View>
    </LinearGradient>
  );
}

function EnviesGameEmpty({
  category,
  onOpenCustomDesire,
  onOpenLibrary,
}: {
  category: DesireCategory;
  onOpenCustomDesire: () => void;
  onOpenLibrary: () => void;
}) {
  return (
    <View style={styles.enviesGameEmpty}>
      <Text style={styles.enviesGameEmptyEmoji}>✨</Text>
      <Text style={styles.enviesGameEmptyTitle}>Pack {categoryLabel(category)} terminé</Text>
      <Text style={styles.enviesGameEmptyText}>
        Tu as répondu à toutes les cartes disponibles ici. Tu peux revoir la bibliothèque ou créer une carte perso.
      </Text>
      <View style={styles.enviesGameEmptyActions}>
        <SpringPressable onPress={onOpenCustomDesire} style={styles.enviesGameEmptyPrimary}>
          <Text style={styles.enviesGameEmptyPrimaryText}>Ajouter une envie</Text>
        </SpringPressable>
        <SpringPressable onPress={onOpenLibrary} style={styles.enviesGameEmptySecondary}>
          <Text style={styles.enviesGameEmptySecondaryText}>Voir la bibliothèque</Text>
        </SpringPressable>
      </View>
    </View>
  );
}

function VoteButton({
  accent,
  disabled,
  flame,
  icon,
  label,
  onPress,
  prominent,
  selected,
  testID,
}: {
  accent?: string;
  disabled?: boolean;
  flame?: boolean;
  icon?: string;
  label?: string;
  onPress: () => void;
  prominent?: boolean;
  selected: boolean;
  testID: string;
}) {
  return (
    <SpringPressable
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.voteButton,
        flame && styles.voteButtonFire,
        flame && accent ? { backgroundColor: accent } : null,
        prominent && styles.voteButtonProminent,
        flame && prominent && styles.voteButtonFireProminent,
        selected && !flame && styles.voteButtonSelected,
        selected && flame && styles.voteButtonFireSelected,
        prominent && selected && !flame && styles.voteButtonProminentSelected,
        prominent && selected && flame && styles.voteButtonFireProminentSelected,
      ]}
      testID={testID}
    >
      {flame ? (
        <Text style={[styles.voteButtonEmoji, prominent && styles.voteButtonEmojiProminent]}>🔥</Text>
      ) : (
        <View style={[styles.voteButtonContent, prominent && styles.voteButtonProminentContent]}>
          {prominent && icon ? (
            <Text style={[styles.voteButtonIcon, selected && styles.voteButtonIconSelected]}>{icon}</Text>
          ) : null}
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.voteButtonText, prominent && styles.voteButtonTextProminent, selected && styles.voteButtonTextSelected]}>
            {label}
          </Text>
        </View>
      )}
    </SpringPressable>
  );
}

function MatchScreen({
  couple,
  revealedMatchIds,
  onGoEnvies,
  onOpenChat,
  onBeforeRevealMatch,
  onRevealMatch,
}: {
  couple: CoupleState;
  revealedMatchIds: string[];
  onGoEnvies: () => void;
  onOpenChat: (cardId?: string) => void;
  onBeforeRevealMatch: (cardId: string) => Promise<boolean>;
  onRevealMatch: (cardId: string) => void;
}) {
  const revealedMatchSet = useMemo(() => new Set(revealedMatchIds), [revealedMatchIds]);
  const matches = useMemo(() => matchedCards(couple), [couple]);
  const hiddenMatches = useMemo(() => matches.filter((card) => !revealedMatchSet.has(card.id)), [matches, revealedMatchSet]);
  const revealedMatches = useMemo(() => matches.filter((card) => revealedMatchSet.has(card.id)), [matches, revealedMatchSet]);
  const newestMatch = hiddenMatches[0] ?? revealedMatches[0] ?? matches[0];
  const [revealingMatchId, setRevealingMatchId] = useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<DesireCard | null>(null);
  const revealAnim = useRef(new Animated.Value(0)).current;
  const hotVotes = useMemo(
    () => allDesireCards(couple).filter((card) => isFlameVote(couple.votes[couple.activePartnerId][card.id])).length,
    [couple],
  );
  const pulse = useLoop(1700);
  const heat = Math.min(1, Math.max(matches.length / 4, hotVotes / 8, 0.15));
  const isNewestRevealed = !newestMatch || revealedMatchSet.has(newestMatch.id);
  const isNewestOpening = Boolean(newestMatch && revealingMatchId === newestMatch.id);
  const hasHiddenReveal = Boolean(newestMatch && !isNewestRevealed);
  const listedMatches = hasHiddenReveal ? revealedMatches : matches;

  useEffect(() => {
    revealAnim.setValue(0);
    setRevealingMatchId(null);
  }, [newestMatch?.id, revealAnim]);

  async function revealNewestMatch() {
    if (!newestMatch || isNewestOpening || isNewestRevealed) {
      return;
    }

    const canReveal = await onBeforeRevealMatch(newestMatch.id);
    if (!canReveal) {
      return;
    }

    setRevealingMatchId(newestMatch.id);
    revealAnim.setValue(0);
    await Haptics.selectionAsync();

    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 1050,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: useNativeAnimations,
    }).start(({ finished }) => {
      if (!finished) {
        return;
      }

      onRevealMatch(newestMatch.id);
      setRevealingMatchId(null);
      setSelectedMatch(newestMatch);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  }

  return (
    <>
      <ScrollView contentContainerStyle={[styles.matchScreen, !matches.length && styles.matchScreenEmptyMode]} showsVerticalScrollIndicator={false}>
        {matches.length ? (
          <LinearGradient colors={[candy.rose, "#FF3F8F", candy.pink]} style={styles.matchStage}>
            <View pointerEvents="none" style={styles.matchStageFx}>
              <EmojiSticker
                animated
                emoji={stickers.flame}
                size={132}
                style={[
                  styles.matchStageFlameRight,
                  {
                    opacity: 0.2 + heat * 0.32,
                    transform: [
                      { translateY: pulse.interpolate({ inputRange: [0, 1], outputRange: [0, -14] }) },
                      { scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) },
                      { rotate: "12deg" },
                    ],
                  },
                ]}
              />
            </View>

            <View style={styles.matchStageTop}>
              <View style={styles.matchCounterPill}>
                <Sparkles size={15} color={candy.red} />
                <Text style={styles.matchCounterText}>{matches.length} match{matches.length > 1 ? "s" : ""} révélé{matches.length > 1 ? "s" : ""}</Text>
              </View>
              <Text style={styles.matchStageKicker}>Envies communes</Text>
            </View>

            <Text style={styles.matchStageTitle}>Vos matchs</Text>
            <Text style={styles.matchStageCopy}>
              {isNewestRevealed
                ? "Cette envie vous tente tous les deux. Vous pouvez en parler ou continuer à découvrir."
                : "Vous avez tous les deux répondu au moins Pourquoi pas sur une carte. Ouvre-la pour voir laquelle."}
            </Text>

            <MatchRevealCard
              couple={couple}
              isOpen={isNewestRevealed}
              isOpening={isNewestOpening}
              match={newestMatch}
              onReveal={revealNewestMatch}
              revealAnim={revealAnim}
            />

            {newestMatch && isNewestRevealed ? (
              <View style={styles.matchActions}>
                <SpringPressable onPress={() => onOpenChat(newestMatch.id)} style={styles.matchActionLight}>
                  <MessageCircle size={16} color={candy.red} />
                  <Text style={styles.matchActionLightText}>En parler dans le chat</Text>
                </SpringPressable>
                <SpringPressable onPress={onGoEnvies} style={styles.matchActionDark}>
                  <Flame size={16} color={candy.white} fill={candy.white} />
                  <Text style={styles.matchActionDarkText}>Répondre à d'autres cartes</Text>
                </SpringPressable>
              </View>
            ) : (
              <Text style={styles.matchRevealSuspenseHint}>La carte reste cachée tant que tu ne l'ouvres pas.</Text>
            )}
          </LinearGradient>
        ) : (
          <View style={styles.matchSimpleEmpty}>
            <Text style={styles.matchSimpleEmptyTitle}>Aucun match pour l'instant</Text>
            <SpringPressable onPress={onGoEnvies} style={styles.matchNoResultCTA}>
              <Flame size={18} color={candy.red} fill={candy.red} />
              <Text style={styles.matchNoResultCTAText}>Répondre à des cartes</Text>
              <ChevronRight size={18} color={candy.red} />
            </SpringPressable>
          </View>
        )}

      {matches.length ? (
        <>
          <View style={styles.matchListHeader}>
            <Text style={styles.matchListTitle}>{hasHiddenReveal ? "Déjà révélés" : "Matchs révélés"}</Text>
            <Text style={styles.matchListCount}>
              {listedMatches.length
                ? `${listedMatches.length} envie${listedMatches.length > 1 ? "s" : ""}`
                : "1 à ouvrir"}
            </Text>
          </View>
          {listedMatches.length ? (
            <View style={styles.matchList}>
              {listedMatches.map((card, index) => (
                <MatchListItem card={card} index={index} key={card.id} onOpen={() => setSelectedMatch(card)} />
              ))}
            </View>
          ) : (
            <HiddenMatchTeaser isOpening={isNewestOpening} onReveal={revealNewestMatch} />
          )}
        </>
      ) : null}
      </ScrollView>
      <MatchDetailModal
        couple={couple}
        match={selectedMatch}
        onClose={() => setSelectedMatch(null)}
        onOpenChat={(cardId) => {
          setSelectedMatch(null);
          onOpenChat(cardId);
        }}
      />
    </>
  );
}

function MatchRevealCard({
  couple,
  isOpen,
  isOpening,
  match,
  onReveal,
  revealAnim,
}: {
  couple: CoupleState;
  isOpen: boolean;
  isOpening: boolean;
  match?: DesireCard;
  onReveal: () => void;
  revealAnim: Animated.Value;
}) {
  const breathing = useLoop(2100);
  const shineX = revealAnim.interpolate({ inputRange: [0, 1], outputRange: [-180, 190] });
  const meterX = revealAnim.interpolate({ inputRange: [0, 1], outputRange: [-260, 0] });
  const glowScale = breathing.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  if (!match) {
    return null;
  }

  if (!isOpen) {
    return (
      <View style={[styles.matchRevealCard, styles.matchRevealLockedCard]}>
        <Animated.View pointerEvents="none" style={[styles.matchRevealLockedGlow, { transform: [{ scale: glowScale }] }]} />
        {isOpening ? (
          <Animated.View pointerEvents="none" style={[styles.matchRevealShine, { transform: [{ translateX: shineX }, { rotate: "-16deg" }] }]} />
        ) : null}
        <EmojiSticker emoji={stickers.lock} size={78} style={styles.matchRevealSticker} />
        <Text style={styles.matchRevealLabel}>{isOpening ? "Révélation" : "Match à révéler"}</Text>
        <Text style={styles.matchRevealTitle}>{isOpening ? "La carte se révèle..." : "Vous avez une envie en commun"}</Text>
        <Text style={styles.matchRevealText}>
          Le titre reste caché jusqu'à l'ouverture. Ensuite, vous verrez vos deux réponses et pourrez en parler.
        </Text>
        <View style={styles.matchRevealMeter}>
          <Animated.View
            style={[
              styles.matchRevealMeterFill,
              isOpening ? { transform: [{ translateX: meterX }] } : styles.matchRevealMeterFillIdle,
            ]}
          />
        </View>
        <SpringPressable disabled={isOpening} onPress={onReveal} style={[styles.matchRevealButton, isOpening && styles.matchRevealButtonDisabled]}>
          <Sparkles size={17} color={candy.white} />
          <Text style={styles.matchRevealButtonText}>{isOpening ? "Révélation..." : "Voir l'envie"}</Text>
        </SpringPressable>
      </View>
    );
  }

  return (
    <View style={[styles.matchRevealCard, styles.matchRevealOpenCard]}>
      <EmojiSticker emoji={cardStickerEmoji(match)} size={78} style={styles.matchRevealSticker} />
      <Text style={styles.matchRevealLabel}>Match révélé</Text>
      <Text style={styles.matchRevealTitle}>{match.title}</Text>
      <Text style={styles.matchRevealText}>{match.blurb}</Text>
      <MatchVoteComparison cardId={match.id} couple={couple} />
    </View>
  );
}

function MatchVoteComparison({
  cardId,
  couple,
  detail,
}: {
  cardId: string;
  couple: CoupleState;
  detail?: boolean;
}) {
  const activeId = couple.activePartnerId;
  const partnerId = otherPartnerId(activeId);
  const activeVote = couple.votes[activeId][cardId];
  const partnerVote = couple.votes[partnerId][cardId];
  const responses = [
    { id: activeId, label: "Toi", vote: activeVote },
    { id: partnerId, label: couple.profiles[partnerId].displayName, vote: partnerVote },
  ];

  return (
    <View style={[styles.matchVoteComparison, detail && styles.matchVoteComparisonDetail]}>
      <Text style={styles.matchVoteComparisonTitle}>Vos réponses</Text>
      <View style={styles.matchVoteComparisonRow}>
        {responses.map((response) => {
          const hot = isFlameVote(response.vote);

          return (
            <View key={response.id} style={[styles.matchVotePill, hot && styles.matchVotePillHot]}>
              <Text numberOfLines={1} style={[styles.matchVoteName, hot && styles.matchVoteNameHot]}>{response.label}</Text>
              <View style={styles.matchVoteValueRow}>
                <Text style={styles.matchVoteEmoji}>{voteRevealEmoji(response.vote)}</Text>
                <Text numberOfLines={1} style={[styles.matchVoteValue, hot && styles.matchVoteValueHot]}>
                  {voteRevealLabel(response.vote)}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Text style={styles.matchVoteExplanation}>Un match apparaît dès que vous répondez tous les deux au moins Pourquoi pas.</Text>
    </View>
  );
}

function MatchDetailModal({
  couple,
  match,
  onClose,
  onOpenChat,
}: {
  couple: CoupleState;
  match: DesireCard | null;
  onClose: () => void;
  onOpenChat: (cardId: string) => void;
}) {
  if (!match) {
    return null;
  }

  const tone = categoryCardTone(match.category);

  return (
    <Modal animationType="slide" transparent={false} visible onRequestClose={onClose}>
      <LinearGradient colors={[candy.red, candy.rose, "#FF4FA0", candy.pink]} style={styles.matchDetailScreen}>
        <View pointerEvents="none" style={styles.matchDetailFx}>
          <View style={[styles.matchDetailGlow, styles.matchDetailGlowTop]} />
          <View style={[styles.matchDetailGlow, styles.matchDetailGlowBottom]} />
          <Text style={[styles.matchDetailSpark, styles.matchDetailSparkOne]}>✦</Text>
          <Text style={[styles.matchDetailSpark, styles.matchDetailSparkTwo]}>✧</Text>
          <Text style={[styles.matchDetailSpark, styles.matchDetailSparkThree]}>•</Text>
        </View>
        <SafeAreaView style={styles.matchDetailSafe}>
          <View style={styles.matchDetailTopBar}>
            <SpringPressable onPress={onClose} style={styles.matchDetailRoundButton}>
              <LinearGradient
                colors={["rgba(255,255,255,0.96)", "rgba(255,212,232,0.92)"]}
                style={styles.matchDetailRoundButtonFill}
              >
                <ArrowLeft color={candy.red} size={22} strokeWidth={3} />
              </LinearGradient>
            </SpringPressable>
            <SpringPressable onPress={onClose} style={styles.matchDetailRoundButton}>
              <LinearGradient
                colors={[candy.black, candy.roseDeep]}
                style={[styles.matchDetailRoundButtonFill, styles.matchDetailRoundButtonFillDark]}
              >
                <X size={22} color={candy.white} strokeWidth={3} />
              </LinearGradient>
            </SpringPressable>
          </View>

          <ScrollView contentContainerStyle={styles.matchDetailContent} showsVerticalScrollIndicator={false}>
            <View style={styles.matchDetailStage}>
              <View style={styles.matchDetailLogoBlock}>
                <View style={styles.matchDetailRevealPill}>
                  <Sparkles size={15} color={candy.red} />
                  <Text style={styles.matchDetailRevealText}>Match révélé</Text>
                </View>
                <Text style={styles.matchDetailTitle}>Vous avez choisi la même envie.</Text>
                <Text style={styles.matchDetailSub}>Vous avez tous les deux répondu au moins Pourquoi pas sur cette carte.</Text>
              </View>

              <LinearGradient colors={tone.colors} style={styles.matchDetailCard}>
                <CardPattern emoji={tone.patternEmoji} />
                <EmojiSticker emoji={cardStickerEmoji(match)} size={112} style={styles.matchDetailCardSticker} />
                <View style={styles.matchDetailHeartBubble}>
                  <Heart size={24} color={candy.white} />
                </View>
                <Text style={[styles.matchDetailTag, { backgroundColor: tone.tagBg, color: tone.tagText }]}>{categoryLabel(match.category)}</Text>
                <Text style={[styles.matchDetailCardTitle, { color: tone.titleText }]}>{match.title}</Text>
                <Text style={[styles.matchDetailCardText, { color: tone.bodyText }]}>{match.blurb}</Text>
                <View style={styles.matchDetailCardFooter}>
                  <Text style={styles.matchDetailCardFooterText}>Prenez le temps d'en parler clairement.</Text>
                </View>
              </LinearGradient>
              <MatchVoteComparison cardId={match.id} couple={couple} detail />

              <View style={styles.matchDetailActions}>
                <SpringPressable onPress={onClose} style={styles.matchDetailPrimaryAction}>
                  <Sparkles size={20} color={candy.white} />
                  <Text style={styles.matchDetailPrimaryText}>Fermer</Text>
                </SpringPressable>
                <SpringPressable onPress={() => onOpenChat(match.id)} style={styles.matchDetailSecondaryAction}>
                  <MessageCircle size={18} color={candy.red} />
                  <Text style={styles.matchDetailSecondaryText}>En parler ce soir</Text>
                </SpringPressable>
              </View>

              <View style={styles.matchDetailPrivacy}>
                <LockKeyhole size={15} color={candy.white} />
                <Text style={styles.matchDetailPrivacyText}>Vous pouvez toujours retirer cette envie plus tard.</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

function HiddenMatchTeaser({ isOpening, onReveal }: { isOpening: boolean; onReveal: () => void }) {
  return (
    <Entrance delay={80}>
      <View style={styles.hiddenMatchTeaser}>
        <EmojiSticker emoji={stickers.lock} size={58} style={styles.hiddenMatchIcon} />
        <View style={styles.hiddenMatchCopy}>
          <Text style={styles.hiddenMatchTitle}>Un match est prêt.</Text>
          <Text style={styles.hiddenMatchText}>Ouvre-le pour découvrir l'envie que vous avez choisie tous les deux.</Text>
        </View>
        <SpringPressable disabled={isOpening} onPress={onReveal} style={styles.hiddenMatchButton}>
          <Sparkles size={16} color={candy.white} />
        </SpringPressable>
      </View>
    </Entrance>
  );
}

function NoMatchEmptyState({ onGoEnvies }: { hotVotes: number; onGoEnvies: () => void }) {
  return (
    <Entrance delay={80}>
      <View style={styles.matchEmpty}>
        <Text style={styles.matchEmptyTitle}>Aucun match pour l'instant</Text>
        <SpringPressable onPress={onGoEnvies} style={styles.matchEmptyCTA}>
          <Text style={styles.matchEmptyCTAText}>Répondre à des cartes</Text>
          <ChevronRight size={18} color={candy.white} />
        </SpringPressable>
      </View>
    </Entrance>
  );
}

function MatchListItem({ card, index, onOpen }: { card: DesireCard; index: number; onOpen: () => void }) {
  const tone = categoryCardTone(card.category);

  return (
    <Entrance delay={index * 60}>
      <SpringPressable onPress={onOpen} style={styles.matchListItem}>
        <EmojiSticker emoji={cardStickerEmoji(card)} size={58} style={styles.matchListSticker} />
        <View style={styles.matchListCopy}>
          <Text style={[styles.matchListTag, { color: categorySurfaceTagText(card.category) }]}>{categoryLabel(card.category)}</Text>
          <Text style={styles.matchListItemTitle}>{card.title}</Text>
          <Text numberOfLines={2} style={styles.matchListItemText}>{card.blurb}</Text>
        </View>
        <ChevronRight size={20} color={candy.red} />
      </SpringPressable>
    </Entrance>
  );
}

function ChatScreen({
  contextCardId,
  couple,
  onSendMessage,
}: {
  contextCardId?: string;
  couple: CoupleState;
  onSendMessage: (message: { attachments: ChatAttachment[]; body: string }) => void;
}) {
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const activeId = couple.activePartnerId;
  const partnerId = otherPartnerId(activeId);
  const partnerName = couple.profiles[partnerId].displayName;
  const contextCard = useMemo(
    () => (contextCardId ? allDesireCards(couple).find((card) => card.id === contextCardId) : undefined),
    [contextCardId, couple],
  );
  const messages = useMemo(() => {
    const now = Date.now();

    return (couple.chat?.messages ?? [])
      .filter((message) => new Date(message.expiresAt).getTime() > now)
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [couple.chat?.messages]);
  const hasMessages = messages.length > 0;
  const hasMessageContent = draft.trim().length > 0 || pendingAttachments.length > 0;
  const messageCountLabel = messages.length ? `${messages.length} message${messages.length > 1 ? "s" : ""} ce soir` : "Aucun message";
  const quickPrompts = useMemo(() => chatSuggestionPrompts({
    contextCard,
    hasMessages,
    partnerName,
  }), [contextCard, hasMessages, partnerName]);

  async function pickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Accès photos", "Autorise l'accès à tes photos pour envoyer une image dans le chat.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      selectionLimit: 4,
    });

    if (result.canceled) {
      return;
    }

    const nextAttachments = result.assets.slice(0, 4).map((asset, index) => ({
      height: asset.height,
      id: `photo-${Date.now()}-${index}`,
      mimeType: asset.mimeType,
      name: asset.fileName ?? "Photo",
      sizeBytes: asset.fileSize,
      type: "image" as const,
      uri: asset.uri,
      width: asset.width,
    }));

    setPendingAttachments((current) => [...current, ...nextAttachments].slice(0, 4));
    await Haptics.selectionAsync();
  }

  async function send() {
    if (!hasMessageContent) {
      return;
    }

    await onSendMessage({ attachments: pendingAttachments, body: draft });
    setDraft("");
    setPendingAttachments([]);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <View style={styles.chatFrame}>
        <ScrollView contentContainerStyle={styles.chatScreen} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <LinearGradient colors={["#241024", "#A4145A", candy.red]} style={[styles.chatHero, hasMessages && styles.chatHeroCompact]}>
            {!hasMessages ? <EmojiSticker emoji={stickers.speech} size={92} style={styles.chatHeroBubble} /> : null}
            <View style={styles.chatHeroTop}>
              <Text style={styles.chatEyebrow}>Conversation privée</Text>
              <View style={styles.chatExpiryPill}>
                <LockKeyhole size={13} color={candy.white} />
                <Text style={styles.chatExpiryText}>Effacé à {chatExpiryLabel()}</Text>
              </View>
            </View>
            {hasMessages ? (
              <View style={styles.chatHeroCompactRow}>
                <View style={styles.chatHeroCompactCopy}>
                  <Text style={styles.chatTitleCompact}>Entre vous deux</Text>
                  <Text style={styles.chatTextCompact}>Les messages s'effacent à 6h.</Text>
                </View>
                <Text style={styles.chatCountTextCompact}>{messageCountLabel}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.chatTitle}>Entre vous deux</Text>
                <Text style={styles.chatText}>
                  Messages et photos disparaissent à 6h. Parlez à votre rythme.
                </Text>
                <View style={styles.chatHeroStatusRow}>
                  <View style={styles.chatPresencePill}>
                    <View style={styles.chatPresenceDot} />
                    <Text style={styles.chatPresenceText}>{partnerName} verra tes messages ici</Text>
                  </View>
                  <Text style={styles.chatCountText}>{messageCountLabel}</Text>
                </View>
              </>
            )}
            {contextCard ? (
              <View style={[styles.chatContext, hasMessages && styles.chatContextCompact]}>
                <EmojiSticker
                  emoji={cardStickerEmoji(contextCard)}
                  size={hasMessages ? 42 : 56}
                  style={[styles.chatContextSticker, hasMessages && styles.chatContextStickerCompact]}
                />
                <View style={styles.chatContextCopy}>
                  <Text style={styles.chatContextLabel}>À propos de ce match</Text>
                  <Text style={styles.chatContextTitle}>{contextCard.title}</Text>
                </View>
              </View>
            ) : null}
          </LinearGradient>

          <View style={styles.chatDateDivider}>
            <View style={styles.chatDividerLine} />
            <Text style={styles.chatDateText}>Ce soir · s'efface à {chatExpiryLabel()}</Text>
            <View style={styles.chatDividerLine} />
          </View>

          {messages.length ? <ChatLiveSignal /> : null}

          <View style={styles.chatMessages}>
            {messages.length ? (
              messages.map((message, index) => (
                <Entrance delay={Math.min(index * 55, 260)} key={message.id}>
                  <ChatBubble
                    message={message}
                    mine={message.authorId === activeId}
                    name={couple.profiles[message.authorId].displayName}
                  />
                </Entrance>
              ))
            ) : (
              <Entrance delay={120}>
                <View style={styles.chatEmpty}>
                  <EmojiSticker emoji={stickers.speech} size={76} style={styles.chatEmptySticker} />
                  <Text style={styles.chatEmptyTitle}>Écris le premier message.</Text>
                  <Text style={styles.chatEmptyText}>
                    Un mot, une photo, une envie à clarifier. Tout s'efface au petit matin.
                  </Text>
                </View>
              </Entrance>
            )}
          </View>
        </ScrollView>

        <View pointerEvents="box-none" style={styles.chatComposerDock}>
          {!hasMessageContent ? (
            <View style={styles.chatSuggestionPanel}>
              <Text style={styles.chatSuggestionKicker}>Idées rapides</Text>
              <View style={styles.chatQuickRow}>
                {quickPrompts.map((prompt) => (
                  <SpringPressable
                    key={prompt.label}
                    onPress={() => {
                      setDraft(prompt.text);
                      void Haptics.selectionAsync();
                    }}
                    style={styles.chatQuickPill}
                  >
                    <Text numberOfLines={2} style={styles.chatQuickText}>{prompt.label}</Text>
                  </SpringPressable>
                ))}
              </View>
            </View>
          ) : null}

        {pendingAttachments.length ? (
          <View style={styles.chatPendingPhotos}>
            {pendingAttachments.map((attachment) => (
              <View key={attachment.id} style={styles.chatPendingPhotoWrap}>
                <Image source={{ uri: attachment.uri }} style={styles.chatPendingPhoto} />
                <SpringPressable
                  onPress={() => setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                  style={styles.chatRemovePhoto}
                >
                  <X size={14} color={candy.white} />
                </SpringPressable>
              </View>
            ))}
          </View>
        ) : null}

          <View style={[styles.chatComposer, hasMessageContent && styles.chatComposerActive]}>
          <SpringPressable onPress={pickPhoto} style={styles.chatIconButton} testID="chat-photo-button">
            <ImagePlus size={20} color={candy.red} />
          </SpringPressable>
          <TextInput
            multiline
            onChangeText={setDraft}
            placeholder={`Écrire à ${couple.profiles[partnerId].displayName}...`}
            placeholderTextColor="rgba(35,18,36,0.45)"
            style={styles.chatInput}
            testID="chat-input"
            value={draft}
          />
          <SpringPressable
            disabled={!hasMessageContent}
            onPress={send}
            style={[styles.chatSendButton, !hasMessageContent && styles.chatSendButtonDisabled]}
            testID="chat-send-button"
          >
            <Send size={19} color={candy.white} />
          </SpringPressable>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function chatSuggestionPrompts({
  contextCard,
  hasMessages,
  partnerName,
}: {
  contextCard?: DesireCard;
  hasMessages: boolean;
  partnerName: string;
}) {
  if (contextCard) {
    return [
      {
        label: `Parler de ${contextCard.title}`,
        text: `J'aimerais qu'on parle de "${contextCard.title}" ce soir. Tu en penses quoi ?`,
      },
      {
        label: "Ce qui te tente",
        text: "Qu'est-ce qui te tente le plus dans cette idée ?",
      },
      {
        label: "Poser le cadre",
        text: "On peut en parler tranquillement et poser nos limites avant de décider quoi que ce soit.",
      },
    ];
  }

  if (!hasMessages) {
    return [
      {
        label: "Message coquin",
        text: "J'ai envie de te dire un truc un peu coquin...",
      },
      {
        label: "Si tu étais là",
        text: "Si tu étais là maintenant, j'aurais envie de...",
      },
      {
        label: "10 minutes ce soir",
        text: "On se garde 10 minutes ce soir, juste pour nous ?",
      },
    ];
  }

  return [
    {
      label: "Relancer doucement",
      text: `${partnerName}, tu es dans quel mood là maintenant ?`,
    },
    {
      label: "Dire une envie",
      text: "Je te dis une envie, et tu me dis si ça te parle ?",
    },
    {
      label: "Ce soir",
      text: "On choisit une petite envie à explorer ce soir ?",
    },
  ];
}

const ChatLiveSignal = React.memo(function ChatLiveSignal() {
  return (
    <View style={styles.chatLiveSignal}>
      <Text style={styles.chatLiveText}>Chat ouvert</Text>
      <View style={styles.chatLiveDots}>
        {[0, 1, 2].map((dot) => (
          <View key={dot} style={styles.chatLiveDot} />
        ))}
      </View>
    </View>
  );
});

const ChatBubble = React.memo(function ChatBubble({ message, mine, name }: { message: ChatMessage; mine: boolean; name: string }) {
  const sentAt = new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <View style={[styles.chatBubbleRow, mine && styles.chatBubbleRowMine]}>
      <View style={[styles.chatBubble, mine && styles.chatBubbleMine]}>
        <Text style={[styles.chatBubbleName, mine && styles.chatBubbleNameMine]}>{mine ? "Toi" : name}</Text>
        {message.attachments.length ? (
          <View style={styles.chatBubblePhotos}>
            {message.attachments.filter((attachment) => attachment.uri).map((attachment) => (
              <Image key={attachment.id} source={{ uri: attachment.uri }} style={styles.chatBubblePhoto} />
            ))}
          </View>
        ) : null}
        {message.body ? <Text style={[styles.chatBubbleText, mine && styles.chatBubbleTextMine]}>{message.body}</Text> : null}
        <Text style={[styles.chatBubbleMeta, mine && styles.chatBubbleMetaMine]}>{sentAt} · effacé à 6h</Text>
      </View>
    </View>
  );
});

function RulesScreen({ onBack }: { onBack: () => void }) {
  const steps = [
    {
      icon: stickers.blackHeart,
      title: "Tu réponds seul.e",
      text: "Un Non reste privé. Pourquoi pas ou une flamme ne s'affichent que dans un match.",
    },
    {
      icon: stickers.flame,
      title: "Deux réponses positives = un match",
      text: "Quand vous répondez tous les deux au moins Pourquoi pas sur la même carte, WeSpice révèle l'envie.",
    },
    {
      icon: stickers.speech,
      title: "Votre état reste discret",
      text: "Ton choix du moment reste privé, sauf quand il rejoint celui de ton/ta partenaire.",
    },
    {
      icon: stickers.lock,
      title: "Le consentement reste central",
      text: "Un match ouvre une discussion. Rien n'est automatique, tout peut être retiré.",
    },
  ];

  return (
    <ScrollView contentContainerStyle={styles.rulesScreen} showsVerticalScrollIndicator={false}>
      <SpringPressable onPress={onBack} style={styles.rulesBackButton}>
        <ChevronRight size={18} color={candy.red} style={styles.rulesBackIcon} />
        <Text style={styles.rulesBackText}>Retour</Text>
      </SpringPressable>

      <LinearGradient colors={[candy.roseMist, candy.pinkSoft, candy.pink]} style={styles.rulesHero}>
        <EmojiSticker emoji={stickers.wand} size={70} style={styles.rulesHeroWand} />
        <Text style={styles.rulesEyebrow}>Règles du jeu</Text>
        <Text style={styles.rulesTitle}>Comment WeSpice révèle vos envies</Text>
        <Text style={styles.rulesIntro}>
          Le but n'est pas de deviner l'autre. Le but, c'est de répondre honnêtement, à ton rythme.
        </Text>
      </LinearGradient>

      <View style={styles.rulesSteps}>
        {steps.map((step, index) => (
          <Entrance delay={index * 70} key={step.title}>
            <View style={styles.rulesStep}>
              <EmojiSticker emoji={step.icon} size={58} style={styles.rulesStepIcon} />
              <View style={styles.rulesStepCopy}>
                <Text style={styles.rulesStepTitle}>{step.title}</Text>
                <Text style={styles.rulesStepText}>{step.text}</Text>
              </View>
            </View>
          </Entrance>
        ))}
      </View>

      <LinearGradient colors={["#FF347B", candy.red, "#F70E4F"]} style={styles.rulesPromise}>
        <Sparkles size={24} color={candy.white} />
        <Text style={styles.rulesPromiseTitle}>Simple, clair, sans pression.</Text>
        <Text style={styles.rulesPromiseText}>
          Une envie révélée n'est jamais une obligation. C'est une conversation qui peut commencer.
        </Text>
      </LinearGradient>
    </ScrollView>
  );
}

function HomeScreen({
  couple,
  onGoEnvies,
  onGoMatch,
  onInvitePartner,
  onJoinPartner,
  onMoodChange,
  onMoodNotificationPreference,
  onOpenChat,
  onOpenProfile,
  revealedMatchIds,
  onStatusEmojiChange,
  onUnlockCustomCards,
  onUnlockCategory,
  onUnlockNoAds,
  onUnlockUnlimitedResponses,
  onVote,
}: {
  couple: CoupleState;
  onGoEnvies: () => void;
  onGoMatch: () => void;
  onInvitePartner: () => void;
  onJoinPartner: () => void;
  onMoodChange: (level: CoupleMoodLevel) => void;
  onMoodNotificationPreference: (enabled: boolean) => void;
  onOpenChat: (cardId?: string) => void;
  onOpenProfile: () => void;
  revealedMatchIds: string[];
  onStatusEmojiChange: (emoji: string) => void;
  onUnlockCustomCards: () => void;
  onUnlockCategory: (category: DesireCategory) => void;
  onUnlockNoAds: () => void;
  onUnlockUnlimitedResponses: () => void;
  onVote: (cardId: string, level: VoteLevel) => boolean;
}) {
  const [purchaseCategory, setPurchaseCategory] = useState<DesireCategory | null>(null);
  const [customPurchaseOpen, setCustomPurchaseOpen] = useState(false);
  const [noAdsPurchaseOpen, setNoAdsPurchaseOpen] = useState(false);
  const [unlimitedPurchaseOpen, setUnlimitedPurchaseOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

  return (
    <>
      <ScrollView contentContainerStyle={[styles.screen, styles.homeScreen]} showsVerticalScrollIndicator={false}>
        <WeSpiceLogo small style={styles.homeLogo} />
        <Entrance delay={40}>
          <HomeNextStepPanel
            couple={couple}
            onGoEnvies={onGoEnvies}
            onGoMatch={onGoMatch}
            onInvitePartner={onInvitePartner}
            onJoinPartner={onJoinPartner}
            onOpenChat={onOpenChat}
            onOpenStore={() => setStoreOpen(true)}
            revealedMatchIds={revealedMatchIds}
          />
        </Entrance>
        <Entrance delay={100}>
          <HomeStatusTeaser couple={couple} onOpenProfile={onOpenProfile} onStatusEmojiChange={onStatusEmojiChange} />
        </Entrance>
        <Entrance delay={140}>
          <HomeSurpriseDeck couple={couple} onGoEnvies={onGoEnvies} onVote={onVote} />
        </Entrance>
        <Entrance delay={200}>
          <MoodWidget couple={couple} onChange={onMoodChange} onNotificationPreference={onMoodNotificationPreference} />
        </Entrance>
        <Entrance delay={260}>
          <HomeDailyAdvice couple={couple} />
        </Entrance>
      </ScrollView>
      <StoreScreen
        couple={couple}
        onClose={() => setStoreOpen(false)}
        onGoEnvies={() => {
          setStoreOpen(false);
          onGoEnvies();
        }}
        onOpenCustomPack={() => setCustomPurchaseOpen(true)}
        onOpenNoAds={() => setNoAdsPurchaseOpen(true)}
        onOpenUnlimitedResponses={() => setUnlimitedPurchaseOpen(true)}
        onOpenPack={setPurchaseCategory}
        visible={storeOpen}
      />
      <CategoryPurchaseModal
        category={purchaseCategory}
        onClose={() => setPurchaseCategory(null)}
        onUnlock={(category) => {
          onUnlockCategory(category);
          setPurchaseCategory(null);
        }}
      />
      <CustomCardsPurchaseModal
        customCount={customDesireCount(couple)}
        onClose={() => setCustomPurchaseOpen(false)}
        onUnlock={() => {
          onUnlockCustomCards();
          setCustomPurchaseOpen(false);
        }}
        visible={customPurchaseOpen}
      />
      <NoAdsPurchaseModal
        onClose={() => setNoAdsPurchaseOpen(false)}
        onUnlock={() => {
          onUnlockNoAds();
          setNoAdsPurchaseOpen(false);
          setStoreOpen(false);
        }}
        visible={noAdsPurchaseOpen}
      />
      <UnlimitedResponsesPurchaseModal
        dailyUsed={dailyResponseCount(couple, couple.activePartnerId)}
        onClose={() => setUnlimitedPurchaseOpen(false)}
        onUnlock={() => {
          onUnlockUnlimitedResponses();
          setUnlimitedPurchaseOpen(false);
          setStoreOpen(false);
        }}
        visible={unlimitedPurchaseOpen}
      />
    </>
  );
}

function HomeStatusTeaser({
  couple,
  onOpenProfile,
  onStatusEmojiChange,
}: {
  couple: CoupleState;
  onOpenProfile: () => void;
  onStatusEmojiChange: (emoji: string) => void;
}) {
  const activeProfile = couple.profiles[couple.activePartnerId];
  const partnerProfile = couple.profiles[otherPartnerId(couple.activePartnerId)];
  const linked = hasLinkedPartner(couple);

  return (
    <LinearGradient colors={["rgba(255,255,255,0.9)", candy.roseMist, candy.pinkSoft]} style={styles.homeStatusCard}>
      <View style={styles.homeStatusTop}>
        <View style={styles.homeStatusAvatar}>
          <Text style={styles.homeStatusAvatarText}>{profileEmoji(activeProfile)}</Text>
        </View>
        <View style={styles.homeStatusCopy}>
          <Text style={styles.homeStatusEyebrow}>Statut visible</Text>
          <Text style={styles.homeStatusTitle}>Change ton emoji du moment</Text>
          <Text style={styles.homeStatusText}>
            {linked
              ? `${partnerProfile.displayName} verra ton signal dans Notre couple.`
              : "Choisis un signal maintenant, il sera déjà prêt quand ton/ta partenaire arrive."}
          </Text>
        </View>
        <View style={styles.homeStatusPartner}>
          <Text style={styles.homeStatusPartnerEmoji}>{profileEmoji(partnerProfile)}</Text>
          <Text numberOfLines={1} style={styles.homeStatusPartnerLabel}>{linked ? "Son statut" : "À venir"}</Text>
        </View>
      </View>
      <View style={styles.homeStatusActions}>
        {statusEmojiPresets.slice(0, 6).map((emoji) => (
          <SpringPressable
            key={emoji}
            onPress={() => onStatusEmojiChange(emoji)}
            style={[styles.homeStatusQuickEmoji, profileEmoji(activeProfile) === emoji && styles.homeStatusQuickEmojiActive]}
          >
            <Text style={styles.homeStatusQuickEmojiText}>{emoji}</Text>
          </SpringPressable>
        ))}
        <SpringPressable onPress={onOpenProfile} style={styles.homeStatusEditButton}>
          <Text style={styles.homeStatusEditText}>Plus</Text>
          <ChevronRight size={15} color={candy.red} />
        </SpringPressable>
      </View>
    </LinearGradient>
  );
}

function HomeDailyAdvice({ couple }: { couple: CoupleState }) {
  const advice = dailyAdviceForCouple(couple);
  const dayLabel = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  return (
    <LinearGradient colors={["rgba(255,255,255,0.94)", candy.roseMist, candy.roseSoft]} style={styles.dailyAdviceCard}>
      <Text pointerEvents="none" style={styles.dailyAdviceEmoji}>{advice.emoji}</Text>
      <View style={styles.dailyAdviceTop}>
        <View style={styles.dailyAdvicePill}>
          <Text style={styles.dailyAdvicePillText}>Conseil du jour</Text>
        </View>
        <Text style={styles.dailyAdviceDate}>{dayLabel}</Text>
      </View>
      <Text style={styles.dailyAdviceCategory}>{advice.category}</Text>
      <Text style={styles.dailyAdviceTitle}>{advice.title}</Text>
      <Text style={styles.dailyAdviceText}>{advice.text}</Text>
      <View style={styles.dailyAdviceFooter}>
        <Text style={styles.dailyAdviceFooterText}>Nouvelle lecture demain</Text>
        <Text style={styles.dailyAdviceFooterDot}>•</Text>
        <Text style={styles.dailyAdviceFooterText}>1 min</Text>
      </View>
    </LinearGradient>
  );
}

function HomeNextStepPanel({
  couple,
  onGoEnvies,
  onGoMatch,
  onInvitePartner,
  onJoinPartner,
  onOpenChat,
  onOpenStore,
  revealedMatchIds,
}: {
  couple: CoupleState;
  onGoEnvies: () => void;
  onGoMatch: () => void;
  onInvitePartner: () => void;
  onJoinPartner: () => void;
  onOpenChat: (cardId?: string) => void;
  onOpenStore: () => void;
  revealedMatchIds: string[];
}) {
  const revealedMatchSet = useMemo(() => new Set(revealedMatchIds), [revealedMatchIds]);
  const matches = useMemo(() => matchedCards(couple), [couple]);
  const activeVotes = couple.votes[couple.activePartnerId] ?? {};
  const availableCards = useMemo(() => availableDesireCards(couple), [couple]);
  const unansweredCount = useMemo(
    () => availableCards.filter((card) => activeVotes[card.id] === undefined).length,
    [activeVotes, availableCards],
  );
  const lockedPackCount = useMemo(() => PACK_CATEGORIES.filter((category) => !isCategoryUnlocked(couple, category)).length, [couple]);
  const customUnlimited = hasCustomCardsUnlimited(couple);
  const unlimitedResponses = hasUnlimitedResponses(couple);
  const noAds = hasNoAds(couple);
  const hasStoreOffer = lockedPackCount > 0 || !customUnlimited || !unlimitedResponses || !noAds;
  const linked = hasLinkedPartner(couple);
  const hiddenMatches = useMemo(() => matches.filter((card) => !revealedMatchSet.has(card.id)), [matches, revealedMatchSet]);
  const revealedMatches = useMemo(() => matches.filter((card) => revealedMatchSet.has(card.id)), [matches, revealedMatchSet]);
  const firstHiddenMatch = hiddenMatches[0];
  const firstRevealedMatch = revealedMatches[0];
  const dailyLimitReached = !unlimitedResponses && dailyResponsesLeft(couple, couple.activePartnerId) <= 0;
  const responseCount = useMemo(() => activeResponseCount(couple), [couple]);
  const hasFewAnswers = responseCount < 5;
  const stateSummary = !linked
    ? "En solo pour l'instant"
    : firstHiddenMatch
      ? "Match prêt à ouvrir"
      : firstRevealedMatch
        ? "Conversation à lancer"
        : dailyLimitReached
          ? "5/5 aujourd'hui"
        : hasFewAnswers
          ? `${responseCount}/5 premières réponses`
          : unansweredCount > 0
            ? `${unansweredCount} cartes restantes`
            : "Tout est à jour";

  const nextStep: HomeNextStepConfig = !linked
    ? {
        badge: "Partenaire manquant",
        cta: "Inviter",
        emoji: "💌",
        phase: "1",
        onPress: onInvitePartner,
        secondary: "Rejoindre",
        secondaryPress: onJoinPartner,
        text: "Partage ton code ou entre celui de ton/ta partenaire. Ensuite chacun répond de son côté, à son rythme.",
        title: "Invite ou rejoins ton/ta partenaire",
      }
    : firstHiddenMatch
      ? {
          badge: `${hiddenMatches.length} à révéler`,
          cta: "Révéler",
          emoji: "🔥",
          phase: "3",
          onPress: onGoMatch,
          secondary: "Continuer à jouer",
          secondaryPress: onGoEnvies,
          text: "Vous avez tous les deux répondu au moins Pourquoi pas sur une carte. Ouvre-la maintenant.",
          title: "Un match est prêt",
        }
      : firstRevealedMatch
        ? {
            badge: `${revealedMatches.length} révélé${revealedMatches.length > 1 ? "s" : ""}`,
            cta: "En parler",
            emoji: "💬",
            phase: "4",
            onPress: () => onOpenChat(firstRevealedMatch.id),
            secondary: "Voir les matches",
            secondaryPress: onGoMatch,
            text: "L'envie est connue des deux côtés. Le chat peut aider à en parler tranquillement.",
            title: "Passez dans le chat",
          }
        : dailyLimitReached
          ? {
              badge: "Rituel du jour",
              cta: "Débloquer l'illimité",
              emoji: "🎟️",
              phase: "2",
              onPress: onOpenStore,
              secondary: matches.length ? "Voir les matches" : undefined,
              secondaryPress: matches.length ? onGoMatch : undefined,
              text: "Tu as utilisé tes 5 choix du jour. Reviens demain pour garder le suspense, ou ouvre l'illimité.",
              title: "Pause jusqu'à demain",
            }
        : hasFewAnswers
          ? {
              badge: "Premières réponses",
              cta: "Répondre",
              emoji: "🎲",
              phase: "2",
              onPress: onGoEnvies,
              secondary: hasStoreOffer ? "Voir les packs" : undefined,
              secondaryPress: hasStoreOffer ? onOpenStore : undefined,
              text: "Commence par quelques cartes. Ton/ta partenaire ne voit rien tant que vous ne choisissez pas la même envie.",
              title: "Réponds à quelques cartes",
            }
          : matches.length
    ? {
        badge: `${matches.length} match${matches.length > 1 ? "s" : ""}`,
        cta: "Voir les matchs",
        emoji: "💘",
        phase: "4",
        onPress: onGoMatch,
        secondary: "Continuer à jouer",
        secondaryPress: onGoEnvies,
        text: "Vos envies communes restent disponibles. Tu peux les revoir ou relancer la discussion.",
        title: "Un match vous attend",
      }
      : unansweredCount > 0
        ? {
            badge: `${unansweredCount} carte${unansweredCount > 1 ? "s" : ""} dispo`,
            cta: "Voir une carte",
            emoji: "🎲",
            phase: "2",
            onPress: onGoEnvies,
            secondary: hasStoreOffer ? "Voir les packs" : undefined,
            secondaryPress: hasStoreOffer ? onOpenStore : undefined,
            text: "Une carte à la fois. Réponds, WeSpice ne révélera que les points communs.",
            title: "Continue le jeu",
          }
        : hasStoreOffer
          ? {
              badge: "Cartes à débloquer",
              cta: "Voir les packs",
              emoji: "✨",
              phase: "2",
              onPress: onOpenStore,
              secondary: "Revoir les cartes",
              secondaryPress: onGoEnvies,
              text: "Vous avez répondu aux cartes ouvertes. Un autre pack peut relancer le jeu.",
              title: "Plus rien de neuf pour l'instant",
            }
          : {
              badge: "Tout exploré",
              cta: "Ajouter une envie",
              emoji: "💭",
              phase: "2",
              onPress: onGoEnvies,
              secondary: "Voir les matchs",
              secondaryPress: onGoMatch,
              text: "Vous avez répondu à tout. Une carte perso peut ajouter votre propre idée au jeu.",
              title: "À vous d'inventer la suite",
            };

  return (
    <LinearGradient colors={["rgba(255,255,255,0.96)", candy.roseMist, candy.roseSoft]} style={styles.homeNextPanel}>
      <View style={styles.homeNextTop}>
        <View style={styles.homeNextState}>
          <Text style={styles.homeNextPhase}>{nextStep.phase}</Text>
          <Text style={styles.homeNextStateText}>{stateSummary}</Text>
        </View>
        <Text style={styles.homeNextEmoji}>{nextStep.emoji}</Text>
      </View>
      <View style={styles.homeNextCopy}>
        <Text style={styles.homeNextBadge}>Prochaine action</Text>
        <Text style={styles.homeNextTitle}>{nextStep.title}</Text>
        <Text style={styles.homeNextText}>{nextStep.text}</Text>
      </View>
      <View style={styles.homeNextActions}>
        <SpringPressable onPress={nextStep.onPress} style={styles.homeNextPrimary}>
          <Text style={styles.homeNextPrimaryText}>{nextStep.cta}</Text>
          <ChevronRight size={18} color={candy.white} />
        </SpringPressable>
        {nextStep.secondary && nextStep.secondaryPress ? (
          <SpringPressable onPress={nextStep.secondaryPress} style={styles.homeNextSecondary}>
            <Text style={styles.homeNextSecondaryText}>{nextStep.secondary}</Text>
          </SpringPressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

function HomeStoreModule({
  couple,
  onGoEnvies,
  onOpenStore,
}: {
  couple: CoupleState;
  onGoEnvies: () => void;
  onOpenStore: () => void;
}) {
  const paidPacks = PAID_PACK_CATEGORIES;
  const lockedPacks = paidPacks.filter((category) => !isCategoryUnlocked(couple, category));
  const unlockedCount = paidPacks.length - lockedPacks.length;
  const customUnlimited = hasCustomCardsUnlimited(couple);
  const noAdsUnlocked = hasNoAds(couple);
  const unlimitedResponsesUnlocked = hasUnlimitedResponses(couple);
  const offerCount = lockedPacks.length + (customUnlimited ? 0 : 1) + (unlimitedResponsesUnlocked ? 0 : 1) + (noAdsUnlocked ? 0 : 1);
  const action = offerCount ? onOpenStore : onGoEnvies;
  const previewPacks = (lockedPacks.length ? lockedPacks : paidPacks).slice(0, 3);

  return (
    <LinearGradient colors={["#20101F", "#5A123C", candy.red]} style={styles.homeStore}>
      <EmojiSticker emoji={stickers.sparkles} size={72} style={styles.homeStoreSparkle} />
      <EmojiSticker emoji={stickers.flame} size={86} style={styles.homeStoreFlame} />
      <View style={styles.homeStoreTop}>
        <Text style={styles.homeStoreEyebrow}>Packs</Text>
        <Text style={styles.homeStoreBadge}>{offerCount ? `${offerCount} à découvrir` : "Tout ouvert"}</Text>
      </View>
      <Text style={styles.homeStoreTitle}>{offerCount ? "De nouvelles cartes pour vous deux" : "Tous les packs sont ouverts"}</Text>
      <Text style={styles.homeStoreText}>
        {offerCount
          ? "Des cartes plus directes, des réponses illimitées et une option No Ads."
          : "Vous avez accès à tous les packs. Il reste juste à jouer et laisser les matchs arriver."}
      </Text>

      <View style={styles.homeStorePackRow}>
        {previewPacks.map((category) => {
          const tone = categoryCardTone(category);
          const unlocked = isCategoryUnlocked(couple, category);
          const cardCount = desireCardCount(category);

          return (
            <SpringPressable
              key={category}
              onPress={() => (unlocked ? onGoEnvies() : onOpenStore())}
              style={[styles.homeStorePack, unlocked && styles.homeStorePackOpen]}
            >
              <EmojiSticker emoji={tone.sticker} size={38} style={styles.homeStorePackEmoji} />
              <View style={styles.homeStorePackCopy}>
                <Text numberOfLines={1} style={styles.homeStorePackTitle}>{categoryLabel(category)}</Text>
                <Text numberOfLines={2} style={styles.homeStorePackMeta}>{unlocked ? "Ouvert" : `${cardCount} cartes · ${CATEGORY_PRICES[category]}`}</Text>
              </View>
            </SpringPressable>
          );
        })}
      </View>

      <SpringPressable
        onPress={customUnlimited ? onGoEnvies : onOpenStore}
        style={[styles.homeStorePack, styles.homeStoreCustomPack, customUnlimited && styles.homeStorePackOpen]}
      >
        <Text style={styles.homeStoreCustomEmoji}>💭</Text>
        <View style={styles.homeStoreCustomCopy}>
          <Text style={styles.homeStorePackTitle}>Cartes perso sans limite</Text>
          <Text style={styles.homeStorePackMeta}>
            {customUnlimited ? "Sans limite" : `${CUSTOM_CARD_FREE_LIMIT} gratuites puis sans limite · ${CUSTOM_CARDS_UNLIMITED_PRICE}`}
          </Text>
        </View>
      </SpringPressable>

      <SpringPressable onPress={action} style={styles.homeStoreAction}>
        <Text style={styles.homeStoreActionText}>
          {offerCount ? "Voir les packs" : `${unlockedCount}/${paidPacks.length} packs ouverts`}
        </Text>
        <ChevronRight size={18} color={candy.red} />
      </SpringPressable>
    </LinearGradient>
  );
}

function StoreScreen({
  couple,
  onClose,
  onGoEnvies,
  onOpenCustomPack,
  onOpenNoAds,
  onOpenUnlimitedResponses,
  onOpenPack,
  visible,
}: {
  couple: CoupleState;
  onClose: () => void;
  onGoEnvies: () => void;
  onOpenCustomPack: () => void;
  onOpenNoAds: () => void;
  onOpenUnlimitedResponses: () => void;
  onOpenPack: (category: DesireCategory) => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  const paidPacks = PAID_PACK_CATEGORIES;
  const unlockedPaidCount = paidPacks.filter((category) => isCategoryUnlocked(couple, category)).length;
  const customUnlimited = hasCustomCardsUnlimited(couple);
  const noAdsUnlocked = hasNoAds(couple);
  const unlimitedResponsesUnlocked = hasUnlimitedResponses(couple);
  const customCount = customDesireCount(couple);
  const offerCount = paidPacks.filter((category) => !isCategoryUnlocked(couple, category)).length
    + (customUnlimited ? 0 : 1)
    + (unlimitedResponsesUnlocked ? 0 : 1)
    + (noAdsUnlocked ? 0 : 1);

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <LinearGradient colors={["#FF8FC8", "#FFB7DA", "#FF6DA8"]} style={styles.storeScreen}>
        <SafeAreaView style={styles.storeSafe}>
          <ScrollView contentContainerStyle={styles.storeContent} showsVerticalScrollIndicator={false}>
            <View style={styles.storeTopBar}>
              <WeSpiceLogo small />
              <SpringPressable onPress={onClose} style={styles.storeCloseButton}>
                <X size={22} color={candy.ink} />
              </SpringPressable>
            </View>

            <LinearGradient colors={[candy.black, "#5A123C", candy.red]} style={styles.storeHero}>
              <EmojiSticker emoji={stickers.cherries} size={100} style={styles.storeHeroCherry} />
              <Text style={styles.storeEyebrow}>Packs WeSpice</Text>
              <Text style={styles.storeTitle}>Ajoute des cartes à votre jeu.</Text>
              <Text style={styles.storeText}>
                Les packs ajoutent des envies à explorer à deux. L'illimité ouvre plus de réponses par jour.
              </Text>
              <View style={styles.storeHeroStats}>
                <StoreStat value={`${unlockedPaidCount}/${paidPacks.length}`} label="Packs ouverts" />
                <StoreStat value={`${customCount}`} label="Cartes perso" />
                <StoreStat value={offerCount ? `${offerCount}` : "0"} label="À ouvrir" />
              </View>
            </LinearGradient>

            <View style={styles.storeSectionHeader}>
              <Text style={styles.storeSectionTitle}>Packs de cartes</Text>
              <Text style={styles.storeSectionText}>Vanille est inclus. Les autres packs s'ouvrent pour vous deux.</Text>
            </View>

            <View style={styles.storeOfferList}>
              <StoreCategoryOffer category="Vanille" couple={couple} included onGoEnvies={onGoEnvies} onOpenPack={onOpenPack} />
              {paidPacks.map((category) => (
                <StoreCategoryOffer
                  category={category}
                  couple={couple}
                  key={category}
                  onGoEnvies={onGoEnvies}
                  onOpenPack={onOpenPack}
                />
              ))}
            </View>

            <View style={styles.storeSectionHeader}>
              <Text style={styles.storeSectionTitle}>Cartes perso</Text>
              <Text style={styles.storeSectionText}>Pour ajouter vos propres idées sans limite.</Text>
            </View>

            <StoreCustomOffer
              customCount={customCount}
              customUnlimited={customUnlimited}
              onGoEnvies={onGoEnvies}
              onOpenCustomPack={onOpenCustomPack}
            />

            <View style={styles.storeSectionHeader}>
              <Text style={styles.storeSectionTitle}>Rythme & confort</Text>
              <Text style={styles.storeSectionText}>Pour jouer plus longtemps ou retirer les interstitiels.</Text>
            </View>

            <StoreUnlimitedResponsesOffer
              onGoEnvies={onGoEnvies}
              onOpenUnlimitedResponses={onOpenUnlimitedResponses}
              unlimitedResponsesUnlocked={unlimitedResponsesUnlocked}
            />
            <StoreNoAdsOffer noAdsUnlocked={noAdsUnlocked} onGoEnvies={onGoEnvies} onOpenNoAds={onOpenNoAds} />

          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

function StoreCategoryOffer({
  category,
  couple,
  included,
  onGoEnvies,
  onOpenPack,
}: {
  category: DesireCategory;
  couple: CoupleState;
  included?: boolean;
  onGoEnvies: () => void;
  onOpenPack: (category: DesireCategory) => void;
}) {
  const tone = categoryCardTone(category);
  const unlocked = included || isCategoryUnlocked(couple, category);
  const cardCount = desireCardCount(category);
  const price = included ? "Inclus" : CATEGORY_PRICES[category];
  const description = categoryDescription(category);

  return (
    <LinearGradient colors={unlocked ? tone.colors : ["#FFFFFF", "#FFEAF4", "#FFD4E8"]} style={styles.storeOfferCard}>
      <CardPattern emoji={tone.patternEmoji} />
      <EmojiSticker emoji={tone.sticker} size={72} style={styles.storeOfferSticker} />
      <View style={styles.storeOfferCopy}>
        <Text
          style={[
            styles.storeOfferTag,
            {
              backgroundColor: unlocked ? tone.tagBg : "rgba(255,255,255,0.72)",
              color: unlocked ? tone.tagText : categorySurfaceTagText(category),
            },
          ]}
        >
          {categoryLabel(category)}
        </Text>
        <Text style={[styles.storeOfferTitle, unlocked && { color: tone.titleText }]}>{unlocked ? "Déjà ouvert" : `Pack ${categoryLabel(category)}`}</Text>
        <Text style={[styles.storeOfferText, unlocked && { color: tone.bodyText }]}>
          {unlocked
            ? `${cardCount} cartes prêtes à jouer.`
            : `${cardCount} cartes. ${description || "Un nouveau ton à explorer à deux."}`}
        </Text>
      </View>
      <View style={styles.storeOfferFooter}>
        <Text style={styles.storeOfferPrice}>{unlocked ? "Ouvert" : price}</Text>
        <SpringPressable onPress={unlocked ? onGoEnvies : () => onOpenPack(category)} style={[styles.storeOfferButton, unlocked && styles.storeOfferButtonOpen]}>
          <Text style={[styles.storeOfferButtonText, unlocked && styles.storeOfferButtonTextOpen]}>
            {unlocked ? "Voir" : "Débloquer"}
          </Text>
          <ChevronRight size={16} color={unlocked ? candy.red : candy.white} />
        </SpringPressable>
      </View>
    </LinearGradient>
  );
}

function StoreCustomOffer({
  customCount,
  customUnlimited,
  onGoEnvies,
  onOpenCustomPack,
}: {
  customCount: number;
  customUnlimited: boolean;
  onGoEnvies: () => void;
  onOpenCustomPack: () => void;
}) {
  return (
    <LinearGradient colors={[candy.mint, candy.white, candy.pinkSoft]} style={styles.storeCustomOffer}>
      <Text style={styles.storeCustomEmoji}>💭</Text>
      <View style={styles.storeOfferCopy}>
        <Text style={[styles.storeOfferTag, { color: candy.green }]}>Perso</Text>
        <Text style={styles.storeOfferTitle}>Cartes perso sans limite</Text>
        <Text style={styles.storeOfferText}>
          {customUnlimited
            ? `${customCount} carte${customCount > 1 ? "s" : ""} créée${customCount > 1 ? "s" : ""}. Création sans limite active.`
            : `Tu as ${Math.min(customCount, CUSTOM_CARD_FREE_LIMIT)}/${CUSTOM_CARD_FREE_LIMIT} cartes gratuites. Débloque la création sans limite.`}
        </Text>
      </View>
      <View style={styles.storeOfferFooter}>
        <Text style={styles.storeOfferPrice}>{customUnlimited ? "Ouvert" : CUSTOM_CARDS_UNLIMITED_PRICE}</Text>
        <SpringPressable
          onPress={customUnlimited ? onGoEnvies : onOpenCustomPack}
          style={[styles.storeOfferButton, customUnlimited && styles.storeOfferButtonOpen]}
        >
          <Text style={[styles.storeOfferButtonText, customUnlimited && styles.storeOfferButtonTextOpen]}>
            {customUnlimited ? "Créer" : "Débloquer"}
          </Text>
          <ChevronRight size={16} color={customUnlimited ? candy.red : candy.white} />
        </SpringPressable>
      </View>
    </LinearGradient>
  );
}

function StoreUnlimitedResponsesOffer({
  onGoEnvies,
  onOpenUnlimitedResponses,
  unlimitedResponsesUnlocked,
}: {
  onGoEnvies: () => void;
  onOpenUnlimitedResponses: () => void;
  unlimitedResponsesUnlocked: boolean;
}) {
  return (
    <LinearGradient colors={[candy.white, candy.roseMist, candy.pinkSoft]} style={styles.storeNoAdsOffer}>
      <Text style={styles.storeNoAdsEmoji}>🎟️</Text>
      <View style={styles.storeOfferCopy}>
        <Text style={[styles.storeOfferTag, { color: candy.red }]}>Illimité</Text>
        <Text style={styles.storeOfferTitle}>{unlimitedResponsesUnlocked ? "Réponses illimitées actives" : "Répondre sans limite"}</Text>
        <Text style={styles.storeOfferText}>
          {unlimitedResponsesUnlocked
            ? "Le quota quotidien est retiré pour votre couple. Vous pouvez jouer autant que vous voulez."
            : `${DAILY_FREE_RESPONSE_LIMIT} choix gratuits par jour. Modifier une carte déjà répondue compte aussi.`}
        </Text>
      </View>
      <View style={styles.storeOfferFooter}>
        <Text style={styles.storeOfferPrice}>{unlimitedResponsesUnlocked ? "Ouvert" : UNLIMITED_RESPONSES_PRICE}</Text>
        <SpringPressable
          onPress={unlimitedResponsesUnlocked ? onGoEnvies : onOpenUnlimitedResponses}
          style={[styles.storeOfferButton, unlimitedResponsesUnlocked && styles.storeOfferButtonOpen]}
        >
          <Text style={[styles.storeOfferButtonText, unlimitedResponsesUnlocked && styles.storeOfferButtonTextOpen]}>
            {unlimitedResponsesUnlocked ? "Jouer" : "Débloquer"}
          </Text>
          <ChevronRight size={16} color={unlimitedResponsesUnlocked ? candy.red : candy.white} />
        </SpringPressable>
      </View>
    </LinearGradient>
  );
}

function StoreNoAdsOffer({
  noAdsUnlocked,
  onGoEnvies,
  onOpenNoAds,
}: {
  noAdsUnlocked: boolean;
  onGoEnvies: () => void;
  onOpenNoAds: () => void;
}) {
  return (
    <LinearGradient colors={[candy.white, candy.roseMist, candy.pinkSoft]} style={styles.storeNoAdsOffer}>
      <Text style={styles.storeNoAdsEmoji}>🚫</Text>
      <View style={styles.storeOfferCopy}>
        <Text style={[styles.storeOfferTag, { color: candy.red }]}>No Ads</Text>
        <Text style={styles.storeOfferTitle}>{noAdsUnlocked ? "Expérience sans pub active" : "Retirer les pubs"}</Text>
        <Text style={styles.storeOfferText}>
          {noAdsUnlocked
            ? "Les interstitiels sponsorisés sont désactivés pour votre couple."
            : "Retire les écrans sponsorisés avant certaines révélations et pauses de jeu."}
        </Text>
      </View>
      <View style={styles.storeOfferFooter}>
        <Text style={styles.storeOfferPrice}>{noAdsUnlocked ? "Ouvert" : NO_ADS_PRICE}</Text>
        <SpringPressable
          onPress={noAdsUnlocked ? onGoEnvies : onOpenNoAds}
          style={[styles.storeOfferButton, noAdsUnlocked && styles.storeOfferButtonOpen]}
        >
          <Text style={[styles.storeOfferButtonText, noAdsUnlocked && styles.storeOfferButtonTextOpen]}>
            {noAdsUnlocked ? "Jouer" : "Débloquer"}
          </Text>
          <ChevronRight size={16} color={noAdsUnlocked ? candy.red : candy.white} />
        </SpringPressable>
      </View>
    </LinearGradient>
  );
}

function StoreStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.storeStat}>
      <Text style={styles.storeStatValue}>{value}</Text>
      <Text style={styles.storeStatLabel}>{label}</Text>
    </View>
  );
}

function HomeSurpriseDeck({
  couple,
  onGoEnvies,
  onVote,
}: {
  couple: CoupleState;
  onGoEnvies: () => void;
  onVote: (cardId: string, level: VoteLevel) => boolean;
}) {
  const activeId = couple.activePartnerId;
  const unansweredCards = useMemo(
    () => availableDesireCards(couple).filter((card) => couple.votes[activeId][card.id] === undefined),
    [activeId, couple],
  );
  const unansweredKey = useMemo(() => unansweredCards.map((card) => card.id).join("|"), [unansweredCards]);
  const [deck, setDeck] = useState<DesireCard[]>(() => shuffledCards(unansweredCards));
  const [transitioningCardId, setTransitioningCardId] = useState<string | null>(null);
  const [exitingCardId, setExitingCardId] = useState<string | null>(null);
  const [burstNonce, setBurstNonce] = useState(0);
  const [burstVoteLevel, setBurstVoteLevel] = useState<VoteLevel>(2);
  const transitionTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const activeCard = deck[0];
  const transitioning = Boolean(transitioningCardId);

  const clearHomeTransitionTimers = () => {
    transitionTimers.current.forEach((timer) => clearTimeout(timer));
    transitionTimers.current = [];
  };

  useEffect(() => {
    if (transitioning) {
      return;
    }

    clearHomeTransitionTimers();
    setDeck(shuffledCards(unansweredCards));
    setExitingCardId(null);
    setTransitioningCardId(null);
  }, [activeId, transitioning, unansweredKey]);

  useEffect(() => () => clearHomeTransitionTimers(), []);

  function voteSurprise(level: VoteLevel) {
    if (!activeCard || transitioningCardId) {
      return;
    }

    const accepted = onVote(activeCard.id, level);
    if (!accepted) {
      return;
    }

    const cardId = activeCard.id;
    setTransitioningCardId(cardId);
    setBurstVoteLevel(level);

    const exitTimer = setTimeout(() => {
      setExitingCardId(cardId);
      setBurstNonce((current) => current + 1);
    }, GAME_CARD_SETTLE_MS);
    const nextTimer = setTimeout(() => {
      setDeck((current) => current.filter((card) => card.id !== cardId));
      setExitingCardId(null);
      setTransitioningCardId(null);
      transitionTimers.current = transitionTimers.current.filter((timer) => timer !== exitTimer && timer !== nextTimer);
    }, GAME_CARD_TOTAL_TRANSITION_MS);

    transitionTimers.current.push(exitTimer, nextTimer);
  }

  return (
    <View style={styles.homeSurpriseDeck}>
      {activeCard ? (
        <GameCardTransition exiting={exitingCardId === activeCard.id} key={activeCard.id}>
          <HomeSurpriseCard card={activeCard} index={0} onVote={voteSurprise} />
        </GameCardTransition>
      ) : (
        <SpringPressable onPress={onGoEnvies} style={styles.homeEmptySurpriseCard}>
          <View style={styles.homeEmptySurpriseIcon}>
            <Text style={styles.homeEmptySurpriseEmoji}>🫧</Text>
          </View>
          <Text style={styles.homeEmptySurpriseTitle}>Plus de cartes à répondre</Text>
          <Text style={styles.homeEmptySurpriseText}>
            Toutes les envies ouvertes ont déjà ta réponse. Débloque un pack ou ajoute une carte perso pour relancer le tirage.
          </Text>
        </SpringPressable>
      )}
      <PersistentBurstLayer triggerKey={burstNonce} voteLevel={burstVoteLevel} />
    </View>
  );
}

function HomeSurpriseCard({
  card,
  index,
  onVote,
}: {
  card: DesireCard;
  index: number;
  onVote: (level: VoteLevel) => void;
}) {
  const tone = categoryCardTone(card.category);

  return (
    <LinearGradient colors={tone.colors} style={styles.homeSurpriseCard}>
      <CardPattern emoji={tone.patternEmoji} />
      <EmojiSticker emoji={cardStickerEmoji(card)} size={84} style={styles.homeSurpriseSticker} />
      <View style={styles.homeSurpriseCopy}>
        <CardMetaCluster category={card.category} compact status="Non répondu" />
        <Text numberOfLines={2} style={[styles.homeSurpriseTitle, { color: tone.titleText }]}>{card.title}</Text>
        <Text numberOfLines={2} style={[styles.homeSurpriseText, { color: tone.bodyText }]}>{card.blurb}</Text>
      </View>
      <View style={styles.voteRow}>
        <VoteButton label="Non" onPress={() => onVote(0)} selected={false} testID={`home-random-${card.id}-${index}-0`} />
        <VoteButton label="Pourquoi pas" onPress={() => onVote(1)} selected={false} testID={`home-random-${card.id}-${index}-1`} />
        <VoteButton accent={tone.accent} flame onPress={() => onVote(2)} selected={false} testID={`home-random-${card.id}-${index}-2`} />
      </View>
    </LinearGradient>
  );
}

function CoupleScreen({
  couple,
  revealedMatchIds,
  onCopyInvite,
  onGoMatch,
  onJoinPartner,
}: {
  couple: CoupleState;
  revealedMatchIds: string[];
  onCopyInvite: () => void;
  onGoMatch: () => void;
  onJoinPartner: () => void;
}) {
  const { height: viewportHeight } = useWindowDimensions();
  const revealedMatchSet = useMemo(() => new Set(revealedMatchIds), [revealedMatchIds]);
  const matches = useMemo(() => matchedCards(couple), [couple]);
  const linked = hasLinkedPartner(couple);
  const activeProfile = couple.profiles[couple.activePartnerId];
  const profileNames = [couple.profiles.me.displayName, couple.profiles.partner.displayName];
  const hasPlaceholderName = profileNames.some((name) => name.toLowerCase().includes("partenaire"));
  const coupleTitle = hasPlaceholderName ? "Notre couple" : `${profileNames[0]} + ${profileNames[1]}`;
  const customCount = couple.customDesires?.length ?? 0;
  const crossedResponseCount = useMemo(
    () => availableDesireCards(couple).filter(
      (card) => couple.votes.me[card.id] !== undefined && couple.votes.partner[card.id] !== undefined,
    ).length,
    [couple],
  );
  const revealedMatches = useMemo(
    () => matches.filter((card) => revealedMatchSet.has(card.id)),
    [matches, revealedMatchSet],
  );
  const recentMatches = useMemo(() => revealedMatches.slice(0, 3), [revealedMatches]);
  const activeProfiles = PARTNER_IDS;
  const soloPanelMinHeight = Math.max(520, viewportHeight - 128);

  if (!linked) {
    return (
      <ScrollView contentContainerStyle={[styles.profileScreen, styles.coupleScreen]} showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={[candy.roseMist, candy.pinkSoft, candy.pink]}
          style={[styles.couplePanel, styles.coupleSoloPanel, { minHeight: soloPanelMinHeight }]}
        >
          <View pointerEvents="none" style={styles.coupleGlow} />
          <Text style={styles.coupleEyebrow}>En solo pour l'instant</Text>
          <View style={styles.coupleSoloAvatarStage}>
            <View style={styles.coupleAvatarBubble}>
              <Text style={styles.coupleAvatarEmoji}>{profileEmoji(activeProfile)}</Text>
            </View>
            <View style={[styles.coupleAvatarBubble, styles.coupleMissingBubble]}>
              <Users size={42} color={candy.red} />
            </View>
          </View>
          <Text style={styles.coupleTitle}>Il manque ton/ta partenaire</Text>
          <Text style={styles.coupleSub}>
            Cette section se remplira quand vous serez deux. Invite avec ton code ou rejoins le code de ton/ta partenaire.
          </Text>

          <View style={styles.coupleSoloInviteCard}>
            <View style={styles.inviteCodeBlock}>
              <Text style={styles.inviteLabel}>Ton code d'invitation</Text>
              <Text selectable style={styles.inviteCode}>{couple.inviteCode}</Text>
            </View>
            <SpringPressable onPress={onCopyInvite} style={styles.copyButton}>
              <Copy size={20} color={candy.white} />
            </SpringPressable>
          </View>

          <View style={styles.coupleSoloActions}>
            <SpringPressable onPress={onCopyInvite} style={styles.coupleSoloPrimaryAction}>
              <Copy size={18} color={candy.white} />
              <Text style={styles.coupleSoloPrimaryText}>Inviter</Text>
            </SpringPressable>
            <SpringPressable onPress={onJoinPartner} style={styles.coupleSoloSecondaryAction}>
              <Users size={18} color={candy.red} />
              <Text style={styles.coupleSoloSecondaryText}>Rejoindre</Text>
            </SpringPressable>
          </View>
        </LinearGradient>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.profileScreen, styles.coupleScreen]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[candy.roseMist, candy.pinkSoft, candy.pink]} style={styles.couplePanel}>
        <EmojiSticker emoji={stickers.heart} size={90} style={styles.coupleSticker} />
        <View pointerEvents="none" style={styles.coupleGlow} />
        <Text style={styles.coupleEyebrow}>Nous deux</Text>
        <View style={styles.coupleAvatarStage}>
          {activeProfiles.map((id, index) => (
            <View key={id} style={[styles.coupleAvatarBubble, index === 1 && styles.coupleAvatarBubbleSecond]}>
              <Text style={styles.coupleAvatarEmoji}>{profileEmoji(couple.profiles[id])}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.coupleTitle}>{coupleTitle}</Text>
        <Text style={styles.coupleSub}>
          {linked
            ? "Vos profils, vos réponses et les envies que vous avez en commun."
            : "Votre espace est prêt. Invite ton/ta partenaire pour commencer à croiser vos réponses."}
        </Text>
        <View style={styles.coupleNameRow}>
          {activeProfiles.map((id) => (
            <Text key={id} numberOfLines={1} style={styles.coupleNamePill}>{couple.profiles[id].displayName}</Text>
          ))}
        </View>
        <View style={styles.coupleStats}>
          <CoupleStat value={`${matches.length}`} label="Matchs" />
          <CoupleStat value={`${crossedResponseCount}`} label="Cartes croisées" />
          <CoupleStat value={`${customCount}`} label="Perso" />
        </View>
      </LinearGradient>

      <View style={styles.coupleSection}>
        <View style={styles.coupleSectionHeader}>
          <View style={styles.coupleSectionCopy}>
            <Text style={styles.coupleSectionTitle}>Matchs récents</Text>
            <Text style={styles.coupleSectionText}>
              {recentMatches.length
                ? "Les envies que tu as déjà révélées."
                : matches.length
                  ? "Révèle d'abord un match dans l'onglet Matchs pour le voir ici."
                  : "Rien à révéler pour l'instant. Quelques réponses peuvent suffire."}
            </Text>
          </View>
          <SpringPressable onPress={onGoMatch} style={styles.coupleSectionLink}>
            <Text style={styles.coupleSectionLinkText}>Tout voir</Text>
          </SpringPressable>
        </View>
        {recentMatches.length ? (
          <View style={styles.coupleRecentList}>
            {recentMatches.map((card) => (
              <CoupleRecentMatchItem card={card} key={card.id} onPress={onGoMatch} />
            ))}
          </View>
        ) : (
          <SpringPressable onPress={onGoMatch} style={styles.coupleEmptyMatches}>
            <Text style={styles.coupleEmptyMatchesTitle}>{matches.length ? "Match à révéler" : "Aucun match pour l'instant"}</Text>
            <Text style={styles.coupleEmptyMatchesText}>
              {matches.length ? "Ouvre l'onglet Matchs pour le révéler de ton côté." : "Répondez à quelques cartes chacun de votre côté."}
            </Text>
          </SpringPressable>
        )}
      </View>

      <View style={styles.coupleSection}>
        <View style={styles.coupleSectionHeader}>
          <View style={styles.coupleSectionCopy}>
            <Text style={styles.coupleSectionTitle}>Packs disponibles</Text>
            <Text style={styles.coupleSectionText}>Un aperçu de ce qui est ouvert pour vous deux.</Text>
          </View>
        </View>
        <View style={styles.couplePackCompactGrid}>
          {COUPLE_PACK_CATEGORIES.map((category) => {
            const unlocked = isCategoryUnlocked(couple, category);
            const count = category === PERSONAL_CATEGORY ? customCount : desireCardCount(category);

            return (
              <CouplePackMini category={category} count={count} key={category} unlocked={unlocked} />
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function CoupleStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.coupleStatPill}>
      <Text style={styles.coupleStatValue}>{value}</Text>
      <Text numberOfLines={1} style={styles.coupleStatLabel}>{label}</Text>
    </View>
  );
}

function CoupleRecentMatchItem({ card, onPress }: { card: DesireCard; onPress: () => void }) {
  const tone = categoryCardTone(card.category);

  return (
    <SpringPressable onPress={onPress} style={styles.coupleRecentMatch}>
      <LinearGradient colors={tone.colors} style={styles.coupleRecentEmojiBubble}>
        <Text style={styles.coupleRecentEmoji}>{cardStickerEmoji(card)}</Text>
      </LinearGradient>
      <View style={styles.coupleRecentCopy}>
        <Text style={[styles.coupleRecentTag, { color: categorySurfaceTagText(card.category) }]}>{categoryLabel(card.category)}</Text>
        <Text numberOfLines={1} style={styles.coupleRecentTitle}>{card.title}</Text>
        <Text numberOfLines={1} style={styles.coupleRecentText}>{card.blurb}</Text>
      </View>
      <ChevronRight size={18} color={candy.red} />
    </SpringPressable>
  );
}

function CouplePackMini({
  category,
  count,
  unlocked,
}: {
  category: DesireCategory;
  count: number;
  unlocked: boolean;
}) {
  const tone = categoryCardTone(category);

  return (
    <View style={styles.couplePackCompact}>
      <View style={[styles.couplePackDot, { backgroundColor: unlocked ? tone.tagText : "rgba(35,18,36,0.18)" }]} />
      <Text style={styles.couplePackCompactEmoji}>{tone.sticker}</Text>
      <View style={styles.couplePackCompactCopy}>
        <Text style={styles.couplePackCompactTitle}>{categoryLabel(category)}</Text>
        <Text style={styles.couplePackCompactText}>{unlocked ? `${count} dispo` : "Verrouillé"}</Text>
      </View>
    </View>
  );
}

function CoupleInsight({ emoji, text, title }: { emoji: string; text: string; title: string }) {
  return (
    <View style={styles.coupleInsightCard}>
      <Text style={styles.coupleInsightEmoji}>{emoji}</Text>
      <Text style={styles.coupleInsightTitle}>{title}</Text>
      <Text style={styles.coupleInsightText}>{text}</Text>
    </View>
  );
}

function CoupleCategoryCard({
  cardCount,
  category,
  customCount,
  onUnlock,
  unlocked,
}: {
  cardCount: number;
  category: DesireCategory;
  customCount: number;
  onUnlock: () => void;
  unlocked: boolean;
}) {
  const tone = categoryCardTone(category);
  const subtitle = unlocked
    ? `${cardCount} cartes disponibles${customCount ? `, dont ${customCount} perso` : ""}`
    : `${cardCount} cartes à débloquer pour vous deux`;

  return (
    <LinearGradient colors={unlocked ? tone.colors : ["#FFFFFF", "#FFEAF4", "#FFD4E8"]} style={[styles.coupleCategoryCard, !unlocked && styles.coupleCategoryCardLocked]}>
      <EmojiSticker emoji={tone.sticker} size={54} style={styles.coupleCategorySticker} />
      <View style={styles.coupleCategoryCopy}>
        <Text style={[styles.cardTag, { color: tone.tagText }]}>{categoryLabel(category)}</Text>
        <Text style={styles.coupleCategoryTitle}>{unlocked ? "Disponible" : "Pack verrouillé"}</Text>
        <Text style={styles.coupleCategoryText}>{subtitle}</Text>
      </View>
      {unlocked ? (
        <View style={styles.coupleCategoryStatusOpen}>
          <Text style={styles.coupleCategoryStatusText}>Ouvert</Text>
        </View>
      ) : (
        <SpringPressable onPress={onUnlock} style={styles.coupleCategoryBuyButton}>
          <LockKeyhole size={14} color={candy.white} />
          <Text style={styles.coupleCategoryBuyText}>Débloquer</Text>
        </SpringPressable>
      )}
    </LinearGradient>
  );
}

function CategoryPurchaseModal({
  category,
  onClose,
  onUnlock,
}: {
  category: DesireCategory | null;
  onClose: () => void;
  onUnlock: (category: DesireCategory) => void;
}) {
  if (!category) {
    return null;
  }

  const tone = categoryCardTone(category);
  const price = CATEGORY_PRICES[category] ?? "Inclus";
  const cardCount = desireCardCount(category);

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.purchaseOverlay}>
        <Pressable style={styles.purchaseBackdrop} onPress={onClose} />
        <LinearGradient colors={[tone.colors[0], candy.white, candy.pinkSoft]} style={styles.purchaseSheet}>
          <EmojiSticker emoji={tone.sticker} size={82} style={styles.purchaseSticker} />
          <Text style={styles.purchaseEyebrow}>Pack pour deux</Text>
          <Text style={styles.purchaseTitle}>Débloquer {categoryLabel(category)}</Text>
          <Text style={styles.purchaseText}>
            Un achat unique ouvre ce pack pour vous deux, avec de nouvelles cartes à découvrir ensemble.
          </Text>

          <View style={styles.purchaseBenefits}>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>💌</Text>
              <Text style={styles.purchaseBenefitText}>{cardCount} cartes à découvrir à deux</Text>
            </View>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>🔐</Text>
              <Text style={styles.purchaseBenefitText}>Votes invisibles jusqu'au match</Text>
            </View>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>✨</Text>
              <Text style={styles.purchaseBenefitText}>Disponible pour les deux profils</Text>
            </View>
          </View>

          <View style={styles.purchasePriceRow}>
            <Text style={styles.purchasePrice}>{price}</Text>
            <Text style={styles.purchaseFinePrint}>Achat Apple/Google validé côté serveur. En mode test local, aucun paiement réel n'est lancé.</Text>
          </View>

          <View style={styles.purchaseActions}>
            <SpringPressable onPress={() => onUnlock(category)} style={styles.purchasePrimary}>
              <Text style={styles.purchasePrimaryText}>Débloquer le pack</Text>
            </SpringPressable>
            <SpringPressable onPress={onClose} style={styles.purchaseSecondary}>
              <Text style={styles.purchaseSecondaryText}>Pas maintenant</Text>
            </SpringPressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function CustomCardsPurchaseModal({
  customCount,
  onClose,
  onUnlock,
  visible,
}: {
  customCount: number;
  onClose: () => void;
  onUnlock: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.purchaseOverlay}>
        <Pressable style={styles.purchaseBackdrop} onPress={onClose} />
        <LinearGradient colors={[candy.mint, candy.white, candy.pinkSoft]} style={styles.purchaseSheet}>
          <EmojiSticker emoji={stickers.wand} size={82} style={styles.purchaseSticker} />
          <Text style={styles.purchaseEyebrow}>Cartes perso</Text>
          <Text style={styles.purchaseTitle}>Cartes perso sans limite</Text>
          <Text style={styles.purchaseText}>
            Vous avez {Math.min(customCount, CUSTOM_CARD_FREE_LIMIT)}/{CUSTOM_CARD_FREE_LIMIT} cartes gratuites. Cette option ouvre la création sans limite pour votre couple.
          </Text>

          <View style={styles.purchaseBenefits}>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>💭</Text>
              <Text style={styles.purchaseBenefitText}>Autant de cartes perso que vous voulez</Text>
            </View>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>🪄</Text>
              <Text style={styles.purchaseBenefitText}>Toujours rangées dans la catégorie Perso</Text>
            </View>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>🔐</Text>
              <Text style={styles.purchaseBenefitText}>Les votes restent secrets jusqu'au match</Text>
            </View>
          </View>

          <View style={styles.purchasePriceRow}>
            <Text style={styles.purchasePrice}>{CUSTOM_CARDS_UNLIMITED_PRICE}</Text>
            <Text style={styles.purchaseFinePrint}>Achat Apple/Google validé côté serveur. En mode test local, aucun paiement réel n'est lancé.</Text>
          </View>

          <View style={styles.purchaseActions}>
            <SpringPressable onPress={onUnlock} style={styles.purchasePrimary}>
              <Text style={styles.purchasePrimaryText}>Débloquer la création</Text>
            </SpringPressable>
            <SpringPressable onPress={onClose} style={styles.purchaseSecondary}>
              <Text style={styles.purchaseSecondaryText}>Pas maintenant</Text>
            </SpringPressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function NoAdsPurchaseModal({
  onClose,
  onUnlock,
  visible,
}: {
  onClose: () => void;
  onUnlock: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.purchaseOverlay}>
        <Pressable style={styles.purchaseBackdrop} onPress={onClose} />
        <LinearGradient colors={[candy.white, candy.roseMist, candy.pinkSoft]} style={styles.purchaseSheet}>
          <Text style={styles.purchaseNoAdsEmoji}>🚫</Text>
          <Text style={styles.purchaseEyebrow}>Confort</Text>
          <Text style={styles.purchaseTitle}>Pack No Ads</Text>
          <Text style={styles.purchaseText}>
            Retire les écrans sponsorisés de WeSpice pour garder le rythme quand vous jouez ou révélez un match.
          </Text>

          <View style={styles.purchaseBenefits}>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>🔥</Text>
              <Text style={styles.purchaseBenefitText}>Révélations sans interstitiel</Text>
            </View>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>🎲</Text>
              <Text style={styles.purchaseBenefitText}>Moins d'interruptions entre les cartes</Text>
            </View>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>💞</Text>
              <Text style={styles.purchaseBenefitText}>Actif pour votre couple</Text>
            </View>
          </View>

          <View style={styles.purchasePriceRow}>
            <Text style={styles.purchasePrice}>{NO_ADS_PRICE}</Text>
            <Text style={styles.purchaseFinePrint}>Achat Apple/Google validé côté serveur. En mode test local, aucun paiement réel n'est lancé.</Text>
          </View>

          <View style={styles.purchaseActions}>
            <SpringPressable onPress={onUnlock} style={styles.purchasePrimary}>
              <Text style={styles.purchasePrimaryText}>Débloquer No Ads</Text>
            </SpringPressable>
            <SpringPressable onPress={onClose} style={styles.purchaseSecondary}>
              <Text style={styles.purchaseSecondaryText}>Pas maintenant</Text>
            </SpringPressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function UnlimitedResponsesPurchaseModal({
  dailyUsed,
  limitReached,
  onClose,
  onUnlock,
  visible,
}: {
  dailyUsed: number;
  limitReached?: boolean;
  onClose: () => void;
  onUnlock: () => void;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  const usedToday = Math.min(dailyUsed, DAILY_FREE_RESPONSE_LIMIT);

  return (
    <Modal animationType="fade" transparent visible onRequestClose={onClose}>
      <View style={styles.purchaseOverlay}>
        <Pressable style={styles.purchaseBackdrop} onPress={onClose} />
        <LinearGradient colors={[candy.white, candy.roseMist, candy.pinkSoft]} style={styles.purchaseSheet}>
          <Text style={styles.purchaseNoAdsEmoji}>🎟️</Text>
          <Text style={styles.purchaseEyebrow}>{limitReached ? "Quota du jour" : "Rythme"}</Text>
          <Text style={styles.purchaseTitle}>
            {limitReached ? "Tes 5 choix du jour sont utilisés." : "Réponses illimitées"}
          </Text>
          <Text style={styles.purchaseText}>
            {limitReached
              ? "Reviens demain pour garder le rituel, ou débloque l'illimité si vous voulez jouer plus longtemps aujourd'hui."
              : `${DAILY_FREE_RESPONSE_LIMIT} choix gratuits par jour. Modifier une carte déjà répondue compte aussi.`}
          </Text>

          <View style={styles.purchaseBenefits}>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>🗓️</Text>
              <Text style={styles.purchaseBenefitText}>{usedToday}/{DAILY_FREE_RESPONSE_LIMIT} choix utilisés aujourd'hui</Text>
            </View>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>🔥</Text>
              <Text style={styles.purchaseBenefitText}>Jouez autant de cartes que vous voulez dans la journée</Text>
            </View>
            <View style={styles.purchaseBenefit}>
              <Text style={styles.purchaseBenefitEmoji}>💞</Text>
              <Text style={styles.purchaseBenefitText}>Actif pour les deux profils du couple</Text>
            </View>
          </View>

          <View style={styles.purchasePriceRow}>
            <Text style={styles.purchasePrice}>{UNLIMITED_RESPONSES_PRICE}</Text>
            <Text style={styles.purchaseFinePrint}>Achat Apple/Google validé côté serveur. En mode test local, aucun paiement réel n'est lancé.</Text>
          </View>

          <View style={styles.purchaseActions}>
            <SpringPressable onPress={onUnlock} style={styles.purchasePrimary}>
              <Text style={styles.purchasePrimaryText}>Débloquer l'illimité</Text>
            </SpringPressable>
            <SpringPressable onPress={onClose} style={styles.purchaseSecondary}>
              <Text style={styles.purchaseSecondaryText}>{limitReached ? "Revenir demain" : "Pas maintenant"}</Text>
            </SpringPressable>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}

function PurchaseSuccessScreen({ purchase, onDiscover }: { purchase: PurchaseSuccess; onDiscover: () => void }) {
  const pulse = useLoop(1700);
  const drift = useLoop(4200);
  const isCustom = purchase.kind === "custom";
  const isNoAds = purchase.kind === "no_ads";
  const isUnlimitedResponses = purchase.kind === "unlimited_responses";
  const category: DesireCategory = purchase.kind === "category" ? purchase.category : "Perso";
  const tone = isNoAds || isUnlimitedResponses
    ? {
        colors: [candy.white, candy.roseMist, candy.pinkSoft] as const,
        sticker: isUnlimitedResponses ? "🎟️" : "🚫",
        tagText: candy.red,
      }
    : categoryCardTone(category);
  const title = isNoAds
    ? "No Ads"
    : isUnlimitedResponses
      ? "Réponses illimitées"
      : isCustom
        ? "Cartes perso sans limite"
        : `Pack ${categoryLabel(category)}`;
  const packText = isNoAds
    ? "Les écrans sponsorisés sont retirés. Vous gardez les révélations et les cartes sans pause pub."
    : isUnlimitedResponses
      ? "La limite quotidienne est retirée. Vous pouvez répondre à autant de cartes que vous voulez."
    : isCustom
      ? "Vous pouvez créer autant de cartes perso que vous voulez. Elles restent privées jusqu'au match."
      : `${desireCardCount(category)} nouvelles cartes à explorer. Les réponses restent privées jusqu'au match.`;
  const successText = isNoAds
    ? "WeSpice est maintenant plus fluide pour votre couple."
    : isUnlimitedResponses
      ? "Vous pouvez continuer votre session sans attendre demain."
    : `${title} est maintenant disponible pour votre couple.`;
  const ctaLabel = isNoAds ? "Continuer sans pub" : isUnlimitedResponses ? "Continuer à jouer" : "Découvrir les cartes";
  const stickerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const floatY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const shimmerX = pulse.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });

  return (
    <View style={styles.purchaseSuccessScreen}>
      <Animated.View pointerEvents="none" style={[styles.purchaseSuccessGlow, { transform: [{ scale: stickerScale }] }]} />
      <Animated.Text
        pointerEvents="none"
        style={[styles.purchaseSuccessConfetti, styles.purchaseSuccessConfettiOne, { transform: [{ translateY: floatY }] }]}
      >
        ✦
      </Animated.Text>
      <Animated.Text
        pointerEvents="none"
        style={[styles.purchaseSuccessConfetti, styles.purchaseSuccessConfettiTwo, { transform: [{ translateY: floatY }] }]}
      >
        ●
      </Animated.Text>
      <Animated.Text
        pointerEvents="none"
        style={[styles.purchaseSuccessConfetti, styles.purchaseSuccessConfettiThree, { transform: [{ translateX: shimmerX }] }]}
      >
        ✧
      </Animated.Text>

      <Entrance delay={0}>
        <Animated.View style={{ transform: [{ scale: stickerScale }] }}>
          <EmojiSticker emoji={tone.sticker} size={116} style={styles.purchaseSuccessSticker} />
        </Animated.View>
      </Entrance>

      <Entrance delay={100}>
        <Text style={styles.purchaseSuccessEyebrow}>Achat validé</Text>
        <Text style={styles.purchaseSuccessTitle}>C'est débloqué.</Text>
        <Text style={styles.purchaseSuccessText}>
          {successText}
        </Text>
      </Entrance>

      <Entrance delay={190}>
        <LinearGradient colors={tone.colors} style={styles.purchaseSuccessPack}>
          <Animated.View
            pointerEvents="none"
            style={[styles.purchaseSuccessShimmer, { transform: [{ translateX: shimmerX }, { rotate: "-8deg" }] }]}
          />
          <Text style={[styles.purchaseSuccessPackTag, { color: tone.tagText }]}>
            {isNoAds || isUnlimitedResponses ? "Confort" : categoryLabel(category)}
          </Text>
          <Text style={styles.purchaseSuccessPackTitle}>{title}</Text>
          <Text style={styles.purchaseSuccessPackText}>{packText}</Text>
        </LinearGradient>
      </Entrance>

      <Entrance delay={290}>
        <SpringPressable onPress={onDiscover} style={styles.purchaseSuccessCTA}>
          <Text style={styles.purchaseSuccessCTAText}>{ctaLabel}</Text>
          <ChevronRight size={21} color={candy.white} />
        </SpringPressable>
      </Entrance>
    </View>
  );
}

function ProfileScreen({
  authError,
  couple,
  providerLoading,
  session,
  onLogout,
  onMoodNotificationPreference,
  onNotificationPreference,
  onProvider,
  onRequestLeaveCouple,
  onReplayTutorial,
  onRestorePurchases,
  onReset,
  onStatusEmojiChange,
}: {
  authError: string;
  couple: CoupleState;
  providerLoading: AuthProvider | null;
  session: Session | null;
  onLogout: () => void;
  onMoodNotificationPreference: (enabled: boolean) => void;
  onNotificationPreference: (key: NotificationToggleKey, enabled: boolean) => void;
  onProvider: (provider: AuthProvider) => void;
  onRequestLeaveCouple: () => void;
  onReplayTutorial: () => void;
  onRestorePurchases: () => void;
  onReset: () => void;
  onStatusEmojiChange: (emoji: string) => void;
}) {
  const activeProfile = couple.profiles[couple.activePartnerId];
  const profileIcon = profileEmoji(activeProfile);
  const activePartnerId = couple.activePartnerId;
  const settings = notificationSettings(couple);
  const account = authAccountInfo(session);
  const notificationRows: Array<{
    emoji: string;
    eyebrow: string;
    key: NotificationToggleKey;
    offText: string;
    onText: string;
    title: string;
  }> = [
    {
      emoji: "✨",
      eyebrow: "État partagé",
      key: "moodSignalEnabled",
      offText: "Aucune alerte ne sera envoyée pour l'instant.",
      onText: "Tu reçois une alerte quand vos états se rejoignent.",
      title: "Envies croisées",
    },
    {
      emoji: "🎲",
      eyebrow: "Quotidien",
      key: "dailyReminderEnabled",
      offText: "Pas de rappel quotidien.",
      onText: "Une relance par jour pour répondre à une carte.",
      title: "Carte du jour",
    },
    {
      emoji: "🔥",
      eyebrow: "Révélations",
      key: "matchRevealEnabled",
      offText: "Les matchs resteront visibles dans l'app.",
      onText: "Tu es prévenu.e quand une envie commune est prête.",
      title: "Nouveaux matchs",
    },
    {
      emoji: "💬",
      eyebrow: "Chat",
      key: "chatMessageEnabled",
      offText: "Pas d'alerte pour les messages privés.",
      onText: "Tu reçois les messages avant qu'ils disparaissent à 6h.",
      title: "Messages privés",
    },
    {
      emoji: "🎁",
      eyebrow: "Packs",
      key: "promotionEnabled",
      offText: "Aucune alerte sur les packs.",
      onText: "Tu peux recevoir les nouveautés et nouveaux packs.",
      title: "Packs et nouveautés",
    },
  ];

  function confirmReset() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Réinitialiser la version de test ? Les profils et votes locaux seront supprimés.")) {
        void onReset();
      }
      return;
    }

    Alert.alert("Réinitialiser la version de test ?", "Les profils et votes locaux seront supprimés.", [
      { text: "Annuler", style: "cancel" },
      { text: "Réinitialiser", style: "destructive", onPress: onReset },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={styles.profileScreen} showsVerticalScrollIndicator={false}>
      <View style={styles.profileMainArea}>
      <LinearGradient colors={[candy.red, "#FF4F9D", candy.pink]} style={styles.profilePanel}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileAvatarEmoji}>{profileIcon}</Text>
        </View>
        <Text style={styles.profileTitle}>{activeProfile.displayName}</Text>
        <Text numberOfLines={1} selectable style={styles.profileMeta}>
          {account.connected ? `${account.providerLabel} · ${account.email || account.displayName}` : "Mode test local"}
        </Text>
      </LinearGradient>
        <View style={styles.profileSettingsSection}>
          <Text style={styles.profileSectionTitle}>Statut</Text>
          <StatusEmojiEditor profile={activeProfile} onChange={onStatusEmojiChange} />
        </View>
        <View style={styles.profileSettingsSection}>
          <Text style={styles.profileSectionTitle}>Compte</Text>
          <ProfileAccountPanel
            account={account}
            authError={authError}
            providerLoading={providerLoading}
            onProvider={onProvider}
          />
        </View>
        <View style={styles.profileSettingsSection}>
          <Text style={styles.profileSectionTitle}>Notifications</Text>
          <View style={styles.profileNotificationList}>
            {notificationRows.map((row) => {
              const enabled = settings[row.key][activePartnerId];
              const toggle = row.key === "moodSignalEnabled" ? onMoodNotificationPreference : (next: boolean) => onNotificationPreference(row.key, next);

              return (
                <NotificationPreferenceRow
                  enabled={enabled}
                  emoji={row.emoji}
                  eyebrow={row.eyebrow}
                  key={row.key}
                  offText={row.offText}
                  onText={row.onText}
                  onToggle={() => toggle(!enabled)}
                  title={row.title}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.profileSettingsSection}>
          <Text style={styles.profileSectionTitle}>App</Text>
          <View style={styles.profileUtilityGrid}>
            <SpringPressable onPress={confirmReset} style={styles.profileAction}>
              <RefreshCcw size={18} color={candy.red} />
              <Text style={styles.profileActionText}>Réinitialiser le test</Text>
            </SpringPressable>
            <SpringPressable onPress={onReplayTutorial} style={styles.profileAction}>
              <Sparkles size={18} color={candy.red} />
              <Text style={styles.profileActionText}>Revoir l'intro</Text>
            </SpringPressable>
            <SpringPressable onPress={onRestorePurchases} style={styles.profileAction}>
              <RefreshCcw size={18} color={candy.red} />
              <Text style={styles.profileActionText}>Restaurer les achats</Text>
            </SpringPressable>
          </View>
        </View>

        <View style={styles.profileSettingsSection}>
          <Text style={styles.profileSectionTitle}>Actions</Text>
          <View style={styles.profileBottomActions}>
            <SpringPressable onPress={onRequestLeaveCouple} style={styles.profileLeaveAction}>
              <Users size={18} color={candy.red} />
              <Text style={styles.profileLeaveActionText}>Quitter le couple</Text>
            </SpringPressable>
            <SpringPressable onPress={onLogout} style={styles.logoutAction}>
              <LogOut size={18} color={candy.white} />
              <Text style={styles.logoutActionText}>Se déconnecter</Text>
            </SpringPressable>
          </View>
        </View>

      <View style={styles.aboutPanel}>
        <Text style={styles.aboutEyebrow}>À propos</Text>
        <Text style={styles.aboutTitle}>WeSpice</Text>
        <Text style={styles.aboutText}>
          WeSpice aide à découvrir les envies partagées, avec des réponses privées et un cadre clair.
        </Text>
        <Text style={styles.aboutMeta}>{PROJECT_VERSION.label} · Données privées par couple</Text>
      </View>
      </View>
    </ScrollView>
  );
}

function StatusEmojiEditor({
  onChange,
  profile,
}: {
  onChange: (emoji: string) => void;
  profile: PartnerProfile;
}) {
  const [customEmoji, setCustomEmoji] = useState(profileEmoji(profile));
  const currentEmoji = profileEmoji(profile);

  useEffect(() => {
    setCustomEmoji(currentEmoji);
  }, [currentEmoji]);

  function submitCustomEmoji() {
    const nextEmoji = normalizeStatusEmoji(customEmoji);
    setCustomEmoji(nextEmoji);
    onChange(nextEmoji);
  }

  return (
    <View style={styles.statusEditorPanel}>
      <View style={styles.statusEditorHeader}>
        <View style={styles.statusEditorPreview}>
          <Text style={styles.statusEditorPreviewEmoji}>{currentEmoji}</Text>
        </View>
        <View style={styles.statusEditorCopy}>
          <Text style={styles.statusEditorTitle}>Ton signal du moment</Text>
          <Text style={styles.statusEditorText}>Visible dans Notre couple. Parfait pour teaser sans écrire un message.</Text>
        </View>
      </View>
      <View style={styles.statusPresetGrid}>
        {statusEmojiPresets.map((emoji) => (
          <SpringPressable
            key={emoji}
            onPress={() => onChange(emoji)}
            style={[styles.statusPresetButton, currentEmoji === emoji && styles.statusPresetButtonActive]}
          >
            <Text style={styles.statusPresetEmoji}>{emoji}</Text>
          </SpringPressable>
        ))}
      </View>
      <View style={styles.statusCustomRow}>
        <TextInput
          maxLength={6}
          onChangeText={setCustomEmoji}
          onSubmitEditing={submitCustomEmoji}
          placeholder="🍆"
          placeholderTextColor="rgba(35,18,36,0.34)"
          style={styles.statusCustomInput}
          value={customEmoji}
        />
        <SpringPressable onPress={submitCustomEmoji} style={styles.statusCustomButton}>
          <Text style={styles.statusCustomButtonText}>Mettre à jour</Text>
        </SpringPressable>
      </View>
    </View>
  );
}

function NotificationPreferenceRow({
  enabled,
  emoji,
  eyebrow,
  offText,
  onText,
  onToggle,
  title,
}: {
  enabled: boolean;
  emoji: string;
  eyebrow: string;
  offText: string;
  onText: string;
  onToggle: () => void;
  title: string;
}) {
  return (
    <View style={styles.profileNotificationPanel}>
      <View style={[styles.profileNotificationIcon, enabled && styles.profileNotificationIconOn]}>
        <Text style={styles.profileNotificationEmoji}>{emoji}</Text>
      </View>
      <View style={styles.profileNotificationCopy}>
        <Text style={styles.profileNotificationEyebrow}>{eyebrow}</Text>
        <Text style={styles.profileNotificationTitle}>{title}</Text>
        <Text style={styles.profileNotificationText}>{enabled ? onText : offText}</Text>
      </View>
      <SpringPressable
        onPress={onToggle}
        style={[styles.profileNotificationToggle, enabled && styles.profileNotificationToggleOn]}
      >
        <Text style={[styles.profileNotificationToggleText, enabled && styles.profileNotificationToggleTextOn]}>
          {enabled ? "On" : "Off"}
        </Text>
      </SpringPressable>
    </View>
  );
}

function DebugScreen({
  couple,
  onActorChange,
  onApplyPreset,
  onDebugFakeAd,
  onDisableDebugProfiles,
  onReplayTutorial,
  onReset,
  onShowInvitePrompt,
  onShowOnboarding,
}: {
  couple: CoupleState;
  onActorChange: (id: PartnerId) => void;
  onApplyPreset: (preset: DebugPresetId) => void;
  onDebugFakeAd: () => void;
  onDisableDebugProfiles: () => void;
  onReplayTutorial: () => void;
  onReset: () => void;
  onShowInvitePrompt: () => void;
  onShowOnboarding: () => void;
}) {
  const matches = matchedCards(couple);
  const activeName = couple.profiles[couple.activePartnerId].displayName;
  const activeMood = moodOptions.find((option) => option.level === moodLevel(couple, couple.activePartnerId));
  const activeVotes = Object.keys(couple.votes[couple.activePartnerId]).length;
  const activeHotVotes = Object.values(couple.votes[couple.activePartnerId]).filter(isFlameVote).length;
  const chatCount = couple.chat?.messages.length ?? 0;
  const loadedSince = new Date(couple.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
  const presets: Array<{ id: DebugPresetId; title: string; text: string }> = [
    {
      id: "empty",
      title: "Couple vide",
      text: "Alex + Sam, zéro vote, zéro état choisi. Idéal pour tester l'état vide.",
    },
    {
      id: "mood",
      title: "États alignés",
      text: "Les deux partenaires sont Chaud pour tester l'alerte.",
    },
    {
      id: "reveal",
      title: "Match à révéler",
      text: "Un match caché attend dans l'onglet Match.",
    },
    {
      id: "full",
      title: "Couple rempli",
      text: "Plusieurs votes, plusieurs matchs et un état chaud.",
    },
  ];
  const loadedPreset = presets.find((preset) => couple.id.startsWith(`debug-${preset.id}-`));

  function confirmReset() {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Réinitialisation complète ? L'espace local, les votes et les profils de test seront supprimés.")) {
        void onReset();
      }
      return;
    }

    Alert.alert("Réinitialisation complète ?", "L'espace local, les votes et les profils de test seront supprimés.", [
      { text: "Annuler", style: "cancel" },
      { text: "Réinitialiser", style: "destructive", onPress: onReset },
    ]);
  }

  function confirmOnboarding() {
    Alert.alert("Revenir à l'intro ?", "L'espace local actuel sera supprimé pour afficher l'écran créer/rejoindre.", [
      { text: "Annuler", style: "cancel" },
      { text: "Continuer", style: "destructive", onPress: onShowOnboarding },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={[styles.screen, styles.debugScreen]} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[candy.black, "#481132", candy.red]} style={styles.debugHero}>
        <Code2 size={28} color={candy.white} />
        <Text style={styles.debugEyebrow}>Dev tools</Text>
        <Text style={styles.debugTitle}>Debug WeSpice</Text>
        <Text style={styles.debugText}>Accès rapide aux états de test sans casser le parcours utilisateur.</Text>
        <View style={styles.debugStats}>
          <StatPill value={activeName} label="Actif" />
          <StatPill value={`${matches.length}`} label="Matchs" />
        </View>
      </LinearGradient>

      <View style={styles.debugLoadedPanel}>
        <View style={styles.debugLoadedHeader}>
          <View style={styles.debugLoadedTitleBlock}>
            <Text style={styles.debugLoadedEyebrow}>Couple chargé</Text>
            <Text style={styles.debugLoadedTitle}>{loadedPreset?.title ?? "Espace local"}</Text>
          </View>
          <Text style={styles.debugCodeBadge}>{couple.inviteCode}</Text>
        </View>
        <View style={styles.debugInfoGrid}>
          <DebugInfoCell compact label="ID" value={couple.id} />
          <DebugInfoCell label="Créé" value={loadedSince} />
          <DebugInfoCell label="Votes actifs" value={`${activeVotes}`} />
          <DebugInfoCell label="Flammes" value={`${activeHotVotes}`} />
          <DebugInfoCell label="État actif" value={`${activeMood?.emoji ?? "-"} ${activeMood?.label ?? "Calme"}`} />
          <DebugInfoCell label="Chat" value={`${chatCount}`} />
        </View>
        {loadedPreset ? (
          <SpringPressable onPress={onDisableDebugProfiles} style={styles.debugRestoreAction}>
            <User size={18} color={candy.red} />
            <View style={styles.debugActionCopy}>
              <Text style={styles.debugRestoreTitle}>Désactiver les profils de test</Text>
              <Text style={styles.debugRestoreText}>Revenir à mon vrai compte et quitter Alex + Sam.</Text>
            </View>
          </SpringPressable>
        ) : null}
      </View>

      <View style={styles.debugSectionHeader}>
        <Text style={styles.debugSectionTitle}>Point de vue</Text>
        <Text style={styles.debugSectionText}>Bascule comme si tu étais l'un ou l'autre partenaire.</Text>
      </View>

      <View style={styles.debugActorGrid}>
        {(["me", "partner"] as PartnerId[]).map((id) => {
          const profile = couple.profiles[id];
          const active = id === couple.activePartnerId;
          const partnerMood = moodOptions.find((option) => option.level === moodLevel(couple, id));
          const voteCount = Object.keys(couple.votes[id]).length;
          const hotCount = Object.values(couple.votes[id]).filter(isFlameVote).length;

          return (
            <SpringPressable
              key={id}
              onPress={() => {
                onActorChange(id);
                void Haptics.selectionAsync();
              }}
              style={[styles.debugActorCard, active && styles.debugActorCardActive]}
            >
              <View style={styles.debugActorTopLine}>
                <Text style={[styles.debugActorName, active && styles.debugActorNameActive]}>{profile.displayName}</Text>
                <Text style={[styles.debugActorBadge, active && styles.debugActorBadgeActive]}>
                  {active ? "Vue active" : id === "me" ? "Moi" : "Partenaire"}
                </Text>
              </View>
              <Text numberOfLines={2} style={[styles.debugActorMeta, active && styles.debugActorMetaActive]}>{profile.vibe}</Text>
              <View style={styles.debugActorStats}>
                <Text style={[styles.debugActorStat, active && styles.debugActorStatActive]}>{partnerMood?.emoji ?? "-"} {partnerMood?.label ?? "Calme"}</Text>
                <Text style={[styles.debugActorStat, active && styles.debugActorStatActive]}>{voteCount} votes</Text>
                <Text style={[styles.debugActorStat, active && styles.debugActorStatActive]}>{hotCount} flammes</Text>
              </View>
            </SpringPressable>
          );
        })}
      </View>

      <View style={styles.debugActionGrid}>
        <SpringPressable onPress={onReplayTutorial} style={styles.debugAction}>
          <Sparkles size={19} color={candy.red} />
          <View style={styles.debugActionCopy}>
            <Text style={styles.debugActionTitle}>Tester l'intro</Text>
            <Text style={styles.debugActionText}>Relance l'intro interactive sans réinitialiser.</Text>
          </View>
        </SpringPressable>
        <SpringPressable onPress={onShowInvitePrompt} style={styles.debugAction}>
          <MessageCircle size={19} color={candy.red} />
          <View style={styles.debugActionCopy}>
            <Text style={styles.debugActionTitle}>Tester invitation</Text>
            <Text style={styles.debugActionText}>Affiche le ticket de code partenaire.</Text>
          </View>
        </SpringPressable>
        <SpringPressable onPress={onDebugFakeAd} style={styles.debugAction}>
          <Flame size={19} color={candy.red} fill={candy.red} />
          <View style={styles.debugActionCopy}>
            <Text style={styles.debugActionTitle}>Tester pub</Text>
            <Text style={styles.debugActionText}>Force l'affichage de l'interstitielle test.</Text>
          </View>
        </SpringPressable>
        <SpringPressable onPress={confirmOnboarding} style={styles.debugAction}>
          <Users size={19} color={candy.red} />
          <View style={styles.debugActionCopy}>
            <Text style={styles.debugActionTitle}>Onboarding</Text>
            <Text style={styles.debugActionText}>Retour à créer / rejoindre.</Text>
          </View>
        </SpringPressable>
        <SpringPressable onPress={confirmReset} style={[styles.debugAction, styles.debugDangerAction]}>
          <RefreshCcw size={19} color={candy.white} />
          <View style={styles.debugActionCopy}>
            <Text style={styles.debugDangerTitle}>Tout réinitialiser</Text>
            <Text style={styles.debugDangerText}>Vide le stockage local.</Text>
          </View>
        </SpringPressable>
      </View>

      <View style={styles.debugSectionHeader}>
        <Text style={styles.debugSectionTitle}>Profils de test</Text>
        <Text style={styles.debugSectionText}>Un appui, un état propre pour QA.</Text>
      </View>

      <View style={styles.debugPresetList}>
        {presets.map((preset) => (
          <SpringPressable
            key={preset.id}
            onPress={() => onApplyPreset(preset.id)}
            style={[styles.debugPreset, loadedPreset?.id === preset.id && styles.debugPresetActive]}
          >
            <View style={styles.debugPresetIcon}>
              <Code2 size={18} color={candy.white} />
            </View>
            <View style={styles.debugPresetCopy}>
              <Text style={styles.debugPresetTitle}>{preset.title}</Text>
              <Text style={styles.debugPresetText}>{preset.text}</Text>
            </View>
            <Text style={[styles.debugPresetTarget, loadedPreset?.id === preset.id && styles.debugPresetTargetActive]}>
              {loadedPreset?.id === preset.id ? "Chargé" : "Charger"}
            </Text>
          </SpringPressable>
        ))}
      </View>
    </ScrollView>
  );
}

function DebugInfoCell({ compact, label, value }: { compact?: boolean; label: string; value: string }) {
  return (
    <View style={[styles.debugInfoCell, compact && styles.debugInfoCellWide]}>
      <Text style={styles.debugInfoLabel}>{label}</Text>
      <Text numberOfLines={1} style={styles.debugInfoValue}>{value}</Text>
    </View>
  );
}

function AuthGate({
  authError,
  localModeEnabled,
  providerLoading,
  onDemo,
  onProvider,
}: {
  authError: string;
  localModeEnabled: boolean;
  providerLoading: AuthProvider | null;
  onDemo: () => void;
  onProvider: (provider: AuthProvider) => void;
}) {
  return (
    <ScrollView contentContainerStyle={styles.authScreen}>
      <WeSpiceLogo />
      <Text style={styles.authText}>Vos envies restent privées jusqu'à ce qu'elles soient partagées.</Text>
      <View style={styles.authCard}>
        <CandyButton
          disabled={providerLoading !== null}
          icon={<Search size={18} color={candy.white} />}
          label={providerLoading === "google" ? "Connexion..." : "Continuer avec Google"}
          onPress={() => onProvider("google")}
        />
        <CandyButton
          disabled={providerLoading !== null}
          icon={<Apple size={18} color={candy.white} />}
          label={providerLoading === "apple" ? "Connexion..." : "Continuer avec Apple"}
          onPress={() => onProvider("apple")}
        />
        {localModeEnabled ? (
          <SpringPressable onPress={onDemo} style={styles.demoButton}>
            <Sparkles size={18} color={candy.red} />
            <Text style={styles.demoButtonText}>Essayer en mode test</Text>
          </SpringPressable>
        ) : null}
        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      </View>
    </ScrollView>
  );
}

function WelcomeTutorialScreen({
  account,
  guestMode,
  onStart,
}: {
  account: AuthAccountInfo;
  guestMode: boolean;
  onStart: () => void;
}) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const [demoVote, setDemoVote] = useState<VoteLevel | null>(null);
  const [demoCardNonce, setDemoCardNonce] = useState(0);
  const [demoCardExiting, setDemoCardExiting] = useState(false);
  const [demoTransitioning, setDemoTransitioning] = useState(false);
  const [demoBurstNonce, setDemoBurstNonce] = useState(0);
  const progressBarEntrance = useRef(new Animated.Value(0)).current;
  const progressBarProgress = useRef(new Animated.Value(0)).current;
  const demoTransitionTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const compactWelcome = viewportHeight < 430;
  const demoCardWidth = Math.min(520, Math.max(280, viewportWidth - (compactWelcome ? 64 : 84)));
  const demoCardHeight = compactWelcome ? 246 : 260;
  const demoTone = categoryCardTone("Vanille");
  const demoFeedback =
    demoVote === 2
      ? "Flamme envoyée. Si ton/ta partenaire répond au moins Pourquoi pas, le match se révèle."
      : demoVote === 1
        ? "Pourquoi pas est noté. Si l'autre répond aussi au moins Pourquoi pas, ça devient un match."
        : demoVote === 0
          ? "Rien n'est dévoilé et personne n'a à se justifier."
          : "Choisis une réponse pour tester le système.";
  const pages = [
    {
      eyebrow: "",
      title: "Bienvenue dans WeSpice",
      text: "Un jeu privé pour découvrir ce qui vous tente tous les deux.",
      emoji: stickers.cherries,
      tone: "pink",
      kind: "intro",
    },
    {
      eyebrow: "Le concept",
      title: "Vous jouez chacun de votre côté.",
      text: "Tu réponds aux cartes de ton côté. Ton/ta partenaire fait pareil. L'app ne révèle que les envies partagées.",
      emoji: stickers.lock,
      tone: "yellow",
      kind: "concept",
    },
    {
      eyebrow: "Mini tuto",
      title: "Teste une carte",
      text: "Choisis une réponse. C'est le cœur du jeu.",
      emoji: stickers.flame,
      tone: "hot",
      kind: "demo",
    },
    {
      eyebrow: "Règle 1",
      title: "Tes réponses restent à toi.",
      text: "Un Non reste invisible. Pourquoi pas et la flamme se montrent seulement dans un match.",
      emoji: stickers.lock,
      tone: "soft",
      kind: "rule",
    },
    {
      eyebrow: "Règle 2",
      title: "Deux réponses positives créent un match.",
      text: "Dès que vous répondez tous les deux au moins Pourquoi pas sur la même envie, elle se révèle.",
      emoji: stickers.flame,
      tone: "hot",
      kind: "rule",
    },
    {
      eyebrow: "Règle 3",
      title: "Un match ouvre une discussion.",
      text: "Ce n'est pas une obligation. C'est une invitation à en parler, clarifier, rire ou garder ça pour plus tard.",
      emoji: stickers.speech,
      tone: "blue",
      kind: "rule",
    },
    {
      eyebrow: "Fin",
      title: "Prêt.e à créer votre espace ?",
      text: "Ensuite: crée ton profil, invite ton/ta partenaire, puis découvrez vos envies communes.",
      emoji: stickers.heart,
      tone: "pink",
      kind: "finish",
    },
  ];
  const shouldShowProgress = page > 0;
  const progressValue = page / (pages.length - 1);
  const progressWidth = progressBarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const currentPage = pages[page];
  const isLastPage = page === pages.length - 1;
  const isDemoPage = currentPage.kind === "demo";
  const isDemoCardVoted = demoVote !== null && !demoTransitioning;
  const canGoNext = !isDemoPage || (demoVote !== null && !demoTransitioning);

  useEffect(() => {
    Animated.timing(progressBarEntrance, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
      toValue: shouldShowProgress ? 1 : 0,
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [progressBarEntrance, shouldShowProgress]);

  useEffect(() => {
    Animated.timing(progressBarProgress, {
      duration: 520,
      easing: Easing.out(Easing.cubic),
      toValue: progressValue,
      useNativeDriver: false,
    }).start();
  }, [progressBarProgress, progressValue]);

  const clearDemoTransitionTimers = () => {
    demoTransitionTimers.current.forEach((timer) => clearTimeout(timer));
    demoTransitionTimers.current = [];
  };

  useEffect(() => () => clearDemoTransitionTimers(), []);

  useEffect(() => {
    if (!isDemoPage) {
      clearDemoTransitionTimers();
      setDemoCardExiting(false);
      setDemoTransitioning(false);
    }
  }, [isDemoPage]);

  function chooseDemoVote(level: VoteLevel) {
    if (demoTransitioning) {
      return;
    }

    setDemoVote(level);
    void (level === 2
      ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      : Haptics.selectionAsync());

    setDemoTransitioning(true);
    const exitTimer = setTimeout(() => {
      setDemoCardExiting(true);
      setDemoBurstNonce((current) => current + 1);
    }, GAME_CARD_SETTLE_MS);
    const nextTimer = setTimeout(() => {
      setDemoCardExiting(false);
      setDemoTransitioning(false);
      setDemoCardNonce((current) => current + 1);
      demoTransitionTimers.current = demoTransitionTimers.current.filter((timer) => timer !== exitTimer && timer !== nextTimer);
    }, GAME_CARD_TOTAL_TRANSITION_MS);

    demoTransitionTimers.current.push(exitTimer, nextTimer);
  }

  async function goBack() {
    if (page === 0) {
      return;
    }

    setPage((current) => Math.max(0, current - 1));
    await Haptics.selectionAsync();
  }

  async function goNext() {
    if (!canGoNext) {
      await Haptics.selectionAsync();
      return;
    }

    if (isLastPage) {
      await Haptics.selectionAsync();
      onStart();
      return;
    }

    setPage((current) => Math.min(pages.length - 1, current + 1));
    await Haptics.selectionAsync();
  }

  async function start() {
    await Haptics.selectionAsync();
    onStart();
  }

  return (
    <View style={styles.welcomeFrame}>
      <ScrollView
        contentContainerStyle={[styles.welcomeScreen, compactWelcome && styles.welcomeScreenCompact]}
        showsVerticalScrollIndicator={false}
        style={styles.flex}
      >
        <View style={[styles.welcomeTopBar, compactWelcome && styles.welcomeTopBarCompact]}>
          <WeSpiceLogo compact style={styles.welcomeLogo} />
        </View>
        {page === 0 ? <SessionStatusPill account={account} guestMode={guestMode} /> : null}

        <Entrance delay={60} key={currentPage.eyebrow} style={[styles.welcomeSlide, compactWelcome && styles.welcomeSlideCompact]}>
          <View style={styles.welcomeSlideCard}>
            {isDemoPage ? (
              <View style={[styles.welcomeVisualHalo, styles.welcomeVisualHaloCompact]}>
                <EmojiSticker emoji={currentPage.emoji} size={54} style={styles.welcomeBigStickerCompact} />
              </View>
            ) : null}
            {currentPage.eyebrow ? (
              <Text style={[styles.welcomeEyebrow, compactWelcome && styles.welcomeEyebrowCompact]}>{currentPage.eyebrow}</Text>
            ) : null}
            <Text style={[styles.welcomeTitle, compactWelcome && styles.welcomeTitleCompact]}>{currentPage.title}</Text>
            <Text style={[styles.welcomeText, compactWelcome && styles.welcomeTextCompact]}>{currentPage.text}</Text>

            {isDemoPage ? (
              <View
                style={[
                  styles.welcomeDemoFrame,
                  compactWelcome && styles.welcomeDemoFrameCompact,
                  { height: demoCardHeight, maxHeight: demoCardHeight, minHeight: demoCardHeight, width: demoCardWidth },
                ]}
              >
                {isDemoCardVoted ? (
                  <Entrance
                    key={`demo-voted-${demoVote}`}
                    style={[styles.welcomeDemoVotedPlaceholder, { height: demoCardHeight, width: demoCardWidth }]}
                  >
                    <Text style={styles.welcomeDemoVotedMessage}>Carte votée, cliquez sur suivant</Text>
                  </Entrance>
                ) : (
                  <GameCardTransition exiting={demoCardExiting} key={demoCardNonce}>
                    <LinearGradient colors={demoTone.colors} style={[styles.welcomeDemoCard, demoVote === 2 && styles.welcomeDemoCardHot, { height: demoCardHeight, width: demoCardWidth }]}>
                      <CardPattern emoji={demoTone.patternEmoji} />
                      <EmojiSticker emoji="💆" size={62} style={styles.welcomeDemoSticker} />
                      <CardMetaCluster category="Vanille" compact status={cardResponseStatusLabel(demoVote ?? undefined)} />
                      <View style={styles.welcomeDemoCopy}>
                        <Text style={[styles.welcomeDemoTitle, { color: demoTone.titleText }]}>Massage qui dérape</Text>
                        <Text style={[styles.welcomeDemoText, { color: demoTone.bodyText }]}>
                          Un moment doux, puis peut-être un peu plus.
                        </Text>
                      </View>
                      <View style={styles.welcomeVoteRow}>
                        <SpringPressable
                          disabled={demoTransitioning}
                          onPress={() => chooseDemoVote(0)}
                          style={[styles.welcomeVotePill, demoVote === 0 && styles.welcomeVotePillSelected]}
                        >
                          <Text style={[styles.welcomeVoteText, demoVote === 0 && styles.welcomeVoteTextSelected]}>Non</Text>
                        </SpringPressable>
                        <SpringPressable
                          disabled={demoTransitioning}
                          onPress={() => chooseDemoVote(1)}
                          style={[styles.welcomeVotePill, demoVote === 1 && styles.welcomeVotePillSelected]}
                        >
                          <Text style={[styles.welcomeVoteText, demoVote === 1 && styles.welcomeVoteTextSelected]}>Pourquoi pas</Text>
                        </SpringPressable>
                        <SpringPressable
                          disabled={demoTransitioning}
                          onPress={() => chooseDemoVote(2)}
                          style={[styles.welcomeVotePill, styles.welcomeVoteFire, demoVote === 2 && styles.welcomeVoteFireSelected]}
                        >
                          <Text style={styles.welcomeVoteFireText}>🔥</Text>
                        </SpringPressable>
                      </View>
                      <View style={[styles.welcomeDemoFeedback, demoVote === 2 && styles.welcomeDemoFeedbackHot]}>
                        <View style={styles.welcomeDemoFeedbackLock}>
                          <LockKeyhole size={19} color={demoVote === 2 ? candy.white : candy.red} />
                        </View>
                        <Text style={[styles.welcomeDemoFeedbackText, compactWelcome && styles.welcomeDemoFeedbackTextCompact, demoVote === 2 && styles.welcomeDemoFeedbackTextHot]}>
                          {demoFeedback}
                        </Text>
                      </View>
                    </LinearGradient>
                  </GameCardTransition>
                )}
                <PersistentBurstLayer triggerKey={demoBurstNonce} voteLevel={demoVote ?? 2} />
              </View>
            ) : null}

            <View style={[styles.welcomeNav, compactWelcome && styles.welcomeNavCompact]}>
              {page > 0 ? (
                <SpringPressable
                  onPress={goBack}
                  style={[styles.welcomeSecondaryCTA, compactWelcome && styles.welcomeSecondaryCTACompact]}
                >
                  <Text style={styles.welcomeSecondaryText}>Retour</Text>
                </SpringPressable>
              ) : null}
              <SpringPressable
                disabled={!canGoNext}
                onPress={isLastPage ? start : goNext}
                style={[styles.welcomeCTA, compactWelcome && styles.welcomeCTACompact, !canGoNext && styles.welcomeNavDisabled]}
              >
                <Text style={styles.welcomeCTAText}>
                  {isLastPage ? "C'est parti" : isDemoPage && demoTransitioning ? "Un instant..." : isDemoPage && demoVote === null ? "Choisis une réponse" : "Suivant"}
                </Text>
                <ChevronRight size={20} color={candy.white} />
              </SpringPressable>
            </View>
          </View>
        </Entrance>
      </ScrollView>
      {shouldShowProgress ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.welcomeProgressDock,
            compactWelcome && styles.welcomeProgressDockCompact,
            {
              opacity: progressBarEntrance,
              transform: [
                {
                  translateY: progressBarEntrance.interpolate({
                    inputRange: [0, 1],
                    outputRange: [8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={[styles.welcomeProgressRow, compactWelcome && styles.welcomeProgressRowCompact]}>
            <View style={styles.welcomeProgressGlow} />
            <Animated.View style={[styles.welcomeProgressFill, { width: progressWidth }]} />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

function InvitePartnerScreen({
  couple,
  onContinue,
  onJoin,
}: {
  couple: CoupleState;
  onContinue: () => void;
  onJoin: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const inviteMessage = `Rejoins notre espace WeSpice avec le code ${couple.inviteCode}. On ne verra que nos envies partagées.`;

  async function copyInvite() {
    await Clipboard.setStringAsync(couple.inviteCode);
    setCopied(true);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  async function shareInvite() {
    try {
      if (Platform.OS === "web") {
        await Clipboard.setStringAsync(inviteMessage);
        setCopied(true);
      } else {
        await Share.share({ message: inviteMessage });
      }
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      await copyInvite();
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.inviteScreen} showsVerticalScrollIndicator={false}>
      <Entrance delay={0}>
        <LinearGradient colors={[candy.red, "#FF3A8A", "#FF7ABE"]} style={styles.inviteHero}>
          <EmojiSticker emoji={stickers.lock} size={86} style={styles.inviteLock} />
          <Text style={styles.inviteEyebrow}>Votre espace est prêt</Text>
          <Text style={styles.inviteTitle}>Invite ton/ta partenaire.</Text>
          <Text style={styles.inviteText}>
            Envoyez-vous le code, puis jouez chacun de votre côté. Les envies restent privées jusqu'au match.
          </Text>

          <View style={styles.inviteTicket}>
            <Text style={styles.inviteTicketLabel}>Code secret</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.inviteTicketCode}>
              {couple.inviteCode}
            </Text>
            <View style={styles.inviteTicketDots}>
              <View style={styles.inviteDot} />
              <View style={styles.inviteDash} />
              <View style={styles.inviteDot} />
            </View>
            <Text style={styles.inviteTicketHint}>
              À envoyer à la personne avec qui tu veux jouer et découvrir vos envies communes.
            </Text>
          </View>
        </LinearGradient>
      </Entrance>

      <Entrance delay={120}>
        <View style={styles.inviteActions}>
          <SpringPressable onPress={shareInvite} style={styles.invitePrimaryButton}>
            <MessageCircle size={19} color={candy.white} />
            <Text style={styles.invitePrimaryText}>{copied ? "Invitation copiée" : "Partager l'invitation"}</Text>
          </SpringPressable>

          <SpringPressable onPress={copyInvite} style={styles.inviteSecondaryButton}>
            <Copy size={18} color={candy.red} />
            <Text style={styles.inviteSecondaryText}>Copier le code</Text>
          </SpringPressable>

          <SpringPressable onPress={onJoin} style={styles.inviteSecondaryButton}>
            <Users size={18} color={candy.red} />
            <Text style={styles.inviteSecondaryText}>J'ai reçu un code</Text>
          </SpringPressable>

          <SpringPressable onPress={onContinue} style={styles.inviteContinueButton}>
            <Text style={styles.inviteContinueText}>Commencer maintenant</Text>
            <ChevronRight size={19} color={candy.white} />
          </SpringPressable>
        </View>
      </Entrance>

      <Entrance delay={220}>
        <Text style={styles.inviteFinePrint}>Tu pourras retrouver ce code plus tard dans Nous.</Text>
      </Entrance>
    </ScrollView>
  );
}

function JoinCoupleScreen({
  couple,
  onCancel,
  onJoin,
}: {
  couple: CoupleState;
  onCancel: () => void;
  onJoin: (inviteCode: string) => Promise<void>;
}) {
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const activeProfile = couple.profiles[couple.activePartnerId];
  const normalizedCode = inviteCode.trim().toUpperCase();

  async function submit() {
    if (normalizedCode.length < 4) {
      setError("Entre le code reçu par ton/ta partenaire.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      await onJoin(normalizedCode);
    } catch (joinError) {
      setError(errorMessage(joinError, "Impossible de rejoindre ce couple."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <ScrollView contentContainerStyle={styles.inviteScreen} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Entrance delay={0}>
          <LinearGradient colors={[candy.red, "#FF3A8A", "#FF7ABE"]} style={styles.inviteHero}>
            <EmojiSticker emoji="🔗" size={86} style={styles.inviteLock} />
            <Text style={styles.inviteEyebrow}>Relier ton espace</Text>
            <Text style={styles.inviteTitle}>Rejoins ton/ta partenaire.</Text>
            <Text style={styles.inviteText}>
              Tu restes {activeProfile.displayName}. Entre le code reçu pour basculer de solo à couple.
            </Text>
          </LinearGradient>
        </Entrance>

        <Entrance delay={120} style={styles.onboardingPanel}>
          <CandyInput
            label="Code d'invitation"
            onChangeText={(text) => {
              setInviteCode(text.toUpperCase());
              setError("");
            }}
            placeholder="ABCD42"
            value={inviteCode}
          />
          <Text style={styles.authHint}>
            Ton espace solo sera remplacé par l'espace rejoint. Les réponses du couple restent privées jusqu'au match.
          </Text>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <CandyButton
            disabled={busy}
            icon={busy ? <ActivityIndicator color={candy.white} /> : <ChevronRight size={18} color={candy.white} />}
            label="Rejoindre le couple"
            onPress={submit}
          />
          <SpringPressable disabled={busy} onPress={onCancel} style={styles.inviteSecondaryButton}>
            <ArrowLeft size={18} color={candy.red} />
            <Text style={styles.inviteSecondaryText}>Retour à l'invitation</Text>
          </SpringPressable>
        </Entrance>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function LeaveCoupleConfirmScreen({
  couple,
  onCancel,
  onConfirm,
}: {
  couple: CoupleState;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const partner = couple.profiles[otherPartnerId(couple.activePartnerId)];

  return (
    <View style={styles.leaveScreen}>
      <Entrance delay={0} style={styles.leaveContent}>
        <View style={styles.leaveEmojiHalo}>
          <Text style={styles.leaveEmoji}>😭</Text>
        </View>
      </Entrance>

      <Entrance delay={90} style={styles.leaveContent}>
        <Text style={styles.leaveEyebrow}>Quitter le couple</Text>
        <Text style={styles.leaveTitle}>Tu veux vraiment quitter ce couple ?</Text>
        <Text style={styles.leaveText}>
          Vous allez délier votre profil de {partner.displayName}. Vos envies, matchs et messages de couple ne seront plus
          affichés ici.
        </Text>
      </Entrance>

      <Entrance delay={170} style={styles.leaveContent}>
        <View style={styles.leavePromise}>
          <Text style={styles.leavePromiseEmoji}>🔗</Text>
          <Text style={styles.leavePromiseText}>Vous pourrez vous relier à nouveau plus tard.</Text>
        </View>
      </Entrance>

      <Entrance delay={250} style={styles.leaveContent}>
        <View style={styles.leaveActions}>
          <SpringPressable onPress={onConfirm} style={styles.leavePrimary}>
            <Text adjustsFontSizeToFit numberOfLines={1} style={styles.leavePrimaryText}>Oui, quitter le couple</Text>
          </SpringPressable>
          <SpringPressable onPress={onCancel} style={styles.leaveSecondary}>
            <Text style={styles.leaveSecondaryText}>Annuler</Text>
          </SpringPressable>
        </View>
      </Entrance>
    </View>
  );
}

function OnboardingScreen({
  onComplete,
}: {
  onComplete: (
    mode: OnboardingMode,
    profile: Omit<PartnerProfile, "id">,
    inviteCode: string,
  ) => Promise<void>;
}) {
  const vibeOptions = [
    { emoji: "🍒", label: "Flirt", value: "🍒 Flirt" },
    { emoji: "🫧", label: "Doux", value: "🫧 Doux" },
    { emoji: "🔥", label: "Chaud", value: "🔥 Chaud" },
    { emoji: "😇", label: "Sage", value: "😇 Sage mais curieux" },
    { emoji: "🪩", label: "Théâtral", value: "🪩 Théâtral" },
    { emoji: "🖤", label: "Mystère", value: "🖤 Mystère" },
  ];
  const [mode, setMode] = useState<OnboardingMode>("create");
  const [displayName, setDisplayName] = useState("");
  const [vibe, setVibe] = useState(vibeOptions[0].value);
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const screenEntrance = useEntrance(60);
  const selectedVibe = vibeOptions.find((option) => option.value === vibe) ?? vibeOptions[0];
  const previewName = displayName.trim() || "Alex";

  async function submit() {
    if (displayName.trim().length < 2 || (mode === "join" && inviteCode.trim().length < 4)) {
      setError("Ajoute ton prénom et le code si tu rejoins un espace.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      await onComplete(
        mode,
        {
          displayName: displayName.trim(),
          color: "rose",
          statusEmoji: selectedVibe.emoji,
          statusUpdatedAt: new Date().toISOString(),
          vibe,
        },
        inviteCode.trim(),
      );
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Impossible de terminer l'inscription.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <Animated.ScrollView
        contentContainerStyle={styles.onboardingScreen}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={[
          styles.flex,
          {
            opacity: screenEntrance,
            transform: [
              { translateY: screenEntrance.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
            ],
          },
        ]}
      >
        <Entrance style={styles.onboardingHero}>
          <Text style={styles.onboardingEyebrow}>Dernière étape</Text>
          <Text style={styles.onboardingTitle}>Crée ton espace</Text>
          <Text style={styles.onboardingText}>Un prénom, une icône de profil, et tu pourras inviter ton/ta partenaire.</Text>
          <LinearGradient colors={["rgba(255,255,255,0.95)", "rgba(255,225,241,0.86)"]} style={styles.onboardingPreviewCard}>
            <View style={styles.onboardingAvatarRing}>
              <Text style={styles.onboardingAvatarEmoji}>{selectedVibe.emoji}</Text>
            </View>
            <View style={styles.onboardingPreviewCopy}>
              <Text numberOfLines={1} style={styles.onboardingPreviewName}>
                {previewName}
              </Text>
              <Text numberOfLines={1} style={styles.onboardingPreviewVibe}>
                {selectedVibe.label}
              </Text>
            </View>
            <View style={styles.onboardingPreviewBadge}>
              <LockKeyhole size={15} color={candy.white} />
            </View>
          </LinearGradient>
        </Entrance>
        <Entrance delay={90} style={styles.onboardingPanel}>
          <View style={styles.modeSwitch}>
            <SpringPressable onPress={() => setMode("create")} style={[styles.modeButton, mode === "create" && styles.modeButtonActive]}>
              <Text style={[styles.modeButtonText, mode === "create" && styles.modeButtonTextActive]}>Créer</Text>
            </SpringPressable>
            <SpringPressable onPress={() => setMode("join")} style={[styles.modeButton, mode === "join" && styles.modeButtonActive]}>
              <Text style={[styles.modeButtonText, mode === "join" && styles.modeButtonTextActive]}>Rejoindre</Text>
            </SpringPressable>
          </View>
          <CandyInput label="Ton prénom" value={displayName} onChangeText={setDisplayName} placeholder="Alex" />
          <View style={styles.vibePicker}>
            <View style={styles.vibeHeader}>
              <Text style={styles.inputLabel}>Ton icône</Text>
              <Text style={styles.vibeHint}>Visible par vous deux</Text>
            </View>
            <View style={styles.vibeGrid}>
              {vibeOptions.map((option) => {
                const active = vibe === option.value;

                return (
                  <SpringPressable
                    key={option.value}
                    onPress={() => {
                      setVibe(option.value);
                      void Haptics.selectionAsync();
                    }}
                    style={[styles.vibeOption, active && styles.vibeOptionActive]}
                  >
                    <View style={[styles.vibeEmojiBubble, active && styles.vibeEmojiBubbleActive]}>
                      <Text style={styles.vibeEmoji}>{option.emoji}</Text>
                    </View>
                    <Text style={[styles.vibeLabel, active && styles.vibeLabelActive]}>{option.label}</Text>
                  </SpringPressable>
                );
              })}
            </View>
          </View>
          {mode === "join" ? (
            <CandyInput label="Code d'invitation" value={inviteCode} onChangeText={setInviteCode} placeholder="ABCD42" />
          ) : (
            <Text style={styles.authHint}>Tu recevras un code à partager à la fin.</Text>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <CandyButton
            disabled={busy}
            icon={busy ? <ActivityIndicator color={candy.white} /> : <ChevronRight size={18} color={candy.white} />}
            label={mode === "create" ? "Créer l'espace" : "Rejoindre l'espace"}
            onPress={submit}
          />
        </Entrance>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

function CandyInput({
  label,
  onChangeText,
  placeholder,
  value,
}: {
  label: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="rgba(22,16,24,0.38)"
        style={styles.input}
        value={value}
      />
    </View>
  );
}

function CandyButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <SpringPressable disabled={disabled} onPress={onPress} style={[styles.candyButton, disabled && styles.disabled]}>
      {icon}
      <Text style={styles.candyButtonText}>{label}</Text>
    </SpringPressable>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statPill}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Entrance({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const progress = useEntrance(delay);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

function SpringPressable({
  children,
  disabled,
  onPress,
  style,
  testID,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  style: StyleProp<ViewStyle>;
  testID?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      friction: 5,
      tension: 250,
      useNativeDriver: useNativeAnimations,
    }).start();
  };

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animate(0.96)}
      onPressOut={() => animate(1)}
      style={[style, { transform: [{ scale }] }]}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  frame: {
    flex: 1,
    overflow: "hidden",
  },
  safeArea: {
    flex: 1,
  },
  loadingScreen: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.35)",
    textShadowOffset: { width: 1, height: 1.5 },
    textShadowRadius: 0,
  },
  secretToast: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: candy.black,
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    borderWidth: 1.5,
    bottom: 106,
    flexDirection: "row",
    gap: 7,
    minHeight: 38,
    paddingHorizontal: 14,
    position: "absolute",
    shadowColor: "rgba(32,16,31,0.28)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    zIndex: 90,
  },
  secretToastText: {
    color: candy.white,
    fontSize: 12,
    fontWeight: "900",
  },
  fakeAdScreen: {
    flex: 1,
  },
  fakeAdSafe: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  fakeAdCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: candy.white,
    borderRadius: 34,
    borderWidth: 2,
    gap: 10,
    maxWidth: 430,
    overflow: "hidden",
    padding: 22,
    shadowColor: "rgba(32,16,31,0.28)",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 1,
    shadowRadius: 28,
    width: "100%",
  },
  fakeAdGlow: {
    backgroundColor: "rgba(255,36,95,0.18)",
    borderRadius: 999,
    height: 190,
    position: "absolute",
    right: -72,
    top: -72,
    width: 190,
  },
  fakeAdLabel: {
    alignSelf: "flex-start",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.white,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  fakeAdSponsor: {
    color: candy.muted,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  fakeAdEmoji: {
    fontFamily: emojiFont,
    fontSize: 82,
    lineHeight: 92,
    marginTop: 2,
  },
  fakeAdTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 37,
    textAlign: "center",
  },
  fakeAdText: {
    color: candy.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    maxWidth: 340,
    textAlign: "center",
  },
  fakeAdProgressTrack: {
    backgroundColor: "rgba(255,36,95,0.16)",
    borderRadius: 999,
    height: 8,
    marginTop: 8,
    overflow: "hidden",
    width: "100%",
  },
  fakeAdProgressFill: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: "100%",
  },
  fakeAdCTA: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 56,
    paddingHorizontal: 18,
    width: "100%",
  },
  fakeAdCTADisabled: {
    opacity: 0.55,
  },
  fakeAdCTAText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
  },
  fakeAdFinePrint: {
    color: candy.muted,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
  },
  appCrashScreen: {
    alignItems: "center",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 28,
  },
  appCrashEmoji: {
    fontFamily: emojiFont,
    fontSize: 64,
    lineHeight: 76,
  },
  appCrashTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.34)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  appCrashText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    maxWidth: 420,
    textAlign: "center",
  },
  appCrashButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 54,
    paddingHorizontal: 22,
  },
  appCrashButtonText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 15,
    fontWeight: "900",
  },
  appCrashDetails: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 15,
    maxWidth: 420,
    textAlign: "center",
  },
  emojiSticker: {
    alignItems: "center",
    justifyContent: "center",
  },
  emojiStickerText: {
    fontFamily: emojiFont,
    includeFontPadding: false,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.22)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  bgCherry: {
    height: 120,
    left: -26,
    opacity: 0.13,
    position: "absolute",
    top: 96,
    width: 120,
  },
  bgFlame: {
    height: 160,
    opacity: 0.14,
    position: "absolute",
    right: -34,
    top: 118,
    width: 130,
  },
  doodleOne: {
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 28,
    borderWidth: 2,
    height: 72,
    left: 34,
    position: "absolute",
    top: 286,
    transform: [{ rotate: "-18deg" }],
    width: 72,
  },
  doodleTwo: {
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    borderWidth: 2,
    bottom: 118,
    height: 98,
    position: "absolute",
    right: -14,
    width: 98,
  },
  doodleThree: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    height: 8,
    left: 118,
    position: "absolute",
    top: 56,
    width: 8,
  },
  centered: {
    alignItems: "center",
    flex: 1,
    gap: 18,
    justifyContent: "center",
  },
  app: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabDock: {
    bottom: 0,
    left: 0,
    paddingBottom: 10,
    paddingHorizontal: 10,
    paddingTop: 34,
    position: "absolute",
    right: 0,
  },
  tabDockFade: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  logoWrap: {
    alignItems: "center",
    alignSelf: "center",
    height: 86,
    justifyContent: "center",
    overflow: "visible",
    width: 286,
  },
  logoWrapCompact: {
    height: 62,
    width: 206,
  },
  logoWrapSmall: {
    alignSelf: "flex-start",
    height: 42,
    width: 140,
  },
  logoImage: {
    height: "100%",
    width: "100%",
  },
  logoImageCompact: {
    height: "100%",
    width: "100%",
  },
  logoImageSmall: {
    height: "100%",
    width: "100%",
  },
  tabs: {
    backgroundColor: "rgba(255,244,250,0.82)",
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 30,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 1,
    padding: 6,
    shadowColor: "rgba(87, 8, 58, 0.28)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 22,
  },
  tab: {
    alignItems: "center",
    borderRadius: 22,
    flex: 1,
    gap: 1,
    minHeight: 48,
    minWidth: 0,
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "rgba(255,255,255,0.9)",
    shadowColor: "rgba(255, 30, 112, 0.16)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  tabIconWrap: {
    alignItems: "center",
    height: 20,
    justifyContent: "center",
    width: 24,
  },
  tabNotificationBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: "rgba(35,18,36,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    height: 14,
    justifyContent: "center",
    position: "absolute",
    right: -4,
    top: -3,
    width: 14,
  },
  tabNotificationBadgeOn: {
    backgroundColor: candy.white,
    borderColor: candy.red,
  },
  tabNotificationBadgeActive: {
    backgroundColor: candy.red,
    borderColor: candy.white,
  },
  tabText: {
    color: candy.ink,
    fontSize: 8,
    fontWeight: "800",
    lineHeight: 10,
    textAlign: "center",
  },
  tabTextActive: {
    color: candy.red,
  },
  syncText: {
    color: candy.black,
    fontSize: 12,
    fontWeight: "800",
    marginHorizontal: 18,
    textAlign: "center",
  },
  screen: {
    gap: 13,
    paddingBottom: 118,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  enviesScreenFrame: {
    flex: 1,
  },
  enviesScreenContent: {
    paddingBottom: 184,
    paddingTop: 236,
  },
  enviesGameContent: {
    flexGrow: 1,
    justifyContent: "center",
    minHeight: "100%",
    paddingBottom: 184,
    paddingTop: 252,
  },
  enviesStickyHeader: {
    left: 0,
    overflow: "visible",
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 50,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 20,
  },
  enviesStickyFade: {
    borderBottomWidth: 0,
    bottom: -30,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  enviesStickyContent: {
    alignSelf: "center",
    maxWidth: 520,
    overflow: "visible",
    width: "100%",
  },
  heroPanel: {
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    minHeight: 166,
    overflow: "hidden",
    padding: 18,
    shadowColor: candy.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  heroWand: {
    height: 48,
    left: -2,
    position: "absolute",
    top: -4,
    transform: [{ rotate: "-24deg" }],
    width: 48,
  },
  heroCherries: {
    height: 78,
    position: "absolute",
    right: -10,
    top: 4,
    transform: [{ rotate: "9deg" }],
    width: 78,
  },
  heroHeart: {
    bottom: 30,
    height: 48,
    position: "absolute",
    right: 20,
    transform: [{ rotate: "-10deg" }],
    width: 48,
  },
  heroEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderRadius: 999,
    color: candy.pinkHot,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 8,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 32,
    maxWidth: "78%",
  },
  heroCopy: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 8,
    maxWidth: "82%",
  },
  heroActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  privatePill: {
    alignItems: "center",
    backgroundColor: candy.ink,
    borderRadius: 999,
    flexDirection: "row",
    flex: 1,
    gap: 6,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  privatePillText: {
    color: candy.white,
    fontSize: 11,
    fontWeight: "900",
  },
  howButton: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: candy.ink,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: "row",
    flex: 1.08,
    gap: 4,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 8,
  },
  howButtonText: {
    color: candy.ink,
    fontSize: 11,
    fontWeight: "900",
  },
  chipRow: {
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  categoryBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,250,253,0.72)",
    borderColor: "rgba(255,255,255,0.96)",
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 82,
    overflow: "visible",
    paddingHorizontal: 8,
    shadowColor: "rgba(87, 8, 58, 0.3)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 28,
    width: "100%",
  },
  categoryScroll: {
    flexGrow: 0,
    minWidth: 0,
    overflow: "visible",
  },
  categoryChip: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.98)",
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 58,
    minWidth: 96,
    paddingHorizontal: 18,
  },
  categoryChipActive: {
    borderColor: candy.white,
  },
  categoryChipLocked: {
    opacity: 0.92,
  },
  categoryChipText: {
    color: candy.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  categoryChipTextActive: {
    color: candy.white,
  },
  categoryChipLock: {
    fontFamily: emojiFont,
    fontSize: 13,
    lineHeight: 15,
    position: "absolute",
    right: 11,
    top: 7,
  },
  desireFilterRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  desireFilterChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 999,
    borderWidth: 1.5,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 36,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  desireFilterChipActive: {
    backgroundColor: candy.black,
    borderColor: candy.white,
  },
  desireFilterText: {
    color: candy.ink,
    flexShrink: 1,
    fontSize: 10,
    fontWeight: "900",
  },
  desireFilterTextActive: {
    color: candy.white,
  },
  desireFilterCount: {
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
  },
  desireFilterCountActive: {
    color: candy.pinkSoft,
  },
  categoryChipMuted: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderRadius: 22,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 74,
    paddingHorizontal: 10,
  },
  categoryChipMutedText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  cardStack: {
    gap: 10,
    paddingRight: 6,
    paddingTop: 10,
  },
  libraryHeader: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    marginBottom: 4,
    padding: 14,
  },
  libraryHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  libraryEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.red,
    borderRadius: 999,
    color: candy.white,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  libraryTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 7,
  },
  libraryText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  libraryBackButton: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
  },
  libraryBackText: {
    color: candy.white,
    fontSize: 12,
    fontWeight: "900",
  },
  enviesTopGameBar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.34)",
    borderColor: "rgba(255,255,255,0.68)",
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    shadowColor: "rgba(87,8,58,0.14)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  enviesTopGameCopy: {
    flex: 1,
    minWidth: 0,
  },
  enviesTopGameLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginBottom: 4,
  },
  enviesTopGameHint: {
    color: candy.text,
    flex: 1,
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.78,
  },
  enviesGameEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  enviesGameTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 27,
  },
  enviesLibraryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
  },
  enviesLibraryButtonText: {
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
  },
  gameCardTransitionHost: {
    elevation: 12,
    overflow: "visible",
    position: "relative",
    zIndex: 12,
  },
  gameCardTransitionHostEntering: {
    elevation: 12,
    zIndex: 12,
  },
  gameCardTransitionHostExiting: {
    elevation: 2,
    zIndex: 2,
  },
  gameCardBurstHost: {
    overflow: "visible",
    position: "relative",
  },
  persistentBurstLayer: {
    bottom: 0,
    elevation: 8,
    left: 0,
    overflow: "visible",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 8,
  },
  heartBurstLayer: {
    bottom: 0,
    left: 0,
    overflow: "visible",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 8,
    elevation: 8,
  },
  heartBurstParticle: {
    fontFamily: emojiFont,
    left: "50%",
    lineHeight: 64,
    position: "absolute",
    textAlign: "center",
    textShadowColor: "rgba(255,36,95,0.34)",
    textShadowOffset: { width: 0, height: 8 },
    textShadowRadius: 14,
    top: "50%",
  },
  desireGameCard: {
    borderColor: candy.white,
    borderRadius: 34,
    borderWidth: 2,
    justifyContent: "space-between",
    minHeight: 430,
    overflow: "visible",
    padding: 20,
    shadowColor: "rgba(255,36,95,0.28)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  desireGameSticker: {
    height: 138,
    position: "absolute",
    right: 12,
    top: 12,
    transform: [{ rotate: "11deg" }],
    width: 138,
    zIndex: 1,
  },
  desireGameTopRow: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 94,
    zIndex: 2,
  },
  desireGameCopy: {
    alignItems: "center",
    marginTop: 38,
    paddingHorizontal: 78,
  },
  desireGameTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 39,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.58)",
    textShadowOffset: { width: 1.2, height: 1.2 },
    textShadowRadius: 0,
  },
  desireGameText: {
    color: candy.text,
    fontSize: 16,
    fontWeight: "800",
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 480,
    textAlign: "center",
  },
  desireGameVoteRow: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderColor: "rgba(255,255,255,0.68)",
    borderRadius: 36,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    marginTop: 34,
    padding: 8,
    shadowColor: "rgba(32,16,31,0.18)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  enviesGameEmpty: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.52)",
    borderColor: candy.white,
    borderRadius: 34,
    borderStyle: "dashed",
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 390,
    padding: 24,
  },
  enviesGameEmptyEmoji: {
    fontFamily: emojiFont,
    fontSize: 54,
    lineHeight: 62,
  },
  enviesGameEmptyTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 32,
    marginTop: 10,
    textAlign: "center",
  },
  enviesGameEmptyText: {
    color: candy.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 8,
    maxWidth: 360,
    textAlign: "center",
  },
  enviesGameEmptyActions: {
    flexDirection: "row",
    gap: 9,
    marginTop: 18,
  },
  enviesGameEmptyPrimary: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
  },
  enviesGameEmptyPrimaryText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
  },
  enviesGameEmptySecondary: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
  },
  enviesGameEmptySecondaryText: {
    color: candy.red,
    fontSize: 13,
    fontWeight: "900",
  },
  addDesireFloatingDock: {
    alignItems: "center",
    bottom: 148,
    left: 0,
    overflow: "visible",
    paddingHorizontal: 26,
    position: "absolute",
    right: 0,
    zIndex: 25,
  },
  addDesireButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: candy.red,
    borderRadius: 24,
    borderStyle: "dashed",
    borderWidth: 1.5,
    elevation: 14,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    maxWidth: 330,
    minHeight: 54,
    paddingLeft: 18,
    paddingRight: 52,
    shadowColor: "rgba(176, 10, 92, 0.34)",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 32,
    width: "100%",
  },
  addDesireButtonLocked: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: candy.black,
  },
  addDesireText: {
    color: candy.red,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  addDesireLimitText: {
    color: candy.text,
    flexShrink: 0,
    fontSize: 12,
    fontWeight: "900",
  },
  addDesireIcon: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 40,
    justifyContent: "center",
    position: "absolute",
    right: 8,
    width: 40,
  },
  addDesireIconText: {
    color: candy.white,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  editorOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  editorBackdrop: {
    backgroundColor: "rgba(32,16,31,0.44)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  editorSheet: {
    backgroundColor: "rgba(255,244,250,0.94)",
    borderColor: candy.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 2,
    gap: 13,
    padding: 18,
    paddingBottom: 24,
    shadowColor: "rgba(32,16,31,0.34)",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  editorHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(59,23,55,0.2)",
    borderRadius: 999,
    height: 5,
    marginBottom: 2,
    width: 46,
  },
  editorHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  editorHeaderCopy: {
    flex: 1,
  },
  editorEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.roseMist,
    borderRadius: 999,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  editorTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 29,
    marginTop: 8,
  },
  editorIntro: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 4,
  },
  editorQuota: {
    alignSelf: "flex-start",
    backgroundColor: candy.white,
    borderColor: "rgba(255,36,95,0.22)",
    borderRadius: 999,
    borderWidth: 1.5,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 8,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  editorCloseButton: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderRadius: 999,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  editorField: {
    gap: 6,
  },
  editorLabel: {
    color: candy.ink,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  editorIconField: {
    alignItems: "stretch",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,36,95,0.2)",
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  editorIconPreview: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: candy.white,
    borderColor: candy.roseSoft,
    borderRadius: 22,
    borderWidth: 2,
    height: 78,
    justifyContent: "center",
    shadowColor: "rgba(255,36,95,0.22)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
    width: 78,
  },
  editorIconPreviewEmoji: {
    fontFamily: emojiFont,
    fontSize: 42,
    lineHeight: 48,
  },
  editorIconCopy: {
    flex: 1,
    gap: 7,
  },
  editorEmojiInput: {
    backgroundColor: candy.white,
    borderColor: "rgba(255,36,95,0.26)",
    borderRadius: 16,
    borderWidth: 1.5,
    color: candy.ink,
    fontFamily: emojiFont,
    fontSize: 22,
    fontWeight: "900",
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 7,
    textAlign: "center",
  },
  editorEmojiPresetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  editorEmojiPreset: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(255,36,95,0.18)",
    borderRadius: 14,
    borderWidth: 1.5,
    height: 36,
    justifyContent: "center",
    minWidth: 36,
    paddingHorizontal: 7,
  },
  editorEmojiPresetActive: {
    backgroundColor: candy.red,
    borderColor: candy.white,
    shadowColor: "rgba(255,36,95,0.22)",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 8,
  },
  editorEmojiPresetText: {
    fontFamily: emojiFont,
    fontSize: 19,
    lineHeight: 23,
  },
  editorInput: {
    backgroundColor: candy.white,
    borderColor: "rgba(255,36,95,0.28)",
    borderRadius: 18,
    borderWidth: 1.5,
    color: candy.ink,
    fontSize: 14,
    fontWeight: "800",
    minHeight: 48,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  editorTextArea: {
    minHeight: 82,
    textAlignVertical: "top",
  },
  editorCategoryRow: {
    flexDirection: "row",
    gap: 7,
  },
  editorCategoryChip: {
    alignItems: "center",
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flex: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  editorCategoryChipActive: {
    shadowColor: "rgba(255,36,95,0.18)",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  editorCategoryText: {
    color: candy.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  editorCategoryTextActive: {
    color: candy.white,
  },
  editorPersonalCategory: {
    alignItems: "center",
    backgroundColor: "rgba(157,255,215,0.38)",
    borderColor: candy.green,
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 10,
    minHeight: 66,
    padding: 12,
  },
  editorPersonalEmoji: {
    fontFamily: emojiFont,
    fontSize: 26,
    lineHeight: 30,
  },
  editorPersonalCopy: {
    flex: 1,
  },
  editorPersonalTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
  },
  editorPersonalText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 2,
  },
  editorStorageHint: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.66)",
    borderRadius: 16,
    flexDirection: "row",
    gap: 7,
    padding: 10,
  },
  editorStorageHintText: {
    color: candy.text,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  editorActions: {
    flexDirection: "row",
    gap: 9,
  },
  editorSecondaryButton: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
  },
  editorSecondaryText: {
    color: candy.red,
    fontSize: 13,
    fontWeight: "900",
  },
  editorPrimaryButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flex: 1.35,
    justifyContent: "center",
    minHeight: 50,
  },
  editorPrimaryButtonDisabled: {
    opacity: 0.45,
  },
  editorPrimaryText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
  },
  desireCard: {
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    minHeight: 150,
    overflow: "visible",
    padding: 16,
    shadowColor: candy.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  cardPatternLayer: {
    borderRadius: 24,
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  cardPatternEmoji: {
    fontFamily: emojiFont,
    fontSize: 46,
    lineHeight: 54,
    position: "absolute",
  },
  cardSticker: {
    height: 88,
    position: "absolute",
    right: 12,
    top: 12,
    transform: [{ rotate: "12deg" }],
    width: 88,
    zIndex: 1,
  },
  desireCopy: {
    alignItems: "center",
    minHeight: 92,
    paddingHorizontal: 72,
    paddingTop: 2,
  },
  cardMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 6,
  },
  cardTag: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 999,
    color: candy.pinkHot,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "uppercase",
  },
  cardMetaCluster: {
    alignItems: "center",
    alignSelf: "center",
    gap: 5,
    justifyContent: "center",
  },
  cardMetaClusterLarge: {
    gap: 6,
  },
  cardMetaClusterCompact: {
    gap: 4,
  },
  cardCategoryPill: {
    borderRadius: 999,
    borderWidth: 1.5,
    overflow: "hidden",
    paddingHorizontal: 11,
    paddingVertical: 5,
  },
  cardCategoryPillLarge: {
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  cardCategoryPillCompact: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardCategoryPillText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center",
    textTransform: "uppercase",
  },
  cardCategoryPillTextLarge: {
    fontSize: 12,
  },
  cardStatusLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
  },
  cardStatusLineCompact: {
    gap: 4,
  },
  cardStatusDot: {
    borderRadius: 999,
    height: 5,
    opacity: 0.86,
    width: 5,
  },
  cardStatusInlineText: {
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.82,
    textAlign: "center",
    textTransform: "uppercase",
  },
  cardStatus: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: 999,
    borderWidth: 1,
    color: candy.ink,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "uppercase",
  },
  cardTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 12,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.52)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  cardText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },
  voteRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 1,
    marginTop: 16,
  },
  voteButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(32,16,31,0.82)",
    borderRadius: 21,
    borderWidth: 1.55,
    flex: 1,
    height: 48,
    justifyContent: "center",
    minWidth: 0,
    shadowColor: "rgba(32,16,31,0.12)",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  voteButtonFire: {
    backgroundColor: candy.red,
  },
  voteButtonProminent: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "rgba(32,16,31,0.9)",
    borderRadius: 28,
    borderWidth: 2.2,
    height: 76,
    shadowColor: "rgba(32,16,31,0.22)",
    shadowOffset: { width: 0, height: 11 },
    shadowOpacity: 1,
    shadowRadius: 17,
  },
  voteButtonFireProminent: {
    backgroundColor: candy.red,
    borderColor: "rgba(255,255,255,0.88)",
    shadowColor: "rgba(255, 36, 95, 0.44)",
    shadowOffset: { width: 0, height: 13 },
    shadowOpacity: 1,
    shadowRadius: 21,
  },
  voteButtonSelected: {
    backgroundColor: "#FFE4F3",
    borderColor: candy.pinkHot,
    borderWidth: 2.2,
    shadowColor: "rgba(255, 30, 112, 0.24)",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  voteButtonFireSelected: {
    borderColor: candy.white,
    borderWidth: 2.2,
    shadowColor: "rgba(255, 36, 95, 0.34)",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  voteButtonProminentSelected: {
    backgroundColor: candy.white,
    shadowColor: "rgba(255, 30, 112, 0.34)",
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 18,
  },
  voteButtonFireProminentSelected: {
    shadowColor: "rgba(255, 36, 95, 0.48)",
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 24,
  },
  voteButtonContent: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    width: "100%",
  },
  voteButtonProminentContent: {
    gap: 4,
  },
  voteButtonIcon: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 22,
  },
  voteButtonIconSelected: {
    color: candy.pinkHot,
  },
  voteButtonText: {
    color: candy.ink,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center",
  },
  voteButtonTextProminent: {
    fontSize: 14,
    lineHeight: 17,
  },
  voteButtonTextSelected: {
    color: candy.pinkHot,
    fontWeight: "900",
  },
  voteButtonEmoji: {
    fontFamily: emojiFont,
    fontSize: 22,
    lineHeight: 27,
    textAlign: "center",
  },
  voteButtonEmojiProminent: {
    fontSize: 35,
    lineHeight: 40,
  },
  matchScreen: {
    gap: 14,
    paddingBottom: 118,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  matchScreenEmptyMode: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 132,
    paddingTop: 0,
  },
  matchStage: {
    borderColor: candy.white,
    borderRadius: 30,
    borderWidth: 2,
    minHeight: 430,
    overflow: "hidden",
    padding: 18,
    shadowColor: "rgba(255,36,95,0.34)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 22,
  },
  matchStageFx: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  matchStageFlameLeft: {
    bottom: -24,
    height: 138,
    left: -20,
    position: "absolute",
    width: 112,
  },
  matchStageFlameRight: {
    height: 166,
    position: "absolute",
    right: -26,
    top: 96,
    width: 132,
  },
  matchStageHeart: {
    height: 78,
    left: 10,
    position: "absolute",
    top: 18,
    width: 78,
  },
  matchStageTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  matchCounterPill: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  matchCounterText: {
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
  },
  matchStageKicker: {
    color: candy.white,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  matchStageTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 45,
    marginTop: 24,
    textShadowColor: "rgba(32,16,31,0.34)",
    textShadowOffset: { width: 2, height: 2.5 },
    textShadowRadius: 0,
  },
  matchStageCopy: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 8,
    maxWidth: "88%",
  },
  matchRevealCard: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    marginTop: 20,
    minHeight: 130,
    overflow: "hidden",
    padding: 16,
    paddingRight: 90,
  },
  matchRevealSticker: {
    height: 78,
    position: "absolute",
    right: 10,
    top: 16,
    transform: [{ rotate: "9deg" }],
    width: 78,
  },
  matchRevealLabel: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  matchRevealTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 4,
  },
  matchRevealText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 5,
  },
  matchVoteComparison: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 8,
    marginTop: 14,
    padding: 10,
  },
  matchVoteComparisonDetail: {
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: candy.white,
    borderWidth: 2,
    shadowColor: "rgba(32,16,31,0.14)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  matchVoteComparisonTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
  },
  matchVoteComparisonRow: {
    flexDirection: "row",
    gap: 8,
  },
  matchVotePill: {
    backgroundColor: candy.white,
    borderColor: "rgba(255,36,95,0.24)",
    borderRadius: 16,
    borderWidth: 1.5,
    flex: 1,
    minHeight: 62,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  matchVotePillHot: {
    backgroundColor: candy.black,
    borderColor: candy.white,
  },
  matchVoteName: {
    color: candy.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  matchVoteNameHot: {
    color: candy.pinkSoft,
  },
  matchVoteValueRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 5,
  },
  matchVoteEmoji: {
    fontFamily: emojiFont,
    fontSize: 18,
    lineHeight: 22,
  },
  matchVoteValue: {
    color: candy.ink,
    flex: 1,
    fontFamily: displayFont,
    fontSize: 15,
    fontWeight: "900",
  },
  matchVoteValueHot: {
    color: candy.white,
  },
  matchVoteExplanation: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  matchRevealLockedCard: {
    backgroundColor: "rgba(255, 245, 251, 0.92)",
    minHeight: 210,
  },
  matchRevealOpenCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
  },
  matchRevealLockedGlow: {
    backgroundColor: "#FF8BC8",
    borderRadius: 999,
    height: 134,
    opacity: 0.48,
    position: "absolute",
    right: -36,
    top: -48,
    width: 134,
  },
  matchRevealShine: {
    backgroundColor: "rgba(255,255,255,0.62)",
    bottom: -40,
    position: "absolute",
    top: -40,
    width: 58,
  },
  matchRevealMeter: {
    backgroundColor: "rgba(255,36,95,0.16)",
    borderRadius: 999,
    height: 8,
    marginTop: 14,
    overflow: "hidden",
  },
  matchRevealMeterFill: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: "100%",
    width: "100%",
  },
  matchRevealMeterFillIdle: {
    width: "14%",
  },
  matchRevealButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: 7,
    marginTop: 14,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  matchRevealButtonDisabled: {
    opacity: 0.82,
  },
  matchRevealButtonText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 14,
    fontWeight: "900",
  },
  matchRevealSuspenseHint: {
    color: candy.white,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 12,
    textAlign: "center",
  },
  matchActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  matchActionLight: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderRadius: 18,
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  matchActionLightText: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center",
  },
  matchActionDark: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 18,
    flex: 1,
    gap: 4,
    justifyContent: "center",
    minHeight: 54,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  matchActionDarkText: {
    color: candy.white,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center",
  },
  matchNoResultActions: {
    gap: 8,
    marginTop: 16,
  },
  matchSimpleEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  matchSimpleEmptyTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36,
    marginBottom: 18,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.32)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  matchNoResultCTA: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 12,
  },
  matchNoResultCTAText: {
    color: candy.red,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  matchNoResultHint: {
    color: candy.ink,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center",
  },
  matchListHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  matchListTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
  },
  matchListCount: {
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
  },
  matchList: {
    gap: 10,
  },
  hiddenMatchTeaser: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 92,
    padding: 12,
  },
  hiddenMatchIcon: {
    height: 58,
    width: 58,
  },
  hiddenMatchCopy: {
    flex: 1,
  },
  hiddenMatchTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 19,
    fontWeight: "900",
  },
  hiddenMatchText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  hiddenMatchButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 18,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  matchListItem: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 92,
    padding: 12,
  },
  matchListSticker: {
    height: 58,
    width: 58,
  },
  matchListCopy: {
    flex: 1,
  },
  matchListTag: {
    alignSelf: "flex-start",
    backgroundColor: candy.white,
    borderRadius: 999,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "uppercase",
  },
  matchListItemTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  matchListItemText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 2,
  },
  matchDetailScreen: {
    flex: 1,
    overflow: "hidden",
  },
  matchDetailSafe: {
    flex: 1,
  },
  matchDetailFx: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  matchDetailGlow: {
    borderRadius: 999,
    position: "absolute",
  },
  matchDetailGlowTop: {
    backgroundColor: "rgba(255,255,255,0.16)",
    height: 260,
    right: -104,
    top: 76,
    width: 260,
  },
  matchDetailGlowBottom: {
    backgroundColor: "rgba(255,139,200,0.24)",
    bottom: 108,
    height: 330,
    left: -132,
    width: 330,
  },
  matchDetailSpark: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 34,
    fontWeight: "900",
    position: "absolute",
    textShadowColor: "rgba(32,16,31,0.16)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  matchDetailSparkOne: {
    right: 42,
    top: 118,
    transform: [{ rotate: "14deg" }],
  },
  matchDetailSparkTwo: {
    left: 28,
    top: 226,
    transform: [{ rotate: "-18deg" }],
  },
  matchDetailSparkThree: {
    bottom: 186,
    color: "rgba(255,212,232,0.78)",
    fontSize: 56,
    right: 28,
  },
  matchDetailFlameBig: {
    opacity: 0.72,
    position: "absolute",
    right: -22,
    top: 52,
  },
  matchDetailCherry: {
    bottom: 18,
    left: -18,
    opacity: 0.84,
    position: "absolute",
  },
  matchDetailConfetti: {
    color: candy.roseSoft,
    fontSize: 24,
    fontWeight: "900",
    position: "absolute",
    textShadowColor: candy.white,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  matchDetailConfettiOne: {
    left: 42,
    top: 86,
    transform: [{ rotate: "-18deg" }],
  },
  matchDetailConfettiTwo: {
    color: candy.white,
    right: 54,
    top: 152,
  },
  matchDetailConfettiThree: {
    color: candy.black,
    right: 28,
    top: 238,
    transform: [{ rotate: "18deg" }],
  },
  matchDetailConfettiFour: {
    bottom: 96,
    color: candy.white,
    right: 40,
  },
  matchDetailTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 18,
    paddingTop: 8,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 4,
  },
  matchDetailRoundButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    shadowColor: "rgba(32,16,31,0.24)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
    width: 52,
  },
  matchDetailRoundButtonFill: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 999,
    borderWidth: 2,
    height: 52,
    justifyContent: "center",
    overflow: "hidden",
    width: 52,
  },
  matchDetailRoundButtonFillDark: {
    borderColor: "rgba(255,255,255,0.62)",
  },
  matchDetailContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 72,
    paddingHorizontal: 18,
    paddingTop: 88,
  },
  matchDetailStage: {
    alignSelf: "center",
    gap: 14,
    maxWidth: 560,
    width: "100%",
  },
  matchDetailLogoBlock: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
  },
  matchDetailRevealPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    gap: 6,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  matchDetailRevealText: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  matchDetailKicker: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 54,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 58,
    textShadowColor: candy.black,
    textShadowOffset: { width: 4, height: 5 },
    textShadowRadius: 0,
  },
  matchDetailTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 37,
    marginTop: 12,
    maxWidth: 560,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.28)",
    textShadowOffset: { width: 2, height: 2.5 },
    textShadowRadius: 0,
  },
  matchDetailSub: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 430,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.2)",
    textShadowOffset: { width: 1, height: 1.5 },
    textShadowRadius: 0,
  },
  matchDetailCard: {
    borderColor: "rgba(255,255,255,0.94)",
    borderRadius: 32,
    borderWidth: 2,
    minHeight: 248,
    overflow: "visible",
    padding: 18,
    paddingTop: 64,
    shadowColor: "rgba(32,16,31,0.34)",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  matchDetailCardSticker: {
    height: 106,
    position: "absolute",
    right: -12,
    top: -22,
    transform: [{ rotate: "12deg" }],
    width: 106,
  },
  matchDetailHeartBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,36,95,0.9)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 46,
    justifyContent: "center",
    left: 16,
    position: "absolute",
    top: 16,
    width: 46,
  },
  matchDetailTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  matchDetailCardTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 35,
    marginTop: 10,
    maxWidth: "86%",
  },
  matchDetailCardText: {
    color: candy.ink,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 8,
    maxWidth: "92%",
  },
  matchDetailCardFooter: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(255,255,255,0.86)",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  matchDetailCardFooterText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "900",
  },
  matchDetailActions: {
    gap: 9,
  },
  matchDetailPrimaryAction: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 58,
    shadowColor: "rgba(32,16,31,0.28)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  matchDetailPrimaryText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
  },
  matchDetailSecondaryAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 50,
  },
  matchDetailHourglass: {
    color: candy.red,
    fontSize: 18,
  },
  matchDetailSecondaryText: {
    color: candy.red,
    fontSize: 15,
    fontWeight: "900",
  },
  matchDetailPrivacy: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginTop: 0,
    paddingHorizontal: 16,
  },
  matchDetailPrivacyText: {
    color: candy.white,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  matchEmpty: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    gap: 14,
    overflow: "hidden",
    padding: 16,
  },
  matchEmptyGlow: {
    backgroundColor: "#FF8BC8",
    borderRadius: 999,
    height: 130,
    position: "absolute",
    right: -38,
    top: -54,
    width: 130,
  },
  matchEmptyTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  matchEmptySticker: {
    height: 68,
    width: 68,
  },
  matchEmptyCopy: {
    flex: 1,
  },
  matchEmptyEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 1.5,
    color: candy.red,
    fontSize: 9,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 3,
    textTransform: "uppercase",
  },
  matchEmptyTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 23,
    marginTop: 5,
  },
  matchEmptyText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 5,
  },
  matchEmptyProgressBlock: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 20,
    padding: 12,
  },
  matchEmptyProgressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  matchEmptyProgressLabel: {
    color: candy.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  matchEmptyProgressCount: {
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
  },
  matchEmptyTrack: {
    backgroundColor: "rgba(255,36,95,0.16)",
    borderRadius: 999,
    height: 8,
    marginTop: 9,
    overflow: "hidden",
  },
  matchEmptyFill: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: "100%",
  },
  matchEmptyMicrocopy: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 8,
  },
  matchEmptyPrompts: {
    flexDirection: "row",
    gap: 8,
  },
  matchEmptyPrompt: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 1.5,
    flex: 1,
    gap: 4,
    minHeight: 92,
    padding: 10,
  },
  matchEmptyPromptIcon: {
    height: 38,
    width: 38,
  },
  matchEmptyPromptText: {
    color: candy.ink,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center",
  },
  matchEmptyCTA: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 52,
  },
  matchEmptyCTAText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  chatScreen: {
    gap: 13,
    paddingBottom: 250,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  chatFrame: {
    flex: 1,
  },
  chatHero: {
    borderColor: candy.white,
    borderRadius: 30,
    borderWidth: 2,
    minHeight: 236,
    overflow: "hidden",
    padding: 18,
    shadowColor: "rgba(87, 8, 58, 0.24)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 22,
  },
  chatHeroCompact: {
    borderRadius: 26,
    minHeight: 128,
    padding: 14,
  },
  chatHeroGlow: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 999,
    bottom: -74,
    height: 190,
    position: "absolute",
    right: -42,
    width: 190,
  },
  chatHeroBubble: {
    height: 86,
    opacity: 0.48,
    position: "absolute",
    right: 18,
    top: 52,
    width: 86,
  },
  chatHeroFlame: {
    bottom: 10,
    height: 74,
    opacity: 0.82,
    position: "absolute",
    right: 8,
    width: 74,
  },
  chatHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  chatHeroCompactRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 12,
  },
  chatHeroCompactCopy: {
    flex: 1,
    minWidth: 0,
  },
  chatEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  chatExpiryPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.52)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 30,
    paddingHorizontal: 10,
  },
  chatExpiryText: {
    color: candy.white,
    fontSize: 10,
    fontWeight: "900",
  },
  chatTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 39,
    marginTop: 16,
    maxWidth: "78%",
    textShadowColor: "rgba(32,16,31,0.34)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  chatText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 8,
    maxWidth: "84%",
  },
  chatTitleCompact: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 28,
    textShadowColor: "rgba(32,16,31,0.34)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  chatTextCompact: {
    color: "rgba(255,255,255,0.88)",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 2,
  },
  chatHeroStatusRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14,
  },
  chatPresencePill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 7,
    maxWidth: "100%",
    minHeight: 34,
    paddingHorizontal: 11,
  },
  chatPresenceDot: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  chatPresenceText: {
    color: candy.ink,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "900",
  },
  chatCountText: {
    backgroundColor: "rgba(32,16,31,0.34)",
    borderColor: "rgba(255,255,255,0.38)",
    borderRadius: 999,
    borderWidth: 1,
    color: candy.white,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chatCountTextCompact: {
    backgroundColor: candy.white,
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 999,
    borderWidth: 1,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  chatContext: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    padding: 11,
  },
  chatContextCompact: {
    borderRadius: 18,
    marginTop: 10,
    padding: 8,
  },
  chatContextSticker: {
    height: 56,
    marginBottom: -8,
    marginTop: -8,
    width: 56,
  },
  chatContextStickerCompact: {
    height: 42,
    marginBottom: -4,
    marginTop: -4,
    width: 42,
  },
  chatContextCopy: {
    flex: 1,
  },
  chatContextLabel: {
    color: candy.red,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  chatContextTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2,
  },
  chatDateDivider: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 2,
  },
  chatDividerLine: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 999,
    flex: 1,
    height: 2,
  },
  chatDateText: {
    color: candy.ink,
    fontSize: 11,
    fontWeight: "900",
  },
  chatLiveSignal: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.58)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 8,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  chatLiveText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "900",
  },
  chatLiveDots: {
    flexDirection: "row",
    gap: 3,
  },
  chatLiveDot: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: 5,
    width: 5,
  },
  chatMessages: {
    gap: 8,
    minHeight: 220,
  },
  chatEmpty: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: candy.white,
    borderRadius: 28,
    borderStyle: "dashed",
    borderWidth: 1.5,
    minHeight: 210,
    padding: 22,
  },
  chatEmptySticker: {
    height: 76,
    width: 76,
  },
  chatEmptyTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },
  chatEmptyText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 5,
    textAlign: "center",
  },
  chatBubbleRow: {
    alignItems: "flex-start",
    paddingHorizontal: 2,
  },
  chatBubbleRowMine: {
    alignItems: "flex-end",
  },
  chatBubble: {
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(255,255,255,0.76)",
    borderRadius: 22,
    borderBottomLeftRadius: 8,
    borderWidth: 1.2,
    maxWidth: "82%",
    overflow: "visible",
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  chatBubbleMine: {
    backgroundColor: candy.red,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 8,
    borderColor: "rgba(255,255,255,0.72)",
  },
  chatBubbleName: {
    color: candy.red,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  chatBubbleNameMine: {
    color: candy.white,
  },
  chatBubbleText: {
    color: candy.ink,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 3,
  },
  chatBubbleTextMine: {
    color: candy.white,
  },
  chatBubbleMeta: {
    color: "rgba(124,75,105,0.76)",
    fontSize: 9,
    fontWeight: "800",
    marginTop: 6,
  },
  chatBubbleMetaMine: {
    color: "rgba(255,255,255,0.82)",
  },
  chatBubblePhotos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 7,
  },
  chatBubblePhoto: {
    borderColor: "rgba(255,255,255,0.76)",
    borderRadius: 18,
    borderWidth: 1,
    height: 116,
    width: 116,
  },
  chatComposerDock: {
    bottom: 94,
    backgroundColor: "rgba(255,255,255,0.38)",
    borderColor: "rgba(255,255,255,0.76)",
    borderRadius: 30,
    borderWidth: 1,
    gap: 7,
    left: 10,
    padding: 7,
    position: "absolute",
    right: 10,
  },
  chatSuggestionPanel: {
    gap: 6,
    paddingHorizontal: 2,
    width: "100%",
  },
  chatSuggestionKicker: {
    color: candy.ink,
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    textTransform: "uppercase",
  },
  chatQuickRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 2,
    paddingVertical: 1,
    width: "100%",
  },
  chatQuickPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 17,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  chatQuickText: {
    color: candy.ink,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center",
  },
  chatPendingPhotos: {
    backgroundColor: "rgba(255,255,255,0.56)",
    borderColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 7,
  },
  chatPendingPhotoWrap: {
    borderColor: candy.white,
    borderRadius: 16,
    borderWidth: 2,
    height: 74,
    overflow: "hidden",
    width: 74,
  },
  chatPendingPhoto: {
    height: "100%",
    width: "100%",
  },
  chatRemovePhoto: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 24,
  },
  chatComposer: {
    alignItems: "flex-end",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderColor: "rgba(255,255,255,0.84)",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 7,
  },
  chatComposerActive: {
    borderColor: "rgba(255,36,95,0.42)",
  },
  chatIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,225,241,0.88)",
    borderRadius: 18,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  chatInput: {
    color: candy.ink,
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    maxHeight: 96,
    minHeight: 40,
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  chatSendButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 18,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  chatSendButtonDisabled: {
    opacity: 0.42,
  },
  rulesScreen: {
    gap: 14,
    paddingBottom: 118,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  rulesBackButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  rulesBackIcon: {
    transform: [{ rotate: "180deg" }],
  },
  rulesBackText: {
    color: candy.red,
    fontSize: 13,
    fontWeight: "900",
  },
  rulesHero: {
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    minHeight: 230,
    overflow: "hidden",
    padding: 20,
  },
  rulesHeroWand: {
    height: 70,
    left: -2,
    position: "absolute",
    top: -4,
    transform: [{ rotate: "-23deg" }],
    width: 70,
  },
  rulesHeroCherries: {
    height: 92,
    position: "absolute",
    right: 6,
    top: 18,
    transform: [{ rotate: "10deg" }],
    width: 92,
  },
  rulesEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 999,
    color: candy.pinkHot,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  rulesTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: 18,
    maxWidth: "78%",
  },
  rulesIntro: {
    color: candy.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 10,
    maxWidth: "82%",
  },
  rulesSteps: {
    gap: 10,
  },
  rulesStep: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 92,
    padding: 12,
  },
  rulesStepIcon: {
    height: 58,
    width: 58,
  },
  rulesStepCopy: {
    flex: 1,
  },
  rulesStepTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 19,
    fontWeight: "900",
  },
  rulesStepText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17,
    marginTop: 3,
  },
  rulesPromise: {
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    gap: 6,
    padding: 18,
  },
  rulesPromiseTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 26,
    fontWeight: "900",
  },
  rulesPromiseText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  homeDeck: {
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    gap: 12,
    overflow: "hidden",
    padding: 14,
    shadowColor: "rgba(255,36,95,0.2)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  homeSurpriseDeck: {
    overflow: "visible",
    paddingRight: 8,
    paddingTop: 16,
    position: "relative",
  },
  homeSurpriseAnimatedWrap: {
    overflow: "visible",
  },
  homeEmptySurpriseCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.34)",
    borderColor: candy.white,
    borderRadius: 28,
    borderStyle: "dashed",
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 214,
    padding: 22,
  },
  homeEmptySurpriseIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    borderWidth: 2,
    height: 66,
    justifyContent: "center",
    marginBottom: 12,
    width: 66,
  },
  homeEmptySurpriseEmoji: {
    fontFamily: emojiFont,
    fontSize: 34,
    lineHeight: 40,
  },
  homeEmptySurpriseTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 28,
    textAlign: "center",
  },
  homeEmptySurpriseText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 7,
    maxWidth: 330,
    textAlign: "center",
  },
  homeDeckHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  homeDeckHeaderCopy: {
    flex: 1,
  },
  homeDeckEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.red,
    borderRadius: 999,
    color: candy.white,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  homeDeckTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 29,
    marginTop: 7,
  },
  homeDeckSubtitle: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  homeDeckHeaderSticker: {
    height: 54,
    width: 54,
  },
  homeDeckCount: {
    backgroundColor: candy.white,
    borderColor: candy.red,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  homeSurpriseCard: {
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: "space-between",
    minHeight: 214,
    overflow: "visible",
    padding: 14,
    shadowColor: "rgba(255,36,95,0.22)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  homeSurpriseSticker: {
    height: 84,
    position: "absolute",
    right: 12,
    top: 12,
    transform: [{ rotate: "12deg" }],
    width: 84,
    zIndex: 1,
  },
  homeSurpriseCopy: {
    alignItems: "center",
    minHeight: 116,
    paddingHorizontal: 74,
  },
  homeSurpriseTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 12,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.52)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  homeSurpriseText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },
  homeDeckFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  homeDeckFooterText: {
    color: candy.ink,
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
  },
  homeDeckEmptyButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  homeDeckEmptyButtonText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
  },
  homeStore: {
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    gap: 12,
    overflow: "hidden",
    padding: 16,
    shadowColor: "rgba(255,36,95,0.28)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  homeStoreSparkle: {
    height: 72,
    opacity: 0.42,
    position: "absolute",
    right: 8,
    top: 6,
    transform: [{ rotate: "11deg" }],
    width: 72,
  },
  homeStoreFlame: {
    bottom: -18,
    height: 86,
    opacity: 0.38,
    position: "absolute",
    right: 34,
    transform: [{ rotate: "-8deg" }],
    width: 86,
  },
  homeStoreTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeStoreEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  homeStoreBadge: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,255,255,0.42)",
    borderRadius: 999,
    borderWidth: 1,
    color: candy.white,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  homeStoreTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
    maxWidth: "86%",
  },
  homeStoreText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    maxWidth: "92%",
  },
  homeStorePackRow: {
    flexDirection: "row",
    gap: 9,
  },
  homeStorePack: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: candy.white,
    borderRadius: 20,
    borderWidth: 2,
    flex: 1,
    minHeight: 78,
    overflow: "hidden",
    padding: 10,
  },
  homeStorePackOpen: {
    backgroundColor: "rgba(255,212,232,0.88)",
  },
  homeStoreCustomPack: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 68,
  },
  homeStoreCustomEmoji: {
    fontFamily: emojiFont,
    fontSize: 28,
    lineHeight: 32,
  },
  homeStoreCustomCopy: {
    flex: 1,
  },
  homeStorePackEmoji: {
    height: 38,
    position: "absolute",
    right: 4,
    top: 4,
    transform: [{ rotate: "9deg" }],
    width: 38,
  },
  homeStorePackCopy: {
    paddingRight: 34,
  },
  homeStorePackTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
  },
  homeStorePackMeta: {
    color: candy.text,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 14,
    marginTop: 4,
  },
  homeStoreAction: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: candy.white,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: 6,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  homeStoreActionText: {
    color: candy.red,
    fontSize: 13,
    fontWeight: "900",
  },
  storeScreen: {
    flex: 1,
  },
  storeSafe: {
    flex: 1,
  },
  storeContent: {
    gap: 14,
    padding: 14,
    paddingBottom: 28,
  },
  storeTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  storeCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  storeHero: {
    borderColor: candy.white,
    borderRadius: 30,
    borderWidth: 2,
    minHeight: 270,
    overflow: "hidden",
    padding: 18,
    shadowColor: "rgba(32,16,31,0.28)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  storeHeroSparkle: {
    height: 86,
    opacity: 0.38,
    position: "absolute",
    right: 10,
    top: 10,
    transform: [{ rotate: "10deg" }],
    width: 86,
  },
  storeHeroCherry: {
    bottom: -22,
    height: 100,
    opacity: 0.72,
    position: "absolute",
    right: 16,
    transform: [{ rotate: "-8deg" }],
    width: 100,
  },
  storeEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  storeTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 40,
    marginTop: 16,
    maxWidth: "88%",
    textShadowColor: "rgba(32,16,31,0.36)",
    textShadowOffset: { width: 2, height: 2.5 },
    textShadowRadius: 0,
  },
  storeText: {
    color: candy.white,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 9,
    maxWidth: "92%",
  },
  storeHeroStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  storeStat: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.34)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minHeight: 60,
    padding: 9,
  },
  storeStatValue: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 21,
    fontWeight: "900",
  },
  storeStatLabel: {
    color: candy.white,
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 12,
    marginTop: 2,
    textTransform: "uppercase",
  },
  storeSectionHeader: {
    paddingHorizontal: 4,
  },
  storeSectionTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 26,
    fontWeight: "900",
  },
  storeSectionText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 2,
  },
  storeOfferList: {
    gap: 10,
  },
  storeOfferCard: {
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    minHeight: 174,
    overflow: "hidden",
    padding: 14,
    shadowColor: "rgba(255,36,95,0.16)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  storeOfferSticker: {
    height: 72,
    position: "absolute",
    right: 10,
    top: 8,
    transform: [{ rotate: "10deg" }],
    width: 72,
  },
  storeOfferCopy: {
    flex: 1,
    paddingRight: 84,
  },
  storeOfferTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  storeOfferTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 26,
    marginTop: 9,
  },
  storeOfferText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 5,
  },
  storeOfferFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14,
  },
  storeOfferPrice: {
    color: candy.red,
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: "900",
  },
  storeOfferButton: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    gap: 4,
    minHeight: 40,
    paddingHorizontal: 14,
  },
  storeOfferButtonOpen: {
    backgroundColor: candy.white,
  },
  storeOfferButtonText: {
    color: candy.white,
    fontSize: 12,
    fontWeight: "900",
  },
  storeOfferButtonTextOpen: {
    color: candy.red,
  },
  storeCustomOffer: {
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    minHeight: 166,
    overflow: "hidden",
    padding: 14,
  },
  storeCustomEmoji: {
    fontFamily: emojiFont,
    fontSize: 56,
    lineHeight: 64,
    opacity: 0.88,
    position: "absolute",
    right: 16,
    top: 12,
  },
  storeNoAdsOffer: {
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    minHeight: 162,
    overflow: "hidden",
    padding: 14,
    shadowColor: "rgba(255,36,95,0.16)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  storeNoAdsEmoji: {
    fontFamily: emojiFont,
    fontSize: 56,
    lineHeight: 64,
    opacity: 0.9,
    position: "absolute",
    right: 16,
    top: 12,
    transform: [{ rotate: "8deg" }],
  },
  homeScreen: {
    gap: 14,
    paddingTop: 12,
  },
  dailyAdviceCard: {
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    minHeight: 168,
    overflow: "hidden",
    padding: 16,
    paddingRight: 88,
    shadowColor: "rgba(255,36,95,0.16)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  dailyAdviceEmoji: {
    fontFamily: emojiFont,
    fontSize: 64,
    lineHeight: 72,
    opacity: 0.9,
    position: "absolute",
    right: 12,
    top: 18,
    transform: [{ rotate: "10deg" }],
  },
  dailyAdviceTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  dailyAdvicePill: {
    alignSelf: "flex-start",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dailyAdvicePillText: {
    color: candy.white,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  dailyAdviceDate: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  dailyAdviceCategory: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 12,
    textTransform: "uppercase",
  },
  dailyAdviceTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 4,
  },
  dailyAdviceText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 7,
  },
  dailyAdviceFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
    marginTop: 12,
  },
  dailyAdviceFooterText: {
    color: candy.muted,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  dailyAdviceFooterDot: {
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
  },
  homeNextPanel: {
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    minHeight: 176,
    overflow: "hidden",
    padding: 16,
    shadowColor: "rgba(255,36,95,0.2)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  homeNextTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  homeNextState: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 7,
    minHeight: 34,
    paddingLeft: 4,
    paddingRight: 12,
  },
  homeNextPhase: {
    backgroundColor: candy.red,
    borderRadius: 999,
    color: candy.white,
    fontSize: 12,
    fontWeight: "900",
    height: 26,
    lineHeight: 26,
    overflow: "hidden",
    textAlign: "center",
    width: 26,
  },
  homeNextStateText: {
    color: candy.ink,
    fontSize: 11,
    fontWeight: "900",
  },
  homeNextEmoji: {
    fontFamily: emojiFont,
    fontSize: 48,
    lineHeight: 54,
    opacity: 0.96,
    transform: [{ rotate: "9deg" }],
  },
  homeNextCopy: {
    minWidth: 0,
  },
  homeNextBadge: {
    alignSelf: "flex-start",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.white,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 9,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  homeNextTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
  },
  homeNextText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 6,
    maxWidth: 520,
  },
  homeNextActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 15,
  },
  homeNextPrimary: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: 5,
    flex: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
    shadowColor: "rgba(255,36,95,0.28)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  homeNextPrimaryText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
  },
  homeNextSecondary: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 13,
  },
  homeNextSecondaryText: {
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
  },
  homeStatusCard: {
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    gap: 12,
    overflow: "hidden",
    padding: 14,
    shadowColor: "rgba(255,36,95,0.16)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  homeStatusTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 11,
  },
  homeStatusAvatar: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: "rgba(255,36,95,0.2)",
    borderRadius: 22,
    borderWidth: 2,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  homeStatusAvatarText: {
    fontFamily: emojiFont,
    fontSize: 30,
    lineHeight: 38,
  },
  homeStatusCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeStatusEyebrow: {
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeStatusTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 2,
  },
  homeStatusText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  homeStatusPartner: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderColor: candy.white,
    borderRadius: 20,
    borderWidth: 1.5,
    minWidth: 66,
    paddingHorizontal: 8,
    paddingVertical: 7,
  },
  homeStatusPartnerEmoji: {
    fontFamily: emojiFont,
    fontSize: 24,
    lineHeight: 30,
  },
  homeStatusPartnerLabel: {
    color: candy.muted,
    fontSize: 9,
    fontWeight: "900",
    marginTop: 1,
  },
  homeStatusActions: {
    flexDirection: "row",
    gap: 7,
  },
  homeStatusQuickEmoji: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    borderWidth: 1.5,
    flex: 1,
    height: 42,
    justifyContent: "center",
  },
  homeStatusQuickEmojiActive: {
    backgroundColor: candy.red,
    borderColor: candy.white,
    shadowColor: "rgba(255,36,95,0.24)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  homeStatusQuickEmojiText: {
    fontFamily: emojiFont,
    fontSize: 22,
    lineHeight: 28,
  },
  homeStatusEditButton: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: "rgba(255,36,95,0.22)",
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
    minWidth: 58,
    paddingHorizontal: 8,
  },
  homeStatusEditText: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
  },
  homeCTA: {
    alignItems: "center",
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 118,
    overflow: "visible",
    padding: 14,
    paddingRight: 86,
    shadowColor: "rgba(255,36,95,0.28)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  homeCTASticker: {
    height: 92,
    position: "absolute",
    right: -10,
    top: -15,
    transform: [{ rotate: "10deg" }],
    width: 92,
  },
  homeCTACopy: {
    flex: 1,
    minWidth: 0,
  },
  homeCTAEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.white,
    borderColor: candy.red,
    borderRadius: 999,
    borderWidth: 1.5,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 7,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  homeCTATitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
  },
  homeCTAText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 4,
  },
  homeCTAButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    gap: 4,
    minHeight: 44,
    paddingHorizontal: 14,
  },
  homeCTAButtonText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
  },
  homeLogo: {
    marginBottom: -4,
    marginLeft: 2,
  },
  coupleScreen: {
    gap: 24,
  },
  couplePanel: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.76)",
    borderRadius: 36,
    borderWidth: 1.5,
    minHeight: 390,
    overflow: "hidden",
    padding: 20,
    shadowColor: "rgba(255,36,95,0.18)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  coupleSoloPanel: {
    justifyContent: "center",
    minHeight: 520,
  },
  coupleSticker: {
    height: 90,
    opacity: 0.72,
    position: "absolute",
    right: -10,
    top: 10,
    transform: [{ rotate: "10deg" }],
    width: 90,
  },
  coupleGlow: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    height: 220,
    left: -78,
    position: "absolute",
    top: -72,
    width: 220,
  },
  coupleTitle: {
    color: candy.black,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 37,
    marginTop: 14,
    maxWidth: 430,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.64)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  coupleEyebrow: {
    alignSelf: "center",
    backgroundColor: candy.white,
    borderColor: candy.red,
    borderRadius: 999,
    borderWidth: 1.5,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    marginBottom: 8,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  coupleSub: {
    color: candy.black,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 390,
    textAlign: "center",
  },
  coupleAvatarStage: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 14,
  },
  coupleSoloAvatarStage: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 22,
  },
  coupleAvatarBubble: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 92,
    justifyContent: "center",
    shadowColor: "rgba(255,36,95,0.24)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 22,
    width: 92,
  },
  coupleAvatarBubbleSecond: {
    marginLeft: -18,
    marginTop: 18,
  },
  coupleMissingBubble: {
    backgroundColor: "rgba(255,255,255,0.42)",
    borderColor: candy.red,
    borderStyle: "dashed",
    marginLeft: -14,
    marginTop: 18,
  },
  coupleAvatarEmoji: {
    fontFamily: emojiFont,
    fontSize: 50,
    lineHeight: 60,
  },
  coupleNameRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 12,
    maxWidth: 390,
    width: "100%",
  },
  coupleNamePill: {
    backgroundColor: "rgba(255,255,255,0.52)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 999,
    borderWidth: 1,
    color: candy.ink,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7,
    textAlign: "center",
  },
  coupleStats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
    maxWidth: 430,
    width: "100%",
  },
  coupleStatPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.54)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minHeight: 70,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  coupleStatValue: {
    color: candy.red,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
  },
  coupleStatLabel: {
    color: candy.black,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    textAlign: "center",
  },
  statPill: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 18,
    flex: 1,
    padding: 12,
  },
  statValue: {
    color: candy.red,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    color: candy.black,
    fontSize: 11,
    fontWeight: "900",
  },
  coupleSoloInviteCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 24,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    maxWidth: 430,
    padding: 14,
    width: "100%",
  },
  coupleSoloActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    maxWidth: 430,
    width: "100%",
  },
  coupleSoloPrimaryAction: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 12,
  },
  coupleSoloPrimaryText: {
    color: candy.white,
    fontSize: 14,
    fontWeight: "900",
  },
  coupleSoloSecondaryAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 12,
  },
  coupleSoloSecondaryText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  inviteLabel: {
    color: candy.black,
    fontSize: 10,
    fontWeight: "900",
  },
  inviteCodeBlock: {
    flex: 1,
    minWidth: 0,
  },
  inviteCode: {
    color: candy.red,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
  },
  copyButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  coupleCategorySection: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    gap: 12,
    padding: 14,
  },
  coupleRhythmSection: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    gap: 12,
    padding: 14,
  },
  coupleSection: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    gap: 12,
    paddingHorizontal: 4,
    paddingVertical: 0,
  },
  coupleSectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  coupleSectionCopy: {
    flex: 1,
  },
  coupleSectionTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 29,
  },
  coupleSectionText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 4,
  },
  coupleSectionLink: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.68)",
    borderColor: "rgba(255,255,255,0.84)",
    borderRadius: 999,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 12,
  },
  coupleSectionLinkText: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
  },
  coupleCategoryAvailablePill: {
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.white,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  coupleCategoryList: {
    gap: 9,
  },
  coupleRhythmGrid: {
    flexDirection: "row",
    gap: 9,
  },
  coupleInsightCard: {
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 1.5,
    flex: 1,
    minHeight: 118,
    padding: 12,
  },
  coupleInsightEmoji: {
    fontFamily: emojiFont,
    fontSize: 28,
    lineHeight: 34,
  },
  coupleInsightTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    marginTop: 6,
  },
  coupleInsightText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 4,
  },
  coupleRecentList: {
    gap: 9,
  },
  coupleRecentMatch: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.52)",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 78,
    padding: 12,
    shadowColor: "rgba(87,8,58,0.08)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  coupleRecentEmojiBubble: {
    alignItems: "center",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 1.5,
    height: 54,
    justifyContent: "center",
    overflow: "hidden",
    width: 54,
  },
  coupleRecentEmoji: {
    fontFamily: emojiFont,
    fontSize: 32,
    lineHeight: 39,
    textAlign: "center",
  },
  coupleRecentCopy: {
    flex: 1,
    minWidth: 0,
  },
  coupleRecentTag: {
    alignSelf: "flex-start",
    backgroundColor: candy.white,
    borderRadius: 999,
    fontSize: 8,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 7,
    paddingVertical: 2,
    textTransform: "uppercase",
  },
  coupleRecentTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 3,
  },
  coupleRecentText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  coupleEmptyMatches: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "rgba(255,36,95,0.34)",
    borderRadius: 24,
    borderStyle: "dashed",
    borderWidth: 1.5,
    minHeight: 100,
    justifyContent: "center",
    padding: 18,
  },
  coupleEmptyMatchesTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
  },
  coupleEmptyMatchesText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  couplePackCompactGrid: {
    gap: 8,
  },
  couplePackCompact: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.4)",
    borderColor: "rgba(255,255,255,0.66)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 11,
    minHeight: 64,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  couplePackDot: {
    borderRadius: 999,
    height: 9,
    width: 9,
  },
  couplePackCompactEmoji: {
    fontFamily: emojiFont,
    fontSize: 30,
    lineHeight: 36,
    textAlign: "center",
    width: 42,
  },
  couplePackCompactCopy: {
    flex: 1,
    minWidth: 0,
  },
  couplePackCompactTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
  },
  couplePackCompactText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 2,
  },
  coupleCategoryCard: {
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    minHeight: 104,
    overflow: "hidden",
    padding: 12,
  },
  coupleCategoryCardLocked: {
    borderColor: "rgba(255,255,255,0.9)",
  },
  coupleCategorySticker: {
    height: 54,
    position: "absolute",
    right: 10,
    top: 8,
    transform: [{ rotate: "10deg" }],
    width: 54,
  },
  coupleCategoryCopy: {
    flex: 1,
    paddingRight: 82,
  },
  coupleCategoryTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 23,
    marginTop: 7,
  },
  coupleCategoryText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 4,
  },
  coupleCategoryStatusOpen: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderRadius: 999,
    minHeight: 30,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  coupleCategoryStatusText: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
  },
  coupleCategoryBuyButton: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 5,
    minHeight: 34,
    paddingHorizontal: 12,
  },
  coupleCategoryBuyText: {
    color: candy.white,
    fontSize: 11,
    fontWeight: "900",
  },
  coupleMatchShortcut: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 74,
    padding: 12,
  },
  coupleMatchShortcutIcon: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  coupleMatchShortcutCopy: {
    flex: 1,
  },
  coupleMatchShortcutTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
  },
  coupleMatchShortcutText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 2,
  },
  purchaseOverlay: {
    backgroundColor: "rgba(35,18,36,0.42)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 14,
  },
  purchaseBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  purchaseSheet: {
    borderColor: candy.white,
    borderRadius: 30,
    borderWidth: 2,
    gap: 13,
    overflow: "hidden",
    padding: 18,
    shadowColor: "rgba(32,16,31,0.28)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 0,
  },
  purchaseSticker: {
    height: 82,
    position: "absolute",
    right: 12,
    top: 10,
    transform: [{ rotate: "12deg" }],
    width: 82,
  },
  purchaseNoAdsEmoji: {
    fontFamily: emojiFont,
    fontSize: 76,
    lineHeight: 84,
    opacity: 0.9,
    position: "absolute",
    right: 14,
    top: 8,
    transform: [{ rotate: "8deg" }],
  },
  purchaseEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.white,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  purchaseTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 34,
    maxWidth: "78%",
  },
  purchaseText: {
    color: candy.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
    maxWidth: "92%",
  },
  purchaseBenefits: {
    gap: 8,
  },
  purchaseBenefit: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    flexDirection: "row",
    gap: 9,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  purchaseBenefitEmoji: {
    fontFamily: emojiFont,
    fontSize: 20,
    lineHeight: 24,
  },
  purchaseBenefitText: {
    color: candy.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  purchasePriceRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: candy.white,
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  purchasePrice: {
    color: candy.red,
    fontFamily: displayFont,
    fontSize: 27,
    fontWeight: "900",
  },
  purchaseFinePrint: {
    color: candy.text,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  purchaseActions: {
    flexDirection: "row",
    gap: 9,
  },
  purchasePrimary: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 20,
    borderWidth: 2,
    flex: 1.3,
    justifyContent: "center",
    minHeight: 52,
  },
  purchasePrimaryText: {
    color: candy.white,
    fontSize: 14,
    fontWeight: "900",
  },
  purchaseSecondary: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderRadius: 20,
    flex: 1,
    justifyContent: "center",
    minHeight: 52,
  },
  purchaseSecondaryText: {
    color: candy.red,
    fontSize: 13,
    fontWeight: "900",
  },
  purchaseSuccessScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
    padding: 20,
  },
  purchaseSuccessGlow: {
    backgroundColor: "rgba(255,36,95,0.22)",
    borderRadius: 999,
    height: 260,
    position: "absolute",
    top: 88,
    width: 260,
  },
  purchaseSuccessConfetti: {
    color: candy.white,
    fontSize: 36,
    fontWeight: "900",
    position: "absolute",
    textShadowColor: "rgba(255,36,95,0.4)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  purchaseSuccessConfettiOne: {
    left: 34,
    top: 128,
  },
  purchaseSuccessConfettiTwo: {
    right: 44,
    top: 184,
  },
  purchaseSuccessConfettiThree: {
    bottom: 156,
    left: 58,
  },
  purchaseSuccessSticker: {
    height: 116,
    marginBottom: 18,
    width: 116,
  },
  purchaseSuccessEyebrow: {
    alignSelf: "center",
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    textTransform: "uppercase",
  },
  purchaseSuccessTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 40,
    fontWeight: "900",
    lineHeight: 42,
    marginTop: 12,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.78)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  purchaseSuccessText: {
    color: candy.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 360,
    textAlign: "center",
  },
  purchaseSuccessPack: {
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    marginTop: 22,
    minHeight: 146,
    overflow: "hidden",
    padding: 16,
    width: "100%",
  },
  purchaseSuccessShimmer: {
    backgroundColor: "rgba(255,255,255,0.34)",
    bottom: -30,
    position: "absolute",
    top: -40,
    width: 54,
  },
  purchaseSuccessPackTag: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 999,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  purchaseSuccessPackTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
    marginTop: 9,
  },
  purchaseSuccessPackText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 5,
    maxWidth: "86%",
  },
  purchaseSuccessCTA: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 18,
    minHeight: 58,
    shadowColor: "rgba(32,16,31,0.28)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 18,
    width: "100%",
  },
  purchaseSuccessCTAText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
  },
  moodWidgetShell: {
    borderRadius: 30,
    overflow: "visible",
    position: "relative",
  },
  moodOuterGlow: {
    backgroundColor: "rgba(255,88,162,0.34)",
    borderColor: "rgba(255,255,255,0.32)",
    borderRadius: 34,
    borderWidth: 1,
    bottom: -10,
    left: -10,
    position: "absolute",
    right: -10,
    shadowColor: "rgba(255,36,95,0.72)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 26,
    top: -10,
  },
  moodOuterGlowHot: {
    backgroundColor: "rgba(255,30,112,0.16)",
    borderColor: "rgba(255,212,232,0.5)",
    borderRadius: 40,
    borderWidth: 1,
    bottom: -16,
    left: -16,
    position: "absolute",
    right: -16,
    shadowColor: "rgba(255,15,100,0.62)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 34,
    top: -16,
  },
  moodWidget: {
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 26,
    borderWidth: 2,
    overflow: "hidden",
    padding: 14,
    position: "relative",
    shadowColor: candy.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  moodWidgetContent: {
    position: "relative",
    zIndex: 2,
  },
  moodWidgetWarming: {
    borderColor: "rgba(255,255,255,0.92)",
  },
  moodWidgetLit: {
    borderColor: candy.white,
    shadowColor: "rgba(255,36,95,0.36)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  moodWidgetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingRight: 12,
  },
  moodWidgetCopy: {
    flex: 1,
  },
  moodWidgetTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 27,
  },
  moodWidgetTitleLit: {
    color: candy.white,
    textShadowColor: "rgba(32,16,31,0.22)",
    textShadowOffset: { width: 1, height: 1.5 },
    textShadowRadius: 0,
  },
  moodWidgetText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 4,
  },
  moodWidgetTextLit: {
    color: candy.white,
    fontWeight: "900",
  },
  moodBellButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: "rgba(255,36,95,0.34)",
    borderRadius: 18,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  moodBellButtonEnabled: {
    backgroundColor: candy.red,
    borderColor: candy.white,
    shadowColor: "rgba(255,36,95,0.28)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  moodToggleRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 14,
  },
  moodToggle: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.66)",
    borderColor: "rgba(32,16,31,0.1)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 2,
    height: 50,
    justifyContent: "center",
    minWidth: 0,
  },
  moodToggleSelected: {
    backgroundColor: candy.white,
    borderColor: candy.pinkHot,
    borderWidth: 2,
  },
  moodToggleSelectedLit: {
    borderColor: candy.roseDeep,
  },
  moodToggleEmoji: {
    fontSize: 18,
  },
  moodToggleLabel: {
    color: candy.text,
    fontSize: 9,
    fontWeight: "900",
    textAlign: "center",
  },
  moodToggleLabelSelected: {
    color: candy.pinkHot,
  },
  moodNotificationOverlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  moodNotificationBackdrop: {
    backgroundColor: "rgba(32,16,31,0.45)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  moodNotificationSheetWrap: {
    maxWidth: 440,
    width: "100%",
  },
  moodNotificationSheet: {
    borderColor: candy.white,
    borderRadius: 32,
    borderWidth: 2,
    overflow: "hidden",
    padding: 18,
    position: "relative",
    shadowColor: "rgba(32,16,31,0.28)",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  moodNotificationSparkle: {
    bottom: -10,
    opacity: 0.8,
    position: "absolute",
    right: -8,
    transform: [{ rotate: "12deg" }],
  },
  moodNotificationIcon: {
    alignItems: "center",
    backgroundColor: "rgba(32,16,31,0.9)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 66,
    justifyContent: "center",
    width: 66,
  },
  moodNotificationTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 34,
    marginTop: 14,
    textShadowColor: "rgba(32,16,31,0.34)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  moodNotificationText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 8,
    maxWidth: 360,
  },
  moodNotificationActions: {
    gap: 9,
    marginTop: 16,
  },
  moodNotificationPrimary: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderRadius: 22,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 52,
  },
  moodNotificationPrimaryText: {
    color: candy.red,
    fontSize: 15,
    fontWeight: "900",
  },
  moodNotificationSecondary: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 48,
  },
  moodNotificationSecondaryText: {
    color: candy.white,
    fontSize: 14,
    fontWeight: "900",
  },
  moodAtmosphere: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  moodGradientLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  moodGradientFill: {
    flex: 1,
  },
  moodEmberPool: {
    borderRadius: 999,
    position: "absolute",
    shadowColor: "rgba(255,83,87,0.62)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 22,
  },
  moodEmberPoolLeft: {
    backgroundColor: "rgba(255,36,95,0.5)",
    bottom: -64,
    height: 154,
    left: -38,
    width: 210,
  },
  moodEmberPoolRight: {
    backgroundColor: "rgba(255,139,200,0.46)",
    bottom: -72,
    height: 172,
    right: -54,
    width: 230,
  },
  moodHeatRim: {
    borderColor: "rgba(255,212,232,0.78)",
    borderRadius: 26,
    borderWidth: 1.4,
    bottom: 2,
    left: 2,
    position: "absolute",
    right: 2,
    top: 2,
  },
  moodShimmer: {
    backgroundColor: "rgba(255,255,255,0.58)",
    borderRadius: 999,
    bottom: -8,
    height: 132,
    left: "48%",
    opacity: 0.2,
    position: "absolute",
    width: 34,
  },
  profileScreen: {
    flexGrow: 1,
    gap: 12,
    justifyContent: "space-between",
    paddingBottom: 116,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  profileMainArea: {
    gap: 12,
  },
  profilePanel: {
    alignItems: "center",
    borderColor: candy.white,
    borderRadius: 34,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 244,
    overflow: "hidden",
    padding: 18,
    shadowColor: "rgba(255, 30, 112, 0.26)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  profileSparkle: {
    height: 82,
    position: "absolute",
    right: 18,
    top: 16,
    transform: [{ rotate: "8deg" }],
    width: 82,
  },
  profileCherry: {
    bottom: -14,
    height: 96,
    left: -10,
    opacity: 0.78,
    position: "absolute",
    transform: [{ rotate: "-12deg" }],
    width: 96,
  },
  profileAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 106,
    justifyContent: "center",
    shadowColor: "rgba(32,16,31,0.22)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 22,
    width: 106,
  },
  profileAvatarEmoji: {
    fontFamily: emojiFont,
    fontSize: 52,
    lineHeight: 64,
  },
  profileTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 35,
    fontWeight: "900",
    lineHeight: 38,
    marginTop: 10,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  profileMeta: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.42)",
    borderRadius: 999,
    borderWidth: 1.5,
    color: candy.white,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 8,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 6,
    textAlign: "center",
  },
  statusEditorPanel: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    gap: 12,
    padding: 14,
    shadowColor: "rgba(255,36,95,0.14)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  statusEditorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  statusEditorPreview: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: "rgba(255,36,95,0.2)",
    borderRadius: 24,
    borderWidth: 2,
    height: 62,
    justifyContent: "center",
    width: 62,
  },
  statusEditorPreviewEmoji: {
    fontFamily: emojiFont,
    fontSize: 34,
    lineHeight: 42,
  },
  statusEditorCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusEditorTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 23,
  },
  statusEditorText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 4,
  },
  statusPresetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusPresetButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: "rgba(255,255,255,0.92)",
    borderRadius: 18,
    borderWidth: 1.5,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  statusPresetButtonActive: {
    backgroundColor: candy.red,
    borderColor: candy.white,
    shadowColor: "rgba(255,36,95,0.24)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  statusPresetEmoji: {
    fontFamily: emojiFont,
    fontSize: 25,
    lineHeight: 32,
  },
  statusCustomRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  statusCustomInput: {
    backgroundColor: candy.white,
    borderColor: "rgba(35,18,36,0.14)",
    borderRadius: 18,
    borderWidth: 1.5,
    color: candy.ink,
    flex: 0.35,
    fontFamily: emojiFont,
    fontSize: 24,
    fontWeight: "900",
    minHeight: 48,
    paddingHorizontal: 12,
    textAlign: "center",
  },
  statusCustomButton: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flex: 1,
    justifyContent: "center",
    minHeight: 48,
  },
  statusCustomButtonText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
  },
  profileSettingsSection: {
    gap: 8,
  },
  profileSectionTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 21,
    fontWeight: "900",
    paddingHorizontal: 4,
  },
  profileNotificationList: {
    gap: 8,
  },
  profileNotificationPanel: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  profileNotificationIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(255,36,95,0.28)",
    borderRadius: 18,
    borderWidth: 2,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  profileNotificationEmoji: {
    fontFamily: emojiFont,
    fontSize: 22,
    lineHeight: 28,
  },
  profileNotificationIconOn: {
    backgroundColor: candy.red,
    borderColor: candy.white,
  },
  profileNotificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileNotificationEyebrow: {
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  profileNotificationTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 2,
  },
  profileNotificationText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 2,
  },
  profileNotificationToggle: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: candy.red,
    borderRadius: 999,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 78,
    paddingHorizontal: 12,
  },
  profileNotificationToggleOn: {
    backgroundColor: candy.red,
    borderColor: candy.white,
  },
  profileNotificationToggleText: {
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
  },
  profileNotificationToggleTextOn: {
    color: candy.white,
  },
  profileUtilityGrid: {
    flexDirection: "row",
    gap: 10,
  },
  actorRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  actorChip: {
    backgroundColor: candy.white,
    borderColor: candy.black,
    borderRadius: 18,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  actorChipActive: {
    backgroundColor: candy.red,
  },
  actorChipText: {
    color: candy.black,
    fontSize: 13,
    fontWeight: "900",
  },
  actorChipTextActive: {
    color: candy.white,
  },
  profileLeaveAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.76)",
    borderColor: candy.red,
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  profileLeaveActionText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  profileAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 10,
  },
  profileActionText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  logoutAction: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  logoutActionText: {
    color: candy.white,
    fontSize: 14,
    fontWeight: "900",
  },
  aboutPanel: {
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    padding: 14,
  },
  profileBottomActions: {
    gap: 8,
  },
  aboutEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.roseMist,
    borderRadius: 999,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  aboutTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 23,
    fontWeight: "900",
    marginTop: 8,
  },
  aboutText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 6,
  },
  aboutMeta: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 10,
  },
  debugHero: {
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    overflow: "hidden",
    padding: 18,
  },
  debugScreen: {
    paddingBottom: 152,
  },
  debugEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 12,
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  debugTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: 8,
  },
  debugText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 6,
  },
  debugStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  debugLoadedPanel: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    gap: 12,
    padding: 14,
  },
  debugLoadedHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  debugLoadedTitleBlock: {
    flex: 1,
  },
  debugLoadedEyebrow: {
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  debugLoadedTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 2,
  },
  debugCodeBadge: {
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 15,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  debugInfoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  debugInfoCell: {
    backgroundColor: "rgba(255,225,241,0.72)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    borderWidth: 1.5,
    flexGrow: 1,
    minWidth: 96,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  debugInfoCellWide: {
    minWidth: "100%",
  },
  debugInfoLabel: {
    color: candy.muted,
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  debugInfoValue: {
    color: candy.ink,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 3,
  },
  debugRestoreAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderColor: candy.red,
    borderRadius: 20,
    borderStyle: "dashed",
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    minHeight: 64,
    padding: 11,
  },
  debugRestoreTitle: {
    color: candy.red,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
  },
  debugRestoreText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 2,
  },
  debugActorGrid: {
    gap: 9,
  },
  debugActorCard: {
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    gap: 8,
    padding: 12,
  },
  debugActorCardActive: {
    backgroundColor: candy.red,
    shadowColor: "rgba(255,36,95,0.28)",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  debugActorTopLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  debugActorName: {
    color: candy.ink,
    flex: 1,
    fontFamily: displayFont,
    fontSize: 21,
    fontWeight: "900",
  },
  debugActorNameActive: {
    color: candy.white,
  },
  debugActorBadge: {
    backgroundColor: candy.pinkSoft,
    borderRadius: 999,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  debugActorBadgeActive: {
    backgroundColor: candy.white,
    color: candy.red,
  },
  debugActorMeta: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  debugActorMetaActive: {
    color: candy.white,
  },
  debugActorStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  debugActorStat: {
    backgroundColor: "rgba(255,225,241,0.78)",
    borderRadius: 999,
    color: candy.ink,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  debugActorStatActive: {
    backgroundColor: "rgba(255,255,255,0.92)",
    color: candy.red,
  },
  debugActionGrid: {
    gap: 10,
  },
  debugAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 72,
    padding: 12,
  },
  debugDangerAction: {
    backgroundColor: candy.black,
    borderColor: "rgba(255,255,255,0.82)",
  },
  debugActionCopy: {
    flex: 1,
  },
  debugActionTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
  },
  debugActionText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 2,
  },
  debugDangerTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
  },
  debugDangerText: {
    color: candy.white,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 2,
  },
  debugSectionHeader: {
    paddingHorizontal: 4,
  },
  debugSectionTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
  },
  debugSectionText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  debugPresetList: {
    gap: 9,
  },
  debugPreset: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 84,
    padding: 12,
  },
  debugPresetActive: {
    backgroundColor: candy.roseMist,
    borderColor: candy.red,
  },
  debugPresetIcon: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 18,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  debugPresetCopy: {
    flex: 1,
  },
  debugPresetTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
  },
  debugPresetText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 2,
  },
  debugPresetTarget: {
    alignSelf: "flex-start",
    backgroundColor: candy.pinkSoft,
    borderRadius: 999,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  debugPresetTargetActive: {
    backgroundColor: candy.red,
    color: candy.white,
  },
  inviteScreen: {
    flexGrow: 1,
    gap: 14,
    justifyContent: "center",
    minHeight: "100%",
    padding: 18,
    paddingBottom: 24,
    paddingTop: 22,
  },
  inviteFloatingHeart: {
    height: 112,
    opacity: 0.78,
    position: "absolute",
    right: -8,
    top: 74,
    width: 112,
  },
  inviteFloatingCherry: {
    bottom: -44,
    height: 104,
    left: -24,
    opacity: 0.58,
    position: "absolute",
    width: 104,
  },
  inviteHero: {
    borderColor: candy.white,
    borderRadius: 34,
    borderWidth: 2,
    minHeight: 500,
    overflow: "hidden",
    padding: 20,
    shadowColor: "rgba(255,36,95,0.36)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 28,
  },
  inviteLock: {
    height: 86,
    position: "absolute",
    right: 12,
    top: 16,
    transform: [{ rotate: "10deg" }],
    width: 86,
  },
  inviteSparkles: {
    bottom: 18,
    height: 88,
    opacity: 0.78,
    position: "absolute",
    right: 12,
    width: 88,
  },
  inviteEyebrow: {
    alignSelf: "center",
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 21,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 6,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.28)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
    textTransform: "uppercase",
  },
  inviteTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 44,
    fontWeight: "900",
    lineHeight: 45,
    marginTop: 10,
    maxWidth: "82%",
    textShadowColor: "rgba(32,16,31,0.36)",
    textShadowOffset: { width: 2, height: 2.5 },
    textShadowRadius: 0,
  },
  inviteText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 10,
    maxWidth: "88%",
  },
  inviteTicket: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    marginTop: 28,
    overflow: "hidden",
    padding: 18,
  },
  inviteTicketGlow: {
    backgroundColor: candy.pink,
    borderRadius: 999,
    bottom: -42,
    height: 92,
    left: 42,
    position: "absolute",
    right: 42,
  },
  inviteTicketShimmer: {
    backgroundColor: "rgba(255,255,255,0.42)",
    bottom: -36,
    position: "absolute",
    top: -36,
    width: 42,
  },
  inviteTicketLabel: {
    alignSelf: "center",
    color: candy.pinkHot,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  inviteTicketCode: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 54,
    marginTop: 8,
    textAlign: "center",
  },
  inviteTicketDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginVertical: 8,
  },
  inviteDot: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  inviteDash: {
    backgroundColor: "rgba(255,36,95,0.22)",
    borderRadius: 999,
    flex: 1,
    height: 3,
    maxWidth: 150,
  },
  inviteTicketHint: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
  },
  inviteActions: {
    gap: 9,
  },
  invitePrimaryButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 58,
    shadowColor: "rgba(255, 30, 112, 0.34)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  invitePrimaryText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
  },
  inviteSecondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: candy.white,
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
  },
  inviteSecondaryText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  inviteContinueButton: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    shadowColor: "rgba(32,16,31,0.26)",
    shadowOffset: { width: 0, height: 9 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  inviteContinueText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 15,
    fontWeight: "900",
  },
  inviteFinePrint: {
    color: candy.ink,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    textAlign: "center",
  },
  leaveScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  leaveContent: {
    alignItems: "center",
    maxWidth: 430,
    width: "100%",
  },
  leaveFloatingHeart: {
    height: 104,
    left: -16,
    opacity: 0.42,
    position: "absolute",
    top: 78,
    width: 104,
  },
  leaveFloatingBubble: {
    bottom: 84,
    height: 96,
    opacity: 0.5,
    position: "absolute",
    right: -14,
    width: 96,
  },
  leaveEmojiHalo: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.52)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 138,
    justifyContent: "center",
    shadowColor: "rgba(255,36,95,0.28)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 1,
    shadowRadius: 26,
    width: 138,
  },
  leaveEmoji: {
    fontFamily: emojiFont,
    fontSize: 82,
    lineHeight: 96,
  },
  leaveEyebrow: {
    alignSelf: "center",
    backgroundColor: candy.roseMist,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 26,
    overflow: "hidden",
    paddingHorizontal: 11,
    paddingVertical: 6,
    textTransform: "uppercase",
  },
  leaveTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 41,
    marginTop: 14,
    maxWidth: 390,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.75)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  leaveText: {
    color: candy.text,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 370,
    textAlign: "center",
  },
  leavePromise: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    maxWidth: 380,
    padding: 14,
    width: "100%",
  },
  leavePromiseEmoji: {
    fontFamily: emojiFont,
    fontSize: 26,
    lineHeight: 32,
  },
  leavePromiseText: {
    color: candy.ink,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  leaveActions: {
    alignItems: "center",
    gap: 10,
    marginTop: 24,
    maxWidth: 330,
    width: "100%",
  },
  leavePrimary: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 18,
    shadowColor: "rgba(32,16,31,0.28)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 18,
    width: "100%",
  },
  leavePrimaryText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  leaveSecondary: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.84)",
    borderColor: candy.white,
    borderRadius: 20,
    borderWidth: 2,
    justifyContent: "center",
    minHeight: 50,
    width: "100%",
  },
  leaveSecondaryText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  welcomeScreen: {
    flexGrow: 1,
    gap: 22,
    justifyContent: "center",
    overflow: "visible",
    paddingBottom: 92,
    paddingHorizontal: 42,
    paddingTop: 58,
  },
  welcomeScreenCompact: {
    gap: 11,
    paddingBottom: 64,
    paddingHorizontal: 32,
    paddingTop: 18,
  },
  welcomeFrame: {
    flex: 1,
  },
  welcomeLogo: {
    marginBottom: 0,
  },
  welcomeTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 48,
  },
  welcomeTopBarCompact: {
    minHeight: 40,
  },
  welcomeProgressRow: {
    alignSelf: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: "rgba(255,255,255,0.62)",
    borderRadius: 999,
    borderWidth: 1.5,
    height: 12,
    overflow: "hidden",
    maxWidth: 330,
    shadowColor: "rgba(255,255,255,0.28)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 12,
    width: "52%",
  },
  welcomeProgressRowCompact: {
    height: 10,
    maxWidth: 260,
    width: "50%",
  },
  welcomeProgressDock: {
    alignItems: "center",
    bottom: 34,
    left: 0,
    position: "absolute",
    right: 0,
  },
  welcomeProgressDockCompact: {
    bottom: 24,
  },
  welcomeProgressGlow: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    bottom: 2,
    left: 0,
    position: "absolute",
    top: 2,
    width: "100%",
  },
  welcomeProgressFill: {
    backgroundColor: candy.white,
    borderRadius: 999,
    bottom: 2,
    left: 2,
    position: "absolute",
    shadowColor: "rgba(255,255,255,0.72)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 9,
    top: 2,
  },
  welcomeCherry: {
    height: 96,
    left: -24,
    opacity: 0.54,
    position: "absolute",
    top: 92,
    width: 96,
  },
  welcomeSparkles: {
    height: 74,
    opacity: 0.78,
    position: "absolute",
    right: -8,
    top: 44,
    width: 74,
  },
  welcomeSlide: {
    justifyContent: "center",
    marginTop: 26,
    minHeight: 0,
    width: "100%",
  },
  welcomeSlideCompact: {
    marginTop: 12,
  },
  welcomeSlideCard: {
    alignItems: "center",
    alignSelf: "center",
    justifyContent: "flex-start",
    maxWidth: 620,
    minHeight: 0,
    overflow: "visible",
    width: "100%",
  },
  welcomeVisualHalo: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 0,
    height: 78,
    justifyContent: "center",
    marginBottom: 10,
    width: 78,
  },
  welcomeVisualHaloCompact: {
    height: 54,
    marginBottom: 8,
    width: 54,
  },
  welcomeBigSticker: {
    height: 76,
    width: 76,
  },
  welcomeBigStickerCompact: {
    height: 54,
    width: 54,
  },
  welcomeHero: {
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 32,
    borderWidth: 2,
    overflow: "hidden",
    padding: 18,
    shadowColor: "rgba(87, 8, 58, 0.18)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  welcomeEyebrow: {
    alignSelf: "center",
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 6,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.28)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
    textTransform: "uppercase",
  },
  welcomeEyebrowCompact: {
    fontSize: 20,
    marginBottom: 4,
  },
  welcomeTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 35,
    fontWeight: "900",
    lineHeight: 37,
    marginTop: 8,
    maxWidth: 600,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.32)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0,
  },
  welcomeTitleCompact: {
    fontSize: 33,
    lineHeight: 35,
    marginTop: 6,
  },
  welcomeText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 520,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.22)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  welcomeTextCompact: {
    fontSize: 14,
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 500,
  },
  welcomeDemoFrame: {
    alignSelf: "center",
    marginTop: 18,
    overflow: "visible",
    position: "relative",
    shadowColor: "rgba(255, 30, 112, 0.2)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  welcomeDemoFrameCompact: {
    marginTop: 14,
  },
  welcomeDemoCard: {
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    flex: 1,
    overflow: "hidden",
    padding: 14,
  },
  welcomeDemoCardHot: {
    shadowColor: "rgba(255, 30, 112, 0.36)",
    shadowRadius: 22,
  },
  welcomeDemoVotedPlaceholder: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderColor: candy.white,
    borderRadius: 26,
    borderStyle: "dashed",
    borderWidth: 2.5,
    justifyContent: "center",
    padding: 24,
  },
  welcomeDemoVotedMessage: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 29,
    maxWidth: 330,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.28)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  welcomeDemoTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  welcomeDemoMetaRow: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    minWidth: 0,
    paddingRight: 8,
  },
  welcomeDemoTag: {
    alignSelf: "flex-start",
    backgroundColor: candy.white,
    borderRadius: 999,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  welcomeDemoSticker: {
    height: 62,
    position: "absolute",
    right: 10,
    top: 10,
    transform: [{ rotate: "10deg" }],
    width: 62,
    zIndex: 1,
  },
  welcomeDemoCopy: {
    alignItems: "center",
    paddingHorizontal: 58,
  },
  welcomeDemoTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 29,
    marginTop: 10,
    textAlign: "center",
    textShadowColor: "rgba(255,255,255,0.52)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  welcomeDemoText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    height: 17,
    lineHeight: 16,
    marginTop: 5,
    textAlign: "center",
  },
  welcomeVoteRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
  },
  welcomeVotePill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: candy.ink,
    borderRadius: 20,
    borderWidth: 1.7,
    flex: 1,
    height: 48,
    justifyContent: "center",
    shadowColor: "rgba(32,16,31,0.14)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  welcomeVotePillSelected: {
    backgroundColor: candy.ink,
    borderColor: candy.ink,
  },
  welcomeVoteFire: {
    backgroundColor: candy.red,
    borderColor: candy.red,
  },
  welcomeVoteFireSelected: {
    backgroundColor: candy.black,
    borderColor: candy.white,
    shadowColor: "rgba(255, 36, 95, 0.34)",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  welcomeVoteText: {
    color: candy.ink,
    fontSize: 13,
    fontWeight: "900",
  },
  welcomeVoteTextSelected: {
    color: candy.white,
  },
  welcomeVoteFireText: {
    fontFamily: emojiFont,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  welcomeDemoFeedback: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.7)",
    borderRadius: 16,
    flexDirection: "row",
    height: 54,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingLeft: 46,
    paddingVertical: 0,
    position: "relative",
  },
  welcomeDemoFeedbackHot: {
    backgroundColor: candy.red,
  },
  welcomeDemoFeedbackLock: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    left: 12,
    position: "absolute",
    width: 28,
  },
  welcomeDemoFeedbackText: {
    color: candy.text,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 16,
    minHeight: 32,
    paddingRight: 18,
    textAlign: "center",
  },
  welcomeDemoFeedbackTextCompact: {
    fontSize: 10,
    lineHeight: 14,
    minHeight: 28,
    paddingRight: 12,
  },
  welcomeDemoFeedbackTextHot: {
    color: candy.white,
  },
  welcomeSteps: {
    gap: 9,
  },
  welcomeStep: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: candy.white,
    borderRadius: 23,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 88,
    padding: 12,
  },
  welcomeStepSticker: {
    height: 58,
    width: 58,
  },
  welcomeStepCopy: {
    flex: 1,
  },
  welcomeStepTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
  },
  welcomeStepText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 3,
  },
  welcomeCTA: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flex: 1.3,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 56,
    shadowColor: "rgba(255, 30, 112, 0.34)",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  welcomeCTACompact: {
    minHeight: 54,
  },
  welcomeCTAText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
  },
  welcomeNav: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 26,
    maxWidth: 480,
    width: "100%",
  },
  welcomeNavCompact: {
    gap: 10,
    marginTop: 20,
    maxWidth: 482,
  },
  welcomeSecondaryCTA: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: candy.white,
    borderRadius: 22,
    borderWidth: 2,
    flex: 0.8,
    justifyContent: "center",
    minHeight: 56,
  },
  welcomeSecondaryCTACompact: {
    minHeight: 54,
  },
  welcomeSecondaryText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  welcomeNavDisabled: {
    opacity: 0.42,
  },
  welcomeHint: {
    color: candy.ink,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 8,
    textAlign: "center",
  },
  authScreen: {
    alignItems: "center",
    flexGrow: 1,
    gap: 18,
    justifyContent: "center",
    padding: 20,
  },
  authText: {
    color: candy.black,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  authCard: {
    backgroundColor: "rgba(255,255,255,0.74)",
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    gap: 12,
    padding: 16,
    width: "100%",
  },
  onboardingScreen: {
    alignItems: "center",
    flexGrow: 1,
    justifyContent: "center",
    overflow: "visible",
    paddingBottom: 24,
    paddingHorizontal: 22,
    paddingTop: 20,
  },
  onboardingFloatCherry: {
    left: -16,
    opacity: 0.3,
    position: "absolute",
    top: 126,
    transform: [{ rotate: "-14deg" }],
  },
  onboardingFloatSparkles: {
    opacity: 0.76,
    position: "absolute",
    right: 20,
    top: 42,
    transform: [{ rotate: "8deg" }],
  },
  onboardingHero: {
    alignItems: "center",
    maxWidth: 520,
    width: "100%",
  },
  onboardingLogo: {
    marginBottom: 8,
  },
  onboardingHeader: {
    alignItems: "center",
    gap: 8,
    width: "100%",
  },
  onboardingEyebrow: {
    alignSelf: "center",
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 0,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.34)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
    textTransform: "uppercase",
  },
  onboardingTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 43,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.55)",
    textShadowOffset: { width: 2, height: 2.5 },
    textShadowRadius: 0,
  },
  onboardingText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 2,
    maxWidth: 420,
    textAlign: "center",
    textShadowColor: "rgba(32,16,31,0.22)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 0,
  },
  onboardingPreviewCard: {
    alignItems: "center",
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    flexDirection: "row",
    gap: 13,
    marginTop: 18,
    maxWidth: 420,
    minHeight: 82,
    overflow: "hidden",
    padding: 10,
    shadowColor: "rgba(255, 30, 112, 0.22)",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 1,
    shadowRadius: 20,
    width: "100%",
  },
  onboardingAvatarRing: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 58,
    justifyContent: "center",
    shadowColor: "rgba(255, 30, 112, 0.28)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
    width: 58,
  },
  onboardingAvatarEmoji: {
    fontFamily: emojiFont,
    fontSize: 30,
    lineHeight: 37,
  },
  onboardingPreviewCopy: {
    flex: 1,
  },
  onboardingPreviewName: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
  },
  onboardingPreviewVibe: {
    color: candy.red,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2,
  },
  onboardingPreviewBadge: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  onboardingPanel: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: candy.white,
    borderRadius: 32,
    borderWidth: 2,
    gap: 12,
    marginTop: 12,
    maxWidth: 560,
    overflow: "hidden",
    padding: 14,
    shadowColor: "rgba(118, 22, 78, 0.2)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
    width: "100%",
  },
  candyButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 18,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  candyButtonText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
  },
  demoButton: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: candy.red,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
  },
  demoButtonText: {
    color: candy.red,
    fontSize: 15,
    fontWeight: "900",
  },
  authHint: {
    backgroundColor: "rgba(255,36,95,0.08)",
    borderColor: "rgba(255,36,95,0.18)",
    borderRadius: 16,
    borderWidth: 1,
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: "center",
  },
  errorText: {
    color: candy.red,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  modeSwitch: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: 6,
    padding: 5,
  },
  modeButton: {
    alignItems: "center",
    borderRadius: 19,
    flex: 1,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  modeButtonActive: {
    backgroundColor: candy.red,
    shadowColor: "rgba(255, 30, 112, 0.25)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 14,
  },
  modeButtonText: {
    color: candy.black,
    fontSize: 14,
    fontWeight: "900",
  },
  modeButtonTextActive: {
    color: candy.white,
  },
  inputBlock: {
    gap: 7,
  },
  inputLabel: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(35,18,36,0.16)",
    borderRadius: 20,
    borderWidth: 2,
    color: candy.black,
    fontSize: 16,
    fontWeight: "800",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  vibePicker: {
    gap: 9,
  },
  vibeHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  vibeHint: {
    color: candy.muted,
    fontSize: 11,
    fontWeight: "800",
  },
  vibeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  vibeOption: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.86)",
    borderColor: "rgba(35,18,36,0.12)",
    borderRadius: 22,
    borderWidth: 2,
    flexBasis: "31%",
    flexGrow: 1,
    gap: 6,
    minHeight: 78,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  vibeOptionActive: {
    backgroundColor: candy.red,
    borderColor: candy.white,
    shadowColor: "rgba(255, 30, 112, 0.24)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  vibeEmojiBubble: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 42,
  },
  vibeEmojiBubbleActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  vibeEmoji: {
    fontFamily: emojiFont,
    fontSize: 31,
    lineHeight: 38,
  },
  vibeLabel: {
    color: candy.ink,
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  vibeLabelActive: {
    color: candy.white,
  },
  disabled: {
    opacity: 0.6,
  },
});
