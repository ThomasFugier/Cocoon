import { StatusBar } from "expo-status-bar";
import * as Clipboard from "expo-clipboard";
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/bricolage-grotesque";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowLeft,
  Bell,
  BellOff,
  Camera,
  Check,
  ChevronRight,
  Code2,
  Copy,
  Eye,
  Flame,
  Heart,
  Home,
  ImagePlus,
  Lightbulb,
  LockKeyhole,
  LogOut,
  MessageCircle,
  RefreshCcw,
  Send,
  Settings,
  Sparkles,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  PixelRatio,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextInput,
  useWindowDimensions,
  View,
  ViewStyle,
  type AppStateStatus,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type TextProps,
  type TextStyle,
} from "react-native";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import {
  ProfileAccountPanel,
  SessionStatusPill,
  authAccountInfo,
  type AuthAccountInfo,
} from "./src/components/AuthStatus";
import { DESIRE_CATEGORIES, DESIRE_PACKS, desireCards } from "./src/data/desires";
import { AuthGate, OnboardingScreen } from "./src/features/onboarding";
import { AuthProvider, signInWithProvider, signOut } from "./src/lib/auth";
import {
  createSignedChatAttachmentUrl,
  compressChatAttachmentForUpload,
  consumeRemoteChatAttachment,
  createRemoteCouple,
  deleteRemoteAccount,
  fetchRemoteChatMessages,
  fetchRemoteChatSyncMarker,
  fetchRemoteCoupleMembers,
  fetchMyCoupleState,
  joinRemoteCouple,
  leaveRemoteCouple,
  markRemoteMatchRevealed,
  markRemoteNextMatchRevealed,
  saveRemoteCustomDesire,
  saveRemoteMood,
  saveRemoteNotificationPreferences,
  saveRemoteProfileName,
  saveRemoteProfileStatus,
  saveRemoteVote,
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
  enqueueRemoteChatAttachmentConsumption,
  enqueueRemoteChatMessage,
  clearVisibleOfflineQueue,
  flushRemoteQueue,
  loadOfflineQueueCount,
  removeRemoteChatAttachmentConsumption,
  sendOrQueueRemoteNotificationEvent,
} from "./src/lib/offlineQueue";
import {
  configureNotificationChannel,
  requestPushPermissionAndRegister,
  syncPushTokenIfAlreadyGranted,
} from "./src/lib/notifications";
import { hasSupabaseConfig, supabase } from "./src/lib/supabase";
import { Entrance, SpringPressable, useEntrance } from "./src/ui/motion";
import { WsButton, WsIconButton } from "./src/ui/primitives";
import { displayFont, emojiFont, labelFont, wsColors as candy, wsType } from "./src/ui/tokens";
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
type VisibleTabKey = Exclude<TabKey, "profil" | "rules">;
type DebugPresetId = "empty" | "mood" | "reveal" | "full";
type DebugPreviewScreen = "auth" | "loading";
type DesireFilterKey = "all" | "todo" | "hot" | "curious" | "no";
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
  cta: string;
  emoji: string;
  onPress: () => void;
  secondary?: string;
  secondaryPress?: () => void;
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
const PAID_FEATURES: UnlockedFeature[] = [
  UNLIMITED_RESPONSES_FEATURE,
  CUSTOM_CARDS_UNLIMITED_FEATURE,
  NO_ADS_FEATURE,
];
const GAME_CARD_CONFIRM_MS = 260;
const GAME_CARD_EXIT_MS = 260;
const GAME_CARD_TOTAL_TRANSITION_MS = GAME_CARD_CONFIRM_MS + GAME_CARD_EXIT_MS;
const AD_REVEAL_COOLDOWN_MS = 30000;
const AD_GAME_COOLDOWN_MS = 90000;
const AD_GAME_MIN_RESPONSES = 6;
const AD_GAME_VOTE_INTERVAL = 8;
const AD_GAME_MATCH_INTERVAL = 3;
const AD_AFTER_VOTE_DELAY_MS = GAME_CARD_TOTAL_TRANSITION_MS + 260;
const CHAT_REFRESH_COOLDOWN_MS = 300;
const CHAT_ACTIVE_SYNC_POLL_MS = 8000;
const EPHEMERAL_PHOTO_VIEW_MS = 10000;
const REMOTE_REFRESH_COOLDOWN_MS = 1500;
const SIGNED_CHAT_ATTACHMENT_URL_CACHE_MS = 5 * 60 * 60 * 1000;
const PERSONAL_CATEGORY: DesireCategory = "Perso";
const PACK_CATEGORIES: DesireCategory[] = DESIRE_CATEGORIES.filter((category) => category !== PERSONAL_CATEGORY);
const COUPLE_PACK_CATEGORIES: DesireCategory[] = [...PACK_CATEGORIES, PERSONAL_CATEGORY];
const PACK_PICKER_CATEGORIES: DesireCategory[] = ["Vanille", PERSONAL_CATEGORY, ...PACK_CATEGORIES.filter((category) => category !== "Vanille")];
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
const purchaseUnlockParticles = [
  { color: candy.yellow, height: 10, left: 18, radius: 999, rotate: "0deg", top: 30, width: 10, x: -52, y: -36 },
  { color: candy.cream, height: 24, left: 42, radius: 999, rotate: "-26deg", top: 94, width: 7, x: -46, y: 4 },
  { color: candy.red, height: 9, left: 198, radius: 999, rotate: "0deg", top: 26, width: 9, x: 48, y: -42 },
  { color: candy.cream, height: 24, left: 210, radius: 999, rotate: "28deg", top: 116, width: 7, x: 48, y: 8 },
  { color: candy.yellow, height: 8, left: 98, radius: 999, rotate: "0deg", top: 6, width: 8, x: -12, y: -50 },
  { color: candy.red, height: 21, left: 116, radius: 999, rotate: "42deg", top: 236, width: 7, x: -20, y: 46 },
  { color: candy.cream, height: 8, left: 184, radius: 999, rotate: "0deg", top: 222, width: 8, x: 42, y: 42 },
] as const;
const localModeEnabled = process.env.NODE_ENV !== "production" || process.env.EXPO_PUBLIC_ENABLE_LOCAL_MODE === "true";
const storeBypassEnabled = process.env.EXPO_PUBLIC_ENABLE_STORE_BYPASS === "true";

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

  if (/notification|push|permission|project id|eas|appareil|téléphone|telephone|ios|android/i.test(message)) {
    if (/appareil|téléphone|telephone|ios|android|physical|web/i.test(message)) {
      return "Les notifications push se testent sur un vrai téléphone avec un build de développement.";
    }

    if (/permission|refus/i.test(message)) {
      return "Notifications refusées. Tu peux les réactiver dans les réglages du téléphone.";
    }

    if (/project id|eas/i.test(message)) {
      return "Notifications pas encore configurées pour ce build. Il manque le Project ID EAS.";
    }

    if (/préférence|preference|synchron/i.test(message)) {
      return "Ta préférence est gardée ici. La synchro serveur réessaiera dès que possible.";
    }

    return message;
  }

  if (/achat/i.test(message)) {
    return "Achat impossible pour le moment. Réessaie dans un instant.";
  }

  if (/connecte-toi|connexion/i.test(message)) {
    return message;
  }

  return "Hors ligne. Vos réponses sont gardées au chaud et repartiront toutes seules.";
}

const weSpiceLogoAsset = require("./assets/wespice-logo.png");

function Text({ style, ...props }: TextProps) {
  return <RNText {...props} style={[wsType.app, style]} />;
}

const PROFILE_SHORTCUT_TOP = 14;
const PROFILE_SHORTCUT_SIZE = 54;
const APP_HEADER_TOP_SPACE = PROFILE_SHORTCUT_TOP + PROFILE_SHORTCUT_SIZE + 8;
const TAB_DOCK_VISIBLE_HEIGHT = 76;
const CHAT_COMPOSER_NAV_GAP = 12;

function fullScreenSurfaceMetrics(viewportWidth: number) {
  const sideInset = viewportWidth >= 900 ? 24 : viewportWidth >= 700 ? 18 : viewportWidth >= 520 ? 14 : 12;
  return {
    contentWidth: Math.max(0, viewportWidth - sideInset * 2),
    sideInset,
  };
}

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
const customDesireQuickEmojis = ["💫", "🔥", "🍒", "🎲", "🖤"];
const customDesireAmbianceOptions = ["Complice", "Tendre", "Chaud", "Discussion"] as const;

const moodOptions: Array<{ emoji: string; hint: string; label: string; level: CoupleMoodLevel }> = [
  { level: 0, emoji: "🫶", label: "Tendre", hint: "Besoin de douceur" },
  { level: 1, emoji: "🤍", label: "Câlin", hint: "Envie d'être proches" },
  { level: 2, emoji: "🎲", label: "Joueur", hint: "Envie de flirt" },
  { level: 3, emoji: "🔥", label: "Chaud", hint: "Envie plus directe" },
];

const moodSignalOptions: Array<{ color: string; description: string; label: string; level: CoupleMoodLevel }> = [
  { level: 0, color: "#FF8EBE", label: "Tendre", description: "Envie de proximité, de douceur." },
  { level: 1, color: "#E6D8C5", label: "Câlin", description: "Envie d'être proches, tranquille." },
  { level: 2, color: candy.yellow, label: "Joueur", description: "Envie de rire et provoquer un peu." },
  { level: 3, color: candy.black, label: "Chaud", description: "Envie plus directe, si ça s'aligne." },
];
const hiddenMatchPatternDots = Array.from({ length: 64 }, (_, index) => index);

const desireFilterOptions: Array<{ key: DesireFilterKey; label: string }> = [
  { key: "all", label: "Toutes" },
  { key: "todo", label: "À répondre" },
  { key: "hot", label: "Chaud" },
  { key: "curious", label: "Pourquoi pas" },
  { key: "no", label: "Non" },
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

function homeSurpriseStatusLabel(couple: CoupleState, card: DesireCard): "Nouveau" | "Répondu" | "Match" {
  const ownVote = couple.votes[couple.activePartnerId]?.[card.id];

  if (ownVote === undefined) {
    return "Nouveau";
  }

  return isCardMatch(couple, card.id) ? "Match" : "Répondu";
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

function withUnlockedCategories(couple: CoupleState, categories: DesireCategory[]) {
  return {
    ...couple,
    unlockedCategories: Array.from(new Set([...unlockedCategories(couple), ...categories])),
  };
}

function withUnlockedFeatures(couple: CoupleState, features: UnlockedFeature[]) {
  return {
    ...couple,
    unlockedFeatures: Array.from(new Set([...unlockedFeatures(couple), ...features])),
  };
}

function purchaseSuccessForFeature(feature: UnlockedFeature): PurchaseSuccess {
  if (feature === CUSTOM_CARDS_UNLIMITED_FEATURE) {
    return { kind: "custom", category: "Perso" };
  }

  if (feature === NO_ADS_FEATURE) {
    return { kind: "no_ads" };
  }

  return { kind: "unlimited_responses" };
}

function withPurchaseTargetUnlocked(
  couple: CoupleState,
  config: ReturnType<typeof categoryPurchaseConfig> | ReturnType<typeof featurePurchaseConfig>,
) {
  if (config.target.kind === "category") {
    return withUnlockedCategories(couple, [config.target.category]);
  }

  return withUnlockedFeatures(couple, [config.target.feature]);
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

function hiddenMatchCountForCouple(couple: CoupleState, matches: DesireCard[], revealedMatchSet: Set<string>) {
  if (isRemoteCoupleId(couple.id)) {
    return couple.hiddenMatchCount ?? 0;
  }

  return matches.filter((card) => !revealedMatchSet.has(card.id)).length;
}

function hasLinkedPartner(couple: CoupleState) {
  if (isDebugCouple(couple)) {
    return true;
  }

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

function withLocalDesireVote(couple: CoupleState, cardId: string, level: VoteLevel): CoupleState {
  const activeId = couple.activePartnerId;
  const nextCouple: CoupleState = {
    ...couple,
    votes: {
      ...couple.votes,
      [activeId]: {
        ...couple.votes[activeId],
        [cardId]: level,
      },
    },
  };

  return hasUnlimitedResponses(couple) ? nextCouple : withDailyResponseIncrement(nextCouple, activeId);
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

function pendingChatExpiresAt(now = new Date()) {
  return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
}

function withPendingChatMessage(couple: CoupleState, message: ChatMessage): CoupleState {
  return {
    ...couple,
    chat: {
      lastPurgedAt: couple.chat?.lastPurgedAt,
      messages: [...(couple.chat?.messages ?? []).filter((item) => item.id !== message.id), message],
    },
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
    hiddenMatchCount: 0,
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
  const partner = couple.profiles.partner;

  return couple.id.startsWith("debug-")
    || couple.inviteCode === "DEV420"
    || couple.inviteCode === "FULL69"
    || partner.displayName === "Sam"
    || partner.vibe === "Profil de test pour QA.";
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

function normalizeProfileDisplayName(value: string, fallback = "Moi") {
  const normalized = value.trim().replace(/\s+/g, " ");
  const safeFallback = fallback.trim() || "Moi";

  return Array.from(normalized || safeFallback).slice(0, 32).join("");
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

function withUpdatedProfileName(couple: CoupleState, partnerId: PartnerId, displayName: string): CoupleState {
  return {
    ...couple,
    profiles: {
      ...couple.profiles,
      [partnerId]: {
        ...couple.profiles[partnerId],
        displayName,
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
    remoteUserId: row.user_id,
    statusEmoji: normalizeStatusEmoji(row.status_emoji || stickers.heart),
    statusUpdatedAt: row.status_updated_at ?? undefined,
    vibe: row.vibe || "",
  };
}

function coupleRemoteProfileIds(couple: CoupleState) {
  return Array.from(new Set(PARTNER_IDS
    .map((partnerId) => couple.profiles[partnerId].remoteUserId)
    .filter((id): id is string => Boolean(id))));
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
      if (attachment.disappeared || !attachment.storage_path) {
        return {
          consumedAt: attachment.consumed_at ?? undefined,
          disappeared: true,
          id: attachment.id,
          mimeType: attachment.mime_type,
          name: attachment.name ?? "Photo disparue",
          type: "image" as const,
          uri: "",
        };
      }

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

function chatSyncMarkerKey(marker: { latest_message_at?: string | null; latest_message_id?: string | null }) {
  return `${marker.latest_message_id ?? ""}:${marker.latest_message_at ?? ""}`;
}

function chatSyncMarkerKeyFromMessages(remoteMessages: RemoteChatMessage[]) {
  const latestMessage = remoteMessages[remoteMessages.length - 1];

  return chatSyncMarkerKey({
    latest_message_at: latestMessage?.created_at ?? null,
    latest_message_id: latestMessage?.id ?? null,
  });
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
      && attachment.sizeBytes === other.sizeBytes
      && attachment.disappeared === other.disappeared
      && attachment.consumedAt === other.consumedAt;
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
      && message.deliveryStatus === other.deliveryStatus
      && message.expiresAt === other.expiresAt
      && message.linkedCardId === other.linkedCardId
      && areChatAttachmentsEqual(message.attachments, other.attachments);
  });
}

function mergePendingChatMessages(remoteMessages: ChatMessage[], fallback?: CoupleState | null) {
  const remoteMessageIds = new Set(remoteMessages.map((message) => message.id));
  const pendingMessages = (fallback?.chat?.messages ?? [])
    .filter((message) => message.deliveryStatus && !remoteMessageIds.has(message.id));

  return [...remoteMessages, ...pendingMessages].sort(
    (left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );
}

function withChatMessageDeliveryStatus(
  current: CoupleState | null,
  messageId: string,
  deliveryStatus: ChatMessage["deliveryStatus"],
) {
  if (!current?.chat?.messages.some((message) => message.id === messageId)) {
    return current;
  }

  return {
    ...current,
    chat: {
      ...current.chat,
      messages: current.chat.messages.map((message) =>
        message.id === messageId ? { ...message, deliveryStatus } : message,
      ),
    },
  };
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

  const chatMessages = Array.isArray(remote.chat_messages)
    ? mergePendingChatMessages(await chatMessagesFromRemote(remote.chat_messages), fallback)
    : fallback?.chat?.messages ?? [];

  return {
    id: remote.couple.id,
    inviteCode: remote.couple.invite_code,
    createdAt: remote.couple.created_at,
    hiddenMatchCount: remote.hidden_match_count ?? fallback?.hiddenMatchCount ?? 0,
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
      ...(storeBypassEnabled ? (fallback?.unlockedCategories ?? []).filter((category) => PAID_PACK_CATEGORIES.includes(category)) : []),
      ...(remote.category_unlocks ?? []).filter(isKnownCategory),
    ])),
    unlockedFeatures: Array.from(new Set([
      ...(storeBypassEnabled ? (fallback?.unlockedFeatures ?? []).filter(isKnownFeature) : []),
      ...(remote.feature_unlocks ?? []).filter(isKnownFeature),
    ])),
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

function revealedMatchIdsFromRemote(remote: RemoteCoupleState) {
  const ids = new Set<string>();
  (remote.matches ?? []).forEach((match) => ids.add(match.card_id));
  (remote.match_reveals ?? []).forEach((reveal) => {
    if (reveal.revealed_at) {
      ids.add(reveal.card_id);
    }
  });
  return Array.from(ids);
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

function galleryVoteAnswerLabel(level?: VoteLevel) {
  if (level === 0) {
    return "Non";
  }

  if (level === 1) {
    return "Pourquoi pas";
  }

  if (typeof level === "number" && level >= FLAME_THRESHOLD) {
    return "Chaud";
  }

  return "";
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
    accent: "#FFF4E8",
    bodyText: "#5A3E24",
    chipBg: "#FFF4E8",
    colors: ["#FFF4E8", "#F1E2CF", "#E6D1B6"],
    glow: "rgba(255,210,63,0.28)",
    patternEmoji: "🍦",
    sticker: "🍦",
    tagBg: "rgba(255,249,240,0.72)",
    tagText: "#7E5932",
    titleText: "#2B1735",
  },
  Sensuel: {
    accent: "#FB7AAA",
    bodyText: "#4D193A",
    chipBg: "#FFD6E6",
    colors: ["#FF86B7", "#F85B98", "#F5286E"],
    glow: "rgba(245,40,110,0.34)",
    patternEmoji: "🫧",
    sticker: "🧴",
    tagBg: "rgba(255,249,240,0.62)",
    tagText: "#F5286E",
    titleText: "#FFF9F0",
  },
  Séduction: {
    accent: candy.red,
    bodyText: "#FFE7EF",
    chipBg: "#FCE0EA",
    colors: ["#F5286E", "#D9165B", "#B90D4D"],
    glow: "rgba(245,40,110,0.38)",
    patternEmoji: "💋",
    sticker: "😏",
    tagBg: "rgba(255,249,240,0.18)",
    tagText: candy.white,
    titleText: candy.white,
  },
  Hot: {
    accent: candy.yellow,
    bodyText: candy.ink,
    chipBg: candy.yellowSoft,
    colors: ["#FFD84D", "#FFD23F", "#F9B928"],
    glow: "rgba(255,210,63,0.42)",
    patternEmoji: "🌶️",
    sticker: "🌶️",
    tagBg: "rgba(38,18,46,0.88)",
    tagText: candy.yellow,
    titleText: candy.ink,
  },
  "Jeux & Défis": {
    accent: "#8E4BA0",
    bodyText: "#FFEAF4",
    chipBg: "#4A2857",
    colors: ["#32183D", "#42224F", "#24102C"],
    glow: "rgba(38,18,46,0.46)",
    patternEmoji: "🎲",
    sticker: "🎲",
    tagBg: "rgba(255,210,63,0.95)",
    tagText: candy.ink,
    titleText: candy.white,
  },
  Scénarios: {
    accent: "#4E2A5E",
    bodyText: "#F7E8D7",
    chipBg: "#4A2857",
    colors: ["#26122E", "#4A1F50", "#F5286E"],
    glow: "rgba(38,18,46,0.42)",
    patternEmoji: "🎭",
    sticker: "🎭",
    tagBg: "rgba(255,249,240,0.16)",
    tagText: candy.white,
    titleText: candy.white,
  },
  "Kinky Soft": {
    accent: "#D9165B",
    bodyText: "#F7E8D7",
    chipBg: "#FCE0EA",
    colors: ["#F5286E", "#C90E52", "#9C0A43"],
    glow: "rgba(245,40,110,0.34)",
    patternEmoji: "👑",
    sticker: "👑",
    tagBg: "rgba(255,249,240,0.18)",
    tagText: candy.white,
    titleText: candy.white,
  },
  BDSM: {
    accent: "#6B3B78",
    bodyText: "rgba(255,249,240,0.84)",
    chipBg: "#4A2857",
    colors: ["#32183D", "#25112D", "#150A1A"],
    glow: "rgba(21,10,26,0.46)",
    patternEmoji: "🎭",
    sticker: stickers.lock,
    tagBg: "rgba(255,210,63,0.9)",
    tagText: candy.ink,
    titleText: candy.white,
  },
  "Plaisirs explicites": {
    accent: "#F5286E",
    bodyText: "#FFE7EF",
    chipBg: "#FCE0EA",
    colors: ["#F94D86", "#D9165B", "#8E0A3C"],
    glow: "rgba(245,40,110,0.34)",
    patternEmoji: "💦",
    sticker: "💦",
    tagBg: "rgba(255,249,240,0.18)",
    tagText: candy.white,
    titleText: candy.white,
  },
  Tabous: {
    accent: candy.black,
    bodyText: candy.white,
    chipBg: "#4A2857",
    colors: ["#26122E", "#4A1F50", "#120815"],
    glow: "rgba(18,8,21,0.46)",
    patternEmoji: "🗝️",
    sticker: "🗝️",
    tagBg: "rgba(255,249,240,0.18)",
    tagText: candy.white,
    titleText: candy.white,
  },
  Perso: {
    accent: candy.red,
    bodyText: candy.text,
    chipBg: "#F7E8D7",
    colors: ["#FFF4E8", "#F7E8D7", "#EBD8C0"],
    glow: "rgba(38,18,46,0.18)",
    patternEmoji: "🪄",
    sticker: stickers.wand,
    tagBg: "rgba(245,40,110,0.12)",
    tagText: candy.red,
    titleText: candy.ink,
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

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    BricolageGrotesque_400Regular,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) {
    return <AppSkeletonLoadingScreen />;
  }

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
  const [remoteAccountCheckedUserId, setRemoteAccountCheckedUserId] = useState<string | null>(null);
  const [remoteAccountLookupError, setRemoteAccountLookupError] = useState("");
  const [remoteAccountLookupRetry, setRemoteAccountLookupRetry] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [couple, setCouple] = useState<CoupleState | null>(null);
  const [authError, setAuthError] = useState("");
  const [chatContextCardId, setChatContextCardId] = useState<string | undefined>(undefined);
  const [introSeen, setIntroSeen] = useState(false);
  const [welcomeTutorialInitialPage, setWelcomeTutorialInitialPage] = useState(0);
  const [invitePromptVisible, setInvitePromptVisible] = useState(false);
  const [joinPromptVisible, setJoinPromptVisible] = useState(false);
  const [joinReturnToInvite, setJoinReturnToInvite] = useState(false);
  const [tutorialReplayVisible, setTutorialReplayVisible] = useState(false);
  const [debugPreviewScreen, setDebugPreviewScreen] = useState<DebugPreviewScreen | null>(null);
  const [leaveConfirmVisible, setLeaveConfirmVisible] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<PurchaseSuccess | null>(null);
  const [enviesFocusCategory, setEnviesFocusCategory] = useState<DesireCategory | null>(null);
  const [enviesFocusCardId, setEnviesFocusCardId] = useState<string | null>(null);
  const [enviesGameModeRequest, setEnviesGameModeRequest] = useState(0);
  const [revealedMatchIds, setRevealedMatchIds] = useState<string[]>([]);
  const [secretToastVisible, setSecretToastVisible] = useState(false);
  const [secretToastNonce, setSecretToastNonce] = useState(0);
  const [responseLimitPromptVisible, setResponseLimitPromptVisible] = useState(false);
  const [fakeAd, setFakeAd] = useState<FakeAdRequest | null>(null);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [appForeground, setAppForeground] = useState(() => AppState.currentState === "active");
  const secretToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fakeAdResolver = useRef<(() => void) | null>(null);
  const fakeAdLastShownAt = useRef(0);
  const fakeAdScheduleTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const fakeAdStats = useRef({ matchesSinceAd: 0, votesSinceAd: 0 });
  const voteWriteKeys = useRef(new Set<string>());
  const coupleRef = useRef<CoupleState | null>(null);
  const chatRefreshRef = useRef<ChatRefreshState>({
    coupleId: null,
    inFlight: null,
    lastStartedAt: 0,
  });
  const chatSyncMarkerRef = useRef<{ coupleId: string; key: string } | null>(null);
  const remoteRefreshRef = useRef<RemoteRefreshState>({
    coupleKey: null,
    inFlight: null,
    lastCompletedAt: 0,
    lastStartedAt: 0,
  });
  const [providerLoading, setProviderLoading] = useState<AuthProvider | null>(null);
  const [syncError, setSyncError] = useState("");
  const [tab, setTab] = useState<TabKey>("home");
  const remoteAccountReady = Boolean(
    session
    && hasSupabaseConfig
    && remoteAccountCheckedUserId === session.user.id
    && !remoteHydrating
    && !remoteAccountLookupError,
  );

  const canWriteRemoteCouple = useCallback(
    (targetCouple?: CoupleState | null): targetCouple is CoupleState =>
      Boolean(remoteAccountReady && targetCouple && isRemoteCoupleId(targetCouple.id)),
    [remoteAccountReady],
  );

  const updateIntroSeen = useCallback((seen: boolean) => {
    setIntroSeen(seen);
    void saveIntroSeen(seen);
  }, []);

  const applyRemoteCoupleState = useCallback(
    async (remote: RemoteCoupleState, isCancelled?: () => boolean) => {
      const nextCouple = await coupleFromRemoteState(remote, coupleRef.current);

      if (isCancelled?.()) {
        return false;
      }

      setCouple(purgeExpiredChat(nextCouple));
      setRevealedMatchIds(revealedMatchIdsFromRemote(remote));
      setSyncError("");
      return true;
    },
    [],
  );

  useEffect(() => {
    coupleRef.current = couple;
  }, [couple]);

  useEffect(() => {
    function handleAppStateChange(nextState: AppStateStatus) {
      setAppForeground(nextState === "active");
    }

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

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
    clearVisibleOfflineQueue()
      .then(loadOfflineQueueCount)
      .then(setOfflineQueueCount)
      .catch(() => undefined);
  }, []);

  const refreshRemoteCoupleState = useCallback(
    async (preferredCoupleId?: string | null, options: RemoteRefreshOptions = {}) => {
      if (!session || !hasSupabaseConfig) {
        return false;
      }

      if (preferredCoupleId && !isRemoteCoupleId(preferredCoupleId)) {
        return false;
      }

      const coupleId = preferredCoupleId ?? null;
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

          return applyRemoteCoupleState(remote);
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
    [applyRemoteCoupleState, session],
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
          const remoteChatMessages = await chatMessagesFromRemote(remoteMessages);
          chatSyncMarkerRef.current = {
            coupleId,
            key: chatSyncMarkerKeyFromMessages(remoteMessages),
          };

          setCouple((current) => {
            if (!current || current.id !== coupleId) {
              return current;
            }

            const cleanCouple = purgeExpiredChat(current);
            const currentMessages = cleanCouple.chat?.messages ?? [];
            const messages = mergePendingChatMessages(remoteChatMessages, cleanCouple);

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

  const refreshRemoteChatMessagesIfChanged = useCallback(
    async (preferredCoupleId?: string | null) => {
      if (!session || !hasSupabaseConfig || !preferredCoupleId || !isRemoteCoupleId(preferredCoupleId)) {
        return false;
      }

      try {
        const marker = await fetchRemoteChatSyncMarker(preferredCoupleId);
        const nextKey = chatSyncMarkerKey(marker);
        const currentMarker = chatSyncMarkerRef.current;

        if (currentMarker?.coupleId === preferredCoupleId && currentMarker.key === nextKey) {
          return false;
        }

        return refreshRemoteChatMessages(preferredCoupleId, { force: true });
      } catch (error) {
        console.warn("Silent chat marker refresh failed", error);
        return false;
      }
    },
    [refreshRemoteChatMessages, session],
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

      if (!remoteAccountReady || (preferredCoupleId && !isRemoteCoupleId(preferredCoupleId))) {
        return;
      }

      const result = await flushRemoteQueue();
      setOfflineQueueCount(result.pending);

      if (result.sent > result.sentChatMessages + result.sentAttachmentConsumptions) {
        await refreshRemoteCoupleState(preferredCoupleId);
      }

      if (result.sentChatMessages > 0 || result.sentAttachmentConsumptions > 0) {
        await refreshRemoteChatMessages(preferredCoupleId, { force: true });
      }

      if (result.visiblePending > 0) {
        setSyncError(`${result.visiblePending} action${result.visiblePending > 1 ? "s" : ""} en attente de reconnexion.`);
      }
    },
    [refreshRemoteChatMessages, refreshRemoteCoupleState, remoteAccountReady, session],
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
      setCouple(nextSession || !localModeEnabled ? null : storedCouple ? purgeExpiredChat(storedCouple) : null);
      setGuestMode(false);
      setIntroSeen(storedIntroSeen);

      if (storedGuestMode) {
        void saveGuestMode(false);
      }

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
      const nextUserId = nextSession?.user.id ?? null;
      setRemoteAccountCheckedUserId((current) => (current === nextUserId ? current : null));
      setRemoteAccountLookupError("");
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
      setRemoteAccountCheckedUserId(null);
      setRemoteAccountLookupError("");
      return;
    }

    let cancelled = false;
    const userId = session.user.id;

    async function hydrateRemote() {
      setRemoteHydrating(true);
      setRemoteAccountLookupError("");

      try {
        const currentCoupleId = coupleRef.current?.id;
        const remote = await fetchMyCoupleState(currentCoupleId && isRemoteCoupleId(currentCoupleId) ? currentCoupleId : null);

        if (cancelled) {
          return;
        }

        if (remote) {
          const applied = await applyRemoteCoupleState(remote, () => cancelled);

          if (!applied) {
            return;
          }
        } else {
          setCouple(null);
          setRevealedMatchIds([]);
          setSyncError("");
        }

        setRemoteAccountCheckedUserId(userId);
      } catch (error) {
        if (!cancelled) {
          const message = errorMessage(error);
          setRemoteAccountCheckedUserId(null);
          setRemoteAccountLookupError(`Impossible de retrouver ton espace Google: ${message}`);
        }
      } finally {
        if (!cancelled) {
          setRemoteHydrating(false);
        }
      }
    }

    void hydrateRemote();

    return () => {
      cancelled = true;
    };
  }, [applyRemoteCoupleState, remoteAccountLookupRetry, session?.user.id]);

  useEffect(() => {
    if (
      !session
      || !hasSupabaseConfig
      || !couple
      || !remoteAccountReady
      || isRemoteCoupleId(couple.id)
      || isDebugCouple(couple)
    ) {
      return undefined;
    }

    setCouple(null);
    setSyncError("Ton espace local n'est pas présent en base. Recrée ton profil pour repartir d'un état serveur propre.");
    return undefined;
  }, [couple, remoteAccountReady, session?.user.id]);

  useEffect(() => {
    if (!session || !couple || !hasSupabaseConfig || !isRemoteCoupleId(couple.id)) {
      return undefined;
    }

    let chatRefreshTimer: ReturnType<typeof setTimeout> | null = null;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const profileUserIds = coupleRemoteProfileIds(couple);
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
    }, profileUserIds);

    return () => {
      if (chatRefreshTimer) {
        clearTimeout(chatRefreshTimer);
      }
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      unsubscribe();
    };
  }, [
    couple?.id,
    couple?.profiles.me.remoteUserId,
    couple?.profiles.partner.remoteUserId,
    refreshRemoteChatMessages,
    refreshRemoteCoupleState,
    session?.user.id,
  ]);

  useEffect(() => {
    if (
      !appForeground
      || tab !== "chat"
      || !session
      || !couple
      || !hasSupabaseConfig
      || !isRemoteCoupleId(couple.id)
    ) {
      return undefined;
    }

    const coupleId = couple.id;
    let cancelled = false;
    let polling = false;

    async function pollChatMarker() {
      if (cancelled || polling) {
        return;
      }

      polling = true;
      try {
        await flushQueuedRemoteWork(coupleId);
        await refreshRemoteChatMessagesIfChanged(coupleId);
      } finally {
        polling = false;
      }
    }

    void pollChatMarker();

    const interval = setInterval(() => {
      void pollChatMarker();
    }, CHAT_ACTIVE_SYNC_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [
    appForeground,
    couple?.id,
    flushQueuedRemoteWork,
    refreshRemoteChatMessagesIfChanged,
    session?.user.id,
    tab,
  ]);

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

  const handleProvider = useCallback(async (provider: AuthProvider) => {
    try {
      setAuthError("");
      setProviderLoading(provider);
      const nextSession = await signInWithProvider(provider);
      if (nextSession) {
        setRemoteAccountCheckedUserId((current) => (current === nextSession.user.id ? current : null));
        setRemoteAccountLookupError("");
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
      if (!session) {
        setAuthError("Connecte-toi pour créer ou rejoindre un couple.");
        throw new Error("Connecte-toi avec Google ou Apple pour créer ton espace.");
      }

      if (!hasSupabaseConfig) {
        setAuthError("La connexion serveur n'est pas configurée.");
        throw new Error("La connexion serveur doit être configurée pour créer ton profil.");
      }

      if (!remoteAccountReady) {
        throw new Error("On vérifie ton compte Google avant de créer un espace.");
      }

      try {
        const existingRemote = await fetchMyCoupleState(null);

        if (existingRemote) {
          await applyRemoteCoupleState(existingRemote);
          setRemoteAccountCheckedUserId(session.user.id);
          setRemoteAccountLookupError("");
          setInvitePromptVisible(false);
          setJoinPromptVisible(false);
          setLeaveConfirmVisible(false);
          setPurchaseSuccess(null);
          setTab("home");
          return;
        }

        setRemoteAccountCheckedUserId(session.user.id);
        setRemoteAccountLookupError("");
      } catch (error) {
        const message = errorMessage(error);
        setRemoteAccountCheckedUserId(null);
        setRemoteAccountLookupError(`Impossible de retrouver ton espace Google: ${message}`);
        return;
      }

      try {
        const remote =
          mode === "create" ? await createRemoteCouple(profile) : await joinRemoteCouple(profile, inviteCode.trim());
        const remoteState = await fetchMyCoupleState(remote.couple_id);

        if (!remoteState) {
          throw new Error("L'espace créé n'a pas pu être relu depuis la base.");
        }

        await applyRemoteCoupleState(remoteState);
        setRemoteAccountCheckedUserId(session.user.id);
        setRemoteAccountLookupError("");
        setSyncError("");
      } catch (error) {
        const message = errorMessage(error);
        setSyncError(`Création serveur impossible: ${message}`);
        throw new Error(message);
      }
      setInvitePromptVisible(mode === "create");
      setJoinPromptVisible(false);
      setLeaveConfirmVisible(false);
      setPurchaseSuccess(null);
      setTab("home");
    },
    [applyRemoteCoupleState, refreshRemoteCoupleState, remoteAccountReady, session],
  );

  const handleVote = useCallback(
    async (cardId: string, level: VoteLevel) => {
      if (!couple) {
        return false;
      }

      const activeId = couple.activePartnerId;
      const coupleId = couple.id;
      const partnerId = otherPartnerId(activeId);
      const previousActiveVote = couple.votes[activeId][cardId];
      const isVoteChange = previousActiveVote !== level;
      const writeKey = `${coupleId}:${cardId}`;
      const canWriteRemote = canWriteRemoteCouple(couple);

      if (!isVoteChange) {
        return false;
      }

      if (!canWriteRemote && !localModeEnabled) {
        setSyncError("Attends que ton espace soit synchronisé avant de répondre.");
        return false;
      }

      if (!canAnswerNewCardToday(couple, activeId)) {
        setResponseLimitPromptVisible(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        return false;
      }

      if (canWriteRemote && voteWriteKeys.current.has(writeKey)) {
        return false;
      }

      const partnerVote = couple.votes[partnerId][cardId];
      const wasAlreadyMatch = isPositiveMatchVote(previousActiveVote) && isPositiveMatchVote(partnerVote);
      const becomesMatch = isPositiveMatchVote(level) && isPositiveMatchVote(partnerVote);
      const newMatchCreated = becomesMatch && !wasAlreadyMatch;
      const responseCountBeforeVote = activeResponseCount(couple);

      if (!canWriteRemote) {
        setCouple((current) => (current?.id === coupleId ? withLocalDesireVote(current, cardId, level) : current));
        setSyncError("");
      } else {
        voteWriteKeys.current.add(writeKey);

        try {
          await saveRemoteVote(coupleId, cardId, level);
          await sendOrQueueRemoteNotificationEvent({ cardId, coupleId, type: "new_match" });
          await loadOfflineQueueCount().then(setOfflineQueueCount).catch(() => undefined);
          await refreshRemoteCoupleState(coupleId, { force: true });
          setSyncError("");
        } catch (error) {
          const message = errorMessage(error, "");
          if (message.includes("daily_limit_reached") && localModeEnabled && hasUnlimitedResponses(couple)) {
            setCouple((current) => (current?.id === coupleId ? withLocalDesireVote(current, cardId, level) : current));
            setResponseLimitPromptVisible(false);
            setSyncError("");
          } else if (message.includes("daily_limit_reached")) {
            setResponseLimitPromptVisible(true);
            setSyncError("Limite quotidienne atteinte côté serveur.");
            void refreshRemoteCoupleState(coupleId, { force: true });
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return false;
          } else {
            setSyncError("Réponse non enregistrée. Vérifie ta connexion et réessaie.");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return false;
          }
        } finally {
          voteWriteKeys.current.delete(writeKey);
        }
      }

      setSecretToastVisible(true);
      setSecretToastNonce((current) => current + 1);
      if (secretToastTimer.current) {
        clearTimeout(secretToastTimer.current);
      }
      secretToastTimer.current = setTimeout(() => {
        setSecretToastVisible(false);
      }, 1150);

      await Haptics.selectionAsync();

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

      return true;
    },
    [canWriteRemoteCouple, couple, refreshRemoteCoupleState, scheduleGameBreakAd],
  );

  const handleActorChange = useCallback((nextId: PartnerId) => {
    setCouple((current) => {
      if (!current) {
        return current;
      }

      if (nextId !== "partner" || hasLinkedPartner(current)) {
        return { ...current, activePartnerId: nextId };
      }

      return {
        ...current,
        activePartnerId: nextId,
        profiles: {
          ...current.profiles,
          partner: {
            ...current.profiles.partner,
            displayName: "Sam",
            color: "mint",
            statusEmoji: "👀",
            statusUpdatedAt: new Date().toISOString(),
            vibe: "Profil de test pour QA.",
          },
        },
      };
    });
  }, []);

  const handleMoodChange = useCallback(
    async (level: CoupleMoodLevel) => {
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

      if (!canWriteRemoteCouple(couple)) {
        setSyncError("");
        await Haptics.selectionAsync();
        return;
      }

      try {
        await saveRemoteMood(couple.id, level);
        await sendOrQueueRemoteNotificationEvent({ coupleId: couple.id, type: "mood_aligned" });
        await loadOfflineQueueCount().then(setOfflineQueueCount).catch(() => undefined);
        await refreshRemoteCoupleState(couple.id, { force: true });
        setSyncError("");
        await (didReveal
          ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
          : Haptics.selectionAsync());
      } catch {
        setCouple(couple);
        setSyncError("Le mood n'a pas pu être enregistré. Vérifie ta connexion et réessaie.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [canWriteRemoteCouple, couple, refreshRemoteCoupleState],
  );

  const ensurePushReadyForPreference = useCallback(async () => {
    if (!session || !hasSupabaseConfig) {
      setSyncError("Connecte-toi pour activer les notifications sur ce téléphone.");
      return false;
    }

    let result: Awaited<ReturnType<typeof requestPushPermissionAndRegister>>;

    try {
      result = await requestPushPermissionAndRegister();
    } catch (error) {
      setSyncError(`Notifications: ${errorMessage(error, "activation impossible")}`);
      return false;
    }

    if (result.status === "registered") {
      setSyncError("");
      return true;
    }

    setSyncError(result.reason ?? "Les notifications n'ont pas pu être activées.");
    return false;
  }, [session]);

  const handleMoodNotificationPreference = useCallback(async (enabled: boolean) => {
    if (enabled && !(await ensurePushReadyForPreference())) {
      return;
    }

    if (!couple || !canWriteRemoteCouple(couple)) {
      setSyncError("Attends que ton espace soit synchronisé avant de changer les notifications.");
      return;
    }

    const nextCouple = setMoodNotificationPreference(couple, couple.activePartnerId, enabled);

    try {
      await saveRemoteNotificationPreferences(nextCouple.id, notificationSettings(nextCouple), nextCouple.activePartnerId);
      await refreshRemoteCoupleState(nextCouple.id, { force: true });
      setSyncError("");
      await Haptics.selectionAsync();
    } catch {
      setSyncError("Les préférences de notification n'ont pas pu être enregistrées.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [canWriteRemoteCouple, couple, ensurePushReadyForPreference, refreshRemoteCoupleState]);

  const handleNotificationPreference = useCallback(async (key: NotificationToggleKey, enabled: boolean) => {
    if (enabled && !(await ensurePushReadyForPreference())) {
      return;
    }

    if (!couple || !canWriteRemoteCouple(couple)) {
      setSyncError("Attends que ton espace soit synchronisé avant de changer les notifications.");
      return;
    }

    const nextCouple = setNotificationPreference(couple, couple.activePartnerId, key, enabled);

    try {
      await saveRemoteNotificationPreferences(nextCouple.id, notificationSettings(nextCouple), nextCouple.activePartnerId);
      await refreshRemoteCoupleState(nextCouple.id, { force: true });
      setSyncError("");
      await Haptics.selectionAsync();
    } catch {
      setSyncError("Les préférences de notification n'ont pas pu être enregistrées.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [canWriteRemoteCouple, couple, ensurePushReadyForPreference, refreshRemoteCoupleState]);

  const handleStatusEmojiChange = useCallback(
    async (nextEmoji: string) => {
      if (!couple) {
        return;
      }

      const remoteCouple = isRemoteCoupleId(couple.id);
      if (remoteCouple && !canWriteRemoteCouple(couple)) {
        setSyncError("Attends que ton espace soit synchronisé avant de changer ton statut.");
        return;
      }

      const statusEmoji = normalizeStatusEmoji(nextEmoji);
      const previousCouple = couple;
      const nextCouple = withUpdatedProfileStatus(couple, couple.activePartnerId, statusEmoji);
      setCouple(nextCouple);

      if (!remoteCouple) {
        setSyncError("");
        await Haptics.selectionAsync();
        return;
      }

      try {
        await saveRemoteProfileStatus(couple.id, statusEmoji);
        await refreshRemoteCoupleState(couple.id, { force: true });
        setSyncError("");
        await Haptics.selectionAsync();
      } catch {
        setCouple(previousCouple);
        setSyncError("Le statut n'a pas pu être enregistré. Vérifie ta connexion et réessaie.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [canWriteRemoteCouple, couple, refreshRemoteCoupleState],
  );

  const handleProfileNameChange = useCallback(
    async (nextName: string) => {
      if (!couple) {
        return;
      }

      const activeProfile = couple.profiles[couple.activePartnerId];
      const displayName = normalizeProfileDisplayName(nextName, activeProfile.displayName);

      if (displayName === activeProfile.displayName) {
        return;
      }

      const remoteCouple = isRemoteCoupleId(couple.id);
      if (remoteCouple && !canWriteRemoteCouple(couple)) {
        setSyncError("Attends que ton espace soit synchronisé avant de changer ton profil.");
        return;
      }

      const previousCouple = couple;
      const nextCouple = withUpdatedProfileName(couple, couple.activePartnerId, displayName);
      setCouple(nextCouple);

      if (!remoteCouple) {
        setSyncError("");
        await Haptics.selectionAsync();
        return;
      }

      try {
        await saveRemoteProfileName(displayName);
        await refreshRemoteCoupleState(couple.id, { force: true });
        setSyncError("");
        await Haptics.selectionAsync();
      } catch {
        setCouple(previousCouple);
        setSyncError("Le nom de profil n'a pas pu être enregistré. Vérifie ta connexion et réessaie.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [canWriteRemoteCouple, couple, refreshRemoteCoupleState],
  );

  const handleAddCustomDesire = useCallback(
    async ({ blurb, category, emoji, title }: CustomDesireDraft) => {
      if (!couple) {
        return;
      }

      if (!canWriteRemoteCouple(couple)) {
        setSyncError("Attends que ton espace soit synchronisé avant d'ajouter une carte perso.");
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

      try {
        await saveRemoteCustomDesire({
          blurb: customDesire.blurb,
          cardId: customDesire.id,
          category: customDesire.category,
          coupleId: couple.id,
          emoji: customDesire.emoji ?? stickers.heart,
          title: customDesire.title,
        });
        await refreshRemoteCoupleState(couple.id, { force: true });
        setSyncError("");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        setSyncError("La carte perso n'a pas pu être enregistrée. Vérifie ta connexion et réessaie.");
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [canWriteRemoteCouple, couple, refreshRemoteCoupleState],
  );

  const runPurchaseOrLocalUnlock = useCallback(
    async ({
      config,
      success,
    }: {
      config: ReturnType<typeof categoryPurchaseConfig> | ReturnType<typeof featurePurchaseConfig>;
      success: PurchaseSuccess;
    }) => {
      if (!couple) {
        return;
      }

      if (storeBypassEnabled || Platform.OS === "web") {
        setCouple(withPurchaseTargetUnlocked(couple, config));
        if (config.target.kind === "feature" && config.target.feature === NO_ADS_FEATURE) {
          fakeAdStats.current = { matchesSinceAd: 0, votesSinceAd: 0 };
          completeFakeAd();
        }
        setResponseLimitPromptVisible(false);
        setSyncError(storeBypassEnabled ? "Mode test: achat débloqué sans store. Google/Supabase restent actifs." : "");
        setPurchaseSuccess(success);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }

      if (session) {
        if (!canWriteRemoteCouple(couple)) {
          setSyncError("Achat impossible tant que l'espace n'est pas synchronisé avec Supabase.");
          return;
        }

        try {
          await purchaseWithRevenueCat({
            appUserId: session.user.id,
            config,
            coupleId: couple.id,
          });
          await refreshRemoteCoupleState(couple.id, { force: true });
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

      setSyncError("Connecte-toi avec Google ou Apple pour valider l'achat côté serveur.");
    },
    [canWriteRemoteCouple, completeFakeAd, couple, refreshRemoteCoupleState, session],
  );

  const handleUnlockCustomCards = useCallback(() => {
    if (!couple || hasCustomCardsUnlimited(couple)) {
      return;
    }

    void runPurchaseOrLocalUnlock({
      config: featurePurchaseConfig(CUSTOM_CARDS_UNLIMITED_FEATURE),
      success: { kind: "custom", category: "Perso" },
    });
  }, [couple, runPurchaseOrLocalUnlock]);

  const handleUnlockNoAds = useCallback(() => {
    if (!couple || hasNoAds(couple)) {
      return;
    }

    void runPurchaseOrLocalUnlock({
      config: featurePurchaseConfig(NO_ADS_FEATURE),
      success: { kind: "no_ads" },
    });
  }, [couple, runPurchaseOrLocalUnlock]);

  const handleUnlockUnlimitedResponses = useCallback(() => {
    if (!couple || hasUnlimitedResponses(couple)) {
      return;
    }

    void runPurchaseOrLocalUnlock({
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
        config: categoryPurchaseConfig(category as Exclude<DesireCategory, "Vanille" | "Perso">),
        success: { kind: "category", category },
      });
    },
    [couple, runPurchaseOrLocalUnlock],
  );

  const debugUnlockNotice = useCallback(
    (targetCouple: CoupleState) =>
      canWriteRemoteCouple(targetCouple)
        ? "Achat debug simulé localement. Le serveur et RevenueCat ne sont pas modifiés."
        : "Achat debug simulé.",
    [canWriteRemoteCouple],
  );

  const handleDebugUnlockCategory = useCallback(
    async (category: DesireCategory) => {
      if (!couple || !PAID_PACK_CATEGORIES.includes(category)) {
        return;
      }

      if (isCategoryUnlocked(couple, category)) {
        setSyncError(`Pack ${categoryLabel(category)} déjà actif.`);
        await Haptics.selectionAsync();
        return;
      }

      setCouple(withUnlockedCategories(couple, [category]));
      setResponseLimitPromptVisible(false);
      setSyncError(debugUnlockNotice(couple));
      setPurchaseSuccess({ kind: "category", category });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [couple, debugUnlockNotice],
  );

  const handleDebugUnlockFeature = useCallback(
    async (feature: UnlockedFeature) => {
      if (!couple || !PAID_FEATURES.includes(feature)) {
        return;
      }

      if (isFeatureUnlocked(couple, feature)) {
        setSyncError("Option déjà active.");
        await Haptics.selectionAsync();
        return;
      }

      setCouple(withUnlockedFeatures(couple, [feature]));
      if (feature === NO_ADS_FEATURE) {
        fakeAdStats.current = { matchesSinceAd: 0, votesSinceAd: 0 };
        completeFakeAd();
      }
      setResponseLimitPromptVisible(false);
      setSyncError(debugUnlockNotice(couple));
      setPurchaseSuccess(purchaseSuccessForFeature(feature));
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    [completeFakeAd, couple, debugUnlockNotice],
  );

  const handleDebugUnlockAllPurchases = useCallback(async () => {
    if (!couple) {
      return;
    }

    const nextCouple = withUnlockedFeatures(withUnlockedCategories(couple, PAID_PACK_CATEGORIES), PAID_FEATURES);
    const alreadyComplete =
      PAID_PACK_CATEGORIES.every((category) => isCategoryUnlocked(couple, category))
      && PAID_FEATURES.every((feature) => isFeatureUnlocked(couple, feature));

    setCouple(nextCouple);
    fakeAdStats.current = { matchesSinceAd: 0, votesSinceAd: 0 };
    completeFakeAd();
    setResponseLimitPromptVisible(false);
    setPurchaseSuccess(null);
    setSyncError(alreadyComplete ? "Tout est déjà actif." : debugUnlockNotice(couple));
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [completeFakeAd, couple, debugUnlockNotice]);

  const handleDiscoverPurchase = useCallback(() => {
    if (!purchaseSuccess) {
      return;
    }

    if (purchaseSuccess.kind === "category") {
      setEnviesFocusCategory(purchaseSuccess.category);
      setEnviesFocusCardId(null);
      setEnviesGameModeRequest((current) => current + 1);
      setPurchaseSuccess(null);
      setTab("envies");
      return;
    }

    if (purchaseSuccess.kind === "custom") {
      setEnviesFocusCategory(purchaseSuccess.category);
      setEnviesFocusCardId(null);
      setPurchaseSuccess(null);
      setTab("envies");
      return;
    }

    setPurchaseSuccess(null);
    setTab("home");
  }, [purchaseSuccess]);

  const handleOpenEnvieCard = useCallback((card: DesireCard) => {
    setEnviesFocusCategory(card.category);
    setEnviesFocusCardId(card.id);
    setTab("envies");
  }, []);

  const handleOpenEnviesGameMode = useCallback(() => {
    setEnviesFocusCategory(null);
    setEnviesFocusCardId(null);
    setEnviesGameModeRequest((current) => current + 1);
    setTab("envies");
  }, []);

  const handleEnviesGameModeRequestHandled = useCallback(() => {
    setEnviesGameModeRequest(0);
  }, []);

  const handleRestorePurchases = useCallback(async () => {
    if (storeBypassEnabled) {
      if (!couple) {
        return;
      }

      setCouple(withUnlockedFeatures(withUnlockedCategories(couple, PAID_PACK_CATEGORIES), PAID_FEATURES));
      fakeAdStats.current = { matchesSinceAd: 0, votesSinceAd: 0 };
      completeFakeAd();
      setResponseLimitPromptVisible(false);
      setPurchaseSuccess(null);
      setSyncError("Mode test: tous les achats sont actifs sans store.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    if (!session || !couple || !canWriteRemoteCouple(couple)) {
      setSyncError("Connecte-toi avec un espace Supabase synchronisé pour restaurer les achats.");
      return;
    }

    try {
      await restoreRevenueCatPurchases(session.user.id, couple.id);
      await refreshRemoteCoupleState(couple.id, { force: true });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSyncError("Achats restaurés.");
    } catch (error) {
      const message = errorMessage(error, "restauration impossible");
      setSyncError(`Restauration impossible: ${message}`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [canWriteRemoteCouple, completeFakeAd, couple, refreshRemoteCoupleState, session]);

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
      const currentCouple = coupleRef.current;

      if (nextTab === "envies") {
        setEnviesFocusCardId(null);
        setEnviesFocusCategory(null);
        setEnviesGameModeRequest(0);
      }

      setTab(nextTab);

      if (nextTab === "couple" && canWriteRemoteCouple(currentCouple)) {
        void refreshRemoteCoupleState(currentCouple.id);
      }

      if (nextTab === "chat") {
        void refreshRemoteChatMessages(currentCouple?.id, { force: true });
      }
    },
    [canWriteRemoteCouple, refreshRemoteChatMessages, refreshRemoteCoupleState],
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

      const messageId = Crypto.randomUUID();
      const optimisticMessage: ChatMessage = {
        id: messageId,
        authorId: couple.activePartnerId,
        attachments,
        body: trimmedBody,
        createdAt: new Date().toISOString(),
        deliveryStatus: "sending",
        expiresAt: pendingChatExpiresAt(),
        linkedCardId: chatContextCardId,
      };

      if (canWriteRemoteCouple(couple)) {
        setCouple((current) => (current?.id === couple.id ? withPendingChatMessage(current, optimisticMessage) : current));

        try {
          await sendRemoteChatMessage({
            attachments,
            body: trimmedBody,
            coupleId: couple.id,
            linkedCardId: chatContextCardId,
            messageId,
          });
          void sendOrQueueRemoteNotificationEvent({ coupleId: couple.id, messageId, type: "chat_message" })
            .then(() => loadOfflineQueueCount())
            .then(setOfflineQueueCount)
            .catch(() => undefined);
          await refreshRemoteChatMessages(couple.id, { force: true });
          setSyncError("");
          await Haptics.selectionAsync();
        } catch (error) {
          console.warn("Chat message failed", error);
          const queued = await enqueueRemoteChatMessage({
            attachments,
            body: trimmedBody,
            coupleId: couple.id,
            linkedCardId: chatContextCardId,
            messageId,
          })
            .then(() => true)
            .catch(() => false);

          setCouple((current) => withChatMessageDeliveryStatus(current, messageId, queued ? "queued" : "failed"));
          await loadOfflineQueueCount().then(setOfflineQueueCount).catch(() => undefined);

          if (!queued) {
            setSyncError("Message non envoyé. Vérifie ta connexion et réessaie.");
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          }
        }
        return;
      }

      setSyncError("Attends que ton espace soit synchronisé avant d'envoyer un message.");
    },
    [canWriteRemoteCouple, chatContextCardId, couple, refreshRemoteChatMessages],
  );

  const queueChatAttachmentConsumption = useCallback(
    async ({
      attachmentId,
      coupleId,
      delayMs = 0,
      messageId,
    }: {
      attachmentId: string;
      coupleId: string;
      delayMs?: number;
      messageId: string;
    }) => {
      await enqueueRemoteChatAttachmentConsumption({ attachmentId, coupleId, delayMs, messageId });
      await loadOfflineQueueCount().then(setOfflineQueueCount).catch(() => undefined);
      const flushDelayMs = Math.max(500, delayMs + 500);
      setTimeout(() => {
        flushQueuedRemoteWork(coupleId).catch(() => undefined);
      }, flushDelayMs);
    },
    [flushQueuedRemoteWork],
  );

  const handleQueueChatAttachmentConsumption = useCallback(
    async ({ attachmentId, delayMs, messageId }: { attachmentId: string; delayMs?: number; messageId: string }) => {
      const currentCouple = coupleRef.current;

      if (!canWriteRemoteCouple(currentCouple)) {
        return;
      }

      const targetAttachment = currentCouple.chat?.messages
        .find((message) => message.id === messageId)
        ?.attachments.find((attachment) => attachment.id === attachmentId);

      if (!targetAttachment || targetAttachment.disappeared) {
        return;
      }

      await queueChatAttachmentConsumption({
        attachmentId,
        coupleId: currentCouple.id,
        delayMs,
        messageId,
      }).catch(() => undefined);
    },
    [canWriteRemoteCouple, queueChatAttachmentConsumption],
  );

  const handleConsumeChatAttachment = useCallback(
    async ({ attachmentId, messageId }: { attachmentId: string; messageId: string }) => {
      const currentCouple = coupleRef.current;

      if (!currentCouple) {
        return;
      }

      const targetAttachment = currentCouple.chat?.messages
        .find((message) => message.id === messageId)
        ?.attachments.find((attachment) => attachment.id === attachmentId);

      if (targetAttachment?.disappeared) {
        return;
      }

      if (targetAttachment?.storagePath) {
        signedChatAttachmentUrlCache.delete(targetAttachment.storagePath);
      }

      const coupleId = currentCouple.id;

      if (!canWriteRemoteCouple(currentCouple)) {
        setSyncError("Attends que ton espace soit synchronisé avant de masquer cette photo.");
        return;
      }

      try {
        await consumeRemoteChatAttachment({ attachmentId, coupleId, messageId });
        await removeRemoteChatAttachmentConsumption({ attachmentId, coupleId, messageId }).catch(() => undefined);
        await refreshRemoteChatMessages(coupleId, { force: true });
      } catch (error) {
        console.warn("Chat attachment consumption failed", error);
        setSyncError("La photo n'a pas pu être masquée côté serveur. Réessaie avec une connexion stable.");
      }
    },
    [canWriteRemoteCouple, refreshRemoteChatMessages],
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
    await saveGuestMode(false);
    setGuestMode(false);
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
    setEnviesFocusCardId(null);
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

    setJoinReturnToInvite(returnToInvite === true);
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

      if (!hasSupabaseConfig) {
        throw new Error("La connexion serveur doit être configurée pour rejoindre un espace.");
      }

      const activeProfile = couple.profiles[couple.activePartnerId];
      const profile = profilePayload(activeProfile);
      const trimmedCode = inviteCode.trim();

      if (session && hasSupabaseConfig) {
        if (!remoteAccountReady) {
          throw new Error("On vérifie ton compte Google avant de rejoindre un couple.");
        }

        try {
          const remote = await joinRemoteCouple(profile, trimmedCode);
          const remoteState = await fetchMyCoupleState(remote.couple_id);

          if (!remoteState) {
            throw new Error("L'espace rejoint n'a pas pu être relu depuis la base.");
          }

          await applyRemoteCoupleState(remoteState);
          setSyncError("");
        } catch (error) {
          const message = errorMessage(error);
          setSyncError(`Impossible de rejoindre ce couple: ${message}`);
          throw new Error(message);
        }
      } else {
        throw new Error("Connecte-toi avec Google ou Apple pour rejoindre cet espace.");
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
    [applyRemoteCoupleState, couple, remoteAccountReady, session],
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

    if (!session || !hasSupabaseConfig) {
      setSyncError("Connecte-toi avec Google ou Apple pour quitter ce couple.");
      setLeaveConfirmVisible(false);
      return;
    }

    if (session && hasSupabaseConfig) {
      if (!remoteAccountReady) {
        setSyncError("Attends la fin de la synchronisation avant de quitter ce couple.");
        return;
      }

      try {
        if (isRemoteCoupleId(couple.id)) {
          await leaveRemoteCouple(couple.id);
        }

        const remote = await createRemoteCouple(profilePayload(activeProfile));
        const remoteState = await fetchMyCoupleState(remote.couple_id);

        if (!remoteState) {
          throw new Error("Ton nouvel espace n'a pas pu être relu depuis la base.");
        }

        await applyRemoteCoupleState(remoteState);
        setSyncError("");
      } catch (error) {
        const message = errorMessage(error, "synchro impossible");
        setSyncError(`Impossible de quitter le couple: ${message}`);
        setLeaveConfirmVisible(false);
        return;
      }
    }

    setChatContextCardId(undefined);
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setRevealedMatchIds([]);
    setTab("home");

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [applyRemoteCoupleState, couple, remoteAccountReady, session]);

  const handleShowOnboarding = useCallback(async () => {
    await clearCoupleState();
    await clearDebugBackupState();
    setCouple(null);
    setRemoteAccountCheckedUserId(null);
    setRemoteAccountLookupError("");
    setRemoteAccountLookupRetry((current) => current + 1);
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

  const handleDeleteAccount = useCallback(async () => {
    if (!session || !hasSupabaseConfig) {
      setSyncError("Connecte-toi avec Google ou Apple pour supprimer ton compte serveur.");
      return;
    }

    try {
      setSyncError("");
      await deleteRemoteAccount();
      await signOut().catch(() => undefined);
      await clearCoupleState();
      await clearDebugBackupState();
      await saveGuestMode(false);
      setSession(null);
      setGuestMode(false);
      setCouple(null);
      setAuthError("");
      setProviderLoading(null);
      setRemoteHydrating(false);
      setRemoteAccountCheckedUserId(null);
      setRemoteAccountLookupError("");
      setRemoteAccountLookupRetry((current) => current + 1);
      updateIntroSeen(false);
      setInvitePromptVisible(false);
      setJoinPromptVisible(false);
      setTutorialReplayVisible(false);
      setLeaveConfirmVisible(false);
      setPurchaseSuccess(null);
      setChatContextCardId(undefined);
      setRevealedMatchIds([]);
      setTab("home");
    } catch (error) {
      const message = errorMessage(error, "suppression impossible");
      setSyncError(`Suppression du compte impossible: ${message}`);
    }
  }, [session, updateIntroSeen]);

  const handleReset = useCallback(async () => {
    await signOut();
    await clearCoupleState();
    await clearDebugBackupState();
    await saveGuestMode(false);
    setSession(null);
    setGuestMode(false);
    setCouple(null);
    setAuthError("");
    setProviderLoading(null);
    setRemoteHydrating(false);
    setRemoteAccountCheckedUserId(null);
    setRemoteAccountLookupError("");
    setRemoteAccountLookupRetry((current) => current + 1);
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
    setRemoteAccountCheckedUserId(null);
    setRemoteAccountLookupError("");
    setInvitePromptVisible(false);
    setJoinPromptVisible(false);
    setTutorialReplayVisible(false);
    setLeaveConfirmVisible(false);
    setPurchaseSuccess(null);
    setChatContextCardId(undefined);
    setTab("home");
  }, []);

  const handleRetryRemoteAccountLookup = useCallback(() => {
    setRemoteAccountLookupError("");
    setRemoteAccountCheckedUserId(null);
    setRemoteAccountLookupRetry((current) => current + 1);
  }, []);

  const waitingForRemoteAccount =
    Boolean(session && hasSupabaseConfig && remoteAccountCheckedUserId !== session.user.id && !remoteAccountLookupError);

  if (booting || waitingForRemoteAccount || (remoteHydrating && !remoteAccountLookupError)) {
    return <SplashScreen />;
  }

  if (session && hasSupabaseConfig && remoteAccountLookupError) {
    return (
      <CandyFrame>
        <RemoteAccountLookupScreen
          error={remoteAccountLookupError}
          onLogout={handleLogout}
          onRetry={handleRetryRemoteAccountLookup}
        />
      </CandyFrame>
    );
  }

  if (debugPreviewScreen === "auth") {
    return (
      <CandyFrame hideDoodles>
        <DebugPreviewShell onClose={() => setDebugPreviewScreen(null)}>
          <AuthGate
            authError=""
            providerLoading={null}
            onProvider={() => undefined}
          />
        </DebugPreviewShell>
      </CandyFrame>
    );
  }

  if (debugPreviewScreen === "loading") {
    return (
      <CandyFrame>
        <DebugPreviewShell onClose={() => setDebugPreviewScreen(null)}>
          <LoadingScreenContent />
        </DebugPreviewShell>
      </CandyFrame>
    );
  }

  if (tutorialReplayVisible) {
    return (
      <CandyFrame hideDoodles>
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
    if (!introSeen) {
      return (
        <CandyFrame hideDoodles>
          <WelcomeTutorialScreen
            account={authAccountInfo(session)}
            guestMode={guestMode}
            initialPage={welcomeTutorialInitialPage}
            onStart={() => {
              setWelcomeTutorialInitialPage(0);
              updateIntroSeen(true);
            }}
          />
        </CandyFrame>
      );
    }

    if (!session && !guestMode) {
      return (
        <CandyFrame hideDoodles>
          <AuthGate
            authError={authError}
            providerLoading={providerLoading}
            onProvider={handleProvider}
          />
        </CandyFrame>
      );
    }

    return (
      <CandyFrame>
        <Entrance delay={30} style={styles.flex}>
          <OnboardingScreen
            onBack={() => {
              setWelcomeTutorialInitialPage(3);
              updateIntroSeen(false);
            }}
            onComplete={handleOnboardingComplete}
          />
        </Entrance>
      </CandyFrame>
    );
  }

  if (!session && !guestMode) {
    return (
      <CandyFrame hideDoodles>
        <AuthGate
          authError={authError}
          providerLoading={providerLoading}
          onProvider={handleProvider}
        />
      </CandyFrame>
    );
  }

  if (joinPromptVisible) {
    return (
      <CandyFrame hideDoodles>
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
      <CandyFrame hideDoodles>
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
        <PurchaseSuccessScreen
          partnerName={couple?.profiles[otherPartnerId(couple.activePartnerId)].displayName}
          purchase={purchaseSuccess}
          onDiscover={handleDiscoverPurchase}
        />
      </CandyFrame>
    );
  }

  return (
    <CandyFrame dark={tab === "chat"}>
      <MainShell
        allowActorSwitch={!session || guestMode}
        authError={authError}
        chatContextCardId={chatContextCardId}
        couple={couple}
        debugEnabled={localModeEnabled}
        enviesFocusCardId={enviesFocusCardId}
        enviesFocusCategory={enviesFocusCategory}
        enviesGameModeRequest={enviesGameModeRequest}
        providerLoading={providerLoading}
        revealedMatchIds={revealedMatchIds}
        session={session}
        syncError={syncError}
        tab={tab}
        onActorChange={handleActorChange}
        onAddCustomDesire={handleAddCustomDesire}
        onApplyDebugPreset={handleApplyDebugPreset}
        onBeforeRevealMatch={handleBeforeRevealMatch}
        onConsumeChatAttachment={handleConsumeChatAttachment}
        onQueueChatAttachmentConsumption={handleQueueChatAttachmentConsumption}
        onCopyInvite={handleCopyInvite}
        onDisableDebugProfiles={handleDisableDebugProfiles}
        onDebugFakeAd={handleDebugFakeAd}
        onDebugUnlockAllPurchases={handleDebugUnlockAllPurchases}
        onDebugUnlockCategory={handleDebugUnlockCategory}
        onDebugUnlockFeature={handleDebugUnlockFeature}
        onDeleteAccount={handleDeleteAccount}
        onLogout={handleLogout}
        onMoodChange={handleMoodChange}
        onMoodNotificationPreference={handleMoodNotificationPreference}
        onNotificationPreference={handleNotificationPreference}
        onEnviesGameModeRequestHandled={handleEnviesGameModeRequestHandled}
        onOpenEnvieCard={handleOpenEnvieCard}
        onOpenEnviesGameMode={handleOpenEnviesGameMode}
        onJoinPartner={handleShowJoinPrompt}
        onOpenChat={handleOpenChat}
        onProvider={handleProvider}
        onRevealMatch={async (cardId) => {
          if (!canWriteRemoteCouple(couple)) {
            setSyncError("Attends que ton espace soit synchronisé avant de révéler un match.");
            return;
          }

          try {
            if (cardId) {
              await markRemoteMatchRevealed(couple.id, cardId);
            } else {
              await markRemoteNextMatchRevealed(couple.id);
            }

            await refreshRemoteCoupleState(couple.id, { force: true });

            if (cardId) {
              setRevealedMatchIds((current) => (current.includes(cardId) ? current : [...current, cardId]));
            }

            setSyncError("");
          } catch {
            setSyncError("La révélation du match n'a pas pu être enregistrée.");
          }
        }}
        onRequestLeaveCouple={handleRequestLeaveCouple}
        onReplayTutorial={handleReplayTutorial}
        onRestorePurchases={handleRestorePurchases}
        onReset={handleReset}
        onSendChatMessage={handleSendChatMessage}
        onShowDebugPreview={setDebugPreviewScreen}
        onShowInvitePrompt={handleShowInvitePrompt}
        onShowOnboarding={handleShowOnboarding}
        onProfileNameChange={handleProfileNameChange}
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
        partnerName={couple?.profiles[otherPartnerId(couple.activePartnerId)].displayName}
        visible={responseLimitPromptVisible}
      />
      <SecretVoteToast nonce={secretToastNonce} visible={secretToastVisible} />
      <FakeInterstitialAd ad={fakeAd} onComplete={completeFakeAd} />
    </CandyFrame>
  );
}

function CandyFrame({ children, dark = false, hideDoodles = false }: { children: React.ReactNode; dark?: boolean; hideDoodles?: boolean }) {
  return (
    <LinearGradient colors={dark ? [candy.darkColor, candy.darkColor] : [candy.red, candy.red]} style={[styles.frame, dark && styles.frameDark]}>
      {!hideDoodles && !dark ? (
        <>
          <View style={styles.doodleOne} />
          <View style={styles.doodleTwo} />
        </>
      ) : null}
      <SafeAreaView style={[styles.safeArea, dark && styles.safeAreaDark]}>{children}</SafeAreaView>
      <StatusBar style="light" />
    </LinearGradient>
  );
}

function ServerNoticeToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) {
      Animated.timing(progress, {
        duration: 120,
        easing: Easing.out(Easing.cubic),
        toValue: 0,
        useNativeDriver: useNativeAnimations,
      }).start();
      return undefined;
    }

    progress.setValue(0);
    Animated.timing(progress, {
      duration: 220,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: useNativeAnimations,
    }).start();

    const hideTimer = setTimeout(onDismiss, 6200);

    return () => clearTimeout(hideTimer);
  }, [message, onDismiss, progress]);

  if (!message) {
    return null;
  }

  return (
    <View pointerEvents="box-none" style={styles.serverNoticeHost}>
      <Animated.View
        style={[
          styles.serverNoticeCard,
          {
            opacity: progress,
            transform: [
              { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] }) },
              { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
            ],
          },
        ]}
      >
        <View style={styles.serverNoticeIcon}>
          <Send size={15} color="#6D7CFF" />
        </View>
        <Text style={styles.serverNoticeText}>{message}</Text>
      </Animated.View>
    </View>
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
      <LinearGradient colors={[candy.cream, candy.roseSoft]} style={styles.fakeAdScreen}>
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
      <LoadingScreenContent />
    </CandyFrame>
  );
}

function LoadingScreenContent() {
  return (
    <AppSkeletonLoadingContent />
  );
}

const loadingSkeletonLayouts = ["home", "envies", "store"] as const;
const loadingSkeletonRevealCount = 14;
type LoadingSkeletonLayout = (typeof loadingSkeletonLayouts)[number];

function AppSkeletonLoadingScreen() {
  return (
    <View style={styles.fontLoadingScreen}>
      <AppSkeletonLoadingContent />
      <StatusBar style="light" />
    </View>
  );
}

function AppSkeletonLoadingContent() {
  const spin = useRef(new Animated.Value(0)).current;
  const revealValuesRef = useRef<Animated.Value[]>([]);
  const [layoutIndex, setLayoutIndex] = useState(0);

  if (revealValuesRef.current.length === 0) {
    revealValuesRef.current = Array.from({ length: loadingSkeletonRevealCount }, () => new Animated.Value(0));
  }

  const revealValues = revealValuesRef.current;
  const layout = loadingSkeletonLayouts[layoutIndex] ?? "home";
  const spinRotation = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        duration: 760,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: useNativeAnimations,
      }),
    );

    animation.start();
    return () => animation.stop();
  }, [spin]);

  useEffect(() => {
    let mounted = true;
    let restartTimer: ReturnType<typeof setTimeout> | undefined;
    let activeAnimation: Animated.CompositeAnimation | undefined;

    const reveal = () => {
      revealValues.forEach((value) => value.setValue(0));
      activeAnimation = Animated.stagger(
        78,
        revealValues.map((value) => Animated.timing(value, {
          duration: 330,
          easing: Easing.out(Easing.cubic),
          toValue: 1,
          useNativeDriver: useNativeAnimations,
        })),
      );

      activeAnimation.start(({ finished }) => {
        if (!mounted || !finished) {
          return;
        }

        restartTimer = setTimeout(() => {
          activeAnimation = Animated.stagger(
            18,
            [...revealValues].reverse().map((value) => Animated.timing(value, {
              duration: 160,
              easing: Easing.in(Easing.quad),
              toValue: 0,
              useNativeDriver: useNativeAnimations,
            })),
          );

          activeAnimation.start(({ finished: cleared }) => {
            if (!mounted || !cleared) {
              return;
            }

            setLayoutIndex((current) => {
              const nextOffset = 1 + Math.floor(Math.random() * (loadingSkeletonLayouts.length - 1));
              return (current + nextOffset) % loadingSkeletonLayouts.length;
            });
            restartTimer = setTimeout(reveal, 60);
          });
        }, 680);
      });
    };

    reveal();

    return () => {
      mounted = false;
      if (restartTimer) {
        clearTimeout(restartTimer);
      }
      activeAnimation?.stop();
      revealValues.forEach((value) => value.stopAnimation());
    };
  }, [revealValues]);

  const skeletonBlock = (slot: number, style: StyleProp<ViewStyle>) => (
    <SkeletonBlock key={slot} reveal={revealValues[slot]} style={style} />
  );

  const renderHeader = () => (
    <View style={styles.loadingSkeletonTopRow}>
      {skeletonBlock(0, styles.loadingSkeletonBrand)}
      {skeletonBlock(1, styles.loadingSkeletonProfile)}
    </View>
  );

  const renderHomeLayout = () => (
    <>
      {renderHeader()}
      {skeletonBlock(2, styles.loadingSkeletonTitleWide)}
      {skeletonBlock(3, styles.loadingSkeletonTitleShort)}
      <View style={styles.loadingSkeletonChips}>
        {skeletonBlock(4, styles.loadingSkeletonChip)}
        {skeletonBlock(5, styles.loadingSkeletonChip)}
        {skeletonBlock(6, styles.loadingSkeletonChip)}
      </View>
      {skeletonBlock(7, styles.loadingSkeletonHeroCard)}
      {skeletonBlock(8, styles.loadingSkeletonAdvice)}
      <View style={styles.loadingSkeletonStoreRow}>
        {skeletonBlock(9, styles.loadingSkeletonStoreCard)}
        {skeletonBlock(10, styles.loadingSkeletonStoreCard)}
      </View>
    </>
  );

  const renderEnviesLayout = () => (
    <>
      {renderHeader()}
      {skeletonBlock(2, [styles.loadingSkeletonTitleWide, styles.loadingSkeletonTitleWideEnvies])}
      {skeletonBlock(3, [styles.loadingSkeletonTitleShort, styles.loadingSkeletonTitleShortEnvies])}
      <View style={styles.loadingSkeletonChips}>
        {skeletonBlock(4, [styles.loadingSkeletonChip, styles.loadingSkeletonChipWide])}
        {skeletonBlock(5, styles.loadingSkeletonChip)}
        {skeletonBlock(6, [styles.loadingSkeletonChip, styles.loadingSkeletonChipWide])}
      </View>
      <View style={styles.loadingSkeletonList}>
        {[0, 1, 2, 3, 4].map((item) => skeletonBlock(7 + item, [
          styles.loadingSkeletonListRow,
          item % 2 === 1 && styles.loadingSkeletonListRowSoft,
        ]))}
      </View>
    </>
  );

  const renderStoreLayout = () => (
    <>
      {renderHeader()}
      {skeletonBlock(2, [styles.loadingSkeletonTitleWide, styles.loadingSkeletonTitleWideStore])}
      <View style={styles.loadingSkeletonOffers}>
        {skeletonBlock(3, [styles.loadingSkeletonOfferRow, styles.loadingSkeletonOfferRowHot])}
        {skeletonBlock(4, styles.loadingSkeletonOfferRow)}
        {skeletonBlock(5, styles.loadingSkeletonOfferRow)}
      </View>
      <View style={styles.loadingSkeletonPackGrid}>
        {[0, 1, 2, 3, 4, 5].map((item) => skeletonBlock(6 + item, [
          styles.loadingSkeletonPackTile,
          item === 1 && styles.loadingSkeletonPackTileDark,
          item === 2 && styles.loadingSkeletonPackTileHot,
        ]))}
      </View>
    </>
  );

  return (
    <View style={styles.loadingScreen}>
      <View style={styles.loadingSkeletonStage}>
        {layout === "home" ? renderHomeLayout() : null}
        {layout === "envies" ? renderEnviesLayout() : null}
        {layout === "store" ? renderStoreLayout() : null}
      </View>
      <View style={styles.loadingSyncPill}>
        <Animated.View style={[styles.loadingSyncSpinner, { transform: [{ rotate: spinRotation }] }]} />
        <Text style={styles.loadingSyncText}>Synchronisation de votre espace...</Text>
      </View>
    </View>
  );
}

function SkeletonBlock({ reveal, style }: { reveal: Animated.Value; style: StyleProp<ViewStyle> }) {
  const opacity = reveal.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const translateY = reveal.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] });
  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });

  return (
    <Animated.View
      style={[
        styles.loadingSkeletonBlock,
        style,
        {
          opacity,
          transform: [{ translateY }, { scale }],
        },
      ]}
    />
  );
}

function DebugPreviewShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <View style={styles.debugPreviewShell}>
      {children}
      <SpringPressable onPress={onClose} style={styles.debugPreviewBackButton}>
        <ArrowLeft size={18} color={candy.white} />
        <Text style={styles.debugPreviewBackText}>Debug</Text>
      </SpringPressable>
    </View>
  );
}

function RemoteAccountLookupScreen({
  error,
  onLogout,
  onRetry,
}: {
  error: string;
  onLogout: () => void;
  onRetry: () => void;
}) {
  return (
    <View style={styles.remoteAccountScreen}>
      <View style={styles.remoteAccountCard}>
        <View style={styles.remoteAccountIcon}>
          <RefreshCcw size={26} color={candy.red} />
        </View>
        <Text style={styles.remoteAccountTitle}>On cherche ton espace Google</Text>
        <Text style={styles.remoteAccountText}>
          WeSpice doit vérifier ton compte avant de créer un nouvel espace. Réessaie dans un instant.
        </Text>
        <Text style={styles.remoteAccountError}>{error}</Text>
        <SpringPressable onPress={onRetry} style={styles.remoteAccountPrimary}>
          <RefreshCcw size={18} color={candy.white} />
          <Text style={styles.remoteAccountPrimaryText}>Réessayer</Text>
        </SpringPressable>
        <SpringPressable onPress={onLogout} style={styles.remoteAccountSecondary}>
          <LogOut size={18} color={candy.red} />
          <Text style={styles.remoteAccountSecondaryText}>Changer de compte</Text>
        </SpringPressable>
      </View>
    </View>
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
  enviesFocusCardId,
  enviesFocusCategory,
  enviesGameModeRequest,
  providerLoading,
  revealedMatchIds,
  session,
  syncError,
  tab,
  onActorChange,
  onAddCustomDesire,
  onApplyDebugPreset,
  onBeforeRevealMatch,
  onConsumeChatAttachment,
  onQueueChatAttachmentConsumption,
  onCopyInvite,
  onDebugFakeAd,
  onDebugUnlockAllPurchases,
  onDebugUnlockCategory,
  onDebugUnlockFeature,
  onDeleteAccount,
  onDisableDebugProfiles,
  onLogout,
  onMoodChange,
  onMoodNotificationPreference,
  onNotificationPreference,
  onEnviesGameModeRequestHandled,
  onOpenEnvieCard,
  onOpenEnviesGameMode,
  onOpenChat,
  onJoinPartner,
  onProvider,
  onRevealMatch,
  onRequestLeaveCouple,
  onReplayTutorial,
  onRestorePurchases,
  onReset,
  onSendChatMessage,
  onShowDebugPreview,
  onShowInvitePrompt,
  onShowOnboarding,
  onProfileNameChange,
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
  enviesFocusCardId: string | null;
  enviesFocusCategory: DesireCategory | null;
  enviesGameModeRequest: number;
  providerLoading: AuthProvider | null;
  revealedMatchIds: string[];
  session: Session | null;
  syncError: string;
  tab: TabKey;
  onActorChange: (id: PartnerId) => void;
  onAddCustomDesire: (desire: CustomDesireDraft) => void;
  onApplyDebugPreset: (preset: DebugPresetId) => void;
  onBeforeRevealMatch: () => Promise<boolean>;
  onConsumeChatAttachment: (payload: { attachmentId: string; messageId: string }) => void | Promise<void>;
  onQueueChatAttachmentConsumption: (payload: { attachmentId: string; messageId: string }) => void | Promise<void>;
  onCopyInvite: () => void;
  onDebugFakeAd: () => void;
  onDebugUnlockAllPurchases: () => void;
  onDebugUnlockCategory: (category: DesireCategory) => void;
  onDebugUnlockFeature: (feature: UnlockedFeature) => void;
  onDeleteAccount: () => void;
  onDisableDebugProfiles: () => void;
  onLogout: () => void;
  onMoodChange: (level: CoupleMoodLevel) => void;
  onMoodNotificationPreference: (enabled: boolean) => void;
  onNotificationPreference: (key: NotificationToggleKey, enabled: boolean) => void;
  onEnviesGameModeRequestHandled: () => void;
  onOpenEnvieCard: (card: DesireCard) => void;
  onOpenEnviesGameMode: () => void;
  onOpenChat: (cardId?: string) => void;
  onJoinPartner: () => void;
  onProvider: (provider: AuthProvider) => void;
  onRevealMatch: (cardId?: string) => Promise<void>;
  onRequestLeaveCouple: () => void;
  onReplayTutorial: () => void;
  onRestorePurchases: () => void;
  onReset: () => void;
  onSendChatMessage: (message: { attachments: ChatAttachment[]; body: string }) => void;
  onShowDebugPreview: (screen: DebugPreviewScreen) => void;
  onShowInvitePrompt: () => void;
  onShowOnboarding: () => void;
  onProfileNameChange: (name: string) => void;
  onStatusEmojiChange: (emoji: string) => void;
  onTabChange: (tab: TabKey) => void;
  onUnlockCustomCards: () => void;
  onUnlockCategory: (category: DesireCategory) => void;
  onUnlockNoAds: () => void;
  onUnlockUnlimitedResponses: () => void;
  onVote: (cardId: string, level: VoteLevel) => Promise<boolean>;
}) {
  const mainSafeAreaInsets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const syncNotice = userFacingSyncNotice(syncError);
  const [dismissedSyncNotice, setDismissedSyncNotice] = useState("");
  const chatNotificationsEnabled = isNotificationPreferenceEnabled(couple, couple.activePartnerId, "chatMessageEnabled");
  const visibleSyncNotice = syncNotice && syncNotice !== dismissedSyncNotice ? syncNotice : "";
  const dismissSyncNotice = useCallback(() => setDismissedSyncNotice(syncNotice), [syncNotice]);
  const tabBarActive: VisibleTabKey | null =
    tab === "profil" || tab === "rules" || (!debugEnabled && tab === "debug") ? null : tab;
  const tabDockPaddingBottom = homeLayoutMetrics(viewportHeight, viewportWidth, mainSafeAreaInsets).rhythm;
  const chatBottomNavInset = tabDockPaddingBottom + TAB_DOCK_VISIBLE_HEIGHT + CHAT_COMPOSER_NAV_GAP;
  const tabDockFadeColors: readonly [string, string, string] = tab === "chat"
    ? ["rgba(38,18,46,0)", "rgba(38,18,46,0.72)", candy.darkColor]
    : ["rgba(245,40,110,0)", "rgba(245,40,110,0.72)", "rgba(245,40,110,0.98)"];

  useEffect(() => {
    if (!syncNotice) {
      setDismissedSyncNotice("");
    }
  }, [syncNotice]);

  return (
    <View style={[styles.app, tab === "chat" && styles.appDark]}>
      <View style={styles.content}>
        {tab === "home" ? (
          <HomeScreen
            couple={couple}
            onGoEnvies={() => onTabChange("envies")}
            onMoodChange={onMoodChange}
            onMoodNotificationPreference={onMoodNotificationPreference}
            onOpenEnvieCard={onOpenEnvieCard}
            onOpenProfile={() => onTabChange("profil")}
            onRestorePurchases={onRestorePurchases}
            onUnlockCustomCards={onUnlockCustomCards}
            onUnlockCategory={onUnlockCategory}
            onUnlockNoAds={onUnlockNoAds}
            onUnlockUnlimitedResponses={onUnlockUnlimitedResponses}
          />
        ) : null}
        {tab === "envies" ? (
          <EnviesScreen
            couple={couple}
            focusCardId={enviesFocusCardId}
            focusCategory={enviesFocusCategory}
            startInGameRequest={enviesGameModeRequest}
            onAddCustomDesire={onAddCustomDesire}
            onStartInGameRequestHandled={onEnviesGameModeRequestHandled}
            onUnlockCustomCards={onUnlockCustomCards}
            onUnlockCategory={onUnlockCategory}
            onUnlockNoAds={onUnlockNoAds}
            onUnlockUnlimitedResponses={onUnlockUnlimitedResponses}
            onRestorePurchases={onRestorePurchases}
            onVote={onVote}
          />
        ) : null}
        {tab === "match" ? (
          <Entrance delay={0} style={styles.flex}>
            <MatchScreen
              couple={couple}
              revealedMatchIds={revealedMatchIds}
              onOpenGameMode={onOpenEnviesGameMode}
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
              onGoEnvies={() => onTabChange("envies")}
              onGoMatch={() => onTabChange("match")}
              onJoinPartner={onJoinPartner}
              onOpenSettings={() => onTabChange("profil")}
              onRestorePurchases={onRestorePurchases}
              onUnlockCategory={onUnlockCategory}
              onUnlockCustomCards={onUnlockCustomCards}
              onUnlockNoAds={onUnlockNoAds}
              onUnlockUnlimitedResponses={onUnlockUnlimitedResponses}
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
              onBack={() => onTabChange("home")}
              onProvider={onProvider}
              onDeleteAccount={onDeleteAccount}
              onRequestLeaveCouple={onRequestLeaveCouple}
              onReplayTutorial={onReplayTutorial}
              onRestorePurchases={onRestorePurchases}
              onReset={onReset}
              onProfileNameChange={onProfileNameChange}
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
              onDebugUnlockAllPurchases={onDebugUnlockAllPurchases}
              onDebugUnlockCategory={onDebugUnlockCategory}
              onDebugUnlockFeature={onDebugUnlockFeature}
              onDisableDebugProfiles={onDisableDebugProfiles}
              onReplayTutorial={onReplayTutorial}
              onReset={onReset}
              onShowDebugPreview={onShowDebugPreview}
              onShowInvitePrompt={onShowInvitePrompt}
              onShowOnboarding={onShowOnboarding}
            />
          </Entrance>
        ) : null}
        {tab === "chat" ? (
          <Entrance delay={0} style={styles.flex}>
            {hasLinkedPartner(couple) ? (
              <ChatScreen
                bottomNavInset={chatBottomNavInset}
                contextCardId={chatContextCardId}
                couple={couple}
                onConsumePhoto={onConsumeChatAttachment}
                onBack={() => onTabChange("home")}
                onQueuePhotoConsumption={onQueueChatAttachmentConsumption}
                onSendMessage={onSendChatMessage}
              />
            ) : (
              <ChatUnavailableScreen
                bottomNavInset={chatBottomNavInset}
                onBack={() => onTabChange("home")}
                onGoCouple={() => onTabChange("couple")}
              />
            )}
          </Entrance>
        ) : null}
        {tab === "rules" ? (
          <Entrance delay={0} style={styles.flex}>
            <RulesScreen onBack={() => onTabChange("home")} />
          </Entrance>
        ) : null}
      </View>
      <View pointerEvents="box-none" style={[styles.tabDock, tab === "chat" && styles.tabDockDark, { paddingBottom: tabDockPaddingBottom }]}>
        <LinearGradient
          colors={tabDockFadeColors}
          pointerEvents="none"
          style={styles.tabDockFade}
        />
        <CandyTabs
          active={tabBarActive}
          chatNotificationsEnabled={chatNotificationsEnabled}
          showDebug={debugEnabled}
          onChange={onTabChange}
        />
      </View>
      <ServerNoticeToast
        message={visibleSyncNotice}
        onDismiss={dismissSyncNotice}
      />
    </View>
  );
}

function ProfileShortcutButton({
  active,
  faded,
  onPress,
  profile,
}: {
  active: boolean;
  faded: boolean;
  onPress: () => void;
  profile: PartnerProfile;
}) {
  const opacity = useRef(new Animated.Value(faded ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      duration: faded ? 150 : 190,
      easing: Easing.out(Easing.cubic),
      toValue: faded ? 0 : 1,
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [faded, opacity]);

  return (
    <Animated.View pointerEvents={faded ? "none" : "box-none"} style={[styles.profileShortcutDock, { opacity }]}>
      <SpringPressable onPress={onPress} style={[styles.profileShortcut, active && styles.profileShortcutActive]}>
        <Text style={styles.profileShortcutEmoji}>{profileEmoji(profile)}</Text>
      </SpringPressable>
    </Animated.View>
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
  active: VisibleTabKey | null;
  chatNotificationsEnabled: boolean;
  onChange: (tab: TabKey) => void;
  showDebug: boolean;
}) {
  const allItems: Array<{ key: VisibleTabKey; label: string; icon: React.ReactNode }> = [
    { key: "home", label: "Accueil", icon: <Home size={20} /> },
    { key: "envies", label: "Envies", icon: <Flame size={20} /> },
    { key: "match", label: "Matchs", icon: <Sparkles size={20} /> },
    { key: "chat", label: "Chat", icon: <MessageCircle size={20} /> },
    { key: "couple", label: "Nous", icon: <Heart size={20} /> },
    { key: "debug", label: "Debug", icon: <Code2 size={20} /> },
  ];
  const items = showDebug ? allItems : allItems.filter((item) => item.key !== "debug");

  return (
    <View style={styles.tabs}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <SpringPressable key={item.key} onPress={() => onChange(item.key)} style={[styles.tab, isActive && styles.tabActive]}>
            <View style={styles.tabIconWrap}>
              {React.cloneElement(item.icon as React.ReactElement<{ color?: string }>, { color: isActive ? candy.red : candy.muted })}
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
  focusCardId,
  focusCategory,
  startInGameRequest,
  onAddCustomDesire,
  onStartInGameRequestHandled,
  onUnlockCustomCards,
  onUnlockCategory,
  onUnlockNoAds,
  onUnlockUnlimitedResponses,
  onRestorePurchases,
  onVote,
}: {
  couple: CoupleState;
  focusCardId: string | null;
  focusCategory: DesireCategory | null;
  startInGameRequest: number;
  onAddCustomDesire: (desire: CustomDesireDraft) => void;
  onStartInGameRequestHandled: () => void;
  onUnlockCustomCards: () => void;
  onUnlockCategory: (category: DesireCategory) => void;
  onUnlockNoAds: () => void;
  onUnlockUnlimitedResponses: () => void;
  onRestorePurchases: () => void;
  onVote: (cardId: string, level: VoteLevel) => Promise<boolean>;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const { height: viewportHeight, width } = useWindowDimensions();
  const [category, setCategory] = useState<DesireCategory>("Vanille");
  const [filter, setFilter] = useState<DesireFilterKey>("all");
  const [editorOpen, setEditorOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(() => startInGameRequest <= 0);
  const [localFocusCardId, setLocalFocusCardId] = useState<string | null>(null);
  const [gameTransitionCardId, setGameTransitionCardId] = useState<string | null>(null);
  const [gameTransitionVoteLevel, setGameTransitionVoteLevel] = useState<VoteLevel | null>(null);
  const [exitingGameCardId, setExitingGameCardId] = useState<string | null>(null);
  const [replayDeckIds, setReplayDeckIds] = useState<string[]>([]);
  const [purchaseCategory, setPurchaseCategory] = useState<DesireCategory | null>(null);
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [customPurchaseOpen, setCustomPurchaseOpen] = useState(false);
  const [noAdsPurchaseOpen, setNoAdsPurchaseOpen] = useState(false);
  const [unlimitedPurchaseOpen, setUnlimitedPurchaseOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const enviesHeaderScrollY = useRef(new Animated.Value(0)).current;
  const gameTransitionTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const ownVotes = couple.votes[couple.activePartnerId] ?? {};
  const [answeredInSession, setAnsweredInSession] = useState<Record<string, boolean>>({});
  const allCards = useMemo(() => allDesireCards(couple), [couple]);
  const categoryCards = useMemo(() => allCards.filter((card) => card.category === category), [allCards, category]);
  const unansweredCards = useMemo(
    () => categoryCards.filter((card) => ownVotes[card.id] === undefined),
    [categoryCards, ownVotes],
  );
  const galleryCards = useMemo(() => {
    const filteredCards = categoryCards.filter((card) => {
      const vote = ownVotes[card.id];

      if (filter === "all") {
        return true;
      }
      if (filter === "todo") {
        return vote === undefined;
      }
      if (filter === "hot") {
        return isFlameVote(vote);
      }
      if (filter === "curious") {
        return vote === 1;
      }

      return vote === 0;
    });

    if (filter !== "all") {
      return filteredCards;
    }

    return [...filteredCards].sort((firstCard, secondCard) => {
      const firstAnswered = ownVotes[firstCard.id] !== undefined;
      const secondAnswered = ownVotes[secondCard.id] !== undefined;

      if (firstAnswered === secondAnswered) {
        return 0;
      }

      return firstAnswered ? 1 : -1;
    });
  }, [categoryCards, filter, ownVotes]);
  const gameFocusCardId = focusCardId ?? localFocusCardId;
  const replayAnsweredCards = replayDeckIds.length > 0;
  const gameCards = useMemo(() => {
    if (replayAnsweredCards) {
      const categoryCardById = new Map(categoryCards.map((card) => [card.id, card]));
      const replayCards = replayDeckIds
        .map((cardId) => categoryCardById.get(cardId))
        .filter((card): card is DesireCard => Boolean(card))
        .filter((card) => {
          if (answeredInSession[card.id]) {
            return card.id === gameTransitionCardId || card.id === gameFocusCardId;
          }

          return true;
        });

      if (!gameFocusCardId) {
        return replayCards;
      }

      const focusIndex = replayCards.findIndex((card) => card.id === gameFocusCardId);
      if (focusIndex <= 0) {
        return replayCards;
      }

      const focusedCard = replayCards[focusIndex];
      if (!focusedCard) {
        return replayCards;
      }

      return [focusedCard, ...replayCards.filter((card) => card.id !== gameFocusCardId)];
    }

    const cards = categoryCards.filter((card) => {
      if (answeredInSession[card.id]) {
        return false;
      }

      return ownVotes[card.id] === undefined || card.id === gameTransitionCardId || card.id === gameFocusCardId;
    });

    if (!gameFocusCardId) {
      return cards;
    }

    const focusIndex = cards.findIndex((card) => card.id === gameFocusCardId);
    if (focusIndex <= 0) {
      return cards;
    }

    const focusedCard = cards[focusIndex];
    if (!focusedCard) {
      return cards;
    }

    return [focusedCard, ...cards.filter((card) => card.id !== gameFocusCardId)];
  }, [answeredInSession, categoryCards, gameFocusCardId, gameTransitionCardId, ownVotes, replayAnsweredCards, replayDeckIds]);
  const activeGameCard = gameCards[0];
  const categoryAnsweredCount = useMemo(
    () => categoryCards.filter((card) => ownVotes[card.id] !== undefined).length,
    [categoryCards, ownVotes],
  );
  const categoryMatchCount = useMemo(
    () => categoryCards.filter((card) => isCardMatch(couple, card.id)).length,
    [categoryCards, couple],
  );
  const customCount = customDesireCount(couple);
  const customUnlimited = hasCustomCardsUnlimited(couple);
  const customSlotsLeft = customDesireSlotsLeft(couple);
  const canCreateCustom = customUnlimited || customSlotsLeft > 0;
  const gameProgressLabel = `${Math.max(0, categoryCards.length - unansweredCards.length)}/${Math.max(1, categoryCards.length)}`;
  const compactEnviesLayout = width < 620;
  const enviesHeaderTopSpace = homeLayoutMetrics(viewportHeight, width, safeAreaInsets).rhythm;
  const enviesHeaderPaddingTop = useMemo(
    () => enviesHeaderScrollY.interpolate({
      extrapolate: "clamp",
      inputRange: [0, 22],
      outputRange: [enviesHeaderTopSpace, enviesHeaderTopSpace],
    }),
    [enviesHeaderScrollY, enviesHeaderTopSpace],
  );
  const openCustomDesire = () => (canCreateCustom ? setEditorOpen(true) : setStoreOpen(true));
  const openLibrary = () => {
    setFilter("all");
    setLibraryOpen(true);
    setLocalFocusCardId(null);
    setReplayDeckIds([]);
    void Haptics.selectionAsync();
  };
  const openGameMode = (card?: DesireCard) => {
    if (card) {
      setCategory(card.category);
      setLocalFocusCardId(card.id);
    }
    setReplayDeckIds([]);
    setLibraryOpen(false);
    void Haptics.selectionAsync();
  };
  const replayAnsweredPack = () => {
    clearGameTransitionTimers();
    setAnsweredInSession({});
    setExitingGameCardId(null);
    setGameTransitionCardId(null);
    setGameTransitionVoteLevel(null);
    setLocalFocusCardId(null);
    setReplayDeckIds(shuffledCards(categoryCards).map((card) => card.id));
    void Haptics.selectionAsync();
  };
  const selectCategoryFromPicker = (nextCategory: DesireCategory) => {
    changeCategory(nextCategory);
    setCategoryPickerOpen(false);
    void Haptics.selectionAsync();
  };
  const requestCategoryPurchase = (nextCategory: DesireCategory) => {
    setCategoryPickerOpen(false);
    setPurchaseCategory(nextCategory);
  };
  const clearGameTransitionTimers = () => {
    gameTransitionTimers.current.forEach((timer) => clearTimeout(timer));
    gameTransitionTimers.current = [];
  };
  const changeCategory = (nextCategory: DesireCategory) => {
    setCategory(nextCategory);
    setLocalFocusCardId(null);
    setReplayDeckIds([]);
  };
  const changeFilter = (nextFilter: DesireFilterKey) => setFilter(nextFilter);
  const handleEnviesScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const scrollY = Math.max(0, event.nativeEvent.contentOffset.y);
      enviesHeaderScrollY.setValue(scrollY);
    },
    [enviesHeaderScrollY],
  );
  const voteInGame = async (cardId: string, level: VoteLevel) => {
    if (gameTransitionCardId) {
      return;
    }

    const replaySameVote = replayAnsweredCards && ownVotes[cardId] === level;
    const accepted = replaySameVote || (await onVote(cardId, level));
    if (!accepted) {
      return;
    }

    setGameTransitionCardId(cardId);
    setGameTransitionVoteLevel(level);

    const exitTimer = setTimeout(() => {
      setExitingGameCardId(cardId);
    }, GAME_CARD_CONFIRM_MS);
    const nextTimer = setTimeout(() => {
      setAnsweredInSession((current) => ({ ...current, [cardId]: true }));
      setExitingGameCardId(null);
      setGameTransitionCardId(null);
      setGameTransitionVoteLevel(null);
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
        {canCreateCustom ? "+ Créer une carte perso" : "Cartes perso"}
      </Text>
    </SpringPressable>
  );

  useEffect(() => {
    if (focusCategory) {
      setCategory(focusCategory);
    }
  }, [focusCategory]);

  useEffect(() => {
    if (!focusCardId) {
      return;
    }

    setLibraryOpen(false);
    setLocalFocusCardId(null);
  }, [focusCardId]);

  useEffect(() => {
    if (startInGameRequest <= 0) {
      return;
    }

    clearGameTransitionTimers();
    setFilter("all");
    setLibraryOpen(false);
    setLocalFocusCardId(null);
    setGameTransitionCardId(null);
    setGameTransitionVoteLevel(null);
    setExitingGameCardId(null);
    setReplayDeckIds([]);
    setAnsweredInSession({});
    onStartInGameRequestHandled();
  }, [onStartInGameRequestHandled, startInGameRequest]);

  useEffect(() => {
    clearGameTransitionTimers();
    setGameTransitionCardId(null);
    setGameTransitionVoteLevel(null);
    setExitingGameCardId(null);
    setAnsweredInSession({});
    setReplayDeckIds([]);
  }, [category, couple.activePartnerId]);

  useEffect(() => {
    enviesHeaderScrollY.setValue(0);
  }, [enviesHeaderScrollY, libraryOpen]);

  useEffect(() => () => clearGameTransitionTimers(), []);

  const enviesHeader = (
    <Animated.View style={[styles.enviesStickyHeader, { paddingTop: enviesHeaderPaddingTop }]}>
      <LinearGradient
        colors={["rgba(245,40,110,0.98)", "rgba(245,40,110,0.74)", "rgba(245,40,110,0)"]}
        pointerEvents="none"
        style={styles.enviesStickyFade}
      />
      <Entrance delay={0} style={styles.enviesStickyContent}>
        <View style={styles.enviesGamePanel}>
          {libraryOpen ? (
            <View style={styles.enviesGalleryHero}>
              <Text style={styles.enviesGalleryTitle}>Envies</Text>
              <View pointerEvents="box-none" style={styles.enviesGalleryPackCenter}>
                <SpringPressable onPress={() => setCategoryPickerOpen(true)} style={[styles.enviesPackPill, styles.enviesGalleryPackPill]}>
                  <View style={styles.enviesPackPillDot} />
                  <Text style={styles.enviesPackPillText}>{categoryLabel(category)}</Text>
                  <ChevronRight size={15} color={candy.text} style={styles.enviesPackPillChevron} />
                </SpringPressable>
              </View>
              <SpringPressable onPress={() => openGameMode()} style={styles.enviesModeButton}>
                <Text style={styles.enviesModeButtonText}>Mode jeu</Text>
                <ChevronRight size={18} color={candy.red} />
              </SpringPressable>
            </View>
          ) : (
            <>
              <View style={styles.enviesTopGameBar}>
                <SpringPressable onPress={openLibrary} style={[styles.enviesGalleryBackButton, styles.enviesGameBackButton]}>
                  <ArrowLeft size={15} color={candy.red} />
                  <Text style={styles.enviesGalleryBackText}>Galerie</Text>
                </SpringPressable>
                <SpringPressable onPress={() => setCategoryPickerOpen(true)} style={[styles.enviesPackPill, styles.enviesGamePackPill]}>
                  <View style={styles.enviesPackPillDot} />
                  <Text style={styles.enviesPackPillText}>{categoryLabel(category)}</Text>
                  <ChevronRight size={15} color={candy.text} style={styles.enviesPackPillChevron} />
                </SpringPressable>
                <Text style={styles.enviesGameProgress}>{gameProgressLabel}</Text>
              </View>
            </>
          )}
        </View>
        {libraryOpen ? (
          <DesireFilterChips
            active={filter}
            onChange={changeFilter}
          />
        ) : null}
      </Entrance>
    </Animated.View>
  );

  return (
    <>
      <View style={styles.enviesScreenFrame}>
        {libraryOpen ? (
          <ScrollView
            contentContainerStyle={[styles.screen, styles.enviesScreenContent]}
            onScroll={handleEnviesScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[0]}
          >
            {enviesHeader}
            <View style={styles.cardStack}>
              {galleryCards.map((card, index) => (
                <Entrance delay={70 + index * 70} key={card.id}>
                  <DesireGalleryRow card={card} couple={couple} onPress={() => openGameMode(card)} />
                </Entrance>
              ))}
            </View>
            {compactEnviesLayout ? (
              <View style={styles.addDesireInlineDock}>
                <Entrance delay={120}>{addDesireButton}</Entrance>
              </View>
            ) : null}
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={[styles.screen, styles.enviesGameContent]}
            onScroll={handleEnviesScroll}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={[0]}
          >
            {enviesHeader}
            <View style={styles.gameCardStageHost}>
              {activeGameCard ? (
                <GameCardTransition
                  exiting={exitingGameCardId === activeGameCard.id}
                  key={activeGameCard.id}
                  voteLevel={gameTransitionVoteLevel ?? undefined}
                >
                  <DesireGameCard
                    card={activeGameCard}
                    confirmingVote={activeGameCard.id === gameTransitionCardId ? gameTransitionVoteLevel ?? undefined : undefined}
                    disabled={Boolean(gameTransitionCardId)}
                    selectedVote={ownVotes[activeGameCard.id]}
                    onVote={voteInGame}
                  />
                </GameCardTransition>
              ) : (
                <Entrance delay={80}>
                  <EnviesGameEmpty
                    answeredCount={categoryAnsweredCount}
                    category={category}
                    matchCount={categoryMatchCount}
                    onOpenLibrary={openLibrary}
                    onReplayAnsweredCards={replayAnsweredPack}
                    totalCount={categoryCards.length}
                  />
                </Entrance>
              )}
            </View>
          </ScrollView>
        )}
        {libraryOpen && !compactEnviesLayout ? (
          <View pointerEvents="box-none" style={styles.addDesireFloatingDock}>
            <Entrance delay={120}>{addDesireButton}</Entrance>
          </View>
        ) : null}
      </View>

      <CategoryPickerModal
        active={category}
        couple={couple}
        visible={categoryPickerOpen}
        onClose={() => setCategoryPickerOpen(false)}
        onLockedCategory={requestCategoryPurchase}
        onSelect={selectCategoryFromPicker}
      />
      <CustomDesireEditor
        customCount={customCount}
        customUnlimited={customUnlimited}
        onClose={() => setEditorOpen(false)}
        onSave={(desire) => {
          onAddCustomDesire(desire);
          setCategory(desire.category);
          setLibraryOpen(false);
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
        onRestorePurchases={onRestorePurchases}
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
  const safeAreaInsets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [blurb, setBlurb] = useState("");
  const [emoji, setEmoji] = useState(() => randomCustomDesireEmoji());
  const [ambiance, setAmbiance] = useState<(typeof customDesireAmbianceOptions)[number]>("Complice");
  const cleanTitle = title.trim();
  const cleanBlurb = blurb.trim();
  const previewEmoji = normalizeEmoji(emoji, stickers.heart);
  const canSave = cleanTitle.length >= 3 && cleanBlurb.length >= 8;
  const freeSlotsLeft = Math.max(0, CUSTOM_CARD_FREE_LIMIT - customCount);
  const quotaLabel = customUnlimited
    ? "Illimité actif"
    : `${Math.min(customCount, CUSTOM_CARD_FREE_LIMIT)} / ${CUSTOM_CARD_FREE_LIMIT} gratuites`;
  const footerCopy = customUnlimited
    ? "Cartes perso illimitées actives"
    : freeSlotsLeft === 1
      ? `Plus que 1 carte gratuite · Illimitées pour ${CUSTOM_CARDS_UNLIMITED_PRICE}`
      : `${freeSlotsLeft} cartes gratuites restantes · Illimitées pour ${CUSTOM_CARDS_UNLIMITED_PRICE}`;
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const editorSurface = fullScreenSurfaceMetrics(viewportWidth);
  const editorSideInset = editorSurface.sideInset;
  const editorContentWidth = editorSurface.contentWidth;
  const editorLayoutRhythm = Math.round(Math.min(34, Math.max(18, viewportHeight * 0.02)));
  const editorPreviewMinHeight = Math.round(Math.min(306, Math.max(226, viewportHeight * 0.2)));
  const editorBottomReserve = Math.max(136, safeAreaInsets.bottom + 118);
  const editorContentMinHeight = Math.max(0, viewportHeight - safeAreaInsets.top - editorBottomReserve);
  const editorWebInputReset = Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : null;

  useEffect(() => {
    if (!visible) {
      return;
    }

    setTitle("");
    setBlurb("");
    setEmoji(randomCustomDesireEmoji());
    setAmbiance("Complice");
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
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <LinearGradient colors={[candy.red, candy.red]} style={styles.editorScreen}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.editorOverlay}>
          <SafeAreaView style={styles.editorSafe}>
            <ScrollView
              contentContainerStyle={[
                styles.editorScrollContent,
                {
                  paddingBottom: editorBottomReserve,
                  paddingHorizontal: editorSideInset,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={[styles.editorContent, { minHeight: editorContentMinHeight, width: editorContentWidth }]}>
                <View style={styles.editorTopBar}>
                  <SpringPressable onPress={onClose} style={styles.editorBackButton}>
                    <ArrowLeft size={20} color={candy.white} />
                  </SpringPressable>
                  <Text style={styles.editorQuota}>{quotaLabel}</Text>
                </View>

                <View style={[styles.editorMainArea, { gap: editorLayoutRhythm }]}>
                  <Text style={styles.editorTitle}>
                    Votre carte à vous<Text style={styles.editorTitleDot}>.</Text>
                  </Text>

                  <View style={[styles.editorPreviewCard, { minHeight: editorPreviewMinHeight }]}>
                    <View style={styles.editorPreviewHeader}>
                      <Text style={styles.editorEyebrow}>Perso · aperçu</Text>
                      <View style={styles.editorPreviewRing} />
                    </View>
                    <View style={styles.editorPreviewBody}>
                      <View style={styles.editorIconPreview}>
                        <Text style={styles.editorIconPreviewEmoji}>{previewEmoji}</Text>
                      </View>
                      <View style={styles.editorPreviewCopy}>
                        <View style={[styles.editorEditableField, styles.editorTitleField]}>
                          <Text style={styles.editorFieldLabel}>Titre</Text>
                          <TextInput
                            maxLength={70}
                            multiline
                            onChangeText={setTitle}
                            placeholder="Ecrivez quelque chose..."
                            placeholderTextColor="rgba(59,23,55,0.42)"
                            style={[styles.editorTitleInput, editorWebInputReset]}
                            value={title}
                          />
                        </View>
                        <View style={[styles.editorEditableField, styles.editorBlurbField]}>
                          <Text style={styles.editorFieldLabel}>Précision</Text>
                          <TextInput
                            maxLength={150}
                            multiline
                            onChangeText={setBlurb}
                            placeholder="Ajoutez une precision..."
                            placeholderTextColor="rgba(59,23,55,0.42)"
                            style={[styles.editorBlurbInput, editorWebInputReset]}
                            value={blurb}
                          />
                        </View>
                      </View>
                    </View>
                  </View>

                  <View style={styles.editorControls}>
                    <View style={styles.editorSection}>
                      <Text style={styles.editorLabel}>Emoji</Text>
                      <View style={styles.editorEmojiPresetRow}>
                        {customDesireQuickEmojis.map((preset) => {
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
                        <SpringPressable onPress={() => setEmoji(randomCustomDesireEmoji())} style={styles.editorEmojiPreset}>
                          <Text style={styles.editorMoreText}>...</Text>
                        </SpringPressable>
                      </View>
                    </View>

                    <View style={styles.editorSection}>
                      <Text style={styles.editorLabel}>Ambiance</Text>
                      <View style={styles.editorAmbianceRow}>
                        {customDesireAmbianceOptions.map((option) => {
                          const active = ambiance === option;
                          return (
                            <SpringPressable
                              key={option}
                              onPress={() => setAmbiance(option)}
                              style={[styles.editorAmbianceChip, active && styles.editorAmbianceChipActive]}
                            >
                              <Text style={[styles.editorAmbianceText, active && styles.editorAmbianceTextActive]}>{option}</Text>
                            </SpringPressable>
                          );
                        })}
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            <View
              pointerEvents="box-none"
              style={[
                styles.editorBottomBar,
                {
                  paddingBottom: Math.max(10, safeAreaInsets.bottom),
                  paddingHorizontal: editorSideInset,
                },
              ]}
            >
              <View style={[styles.editorBottomContent, { width: editorContentWidth }]}>
                <SpringPressable
                  disabled={!canSave}
                  onPress={save}
                  style={[styles.editorSubmitButton, !canSave && styles.editorSubmitButtonDisabled]}
                >
                  <Text style={styles.editorSubmitText}>Ajouter à notre jeu</Text>
                </SpringPressable>
                <Text style={styles.editorFooterText}>{footerCopy}</Text>
              </View>
            </View>
          </SafeAreaView>
        </KeyboardAvoidingView>
        <StatusBar style="light" />
      </LinearGradient>
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
  const partnerName = couple.profiles[partnerId].displayName;
  const aligned = isMoodAligned(couple);
  const notificationsEnabled = isMoodNotificationEnabled(couple, activeId);
  const promptSeen = hasSeenMoodNotificationPrompt(couple, activeId);
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
      <LinearGradient colors={[candy.cream, candy.roseSoft]} style={styles.moodWidget}>
        <MoodAtmosphere heat={heatProgress} pulse={glowPulse} />
        <View style={styles.moodWidgetContent}>
          <View style={styles.moodWidgetHeader}>
            <View style={styles.moodWidgetCopy}>
              <Text style={styles.moodWidgetTitle}>Quelle est ton humeur?</Text>
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
          <LinearGradient colors={[candy.cream, candy.roseSoft]} style={styles.moodNotificationSheet}>
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
          colors={["rgba(245,40,110,0)", "rgba(245,40,110,0.36)", "rgba(255,210,63,0.32)"]}
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

function PackSelectorCard({
  active,
  couple,
  onOpen,
}: {
  active: DesireCategory;
  couple: CoupleState;
  onOpen: () => void;
}) {
  const tone = categoryTone(active);
  const count = useMemo(
    () => allDesireCards(couple).filter((card) => card.category === active).length,
    [active, couple],
  );

  return (
    <SpringPressable
      onPress={onOpen}
      style={[styles.packSelectorCard, { backgroundColor: tone.active }, categoryChipShadow(active, true, true)]}
    >
      <View style={styles.packSelectorIcon}>
        <Text style={styles.packSelectorEmoji}>{tone.icon}</Text>
      </View>
      <View style={styles.packSelectorCopy}>
        <Text style={styles.packSelectorKicker}>Pack actif</Text>
        <Text numberOfLines={1} style={styles.packSelectorTitle}>{categoryLabel(active)}</Text>
        <Text numberOfLines={1} style={styles.packSelectorText}>{count} cartes dans ce pack</Text>
      </View>
      <View style={styles.packSelectorAction}>
        <Text style={styles.packSelectorActionText}>Changer</Text>
        <ChevronRight size={17} color={candy.red} />
      </View>
    </SpringPressable>
  );
}

function CategoryPickerModal({
  active,
  couple,
  onClose,
  onLockedCategory,
  onSelect,
  visible,
}: {
  active: DesireCategory;
  couple: CoupleState;
  onClose: () => void;
  onLockedCategory: (category: DesireCategory) => void;
  onSelect: (category: DesireCategory) => void;
  visible: boolean;
}) {
  const customCount = customDesireCount(couple);
  const customUnlimited = hasCustomCardsUnlimited(couple);
  const categoryCounts = useMemo(() => {
    const counts = new Map<DesireCategory, number>();

    allDesireCards(couple).forEach((card) => {
      counts.set(card.category, (counts.get(card.category) ?? 0) + 1);
    });

    return counts;
  }, [couple]);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.categoryPickerOverlay}>
        <Pressable style={styles.categoryPickerBackdrop} onPress={onClose} />
        <Entrance delay={30} style={styles.categoryPickerSheetWrap}>
          <View style={styles.categoryPickerSheet}>
            <View style={styles.categoryPickerHeader}>
              <View style={styles.categoryPickerHeaderCopy}>
                <Text style={styles.categoryPickerTitle}>Packs</Text>
                <Text style={styles.categoryPickerText}>Des univers à explorer, à deux.</Text>
              </View>
              <SpringPressable onPress={onClose} style={styles.categoryPickerClose}>
                <X size={20} color={candy.red} />
              </SpringPressable>
            </View>
            <ScrollView contentContainerStyle={styles.categoryPickerGrid} showsVerticalScrollIndicator={false}>
              {PACK_PICKER_CATEGORIES.map((category) => {
                const visual = categoryVisual(category);
                const unlocked = isCategoryUnlocked(couple, category);
                const selected = category === active;
                const personal = category === PERSONAL_CATEGORY;
                const count = personal ? customCount : categoryCounts.get(category) ?? desireCardCount(category);
                const countLabel = personal
                  ? customUnlimited
                    ? "Illimité"
                    : `${Math.min(customCount, CUSTOM_CARD_FREE_LIMIT)} / ${CUSTOM_CARD_FREE_LIMIT} cartes`
                  : `${count} cartes`;
                const badgeLabel = selected
                  ? "Actif"
                  : personal
                    ? "Choisir"
                    : category === "Vanille"
                      ? "Inclus"
                      : unlocked
                        ? "Ouvert"
                        : CATEGORY_PRICES[category] ?? "4,99 €";
                const darkCard = ["Jeux & Défis", "Scénarios", "BDSM", "Tabous"].includes(category);
                const creamCard = category === "Vanille" || personal;
                const hotCard = category === "Hot";
                const action = unlocked ? () => onSelect(category) : () => onLockedCategory(category);

                return (
                  <SpringPressable
                    key={category}
                    onPress={action}
                    style={[
                      styles.categoryPickerCard,
                      creamCard && styles.categoryPickerCardCream,
                      personal && styles.categoryPickerCardPersonal,
                      !creamCard && { backgroundColor: visual.accent },
                      selected && styles.categoryPickerCardSelected,
                      selected && categoryChipShadow(category, true, unlocked),
                      !unlocked && styles.categoryPickerCardLocked,
                    ]}
                    testID={`category-picker-card-${category}`}
                  >
                    {!creamCard ? (
                      <LinearGradient colors={visual.colors} pointerEvents="none" style={styles.categoryPickerCardFill} />
                    ) : null}
                    <CategoryPickerPattern category={category} />
                    <View style={styles.categoryPickerCardCopy}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.categoryPickerCardTitle,
                          darkCard && styles.categoryPickerCardTitleLight,
                          hotCard && styles.categoryPickerCardTitleDark,
                        ]}
                      >
                        {categoryLabel(category)}
                      </Text>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.categoryPickerCardText,
                          darkCard && styles.categoryPickerCardTextLight,
                          hotCard && styles.categoryPickerCardTextDark,
                        ]}
                      >
                        {countLabel}
                      </Text>
                      <View
                        style={[
                          styles.categoryPickerLock,
                          selected && styles.categoryPickerBadgeActive,
                          personal && styles.categoryPickerBadgeCreate,
                        ]}
                      >
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.categoryPickerBadgeText,
                            selected && styles.categoryPickerBadgeTextActive,
                            hotCard && !selected && !unlocked && styles.categoryPickerBadgeTextHot,
                            personal && styles.categoryPickerBadgeTextCreate,
                          ]}
                        >
                          {badgeLabel}
                        </Text>
                      </View>
                    </View>
                    {!unlocked && !personal ? (
                      <View style={styles.categoryPickerLockIcon}>
                        <LockKeyhole size={17} color={hotCard ? candy.black : candy.yellow} />
                      </View>
                    ) : null}
                  </SpringPressable>
                );
              })}
            </ScrollView>
          </View>
        </Entrance>
      </View>
    </Modal>
  );
}

function CategoryPickerPattern({ category }: { category: DesireCategory }) {
  const dotCategories: DesireCategory[] = ["Sensuel", "Hot", "Jeux & Défis", "BDSM"];
  const stripeCategories: DesireCategory[] = ["Vanille", "Séduction", "Scénarios", "Kinky Soft", "Plaisirs explicites", "Tabous"];

  if (category === PERSONAL_CATEGORY) {
    return null;
  }

  if (dotCategories.includes(category)) {
    return (
      <View pointerEvents="none" style={styles.categoryPickerPatternLayer}>
        {Array.from({ length: 24 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.categoryPickerDot,
              {
                left: `${10 + (index % 6) * 16}%`,
                opacity: category === "Jeux & Défis" || category === "BDSM" ? 0.16 : 0.28,
                top: `${10 + Math.floor(index / 6) * 22}%`,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  if (stripeCategories.includes(category)) {
    return (
      <View pointerEvents="none" style={styles.categoryPickerPatternLayer}>
        {Array.from({ length: 8 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.categoryPickerStripe,
              {
                left: `${index * 18 - 34}%`,
                opacity: category === "Vanille" ? 0.42 : 0.18,
              },
            ]}
          />
        ))}
      </View>
    );
  }

  return null;
}

function CategoryChips({
  active,
  couple,
  embedded,
  onChange,
  onLockedCategory,
}: {
  active: DesireCategory;
  couple: CoupleState;
  embedded?: boolean;
  onChange: (category: DesireCategory) => void;
  onLockedCategory: (category: DesireCategory) => void;
}) {
  const categoryCounts = useMemo(() => {
    const counts = new Map<DesireCategory, number>();

    allDesireCards(couple).forEach((card) => {
      counts.set(card.category, (counts.get(card.category) ?? 0) + 1);
    });

    return counts;
  }, [couple]);

  return (
    <View style={[styles.categoryRailWrap, embedded && styles.categoryRailWrapEmbedded]}>
      <ScrollView
        contentContainerStyle={[styles.categoryRail, embedded && styles.categoryRailEmbedded]}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {DESIRE_CATEGORIES.map((category) => {
          const tone = categoryTone(category);
          const unlocked = isCategoryUnlocked(couple, category);
          const selected = category === active;
          const count = categoryCounts.get(category) ?? 0;
          const selectedTextColor = categoryChipTextColor(category, true, unlocked);

          return (
            <SpringPressable
              key={category}
              onPress={() => (unlocked ? onChange(category) : onLockedCategory(category))}
              style={[
                styles.categoryRailChip,
                { backgroundColor: unlocked ? "rgba(255,255,255,0.74)" : "rgba(255,255,255,0.46)" },
                selected && styles.categoryRailChipActive,
                selected && { backgroundColor: unlocked ? tone.active : tone.bg },
                selected && categoryChipShadow(category, true, unlocked),
                !unlocked && styles.categoryRailChipLocked,
              ]}
            >
              <View style={[styles.categoryRailIcon, selected && styles.categoryRailIconActive]}>
                <Text style={styles.categoryRailEmoji}>{tone.icon}</Text>
              </View>
              {selected ? (
                <View style={styles.categoryRailCopy}>
                  <Text
                    numberOfLines={1}
                    style={[styles.categoryRailKicker, { color: selectedTextColor }]}
                  >
                    {unlocked ? "Pack actif" : "Pack verrouillé"}
                  </Text>
                  <Text
                    adjustsFontSizeToFit
                    numberOfLines={1}
                    style={[styles.categoryRailTitle, { color: selectedTextColor }]}
                  >
                    {categoryLabel(category)}
                  </Text>
                  <Text numberOfLines={1} style={[styles.categoryRailMeta, { color: selectedTextColor }]}>
                    {unlocked ? `${count} cartes` : "À débloquer"}
                  </Text>
                </View>
              ) : null}
              {!unlocked ? (
                <View style={[styles.categoryRailLock, selected && styles.categoryRailLockActive]}>
                  <LockKeyhole size={10} color={candy.red} />
                </View>
              ) : null}
            </SpringPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DesireFilterChips({
  active,
  onChange,
}: {
  active: DesireFilterKey;
  onChange: (filter: DesireFilterKey) => void;
}) {
  return (
    <ScrollView
      horizontal
      contentContainerStyle={styles.desireFilterRow}
      style={styles.desireFilterScroll}
      showsHorizontalScrollIndicator={false}
    >
      {desireFilterOptions.map((option) => {
        const selected = option.key === active;

        return (
          <SpringPressable
            key={option.key}
            onPress={() => onChange(option.key)}
            style={[styles.desireFilterChip, selected && styles.desireFilterChipActive]}
          >
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.desireFilterText, selected && styles.desireFilterTextActive]}>{option.label}</Text>
          </SpringPressable>
        );
      })}
    </ScrollView>
  );
}

function DesireGalleryRow({
  card,
  couple,
  onPress,
}: {
  card: DesireCard;
  couple: CoupleState;
  onPress: () => void;
}) {
  const ownVote = couple.votes[couple.activePartnerId][card.id];
  const matched = isCardMatch(couple, card.id);
  const answered = ownVote !== undefined;
  const statusLabel = matched ? "Match" : answered ? "Répondu" : "À répondre";
  const responseLabel = answered ? galleryVoteAnswerLabel(ownVote) : "";

  return (
    <SpringPressable
      onPress={onPress}
      style={[
        styles.desireGalleryRow,
        matched && styles.desireGalleryRowMatch,
        answered && !matched && styles.desireGalleryRowAnswered,
      ]}
      testID={`desire-gallery-row-${card.id}`}
    >
      <View style={styles.desireGalleryCopy}>
        <Text
          numberOfLines={2}
          style={[styles.desireGalleryCardTitle, matched && styles.desireGalleryCardTitleMatch]}
        >
          {card.title}
        </Text>
        <View style={styles.desireGalleryMetaRow}>
          <Text
            numberOfLines={1}
            style={[styles.desireGalleryCategory, matched && styles.desireGalleryCategoryMatch]}
          >
            {categoryLabel(card.category)}
          </Text>
          {responseLabel ? (
            <View
              style={[
                styles.desireGalleryAnswerPill,
                ownVote === 0 && styles.desireGalleryAnswerPillNo,
                ownVote === 1 && styles.desireGalleryAnswerPillCurious,
                isFlameVote(ownVote) && styles.desireGalleryAnswerPillHot,
                matched && !isFlameVote(ownVote) && styles.desireGalleryAnswerPillMatch,
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.desireGalleryAnswerText,
                  isFlameVote(ownVote) && styles.desireGalleryAnswerTextHot,
                  matched && !isFlameVote(ownVote) && styles.desireGalleryAnswerTextMatch,
                ]}
              >
                {responseLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
      <View
        style={[
          styles.desireGalleryStatus,
          !answered && styles.desireGalleryStatusTodo,
          answered && !matched && styles.desireGalleryStatusAnswered,
          matched && styles.desireGalleryStatusMatch,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.desireGalleryStatusText,
            !answered && styles.desireGalleryStatusTextTodo,
            matched && styles.desireGalleryStatusTextMatch,
          ]}
        >
          {statusLabel}
        </Text>
      </View>
    </SpringPressable>
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

function GameCardTransition({
  children,
  exiting,
  voteLevel,
}: {
  children: React.ReactNode;
  exiting: boolean;
  voteLevel?: VoteLevel;
}) {
  const entrance = useRef(new Animated.Value(0)).current;
  const exit = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    entrance.setValue(0);
    Animated.timing(entrance, {
      duration: 240,
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

    Animated.timing(exit, {
      duration: GAME_CARD_EXIT_MS,
      easing: Easing.inOut(Easing.cubic),
      toValue: 1,
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [exit, exiting]);

  const exitOpacity = exit.interpolate({
    inputRange: [0, 0.66, 1],
    outputRange: [1, 0.96, 0],
  });
  const exitScale = exit.interpolate({
    inputRange: [0, 0.66, 1],
    outputRange: [1, 0.985, 0.94],
  });
  const exitRotate = exit.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", voteLevel === 0 ? "-3deg" : voteLevel === 1 ? "3deg" : "1deg"],
  });
  const exitTranslateX = exit.interpolate({
    inputRange: [0, 1],
    outputRange: [0, voteLevel === 0 ? -14 : voteLevel === 1 ? 14 : 0],
  });
  const exitTranslateY = exit.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 28],
  });

  return (
    <View style={[styles.gameCardTransitionHost, exiting ? styles.gameCardTransitionHostExiting : styles.gameCardTransitionHostEntering]}>
      <Animated.View
        style={[
          styles.gameCardTransitionBody,
          {
            opacity: exiting ? exitOpacity : entrance,
            transform: [
              {
                translateY: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
              { translateX: exitTranslateX },
              { translateY: exitTranslateY },
              {
                scale: entrance.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.965, 1],
                }),
              },
              { scale: exitScale },
              { rotate: exitRotate },
            ],
          },
        ]}
      >
        {children}
      </Animated.View>
    </View>
  );
}

function DesireGameCardFace({
  cardStyle,
  category,
  copyStyle,
  deckStyle,
  description,
  overlay,
  prompt,
  roomy,
  testID,
  textStyle,
  titleStyle,
}: {
  cardStyle?: StyleProp<ViewStyle>;
  category: DesireCategory;
  copyStyle?: StyleProp<ViewStyle>;
  deckStyle?: StyleProp<ViewStyle>;
  description: string;
  overlay?: React.ReactNode;
  prompt: string;
  roomy?: boolean;
  testID?: string;
  textStyle?: StyleProp<TextStyle>;
  titleStyle?: StyleProp<TextStyle>;
}) {
  return (
    <View style={[styles.desireGameDeck, roomy && styles.desireGameDeckRoomy, deckStyle]}>
      <View style={[styles.desireGameBackCard, styles.desireGameBackCardLeft]} />
      <View style={[styles.desireGameBackCard, styles.desireGameBackCardRight]} />
      <View
        style={[styles.desireGameCard, roomy && styles.desireGameCardRoomy, cardStyle]}
        testID={testID}
      >
        <View style={styles.desireGameTopRow}>
          <Text numberOfLines={1} style={styles.desireGameCategoryLabel}>{categoryLabel(category)}</Text>
          <View style={styles.desireGameCornerRing} />
        </View>
        <View style={[styles.desireGameCopy, roomy && styles.desireGameCopyRoomy, copyStyle]}>
          <Text adjustsFontSizeToFit numberOfLines={5} style={[styles.desireGameTitle, titleStyle]}>{prompt}</Text>
        </View>
        <Text numberOfLines={2} style={[styles.desireGameText, textStyle]}>{description}</Text>
        {overlay}
      </View>
    </View>
  );
}

function DesireGameCard({
  card,
  confirmingVote,
  disabled,
  selectedVote,
  onVote,
}: {
  card: DesireCard;
  confirmingVote?: VoteLevel;
  disabled?: boolean;
  selectedVote?: VoteLevel;
  onVote: (cardId: string, level: VoteLevel) => void;
}) {
  const { height, width } = useWindowDimensions();
  const roomy = width >= 620;
  const voteGap = roomy ? 12 : 6;
  const desiredSideVoteSize = roomy ? 124 : 106;
  const desiredFeaturedVoteSize = roomy ? 148 : 130;
  const availableVoteWidth = Math.max(300, width - 36);
  const desiredVoteWidth = desiredSideVoteSize * 2 + desiredFeaturedVoteSize + voteGap * 2;
  const voteScale = Math.min(1, availableVoteWidth / desiredVoteWidth);
  const sideVoteSize = Math.round(desiredSideVoteSize * voteScale);
  const featuredVoteSize = Math.round(desiredFeaturedVoteSize * voteScale);
  const prompt = card.title || card.blurb;
  const description = card.blurb || card.title;
  const activeVote = confirmingVote ?? selectedVote;
  const validationProgress = useRef(new Animated.Value(0)).current;
  const gameVerticalDrop = Math.round(Math.min(roomy ? 86 : 72, Math.max(38, height * 0.075)));
  const validationTone = confirmingVote === 2
    ? { backgroundColor: candy.yellow, iconColor: candy.ink, veilColor: "rgba(255,210,63,0.24)" }
    : confirmingVote === 1
      ? { backgroundColor: candy.black, iconColor: candy.white, veilColor: "rgba(38,18,46,0.18)" }
      : { backgroundColor: candy.cream, iconColor: candy.ink, veilColor: "rgba(255,249,240,0.2)" };

  useEffect(() => {
    validationProgress.stopAnimation();

    if (confirmingVote === undefined) {
      validationProgress.setValue(0);
      return;
    }

    validationProgress.setValue(0);
    Animated.timing(validationProgress, {
      duration: GAME_CARD_CONFIRM_MS,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [confirmingVote, validationProgress]);

  const validationOverlay = confirmingVote !== undefined ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.desireGameValidationVeil,
        {
          backgroundColor: validationTone.veilColor,
          opacity: validationProgress.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0.78, 0.9],
          }),
        },
      ]}
    >
      <Animated.View
        style={[
          styles.desireGameValidationPulse,
          {
            opacity: validationProgress.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: [0, 0.42, 0],
            }),
            transform: [
              {
                scale: validationProgress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.82, 1.55],
                }),
              },
            ],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.desireGameValidationBadge,
          { backgroundColor: validationTone.backgroundColor },
          {
            opacity: validationProgress.interpolate({
              inputRange: [0, 0.34, 1],
              outputRange: [0, 1, 1],
            }),
            transform: [
              {
                scale: validationProgress.interpolate({
                  inputRange: [0, 0.72, 1],
                  outputRange: [0.82, 1.06, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Check color={validationTone.iconColor} size={28} strokeWidth={4} />
      </Animated.View>
    </Animated.View>
  ) : null;

  return (
    <View style={[styles.desireGameStage, roomy && styles.desireGameStageRoomy, { paddingTop: gameVerticalDrop }]}>
      <DesireGameCardFace
        category={card.category}
        description={description}
        overlay={validationOverlay}
        prompt={prompt}
        roomy={roomy}
        testID={`desire-game-card-${card.id}`}
      />
      <View style={[styles.desireGameVoteDock, roomy && styles.desireGameVoteDockRoomy]}>
        <View style={[styles.desireGameVoteRow, roomy && styles.desireGameVoteRowRoomy, { gap: voteGap }]}>
          <VoteButton disabled={disabled} label="Non" onPress={() => onVote(card.id, 0)} prominent selected={activeVote === 0} size={sideVoteSize} testID={`game-vote-${card.id}-0`} />
          <VoteButton disabled={disabled} featured label="Chaud" onPress={() => onVote(card.id, 2)} prominent selected={isFlameVote(activeVote)} size={featuredVoteSize} testID={`game-vote-${card.id}-2`} />
          <VoteButton disabled={disabled} flame label="Pourquoi pas" onPress={() => onVote(card.id, 1)} prominent selected={activeVote === 1} size={sideVoteSize} testID={`game-vote-${card.id}-1`} />
        </View>
      </View>
    </View>
  );
}

function EnviesGameEmpty({
  answeredCount,
  category,
  matchCount,
  onOpenLibrary,
  onReplayAnsweredCards,
  totalCount,
}: {
  answeredCount: number;
  category: DesireCategory;
  matchCount: number;
  onOpenLibrary: () => void;
  onReplayAnsweredCards: () => void;
  totalCount: number;
}) {
  const categoryName = categoryLabel(category);
  const exploredCount = totalCount || answeredCount;
  const matchLabel = `${matchCount} match${matchCount > 1 ? "s" : ""}`;

  return (
    <View style={styles.enviesGameEmpty}>
      <View pointerEvents="none" style={styles.enviesGameEmptyDeck}>
        <View style={[styles.enviesGameEmptyCard, styles.enviesGameEmptyBackCard]} />
        <View style={[styles.enviesGameEmptyCard, styles.enviesGameEmptyFrontCard]}>
          <Check color={candy.red} size={42} strokeWidth={3.4} />
        </View>
      </View>
      <Text style={styles.enviesGameEmptyTitle}>Pack exploré à fond</Text>
      <Text style={styles.enviesGameEmptyText}>
        Vous avez croisé les {exploredCount} cartes de {categoryName} - {matchLabel} à la clé. La suite chauffe un peu plus.
      </Text>
      <View style={styles.enviesGameEmptyActions}>
        <SpringPressable onPress={onReplayAnsweredCards} style={styles.enviesGameEmptyPrimary}>
          <Text style={styles.enviesGameEmptyPrimaryText}>Rejouer les cartes</Text>
        </SpringPressable>
        <SpringPressable onPress={onOpenLibrary} style={styles.enviesGameEmptySecondary}>
          <Text style={styles.enviesGameEmptySecondaryText}>ou revenir à la galerie</Text>
        </SpringPressable>
      </View>
    </View>
  );
}

function VoteButton({
  accent,
  disabled,
  featured,
  flame,
  icon,
  label,
  onPress,
  prominent,
  selected,
  size,
  testID,
}: {
  accent?: string;
  disabled?: boolean;
  featured?: boolean;
  flame?: boolean;
  icon?: string;
  label?: string;
  onPress: () => void;
  prominent?: boolean;
  selected: boolean;
  size?: number;
  testID: string;
}) {
  const prominentSizeStyle = prominent && size
    ? { height: size, minHeight: size, minWidth: size, width: size }
    : null;

  return (
    <SpringPressable
      disabled={disabled}
      onPress={onPress}
      style={[
        prominent ? styles.voteButtonProminent : styles.voteButton,
        prominentSizeStyle,
        !prominent && flame && styles.voteButtonFire,
        !prominent && flame && accent ? { backgroundColor: accent } : null,
        featured && styles.voteButtonFeatured,
        flame && prominent && styles.voteButtonFireProminent,
        selected && !flame && styles.voteButtonSelected,
        selected && flame && styles.voteButtonFireSelected,
        prominent && selected && !flame && styles.voteButtonProminentSelected,
        prominent && selected && featured && styles.voteButtonFeaturedSelected,
        prominent && selected && flame && styles.voteButtonFireProminentSelected,
      ]}
      testID={testID}
    >
      {flame && !prominent ? (
        <Text style={[styles.voteButtonEmoji, prominent && styles.voteButtonEmojiProminent]}>🔥</Text>
      ) : (
        <View style={[styles.voteButtonContent, prominent && styles.voteButtonProminentContent]}>
          {prominent && icon ? (
            <Text style={[styles.voteButtonIcon, selected && styles.voteButtonIconSelected]}>{icon}</Text>
          ) : null}
          <Text
            adjustsFontSizeToFit
            numberOfLines={prominent ? 2 : 1}
            style={[
              styles.voteButtonText,
              prominent && styles.voteButtonTextProminent,
              selected && !flame && styles.voteButtonTextSelected,
              flame && prominent && styles.voteButtonTextFireProminent,
            ]}
          >
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
  onOpenGameMode,
  onOpenChat,
  onBeforeRevealMatch,
  onRevealMatch,
}: {
  couple: CoupleState;
  revealedMatchIds: string[];
  onOpenGameMode: () => void;
  onOpenChat: (cardId?: string) => void;
  onBeforeRevealMatch: () => Promise<boolean>;
  onRevealMatch: (cardId?: string) => Promise<void>;
}) {
  const revealedMatchSet = useMemo(() => new Set(revealedMatchIds), [revealedMatchIds]);
  const remoteCouple = isRemoteCoupleId(couple.id);
  const matches = useMemo(() => matchedCards(couple), [couple]);
  const hiddenMatches = useMemo(
    () => remoteCouple ? [] : matches.filter((card) => !revealedMatchSet.has(card.id)),
    [matches, remoteCouple, revealedMatchSet],
  );
  const revealedMatches = useMemo(
    () => remoteCouple ? matches : matches.filter((card) => revealedMatchSet.has(card.id)),
    [matches, remoteCouple, revealedMatchSet],
  );
  const hiddenMatchCount = hiddenMatchCountForCouple(couple, matches, revealedMatchSet);
  const newestHiddenMatch = hiddenMatches[0];
  const newestRevealedMatch = revealedMatches[0] ?? matches[0];
  const newestMatch = hiddenMatchCount > 0 ? newestHiddenMatch : newestRevealedMatch;
  const [revealingMatchId, setRevealingMatchId] = useState<string | null>(null);
  const [spotlightMatch, setSpotlightMatch] = useState<DesireCard | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<DesireCard | null>(null);
  const revealAnim = useRef(new Animated.Value(0)).current;
  const safeAreaInsets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const matchLayout = homeLayoutMetrics(viewportHeight, viewportWidth, safeAreaInsets);
  const hasHiddenReveal = hiddenMatchCount > 0;
  const hasAnyMatch = matches.length > 0 || hasHiddenReveal;
  const revealToken = newestHiddenMatch?.id ?? "__next-hidden-match__";
  const isNewestOpening = hasHiddenReveal && revealingMatchId === revealToken;
  const listedMatches = hasHiddenReveal ? revealedMatches : matches;
  const hasSecondaryMatchContent = hasHiddenReveal ? revealedMatches.length > 0 : listedMatches.length > 0;
  const centerPrimaryMatchStage = hasHiddenReveal && !hasSecondaryMatchContent;
  const inlineRevealMatch = spotlightMatch ?? (isNewestOpening ? newestHiddenMatch ?? null : null);
  const showInlineReveal = Boolean(inlineRevealMatch);
  const inlineRevealStageHeight = Math.max(620, matchLayout.frameHeight - matchLayout.bottomPadding);
  const matchContentStyle = useMemo<ViewStyle>(() => ({
    gap: showInlineReveal ? 0 : hasAnyMatch ? Math.max(14, matchLayout.rhythm * 0.62) : 0,
    minHeight: matchLayout.frameHeight,
    paddingBottom: showInlineReveal ? 0 : matchLayout.bottomPadding,
    paddingHorizontal: showInlineReveal ? 0 : Math.max(10, 14 * matchLayout.widthScale),
    paddingTop: showInlineReveal ? 0 : Math.max(12, matchLayout.rhythm),
  }), [hasAnyMatch, matchLayout.bottomPadding, matchLayout.frameHeight, matchLayout.rhythm, matchLayout.widthScale, showInlineReveal]);

  useEffect(() => {
    if (spotlightMatch) {
      return;
    }

    revealAnim.setValue(0);
    setRevealingMatchId(null);
  }, [hiddenMatchCount, newestMatch?.id, revealAnim, spotlightMatch]);

  async function revealNewestMatch() {
    if (!hasHiddenReveal || isNewestOpening || (!remoteCouple && !newestHiddenMatch)) {
      return;
    }

    const canReveal = await onBeforeRevealMatch();
    if (!canReveal) {
      return;
    }

    setRevealingMatchId(revealToken);
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

      onRevealMatch(newestHiddenMatch?.id);
      setRevealingMatchId(null);
      if (newestHiddenMatch) {
        setSpotlightMatch(newestHiddenMatch);
        revealAnim.setValue(1);
      }
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  }

  function closeInlineReveal() {
    setSpotlightMatch(null);
    revealAnim.setValue(0);
  }

  return (
    <>
      <ScrollView
        contentContainerStyle={[
          styles.matchScreen,
          matchContentStyle,
          !hasAnyMatch && styles.matchScreenEmptyMode,
          showInlineReveal && styles.matchScreenRevealMode,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!showInlineReveal ? (
          <View style={styles.matchScreenHeader}>
            <Text style={styles.matchScreenTitle}>Matchs</Text>
            <Text style={styles.matchScreenSubtitle}>Ce qui vous plaît à tous les deux. Rien d'autre.</Text>
          </View>
        ) : null}

        {showInlineReveal || hasHiddenReveal || !hasAnyMatch ? (
          <View
            style={[
              styles.matchPrimaryStage,
              showInlineReveal && styles.matchPrimaryStageReveal,
              centerPrimaryMatchStage && styles.matchPrimaryStageCentered,
              !hasAnyMatch && styles.matchPrimaryStageEmpty,
            ]}
          >
            {showInlineReveal ? (
              <MatchRevealTheater
                couple={couple}
                hiddenMatchCount={hiddenMatchCount}
                isOpening={isNewestOpening}
                match={inlineRevealMatch}
                onDismiss={closeInlineReveal}
                onOpenChat={() => {
                  closeInlineReveal();
                  onOpenChat(inlineRevealMatch?.id);
                }}
                onOpenDetail={() => {
                  if (inlineRevealMatch) {
                    setSelectedMatch(inlineRevealMatch);
                  }
                }}
                onReveal={revealNewestMatch}
                revealAnim={revealAnim}
                stageHeight={inlineRevealStageHeight}
              />
            ) : hasHiddenReveal ? (
              <HiddenMatchRevealPanel
                hiddenMatchCount={hiddenMatchCount}
                isOpening={isNewestOpening}
                onReveal={revealNewestMatch}
                revealAnim={revealAnim}
              />
            ) : (
              <NoMatchEmptyState onOpenGameMode={onOpenGameMode} />
            )}
          </View>
        ) : null}

        {hasAnyMatch && !showInlineReveal ? (
          hasHiddenReveal ? (
            <>
              {revealedMatches.length ? (
                <View style={styles.matchList}>
                  {revealedMatches.map((card, index) => (
                    <MatchListItem card={card} index={index} key={card.id} onOpen={() => setSelectedMatch(card)} />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.matchListHeader}>
                <Text style={styles.matchListTitle}>Tous vos matchs</Text>
                <Text style={styles.matchListCount}>
                  {listedMatches.length} envie{listedMatches.length > 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.matchList}>
                {listedMatches.map((card, index) => (
                  <MatchListItem card={card} index={index} key={card.id} onOpen={() => setSelectedMatch(card)} />
                ))}
              </View>
            </>
          )
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

function MatchRevealTheater({
  couple,
  hiddenMatchCount,
  isOpening,
  match,
  onDismiss,
  onOpenChat,
  onOpenDetail,
  onReveal,
  revealAnim,
  stageHeight,
}: {
  couple: CoupleState;
  hiddenMatchCount: number;
  isOpening: boolean;
  match: DesireCard | null;
  onDismiss: () => void;
  onOpenChat: () => void;
  onOpenDetail: () => void;
  onReveal: () => void;
  revealAnim: Animated.Value;
  stageHeight: number;
}) {
  const revealBackdropOpacity = revealAnim.interpolate({
    inputRange: [0, 0.25, 1],
    outputRange: [0, 0.56, 1],
  });
  const hiddenOpacity = revealAnim.interpolate({
    inputRange: [0, 0.34, 0.62, 1],
    outputRange: [1, 0.82, 0, 0],
  });
  const hiddenScale = revealAnim.interpolate({
    inputRange: [0, 0.58, 1],
    outputRange: [1, 0.92, 0.88],
  });
  const hiddenLift = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -26],
  });
  const revealedOpacity = revealAnim.interpolate({
    inputRange: [0, 0.36, 0.68, 1],
    outputRange: [0, 0, 0.92, 1],
  });
  const revealedScale = revealAnim.interpolate({
    inputRange: [0, 0.44, 1],
    outputRange: [0.9, 0.9, 1],
  });
  const revealedLift = revealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [30, 0],
  });

  return (
    <View style={[styles.matchRevealTheater, { minHeight: stageHeight }]}>
      <Animated.View pointerEvents="none" style={[styles.matchRevealTheaterBackdrop, { opacity: revealBackdropOpacity }]} />
      <Animated.View
        pointerEvents={match ? "none" : "auto"}
        style={[
          styles.matchRevealHiddenLayer,
          {
            opacity: hiddenOpacity,
            transform: [
              { translateY: hiddenLift },
              { scale: hiddenScale },
            ],
          },
        ]}
      >
        <HiddenMatchRevealPanel
          hiddenMatchCount={hiddenMatchCount}
          isOpening={isOpening}
          onReveal={onReveal}
          revealAnim={revealAnim}
        />
      </Animated.View>
      {match ? (
        <Animated.View
          pointerEvents={isOpening ? "none" : "auto"}
          style={[
            styles.matchRevealRevealedLayer,
            {
              opacity: revealedOpacity,
              transform: [
                { translateY: revealedLift },
                { scale: revealedScale },
              ],
            },
          ]}
        >
          <MatchRevealedPanel
            couple={couple}
            inline
            match={match}
            onDismiss={onDismiss}
            onOpenChat={onOpenChat}
            onOpenDetail={onOpenDetail}
            revealAnim={revealAnim}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

function HiddenMatchRevealPanel({
  hiddenMatchCount,
  isOpening,
  onReveal,
  revealAnim,
}: {
  hiddenMatchCount: number;
  isOpening: boolean;
  onReveal: () => void;
  revealAnim: Animated.Value;
}) {
  const breathing = useLoop(1900);
  const cardScale = breathing.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  const cardLift = breathing.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
  const shineX = revealAnim.interpolate({ inputRange: [0, 1], outputRange: [-260, 320] });
  const otherHiddenCount = Math.max(0, hiddenMatchCount - 1);

  return (
    <View style={styles.hiddenRevealPanel}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.hiddenRevealCardStack,
          {
            transform: [
              { translateY: cardLift },
              { scale: cardScale },
            ],
          },
        ]}
      >
        <View style={[styles.hiddenRevealBackPlate, styles.hiddenRevealBackPlateLeft]} />
        <View style={[styles.hiddenRevealBackPlate, styles.hiddenRevealBackPlateRight]} />
        <View style={styles.hiddenRevealMysteryCard}>
          <View pointerEvents="none" style={styles.hiddenRevealPattern}>
            {hiddenMatchPatternDots.map((dot) => (
              <View key={dot} style={styles.hiddenRevealPatternDot} />
            ))}
          </View>
          {isOpening ? (
            <Animated.View pointerEvents="none" style={[styles.hiddenRevealShine, { transform: [{ translateX: shineX }, { rotate: "-14deg" }] }]} />
          ) : null}
          <View style={styles.hiddenRevealQuestionBadge}>
            <Text style={styles.hiddenRevealQuestionText}>?</Text>
          </View>
          <Text style={styles.hiddenRevealCardLabel}>Match caché</Text>
        </View>
      </Animated.View>

      <View style={styles.hiddenRevealCopy}>
        <Text style={styles.hiddenRevealTitle}>Un match vous attend.</Text>
        <Text style={styles.hiddenRevealText}>Ni titre, ni indice. Découvrez-le quand vous êtes prêts.</Text>
      </View>

      <SpringPressable
        disabled={isOpening}
        onPress={onReveal}
        style={[styles.hiddenRevealButton, isOpening && styles.hiddenRevealButtonDisabled]}
      >
        <Text style={styles.hiddenRevealButtonText}>{isOpening ? "Révélation..." : "Révéler le match"}</Text>
      </SpringPressable>

      <Text style={styles.hiddenRevealAdText}>
        Une courte pub avant la révélation · <Text style={styles.hiddenRevealAdLink}>Zéro pub</Text>
      </Text>

      {otherHiddenCount ? (
        <View style={styles.hiddenRevealPendingLine}>
          <View style={styles.hiddenRevealPendingDot} />
          <Text style={styles.hiddenRevealPendingText}>
            {otherHiddenCount} autre{otherHiddenCount > 1 ? "s" : ""} envie{otherHiddenCount > 1 ? "s" : ""} en attente d'alignement
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function MatchRevealedPanel({
  couple,
  inline,
  match,
  onDismiss,
  onOpenChat,
  onOpenDetail,
  revealAnim,
}: {
  couple: CoupleState;
  inline?: boolean;
  match: DesireCard;
  onDismiss?: () => void;
  onOpenChat: () => void;
  onOpenDetail: () => void;
  revealAnim?: Animated.Value;
}) {
  const activeId = couple.activePartnerId;
  const partnerId = otherPartnerId(activeId);
  const partnerName = couple.profiles[partnerId].displayName || "Partenaire";
  const activeVote = couple.votes[activeId][match.id];
  const partnerVote = couple.votes[partnerId][match.id];
  const activeVoteText = isFlameVote(activeVote) ? "Très envie 🔥" : voteRevealLabel(activeVote);
  const partnerVoteText = isFlameVote(partnerVote) ? "Très envie 🔥" : voteRevealLabel(partnerVote);
  const heroMotionStyle = revealAnim ? {
    opacity: revealAnim.interpolate({
      inputRange: [0, 0.52, 0.78, 1],
      outputRange: [0, 0, 1, 1],
    }),
    transform: [
      {
        translateY: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [18, 0],
        }),
      },
    ],
  } : null;
  const cardMotionStyle = revealAnim ? {
    opacity: revealAnim.interpolate({
      inputRange: [0, 0.42, 0.7, 1],
      outputRange: [0, 0, 1, 1],
    }),
    transform: [
      {
        translateY: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [34, 0],
        }),
      },
      {
        scale: revealAnim.interpolate({
          inputRange: [0, 0.66, 1],
          outputRange: [0.86, 1.035, 1],
        }),
      },
    ],
  } : null;
  const actionsMotionStyle = revealAnim ? {
    opacity: revealAnim.interpolate({
      inputRange: [0, 0.7, 1],
      outputRange: [0, 0, 1],
    }),
    transform: [
      {
        translateY: revealAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [30, 0],
        }),
      },
      {
        scale: revealAnim.interpolate({
          inputRange: [0, 0.78, 1],
          outputRange: [0.94, 0.94, 1],
        }),
      },
    ],
  } : null;

  return (
    <LinearGradient colors={[candy.darkColor, "#210D27", "#16051A"]} style={[styles.matchRevealedPanel, inline && styles.matchRevealedPanelInline]}>
      <View pointerEvents="none" style={styles.matchRevealedDecor}>
        <View style={styles.matchRevealedAura} />
        <View style={[styles.matchRevealedSparkDot, styles.matchRevealedSparkDotOne]} />
        <View style={[styles.matchRevealedSparkDot, styles.matchRevealedSparkDotTwo]} />
        <View style={[styles.matchRevealedSparkDash, styles.matchRevealedSparkDashOne]} />
        <View style={[styles.matchRevealedSparkDash, styles.matchRevealedSparkDashTwo]} />
      </View>

      <Animated.View style={[styles.matchRevealedHeroCopy, heroMotionStyle]}>
        <Text style={styles.matchRevealedHeadline}>
          C'est un match<Text style={styles.matchRevealedHeadlineDot}>.</Text>
        </Text>
        <View style={styles.matchRevealedSubRow}>
          <View style={styles.matchRevealedSubDot} />
          <Text style={styles.matchRevealedSubtitle}>Vous avez répondu oui, tous les deux.</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.matchRevealedCardMotion, cardMotionStyle]}>
        <SpringPressable onPress={onOpenDetail} style={styles.matchRevealedCardShell}>
          <View pointerEvents="none" style={styles.matchRevealedCardGlow} />
          <View pointerEvents="none" style={styles.matchRevealedSidePeek} />
          <View pointerEvents="none" style={styles.matchRevealedTopDot} />
          <View style={styles.matchRevealedBigCard}>
            <Text style={styles.matchRevealedCategory}>{categoryLabel(match.category)}</Text>
            <View style={styles.matchRevealedCornerDot} />
            <Text numberOfLines={5} style={styles.matchRevealedCardTitle}>{match.title}</Text>
            <View style={styles.matchRevealedAnswerRow}>
              <MatchAnswerPill label="Toi" mine value={activeVoteText} />
              <MatchAnswerPill label={partnerName} value={partnerVoteText} />
            </View>
          </View>
        </SpringPressable>
      </Animated.View>

      <Animated.View style={[styles.matchRevealedActionBlock, actionsMotionStyle]}>
        <SpringPressable onPress={onOpenChat} style={styles.matchRevealedChatButton}>
          <Text style={styles.matchRevealedChatText}>En parler maintenant</Text>
        </SpringPressable>
        <SpringPressable onPress={onDismiss ?? onOpenDetail} style={styles.matchRevealedLaterButton}>
          <Text style={styles.matchRevealedLaterText}>Plus tard</Text>
        </SpringPressable>
      </Animated.View>
    </LinearGradient>
  );
}

function MatchAnswerPill({ label, mine, value }: { label: string; mine?: boolean; value: string }) {
  return (
    <View style={[styles.matchAnswerPill, mine ? styles.matchAnswerPillMine : styles.matchAnswerPillPartner]}>
      <Text numberOfLines={1} style={[styles.matchAnswerLabel, mine && styles.matchAnswerLabelMine]}>{label}</Text>
      <Text numberOfLines={2} style={[styles.matchAnswerValue, mine && styles.matchAnswerValueMine]}>{value}</Text>
    </View>
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

  if (!isOpen) {
    return (
      <View style={[styles.matchRevealCard, styles.matchRevealLockedCard]}>
        <Animated.View pointerEvents="none" style={[styles.matchRevealLockedGlow, { transform: [{ scale: glowScale }] }]} />
        {isOpening ? (
          <Animated.View pointerEvents="none" style={[styles.matchRevealShine, { transform: [{ translateX: shineX }, { rotate: "-16deg" }] }]} />
        ) : null}
        <View style={styles.matchRevealLockedBody}>
          <View style={styles.matchRevealLockedIcon}>
            <EmojiSticker emoji={stickers.lock} size={58} />
          </View>
          <View style={styles.matchRevealLockedCopy}>
            <Text style={styles.matchRevealLockedLabel}>À ouvrir</Text>
            <Text style={styles.matchRevealLockedTitle}>{isOpening ? "Révélation..." : "Envie commune cachée"}</Text>
            <Text style={styles.matchRevealLockedText}>Le titre reste masqué jusqu'à ton ouverture.</Text>
          </View>
        </View>
        <View style={styles.matchRevealLockedFooter}>
          <View style={styles.matchRevealMeter}>
            <Animated.View
              style={[
                styles.matchRevealMeterFill,
                isOpening ? { transform: [{ translateX: meterX }] } : styles.matchRevealMeterFillIdle,
              ]}
            />
          </View>
          <WsButton
            disabled={isOpening}
            label={isOpening ? "..." : "Ouvrir"}
            left={<Sparkles size={17} color={candy.white} />}
            onPress={onReveal}
            size="sm"
            style={styles.matchRevealButton}
            variant="hot"
          />
        </View>
      </View>
    );
  }

  if (!match) {
    return null;
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
  const safeAreaInsets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const detailSideInset = viewportWidth >= 700 ? 22 : viewportWidth >= 520 ? 20 : 18;
  const detailStageMaxWidth = Math.min(334, Math.max(0, viewportWidth - detailSideInset * 2));
  const detailContentMinHeight = Math.max(0, viewportHeight - safeAreaInsets.top - safeAreaInsets.bottom);
  const detailVerticalPadding = Math.round(Math.min(54, Math.max(20, viewportHeight * 0.045)));
  const detailActionTopGap = Math.round(Math.min(46, Math.max(26, viewportHeight * 0.035)));
  const detailBottomPadding = Math.max(18, safeAreaInsets.bottom + detailVerticalPadding);

  if (!match) {
    return null;
  }

  const activeId = couple.activePartnerId;
  const partnerId = otherPartnerId(activeId);
  const partnerName = couple.profiles[partnerId].displayName || "Partenaire";
  const activeVote = couple.votes[activeId][match.id];
  const partnerVote = couple.votes[partnerId][match.id];
  const activeVoteText = isFlameVote(activeVote) ? "Très envie 🔥" : voteRevealLabel(activeVote);
  const partnerVoteText = isFlameVote(partnerVote) ? "Très envie 🔥" : voteRevealLabel(partnerVote);

  return (
    <Modal animationType="slide" transparent={false} visible onRequestClose={onClose}>
      <LinearGradient colors={[candy.darkColor, "#210D27", "#16051A"]} style={styles.matchDetailScreen}>
        <View pointerEvents="none" style={styles.matchDetailFx}>
          <View style={[styles.matchDetailGlow, styles.matchDetailGlowTop]} />
          <View style={[styles.matchDetailGlow, styles.matchDetailGlowBottom]} />
          <View style={[styles.matchRevealedSparkDot, styles.matchRevealedSparkDotOne]} />
          <View style={[styles.matchRevealedSparkDot, styles.matchRevealedSparkDotTwo]} />
          <View style={[styles.matchRevealedSparkDash, styles.matchRevealedSparkDashOne]} />
          <View style={[styles.matchRevealedSparkDash, styles.matchRevealedSparkDashTwo]} />
        </View>
        <SafeAreaView style={styles.matchDetailSafe}>
          <ScrollView
            contentContainerStyle={[
              styles.matchDetailContent,
              {
                minHeight: detailContentMinHeight,
                paddingBottom: detailBottomPadding,
                paddingHorizontal: detailSideInset,
                paddingTop: detailVerticalPadding,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={[styles.matchDetailStage, { maxWidth: detailStageMaxWidth }]}>
              <View style={styles.matchRevealedHeroCopy}>
                <Text style={styles.matchRevealedHeadline}>
                  C'est un match<Text style={styles.matchRevealedHeadlineDot}>.</Text>
                </Text>
                <View style={styles.matchRevealedSubRow}>
                  <View style={styles.matchRevealedSubDot} />
                  <Text style={styles.matchRevealedSubtitle}>Vous avez répondu oui, tous les deux.</Text>
                </View>
              </View>

              <View style={styles.matchRevealedCardShell}>
                <View pointerEvents="none" style={styles.matchRevealedCardGlow} />
                <View pointerEvents="none" style={styles.matchRevealedSidePeek} />
                <View pointerEvents="none" style={styles.matchRevealedTopDot} />
                <View style={styles.matchRevealedBigCard}>
                  <Text style={styles.matchRevealedCategory}>{categoryLabel(match.category)}</Text>
                  <View style={styles.matchRevealedCornerDot} />
                  <Text numberOfLines={5} style={styles.matchRevealedCardTitle}>{match.title}</Text>
                  <View style={styles.matchRevealedAnswerRow}>
                    <MatchAnswerPill label="Toi" mine value={activeVoteText} />
                    <MatchAnswerPill label={partnerName} value={partnerVoteText} />
                  </View>
                </View>
              </View>
            </View>

            <View style={[styles.matchDetailActions, { marginTop: detailActionTopGap, maxWidth: detailStageMaxWidth }]}>
              <SpringPressable onPress={() => onOpenChat(match.id)} style={styles.matchDetailPrimaryAction}>
                <Text style={styles.matchDetailPrimaryText}>En parler maintenant</Text>
              </SpringPressable>
              <SpringPressable onPress={onClose} style={styles.matchDetailSecondaryAction}>
                <Text style={styles.matchDetailSecondaryText}>Plus tard</Text>
              </SpringPressable>
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

function HiddenMatchPendingRow({
  index,
  isOpening,
  label,
  onPress,
}: {
  index: number;
  isOpening: boolean;
  label: string;
  onPress?: () => void;
}) {
  return (
    <Entrance delay={index * 50}>
      <SpringPressable
        disabled={!onPress || isOpening}
        onPress={onPress}
        style={[styles.matchPendingRow, isOpening && styles.matchPendingRowOpening]}
      >
        <View style={styles.matchPendingQuestion}>
          <Text style={styles.matchPendingQuestionText}>?</Text>
        </View>
        <View style={styles.matchPendingCopy}>
          <View style={styles.matchPendingBlurWide} />
          <View style={styles.matchPendingBlurShort} />
          <Text numberOfLines={1} style={styles.matchPendingText}>{isOpening ? "Révélation..." : label}</Text>
        </View>
      </SpringPressable>
    </Entrance>
  );
}

function NoMatchEmptyState({ onOpenGameMode }: { onOpenGameMode: () => void }) {
  return (
    <Entrance delay={80} style={styles.matchEmptyEntrance}>
      <View style={styles.matchEmpty}>
        <View pointerEvents="none" style={styles.matchEmptySymbol}>
          <View style={[styles.matchEmptyCircle, styles.matchEmptyCircleSoft]} />
          <View style={[styles.matchEmptyCircle, styles.matchEmptyCircleHot]} />
        </View>
        <Text style={styles.matchEmptyTitle}>Pas encore de match</Text>
        <Text style={styles.matchEmptyText}>
          Répondez à quelques cartes chacun de votre côté. Ça finit toujours par matcher.
        </Text>
        <SpringPressable onPress={onOpenGameMode} style={styles.matchEmptyCTA}>
          <Text style={styles.matchEmptyCTAText}>Jouer</Text>
        </SpringPressable>
      </View>
    </Entrance>
  );
}

function ChatUnavailableScreen({
  bottomNavInset,
  onBack,
  onGoCouple,
}: {
  bottomNavInset: number;
  onBack: () => void;
  onGoCouple: () => void;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const bottomPadding = Math.max(130, safeAreaInsets.bottom + bottomNavInset + 22);

  return (
    <View
      style={[
        styles.chatUnavailableScreen,
        {
          paddingBottom: bottomPadding,
          paddingTop: Math.max(18, safeAreaInsets.top + 12),
        },
      ]}
    >
      <SpringPressable onPress={onBack} style={styles.chatUnavailableBack}>
        <ArrowLeft size={18} color={candy.cream} />
      </SpringPressable>

      <View style={styles.chatUnavailableCenter}>
        <View style={styles.chatUnavailableIcon}>
          <MessageCircle size={44} color={candy.yellow} strokeWidth={2.8} />
          <View style={styles.chatUnavailableLock}>
            <LockKeyhole size={16} color={candy.black} strokeWidth={2.8} />
          </View>
        </View>
        <Text style={styles.chatUnavailableTitle}>Chat impossible pour l'instant.</Text>
        <Text style={styles.chatUnavailableText}>
          Il faut être deux dans le même espace pour ouvrir une conversation privée.
        </Text>
        <SpringPressable onPress={onGoCouple} style={styles.chatUnavailablePrimary}>
          <Text style={styles.chatUnavailablePrimaryText}>Inviter ou rejoindre</Text>
        </SpringPressable>
      </View>
    </View>
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
  bottomNavInset,
  contextCardId,
  couple,
  onConsumePhoto,
  onBack,
  onQueuePhotoConsumption,
  onSendMessage,
}: {
  bottomNavInset: number;
  contextCardId?: string;
  couple: CoupleState;
  onConsumePhoto: (payload: { attachmentId: string; messageId: string }) => void | Promise<void>;
  onBack: () => void;
  onQueuePhotoConsumption: (payload: { attachmentId: string; delayMs?: number; messageId: string }) => void | Promise<void>;
  onSendMessage: (message: { attachments: ChatAttachment[]; body: string }) => void;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const [draft, setDraft] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [activePhoto, setActivePhoto] = useState<{ attachment: ChatAttachment; messageId: string } | null>(null);
  const [photoOptimizing, setPhotoOptimizing] = useState(false);
  const activePhotoRef = useRef(activePhoto);
  const activeId = couple.activePartnerId;
  const partnerId = otherPartnerId(activeId);
  const partnerName = couple.profiles[partnerId].displayName;
  const meInitial = (couple.profiles.me.displayName.trim()[0] ?? "M").toUpperCase();
  const partnerInitial = (couple.profiles.partner.displayName.trim()[0] ?? "L").toUpperCase();
  const pairName = `${couple.profiles.me.displayName} & ${couple.profiles.partner.displayName}`;
  const todayLabel = `Aujourd'hui, ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
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
  const canSendMessage = hasMessageContent && !photoOptimizing;
  const composerBottomPadding = Math.max(bottomNavInset, safeAreaInsets.bottom + TAB_DOCK_VISIBLE_HEIGHT + CHAT_COMPOSER_NAV_GAP);
  const scrollBottomPadding = Math.max(22, safeAreaInsets.bottom + 14);
  const quickPrompts = useMemo(() => chatSuggestionPrompts({
    contextCard,
    hasMessages,
    partnerName,
  }), [contextCard, hasMessages, partnerName]);

  useEffect(() => {
    activePhotoRef.current = activePhoto;
  }, [activePhoto]);

  const consumeActivePhoto = useCallback(() => {
    const photo = activePhotoRef.current;

    if (!photo) {
      return;
    }

    activePhotoRef.current = null;
    setActivePhoto(null);
    void onConsumePhoto({ attachmentId: photo.attachment.id, messageId: photo.messageId });
  }, [onConsumePhoto]);

  const openPhoto = useCallback(
    (attachment: ChatAttachment, messageId: string) => {
      setActivePhoto({ attachment, messageId });
      void onQueuePhotoConsumption({ attachmentId: attachment.id, delayMs: EPHEMERAL_PHOTO_VIEW_MS, messageId });
    },
    [onQueuePhotoConsumption],
  );

  async function pickPhoto() {
    const remainingSlots = Math.max(0, 4 - pendingAttachments.length);

    if (photoOptimizing || remainingSlots <= 0) {
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert("Accès photos", "Autorise l'accès à tes photos pour envoyer une image dans le chat.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      selectionLimit: remainingSlots,
    });

    if (result.canceled) {
      return;
    }

    setPhotoOptimizing(true);

    try {
      const pickedAt = Date.now();
      const nextAttachments = await Promise.all(result.assets.slice(0, remainingSlots).map(async (asset, index) => {
        const attachment: ChatAttachment = {
          height: asset.height,
          id: `photo-${pickedAt}-${index}`,
          mimeType: asset.mimeType,
          name: asset.fileName ?? "Photo",
          sizeBytes: asset.fileSize,
          type: "image" as const,
          uri: asset.uri,
          width: asset.width,
        };

        try {
          return await compressChatAttachmentForUpload(attachment);
        } catch (error) {
          console.warn("Photo compression failed, keeping original asset", error);
          return attachment;
        }
      }));

      setPendingAttachments((current) => [...current, ...nextAttachments].slice(0, 4));
      await Haptics.selectionAsync();
    } finally {
      setPhotoOptimizing(false);
    }
  }

  async function send() {
    if (!canSendMessage) {
      return;
    }

    await onSendMessage({ attachments: pendingAttachments, body: draft });
    setDraft("");
    setPendingAttachments([]);
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <View style={styles.chatFrame}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.chatScreen,
            {
              paddingBottom: scrollBottomPadding,
              paddingTop: Math.max(14, safeAreaInsets.top + 8),
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.chatScroller}
        >
          <View style={styles.chatHero}>
            <View style={styles.chatHeaderIdentity}>
              <SpringPressable onPress={onBack} style={styles.chatBackButton}>
                <ArrowLeft size={18} color={candy.cream} strokeWidth={3} />
              </SpringPressable>
              <View style={styles.chatHeaderAvatarStack}>
                <View style={[styles.chatHeaderMiniAvatar, styles.chatHeaderMiniAvatarMine]}>
                  <Text style={styles.chatHeaderMiniAvatarText}>{meInitial}</Text>
                </View>
                <View style={[styles.chatHeaderMiniAvatar, styles.chatHeaderMiniAvatarPartner]}>
                  <Text style={[styles.chatHeaderMiniAvatarText, styles.chatHeaderMiniAvatarTextDark]}>{partnerInitial}</Text>
                </View>
              </View>
              <View style={styles.chatHeaderCopy}>
                <Text numberOfLines={1} style={styles.chatHeaderName}>{pairName}</Text>
                <View style={styles.chatHeaderMetaRow}>
                  <Text numberOfLines={1} style={styles.chatHeaderMetaPill}>Éphémère · s'efface demain à 6:00</Text>
                </View>
              </View>
            </View>
            {contextCard ? (
              <View style={styles.chatContext}>
                <View style={styles.chatContextSticker}>
                  <View style={styles.chatContextDiamond} />
                </View>
                <View style={styles.chatContextCopy}>
                  <Text style={styles.chatContextLabel}>À propos de votre match</Text>
                  <Text style={styles.chatContextTitle}>{contextCard.title}</Text>
                </View>
              </View>
            ) : null}
          </View>

          <View style={styles.chatDateDivider}>
            <Text style={styles.chatDateText}>{todayLabel}</Text>
          </View>

          <View style={styles.chatMessages}>
            {messages.length ? (
              messages.map((message, index) => (
                <Entrance delay={Math.min(index * 55, 260)} key={message.id}>
                  <ChatBubble
                    message={message}
                    mine={message.authorId === activeId}
                    name={couple.profiles[message.authorId].displayName}
                    onOpenPhoto={(attachment) => openPhoto(attachment, message.id)}
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

        <View pointerEvents="box-none" style={[styles.chatComposerDock, { paddingBottom: composerBottomPadding }]}>
          {!hasMessageContent && !hasMessages ? (
            <View style={styles.chatSuggestionPanel}>
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
            <SpringPressable
              disabled={photoOptimizing || pendingAttachments.length >= 4}
              onPress={pickPhoto}
              style={[styles.chatIconButton, (photoOptimizing || pendingAttachments.length >= 4) && styles.chatIconButtonDisabled]}
              testID="chat-photo-button"
            >
              {photoOptimizing ? (
                <ActivityIndicator color={candy.cream} size="small" />
              ) : (
                <Camera size={20} color={candy.cream} />
              )}
            </SpringPressable>
            <TextInput
              multiline
              onChangeText={setDraft}
              placeholder="Message éphémère..."
              placeholderTextColor="rgba(124,75,105,0.58)"
              style={[styles.chatInput, Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : null]}
              testID="chat-input"
              value={draft}
            />
            <SpringPressable
              disabled={!canSendMessage}
              onPress={send}
              style={[styles.chatSendButton, !canSendMessage && styles.chatSendButtonDisabled]}
              testID="chat-send-button"
            >
              <Send size={19} color={candy.white} />
            </SpringPressable>
          </View>
        </View>
        <EphemeralPhotoViewer
          photo={activePhoto}
          onConsume={consumeActivePhoto}
        />
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

const ChatBubble = React.memo(function ChatBubble({
  message,
  mine,
  name,
  onOpenPhoto,
}: {
  message: ChatMessage;
  mine: boolean;
  name: string;
  onOpenPhoto?: (attachment: ChatAttachment) => void;
}) {
  const sentAt = new Date(message.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const deliveryLabel = message.deliveryStatus === "sending"
    ? "Envoi en cours..."
    : message.deliveryStatus === "queued"
      ? "En attente d'envoi"
      : message.deliveryStatus === "failed"
        ? "Non envoyé, réessaiera automatiquement"
        : "";
  const metaLabel = deliveryLabel
    ? `${sentAt} · ${deliveryLabel}`
    : sentAt;

  return (
    <View style={[styles.chatBubbleRow, mine && styles.chatBubbleRowMine]}>
      <View style={[styles.chatBubble, mine && styles.chatBubbleMine]}>
        <Text style={[styles.chatBubbleName, mine && styles.chatBubbleNameMine]}>{mine ? "Toi" : name}</Text>
        {message.attachments.length ? (
          <View style={styles.chatBubblePhotos}>
            {message.attachments.map((attachment) => {
              if (attachment.disappeared) {
                return (
                  <View key={attachment.id} style={[styles.chatBubblePhoto, styles.chatPhotoGone]}>
                    <LockKeyhole size={20} color={mine ? candy.white : candy.red} />
                    <Text style={[styles.chatPhotoGoneText, mine && styles.chatPhotoGoneTextMine]}>Photo disparue</Text>
                  </View>
                );
              }

              if (!attachment.uri) {
                return (
                  <View key={attachment.id} style={[styles.chatBubblePhoto, styles.chatPhotoUnavailable]}>
                    <ImagePlus size={20} color={mine ? candy.white : candy.red} />
                    <Text style={[styles.chatPhotoGoneText, mine && styles.chatPhotoGoneTextMine]}>Photo indisponible</Text>
                  </View>
                );
              }

              if (!mine) {
                return (
                  <SpringPressable
                    key={attachment.id}
                    onPress={() => onOpenPhoto?.(attachment)}
                    style={styles.chatPhotoRevealButton}
                  >
                    <Image
                      blurRadius={18}
                      resizeMode="cover"
                      source={{ uri: attachment.uri }}
                      style={styles.chatPhotoRevealImage}
                    />
                    <View style={styles.chatPhotoBlurOverlay}>
                      <View style={styles.chatPhotoEye}>
                        <Eye size={18} color={candy.cream} />
                      </View>
                      <Text style={styles.chatPhotoRevealLabel}>Photo privée · vue unique · 10 s</Text>
                    </View>
                  </SpringPressable>
                );
              }

              return <Image key={attachment.id} resizeMode="cover" source={{ uri: attachment.uri }} style={styles.chatBubblePhoto} />;
            })}
          </View>
        ) : null}
        {message.body ? <Text style={[styles.chatBubbleText, mine && styles.chatBubbleTextMine]}>{message.body}</Text> : null}
        <Text
          style={[
            styles.chatBubbleMeta,
            mine && styles.chatBubbleMetaMine,
            message.deliveryStatus && styles.chatBubbleMetaPending,
            message.deliveryStatus === "failed" && styles.chatBubbleMetaFailed,
          ]}
        >
          {metaLabel}
        </Text>
      </View>
    </View>
  );
});

function EphemeralPhotoViewer({
  photo,
  onConsume,
}: {
  photo: { attachment: ChatAttachment; messageId: string } | null;
  onConsume: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(10);
  const consumedRef = useRef(false);

  const finish = useCallback(() => {
    if (consumedRef.current) {
      return;
    }

    consumedRef.current = true;
    onConsume();
  }, [onConsume]);

  useEffect(() => {
    if (!photo) {
      return undefined;
    }

    consumedRef.current = false;
    setSecondsLeft(Math.ceil(EPHEMERAL_PHOTO_VIEW_MS / 1000));
    const startedAt = Date.now();
    const interval = setInterval(() => {
      const remainingMs = Math.max(0, EPHEMERAL_PHOTO_VIEW_MS - (Date.now() - startedAt));
      setSecondsLeft(Math.ceil(remainingMs / 1000));
    }, 250);
    const timeout = setTimeout(finish, EPHEMERAL_PHOTO_VIEW_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [finish, photo?.attachment.id]);

  if (!photo || !photo.attachment.uri) {
    return null;
  }

  return (
    <Modal animationType="fade" onRequestClose={finish} transparent visible>
      <View style={styles.ephemeralPhotoBackdrop}>
        <View style={styles.ephemeralPhotoTopBar}>
          <View style={styles.ephemeralPhotoTimer}>
            <LockKeyhole size={16} color={candy.white} />
            <Text style={styles.ephemeralPhotoTimerText}>{Math.max(secondsLeft, 1)}s</Text>
          </View>
          <SpringPressable onPress={finish} style={styles.ephemeralPhotoClose}>
            <X size={20} color={candy.white} />
          </SpringPressable>
        </View>
        <Image resizeMode="contain" source={{ uri: photo.attachment.uri }} style={styles.ephemeralPhoto} />
        <Text style={styles.ephemeralPhotoHint}>La photo disparaît après ouverture.</Text>
      </View>
    </Modal>
  );
}

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

      <LinearGradient colors={[candy.red, "#D9165B", candy.black]} style={styles.rulesPromise}>
        <Sparkles size={24} color={candy.white} />
        <Text style={styles.rulesPromiseTitle}>Simple, clair, sans pression.</Text>
        <Text style={styles.rulesPromiseText}>
          Une envie révélée n'est jamais une obligation. C'est une conversation qui peut commencer.
        </Text>
      </LinearGradient>
    </ScrollView>
  );
}

function homeLayoutMetrics(
  viewportHeight: number,
  viewportWidth: number,
  safeAreaInsets: { bottom: number; top: number },
) {
  const frameHeight = Math.max(0, viewportHeight - safeAreaInsets.top - safeAreaInsets.bottom);
  const widthScale = Math.min(1.12, Math.max(0.88, viewportWidth / 390));
  const verticalScale = Math.min(1.18, Math.max(0.84, frameHeight / 812));
  const scale = Math.min(1.18, Math.max(0.86, widthScale * 0.64 + verticalScale * 0.36));
  const targetRhythm = 42;
  const headerHeight = 57 * scale;
  const navVisibleHeight = TAB_DOCK_VISIBLE_HEIGHT;
  const titleLineHeight = 59 * scale;
  const moodButtonHeight = 47 * scale;
  const adviceHeight = Math.min(94, Math.max(78, 92 * verticalScale));
  const baseStorePackHeight = Math.min(60, Math.max(52, 60 * verticalScale));
  const storePackHeight = baseStorePackHeight * 1.3;
  const storeHeaderHeight = 27 * scale;
  const storeInternalGap = 7 * verticalScale;
  const storeHeight = storeHeaderHeight + storeInternalGap + storePackHeight;
  const baseStoreHeight = storeHeaderHeight + storeInternalGap + baseStorePackHeight;
  const baseMinimumCardHeight = 112 * verticalScale;
  const baseMaxRhythm = (
    frameHeight
    - headerHeight
    - navVisibleHeight
    - titleLineHeight * 2
    - moodButtonHeight
    - baseMinimumCardHeight
    - adviceHeight
    - baseStoreHeight
  ) / 7;
  const baseRhythm = Math.min(targetRhythm, Math.max(8, baseMaxRhythm));
  const baseTopPadding = baseRhythm + headerHeight + baseRhythm;
  const baseBottomPadding = navVisibleHeight + baseRhythm * 2;
  const baseAvailableHeight = Math.max(0, frameHeight - baseTopPadding - baseBottomPadding - baseRhythm * 3);
  const baseHeroHeight = titleLineHeight * 2 + baseRhythm + moodButtonHeight;
  const baseSurpriseHeight = Math.max(0, baseAvailableHeight - baseHeroHeight - adviceHeight - baseStoreHeight);
  const targetSurpriseHeight = baseSurpriseHeight * 0.7;
  const maxRhythm = (
    frameHeight
    - headerHeight
    - navVisibleHeight
    - titleLineHeight * 2
    - moodButtonHeight
    - targetSurpriseHeight
    - adviceHeight
    - storeHeight
  ) / 7;
  const rhythm = Math.min(targetRhythm, Math.max(8, maxRhythm));
  const topPadding = rhythm + headerHeight + rhythm;
  const bottomPadding = navVisibleHeight + rhythm * 2;
  const availableHeight = Math.max(0, frameHeight - topPadding - bottomPadding - rhythm * 3);
  const heroHeight = titleLineHeight * 2 + rhythm + moodButtonHeight;
  const surpriseHeight = Math.max(0, availableHeight - heroHeight - adviceHeight - storeHeight);

  return {
    adviceHeight,
    bottomPadding,
    frameHeight,
    heroHeight,
    rhythm,
    scale,
    storeHeight,
    surpriseHeight,
    topPadding,
    verticalScale,
    widthScale,
  };
}

function HomeScreen({
  couple,
  onGoEnvies,
  onMoodChange,
  onMoodNotificationPreference,
  onOpenEnvieCard,
  onOpenProfile,
  onRestorePurchases,
  onUnlockCustomCards,
  onUnlockCategory,
  onUnlockNoAds,
  onUnlockUnlimitedResponses,
}: {
  couple: CoupleState;
  onGoEnvies: () => void;
  onMoodChange: (level: CoupleMoodLevel) => void;
  onMoodNotificationPreference: (enabled: boolean) => void;
  onOpenEnvieCard: (card: DesireCard) => void;
  onOpenProfile: () => void;
  onRestorePurchases: () => void;
  onUnlockCustomCards: () => void;
  onUnlockCategory: (category: DesireCategory) => void;
  onUnlockNoAds: () => void;
  onUnlockUnlimitedResponses: () => void;
}) {
  const [purchaseCategory, setPurchaseCategory] = useState<DesireCategory | null>(null);
  const [customPurchaseOpen, setCustomPurchaseOpen] = useState(false);
  const [noAdsPurchaseOpen, setNoAdsPurchaseOpen] = useState(false);
  const [unlimitedPurchaseOpen, setUnlimitedPurchaseOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [moodSheetOpen, setMoodSheetOpen] = useState(false);
  const homeScrollY = useRef(new Animated.Value(0)).current;
  const [homeHeaderDetached, setHomeHeaderDetached] = useState(false);
  const safeAreaInsets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const homeFontScale = PixelRatio.getFontScale();
  const {
    adviceHeight: homeAdviceHeight,
    bottomPadding: homeBottomPadding,
    frameHeight: homeFrameHeight,
    heroHeight: homeHeroHeight,
    rhythm: homeRhythm,
    scale: homeScale,
    storeHeight: homeStoreHeight,
    surpriseHeight: homeSurpriseHeight,
    topPadding: homeTopPadding,
    verticalScale: homeVerticalScale,
    widthScale: homeWidthScale,
  } = homeLayoutMetrics(viewportHeight, viewportWidth, safeAreaInsets);
  const homeScrollFallback = (
    homeFontScale > 1.08
    || viewportWidth < 360
    || homeFrameHeight < 690
    || homeRhythm <= 10
    || homeSurpriseHeight < 132
  );
  const activeProfile = couple.profiles[couple.activePartnerId];
  const homeHeaderOpacity = useMemo(
    () => homeScrollY.interpolate({
      extrapolate: "clamp",
      inputRange: [0, 28, 78],
      outputRange: [1, 0.82, 0],
    }),
    [homeScrollY],
  );
  const homeContentStyle = useMemo<ViewStyle>(() => ({
    flexGrow: 1,
    gap: homeRhythm,
    justifyContent: "flex-start",
    minHeight: homeFrameHeight,
    overflow: homeScrollFallback ? "visible" : "hidden",
    paddingBottom: homeScrollFallback ? homeBottomPadding + homeRhythm : homeBottomPadding,
    paddingHorizontal: 14 * homeWidthScale,
    paddingTop: homeTopPadding,
    ...(homeScrollFallback ? {} : { height: homeFrameHeight }),
  }), [homeBottomPadding, homeFrameHeight, homeRhythm, homeScrollFallback, homeTopPadding, homeWidthScale]);
  const handleHomeScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollY = Math.max(0, event.nativeEvent.contentOffset.y);

    homeScrollY.setValue(scrollY);
    setHomeHeaderDetached((current) => {
      const detached = scrollY > 70;
      return current === detached ? current : detached;
    });
  }, [homeScrollY]);

  return (
    <>
      <View style={styles.homeFrame}>
        <ScrollView
          contentContainerStyle={[styles.screen, styles.homeScreen, homeContentStyle]}
          contentInsetAdjustmentBehavior="automatic"
          onScroll={handleHomeScroll}
          scrollEventThrottle={16}
          scrollEnabled={homeScrollFallback}
          showsVerticalScrollIndicator={false}
        >
          <Entrance delay={40}>
            <HomeMoodHero
              couple={couple}
              onChange={onMoodChange}
              onOpenMoodPanel={() => setMoodSheetOpen(true)}
              height={homeHeroHeight}
              rhythm={homeRhythm}
              scale={homeScale}
            />
          </Entrance>
          <Entrance delay={100}>
            <HomeSurpriseDeck
              couple={couple}
              onGoEnvies={onGoEnvies}
              height={homeSurpriseHeight}
              onOpenCard={onOpenEnvieCard}
              scale={homeScale}
              verticalScale={homeVerticalScale}
            />
          </Entrance>
          <Entrance delay={160}>
            <HomeDailyAdvice couple={couple} height={homeAdviceHeight} scale={homeScale} verticalScale={homeVerticalScale} />
          </Entrance>
          <Entrance delay={220}>
            <HomeStoreModule
              couple={couple}
              height={homeStoreHeight}
              onGoEnvies={onGoEnvies}
              onOpenStore={() => setStoreOpen(true)}
              scale={homeScale}
              verticalScale={homeVerticalScale}
            />
          </Entrance>
        </ScrollView>
        <Animated.View
          pointerEvents={homeHeaderDetached ? "none" : "box-none"}
          style={[
            styles.homeFloatingHeader,
            {
              left: 14 * homeWidthScale,
              opacity: homeHeaderOpacity,
              right: 14 * homeWidthScale,
              top: homeRhythm,
            },
          ]}
        >
          <View style={styles.homeHeroTop}>
            <View style={[styles.homeBrandPill, { minHeight: 54 * homeScale, paddingHorizontal: 27 * homeScale }]}>
              <Text style={[styles.homeBrandText, { fontSize: 21 * homeScale, lineHeight: 26 * homeScale }]}>WeSpice</Text>
            </View>
            <SpringPressable onPress={onOpenProfile} style={styles.homeProfileButton}>
              <View style={[styles.homeProfileBubble, { height: 57 * homeScale, width: 57 * homeScale }]}>
                <Text style={[styles.homeProfileIcon, { fontSize: 27 * homeScale, lineHeight: 33 * homeScale }]}>{profileEmoji(activeProfile)}</Text>
              </View>
            </SpringPressable>
          </View>
        </Animated.View>
      </View>
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
        onRestorePurchases={onRestorePurchases}
        visible={storeOpen}
      />
      <HomeMoodSettingsSheet
        couple={couple}
        onClose={() => setMoodSheetOpen(false)}
        onMoodChange={onMoodChange}
        onMoodNotificationPreference={onMoodNotificationPreference}
        visible={moodSheetOpen}
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

function HomeMoodHero({
  couple,
  height,
  onChange,
  onOpenMoodPanel,
  rhythm,
  scale,
}: {
  couple: CoupleState;
  height: number;
  onChange: (level: CoupleMoodLevel) => void;
  onOpenMoodPanel: () => void;
  rhythm: number;
  scale: number;
}) {
  const activeId = couple.activePartnerId;
  const activeLevel = moodLevel(couple, activeId);
  const heroScale = scale;

  return (
    <View style={[styles.homeHero, { gap: rhythm, height, minHeight: height, paddingBottom: 0 }]}>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.78}
        numberOfLines={2}
        style={[styles.homeHeroTitle, { fontSize: 59 * heroScale, lineHeight: 59 * heroScale, maxWidth: 348 * scale }]}
      >
        Ce soir,{`\n`}on joue
        <Text style={styles.homeHeroQuestion}>?</Text>
      </Text>
      <View style={[styles.homeMoodRow, { gap: 7 * heroScale }]}>
        {moodOptions.map((option) => {
          const selected = option.level === activeLevel;

          return (
            <Pressable
              key={option.level}
              onPress={() => onChange(option.level)}
              hitSlop={6}
              style={({ pressed }) => [
                styles.homeMoodChip,
                {
                  minHeight: 47 * heroScale,
                  paddingHorizontal: 5 * heroScale,
                },
                selected && styles.homeMoodChipSelected,
                pressed && styles.homeMoodChipPressed,
              ]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.76}
                numberOfLines={1}
                style={[styles.homeMoodChipText, { fontSize: 14.6 * heroScale, lineHeight: 18 * heroScale }, selected && styles.homeMoodChipTextSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          accessibilityLabel="Ouvrir les réglages de mood"
          accessibilityRole="button"
          hitSlop={6}
          onPress={onOpenMoodPanel}
          style={({ pressed }) => [
            styles.homeMoodSettingsChip,
            {
              height: 47 * heroScale,
              width: 47 * heroScale,
            },
            pressed && styles.homeMoodChipPressed,
          ]}
        >
          <Settings color={candy.white} size={18 * heroScale} strokeWidth={3} />
        </Pressable>
      </View>
    </View>
  );
}

function HomeMoodSettingsSheet({
  couple,
  onClose,
  onMoodChange,
  onMoodNotificationPreference,
  visible,
}: {
  couple: CoupleState;
  onClose: () => void;
  onMoodChange: (level: CoupleMoodLevel) => void;
  onMoodNotificationPreference: (enabled: boolean) => void;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const activeId = couple.activePartnerId;
  const partnerProfile = couple.profiles[otherPartnerId(activeId)];
  const activeMood = moodLevel(couple, activeId);
  const partnerName = partnerProfile.displayName.trim() || "Ton/ta partenaire";
  const notificationsEnabled = isMoodNotificationEnabled(couple, activeId);
  const [pendingMood, setPendingMood] = useState<CoupleMoodLevel>(activeMood);
  const { height } = useWindowDimensions();
  const sheetHiddenY = Math.max(420, height);
  const dragY = useRef(new Animated.Value(sheetHiddenY)).current;
  const [sheetMounted, setSheetMounted] = useState(visible);
  const wasVisibleRef = useRef(false);
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      wasVisibleRef.current = false;

      if (!isClosingRef.current) {
        dragY.stopAnimation();
        dragY.setValue(sheetHiddenY);
        setSheetMounted(false);
      }

      return;
    }

    setSheetMounted(true);
    setPendingMood(activeMood);

    if (!wasVisibleRef.current) {
      isClosingRef.current = false;
      dragY.stopAnimation();
      dragY.setValue(sheetHiddenY);
      Animated.spring(dragY, {
        friction: 20,
        tension: 190,
        toValue: 0,
        useNativeDriver: useNativeAnimations,
        velocity: -0.8,
      }).start();
    }

    wasVisibleRef.current = true;
  }, [activeMood, dragY, sheetHiddenY, visible]);

  const requestSheetClose = useCallback((afterClose?: () => void) => {
    if (isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;
    dragY.stopAnimation();

    Animated.timing(dragY, {
      duration: 220,
      easing: Easing.in(Easing.cubic),
      toValue: sheetHiddenY,
      useNativeDriver: useNativeAnimations,
    }).start(() => {
      dragY.setValue(sheetHiddenY);
      wasVisibleRef.current = false;
      setSheetMounted(false);
      afterClose?.();
      onClose();
      isClosingRef.current = false;
    });
  }, [dragY, onClose, sheetHiddenY]);

  const dragHandleResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          gestureState.dy > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 0.7,
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          gestureState.dy > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 0.7,
        onPanResponderGrant: () => {
          dragY.stopAnimation();
        },
        onPanResponderMove: (_event, gestureState) => {
          dragY.setValue(Math.max(0, gestureState.dy));
        },
        onPanResponderTerminationRequest: () => false,
        onPanResponderRelease: (_event, gestureState) => {
          const shouldClose = gestureState.dy > 82 || (gestureState.dy > 28 && gestureState.vy > 0.8);

          if (shouldClose) {
            requestSheetClose();
            return;
          }

          Animated.spring(dragY, {
            friction: 18,
            tension: 210,
            toValue: 0,
            useNativeDriver: useNativeAnimations,
            velocity: gestureState.vy,
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            friction: 18,
            tension: 210,
            toValue: 0,
            useNativeDriver: useNativeAnimations,
          }).start();
        },
      }),
    [dragY, requestSheetClose],
  );

  const handleMoodPress = useCallback((level: CoupleMoodLevel) => {
    setPendingMood(level);
    void Haptics.selectionAsync();
  }, []);

  const handleSendSignal = useCallback(() => {
    onMoodChange(pendingMood);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    requestSheetClose();
  }, [onMoodChange, pendingMood, requestSheetClose]);

  const modalVisible = visible || sheetMounted;

  if (!modalVisible) {
    return null;
  }

  return (
    <Modal animationType="none" onRequestClose={() => requestSheetClose()} transparent visible={modalVisible}>
      <View style={styles.homeMoodSheetOverlay}>
        <Pressable accessibilityLabel="Fermer les réglages de mood" onPress={() => requestSheetClose()} style={styles.homeMoodSheetBackdrop} />
        <Animated.View style={[styles.homeMoodSheet, { paddingBottom: Math.max(18, insets.bottom + 12), transform: [{ translateY: dragY }] }]}>
          <View
            accessibilityLabel="Faire glisser vers le bas pour fermer les réglages de mood"
            {...dragHandleResponder.panHandlers}
            hitSlop={{ bottom: 12, left: 18, right: 18, top: 10 }}
            style={styles.homeMoodSheetHandleHitArea}
          >
            <View style={styles.homeMoodSheetHandle} />
          </View>
          <View style={styles.homeMoodSheetHeader}>
            <View style={styles.homeMoodSheetTitleBlock}>
              <Text style={styles.homeMoodSheetTitle}>
                Ton mood, là,{`\n`}maintenant<Text style={styles.homeMoodSheetTitleDot}>.</Text>
              </Text>
              <Text style={styles.homeMoodSheetSubtitle}>{partnerName} ne verra rien... sauf si vos moods s'alignent.</Text>
            </View>
            <SpringPressable onPress={() => requestSheetClose()} style={styles.homeMoodSheetClose}>
              <X color={candy.ink} size={18} strokeWidth={3} />
            </SpringPressable>
          </View>

          <View style={styles.homeMoodSignalList}>
            {moodSignalOptions.map((option) => {
              const selected = pendingMood === option.level;

              return (
                <SpringPressable
                  key={option.level}
                  onPress={() => handleMoodPress(option.level)}
                  style={[styles.homeMoodSignalRow, selected && styles.homeMoodSignalRowSelected]}
                >
                  <View
                    style={[
                      styles.homeMoodSignalDot,
                      { backgroundColor: option.color },
                      selected && { backgroundColor: candy.cream, borderColor: candy.yellow, borderWidth: 2 },
                    ]}
                  />
                  <View style={styles.homeMoodSignalCopy}>
                    <Text style={[styles.homeMoodSignalTitle, selected && styles.homeMoodSignalTitleSelected]}>{option.label}</Text>
                    <Text style={[styles.homeMoodSignalText, selected && styles.homeMoodSignalTextSelected]}>{option.description}</Text>
                  </View>
                </SpringPressable>
              );
            })}
          </View>

          <View style={styles.homeMoodNotificationPanel}>
            <Text style={styles.homeMoodNotificationTitle}>Notifications</Text>
            <NotificationPreferenceRow
              enabled={notificationsEnabled}
              emoji="✨"
              onToggle={() => onMoodNotificationPreference(!notificationsEnabled)}
              title="Humeur partagée"
            />
          </View>

          <SpringPressable onPress={handleSendSignal} style={styles.homeMoodSendButton}>
            <Text style={styles.homeMoodSendText}>Envoyer le signal</Text>
          </SpringPressable>
          <Text style={styles.homeMoodSheetFootnote}>Si vos moods s'alignent, vous serez prévenus tous les deux.</Text>
        </Animated.View>
      </View>
    </Modal>
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

  return (
    <LinearGradient colors={["rgba(255,255,255,0.9)", candy.roseMist, candy.pinkSoft]} style={styles.homeStatusCard}>
      <View style={styles.homeStatusTop}>
        <View style={styles.homeStatusAvatar}>
          <Text style={styles.homeStatusAvatarText}>{profileEmoji(activeProfile)}</Text>
        </View>
        <View style={styles.homeStatusCopy}>
          <Text style={styles.homeStatusEyebrow}>Statut visible</Text>
          <Text style={styles.homeStatusTitle}>Change ton statut du jour</Text>
        </View>
        <View style={styles.homeStatusPartner}>
          <Text style={styles.homeStatusPartnerEmoji}>{profileEmoji(partnerProfile)}</Text>
          <Text numberOfLines={1} style={styles.homeStatusPartnerLabel}>{hasLinkedPartner(couple) ? "Son statut" : "À venir"}</Text>
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

function HomeDailyAdvice({ couple, height, scale, verticalScale }: { couple: CoupleState; height: number; scale: number; verticalScale: number }) {
  const advice = dailyAdviceForCouple(couple);
  const adviceScale = Math.min(scale * 1.08, Math.max(0.82, height / 92));

  return (
    <View
      style={[
        styles.dailyAdviceCard,
        {
          borderRadius: 22 * adviceScale,
          gap: 14 * adviceScale,
          height,
          justifyContent: "center",
          minHeight: height,
          paddingHorizontal: 16 * adviceScale,
          paddingVertical: 12 * verticalScale,
        },
      ]}
    >
      <View style={[styles.dailyAdviceIcon, { borderRadius: 17 * adviceScale, height: 42 * adviceScale, width: 42 * adviceScale }]}>
        <Lightbulb color={candy.black} size={22 * adviceScale} strokeWidth={3} />
      </View>
      <View style={styles.dailyAdviceCopy}>
        <Text style={[styles.dailyAdvicePillText, { fontSize: 11.8 * adviceScale, lineHeight: 14 * adviceScale }]}>Conseil du jour</Text>
        <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={2} style={[styles.dailyAdviceText, { fontSize: 14.4 * adviceScale, lineHeight: 18.5 * adviceScale, marginTop: 3 * adviceScale }]}>
          {advice.text}
        </Text>
      </View>
    </View>
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
  const remoteCouple = isRemoteCoupleId(couple.id);
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
  const hiddenMatchCount = hiddenMatchCountForCouple(couple, matches, revealedMatchSet);
  const revealedMatches = useMemo(
    () => remoteCouple ? matches : matches.filter((card) => revealedMatchSet.has(card.id)),
    [matches, remoteCouple, revealedMatchSet],
  );
  const firstRevealedMatch = revealedMatches[0];
  const dailyLimitReached = !unlimitedResponses && dailyResponsesLeft(couple, couple.activePartnerId) <= 0;
  const responseCount = useMemo(() => activeResponseCount(couple), [couple]);
  const hasFewAnswers = responseCount < 5;

  const nextStep: HomeNextStepConfig = !linked
    ? {
        cta: "Inviter",
        emoji: "💌",
        onPress: onInvitePartner,
        secondary: "Rejoindre",
        secondaryPress: onJoinPartner,
        title: "Ton/ta partenaire manque encore",
      }
    : hiddenMatchCount > 0
      ? {
          cta: "Découvrir",
          emoji: "🔥",
          onPress: onGoMatch,
          secondary: "Continuer à jouer",
          secondaryPress: onGoEnvies,
          title: "Un match est prêt",
        }
      : firstRevealedMatch
        ? {
            cta: "En parler",
            emoji: "💬",
            onPress: () => onOpenChat(firstRevealedMatch.id),
            secondary: "Voir les matchs",
            secondaryPress: onGoMatch,
            title: "Une envie vous attend",
          }
        : dailyLimitReached
          ? {
              cta: "Débloquer l'illimité",
              emoji: "🎟️",
              onPress: onOpenStore,
              secondary: matches.length ? "Voir les matchs" : undefined,
              secondaryPress: matches.length ? onGoMatch : undefined,
              title: "Pause jusqu'à demain",
            }
        : hasFewAnswers
          ? {
              cta: "Répondre",
              emoji: "🎲",
              onPress: onGoEnvies,
              secondary: hasStoreOffer ? "Voir les packs" : undefined,
              secondaryPress: hasStoreOffer ? onOpenStore : undefined,
              title: "Réponds à quelques cartes",
            }
          : matches.length
    ? {
        cta: "Voir les matchs",
        emoji: "💘",
        onPress: onGoMatch,
        secondary: "Continuer à jouer",
        secondaryPress: onGoEnvies,
        title: "Un match vous attend",
      }
      : unansweredCount > 0
        ? {
            cta: "Voir une carte",
            emoji: "🎲",
            onPress: onGoEnvies,
            secondary: hasStoreOffer ? "Voir les packs" : undefined,
            secondaryPress: hasStoreOffer ? onOpenStore : undefined,
            title: "Continue le jeu",
          }
        : hasStoreOffer
          ? {
              cta: "Voir les packs",
              emoji: "✨",
              onPress: onOpenStore,
              secondary: "Revoir les cartes",
              secondaryPress: onGoEnvies,
              title: "Plus rien de neuf pour l'instant",
            }
          : {
              cta: "Ajouter une envie",
              emoji: "💭",
              onPress: onGoEnvies,
              secondary: "Voir les matchs",
              secondaryPress: onGoMatch,
              title: "À vous d'inventer la suite",
            };

  return (
    <LinearGradient colors={["rgba(255,255,255,0.96)", candy.roseMist, candy.roseSoft]} style={styles.homeNextPanel}>
      <View style={styles.homeNextTop}>
        <View style={styles.homeNextCopy}>
          <Text style={styles.homeNextQuestLabel}>Prochaine action</Text>
          <Text style={styles.homeNextTitle}>{nextStep.title}</Text>
        </View>
        <Text style={styles.homeNextEmoji}>{nextStep.emoji}</Text>
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
  height,
  onGoEnvies,
  onOpenStore,
  scale,
  verticalScale,
}: {
  couple: CoupleState;
  height: number;
  onGoEnvies: () => void;
  onOpenStore: () => void;
  scale: number;
  verticalScale: number;
}) {
  const featuredCategory = dailyStoreCategory(couple);
  const featuredUnlocked = isCategoryUnlocked(couple, featuredCategory);
  const featuredCount = desireCardCount(featuredCategory);
  const featuredPrice = CATEGORY_PRICES[featuredCategory] ?? "4,99 €";
  const storeScale = Math.min(scale * 1.04, Math.max(0.8, height / 112));
  const storeGap = 7 * verticalScale;
  const storeHeaderLineHeight = 27 * storeScale;
  const packHeight = Math.max(48 * storeScale, height - storeHeaderLineHeight - storeGap);

  return (
    <View style={[styles.homeStore, { gap: storeGap, height, minHeight: height, overflow: "hidden" }]}>
      <View style={styles.homeStoreTop}>
        <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={[styles.homeStoreTitle, { fontSize: 25 * storeScale, lineHeight: storeHeaderLineHeight }]}>Monter d'un cran</Text>
        <SpringPressable onPress={onOpenStore} style={styles.homeStoreLink}>
          <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={[styles.homeStoreLinkText, { fontSize: 14.5 * storeScale, lineHeight: 18 * storeScale }]}>Magasin</Text>
          <ChevronRight size={15 * storeScale} color={candy.yellow} />
        </SpringPressable>
      </View>

      <View style={[styles.homeStorePackRow, { gap: 9 * storeScale }]}>
        <SpringPressable
          onPress={featuredUnlocked ? onGoEnvies : onOpenStore}
          style={[styles.homeStorePack, styles.homeStorePackFeatured, { borderRadius: 18 * storeScale, height: packHeight, minHeight: packHeight, padding: 13 * storeScale }]}
        >
          <Text numberOfLines={1} style={[styles.homeStorePackTitle, { fontSize: 19 * storeScale, lineHeight: 21 * storeScale }]}>
            Pack {categoryLabel(featuredCategory)}
          </Text>
          <Text numberOfLines={1} style={[styles.homeStorePackMeta, { fontSize: 12.8 * storeScale, lineHeight: 16 * storeScale, marginTop: 2 * storeScale }]}>
            {featuredUnlocked ? "Déjà ouvert" : `${featuredCount} cartes · ${featuredPrice}`}
          </Text>
        </SpringPressable>
        <View style={[styles.homeStorePack, styles.homeStorePackSoon, { borderRadius: 18 * storeScale, height: packHeight, minHeight: packHeight, padding: 13 * storeScale }]}>
          <Text numberOfLines={1} style={[styles.homeStorePackTitle, styles.homeStorePackTitleSoon, { fontSize: 19 * storeScale, lineHeight: 21 * storeScale }]}>
            Scénarios
          </Text>
          <Text numberOfLines={1} style={[styles.homeStorePackMeta, styles.homeStorePackMetaSoon, { fontSize: 12.8 * storeScale, lineHeight: 16 * storeScale, marginTop: 2 * storeScale }]}>
            bientôt
          </Text>
        </View>
      </View>
    </View>
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
  onRestorePurchases,
  visible,
}: {
  couple: CoupleState;
  onClose: () => void;
  onGoEnvies: () => void;
  onOpenCustomPack: () => void;
  onOpenNoAds: () => void;
  onOpenUnlimitedResponses: () => void;
  onOpenPack: (category: DesireCategory) => void;
  onRestorePurchases: () => void;
  visible: boolean;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();

  if (!visible) {
    return null;
  }

  const customUnlimited = hasCustomCardsUnlimited(couple);
  const noAdsUnlocked = hasNoAds(couple);
  const unlimitedResponsesUnlocked = hasUnlimitedResponses(couple);
  const storeBottomPadding = Math.max(18, safeAreaInsets.bottom + 12);
  const storeSurface = fullScreenSurfaceMetrics(viewportWidth);
  const storePackColumns = 3;
  const storePackGap = viewportWidth >= 700 ? 16 : viewportWidth >= 520 ? 14 : 10;
  const storeInnerWidth = storeSurface.contentWidth;
  const packCardWidth = Math.max(84, (storeInnerWidth - storePackGap * (storePackColumns - 1)) / storePackColumns);
  const packCardHeight = Math.round(packCardWidth * (viewportWidth >= 700 ? 1.32 : 1.42));
  const storeContentMinHeight = Math.max(0, viewportHeight - safeAreaInsets.top - safeAreaInsets.bottom - storeBottomPadding);

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <LinearGradient colors={[candy.red, candy.red]} style={styles.storeScreen}>
        <SafeAreaView style={styles.storeSafe}>
          <ScrollView
            contentContainerStyle={[
              styles.storeContent,
              {
                minHeight: storeContentMinHeight,
                paddingBottom: storeBottomPadding,
                paddingHorizontal: storeSurface.sideInset,
              },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.storeHeader}>
              <SpringPressable onPress={onClose} style={styles.storeCloseButton}>
                <ArrowLeft size={19} color={candy.white} />
              </SpringPressable>
              <View style={styles.storeHeaderCopy}>
                <Text style={styles.storeTitle}>Boutique</Text>
                <Text style={styles.storeSubtitle}>Des extensions de jeu, pas des murs.</Text>
              </View>
            </View>

            <View style={styles.storeSectionHeader}>
              <Text style={styles.storeSectionTitle}>Améliorer l'expérience</Text>
            </View>

            <View style={styles.storeUpgradeList}>
              <StoreUpgradeOffer
                highlight
                popular={!unlimitedResponsesUnlocked}
                price={unlimitedResponsesUnlocked ? "Actif" : UNLIMITED_RESPONSES_PRICE}
                subtitle="Jouez sans compter, tous les soirs"
                title="Réponses illimitées"
                onPress={unlimitedResponsesUnlocked ? onGoEnvies : onOpenUnlimitedResponses}
              />
              <StoreUpgradeOffer
                price={customUnlimited ? "Actif" : CUSTOM_CARDS_UNLIMITED_PRICE}
                subtitle={`Vos idées, sans limite de ${CUSTOM_CARD_FREE_LIMIT}`}
                title="Cartes perso illimitées"
                onPress={customUnlimited ? onGoEnvies : onOpenCustomPack}
              />
              <StoreUpgradeOffer
                price={noAdsUnlocked ? "Actif" : NO_ADS_PRICE}
                subtitle="Révélations sans interruption"
                title="Zéro pub"
                onPress={noAdsUnlocked ? onGoEnvies : onOpenNoAds}
              />
            </View>

            <View style={styles.storePacksHeader}>
              <View style={styles.storeSectionHeader}>
                <Text style={styles.storeSectionTitle}>Pack d'envies</Text>
              </View>
            </View>

            <View style={[styles.storePackGrid, { gap: storePackGap }]}>
              {PAID_PACK_CATEGORIES.map((category) => (
                <StoreFeaturedPackCard
                  category={category}
                  couple={couple}
                  key={category}
                  onGoEnvies={onGoEnvies}
                  onOpenPack={onOpenPack}
                  height={packCardHeight}
                  width={packCardWidth}
                />
              ))}
            </View>

            <View style={styles.storeFooter}>
              <SpringPressable onPress={onRestorePurchases} style={styles.storeRestoreButton}>
                <Text style={styles.storeRestoreText}>Restaurer mes achats</Text>
              </SpringPressable>
              <Text style={styles.storeLegalText}>Achats uniques, partagés par le couple. Aucun abonnement.</Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </Modal>
  );
}

function StoreUpgradeOffer({
  highlight,
  onPress,
  popular,
  price,
  subtitle,
  title,
}: {
  highlight?: boolean;
  onPress: () => void;
  popular?: boolean;
  price: string;
  subtitle: string;
  title: string;
}) {
  return (
    <SpringPressable onPress={onPress} style={[styles.storeUpgradeCard, highlight && styles.storeUpgradeCardHighlight]}>
      {popular ? (
        <View style={styles.storePopularBadge}>
          <Text style={styles.storePopularText}>Populaire</Text>
        </View>
      ) : null}
      <View style={styles.storeUpgradeCopy}>
        <Text numberOfLines={1} style={styles.storeUpgradeTitle}>{title}</Text>
        <Text numberOfLines={1} style={styles.storeUpgradeText}>{subtitle}</Text>
      </View>
      <View style={[styles.storeUpgradePrice, highlight && styles.storeUpgradePriceDark]}>
        <Text style={[styles.storeUpgradePriceText, highlight && styles.storeUpgradePriceTextDark]}>{price}</Text>
      </View>
    </SpringPressable>
  );
}

function StoreFeaturedPackCard({
  category,
  couple,
  height,
  onGoEnvies,
  onOpenPack,
  width,
}: {
  category: DesireCategory;
  couple: CoupleState;
  height: number;
  onGoEnvies: () => void;
  onOpenPack: (category: DesireCategory) => void;
  width: number;
}) {
  const visual = categoryVisual(category);
  const unlocked = isCategoryUnlocked(couple, category);
  const hotCard = category === "Hot";
  const lightText = ["Scénarios", "Kinky Soft", "Jeux & Défis", "BDSM", "Tabous"].includes(category);

  return (
    <SpringPressable
      onPress={unlocked ? onGoEnvies : () => onOpenPack(category)}
      style={[styles.storePackCard, { backgroundColor: visual.accent, height, width }]}
    >
      <LinearGradient colors={visual.colors} pointerEvents="none" style={styles.storePackCardFill} />
      <CategoryPickerPattern category={category} />
      <View style={styles.storePackCardCopy}>
        <Text numberOfLines={1} style={[styles.storePackTitle, lightText && styles.storePackTitleLight, hotCard && styles.storePackTitleDark]}>
          {categoryLabel(category)}
        </Text>
        <Text numberOfLines={1} style={[styles.storePackPrice, lightText && styles.storePackPriceLight, hotCard && styles.storePackPriceDark]}>
          {unlocked ? "Actif" : CATEGORY_PRICES[category] ?? "4,99 €"}
        </Text>
      </View>
    </SpringPressable>
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
    <LinearGradient colors={unlocked ? tone.colors : [candy.cream, candy.roseSoft, "#EBD8C0"]} style={styles.storeOfferCard}>
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
        <WsButton
          label={unlocked ? "Voir" : "Débloquer"}
          onPress={unlocked ? onGoEnvies : () => onOpenPack(category)}
          right={<ChevronRight size={16} color={unlocked ? candy.red : candy.white} />}
          size="sm"
          style={styles.storeOfferButton}
          variant={unlocked ? "secondary" : "hot"}
        />
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
        <WsButton
          label={customUnlimited ? "Créer" : "Débloquer"}
          onPress={customUnlimited ? onGoEnvies : onOpenCustomPack}
          right={<ChevronRight size={16} color={customUnlimited ? candy.red : candy.white} />}
          size="sm"
          style={styles.storeOfferButton}
          variant={customUnlimited ? "secondary" : "hot"}
        />
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
        <WsButton
          label={unlimitedResponsesUnlocked ? "Jouer" : "Débloquer"}
          onPress={unlimitedResponsesUnlocked ? onGoEnvies : onOpenUnlimitedResponses}
          right={<ChevronRight size={16} color={unlimitedResponsesUnlocked ? candy.red : candy.white} />}
          size="sm"
          style={styles.storeOfferButton}
          variant={unlimitedResponsesUnlocked ? "secondary" : "hot"}
        />
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
        <WsButton
          label={noAdsUnlocked ? "Jouer" : "Débloquer"}
          onPress={noAdsUnlocked ? onGoEnvies : onOpenNoAds}
          right={<ChevronRight size={16} color={noAdsUnlocked ? candy.red : candy.white} />}
          size="sm"
          style={styles.storeOfferButton}
          variant={noAdsUnlocked ? "secondary" : "hot"}
        />
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
  height,
  onGoEnvies,
  onOpenCard,
  scale,
  verticalScale,
}: {
  couple: CoupleState;
  height: number;
  onGoEnvies: () => void;
  onOpenCard: (card: DesireCard) => void;
  scale: number;
  verticalScale: number;
}) {
  const activeId = couple.activePartnerId;
  const partnerId = otherPartnerId(activeId);
  const availableCards = useMemo(
    () => availableDesireCards(couple),
    [couple],
  );
  const unansweredCards = useMemo(
    () => availableCards.filter((card) => couple.votes[activeId][card.id] === undefined),
    [activeId, availableCards, couple.votes],
  );
  const answeredCards = useMemo(
    () => availableCards.filter((card) => couple.votes[activeId][card.id] !== undefined),
    [activeId, availableCards, couple.votes],
  );
  const activeCard = useMemo(() => {
    const cardCandidates = unansweredCards.length ? unansweredCards : answeredCards;

    if (!cardCandidates.length) {
      return undefined;
    }

    const seed = `${dailyDateKey()}-${couple.id}-home-card`;
    return cardCandidates[hashText(seed) % cardCandidates.length];
  }, [answeredCards, couple.id, unansweredCards]);
  const partnerName = couple.profiles[partnerId].displayName.trim() || "Ton/ta partenaire";
  const statusLabel = activeCard ? homeSurpriseStatusLabel(couple, activeCard) : "Nouveau";
  const partnerAnswered = activeCard ? couple.votes[partnerId][activeCard.id] !== undefined : false;
  const partnerHint = activeCard
    ? statusLabel === "Match"
      ? "Vous avez matché sur cette carte."
      : partnerAnswered
        ? `${partnerName} a répondu.`
        : `${partnerName} n'a pas encore répondu.`
    : "";

  return (
    <View style={styles.homeSurpriseDeck}>
      {activeCard ? (
        <HomeSurpriseCard
          card={activeCard}
          height={height}
          partnerHint={partnerHint}
          onOpen={() => onOpenCard(activeCard)}
          scale={scale}
          statusLabel={statusLabel}
          verticalScale={verticalScale}
        />
      ) : (
        <SpringPressable
          onPress={onGoEnvies}
          style={[styles.homeEmptySurpriseCard, { borderRadius: 24 * scale, height, minHeight: height, padding: 20 * verticalScale }]}
        >
          <View style={styles.homeEmptySurpriseIcon}>
            <Text style={styles.homeEmptySurpriseEmoji}>🫧</Text>
          </View>
          <Text style={[styles.homeEmptySurpriseTitle, { fontSize: 23 * scale, lineHeight: 25 * scale }]}>Plus de cartes à répondre</Text>
          <Text style={[styles.homeEmptySurpriseText, { fontSize: 13.5 * scale, lineHeight: 18 * scale }]}>
            Toutes les envies ouvertes ont déjà ta réponse. Débloque un pack ou ajoute une carte perso pour relancer le tirage.
          </Text>
        </SpringPressable>
      )}
    </View>
  );
}

function HomeSurpriseCard({
  card,
  height,
  partnerHint,
  onOpen,
  scale,
  statusLabel,
  verticalScale,
}: {
  card: DesireCard;
  height: number;
  partnerHint: string;
  onOpen: () => void;
  scale: number;
  statusLabel: "Nouveau" | "Répondu" | "Match";
  verticalScale: number;
}) {
  const cardScale = Math.min(scale * 1.07, Math.max(0.84, Math.min(verticalScale * 1.08, height / 210)));

  return (
    <View
      style={[
        styles.homeSurpriseCard,
        {
          borderRadius: 24 * cardScale,
          gap: 10 * cardScale,
          height,
          justifyContent: "space-between",
          minHeight: height,
          paddingHorizontal: 19 * cardScale,
          paddingBottom: 23 * cardScale,
          paddingTop: 17 * cardScale,
        },
      ]}
    >
      <View style={[styles.homeSurpriseTop, { minHeight: 30 * cardScale }]}>
        <Text style={[styles.homeSurpriseEyebrow, { fontSize: 13 * cardScale, lineHeight: 16 * cardScale }]}>Carte du jour</Text>
        <View style={[styles.homeSurpriseBadge, { minHeight: 29 * cardScale, paddingHorizontal: 16 * cardScale }]}>
          <Text style={[styles.homeSurpriseBadgeText, { fontSize: 13 * cardScale, lineHeight: 16 * cardScale }]}>{statusLabel}</Text>
        </View>
      </View>
      <Text adjustsFontSizeToFit minimumFontScale={0.76} numberOfLines={3} style={[styles.homeSurpriseTitle, { fontSize: 22.5 * cardScale, lineHeight: 25.5 * cardScale }]}>{card.title}</Text>
      <View style={[styles.homeSurpriseActionStack, { gap: 10 * cardScale }]}>
        <SpringPressable onPress={onOpen} style={[styles.homeSurpriseButton, { borderRadius: 18 * cardScale, minHeight: 61 * cardScale, paddingHorizontal: 18 * cardScale }]}>
          <Text adjustsFontSizeToFit minimumFontScale={0.78} numberOfLines={1} style={[styles.homeSurpriseButtonText, { fontSize: 17.5 * cardScale, lineHeight: 22 * cardScale }]}>Jouer maintenant</Text>
        </SpringPressable>
        <Text numberOfLines={1} style={[styles.homeSurpriseText, { fontSize: 13.3 * cardScale, lineHeight: 17 * cardScale }]}>{partnerHint}</Text>
      </View>
    </View>
  );
}

function dailyStoreCategory(couple: CoupleState) {
  const candidates = PAID_PACK_CATEGORIES.length ? PAID_PACK_CATEGORIES : PACK_CATEGORIES;
  return candidates[hashText(`${dailyDateKey()}-${couple.id}-store-pack`) % candidates.length] ?? "Hot";
}

function CoupleScreen({
  couple,
  revealedMatchIds,
  onCopyInvite,
  onGoEnvies,
  onGoMatch,
  onJoinPartner,
  onOpenSettings,
  onRestorePurchases,
  onUnlockCategory,
  onUnlockCustomCards,
  onUnlockNoAds,
  onUnlockUnlimitedResponses,
}: {
  couple: CoupleState;
  revealedMatchIds: string[];
  onCopyInvite: () => void;
  onGoEnvies: () => void;
  onGoMatch: () => void;
  onJoinPartner: () => void;
  onOpenSettings: () => void;
  onRestorePurchases: () => void;
  onUnlockCategory: (category: DesireCategory) => void;
  onUnlockCustomCards: () => void;
  onUnlockNoAds: () => void;
  onUnlockUnlimitedResponses: () => void;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const coupleLayout = homeLayoutMetrics(viewportHeight, viewportWidth, safeAreaInsets);
  const [purchaseCategory, setPurchaseCategory] = useState<DesireCategory | null>(null);
  const [customPurchaseOpen, setCustomPurchaseOpen] = useState(false);
  const [noAdsPurchaseOpen, setNoAdsPurchaseOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [unlimitedPurchaseOpen, setUnlimitedPurchaseOpen] = useState(false);
  const revealedMatchSet = useMemo(() => new Set(revealedMatchIds), [revealedMatchIds]);
  const remoteCouple = isRemoteCoupleId(couple.id);
  const matches = useMemo(() => matchedCards(couple), [couple]);
  const hiddenMatchCount = hiddenMatchCountForCouple(couple, matches, revealedMatchSet);
  const totalMatchCount = matches.length + hiddenMatchCount;
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
    () => remoteCouple ? matches : matches.filter((card) => revealedMatchSet.has(card.id)),
    [matches, remoteCouple, revealedMatchSet],
  );
  const recentMatches = useMemo(() => revealedMatches.slice(0, 3), [revealedMatches]);
  const activeProfiles = PARTNER_IDS;
  const activeInitial = (activeProfile.displayName.trim()[0] ?? "M").toUpperCase();
  const unlockedPackCount = useMemo(
    () => COUPLE_PACK_CATEGORIES.filter((category) => isCategoryUnlocked(couple, category)).length,
    [couple],
  );
  const lockedPackCount = Math.max(0, COUPLE_PACK_CATEGORIES.length - unlockedPackCount);
  const coupleSurface = fullScreenSurfaceMetrics(viewportWidth);
  const coupleContentWidth = coupleSurface.contentWidth;
  const coupleContentMinHeight = Math.max(0, viewportHeight - safeAreaInsets.top - coupleLayout.bottomPadding);
  const coupleContentGap = Math.round(Math.min(18, Math.max(11, viewportHeight * 0.012)));
  const soloContentStyle = useMemo<ViewStyle>(() => ({
    alignSelf: "center",
    minHeight: coupleLayout.frameHeight,
    paddingBottom: coupleLayout.bottomPadding,
    paddingHorizontal: Math.max(10, 14 * coupleLayout.widthScale),
    paddingTop: Math.max(12, coupleLayout.rhythm),
    width: coupleContentWidth,
  }), [coupleContentWidth, coupleLayout.bottomPadding, coupleLayout.frameHeight, coupleLayout.rhythm, coupleLayout.widthScale]);
  const coupleContentStyle = useMemo<ViewStyle>(() => ({
    gap: coupleContentGap,
    minHeight: coupleContentMinHeight,
    paddingBottom: coupleLayout.bottomPadding + 18,
    paddingTop: Math.max(10, coupleLayout.rhythm),
    width: coupleContentWidth,
  }), [
    coupleContentGap,
    coupleContentWidth,
    coupleContentMinHeight,
    coupleLayout.bottomPadding,
    coupleLayout.rhythm,
  ]);

  if (!linked) {
    return (
      <ScrollView contentContainerStyle={[styles.coupleSoloScreen, soloContentStyle]} showsVerticalScrollIndicator={false}>
        <Text style={styles.coupleSoloScreenTitle}>Nous</Text>
        <View style={styles.coupleSoloCenter}>
          <View style={styles.coupleSoloAvatarStage}>
            <View style={styles.coupleSoloAvatar}>
              <Text style={styles.coupleSoloAvatarInitial}>{activeInitial}</Text>
            </View>
            <View style={styles.coupleSoloMissingAvatar}>
              <Text style={styles.coupleSoloMissingText}>?</Text>
            </View>
          </View>
          <Text style={styles.coupleSoloTitle}>Il manque quelqu'un</Text>
          <Text style={styles.coupleSoloText}>
            WeSpice se joue à deux. Invite ton/ta partenaire pour ouvrir le jeu.
          </Text>

          <View style={styles.coupleSoloActions}>
            <SpringPressable onPress={onCopyInvite} style={styles.coupleSoloInviteButton}>
              <Text style={styles.coupleSoloInviteText}>Inviter</Text>
            </SpringPressable>
            <SpringPressable onPress={onJoinPartner} style={styles.coupleSoloJoinButton}>
              <Text style={styles.coupleSoloJoinText}>Rejoindre</Text>
            </SpringPressable>
          </View>
          <Text selectable style={styles.coupleSoloCode}>{couple.inviteCode}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <>
      <ScrollView contentContainerStyle={[styles.coupleScreen, coupleContentStyle]} showsVerticalScrollIndicator={false}>
        <View style={styles.coupleTopBar}>
          <View>
            <Text style={styles.coupleScreenTitle}>Nous</Text>
            <Text numberOfLines={1} style={styles.coupleScreenSubtitle}>{coupleTitle}</Text>
          </View>
          <SpringPressable onPress={onOpenSettings} style={styles.coupleSettingsButton}>
            <Text style={styles.coupleSettingsText}>Réglages</Text>
          </SpringPressable>
        </View>

        <View style={styles.coupleProfileGrid}>
          {activeProfiles.map((id, index) => (
            <CoupleProfileCard
              couple={couple}
              id={id}
              key={id}
              highlighted={index === 1}
              packCount={unlockedPackCount}
            />
          ))}
        </View>

        <View style={styles.coupleCodePill}>
          <Text numberOfLines={1} style={styles.coupleCodeText}>
            Notre code : <Text selectable style={styles.coupleCodeStrong}>{couple.inviteCode}</Text>
          </Text>
          <SpringPressable onPress={onCopyInvite} style={styles.coupleCodeCopyButton}>
            <Text style={styles.coupleCodeCopyText}>Copier</Text>
          </SpringPressable>
        </View>

        <View style={styles.coupleStats}>
          <CoupleStat value={`${totalMatchCount}`} label="Matchs" />
          <CoupleStat value={`${crossedResponseCount}`} label="cartes croisées" />
          <CoupleStat value={`${customCount}`} label="cartes perso" />
        </View>

        <View style={styles.coupleSection}>
          <View style={styles.coupleSectionHeader}>
            <Text style={styles.coupleSectionTitle}>Matchs récents</Text>
          </View>
          {recentMatches.length ? (
            <View style={styles.coupleRecentList}>
              {recentMatches.map((card) => (
                <CoupleRecentMatchItem card={card} key={card.id} onPress={onGoMatch} />
              ))}
            </View>
          ) : (
            <SpringPressable onPress={onGoMatch} style={styles.coupleEmptyMatches}>
              <Text style={styles.coupleEmptyMatchesTitle}>{hiddenMatchCount > 0 ? "Match à révéler" : "Aucun match pour l'instant"}</Text>
              <Text style={styles.coupleEmptyMatchesText}>
                {hiddenMatchCount > 0 ? "Ouvre l'onglet Matchs pour le révéler de ton côté." : "Répondez à quelques cartes chacun de votre côté."}
              </Text>
            </SpringPressable>
          )}
        </View>

        <View style={styles.couplePackSummary}>
          <View style={styles.couplePackSummaryCopy}>
            <Text style={styles.couplePackSummaryTitle}>{unlockedPackCount} packs actifs</Text>
            <Text style={styles.couplePackSummaryText}>{lockedPackCount} univers encore à explorer</Text>
          </View>
          <SpringPressable onPress={() => setStoreOpen(true)} style={styles.coupleBoutiqueButton}>
            <Text style={styles.coupleBoutiqueText}>Boutique</Text>
          </SpringPressable>
        </View>

        <View style={styles.coupleReconnectCard}>
          <View style={styles.coupleReconnectCopy}>
            <Text style={styles.coupleReconnectLabel}>Code partenaire</Text>
            <Text selectable style={styles.coupleReconnectCode}>{couple.inviteCode}</Text>
            <Text style={styles.coupleReconnectText}>À garder sous la main pour relier ou resynchroniser facilement.</Text>
          </View>
          <WsIconButton
            accessibilityLabel="Copier le code partenaire"
            icon={<Copy size={18} color={candy.white} />}
            onPress={onCopyInvite}
            size={46}
            style={styles.coupleReconnectButton}
            variant="hot"
          />
        </View>
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
        onRestorePurchases={onRestorePurchases}
        visible={storeOpen}
      />
      <CategoryPurchaseModal
        category={purchaseCategory}
        onClose={() => setPurchaseCategory(null)}
        onUnlock={(category) => {
          onUnlockCategory(category);
          setPurchaseCategory(null);
          setStoreOpen(false);
        }}
      />
      <CustomCardsPurchaseModal
        customCount={customCount}
        onClose={() => setCustomPurchaseOpen(false)}
        onUnlock={() => {
          onUnlockCustomCards();
          setCustomPurchaseOpen(false);
          setStoreOpen(false);
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

function CoupleProfileCard({
  couple,
  highlighted,
  id,
  packCount,
}: {
  couple: CoupleState;
  highlighted?: boolean;
  id: PartnerId;
  packCount: number;
}) {
  const profile = couple.profiles[id];
  const mood = moodOptions.find((option) => option.level === moodLevel(couple, id)) ?? moodOptions[0];
  const vibe = profile.vibe && !/invitation en attente/i.test(profile.vibe)
    ? profile.vibe
    : id === "me"
      ? "Flirt"
      : "Mystère";

  return (
    <View style={[styles.coupleProfileCard, highlighted && styles.coupleProfileCardHighlight]}>
      <View style={styles.coupleProfileAvatar}>
        <Text style={styles.coupleProfileEmoji}>{profileEmoji(profile)}</Text>
      </View>
      <Text numberOfLines={1} style={styles.coupleProfileName}>{profile.displayName}</Text>
      <Text numberOfLines={1} style={styles.coupleProfileVibe}>{vibe}</Text>
      <View style={styles.coupleProfileMoodRow}>
        <View style={[styles.coupleProfileMoodDot, highlighted && styles.coupleProfileMoodDotHot]} />
        <Text numberOfLines={1} style={styles.coupleProfileMoodText}>Mood : {mood.label.toLowerCase()}</Text>
      </View>
      <View style={styles.coupleProfilePackRow}>
        <Text numberOfLines={1} style={styles.coupleProfilePackText}>{packCount} packs actifs</Text>
      </View>
    </View>
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
      <Text style={styles.coupleRecentOpenText}>Ouvrir →</Text>
    </SpringPressable>
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
    <LinearGradient colors={unlocked ? tone.colors : [candy.cream, candy.roseSoft, "#EBD8C0"]} style={[styles.coupleCategoryCard, !unlocked && styles.coupleCategoryCardLocked]}>
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
    <PurchaseLandingModal
      category={category}
      ctaLabel={`Débloquer · ${price}`}
      legalText="Achat unique · Pour vous deux · Restaurable"
      onClose={onClose}
      onUnlock={() => onUnlock(category)}
      subtitle={`Des envies ${categoryLabel(category).toLowerCase()}, à découvrir sans pression. Pour les soirs où votre curiosité ne demande qu'à jouer.`}
      title={`Pack ${categoryLabel(category)}`}
      visible
      previewLabel={`Contenu masqué jusqu'au déblocage · 18+ · ${cardCount} cartes`}
      visualLabel={categoryLabel(category)}
      visualMeta={`${cardCount} cartes`}
    />
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
    <PurchaseLandingModal
      ctaLabel={`Débloquer · ${CUSTOM_CARDS_UNLIMITED_PRICE}`}
      featureEmoji={stickers.wand}
      featureKind="custom"
      legalText="Achat unique · Pour vous deux · Restaurable"
      onClose={onClose}
      onUnlock={onUnlock}
      subtitle={`Vous avez ${Math.min(customCount, CUSTOM_CARD_FREE_LIMIT)}/${CUSTOM_CARD_FREE_LIMIT} cartes gratuites. Passez en illimité pour créer votre propre terrain de jeu.`}
      title="Cartes perso illimitées"
      visible
      visualLabel="Perso"
      visualMeta="création libre"
    />
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
    <PurchaseLandingModal
      ctaLabel={`Débloquer · ${NO_ADS_PRICE}`}
      featureEmoji="🚫"
      featureKind="comfort"
      legalText="Achat unique · Pour vous deux · Restaurable"
      onClose={onClose}
      onUnlock={onUnlock}
      subtitle="Retire les écrans sponsorisés pour garder le rythme quand vous jouez ou révélez un match."
      title="Pack No Ads"
      visible
      visualLabel="No Ads"
      visualMeta="sans interruption"
    />
  );
}

function UnlimitedResponsesPurchaseModal({
  dailyUsed,
  limitReached,
  onClose,
  onUnlock,
  partnerName,
  visible,
}: {
  dailyUsed: number;
  limitReached?: boolean;
  onClose: () => void;
  onUnlock: () => void;
  partnerName?: string;
  visible: boolean;
}) {
  if (!visible) {
    return null;
  }

  const usedToday = Math.min(dailyUsed, DAILY_FREE_RESPONSE_LIMIT);

  if (limitReached) {
    return (
      <DailyLimitReachedModal
        onClose={onClose}
        onUnlock={onUnlock}
        partnerName={partnerName}
        usedToday={usedToday}
        visible
      />
    );
  }

  return (
    <PurchaseLandingModal
      ctaLabel={`Débloquer · ${UNLIMITED_RESPONSES_PRICE}`}
      featureEmoji="🎟️"
      featureKind="unlimited"
      legalText="Achat unique · Pour vous deux · Restaurable"
      onClose={onClose}
      onUnlock={onUnlock}
      subtitle={limitReached
        ? `${usedToday}/${DAILY_FREE_RESPONSE_LIMIT} choix utilisés aujourd'hui. Débloquez l'illimité pour continuer la session.`
        : `${DAILY_FREE_RESPONSE_LIMIT} choix gratuits par jour. L'illimité garde la partie ouverte aussi longtemps que vous voulez.`}
      title={limitReached ? "Continuer ce soir" : "Réponses illimitées"}
      visible
      visualLabel="Illimité"
      visualMeta="choix sans limite"
    />
  );
}

function DailyLimitReachedModal({
  onClose,
  onUnlock,
  partnerName,
  usedToday,
  visible,
}: {
  onClose: () => void;
  onUnlock: () => void;
  partnerName?: string;
  usedToday: number;
  visible: boolean;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const partnerLabel = partnerName?.trim() || "Ton/ta partenaire";

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View
        style={[
          styles.dailyLimitOverlay,
          {
            paddingBottom: Math.max(18, safeAreaInsets.bottom + 10),
            paddingTop: Math.max(18, safeAreaInsets.top + 8),
          },
        ]}
      >
        <View pointerEvents="none" style={styles.dailyLimitGlow} />
        <SpringPressable onPress={onClose} style={styles.dailyLimitClose}>
          <X color={candy.white} size={25} strokeWidth={2.6} />
        </SpringPressable>

        <View style={styles.dailyLimitContent}>
          <View style={styles.dailyLimitBadge}>
            <Text style={styles.dailyLimitBadgeCount}>{usedToday}/{DAILY_FREE_RESPONSE_LIMIT}</Text>
            <Text style={styles.dailyLimitBadgeLabel}>Aujourd'hui</Text>
          </View>
          <Text style={styles.dailyLimitTitle}>C'est tout{`\n`}pour aujourd'hui<Text style={styles.dailyLimitTitleDot}>.</Text></Text>
          <Text style={styles.dailyLimitText}>
            Tes {DAILY_FREE_RESPONSE_LIMIT} réponses gratuites sont utilisées. La suite demain - ou tout de suite.
          </Text>
          <Text style={styles.dailyLimitPartnerText}>{partnerLabel} peut continuer à jouer de son côté.</Text>
        </View>

        <View style={styles.dailyLimitActions}>
          <SpringPressable onPress={onUnlock} style={styles.dailyLimitPrimary}>
            <Text style={styles.dailyLimitPrimaryText}>Réponses illimitées · {UNLIMITED_RESPONSES_PRICE}</Text>
          </SpringPressable>
          <SpringPressable onPress={onClose} style={styles.dailyLimitSecondary}>
            <Text style={styles.dailyLimitSecondaryText}>Revenir demain</Text>
          </SpringPressable>
        </View>
      </View>
    </Modal>
  );
}

function PurchaseLandingModal({
  category,
  ctaLabel,
  featureEmoji,
  featureKind = "pack",
  legalText,
  onClose,
  onUnlock,
  previewLabel = "Contenu masqué jusqu'au déblocage · 18+",
  subtitle,
  title,
  visible,
  visualLabel,
  visualMeta,
}: {
  category?: DesireCategory;
  ctaLabel: string;
  featureEmoji?: string;
  featureKind?: "pack" | "custom" | "comfort" | "unlimited";
  legalText: string;
  onClose: () => void;
  onUnlock: () => void;
  previewLabel?: string;
  subtitle: string;
  title: string;
  visible: boolean;
  visualLabel: string;
  visualMeta: string;
}) {
  const safeAreaInsets = useSafeAreaInsets();
  const visual = category ? categoryVisual(category) : undefined;
  const visualColors = visual?.colors ?? (
    featureKind === "comfort"
      ? [candy.black, "#4A1F50", candy.red]
      : featureKind === "unlimited"
        ? [candy.yellow, "#FFD84D", "#F5286E"]
        : [candy.cream, candy.roseMist, candy.pinkSoft]
  );

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <LinearGradient
        colors={[candy.red, candy.red]}
        style={[
          styles.purchaseOverlay,
          {
            paddingBottom: Math.max(18, safeAreaInsets.bottom + 10),
            paddingTop: Math.max(18, safeAreaInsets.top + 8),
          },
        ]}
      >
        <SpringPressable onPress={onClose} style={styles.purchaseBackButton}>
          <ArrowLeft size={18} color={candy.white} />
        </SpringPressable>
        <View style={styles.purchaseContent}>
          <View style={styles.purchaseHero}>
            <View style={styles.purchasePackShadow} />
            <LinearGradient colors={visualColors} style={styles.purchasePackVisual}>
              {category ? <CategoryPickerPattern category={category} /> : <PurchaseFeaturePattern kind={featureKind} />}
              {featureEmoji ? <Text style={styles.purchaseFeatureEmoji}>{featureEmoji}</Text> : null}
              <View style={styles.purchaseVisualCopy}>
                <Text numberOfLines={1} style={styles.purchaseVisualTitle}>{visualLabel}</Text>
                <Text numberOfLines={1} style={styles.purchaseVisualMeta}>{visualMeta}</Text>
              </View>
            </LinearGradient>
          </View>
          <Text style={styles.purchaseTitle}>{title}</Text>
          <Text style={styles.purchaseText}>{subtitle}</Text>
          <View style={styles.purchasePreviewRow}>
            {[0, 1, 2].map((index) => (
              <View key={index} style={[styles.purchasePreviewCard, index === 0 && styles.purchasePreviewCardLeft, index === 2 && styles.purchasePreviewCardRight]}>
                <Text style={styles.purchasePreviewTag}>{visualLabel}</Text>
                <View style={styles.purchasePreviewLineWide} />
                <View style={styles.purchasePreviewLine} />
                <View style={styles.purchasePreviewLineShort} />
              </View>
            ))}
          </View>
          <Text style={styles.purchaseFinePrint}>{previewLabel}</Text>
        </View>
        <View style={styles.purchaseBottomBar}>
          <SpringPressable onPress={onUnlock} style={styles.purchasePrimary}>
            <Text style={styles.purchasePrimaryText}>{ctaLabel}</Text>
          </SpringPressable>
          <Text style={styles.purchaseLegalText}>{legalText}</Text>
        </View>
      </LinearGradient>
    </Modal>
  );
}

function PurchaseFeaturePattern({ kind }: { kind: "pack" | "custom" | "comfort" | "unlimited" }) {
  const dotKind = kind === "unlimited";

  return (
    <View pointerEvents="none" style={styles.purchaseFeaturePatternLayer}>
      {Array.from({ length: dotKind ? 28 : 8 }).map((_, index) => (
        <View
          key={index}
          style={[
            dotKind ? styles.purchaseFeatureDot : styles.purchaseFeatureStripe,
            dotKind
              ? {
                left: `${8 + (index % 7) * 14}%`,
                top: `${9 + Math.floor(index / 7) * 22}%`,
              }
              : { left: `${index * 18 - 32}%` },
          ]}
        />
      ))}
    </View>
  );
}

function PurchaseSuccessScreen({
  partnerName,
  purchase,
  onDiscover,
}: {
  partnerName?: string;
  purchase: PurchaseSuccess;
  onDiscover: () => void;
}) {
  const pulse = useLoop(1700);
  const drift = useLoop(4200);
  const unlockAnim = useRef(new Animated.Value(0)).current;
  const isCustom = purchase.kind === "custom";
  const isNoAds = purchase.kind === "no_ads";
  const isUnlimitedResponses = purchase.kind === "unlimited_responses";
  const category: DesireCategory = purchase.kind === "category" ? purchase.category : "Perso";
  const purchaseAnimationKey = purchase.kind === "category" || purchase.kind === "custom"
    ? `${purchase.kind}:${purchase.category}`
    : purchase.kind;
  const featureKind = isUnlimitedResponses ? "unlimited" : "comfort";
  const tone = isNoAds || isUnlimitedResponses
    ? {
        colors: isUnlimitedResponses
          ? [candy.yellow, "#FFD84D", candy.red] as const
          : [candy.black, "#4A1F50", candy.red] as const,
        tagText: isUnlimitedResponses ? candy.ink : candy.cream,
        titleText: isUnlimitedResponses ? candy.ink : candy.cream,
      }
    : categoryCardTone(category);
  const visualTitle = isNoAds
    ? "Zéro pub"
    : isUnlimitedResponses
      ? "Réponses illimitées"
      : isCustom
        ? "Cartes perso"
        : `Pack ${categoryLabel(category)}`;
  const visualMeta = isNoAds
    ? "sans interruption"
    : isUnlimitedResponses
      ? "tous les soirs"
    : isCustom
      ? "illimité"
      : `${desireCardCount(category)} cartes`;
  const title = isNoAds
    ? "Zéro pub\ndébloqué."
    : isUnlimitedResponses
      ? "Réponses illimitées\ndébloquées."
      : isCustom
        ? "Cartes perso\ndébloquées."
        : `Pack ${categoryLabel(category)}\ndébloqué.`;
  const partnerCopy = partnerName ? `${partnerName} vient de recevoir l'info.` : "Votre partenaire vient de recevoir l'info.";
  const successText = isNoAds
    ? "Les révélations sont maintenant sans interruption pour vous deux."
    : isUnlimitedResponses
      ? "Vous pouvez répondre sans compter, tous les soirs."
      : isCustom
        ? `Vos idées peuvent maintenant vivre sans limite. ${partnerCopy}`
        : `${desireCardCount(category)} nouvelles cartes vous attendent, tous les deux. ${partnerCopy}`;
  const price = isNoAds
    ? NO_ADS_PRICE
    : isUnlimitedResponses
      ? UNLIMITED_RESPONSES_PRICE
      : isCustom
        ? CUSTOM_CARDS_UNLIMITED_PRICE
        : CATEGORY_PRICES[category] ?? "4,99 €";
  const stickerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
  const floatY = drift.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const shimmerX = pulse.interpolate({ inputRange: [0, 1], outputRange: [-18, 18] });
  const unlockOpacity = unlockAnim.interpolate({ inputRange: [0, 0.16, 1], outputRange: [0, 1, 1] });
  const unlockScale = unlockAnim.interpolate({ inputRange: [0, 0.68, 1], outputRange: [0.72, 1.09, 1] });
  const unlockRotate = unlockAnim.interpolate({ inputRange: [0, 0.68, 1], outputRange: ["-12deg", "6deg", "3deg"] });
  const unlockY = unlockAnim.interpolate({ inputRange: [0, 0.68, 1], outputRange: [34, -10, 0] });
  const unlockGlowOpacity = unlockAnim.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0, 0.42, 0.16] });
  const unlockGlowScale = unlockAnim.interpolate({ inputRange: [0, 0.68, 1], outputRange: [0.5, 1.24, 1.05] });
  const unlockBadgeOpacity = unlockAnim.interpolate({ inputRange: [0, 0.52, 0.68, 1], outputRange: [0, 0, 1, 1] });
  const unlockBadgeScale = unlockAnim.interpolate({ inputRange: [0, 0.52, 0.76, 1], outputRange: [0.4, 0.4, 1.18, 1] });
  const unlockContentOpacity = unlockAnim.interpolate({ inputRange: [0, 0.58, 1], outputRange: [0, 0, 1] });
  const unlockContentY = unlockAnim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  const unlockCTAOpacity = unlockAnim.interpolate({ inputRange: [0, 0.72, 1], outputRange: [0, 0, 1] });
  const unlockCTAY = unlockAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
  const unlockParticleOpacity = unlockAnim.interpolate({ inputRange: [0, 0.28, 0.78, 1], outputRange: [0, 0, 1, 0.72] });
  const lightVisualText = isNoAds || ["Scénarios", "Kinky Soft", "Jeux & Défis", "BDSM", "Tabous"].includes(category);

  useEffect(() => {
    unlockAnim.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(unlockAnim, {
        toValue: 0.72,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: useNativeAnimations,
      }),
      Animated.spring(unlockAnim, {
        toValue: 1,
        friction: 5,
        tension: 86,
        useNativeDriver: useNativeAnimations,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [purchaseAnimationKey, unlockAnim]);

  return (
    <View style={styles.purchaseSuccessScreen}>
      <Animated.View pointerEvents="none" style={[styles.purchaseSuccessGlow, { transform: [{ scale: stickerScale }] }]} />
      <Animated.View pointerEvents="none" style={[styles.purchaseSuccessConfettiDot, styles.purchaseSuccessConfettiOne, { transform: [{ translateY: floatY }] }]} />
      <Animated.View pointerEvents="none" style={[styles.purchaseSuccessConfettiDash, styles.purchaseSuccessConfettiTwo, { transform: [{ translateY: floatY }, { rotate: "28deg" }] }]} />
      <Animated.View pointerEvents="none" style={[styles.purchaseSuccessConfettiDot, styles.purchaseSuccessConfettiThree, { transform: [{ translateX: shimmerX }] }]} />
      <Animated.View pointerEvents="none" style={[styles.purchaseSuccessConfettiDash, styles.purchaseSuccessConfettiFour, { transform: [{ translateX: shimmerX }, { rotate: "-22deg" }] }]} />

      <SpringPressable onPress={onDiscover} style={styles.purchaseSuccessClose}>
        <X size={26} color={candy.white} />
      </SpringPressable>

      <View style={styles.purchaseSuccessCenter}>
        <Entrance delay={0} style={styles.purchaseSuccessHero}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.purchaseSuccessUnlockGlow,
              {
                opacity: unlockGlowOpacity,
                transform: [{ scale: unlockGlowScale }],
              },
            ]}
          />
          <View style={styles.purchaseSuccessPackShadow} />
          <Animated.View
            style={[
              styles.purchaseSuccessUnlockStage,
              {
                opacity: unlockOpacity,
                transform: [
                  { translateY: unlockY },
                  { scale: unlockScale },
                  { rotate: unlockRotate },
                ],
              },
            ]}
          >
            <LinearGradient colors={tone.colors} style={styles.purchaseSuccessPackVisual}>
              {isNoAds || isUnlimitedResponses ? <PurchaseFeaturePattern kind={featureKind} /> : <CategoryPickerPattern category={category} />}
              <View style={styles.purchaseSuccessVisualCopy}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.purchaseSuccessVisualTitle,
                    lightVisualText && styles.purchaseSuccessVisualTitleLight,
                    { color: tone.titleText },
                  ]}
                >
                  {visualTitle}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.purchaseSuccessVisualMeta,
                    lightVisualText && styles.purchaseSuccessVisualMetaLight,
                    { color: tone.titleText },
                  ]}
                >
                  {visualMeta}
                </Text>
              </View>
            </LinearGradient>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.purchaseSuccessUnlockBadge,
                {
                  opacity: unlockBadgeOpacity,
                  transform: [{ scale: unlockBadgeScale }],
                },
              ]}
            >
              <Check size={34} color={candy.ink} strokeWidth={3.4} />
            </Animated.View>
            <View pointerEvents="none" style={styles.purchaseSuccessUnlockParticleLayer}>
              {purchaseUnlockParticles.map((particle, index) => (
                <Animated.View
                  key={`${particle.left}-${particle.top}-${index}`}
                  style={[
                    styles.purchaseSuccessUnlockParticle,
                    {
                      backgroundColor: particle.color,
                      borderRadius: particle.radius,
                      height: particle.height,
                      left: particle.left,
                      opacity: unlockParticleOpacity,
                      top: particle.top,
                      width: particle.width,
                      transform: [
                        {
                          translateX: unlockAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, particle.x],
                          }),
                        },
                        {
                          translateY: unlockAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, particle.y],
                          }),
                        },
                        { rotate: particle.rotate },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          </Animated.View>
        </Entrance>

        <Entrance delay={190}>
          <Animated.View style={[styles.purchaseSuccessCopy, { opacity: unlockContentOpacity, transform: [{ translateY: unlockContentY }] }]}>
            <Text style={styles.purchaseSuccessTitle}>{title}</Text>
            <Text style={styles.purchaseSuccessText}>{successText}</Text>
          </Animated.View>
        </Entrance>
      </View>

      <Animated.View style={[styles.purchaseSuccessBottom, { opacity: unlockCTAOpacity, transform: [{ translateY: unlockCTAY }] }]}>
        <SpringPressable onPress={onDiscover} style={styles.purchaseSuccessCTA}>
          <Text style={styles.purchaseSuccessCTAText}>Commencer à jouer</Text>
        </SpringPressable>
        <Text style={styles.purchaseSuccessLegal}>{price} · Reçu vérifié · Restaurable à tout moment</Text>
      </Animated.View>
    </View>
  );
}

function ProfileScreen({
  authError,
  couple,
  onBack,
  providerLoading,
  session,
  onLogout,
  onMoodNotificationPreference,
  onNotificationPreference,
  onProvider,
  onDeleteAccount,
  onRequestLeaveCouple,
  onReplayTutorial,
  onRestorePurchases,
  onReset,
  onProfileNameChange,
  onStatusEmojiChange,
}: {
  authError: string;
  couple: CoupleState;
  onBack: () => void;
  providerLoading: AuthProvider | null;
  session: Session | null;
  onLogout: () => void;
  onMoodNotificationPreference: (enabled: boolean) => void;
  onNotificationPreference: (key: NotificationToggleKey, enabled: boolean) => void;
  onProvider: (provider: AuthProvider) => void;
  onDeleteAccount: () => void;
  onRequestLeaveCouple: () => void;
  onReplayTutorial: () => void;
  onRestorePurchases: () => void;
  onReset: () => void;
  onProfileNameChange: (name: string) => void;
  onStatusEmojiChange: (emoji: string) => void;
}) {
  const activeProfile = couple.profiles[couple.activePartnerId];
  const activePartnerId = couple.activePartnerId;
  const settings = notificationSettings(couple);
  const account = authAccountInfo(session);
  const safeAreaInsets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const profileFrameHeight = Math.max(0, viewportHeight - safeAreaInsets.top - safeAreaInsets.bottom);
  const profileSurface = fullScreenSurfaceMetrics(viewportWidth);
  const profileContentWidth = profileSurface.contentWidth;
  const profileVerticalGap = Math.min(24, Math.max(14, profileFrameHeight * 0.014));
  const profileScreenStyle = useMemo<ViewStyle>(() => ({
    gap: profileVerticalGap,
    paddingBottom: Math.max(126, safeAreaInsets.bottom + TAB_DOCK_VISIBLE_HEIGHT + profileVerticalGap * 2),
    paddingTop: Math.max(14, safeAreaInsets.top + 10),
  }), [profileVerticalGap, safeAreaInsets.bottom, safeAreaInsets.top]);
  const profileContentFrameStyle = useMemo<ViewStyle>(() => ({
    width: profileContentWidth,
  }), [profileContentWidth]);
  const notificationRows: Array<{
    emoji: string;
    key: NotificationToggleKey;
    title: string;
  }> = [
    {
      emoji: "✨",
      key: "moodSignalEnabled",
      title: "Humeur partagée",
    },
    {
      emoji: "🎲",
      key: "dailyReminderEnabled",
      title: "Carte du jour",
    },
    {
      emoji: "🔥",
      key: "matchRevealEnabled",
      title: "Nouveaux matchs",
    },
    {
      emoji: "💬",
      key: "chatMessageEnabled",
      title: "Messages privés",
    },
    {
      emoji: "🎁",
      key: "promotionEnabled",
      title: "Promotions",
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

  function confirmDeleteAccount() {
    const title = "Supprimer ton compte ?";
    const message =
      "Ton compte, ton profil, tes votes, tes messages et tes photos privées seront supprimés côté serveur. Cette action est définitive.";

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm(`${title}\n\n${message}`)) {
        void onDeleteAccount();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: onDeleteAccount },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={[styles.profileScreen, profileScreenStyle]} showsVerticalScrollIndicator={false}>
      <View style={[styles.profileHeader, profileContentFrameStyle]}>
        <SpringPressable onPress={onBack} style={styles.profileBackButton}>
          <ArrowLeft size={24} color={candy.white} strokeWidth={3} />
        </SpringPressable>
        <Text style={styles.profileHeaderTitle}>Profil</Text>
      </View>
      <View style={[styles.profileMainArea, profileContentFrameStyle]}>
        <View style={styles.profileSettingsSection}>
          <Text style={styles.profileSectionTitle}>Profil</Text>
          <StatusEmojiEditor profile={activeProfile} onChange={onStatusEmojiChange} onNameChange={onProfileNameChange} />
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
                  key={row.key}
                  onToggle={() => toggle(!enabled)}
                  title={row.title}
                />
              );
            })}
          </View>
        </View>

        <View style={styles.profileSettingsSection}>
          <Text style={styles.profileSectionTitle}>Application</Text>
          <View style={styles.profileUtilityGrid}>
            <SpringPressable onPress={confirmReset} style={styles.profileAction}>
              <RefreshCcw size={21} color={candy.red} />
              <Text numberOfLines={1} style={styles.profileActionText}>Réinitialiser le test</Text>
              <ChevronRight size={18} color="rgba(43,23,53,0.34)" />
            </SpringPressable>
            <SpringPressable onPress={onReplayTutorial} style={styles.profileAction}>
              <Sparkles size={21} color={candy.red} />
              <Text numberOfLines={1} style={styles.profileActionText}>Revoir l'intro</Text>
              <ChevronRight size={18} color="rgba(43,23,53,0.34)" />
            </SpringPressable>
            <SpringPressable onPress={onRestorePurchases} style={styles.profileAction}>
              <RefreshCcw size={21} color={candy.red} />
              <Text numberOfLines={1} style={styles.profileActionText}>Restaurer les achats</Text>
              <ChevronRight size={18} color="rgba(43,23,53,0.34)" />
            </SpringPressable>
            <SpringPressable onPress={onRequestLeaveCouple} style={[styles.profileAction, styles.profileActionDanger]}>
              <Users size={21} color={candy.red} />
              <Text numberOfLines={1} style={[styles.profileActionText, styles.profileActionDangerText]}>Quitter le couple</Text>
              <ChevronRight size={18} color="rgba(255,249,240,0.62)" />
            </SpringPressable>
            <SpringPressable onPress={confirmDeleteAccount} style={[styles.profileAction, styles.profileActionDangerSolid]}>
              <Trash2 size={21} color={candy.white} />
              <Text numberOfLines={1} style={[styles.profileActionText, styles.profileActionDangerSolidText]}>Supprimer mon compte</Text>
              <ChevronRight size={18} color="rgba(255,249,240,0.62)" />
            </SpringPressable>
            <SpringPressable onPress={onLogout} style={[styles.profileAction, styles.profileActionDark]}>
              <LogOut size={21} color={candy.white} />
              <Text numberOfLines={1} style={[styles.profileActionText, styles.profileActionDarkText]}>Se déconnecter</Text>
              <ChevronRight size={18} color="rgba(255,249,240,0.62)" />
            </SpringPressable>
          </View>
        </View>

      <View style={styles.aboutPanel}>
        <Text style={styles.aboutEyebrow}>À propos</Text>
        <Text style={styles.aboutTitle}>WeSpice</Text>
        <Text style={styles.aboutText}>
          WeSpice est un espace à deux pour partager une humeur, répondre à des envies et découvrir ce qui vous rejoint sans pression. Les réponses restent discrètes jusqu'au match, puis deviennent une invitation simple à en parler ensemble.
        </Text>
        <Text style={styles.aboutMeta}>{PROJECT_VERSION.label}</Text>
      </View>
      </View>
    </ScrollView>
  );
}

function StatusEmojiEditor({
  onChange,
  onNameChange,
  profile,
}: {
  onChange: (emoji: string) => void;
  onNameChange: (name: string) => void;
  profile: PartnerProfile;
}) {
  const [customEmoji, setCustomEmoji] = useState(profileEmoji(profile));
  const [profileName, setProfileName] = useState(profile.displayName);
  const currentEmoji = profileEmoji(profile);
  const currentName = normalizeProfileDisplayName(profile.displayName);

  useEffect(() => {
    setCustomEmoji(currentEmoji);
  }, [currentEmoji]);

  useEffect(() => {
    setProfileName(currentName);
  }, [currentName]);

  const submitProfileName = useCallback(() => {
    const nextName = normalizeProfileDisplayName(profileName, currentName);
    setProfileName(nextName);

    if (nextName !== currentName) {
      onNameChange(nextName);
    }
  }, [currentName, onNameChange, profileName]);

  const applyStatusEmoji = useCallback((nextEmoji: string) => {
    if (!nextEmoji || /[a-z0-9]/i.test(nextEmoji)) {
      return;
    }

    setCustomEmoji(nextEmoji);
    if (nextEmoji !== currentEmoji) {
      onChange(nextEmoji);
    }
  }, [currentEmoji, onChange]);

  const handleCustomEmojiChange = useCallback((value: string) => {
    const rawValue = value.trim();
    setCustomEmoji(value);

    if (!rawValue) {
      return;
    }

    const insertedValue =
      customEmoji && rawValue.startsWith(customEmoji) && rawValue.length > customEmoji.length
        ? rawValue.slice(customEmoji.length)
        : customEmoji && rawValue.endsWith(customEmoji) && rawValue.length > customEmoji.length
          ? rawValue.slice(0, -customEmoji.length)
          : rawValue;
    const nextEmoji = normalizeStatusEmoji(insertedValue || rawValue);
    applyStatusEmoji(nextEmoji);
  }, [applyStatusEmoji, customEmoji]);

  return (
    <View style={styles.statusEditorPanel}>
      <View style={styles.statusEditorHeader}>
        <View style={styles.statusEditorPreview}>
          <Text style={styles.statusEditorPreviewEmoji}>{currentEmoji}</Text>
        </View>
        <View style={styles.statusEditorCopy}>
          <Text style={styles.statusEditorNameLabel}>Nom d'utilisateur</Text>
          <View style={styles.statusNameInputBox}>
            <TextInput
              accessibilityLabel="Nom d'utilisateur"
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={32}
              onBlur={submitProfileName}
              onChangeText={setProfileName}
              onSubmitEditing={submitProfileName}
              placeholder="Ton nom"
              placeholderTextColor="rgba(35,18,36,0.34)"
              returnKeyType="done"
              selectTextOnFocus
              style={[styles.statusNameInput, Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : null]}
              value={profileName}
            />
          </View>
          <Text style={styles.statusEditorText}>Ton nom et ton avatar visibles dans votre espace.</Text>
        </View>
      </View>
      <View style={styles.statusCustomRow}>
        <View style={styles.statusCustomInputBox}>
          <TextInput
            accessibilityLabel="Emoji du profil"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={8}
            onBlur={() => setCustomEmoji(currentEmoji)}
            onChangeText={handleCustomEmojiChange}
            placeholder="🙂"
            placeholderTextColor="rgba(35,18,36,0.34)"
            selectTextOnFocus
            style={[styles.statusCustomInput, Platform.OS === "web" ? ({ outlineStyle: "none" } as never) : null]}
            value={customEmoji}
          />
        </View>
      </View>
      <View style={styles.statusPresetGrid}>
        {statusEmojiPresets.slice(0, 8).map((emoji) => (
          <SpringPressable
            key={emoji}
            onPress={() => applyStatusEmoji(emoji)}
            style={[styles.statusPresetButton, currentEmoji === emoji && styles.statusPresetButtonActive]}
          >
            <Text style={styles.statusPresetEmoji}>{emoji}</Text>
          </SpringPressable>
        ))}
      </View>
    </View>
  );
}

function NotificationPreferenceRow({
  enabled,
  emoji,
  onToggle,
  title,
}: {
  enabled: boolean;
  emoji: string;
  onToggle: () => void;
  title: string;
}) {
  return (
    <View style={styles.profileNotificationPanel}>
      <View style={[styles.profileNotificationIcon, enabled && styles.profileNotificationIconOn]}>
        <Text style={styles.profileNotificationEmoji}>{emoji}</Text>
      </View>
      <View style={styles.profileNotificationCopy}>
        <Text style={styles.profileNotificationTitle}>{title}</Text>
      </View>
      <SpringPressable
        onPress={onToggle}
        style={[styles.profileNotificationToggle, enabled && styles.profileNotificationToggleOn]}
      >
        <Text
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.profileNotificationToggleText, enabled && styles.profileNotificationToggleTextOn]}
        >
          {enabled ? "Activé" : "Désactivé"}
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
  onDebugUnlockAllPurchases,
  onDebugUnlockCategory,
  onDebugUnlockFeature,
  onDisableDebugProfiles,
  onReplayTutorial,
  onReset,
  onShowDebugPreview,
  onShowInvitePrompt,
  onShowOnboarding,
}: {
  couple: CoupleState;
  onActorChange: (id: PartnerId) => void;
  onApplyPreset: (preset: DebugPresetId) => void;
  onDebugFakeAd: () => void;
  onDebugUnlockAllPurchases: () => void;
  onDebugUnlockCategory: (category: DesireCategory) => void;
  onDebugUnlockFeature: (feature: UnlockedFeature) => void;
  onDisableDebugProfiles: () => void;
  onReplayTutorial: () => void;
  onReset: () => void;
  onShowDebugPreview: (screen: DebugPreviewScreen) => void;
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
  const debugFeaturePurchases: Array<{
    feature: UnlockedFeature;
    title: string;
    text: string;
    price: string;
  }> = [
    {
      feature: UNLIMITED_RESPONSES_FEATURE,
      title: "Réponses illimitées",
      text: "Bypass la limite gratuite du jour.",
      price: UNLIMITED_RESPONSES_PRICE,
    },
    {
      feature: CUSTOM_CARDS_UNLIMITED_FEATURE,
      title: "Cartes perso illimitées",
      text: "Création libre au-delà des 3 cartes gratuites.",
      price: CUSTOM_CARDS_UNLIMITED_PRICE,
    },
    {
      feature: NO_ADS_FEATURE,
      title: "Zéro pub",
      text: "Désactive les interstitiels de test.",
      price: NO_ADS_PRICE,
    },
  ];
  const unlockedPaidPacksCount = PAID_PACK_CATEGORIES.filter((category) => isCategoryUnlocked(couple, category)).length;
  const unlockedFeaturesCount = PAID_FEATURES.filter((feature) => isFeatureUnlocked(couple, feature)).length;
  const allDebugPurchasesUnlocked =
    unlockedPaidPacksCount === PAID_PACK_CATEGORIES.length && unlockedFeaturesCount === PAID_FEATURES.length;

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
        <SpringPressable onPress={() => onShowDebugPreview("auth")} style={styles.debugAction}>
          <LockKeyhole size={19} color={candy.red} />
          <View style={styles.debugActionCopy}>
            <Text style={styles.debugActionTitle}>Écran connexion</Text>
            <Text style={styles.debugActionText}>Preview Google / Apple sans lancer OAuth.</Text>
          </View>
        </SpringPressable>
        <SpringPressable onPress={() => onShowDebugPreview("loading")} style={styles.debugAction}>
          <RefreshCcw size={19} color={candy.red} />
          <View style={styles.debugActionCopy}>
            <Text style={styles.debugActionTitle}>Écran loading</Text>
            <Text style={styles.debugActionText}>Affiche le splash de préparation.</Text>
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
        <Text style={styles.debugSectionTitle}>Boutique debug</Text>
        <Text style={styles.debugSectionText}>Simule les achats localement sans RevenueCat.</Text>
      </View>

      <View style={styles.debugPurchasePanel}>
        <SpringPressable
          disabled={allDebugPurchasesUnlocked}
          onPress={onDebugUnlockAllPurchases}
          style={[styles.debugPurchaseAll, allDebugPurchasesUnlocked && styles.debugPurchaseAllDone]}
        >
          <View style={styles.debugPurchaseAllIcon}>
            {allDebugPurchasesUnlocked ? (
              <Check size={22} color={candy.black} strokeWidth={3} />
            ) : (
              <Sparkles size={22} color={candy.black} strokeWidth={3} />
            )}
          </View>
          <View style={styles.debugActionCopy}>
            <Text style={styles.debugPurchaseAllTitle}>
              {allDebugPurchasesUnlocked ? "Tout est acheté" : "Tout acheter"}
            </Text>
            <Text style={styles.debugPurchaseAllText}>
              {unlockedPaidPacksCount}/{PAID_PACK_CATEGORIES.length} packs · {unlockedFeaturesCount}/{PAID_FEATURES.length} options
            </Text>
          </View>
          <Text style={styles.debugPurchaseAllCta}>
            {allDebugPurchasesUnlocked ? "Complet" : "Débloquer"}
          </Text>
        </SpringPressable>

        <View style={styles.debugPurchaseGrid}>
          {PAID_PACK_CATEGORIES.map((category) => {
            const unlocked = isCategoryUnlocked(couple, category);
            const visual = categoryVisual(category);

            return (
              <SpringPressable
                disabled={unlocked}
                key={category}
                onPress={() => onDebugUnlockCategory(category)}
                style={[styles.debugPurchaseCard, unlocked && styles.debugPurchaseCardDone]}
              >
                <View style={[styles.debugPurchaseDot, { backgroundColor: visual.accent }]} />
                <View style={styles.debugPurchaseCopy}>
                  <Text numberOfLines={1} style={styles.debugPurchaseTitle}>Pack {categoryLabel(category)}</Text>
                  <Text numberOfLines={1} style={styles.debugPurchaseText}>
                    {desireCardCount(category)} cartes · {CATEGORY_PRICES[category] ?? "4,99 €"}
                  </Text>
                </View>
                <Text style={[styles.debugPurchaseStatus, unlocked && styles.debugPurchaseStatusDone]}>
                  {unlocked ? "Déjà actif" : "Acheter"}
                </Text>
              </SpringPressable>
            );
          })}
        </View>

        <View style={styles.debugPurchaseFeatureList}>
          {debugFeaturePurchases.map((item) => {
            const unlocked = isFeatureUnlocked(couple, item.feature);

            return (
              <SpringPressable
                disabled={unlocked}
                key={item.feature}
                onPress={() => onDebugUnlockFeature(item.feature)}
                style={[styles.debugPurchaseFeature, unlocked && styles.debugPurchaseFeatureDone]}
              >
                <View style={[styles.debugPurchaseFeatureIcon, unlocked && styles.debugPurchaseFeatureIconDone]}>
                  {unlocked ? <Check size={16} color={candy.black} /> : <LockKeyhole size={16} color={candy.white} />}
                </View>
                <View style={styles.debugActionCopy}>
                  <Text style={[styles.debugPurchaseFeatureTitle, unlocked && styles.debugPurchaseFeatureTitleDone]}>{item.title}</Text>
                  <Text style={[styles.debugPurchaseFeatureText, unlocked && styles.debugPurchaseFeatureTextDone]}>{item.text}</Text>
                </View>
                <Text style={styles.debugPurchaseFeaturePrice}>{unlocked ? "Actif" : item.price}</Text>
              </SpringPressable>
            );
          })}
        </View>
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

function WelcomeTutorialScreen({
  account,
  guestMode,
  initialPage = 0,
  onStart,
}: {
  account: AuthAccountInfo;
  guestMode: boolean;
  initialPage?: number;
  onStart: () => void;
}) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const [page, setPage] = useState(initialPage);
  const [demoVote, setDemoVote] = useState<VoteLevel | null>(null);
  const [demoCardNonce, setDemoCardNonce] = useState(0);
  const [demoCardExiting, setDemoCardExiting] = useState(false);
  const [demoTransitioning, setDemoTransitioning] = useState(false);
  const progressBarEntrance = useRef(new Animated.Value(0)).current;
  const progressBarProgress = useRef(new Animated.Value(0)).current;
  const demoTransitionTimers = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const compactWelcome = viewportHeight < 700;
  const welcomeScale = Math.min(1.45, Math.max(0.9, Math.min(viewportWidth / 390, viewportHeight / 844)));
  const demoScale = Math.min(1.35, welcomeScale);
  const demoCardWidth = Math.min(viewportWidth - 42 * demoScale, 376 * demoScale);
  const demoPracticeDeckHeight = (compactWelcome ? 250 : 282) * demoScale;
  const demoPracticeCardHeight = (compactWelcome ? 220 : 252) * demoScale;
  const demoVoteAreaHeight = (compactWelcome ? 54 : 58) * demoScale;
  const demoFeedbackHeight = (compactWelcome ? 60 : 64) * demoScale;
  const demoCardHeight = demoPracticeDeckHeight + demoVoteAreaHeight + (demoVote === null ? 0 : demoFeedbackHeight);
  const showDemoAnsweredPlaceholder = demoVote !== null && !demoTransitioning;
  const demoFeedback =
    demoVote !== null
      ? "Votre réponse à cette carte n'est pas sauvegardée."
      : "Personne ne voit ton choix. On révèle seulement si vous matchez.";
  const welcomeRules = [
    "Chacun répond de son côté, en toute discrétion.",
    "Aucune réponse n'est révélée sans réciprocité. Jamais.",
    "Envie commune ? On vous le dit en même temps.",
  ];
  const pages = [
    {
      eyebrow: "",
      title: "Vos envies restent secrètes. Jusqu'au match.",
      text: "",
      emoji: stickers.cherries,
      tone: "pink",
      kind: "intro",
    },
    {
      eyebrow: "",
      title: "Teste le concept.",
      text: "Choisis une réponse. C'est privé, même ici.",
      emoji: stickers.flame,
      tone: "hot",
      kind: "demo",
    },
    {
      eyebrow: "",
      title: "Rien ne fuite sans match.",
      text: "Un refus ne s’affiche jamais. Une carte se révèle seulement quand l’envie ou la curiosité est partagée des deux côtés.",
      emoji: stickers.lock,
      tone: "soft",
      kind: "rule",
    },
    {
      eyebrow: "",
      title: "On prépare votre espace.",
      text: "Crée ton profil, invite ton/ta partenaire, puis laissez les matchs apparaître.",
      emoji: stickers.heart,
      tone: "pink",
      kind: "finish",
    },
  ];
  const shouldShowProgress = false;
  const progressValue = page / (pages.length - 1);
  const progressWidth = progressBarProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });
  const currentPage = pages[page];
  const isLastPage = page === pages.length - 1;
  const isDemoPage = currentPage.kind === "demo";
  const isIntroPage = currentPage.kind === "intro";
  const isSimpleWelcomePage = !isIntroPage && !isDemoPage;
  const canGoNext = !isDemoPage || (demoVote !== null && !demoTransitioning);
  const introScale = welcomeScale;
  const introLayout = {
    brandPill: {
      minHeight: 34 * introScale,
      paddingHorizontal: 18 * introScale,
    },
    brandText: {
      fontSize: 15 * introScale,
      lineHeight: 18 * introScale,
    },
    cta: {
      borderRadius: 22 * introScale,
      minHeight: 57 * introScale,
    },
    ctaText: {
      fontSize: 15 * introScale,
      lineHeight: 18 * introScale,
    },
    dot: {
      height: 7 * introScale,
      width: 7 * introScale,
    },
    dotActive: {
      width: 22 * introScale,
    },
    dotRow: {
      gap: 7 * introScale,
      marginBottom: 22 * introScale,
    },
    footer: {
      fontSize: 11 * introScale,
      lineHeight: 14 * introScale,
      marginTop: 10 * introScale,
    },
    halo: {
      height: 256 * introScale,
      right: -84 * introScale,
      top: 45 * introScale,
      width: 256 * introScale,
    },
    ruleList: {
      gap: 12 * introScale,
      marginTop: 32 * introScale,
    },
    ruleNumber: {
      height: 31 * introScale,
      width: 31 * introScale,
    },
    ruleNumberText: {
      fontSize: 14 * introScale,
      lineHeight: 17 * introScale,
    },
    ruleRow: {
      borderRadius: 17 * introScale,
      gap: 14 * introScale,
      minHeight: 64 * introScale,
      paddingHorizontal: 16 * introScale,
      paddingVertical: 10 * introScale,
    },
    ruleText: {
      fontSize: 14 * introScale,
      lineHeight: 17 * introScale,
    },
    screen: {
      paddingBottom: 13 * introScale,
      paddingHorizontal: 21 * introScale,
      paddingTop: 16 * introScale,
    },
    skipText: {
      fontSize: 13 * introScale,
      lineHeight: 16 * introScale,
    },
    slide: {
      marginTop: 53 * introScale,
    },
    title: {
      fontSize: 39 * introScale,
      lineHeight: 45 * introScale,
      maxWidth: 340 * introScale,
    },
    titleBlock: {
      maxWidth: 340 * introScale,
    },
    topBar: {
      minHeight: 34 * introScale,
    },
  };
  const simpleLayout = {
    brandPill: introLayout.brandPill,
    brandText: introLayout.brandText,
    cta: introLayout.cta,
    ctaText: introLayout.ctaText,
    dot: introLayout.dot,
    dotActive: introLayout.dotActive,
    dotRow: introLayout.dotRow,
    screen: introLayout.screen,
    secondaryCta: introLayout.cta,
    slide: introLayout.slide,
    text: {
      fontSize: 15 * introScale,
      lineHeight: 21 * introScale,
      marginTop: 12 * introScale,
      maxWidth: 340 * introScale,
    },
    title: introLayout.title,
    topBar: introLayout.topBar,
  };
  const demoLayout = {
    brandPill: {
      minHeight: 34 * introScale,
      paddingHorizontal: 18 * introScale,
    },
    brandText: {
      fontSize: 15 * introScale,
      lineHeight: 18 * introScale,
    },
    cta: {
      borderRadius: 22 * demoScale,
      minHeight: 57 * demoScale,
    },
    ctaText: {
      fontSize: 15 * demoScale,
      lineHeight: 18 * demoScale,
    },
    demoCenter: {
      minHeight: demoCardHeight + 12 * demoScale,
    },
    demoFrame: {
      marginTop: 0,
    },
    dot: {
      height: 7 * demoScale,
      width: 7 * demoScale,
    },
    dotActive: {
      width: 22 * demoScale,
    },
    dotRow: {
      gap: 7 * demoScale,
      marginBottom: 22 * demoScale,
      marginTop: 12 * demoScale,
    },
    eyebrow: {
      fontSize: 12 * demoScale,
      lineHeight: 15 * demoScale,
      marginBottom: 10 * demoScale,
    },
    feedback: {
      borderRadius: 16 * demoScale,
      marginTop: 12 * demoScale,
      minHeight: 52 * demoScale,
      paddingLeft: 46 * demoScale,
      paddingVertical: 9 * demoScale,
    },
    feedbackLock: {
      height: 34 * demoScale,
      left: 12 * demoScale,
      width: 28 * demoScale,
    },
    feedbackText: {
      fontSize: 11 * demoScale,
      lineHeight: 16 * demoScale,
      paddingRight: 18 * demoScale,
    },
    halo: {
      height: 256 * demoScale,
      right: -84 * demoScale,
      top: 45 * demoScale,
      width: 256 * demoScale,
    },
    nav: {
      gap: 12 * demoScale,
    },
    practiceCopy: {
      minHeight: (compactWelcome ? 106 : 126) * demoScale,
      paddingTop: 18 * demoScale,
    },
    practiceDeck: {
      height: demoPracticeDeckHeight,
      maxWidth: demoCardWidth,
      minHeight: demoPracticeDeckHeight,
      width: demoCardWidth,
    },
    practiceGameCard: {
      borderRadius: 32 * demoScale,
      minHeight: demoPracticeCardHeight,
      paddingHorizontal: 24 * demoScale,
      paddingVertical: 24 * demoScale,
    },
    practiceText: {
      fontSize: 12 * demoScale,
      lineHeight: 16 * demoScale,
      maxWidth: 300 * demoScale,
    },
    practiceTitle: {
      fontSize: 25 * demoScale,
      lineHeight: 28 * demoScale,
    },
    screen: {
      paddingBottom: 13 * introScale,
      paddingHorizontal: 21 * introScale,
      paddingTop: 16 * introScale,
    },
    secondaryCta: {
      borderRadius: 22 * demoScale,
      minHeight: 57 * demoScale,
    },
    slide: {
      marginTop: 53 * introScale,
    },
    subtitle: {
      fontSize: 15 * demoScale,
      lineHeight: 21 * demoScale,
      marginTop: 8 * demoScale,
      maxWidth: 340 * demoScale,
    },
    title: {
      fontSize: 34 * demoScale,
      lineHeight: 38 * demoScale,
      maxWidth: 340 * demoScale,
    },
    topBar: {
      minHeight: 34 * introScale,
    },
    votePill: {
      borderRadius: 20 * demoScale,
      height: 46 * demoScale,
    },
    voteRow: {
      gap: 8 * demoScale,
      marginTop: 12 * demoScale,
    },
    voteText: {
      fontSize: 13 * demoScale,
      lineHeight: 18 * demoScale,
    },
    votedHint: {
      fontSize: 11 * demoScale,
      lineHeight: 15 * demoScale,
    },
    votedMessage: {
      fontSize: 24 * demoScale,
      lineHeight: 29 * demoScale,
    },
    votedPlaceholder: {
      borderRadius: 26 * demoScale,
      borderWidth: 4 * demoScale,
      padding: 24 * demoScale,
    },
  };

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
    }, GAME_CARD_CONFIRM_MS);
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
        contentContainerStyle={[
          styles.welcomeScreen,
          compactWelcome && styles.welcomeScreenCompact,
          isIntroPage && introLayout.screen,
          isSimpleWelcomePage && simpleLayout.screen,
          isDemoPage && demoLayout.screen,
        ]}
        showsVerticalScrollIndicator={false}
        style={[styles.flex, styles.welcomeScroll]}
      >
        <View pointerEvents="none" style={[styles.welcomeBackdropCircleLarge, isIntroPage && introLayout.halo, isDemoPage && demoLayout.halo]} />
        {!isIntroPage && !isDemoPage ? <View pointerEvents="none" style={styles.welcomeBackdropCircleSmall} /> : null}
        <View style={[styles.welcomeTopBar, compactWelcome && styles.welcomeTopBarCompact, isIntroPage && introLayout.topBar, isSimpleWelcomePage && simpleLayout.topBar, isDemoPage && demoLayout.topBar]}>
          <View style={[styles.mockBrandPill, isIntroPage && introLayout.brandPill, isSimpleWelcomePage && simpleLayout.brandPill, isDemoPage && demoLayout.brandPill]}>
            <Text style={[styles.mockBrandText, isIntroPage && introLayout.brandText, isSimpleWelcomePage && simpleLayout.brandText, isDemoPage && demoLayout.brandText]}>WeSpice</Text>
          </View>
          {page === 0 ? (
            <SpringPressable onPress={start} style={styles.welcomeSkipButton}>
              <Text style={[styles.welcomeSkipText, isIntroPage && introLayout.skipText]}>Passer</Text>
            </SpringPressable>
          ) : (
            <View style={styles.welcomeSkipSpacer} />
          )}
        </View>
        <Entrance
          delay={60}
          key={currentPage.eyebrow || currentPage.kind}
          style={[
            styles.welcomeSlide,
            isIntroPage && styles.welcomeSlideIntro,
            compactWelcome && styles.welcomeSlideCompact,
            isIntroPage && introLayout.slide,
            isSimpleWelcomePage && simpleLayout.slide,
            isDemoPage && demoLayout.slide,
          ]}
        >
          <View style={styles.welcomeSlideCard}>
            {currentPage.eyebrow ? (
              <Text style={[styles.welcomeEyebrow, compactWelcome && styles.welcomeEyebrowCompact, isDemoPage && demoLayout.eyebrow]}>{currentPage.eyebrow}</Text>
            ) : null}
            {isIntroPage ? (
              <View style={[styles.welcomeTitleBlock, compactWelcome && styles.welcomeTitleBlockCompact, introLayout.titleBlock]}>
                <Text style={[styles.welcomeTitle, styles.welcomeTitleIntro, compactWelcome && styles.welcomeTitleCompact, introLayout.title]}>
                  {"Vos envies\nrestent\nsecrètes.\nJusqu'au match"}
                  <Text style={styles.welcomeTitleDot}>.</Text>
                </Text>
              </View>
            ) : (
              <Text
                style={[
                  styles.welcomeTitle,
                  isSimpleWelcomePage && styles.welcomeTitleIntro,
                  compactWelcome && styles.welcomeTitleCompact,
                  isSimpleWelcomePage && simpleLayout.title,
                  isDemoPage && demoLayout.title,
                ]}
              >
                {isDemoPage
                  ? "Teste le concept"
                  : currentPage.kind === "rule"
                    ? "Rien ne fuite sans match"
                    : currentPage.kind === "finish"
                      ? "On prépare votre espace"
                      : currentPage.title}
                {isDemoPage || currentPage.kind === "rule" || currentPage.kind === "finish" ? <Text style={styles.welcomeTitleDot}>.</Text> : null}
              </Text>
            )}
            {currentPage.text ? (
              <Text style={[styles.welcomeText, compactWelcome && styles.welcomeTextCompact, isSimpleWelcomePage && simpleLayout.text, isDemoPage && demoLayout.subtitle]}>{currentPage.text}</Text>
            ) : null}

            {currentPage.kind === "intro" ? (
              <View style={[styles.welcomeRuleList, compactWelcome && styles.welcomeRuleListCompact, introLayout.ruleList]}>
                {welcomeRules.map((rule, index) => (
                  <View key={rule} style={[styles.welcomeRuleRow, introLayout.ruleRow]}>
                    <View style={[styles.welcomeRuleNumber, introLayout.ruleNumber, index === 1 && styles.welcomeRuleNumberYellow, index === 2 && styles.welcomeRuleNumberDark]}>
                      <Text
                        style={[
                          styles.welcomeRuleNumberText,
                          introLayout.ruleNumberText,
                          index === 1 && styles.welcomeRuleNumberTextDark,
                          index === 2 && styles.welcomeRuleNumberTextLight,
                        ]}
                      >
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={[styles.welcomeRuleText, compactWelcome && styles.welcomeRuleTextCompact, introLayout.ruleText]}>{rule}</Text>
                  </View>
                ))}
              </View>
            ) : null}

            {isDemoPage ? (
              <View style={[styles.welcomeDemoCenter, demoLayout.demoCenter]}>
                <View
                  style={[
                    styles.welcomeDemoFrame,
                    compactWelcome && styles.welcomeDemoFrameCompact,
                    isDemoPage && demoLayout.demoFrame,
                    { height: demoCardHeight, maxHeight: demoCardHeight, minHeight: demoCardHeight, width: demoCardWidth },
                  ]}
                >
                  <GameCardTransition exiting={demoCardExiting} key={demoCardNonce}>
                    <View style={[styles.welcomeDemoCard, demoVote === 2 && styles.welcomeDemoCardHot, { height: demoCardHeight, width: demoCardWidth }]}>
                      {showDemoAnsweredPlaceholder ? (
                        <View
                          style={[
                            styles.welcomeDemoVotedPlaceholder,
                            demoLayout.votedPlaceholder,
                            { height: demoPracticeCardHeight, maxHeight: demoPracticeCardHeight, minHeight: demoPracticeCardHeight, width: demoCardWidth },
                          ]}
                        >
                          <Text style={[styles.welcomeDemoVotedMessage, demoLayout.votedMessage]}>Carte répondue</Text>
                        </View>
                      ) : (
                        <>
                          <DesireGameCardFace
                            cardStyle={demoLayout.practiceGameCard}
                            category="Vanille"
                            copyStyle={demoLayout.practiceCopy}
                            deckStyle={demoLayout.practiceDeck}
                            description="Réponse privée."
                            prompt="Un bain à deux, lumière tamisée, téléphones interdits."
                          />
                          <View style={[styles.welcomeVoteRow, demoLayout.voteRow]}>
                            <SpringPressable
                              disabled={demoTransitioning}
                              onPress={() => chooseDemoVote(0)}
                              style={[styles.welcomeVotePill, demoLayout.votePill, demoVote === 0 && styles.welcomeVotePillSelected]}
                            >
                              <Text style={[styles.welcomeVoteText, demoLayout.voteText, demoVote === 0 && styles.welcomeVoteTextSelected]}>Non</Text>
                            </SpringPressable>
                            <SpringPressable
                              disabled={demoTransitioning}
                              onPress={() => chooseDemoVote(1)}
                              style={[styles.welcomeVotePill, demoLayout.votePill, styles.welcomeVoteFire, demoVote === 1 && styles.welcomeVoteFireSelected]}
                            >
                              <Text style={[styles.welcomeVoteFireText, demoLayout.voteText, demoVote === 1 && styles.welcomeVoteTextSelected]}>Pourquoi pas</Text>
                            </SpringPressable>
                            <SpringPressable
                              disabled={demoTransitioning}
                              onPress={() => chooseDemoVote(2)}
                              style={[styles.welcomeVotePill, demoLayout.votePill, styles.welcomeVotePillYellow, demoVote === 2 && styles.welcomeVotePillSelectedYellow]}
                            >
                              <Text style={[styles.welcomeVoteText, demoLayout.voteText, styles.welcomeVoteTextDark, demoVote === 2 && styles.welcomeVoteTextSelectedDark]}>Chaud</Text>
                            </SpringPressable>
                          </View>
                        </>
                      )}
                      {demoVote !== null ? (
                        <View style={[styles.welcomeDemoFeedback, demoLayout.feedback, demoVote === 2 && styles.welcomeDemoFeedbackHot]}>
                          <View style={[styles.welcomeDemoFeedbackLock, demoLayout.feedbackLock]}>
                            <LockKeyhole size={18 * demoScale} color={demoVote === 2 ? candy.white : candy.red} />
                          </View>
                          <Text style={[styles.welcomeDemoFeedbackText, compactWelcome && styles.welcomeDemoFeedbackTextCompact, demoLayout.feedbackText, demoVote === 2 && styles.welcomeDemoFeedbackTextHot]}>
                            {demoFeedback}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </GameCardTransition>
                </View>
              </View>
            ) : null}

            <View
              style={[
                styles.welcomeDotRow,
                isIntroPage && styles.welcomeDotRowIntro,
                isSimpleWelcomePage && styles.welcomeDotRowSimple,
                isIntroPage && introLayout.dotRow,
                isSimpleWelcomePage && simpleLayout.dotRow,
                isDemoPage && demoLayout.dotRow,
              ]}
            >
              {pages.map((item, index) => (
                <View
                  key={item.kind}
                  style={[
                    styles.welcomeDot,
                    isIntroPage && introLayout.dot,
                    isSimpleWelcomePage && simpleLayout.dot,
                    isDemoPage && demoLayout.dot,
                    index === page && styles.welcomeDotActive,
                    isIntroPage && index === page && introLayout.dotActive,
                    isSimpleWelcomePage && index === page && simpleLayout.dotActive,
                    isDemoPage && index === page && demoLayout.dotActive,
                  ]}
                />
              ))}
            </View>
            <View style={[styles.welcomeNav, isDemoPage && styles.welcomeNavDemo, compactWelcome && styles.welcomeNavCompact, isDemoPage && demoLayout.nav]}>
              {page > 0 ? (
                <WsButton
                  label="Retour"
                  onPress={goBack}
                  size="lg"
                  style={[styles.welcomeSecondaryCTA, compactWelcome && styles.welcomeSecondaryCTACompact, isSimpleWelcomePage && simpleLayout.secondaryCta, isDemoPage && demoLayout.secondaryCta]}
                  textStyle={isSimpleWelcomePage ? simpleLayout.ctaText : isDemoPage ? demoLayout.ctaText : undefined}
                  variant="outline"
                />
              ) : null}
              <WsButton
                disabled={!canGoNext}
                label={page === 0 ? "Commencer" : isLastPage ? "Créer mon profil" : isDemoPage && demoTransitioning ? "Un instant..." : isDemoPage && demoVote === null ? "Choisir" : "Suivant"}
                onPress={isLastPage ? start : goNext}
                right={page === 0 ? null : <ChevronRight size={isDemoPage ? 20 * demoScale : 20} color={candy.ink} />}
                style={[styles.welcomeCTA, compactWelcome && styles.welcomeCTACompact, isIntroPage && introLayout.cta, isSimpleWelcomePage && simpleLayout.cta, isDemoPage && demoLayout.cta, !canGoNext && styles.welcomeNavDisabled]}
                textStyle={isIntroPage ? introLayout.ctaText : isSimpleWelcomePage ? simpleLayout.ctaText : isDemoPage ? demoLayout.ctaText : undefined}
                variant="secondary"
              />
            </View>
            {isIntroPage ? <Text style={[styles.welcomeFooterText, introLayout.footer]}>Réservé aux adultes · Un espace privé à deux</Text> : null}
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
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const [copied, setCopied] = useState(false);
  const inviteScale = Math.min(1.45, Math.max(0.9, Math.min(viewportWidth / 390, viewportHeight / 844)));
  const headerButtonScale = Math.min(1.22, Math.max(0.82, Math.min(viewportWidth / 390, viewportHeight / 844)));
  const horizontalPadding = 21 * inviteScale;
  const contentWidth = Math.max(0, viewportWidth - horizontalPadding * 2);
  const headerButtonSize = 34 * headerButtonScale;
  const inviteLayout = {
    brandPill: {
      minHeight: 34 * inviteScale,
      paddingHorizontal: 18 * inviteScale,
    },
    brandText: {
      fontSize: 15 * inviteScale,
      lineHeight: 18 * inviteScale,
    },
    bottomActions: {
      width: contentWidth,
    },
    cta: {
      borderRadius: 22 * inviteScale,
      minHeight: 57 * inviteScale,
    },
    ctaText: {
      fontSize: 15 * inviteScale,
      lineHeight: 18 * inviteScale,
    },
    headerButton: {
      height: headerButtonSize,
      width: headerButtonSize,
    },
    halo: {
      height: 256 * inviteScale,
      right: -84 * inviteScale,
      top: 45 * inviteScale,
      width: 256 * inviteScale,
    },
    inlineLinkText: {
      fontSize: 12 * inviteScale,
      lineHeight: 16 * inviteScale,
    },
    screen: {
      paddingBottom: 13 * inviteScale,
      paddingHorizontal: horizontalPadding,
      paddingTop: 16 * inviteScale,
    },
    stepPill: {
      minHeight: 30 * headerButtonScale,
      minWidth: 58 * headerButtonScale,
      paddingHorizontal: 12 * headerButtonScale,
    },
    stepText: {
      fontSize: 14 * headerButtonScale,
      lineHeight: 17 * headerButtonScale,
    },
    smallHalo: {
      bottom: 140 * inviteScale,
      height: 180 * inviteScale,
      left: -138 * inviteScale,
      width: 180 * inviteScale,
    },
    text: {
      fontSize: 15 * inviteScale,
      lineHeight: 21 * inviteScale,
      marginTop: 12 * inviteScale,
      maxWidth: Math.min(340 * inviteScale, contentWidth),
    },
    ticket: {
      borderRadius: 28 * inviteScale,
      marginTop: 36 * inviteScale,
      paddingHorizontal: 18 * inviteScale,
      paddingVertical: 27 * inviteScale,
      width: contentWidth,
    },
    ticketActionButton: {
      minHeight: 44 * inviteScale,
      minWidth: 98 * inviteScale,
      paddingHorizontal: 14 * inviteScale,
    },
    ticketActionText: {
      fontSize: 14 * inviteScale,
      lineHeight: 17 * inviteScale,
    },
    ticketActions: {
      gap: 10 * inviteScale,
      marginTop: 18 * inviteScale,
    },
    ticketCode: {
      fontSize: 42 * inviteScale,
      letterSpacing: 6 * headerButtonScale,
      lineHeight: 54 * inviteScale,
      marginTop: 8 * inviteScale,
    },
    ticketLabel: {
      fontSize: 11 * inviteScale,
      lineHeight: 14 * inviteScale,
      marginBottom: 2 * inviteScale,
    },
    title: {
      fontSize: 39 * inviteScale,
      lineHeight: 45 * inviteScale,
      marginTop: 53 * inviteScale,
      maxWidth: Math.min(340 * inviteScale, contentWidth),
    },
    topBar: {
      minHeight: 34 * inviteScale,
    },
    waitingCard: {
      borderRadius: 22 * inviteScale,
      marginTop: 26 * inviteScale,
      minHeight: 68 * inviteScale,
      paddingHorizontal: 18 * inviteScale,
      width: contentWidth,
    },
    waitingAvatar: {
      height: 44 * inviteScale,
      width: 44 * inviteScale,
    },
    waitingAvatarText: {
      fontSize: 22 * inviteScale,
      lineHeight: 28 * inviteScale,
    },
    waitingGhost: {
      height: 38 * inviteScale,
      marginLeft: -16 * inviteScale,
      width: 38 * inviteScale,
    },
    waitingGhostText: {
      fontSize: 18 * inviteScale,
      lineHeight: 22 * inviteScale,
    },
    waitingText: {
      fontSize: 13 * inviteScale,
      lineHeight: 17 * inviteScale,
    },
  };
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
    <ScrollView contentContainerStyle={[styles.inviteScreen, inviteLayout.screen]} showsVerticalScrollIndicator={false}>
      <Entrance delay={0}>
        <View style={styles.inviteHero}>
          <View pointerEvents="none" style={[styles.welcomeBackdropCircleLarge, inviteLayout.halo]} />
          <View pointerEvents="none" style={[styles.welcomeBackdropCircleSmall, inviteLayout.smallHalo]} />
          <View style={[styles.inviteTopRow, inviteLayout.topBar]}>
            <View style={styles.inviteTopLeft}>
              <View style={[styles.mockBrandPill, styles.inviteBrandPill, inviteLayout.brandPill]}>
                <Text style={[styles.mockBrandText, inviteLayout.brandText]}>WeSpice</Text>
              </View>
              <SpringPressable onPress={onContinue} style={[styles.onboardingBackButton, inviteLayout.headerButton]}>
                <ArrowLeft size={18 * headerButtonScale} color={candy.white} />
              </SpringPressable>
            </View>
            <View style={[styles.onboardingStepPill, inviteLayout.stepPill]}>
              <Text style={[styles.onboardingStepPillText, inviteLayout.stepText]}>2 / 2</Text>
            </View>
          </View>
          <Text style={[styles.welcomeTitle, styles.welcomeTitleIntro, inviteLayout.title]}>Votre espace est prêt.</Text>
          <Text style={[styles.inviteText, inviteLayout.text]}>Envoie ce code à ta/ton partenaire. Rien ne commence sans vous deux.</Text>
          <View style={[styles.inviteTicket, inviteLayout.ticket]}>
            <Text style={[styles.inviteTicketLabel, inviteLayout.ticketLabel]}>Code d'invitation</Text>
            <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.inviteTicketCode, inviteLayout.ticketCode]}>
              {couple.inviteCode}
            </Text>
            <View style={[styles.inviteTicketActions, inviteLayout.ticketActions]}>
              <SpringPressable onPress={copyInvite} style={[styles.inviteTicketActionButton, inviteLayout.ticketActionButton]}>
                <Copy size={17 * headerButtonScale} color={candy.ink} />
                <Text style={[styles.inviteTicketActionText, inviteLayout.ticketActionText]}>{copied ? "Copié" : "Copier"}</Text>
              </SpringPressable>
              <SpringPressable onPress={shareInvite} style={[styles.inviteTicketActionButton, styles.inviteTicketActionButtonHot, inviteLayout.ticketActionButton]}>
                <MessageCircle size={17 * headerButtonScale} color={candy.white} />
                <Text style={[styles.inviteTicketActionTextHot, inviteLayout.ticketActionText]}>Partager</Text>
              </SpringPressable>
            </View>
          </View>
          <View style={[styles.inviteWaitingCard, inviteLayout.waitingCard]}>
            <View style={[styles.inviteWaitingAvatar, inviteLayout.waitingAvatar]}>
              <Text style={[styles.inviteWaitingAvatarText, inviteLayout.waitingAvatarText]}>{profileEmoji(couple.profiles[couple.activePartnerId])}</Text>
            </View>
            <View style={[styles.inviteWaitingGhost, inviteLayout.waitingGhost]}>
              <Text style={[styles.inviteWaitingGhostText, inviteLayout.waitingGhostText]}>?</Text>
            </View>
            <Text style={[styles.inviteWaitingText, inviteLayout.waitingText]}>En attente de ta/ton partenaire...</Text>
          </View>
        </View>
      </Entrance>

      <Entrance delay={140}>
        <View style={[styles.inviteBottomActions, inviteLayout.bottomActions]}>
          <WsButton
            label={copied ? "Invitation copiée" : "Envoyer l'invitation"}
            onPress={shareInvite}
            style={[styles.invitePrimaryButton, inviteLayout.cta]}
            textStyle={inviteLayout.ctaText}
            variant="primary"
          />
          <WsButton
            label="J'ai reçu un code"
            onPress={onJoin}
            style={[styles.invitePrimaryButton, inviteLayout.cta]}
            textStyle={inviteLayout.ctaText}
            variant="secondary"
          />
          <WsButton
            label="Commencer seul"
            onPress={onContinue}
            style={[styles.invitePrimaryButton, styles.inviteTertiaryButton, inviteLayout.cta]}
            textStyle={[styles.inviteTertiaryButtonText, inviteLayout.ctaText]}
            variant="secondary"
          />
        </View>
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
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const codeInputRef = useRef<TextInput>(null);
  const activeProfile = couple.profiles[couple.activePartnerId];
  const normalizedCode = inviteCode.trim().toUpperCase();
  const codeSlots = Array.from({ length: 6 }, (_, index) => normalizedCode[index] ?? "");
  const joinScale = Math.min(1.45, Math.max(0.9, Math.min(viewportWidth / 390, viewportHeight / 844)));
  const headerButtonScale = Math.min(1.22, Math.max(0.82, Math.min(viewportWidth / 390, viewportHeight / 844)));
  const horizontalPadding = 21 * joinScale;
  const contentWidth = Math.max(0, viewportWidth - horizontalPadding * 2);
  const codeGap = 8 * joinScale;
  const codeCellSize = Math.min(46 * joinScale, (contentWidth - codeGap * 5) / 6);
  const headerButtonSize = 34 * headerButtonScale;
  const joinLayout = {
    bottomArea: {
      width: contentWidth,
    },
    brandPill: {
      minHeight: 34 * joinScale,
      paddingHorizontal: 18 * joinScale,
    },
    brandText: {
      fontSize: 15 * joinScale,
      lineHeight: 18 * joinScale,
    },
    codeCell: {
      borderRadius: 13 * joinScale,
      height: 60 * joinScale,
      width: codeCellSize,
    },
    codeCellText: {
      fontSize: 25 * joinScale,
      lineHeight: 30 * joinScale,
    },
    codePressable: {
      marginTop: 48 * joinScale,
    },
    codeSlots: {
      gap: codeGap,
      width: contentWidth,
    },
    cta: {
      borderRadius: 22 * joinScale,
      minHeight: 57 * joinScale,
    },
    ctaText: {
      fontSize: 15 * joinScale,
      lineHeight: 18 * joinScale,
    },
    headerButton: {
      height: headerButtonSize,
      width: headerButtonSize,
    },
    helpText: {
      fontSize: 13 * joinScale,
      lineHeight: 18 * joinScale,
      marginTop: 14 * joinScale,
      maxWidth: Math.min(286 * joinScale, contentWidth),
    },
    hero: {
      gap: 0,
      width: contentWidth,
    },
    halo: {
      height: 256 * joinScale,
      right: -84 * joinScale,
      top: 45 * joinScale,
      width: 256 * joinScale,
    },
    lockIcon: {
      borderRadius: 13 * joinScale,
      height: 34 * joinScale,
      width: 34 * joinScale,
    },
    lockPill: {
      borderRadius: 20 * joinScale,
      minHeight: 64 * joinScale,
      paddingHorizontal: 16 * joinScale,
      paddingVertical: 12 * joinScale,
      width: contentWidth,
    },
    lockText: {
      fontSize: 13 * joinScale,
      lineHeight: 17 * joinScale,
    },
    screen: {
      paddingBottom: 13 * joinScale,
      paddingHorizontal: horizontalPadding,
      paddingTop: 16 * joinScale,
    },
    smallHalo: {
      bottom: 140 * joinScale,
      height: 180 * joinScale,
      left: -138 * joinScale,
      width: 180 * joinScale,
    },
    stepPill: {
      minHeight: 30 * headerButtonScale,
      minWidth: 58 * headerButtonScale,
      paddingHorizontal: 12 * headerButtonScale,
    },
    stepText: {
      fontSize: 14 * headerButtonScale,
      lineHeight: 17 * headerButtonScale,
    },
    title: {
      fontSize: 39 * joinScale,
      lineHeight: 45 * joinScale,
      marginTop: 53 * joinScale,
      maxWidth: Math.min(340 * joinScale, contentWidth),
    },
    topBar: {
      minHeight: 34 * joinScale,
    },
  };

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
      <ScrollView contentContainerStyle={[styles.joinScreen, joinLayout.screen]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View pointerEvents="none" style={[styles.welcomeBackdropCircleLarge, joinLayout.halo]} />
        <View pointerEvents="none" style={[styles.welcomeBackdropCircleSmall, joinLayout.smallHalo]} />
        <Entrance delay={0} style={[styles.joinContent, joinLayout.hero]}>
          <View style={[styles.joinTopRow, joinLayout.topBar]}>
            <View style={styles.joinTopLeft}>
              <View style={[styles.mockBrandPill, styles.inviteBrandPill, joinLayout.brandPill]}>
                <Text style={[styles.mockBrandText, joinLayout.brandText]}>WeSpice</Text>
              </View>
              <SpringPressable disabled={busy} onPress={onCancel} style={[styles.onboardingBackButton, joinLayout.headerButton]}>
                <ArrowLeft size={18 * headerButtonScale} color={candy.white} />
              </SpringPressable>
            </View>
            <View style={[styles.onboardingStepPill, joinLayout.stepPill]}>
              <Text style={[styles.onboardingStepPillText, joinLayout.stepText]}>Code</Text>
            </View>
          </View>
          <Text style={[styles.welcomeTitle, styles.welcomeTitleIntro, joinLayout.title]}>
            Entre le code de ta/ton partenaire<Text style={styles.welcomeTitleDot}>.</Text>
          </Text>
          <Pressable onPress={() => codeInputRef.current?.focus()} style={[styles.joinCodePressable, joinLayout.codePressable]}>
            <View style={[styles.joinCodeSlots, joinLayout.codeSlots]}>
              {codeSlots.map((character, index) => {
                const isActive = normalizedCode.length === index || (index === codeSlots.length - 1 && normalizedCode.length >= codeSlots.length);
                return (
                  <View key={index} style={[styles.joinCodeCell, joinLayout.codeCell, isActive && styles.joinCodeCellActive]}>
                    <Text style={[styles.joinCodeCellText, joinLayout.codeCellText]}>{character}</Text>
                  </View>
                );
              })}
            </View>
            <TextInput
              ref={codeInputRef}
              autoCapitalize="characters"
              autoCorrect={false}
              caretHidden
              maxLength={6}
              onChangeText={(text) => {
                setInviteCode(text.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase());
                setError("");
              }}
              returnKeyType="done"
              style={styles.joinHiddenInput}
              value={inviteCode}
            />
          </Pressable>
          <Text style={[styles.joinHelpText, joinLayout.helpText]}>Le code se trouve dans l'écran « Nous » de ta/ton partenaire.</Text>
        </Entrance>

        <Entrance delay={120} style={[styles.joinBottomArea, joinLayout.bottomArea]}>
          <View style={[styles.joinLockPill, joinLayout.lockPill]}>
            <View style={[styles.joinLockIcon, joinLayout.lockIcon]}>
              <LockKeyhole size={17 * headerButtonScale} color={candy.red} />
            </View>
            <Text style={[styles.joinLockText, joinLayout.lockText]}>Vos deux profils seront liés. Personne d'autre ne peut rejoindre cet espace.</Text>
          </View>
          {error ? <Text style={styles.joinErrorText}>{error}</Text> : null}
          <WsButton
            busy={busy}
            disabled={busy}
            label="Rejoindre notre espace"
            onPress={submit}
            style={[styles.joinPrimaryButton, joinLayout.cta]}
            textStyle={joinLayout.ctaText}
            variant="primary"
          />
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
  const [confirmationInput, setConfirmationInput] = useState("");
  const safeAreaInsets = useSafeAreaInsets();
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const partner = couple.profiles[otherPartnerId(couple.activePartnerId)];
  const partnerName = partner.displayName.trim() || "ton/ta partenaire";
  const expectedConfirmation = `Aurevoir ${partnerName}`;
  const canConfirm =
    confirmationInput.trim().toLocaleLowerCase("fr-FR") === expectedConfirmation.toLocaleLowerCase("fr-FR");
  const leavingItems = [
    "Ton profil et ta vibe dans ce couple",
    "Toutes tes réponses aux cartes",
    "Vos messages et photos privées",
    `Le lien avec ${partnerName} — la personne sera prévenue`,
  ];

  const handleConfirm = () => {
    if (canConfirm) {
      onConfirm();
    }
  };
  const leaveFrameHeight = Math.max(0, viewportHeight - safeAreaInsets.top - safeAreaInsets.bottom);
  const leaveScale = Math.min(1.22, Math.max(0.9, Math.min(viewportWidth / 390, leaveFrameHeight / 812)));
  const leaveSideInset = viewportWidth >= 700 ? 32 : viewportWidth >= 520 ? 24 : 18;
  const leaveContentWidth = Math.min(620, Math.max(0, viewportWidth - leaveSideInset * 2));
  const leaveRhythm = Math.round(Math.min(32, Math.max(14, leaveFrameHeight * 0.026)));
  const leaveTopPadding = Math.max(12, safeAreaInsets.top + leaveRhythm * 0.45);
  const leaveBottomPadding = Math.max(14, safeAreaInsets.bottom + leaveRhythm * 0.42);
  const leaveLayout = useMemo(() => ({
    actions: {
      gap: 10 * leaveScale,
      marginTop: leaveRhythm * 1.08,
    },
    backButton: {
      height: 40 * leaveScale,
      width: 40 * leaveScale,
    },
    bodyText: {
      fontSize: 14 * leaveScale,
      lineHeight: 19 * leaveScale,
      marginTop: 12 * leaveScale,
      maxWidth: Math.min(500, leaveContentWidth),
    },
    checklist: {
      gap: 10 * leaveScale,
      marginTop: leaveRhythm * 0.72,
    },
    checklistRow: {
      borderRadius: 15 * leaveScale,
      minHeight: 40 * leaveScale,
      paddingHorizontal: 14 * leaveScale,
      paddingVertical: 10 * leaveScale,
    },
    checklistText: {
      fontSize: 13 * leaveScale,
      lineHeight: 16 * leaveScale,
    },
    confirmBlock: {
      marginTop: leaveRhythm * 0.86,
    },
    confirmInput: {
      borderRadius: 17 * leaveScale,
      fontSize: 14 * leaveScale,
      minHeight: 52 * leaveScale,
      paddingHorizontal: 18 * leaveScale,
      paddingVertical: 14 * leaveScale,
    },
    contentStage: {
      justifyContent: "center" as const,
      paddingBottom: leaveRhythm * 0.55,
      paddingTop: leaveRhythm * 0.55,
    },
    emoji: {
      fontSize: 58 * leaveScale,
      lineHeight: 66 * leaveScale,
      marginBottom: 18 * leaveScale,
    },
    inner: {
      justifyContent: "center" as const,
      maxWidth: leaveContentWidth,
      minHeight: Math.max(0, viewportHeight - leaveTopPadding - leaveBottomPadding),
    },
    primaryButton: {
      borderRadius: 20 * leaveScale,
      minHeight: 64 * leaveScale,
    },
    primaryText: {
      fontSize: 16 * leaveScale,
      lineHeight: 20 * leaveScale,
    },
    reassurance: {
      borderRadius: 15 * leaveScale,
      marginTop: leaveRhythm * 0.66,
      paddingHorizontal: 14 * leaveScale,
      paddingVertical: 10 * leaveScale,
    },
    reassuranceText: {
      fontSize: 13 * leaveScale,
      lineHeight: 17 * leaveScale,
    },
    scroll: {
      paddingBottom: leaveBottomPadding,
      paddingHorizontal: leaveSideInset,
      paddingTop: leaveTopPadding,
    },
    title: {
      fontSize: 34 * leaveScale,
      lineHeight: 36 * leaveScale,
      maxWidth: Math.min(520, leaveContentWidth),
    },
  }), [
    leaveBottomPadding,
    leaveContentWidth,
    leaveRhythm,
    leaveScale,
    leaveSideInset,
    leaveTopPadding,
    viewportHeight,
  ]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.leaveScreen}>
      <ScrollView
        bounces={false}
        contentContainerStyle={[styles.leaveScrollContent, leaveLayout.scroll]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.leaveInner, leaveLayout.inner]}>
          <View style={styles.leaveTopBar}>
            <Entrance delay={0}>
              <Pressable accessibilityLabel="Annuler et revenir" onPress={onCancel} style={[styles.leaveBackButton, leaveLayout.backButton]}>
                <ArrowLeft color={candy.cream} size={18} strokeWidth={3} />
              </Pressable>
            </Entrance>
          </View>

          <View style={[styles.leaveContentStage, leaveLayout.contentStage]}>
            <Entrance delay={80} style={styles.leaveCopyBlock}>
              <Text style={[styles.leaveEmoji, leaveLayout.emoji]}>😭</Text>
              <Text style={[styles.leaveTitle, leaveLayout.title]}>Tout quitter. Vraiment tout.</Text>
              <Text style={[styles.leaveText, leaveLayout.bodyText]}>
                La séparation avec {partnerName} est immédiate. Voici ce qui disparaît :
              </Text>
            </Entrance>

            <Entrance delay={150} style={[styles.leaveChecklist, leaveLayout.checklist]}>
              {leavingItems.map((item) => (
                <View key={item} style={[styles.leaveChecklistRow, leaveLayout.checklistRow]}>
                  <View style={styles.leaveChecklistDot} />
                  <Text style={[styles.leaveChecklistText, leaveLayout.checklistText]}>{item}</Text>
                </View>
              ))}
            </Entrance>

            <Entrance delay={210} style={[styles.leaveReassurance, leaveLayout.reassurance]}>
              <Text style={[styles.leaveReassuranceText, leaveLayout.reassuranceText]}>
                Tu pourras toujours te remettre en couple avec {partnerName} plus tard.
              </Text>
            </Entrance>

            <Entrance delay={250} style={[styles.leaveConfirmBlock, leaveLayout.confirmBlock]}>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                cursorColor={candy.red}
                onChangeText={setConfirmationInput}
                placeholder={`Écris « ${expectedConfirmation} » pour confirmer`}
                placeholderTextColor="rgba(255,244,232,0.45)"
                selectionColor={Platform.OS === "web" ? undefined : candy.red}
                style={[styles.leaveConfirmInput, leaveLayout.confirmInput, canConfirm && styles.leaveConfirmInputValid]}
                value={confirmationInput}
              />
            </Entrance>

            <Entrance delay={320} style={[styles.leaveActions, leaveLayout.actions]}>
              <Pressable
                accessibilityRole="button"
                disabled={!canConfirm}
                onPress={handleConfirm}
                style={[styles.leavePrimaryButton, leaveLayout.primaryButton, !canConfirm && styles.leavePrimaryButtonDisabled]}
              >
                <Text style={[styles.leavePrimaryText, leaveLayout.primaryText]}>Quitter le couple</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={onCancel} style={styles.leaveCancelButton}>
                <Text style={styles.leaveCancelText}>Annuler</Text>
              </Pressable>
            </Entrance>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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

const styles = StyleSheet.create({
  flex: {
    alignSelf: "stretch",
    flex: 1,
    width: "100%",
  },
  fontLoadingScreen: {
    backgroundColor: candy.red,
    flex: 1,
  },
  frame: {
    alignSelf: "stretch",
    flex: 1,
    overflow: "hidden",
    width: "100%",
  },
  frameDark: {
    backgroundColor: candy.darkColor,
  },
  safeArea: {
    alignSelf: "stretch",
    flex: 1,
    width: "100%",
  },
  safeAreaDark: {
    backgroundColor: candy.darkColor,
  },
  loadingScreen: {
    backgroundColor: candy.red,
    flex: 1,
    overflow: "hidden",
    paddingBottom: 74,
    paddingHorizontal: 7,
    paddingTop: 17,
  },
  loadingSkeletonStage: {
    flex: 1,
  },
  loadingSkeletonBlock: {
    backgroundColor: "rgba(255,144,187,0.58)",
  },
  loadingSkeletonTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  loadingSkeletonBrand: {
    borderRadius: 14,
    height: 31,
    width: 84,
  },
  loadingSkeletonProfile: {
    borderRadius: 16,
    height: 31,
    width: 57,
  },
  loadingSkeletonTitleWide: {
    borderRadius: 8,
    height: 35,
    width: "72%",
  },
  loadingSkeletonTitleWideEnvies: {
    width: "62%",
  },
  loadingSkeletonTitleWideStore: {
    width: "48%",
  },
  loadingSkeletonTitleShort: {
    borderRadius: 11,
    height: 34,
    marginTop: 10,
    width: "49%",
  },
  loadingSkeletonTitleShortEnvies: {
    width: "35%",
  },
  loadingSkeletonChips: {
    flexDirection: "row",
    gap: 8,
    marginTop: 20,
  },
  loadingSkeletonChip: {
    borderRadius: 999,
    height: 32,
    width: 68,
  },
  loadingSkeletonChipWide: {
    width: 96,
  },
  loadingSkeletonHeroCard: {
    borderRadius: 24,
    flex: 1,
    marginTop: 18,
    minHeight: 160,
    width: "100%",
  },
  loadingSkeletonAdvice: {
    borderRadius: 18,
    height: 60,
    marginTop: 10,
    width: "100%",
  },
  loadingSkeletonStoreRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  loadingSkeletonStoreCard: {
    borderRadius: 16,
    flex: 1,
    height: 64,
  },
  loadingSkeletonList: {
    gap: 10,
    marginTop: 18,
  },
  loadingSkeletonListRow: {
    borderRadius: 18,
    height: 70,
    width: "100%",
  },
  loadingSkeletonListRowSoft: {
    backgroundColor: "rgba(255,173,205,0.5)",
  },
  loadingSkeletonOffers: {
    gap: 10,
    marginTop: 18,
  },
  loadingSkeletonOfferRow: {
    borderRadius: 22,
    height: 72,
    width: "100%",
  },
  loadingSkeletonOfferRowHot: {
    backgroundColor: "rgba(255,207,58,0.76)",
  },
  loadingSkeletonPackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 16,
  },
  loadingSkeletonPackTile: {
    borderRadius: 18,
    height: 132,
    width: "31%",
  },
  loadingSkeletonPackTileDark: {
    backgroundColor: "rgba(38,18,46,0.66)",
  },
  loadingSkeletonPackTileHot: {
    backgroundColor: "rgba(255,207,58,0.76)",
  },
  loadingSyncPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(178,32,94,0.88)",
    borderColor: "rgba(255,249,240,0.1)",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 16,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 15,
    position: "absolute",
  },
  loadingSyncSpinner: {
    borderColor: candy.yellow,
    borderRadius: 999,
    borderRightColor: "transparent",
    borderWidth: 2,
    height: 15,
    width: 15,
  },
  loadingSyncText: {
    color: candy.white,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
  },
  debugPreviewShell: {
    flex: 1,
    position: "relative",
  },
  debugPreviewBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(38,18,46,0.82)",
    borderColor: "rgba(255,249,240,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    left: 16,
    minHeight: 40,
    paddingHorizontal: 13,
    position: "absolute",
    top: 16,
  },
  debugPreviewBackText: {
    color: candy.white,
    fontFamily: labelFont,
    fontSize: 13,
    fontWeight: "900",
  },
  remoteAccountScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  remoteAccountCard: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderColor: "rgba(255,249,240,0.82)",
    borderRadius: 30,
    borderWidth: 2,
    gap: 12,
    maxWidth: 460,
    padding: 18,
    width: "100%",
  },
  remoteAccountIcon: {
    alignItems: "center",
    backgroundColor: "rgba(245,40,110,0.1)",
    borderColor: "rgba(245,40,110,0.18)",
    borderRadius: 999,
    borderWidth: 1.5,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  remoteAccountTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 31,
    textAlign: "center",
  },
  remoteAccountText: {
    color: candy.text,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    textAlign: "center",
  },
  remoteAccountError: {
    backgroundColor: "rgba(245,40,110,0.08)",
    borderColor: "rgba(245,40,110,0.18)",
    borderRadius: 16,
    borderWidth: 1,
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 17,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlign: "center",
    width: "100%",
  },
  remoteAccountPrimary: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.white,
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
    width: "100%",
  },
  remoteAccountPrimaryText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
  },
  remoteAccountSecondary: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: "rgba(245,40,110,0.2)",
    borderRadius: 18,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 18,
    width: "100%",
  },
  remoteAccountSecondaryText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  serverNoticeHost: {
    left: 0,
    paddingHorizontal: 8,
    position: "absolute",
    right: 0,
    top: 8,
    zIndex: 110,
  },
  serverNoticeCard: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: candy.yellow,
    borderRadius: 14,
    flexDirection: "row",
    gap: 9,
    maxWidth: 360,
    minHeight: 48,
    paddingHorizontal: 15,
    paddingVertical: 10,
    shadowColor: "rgba(38,18,46,0.14)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 18,
  },
  serverNoticeIcon: {
    alignItems: "center",
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  serverNoticeText: {
    color: candy.black,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
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
    backgroundColor: candy.cream,
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
    backgroundColor: "rgba(245,40,110,0.16)",
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
    backgroundColor: "rgba(245,40,110,0.16)",
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
  doodleOne: {
    backgroundColor: "rgba(255,249,240,0.08)",
    borderRadius: 999,
    height: 280,
    position: "absolute",
    right: -118,
    top: 156,
    width: 280,
  },
  doodleTwo: {
    backgroundColor: "rgba(255,249,240,0.06)",
    borderRadius: 999,
    bottom: 118,
    height: 220,
    left: -120,
    position: "absolute",
    width: 220,
  },
  app: {
    alignSelf: "stretch",
    flex: 1,
    width: "100%",
  },
  appDark: {
    backgroundColor: candy.darkColor,
  },
  content: {
    alignSelf: "stretch",
    flex: 1,
    width: "100%",
  },
  tabDock: {
    bottom: 0,
    left: 0,
    paddingBottom: 14,
    paddingHorizontal: 18,
    paddingTop: 32,
    position: "absolute",
    right: 0,
  },
  tabDockDark: {
    backgroundColor: candy.darkColor,
  },
  tabDockFade: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  profileShortcutDock: {
    alignItems: "flex-end",
    position: "absolute",
    right: 14,
    top: PROFILE_SHORTCUT_TOP,
    zIndex: 35,
  },
  profileShortcut: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderColor: "rgba(255,249,240,0.94)",
    borderRadius: 999,
    borderWidth: 2,
    height: PROFILE_SHORTCUT_SIZE,
    justifyContent: "center",
    shadowColor: "rgba(38,18,46,0.24)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    width: PROFILE_SHORTCUT_SIZE,
  },
  profileShortcutActive: {
    backgroundColor: candy.red,
    borderColor: candy.white,
  },
  profileShortcutEmoji: {
    fontFamily: emojiFont,
    fontSize: 28,
    lineHeight: 34,
    textAlign: "center",
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
    backgroundColor: candy.cream,
    borderColor: "rgba(255,249,240,0.92)",
    borderRadius: 32,
    borderWidth: 1,
    flexDirection: "row",
    gap: 3,
    padding: 9,
    boxShadow: "0 12px 24px rgba(38,18,46,0.22)",
  },
  tab: {
    alignItems: "center",
    borderRadius: 24,
    flex: 1,
    gap: 3,
    minHeight: 58,
    minWidth: 0,
    justifyContent: "center",
  },
  tabActive: {
    backgroundColor: "transparent",
  },
  tabIconWrap: {
    alignItems: "center",
    height: 24,
    justifyContent: "center",
    width: 28,
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
    color: "rgba(155,130,117,0.92)",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
    textAlign: "center",
  },
  tabTextActive: {
    color: candy.red,
  },
  screen: {
    gap: 13,
    paddingBottom: 138,
    paddingHorizontal: 14,
    paddingTop: 10,
  },
  enviesScreenFrame: {
    flex: 1,
  },
  enviesScreenContent: {
    paddingBottom: 184,
    paddingTop: 0,
  },
  enviesGameContent: {
    flexGrow: 1,
    minHeight: "100%",
    paddingBottom: 184,
    paddingTop: 0,
  },
  enviesStickyHeader: {
    marginHorizontal: -14,
    overflow: "visible",
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 0,
    position: "relative",
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
  packSelectorCard: {
    alignItems: "center",
    borderColor: candy.white,
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 82,
    overflow: "hidden",
    padding: 10,
  },
  packSelectorIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderRadius: 20,
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  packSelectorEmoji: {
    fontFamily: emojiFont,
    fontSize: 31,
    lineHeight: 38,
  },
  packSelectorCopy: {
    flex: 1,
    minWidth: 0,
  },
  packSelectorKicker: {
    color: candy.ink,
    fontSize: 9,
    fontWeight: "900",
    opacity: 0.74,
    textTransform: "uppercase",
  },
  packSelectorTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 27,
  },
  packSelectorText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    marginTop: 2,
  },
  packSelectorAction: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: "rgba(255,36,95,0.18)",
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 3,
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 10,
  },
  packSelectorActionText: {
    color: candy.red,
    fontSize: 12,
    fontWeight: "900",
  },
  categoryRailWrap: {
    backgroundColor: "rgba(255,255,255,0.5)",
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: 25,
    borderWidth: 1.5,
    overflow: "hidden",
    padding: 5,
    width: "100%",
  },
  categoryRailWrapEmbedded: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderWidth: 0,
    padding: 0,
  },
  categoryRail: {
    alignItems: "center",
    gap: 6,
    paddingRight: 2,
  },
  categoryRailEmbedded: {
    gap: 8,
    paddingRight: 4,
  },
  categoryRailChip: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.82)",
    borderRadius: 20,
    borderWidth: 1.5,
    flexDirection: "row",
    height: 50,
    justifyContent: "center",
    minWidth: 50,
    overflow: "hidden",
    paddingHorizontal: 5,
    position: "relative",
  },
  categoryRailChipActive: {
    borderColor: candy.white,
    gap: 8,
    justifyContent: "flex-start",
    minWidth: 156,
    paddingHorizontal: 8,
  },
  categoryRailChipLocked: {
    opacity: 0.86,
  },
  categoryRailIcon: {
    alignItems: "center",
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  categoryRailIconActive: {
    backgroundColor: "rgba(255,255,255,0.78)",
  },
  categoryRailEmoji: {
    fontFamily: emojiFont,
    fontSize: 22,
    lineHeight: 28,
  },
  categoryRailCopy: {
    flex: 1,
    minWidth: 0,
  },
  categoryRailKicker: {
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 10,
    opacity: 0.74,
    textTransform: "uppercase",
  },
  categoryRailTitle: {
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 15,
  },
  categoryRailMeta: {
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
    opacity: 0.76,
  },
  categoryRailLock: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderRadius: 999,
    height: 17,
    justifyContent: "center",
    position: "absolute",
    right: 1,
    top: 1,
    width: 17,
  },
  categoryRailLockActive: {
    right: 4,
    top: 4,
  },
  categoryPickerOverlay: {
    backgroundColor: candy.red,
    flex: 1,
  },
  categoryPickerBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  categoryPickerSheetWrap: {
    flex: 1,
    width: "100%",
  },
  categoryPickerSheet: {
    backgroundColor: candy.red,
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  categoryPickerHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    paddingBottom: 20,
  },
  categoryPickerHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  categoryPickerTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 39,
  },
  categoryPickerText: {
    color: "rgba(255,249,240,0.82)",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
    marginTop: 4,
  },
  categoryPickerClose: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.22)",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  categoryPickerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    paddingBottom: 72,
  },
  categoryPickerCard: {
    aspectRatio: 1,
    backgroundColor: candy.cream,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 28,
    borderWidth: 0,
    boxShadow: "0 12px 22px rgba(38,18,46,0.12)",
    justifyContent: "flex-end",
    overflow: "hidden",
    padding: 18,
    position: "relative",
    width: "47.2%",
  },
  categoryPickerCardCream: {
    backgroundColor: candy.cream,
  },
  categoryPickerCardPersonal: {
    borderColor: "rgba(38,18,46,0.28)",
    borderStyle: "dashed",
    borderWidth: 2.4,
  },
  categoryPickerCardSelected: {
    borderColor: candy.white,
    borderWidth: 2,
  },
  categoryPickerCardLocked: {
    opacity: 0.96,
  },
  categoryPickerCardFill: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  categoryPickerPatternLayer: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  categoryPickerDot: {
    backgroundColor: candy.white,
    borderRadius: 999,
    height: 9,
    position: "absolute",
    width: 9,
  },
  categoryPickerStripe: {
    backgroundColor: candy.white,
    height: "160%",
    position: "absolute",
    top: "-30%",
    transform: [{ rotate: "42deg" }],
    width: 18,
  },
  categoryPickerCardCopy: {
    position: "relative",
    zIndex: 2,
  },
  categoryPickerCardTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 23,
  },
  categoryPickerCardTitleLight: {
    color: candy.cream,
  },
  categoryPickerCardTitleDark: {
    color: candy.ink,
  },
  categoryPickerCardText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  categoryPickerCardTextLight: {
    color: "rgba(255,249,240,0.86)",
  },
  categoryPickerCardTextDark: {
    color: candy.ink,
  },
  categoryPickerLock: {
    alignSelf: "flex-start",
    backgroundColor: candy.black,
    borderRadius: 999,
    marginTop: 10,
    minHeight: 32,
    paddingHorizontal: 14,
    justifyContent: "center",
  },
  categoryPickerBadgeActive: {
    backgroundColor: candy.white,
  },
  categoryPickerBadgeCreate: {
    backgroundColor: candy.red,
  },
  categoryPickerBadgeText: {
    color: candy.white,
    fontSize: 12,
    fontWeight: "900",
  },
  categoryPickerBadgeTextActive: {
    color: candy.red,
  },
  categoryPickerBadgeTextCreate: {
    color: candy.white,
  },
  categoryPickerBadgeTextHot: {
    color: candy.yellow,
  },
  categoryPickerLockIcon: {
    alignItems: "center",
    height: 28,
    justifyContent: "center",
    position: "absolute",
    right: 14,
    top: 14,
    width: 28,
  },
  desireFilterRow: {
    flexGrow: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 22,
    paddingHorizontal: 6,
    paddingRight: 12,
  },
  desireFilterScroll: {
    width: "100%",
  },
  desireFilterChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,249,240,0.7)",
    borderRadius: 999,
    borderWidth: 1.2,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 42,
    minWidth: 0,
    paddingHorizontal: 18,
  },
  desireFilterChipActive: {
    backgroundColor: candy.cream,
    borderColor: candy.cream,
  },
  desireFilterText: {
    color: candy.white,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  desireFilterTextActive: {
    color: candy.red,
  },
  cardStack: {
    gap: 10,
    paddingRight: 0,
    paddingTop: 0,
  },
  desireGalleryRow: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderColor: "rgba(255,255,255,0.84)",
    borderRadius: 18,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    minHeight: 78,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  desireGalleryRowAnswered: {
    backgroundColor: "#FFC4DA",
    borderColor: "rgba(255,196,218,0.96)",
  },
  desireGalleryRowMatch: {
    backgroundColor: candy.black,
    borderColor: "rgba(255,255,255,0.14)",
  },
  desireGalleryCopy: {
    flex: 1,
    minWidth: 0,
  },
  desireGalleryCardTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 19,
  },
  desireGalleryCardTitleMatch: {
    color: candy.white,
  },
  desireGalleryCategory: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 13,
    textTransform: "uppercase",
  },
  desireGalleryCategoryMatch: {
    color: candy.yellow,
  },
  desireGalleryMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 7,
  },
  desireGalleryAnswerPill: {
    alignItems: "center",
    backgroundColor: "rgba(43,23,53,0.08)",
    borderColor: "rgba(43,23,53,0.1)",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 21,
    paddingHorizontal: 8,
  },
  desireGalleryAnswerPillNo: {
    backgroundColor: "rgba(43,23,53,0.1)",
    borderColor: "rgba(43,23,53,0.12)",
  },
  desireGalleryAnswerPillCurious: {
    backgroundColor: "rgba(255,249,240,0.72)",
    borderColor: "rgba(255,249,240,0.86)",
  },
  desireGalleryAnswerPillHot: {
    backgroundColor: candy.yellow,
    borderColor: candy.yellow,
  },
  desireGalleryAnswerPillMatch: {
    backgroundColor: "rgba(255,249,240,0.14)",
    borderColor: "rgba(255,249,240,0.18)",
  },
  desireGalleryAnswerText: {
    color: candy.ink,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
  desireGalleryAnswerTextHot: {
    color: candy.black,
  },
  desireGalleryAnswerTextMatch: {
    color: candy.white,
  },
  desireGalleryStatus: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 28,
    minWidth: 74,
    paddingHorizontal: 10,
  },
  desireGalleryStatusTodo: {
    backgroundColor: candy.yellow,
  },
  desireGalleryStatusAnswered: {
    backgroundColor: "transparent",
    borderColor: "rgba(38,18,46,0.72)",
    borderWidth: 1.2,
  },
  desireGalleryStatusMatch: {
    backgroundColor: candy.red,
  },
  desireGalleryStatusText: {
    color: candy.ink,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 13,
  },
  desireGalleryStatusTextTodo: {
    color: candy.black,
  },
  desireGalleryStatusTextMatch: {
    color: candy.white,
  },
  enviesGamePanel: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    gap: 12,
    padding: 0,
  },
  enviesGalleryHero: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    minHeight: 50,
    position: "relative",
  },
  enviesGalleryPackCenter: {
    alignItems: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  enviesGalleryPackPill: {
    alignSelf: "center",
    minHeight: 50,
    paddingHorizontal: 18,
  },
  enviesGalleryTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 40,
    zIndex: 3,
  },
  enviesModeButton: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 999,
    flexDirection: "row",
    gap: 2,
    justifyContent: "center",
    minHeight: 50,
    paddingLeft: 20,
    paddingRight: 15,
    zIndex: 3,
  },
  enviesModeButtonText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  enviesTopGameBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 50,
    position: "relative",
  },
  enviesPackPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: candy.cream,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 16,
  },
  enviesGamePackPill: {
    alignSelf: "center",
  },
  enviesPackPillDot: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  enviesPackPillText: {
    color: candy.black,
    fontSize: 14,
    fontWeight: "900",
  },
  enviesPackPillChevron: {
    transform: [{ rotate: "90deg" }],
  },
  enviesGameProgress: {
    backgroundColor: "rgba(255,36,110,0.2)",
    borderColor: "rgba(255,249,240,0.42)",
    borderRadius: 999,
    borderWidth: 1.2,
    color: candy.white,
    fontSize: 14,
    fontWeight: "900",
    minWidth: 74,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 10,
    position: "absolute",
    right: 0,
    textAlign: "center",
    top: 5,
  },
  enviesGalleryBackButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,249,240,0.92)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 15,
  },
  enviesGameBackButton: {
    left: 0,
    position: "absolute",
    top: 5,
    zIndex: 3,
  },
  enviesGalleryBackText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  gameCardTransitionHost: {
    elevation: 12,
    flexGrow: 1,
    overflow: "visible",
    position: "relative",
    zIndex: 12,
  },
  gameCardTransitionBody: {
    flexGrow: 1,
  },
  gameCardTransitionHostEntering: {
    elevation: 12,
    zIndex: 12,
  },
  gameCardTransitionHostExiting: {
    elevation: 2,
    zIndex: 2,
  },
  gameCardStageHost: {
    flexGrow: 1,
    justifyContent: "center",
    overflow: "visible",
    position: "relative",
  },
  desireGameStage: {
    alignItems: "center",
    flexGrow: 1,
    gap: 0,
    justifyContent: "flex-start",
    overflow: "visible",
    paddingBottom: 0,
    paddingTop: 10,
    width: "100%",
  },
  desireGameStageRoomy: {
    paddingTop: 16,
  },
  desireGameDeck: {
    alignSelf: "center",
    maxWidth: 400,
    minHeight: 388,
    overflow: "visible",
    position: "relative",
    width: "100%",
  },
  desireGameDeckRoomy: {
    maxWidth: 500,
    minHeight: 480,
  },
  desireGameBackCard: {
    backgroundColor: "rgba(247,232,215,0.9)",
    borderRadius: 32,
    bottom: 8,
    boxShadow: "0 12px 22px rgba(38,18,46,0.12)",
    position: "absolute",
    top: 34,
    width: "84%",
  },
  desireGameBackCardLeft: {
    left: 0,
    transform: [{ rotate: "-6deg" }],
  },
  desireGameBackCardRight: {
    right: 0,
    transform: [{ rotate: "6deg" }],
  },
  desireGameCard: {
    alignSelf: "center",
    backgroundColor: candy.cream,
    borderColor: "rgba(255,249,240,0.92)",
    borderRadius: 32,
    borderWidth: 2,
    boxShadow: "0 18px 28px rgba(38,18,46,0.18)",
    justifyContent: "space-between",
    minHeight: 360,
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingVertical: 24,
    position: "relative",
    width: "86%",
  },
  desireGameCardRoomy: {
    minHeight: 434,
    paddingHorizontal: 30,
    paddingVertical: 30,
    width: "83%",
  },
  desireGameTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 2,
  },
  desireGameCategoryLabel: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  desireGameCornerRing: {
    borderColor: candy.yellow,
    borderRadius: 999,
    borderWidth: 3,
    height: 32,
    width: 32,
  },
  desireGameCopy: {
    justifyContent: "center",
    minHeight: 164,
    paddingTop: 20,
  },
  desireGameCopyRoomy: {
    minHeight: 220,
    paddingTop: 28,
  },
  desireGameTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 31,
    textAlign: "left",
  },
  desireGameText: {
    color: candy.muted,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    maxWidth: 300,
  },
  desireGameValidationVeil: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 5,
  },
  desireGameValidationPulse: {
    backgroundColor: "rgba(255,249,240,0.62)",
    borderRadius: 999,
    height: 86,
    position: "absolute",
    width: 86,
  },
  desireGameValidationBadge: {
    alignItems: "center",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2.5,
    boxShadow: "0 10px 20px rgba(38,18,46,0.18)",
    height: 58,
    justifyContent: "center",
    width: 58,
  },
  desireGameVoteRow: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    maxWidth: 430,
    overflow: "visible",
    width: "100%",
  },
  desireGameVoteRowRoomy: {
    maxWidth: 460,
  },
  desireGameVoteDock: {
    alignItems: "center",
    alignSelf: "stretch",
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 206,
    overflow: "visible",
    paddingBottom: 10,
    paddingTop: 30,
  },
  desireGameVoteDockRoomy: {
    minHeight: 246,
    paddingBottom: 14,
    paddingTop: 34,
  },
  enviesGameEmpty: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 430,
    paddingHorizontal: 24,
    paddingVertical: 34,
  },
  enviesGameEmptyDeck: {
    height: 170,
    marginBottom: 30,
    position: "relative",
    width: 176,
  },
  enviesGameEmptyCard: {
    backgroundColor: candy.cream,
    borderRadius: 22,
    height: 132,
    position: "absolute",
    width: 100,
  },
  enviesGameEmptyBackCard: {
    bottom: 8,
    left: 23,
    opacity: 0.88,
    transform: [{ rotate: "-10deg" }],
  },
  enviesGameEmptyFrontCard: {
    alignItems: "center",
    justifyContent: "center",
    right: 22,
    top: 6,
    transform: [{ rotate: "7deg" }],
  },
  enviesGameEmptyTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
    textAlign: "center",
  },
  enviesGameEmptyText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 330,
    textAlign: "center",
  },
  enviesGameEmptyActions: {
    alignItems: "center",
    gap: 12,
    marginTop: 26,
    maxWidth: 320,
    width: "100%",
  },
  enviesGameEmptyPrimary: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 28,
    width: "100%",
  },
  enviesGameEmptyPrimaryText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  enviesGameEmptySecondary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
    paddingHorizontal: 12,
  },
  enviesGameEmptySecondaryText: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
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
  addDesireInlineDock: {
    alignItems: "center",
    overflow: "visible",
    paddingBottom: 26,
    paddingHorizontal: 26,
    paddingTop: 18,
  },
  addDesireButton: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderColor: candy.yellow,
    borderRadius: 999,
    borderWidth: 0,
    elevation: 14,
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 260,
    minHeight: 50,
    paddingHorizontal: 18,
    shadowColor: "rgba(176, 10, 92, 0.34)",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 1,
    shadowRadius: 32,
    width: "100%",
  },
  addDesireButtonLocked: {
    backgroundColor: candy.yellow,
    opacity: 0.72,
  },
  addDesireText: {
    color: candy.black,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
  },
  editorOverlay: {
    flex: 1,
  },
  editorScreen: {
    flex: 1,
  },
  editorSafe: {
    flex: 1,
    width: "100%",
  },
  editorScrollContent: {
    alignItems: "center",
    flexGrow: 1,
    paddingTop: 14,
    width: "100%",
  },
  editorContent: {
    alignSelf: "center",
    flexGrow: 1,
    gap: 18,
    justifyContent: "space-between",
    maxWidth: "100%",
    width: "100%",
  },
  editorMainArea: {
    flex: 1,
    gap: 21,
    justifyContent: "center",
    paddingBottom: 8,
  },
  editorTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 42,
  },
  editorBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.17)",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  editorPreviewCard: {
    backgroundColor: candy.cream,
    borderRadius: 28,
    minHeight: 218,
    overflow: "hidden",
    padding: 24,
    width: "100%",
  },
  editorPreviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  editorEyebrow: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  editorPreviewRing: {
    borderColor: candy.yellow,
    borderRadius: 999,
    borderWidth: 3,
    height: 30,
    width: 30,
  },
  editorTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 37,
  },
  editorTitleDot: {
    color: candy.yellow,
  },
  editorQuota: {
    backgroundColor: candy.yellow,
    borderRadius: 999,
    color: candy.black,
    fontSize: 13,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  editorPreviewBody: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 15,
    marginTop: 24,
  },
  editorLabel: {
    color: "rgba(255,249,240,0.72)",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  editorIconPreview: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(245,40,110,0.07)",
    borderColor: "rgba(59,23,55,0.12)",
    borderRadius: 18,
    borderWidth: 1.5,
    height: 54,
    justifyContent: "center",
    marginTop: 1,
    width: 54,
  },
  editorIconPreviewEmoji: {
    fontFamily: emojiFont,
    fontSize: 30,
    lineHeight: 36,
  },
  editorPreviewCopy: {
    flex: 1,
    gap: 12,
    minWidth: 0,
  },
  editorEditableField: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderColor: "rgba(59,23,55,0.14)",
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    width: "100%",
  },
  editorTitleField: {
    minHeight: 78,
  },
  editorBlurbField: {
    minHeight: 72,
  },
  editorFieldLabel: {
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.9,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  editorTitleInput: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 25,
    minHeight: 38,
    padding: 0,
    textAlignVertical: "top",
  },
  editorBlurbInput: {
    color: candy.text,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
    minHeight: 34,
    padding: 0,
    textAlignVertical: "top",
  },
  editorControls: {
    gap: 19,
    width: "100%",
  },
  editorSection: {
    gap: 10,
    width: "100%",
  },
  editorEmojiPresetRow: {
    flexDirection: "row",
    flexGrow: 1,
    gap: 8,
    width: "100%",
  },
  editorAmbianceRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  editorEmojiPreset: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.15)",
    borderColor: "rgba(255,249,240,0.16)",
    borderRadius: 15,
    borderWidth: 1,
    flexBasis: 0,
    flexGrow: 1,
    height: 52,
    justifyContent: "center",
    minWidth: 0,
    paddingHorizontal: 4,
  },
  editorEmojiPresetActive: {
    backgroundColor: candy.cream,
    borderColor: candy.yellow,
    borderWidth: 3,
  },
  editorEmojiPresetText: {
    fontFamily: emojiFont,
    fontSize: 21,
    lineHeight: 25,
  },
  editorMoreText: {
    color: candy.cream,
    fontSize: 15,
    fontWeight: "900",
  },
  editorAmbianceChip: {
    alignItems: "center",
    borderColor: "rgba(255,249,240,0.62)",
    borderRadius: 999,
    borderWidth: 1.5,
    flexBasis: 0,
    flexGrow: 1,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  editorAmbianceChipActive: {
    backgroundColor: candy.cream,
    borderColor: candy.cream,
  },
  editorAmbianceText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  editorAmbianceTextActive: {
    color: candy.ink,
  },
  editorBottomBar: {
    alignItems: "center",
    backgroundColor: candy.red,
    bottom: 0,
    left: 0,
    paddingTop: 12,
    position: "absolute",
    right: 0,
    width: "100%",
  },
  editorBottomContent: {
    alignSelf: "center",
    gap: 9,
    maxWidth: "100%",
    width: "100%",
  },
  editorSubmitButton: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 25,
    justifyContent: "center",
    minHeight: 55,
    width: "100%",
  },
  editorSubmitButtonDisabled: {
    opacity: 0.62,
  },
  editorSubmitText: {
    color: candy.cream,
    fontSize: 16,
    fontWeight: "900",
  },
  editorFooterText: {
    color: "rgba(255,249,240,0.75)",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
    textAlign: "center",
  },
  desireCard: {
    borderColor: candy.white,
    borderRadius: 26,
    borderWidth: 2,
    minHeight: 180,
    overflow: "visible",
    padding: 18,
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
    minHeight: 112,
    paddingHorizontal: 72,
    paddingTop: 8,
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
    alignItems: "center",
    backgroundColor: candy.cream,
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 0,
    boxShadow: "0 12px 18px rgba(32,16,31,0.18)",
    flexGrow: 0,
    flexShrink: 0,
    height: 106,
    justifyContent: "center",
    minHeight: 106,
    minWidth: 106,
    width: 106,
  },
  voteButtonFeatured: {
    backgroundColor: candy.yellow,
    height: 130,
    minHeight: 130,
    minWidth: 130,
    width: 130,
  },
  voteButtonFireProminent: {
    backgroundColor: candy.black,
    borderColor: candy.black,
    boxShadow: "0 14px 22px rgba(38,18,46,0.28)",
  },
  voteButtonSelected: {
    backgroundColor: candy.cream,
    borderColor: candy.pinkHot,
    borderWidth: 2.2,
    shadowColor: "rgba(245,40,110,0.18)",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  voteButtonFireSelected: {
    borderColor: candy.white,
    borderWidth: 2.2,
    shadowColor: "rgba(245,40,110,0.34)",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 9,
  },
  voteButtonProminentSelected: {
    backgroundColor: candy.white,
    borderColor: candy.red,
    borderWidth: 3,
    boxShadow: "0 12px 20px rgba(245,40,110,0.24)",
  },
  voteButtonFeaturedSelected: {
    borderColor: candy.white,
    borderWidth: 3,
    boxShadow: "0 14px 24px rgba(255,205,50,0.3)",
  },
  voteButtonFireProminentSelected: {
    borderColor: candy.yellow,
    borderWidth: 3,
    boxShadow: "0 16px 26px rgba(38,18,46,0.36)",
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
    fontSize: 16,
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  voteButtonTextSelected: {
    color: candy.pinkHot,
    fontWeight: "900",
  },
  voteButtonTextFireProminent: {
    color: candy.white,
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
    flexGrow: 1,
  },
  matchScreenRevealMode: {
    justifyContent: "center",
  },
  matchScreenEmptyMode: {
    justifyContent: "flex-start",
  },
  matchScreenHeader: {
    gap: 2,
  },
  matchScreenTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  matchScreenSubtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
  },
  matchPrimaryStage: {
    width: "100%",
  },
  matchPrimaryStageReveal: {
    flexGrow: 1,
    overflow: "hidden",
  },
  matchPrimaryStageEmpty: {
    flexGrow: 1,
    justifyContent: "center",
  },
  matchPrimaryStageCentered: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 8,
  },
  hiddenRevealPanel: {
    alignItems: "center",
    gap: 15,
    paddingBottom: 12,
    paddingTop: 2,
  },
  hiddenRevealCardStack: {
    alignItems: "center",
    height: 352,
    justifyContent: "center",
    maxWidth: 340,
    width: "100%",
  },
  hiddenRevealBackPlate: {
    backgroundColor: "#24112F",
    borderRadius: 38,
    height: 306,
    opacity: 0.7,
    position: "absolute",
    top: 34,
    width: "76%",
  },
  hiddenRevealBackPlateLeft: {
    left: 17,
    transform: [{ rotate: "-5deg" }],
  },
  hiddenRevealBackPlateRight: {
    right: 17,
    transform: [{ rotate: "5deg" }],
  },
  hiddenRevealMysteryCard: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 34,
    height: 338,
    justifyContent: "center",
    maxWidth: 306,
    overflow: "hidden",
    width: "84%",
  },
  hiddenRevealPattern: {
    bottom: 18,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    left: 17,
    opacity: 0.9,
    position: "absolute",
    right: 17,
    top: 16,
  },
  hiddenRevealPatternDot: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  hiddenRevealShine: {
    backgroundColor: "rgba(255,255,255,0.16)",
    bottom: -52,
    position: "absolute",
    top: -52,
    width: 76,
  },
  hiddenRevealQuestionBadge: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderRadius: 999,
    height: 82,
    justifyContent: "center",
    width: 82,
  },
  hiddenRevealQuestionText: {
    color: candy.black,
    fontFamily: displayFont,
    fontSize: 40,
    fontWeight: "900",
    lineHeight: 43,
  },
  hiddenRevealCardLabel: {
    color: candy.yellow,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 16,
    textTransform: "uppercase",
  },
  hiddenRevealCopy: {
    alignItems: "center",
    gap: 8,
    maxWidth: 310,
  },
  hiddenRevealTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 30,
    textAlign: "center",
  },
  hiddenRevealText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
    textAlign: "center",
  },
  hiddenRevealButton: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 999,
    justifyContent: "center",
    marginTop: 4,
    minHeight: 56,
    paddingHorizontal: 34,
    width: "76%",
  },
  hiddenRevealButtonDisabled: {
    opacity: 0.78,
  },
  hiddenRevealButtonText: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  hiddenRevealAdText: {
    color: "rgba(255,255,255,0.58)",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center",
  },
  hiddenRevealAdLink: {
    color: candy.cream,
    textDecorationLine: "underline",
  },
  hiddenRevealPendingLine: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    maxWidth: 320,
  },
  hiddenRevealPendingDot: {
    backgroundColor: candy.yellow,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  hiddenRevealPendingText: {
    color: candy.white,
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    textAlign: "center",
  },
  matchRevealTheater: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  matchRevealTheaterBackdrop: {
    backgroundColor: "rgba(33,13,39,0.96)",
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  matchRevealHiddenLayer: {
    width: "100%",
    zIndex: 1,
  },
  matchRevealRevealedLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 2,
  },
  matchRevealedPanel: {
    flexGrow: 1,
    gap: 22,
    justifyContent: "space-between",
    minHeight: 704,
    overflow: "hidden",
    paddingBottom: 18,
    paddingHorizontal: 30,
    paddingTop: 86,
    position: "relative",
  },
  matchRevealedPanelInline: {
    flex: 1,
    gap: 28,
    justifyContent: "center",
    minHeight: 0,
    paddingBottom: 30,
    paddingHorizontal: 30,
    paddingTop: 30,
  },
  matchRevealedDecor: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  matchRevealedAura: {
    backgroundColor: "rgba(245,40,110,0.14)",
    borderRadius: 999,
    height: 360,
    left: "50%",
    marginLeft: -180,
    position: "absolute",
    top: 126,
    width: 360,
  },
  matchRevealedSparkDot: {
    borderRadius: 999,
    height: 8,
    position: "absolute",
    width: 8,
  },
  matchRevealedSparkDotOne: {
    backgroundColor: candy.yellow,
    left: 50,
    top: 146,
  },
  matchRevealedSparkDotTwo: {
    backgroundColor: candy.red,
    right: 58,
    top: 196,
  },
  matchRevealedSparkDash: {
    borderRadius: 999,
    height: 7,
    position: "absolute",
    width: 28,
  },
  matchRevealedSparkDashOne: {
    backgroundColor: candy.red,
    bottom: 156,
    left: 66,
    transform: [{ rotate: "-48deg" }],
  },
  matchRevealedSparkDashTwo: {
    backgroundColor: candy.yellow,
    right: -5,
    top: 292,
    transform: [{ rotate: "-20deg" }],
  },
  matchRevealedHeroCopy: {
    alignSelf: "center",
    maxWidth: 334,
    width: "100%",
  },
  matchRevealedHeadline: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 41,
    fontWeight: "900",
    lineHeight: 44,
  },
  matchRevealedHeadlineDot: {
    color: candy.yellow,
  },
  matchRevealedSubRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 4,
  },
  matchRevealedSubDot: {
    backgroundColor: candy.yellow,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  matchRevealedSubtitle: {
    color: "rgba(255,249,240,0.76)",
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  matchRevealedCardShell: {
    alignSelf: "center",
    maxWidth: 326,
    position: "relative",
    transform: [{ rotate: "-2.8deg" }],
    width: "100%",
  },
  matchRevealedCardMotion: {
    alignSelf: "center",
    maxWidth: 326,
    width: "100%",
  },
  matchRevealedCardGlow: {
    backgroundColor: "rgba(255,210,63,0.14)",
    borderRadius: 34,
    bottom: -7,
    left: 13,
    position: "absolute",
    right: -13,
    top: 15,
    transform: [{ rotate: "4deg" }],
  },
  matchRevealedSidePeek: {
    backgroundColor: candy.yellow,
    borderRadius: 999,
    height: 18,
    position: "absolute",
    right: -8,
    top: 154,
    width: 18,
  },
  matchRevealedTopDot: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: 8,
    position: "absolute",
    right: 28,
    top: -18,
    width: 8,
  },
  matchRevealedBigCard: {
    backgroundColor: candy.cream,
    borderRadius: 31,
    minHeight: 400,
    overflow: "hidden",
    paddingBottom: 26,
    paddingHorizontal: 25,
    paddingTop: 31,
    position: "relative",
    shadowColor: "rgba(0,0,0,0.28)",
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 1,
    shadowRadius: 30,
  },
  matchRevealedCategory: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  matchRevealedCornerDot: {
    backgroundColor: candy.yellow,
    borderRadius: 999,
    height: 28,
    position: "absolute",
    right: 24,
    top: 23,
    width: 28,
  },
  matchRevealedCardTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 30,
    marginTop: 94,
  },
  matchRevealedAnswerRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: "auto",
  },
  matchAnswerPill: {
    borderRadius: 14,
    flex: 1,
    justifyContent: "center",
    minHeight: 70,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  matchAnswerPillMine: {
    backgroundColor: candy.black,
    transform: [{ rotate: "-0.8deg" }],
  },
  matchAnswerPillPartner: {
    backgroundColor: candy.yellow,
  },
  matchAnswerLabel: {
    color: "#8A6312",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  matchAnswerLabelMine: {
    color: candy.yellow,
  },
  matchAnswerValue: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 2,
  },
  matchAnswerValueMine: {
    color: candy.cream,
  },
  matchRevealedActionBlock: {
    alignSelf: "center",
    gap: 10,
    maxWidth: 334,
    width: "100%",
  },
  matchRevealedChatButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 24,
    shadowColor: "rgba(245,40,110,0.38)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  matchRevealedChatText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  matchRevealedLaterButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 26,
  },
  matchRevealedLaterText: {
    color: "rgba(255,249,240,0.48)",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  matchRevealCard: {
    backgroundColor: "transparent",
    borderRadius: 0,
    marginTop: 18,
    minHeight: 118,
    overflow: "hidden",
    paddingRight: 92,
  },
  matchRevealSticker: {
    height: 78,
    position: "absolute",
    right: 0,
    top: 0,
    transform: [{ rotate: "9deg" }],
    width: 78,
  },
  matchRevealLabel: {
    color: candy.white,
    fontSize: 11,
    fontWeight: "900",
    opacity: 0.86,
    textTransform: "uppercase",
  },
  matchRevealTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 33,
    marginTop: 4,
    textShadowColor: "rgba(32,16,31,0.26)",
    textShadowOffset: { width: 1.5, height: 1.5 },
    textShadowRadius: 0,
  },
  matchRevealText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 13,
    fontWeight: "800",
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
    backgroundColor: "rgba(255,214,230,0.9)",
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
    backgroundColor: "rgba(255,255,255,0.92)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 24,
    borderWidth: 2,
    gap: 12,
    minHeight: 146,
    padding: 12,
    paddingRight: 12,
  },
  matchRevealLockedBody: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  matchRevealLockedIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,36,95,0.1)",
    borderColor: "rgba(255,36,95,0.18)",
    borderRadius: 22,
    borderWidth: 1.5,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  matchRevealLockedCopy: {
    flex: 1,
    minWidth: 0,
  },
  matchRevealLockedLabel: {
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  matchRevealLockedTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 27,
    marginTop: 2,
  },
  matchRevealLockedText: {
    color: candy.text,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 4,
  },
  matchRevealLockedFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  matchRevealOpenCard: {
    minHeight: 160,
  },
  matchRevealLockedGlow: {
    backgroundColor: "rgba(255,36,95,0.16)",
    borderRadius: 999,
    height: 134,
    opacity: 1,
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
    backgroundColor: "rgba(255,36,95,0.14)",
    borderRadius: 999,
    flex: 1,
    height: 7,
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
    minHeight: 42,
    paddingHorizontal: 14,
  },
  matchListHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  matchListTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
  },
  matchListCount: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 12,
    fontWeight: "900",
  },
  matchList: {
    gap: 10,
  },
  matchPendingRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    borderColor: "rgba(255,249,240,0.46)",
    borderRadius: 22,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 78,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  matchPendingRowOpening: {
    opacity: 0.78,
  },
  matchPendingQuestion: {
    alignItems: "center",
    backgroundColor: "rgba(255,181,214,0.72)",
    borderRadius: 999,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  matchPendingQuestionText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 27,
  },
  matchPendingCopy: {
    flex: 1,
    minWidth: 0,
  },
  matchPendingBlurWide: {
    backgroundColor: "rgba(255,255,255,0.32)",
    borderRadius: 999,
    height: 12,
    maxWidth: 190,
    width: "70%",
  },
  matchPendingBlurShort: {
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    height: 10,
    marginTop: 6,
    maxWidth: 130,
    width: "48%",
  },
  matchPendingText: {
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 5,
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
    backgroundColor: "rgba(245,40,110,0.08)",
    height: 340,
    right: -148,
    top: 120,
    width: 340,
  },
  matchDetailGlowBottom: {
    backgroundColor: "rgba(245,40,110,0.08)",
    bottom: -118,
    height: 360,
    left: -176,
    width: 360,
  },
  matchDetailContent: {
    alignItems: "center",
    flexGrow: 1,
    gap: 0,
    justifyContent: "center",
  },
  matchDetailStage: {
    alignSelf: "center",
    gap: 32,
    maxWidth: 334,
    width: "100%",
  },
  matchDetailActions: {
    alignSelf: "center",
    gap: 8,
    width: "100%",
  },
  matchDetailPrimaryAction: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 24,
    shadowColor: "rgba(245,40,110,0.38)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 24,
  },
  matchDetailPrimaryText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  matchDetailSecondaryAction: {
    alignItems: "center",
    backgroundColor: "transparent",
    justifyContent: "center",
    minHeight: 28,
  },
  matchDetailSecondaryText: {
    color: "rgba(255,249,240,0.48)",
    fontSize: 14,
    fontWeight: "900",
    textAlign: "center",
  },
  matchEmptyEntrance: {
    flex: 1,
    width: "100%",
  },
  matchEmpty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 0,
    paddingHorizontal: 28,
  },
  matchEmptySymbol: {
    height: 104,
    marginBottom: 38,
    position: "relative",
    width: 142,
  },
  matchEmptyCircle: {
    borderRadius: 999,
    height: 88,
    position: "absolute",
    top: 8,
    width: 88,
  },
  matchEmptyCircleSoft: {
    backgroundColor: "rgba(255,249,240,0.84)",
    left: 12,
  },
  matchEmptyCircleHot: {
    backgroundColor: candy.yellow,
    right: 12,
  },
  matchEmptyTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 27,
    fontWeight: "900",
    lineHeight: 31,
    textAlign: "center",
  },
  matchEmptyText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 10,
    maxWidth: 300,
    textAlign: "center",
  },
  matchEmptyCTA: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 999,
    justifyContent: "center",
    marginTop: 25,
    minHeight: 56,
    minWidth: 184,
    paddingHorizontal: 28,
  },
  matchEmptyCTAText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  chatUnavailableScreen: {
    alignSelf: "stretch",
    backgroundColor: candy.darkColor,
    flex: 1,
    paddingHorizontal: 22,
    width: "100%",
  },
  chatUnavailableBack: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,249,240,0.13)",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  chatUnavailableCenter: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 36,
  },
  chatUnavailableIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.1)",
    borderColor: "rgba(255,249,240,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    height: 122,
    justifyContent: "center",
    marginBottom: 28,
    position: "relative",
    width: 122,
  },
  chatUnavailableLock: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderColor: candy.darkColor,
    borderRadius: 999,
    borderWidth: 3,
    bottom: 10,
    height: 38,
    justifyContent: "center",
    position: "absolute",
    right: 9,
    width: 38,
  },
  chatUnavailableTitle: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 29,
    fontWeight: "900",
    lineHeight: 32,
    maxWidth: 330,
    textAlign: "center",
  },
  chatUnavailableText: {
    color: "rgba(255,249,240,0.72)",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 320,
    textAlign: "center",
  },
  chatUnavailablePrimary: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 999,
    justifyContent: "center",
    marginTop: 26,
    minHeight: 58,
    minWidth: 230,
    paddingHorizontal: 30,
  },
  chatUnavailablePrimaryText: {
    color: candy.black,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center",
  },
  chatScreen: {
    flexGrow: 1,
    gap: 13,
    paddingHorizontal: 10,
  },
  chatFrame: {
    alignSelf: "stretch",
    backgroundColor: candy.darkColor,
    flex: 1,
    width: "100%",
  },
  chatScroller: {
    flex: 1,
    width: "100%",
  },
  chatHero: {
    gap: 14,
  },
  chatHeaderIdentity: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 54,
  },
  chatBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.13)",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  chatHeaderAvatarStack: {
    alignItems: "center",
    flexDirection: "row",
    width: 72,
  },
  chatHeaderMiniAvatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 39,
    justifyContent: "center",
    width: 39,
  },
  chatHeaderMiniAvatarMine: {
    backgroundColor: candy.red,
    borderColor: candy.darkColor,
    borderWidth: 2,
    zIndex: 2,
  },
  chatHeaderMiniAvatarPartner: {
    backgroundColor: candy.yellow,
    borderColor: candy.darkColor,
    borderWidth: 2,
    marginLeft: -9,
  },
  chatHeaderMiniAvatarText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 15,
    fontWeight: "900",
  },
  chatHeaderMiniAvatarTextDark: {
    color: candy.black,
  },
  chatHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderName: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 22,
  },
  chatHeaderMetaRow: {
    flexDirection: "row",
    marginTop: 2,
  },
  chatHeaderMetaPill: {
    alignSelf: "flex-start",
    color: candy.yellow,
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 14,
  },
  chatContext: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.08)",
    borderColor: "rgba(255,249,240,0.18)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 70,
    padding: 11,
  },
  chatContextSticker: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 8,
    height: 45,
    justifyContent: "center",
    width: 45,
  },
  chatContextDiamond: {
    backgroundColor: candy.red,
    borderRadius: 3,
    height: 18,
    transform: [{ rotate: "45deg" }],
    width: 18,
  },
  chatContextCopy: {
    flex: 1,
  },
  chatContextLabel: {
    color: candy.yellow,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  chatContextTitle: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: 3,
  },
  chatDateDivider: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 106,
  },
  chatDateText: {
    color: "rgba(255,249,240,0.42)",
    fontSize: 12,
    fontWeight: "900",
  },
  chatMessages: {
    gap: 10,
    minHeight: 220,
  },
  chatEmpty: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.08)",
    borderColor: "rgba(255,249,240,0.18)",
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
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 26,
    fontWeight: "900",
    marginTop: 6,
    textAlign: "center",
  },
  chatEmptyText: {
    color: "rgba(255,249,240,0.68)",
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
    backgroundColor: candy.cream,
    borderColor: "rgba(255,249,240,0.42)",
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    maxWidth: "82%",
    overflow: "visible",
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  chatBubbleMine: {
    backgroundColor: candy.red,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 6,
    borderColor: "rgba(255,83,139,0.7)",
  },
  chatBubbleName: {
    color: "rgba(245,40,110,0.78)",
    display: "none",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  chatBubbleNameMine: {
    color: candy.white,
  },
  chatBubbleText: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 2,
  },
  chatBubbleTextMine: {
    color: candy.white,
  },
  chatBubbleMeta: {
    color: "rgba(255,249,240,0.42)",
    fontSize: 10,
    fontWeight: "900",
    marginTop: 7,
    textAlign: "right",
  },
  chatBubbleMetaMine: {
    color: "rgba(255,249,240,0.58)",
  },
  chatBubbleMetaPending: {
    fontWeight: "900",
  },
  chatBubbleMetaFailed: {
    color: "#FFE2EA",
  },
  chatBubblePhotos: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 2,
  },
  chatBubblePhoto: {
    backgroundColor: "#EEDDC9",
    borderColor: "rgba(255,249,240,0.82)",
    borderRadius: 15,
    borderWidth: 1,
    height: 168,
    width: 190,
  },
  chatPhotoRevealButton: {
    backgroundColor: candy.cream,
    borderColor: "rgba(255,249,240,0.82)",
    borderRadius: 18,
    borderWidth: 1,
    height: 170,
    overflow: "hidden",
    position: "relative",
    width: 196,
  },
  chatPhotoRevealImage: {
    height: "100%",
    width: "100%",
  },
  chatPhotoBlurOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.34)",
    bottom: 0,
    gap: 6,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  chatPhotoEye: {
    alignItems: "center",
    backgroundColor: candy.darkColor,
    borderRadius: 999,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  chatPhotoRevealLabel: {
    bottom: 9,
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
    left: 10,
    position: "absolute",
    right: 10,
    textAlign: "center",
  },
  chatPhotoGone: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.16)",
    borderStyle: "dashed",
    gap: 7,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  chatPhotoUnavailable: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.14)",
    borderStyle: "dashed",
    gap: 7,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  chatPhotoGoneText: {
    color: candy.cream,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
    textAlign: "center",
  },
  chatPhotoGoneTextMine: {
    color: candy.white,
  },
  ephemeralPhotoBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(22,8,24,0.94)",
    flex: 1,
    justifyContent: "center",
    padding: 18,
  },
  ephemeralPhotoTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 18,
    position: "absolute",
    right: 18,
    top: Platform.OS === "ios" ? 54 : 24,
    zIndex: 2,
  },
  ephemeralPhotoTimer: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    minHeight: 40,
    paddingHorizontal: 13,
  },
  ephemeralPhotoTimerText: {
    color: candy.white,
    fontSize: 14,
    fontWeight: "900",
  },
  ephemeralPhotoClose: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  ephemeralPhoto: {
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 26,
    borderWidth: 1,
    height: "74%",
    maxHeight: 760,
    maxWidth: 720,
    width: "100%",
  },
  ephemeralPhotoHint: {
    bottom: Platform.OS === "ios" ? 48 : 26,
    color: "rgba(255,255,255,0.82)",
    fontSize: 12,
    fontWeight: "800",
    position: "absolute",
    textAlign: "center",
  },
  chatComposerDock: {
    backgroundColor: candy.darkColor,
    flexShrink: 0,
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 8,
    width: "100%",
  },
  chatSuggestionPanel: {
    backgroundColor: "rgba(55,31,62,0.94)",
    borderColor: "rgba(255,249,240,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    padding: 7,
    paddingHorizontal: 2,
    width: "100%",
  },
  chatQuickRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2,
    paddingVertical: 0,
    width: "100%",
  },
  chatQuickPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.1)",
    borderColor: "rgba(255,249,240,0.18)",
    borderRadius: 15,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  chatQuickText: {
    color: candy.cream,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center",
  },
  chatPendingPhotos: {
    backgroundColor: "rgba(255,249,240,0.1)",
    borderColor: "rgba(255,249,240,0.16)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 7,
  },
  chatPendingPhotoWrap: {
    borderColor: "rgba(255,249,240,0.52)",
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
    alignItems: "center",
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 9,
    minHeight: 58,
    overflow: "visible",
    width: "100%",
  },
  chatComposerActive: {
    borderColor: "transparent",
  },
  chatIconButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.12)",
    borderRadius: 999,
    flexShrink: 0,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  chatIconButtonDisabled: {
    opacity: 0.55,
  },
  chatInput: {
    backgroundColor: candy.cream,
    borderRadius: 999,
    color: candy.ink,
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    includeFontPadding: false,
    lineHeight: 21,
    maxHeight: 90,
    minHeight: 52,
    minWidth: 0,
    paddingHorizontal: 18,
    paddingVertical: 15,
    textAlignVertical: "top",
  },
  chatSendButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 999,
    flexShrink: 0,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  chatSendButtonDisabled: {
    opacity: 0.42,
  },
  rulesScreen: {
    gap: 14,
    paddingBottom: 118,
    paddingHorizontal: 14,
    paddingTop: APP_HEADER_TOP_SPACE,
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
  homeSurpriseDeck: {
    overflow: "visible",
    position: "relative",
  },
  homeEmptySurpriseCard: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 24,
    justifyContent: "center",
    minHeight: 178,
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
  homeSurpriseCard: {
    backgroundColor: candy.cream,
    borderRadius: 24,
    gap: 12,
    minHeight: 190,
    overflow: "hidden",
    padding: 20,
    boxShadow: "0 12px 22px rgba(38,18,46,0.14)",
  },
  homeSurpriseTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeSurpriseEyebrow: {
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeSurpriseBadge: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 24,
    paddingHorizontal: 12,
  },
  homeSurpriseBadgeText: {
    color: candy.ink,
    fontSize: 10,
    fontWeight: "900",
  },
  homeSurpriseTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 23,
    textAlign: "center",
  },
  homeSurpriseActionStack: {
    width: "100%",
  },
  homeSurpriseButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 18,
  },
  homeSurpriseButtonText: {
    color: candy.white,
    fontSize: 14,
    fontWeight: "900",
  },
  homeSurpriseText: {
    color: "rgba(155,130,117,0.72)",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center",
  },
  homeStore: {
    gap: 9,
  },
  homeStoreTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeStoreTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  homeStoreLink: {
    alignItems: "center",
    flexDirection: "row",
    gap: 1,
  },
  homeStoreLinkText: {
    color: candy.yellow,
    fontSize: 13,
    fontWeight: "900",
  },
  homeStorePackRow: {
    flexDirection: "row",
    gap: 9,
  },
  homeStorePack: {
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 64,
    overflow: "hidden",
    padding: 12,
  },
  homeStorePackFeatured: {
    backgroundColor: candy.yellow,
  },
  homeStorePackSoon: {
    backgroundColor: candy.black,
  },
  homeStorePackTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 18,
  },
  homeStorePackTitleSoon: {
    color: candy.white,
  },
  homeStorePackMeta: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    marginTop: 2,
  },
  homeStorePackMetaSoon: {
    color: candy.yellow,
  },
  storeScreen: {
    flex: 1,
  },
  storeSafe: {
    flex: 1,
  },
  storeContent: {
    alignSelf: "center",
    flexGrow: 1,
    gap: 14,
    paddingTop: 10,
    width: "100%",
  },
  storeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 13,
    minHeight: 54,
  },
  storeHeaderCopy: {
    flex: 1,
    minWidth: 0,
  },
  storeCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.17)",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  storeTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 35,
  },
  storeSubtitle: {
    color: "rgba(255,249,240,0.84)",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 1,
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
    paddingHorizontal: 1,
  },
  storeSectionTitle: {
    color: "rgba(255,249,240,0.7)",
    fontFamily: displayFont,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 16,
    textTransform: "uppercase",
  },
  storeUpgradeList: {
    gap: 10,
  },
  storeUpgradeCard: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 25,
    flexDirection: "row",
    gap: 10,
    minHeight: 69,
    overflow: "visible",
    paddingHorizontal: 18,
    paddingVertical: 11,
  },
  storeUpgradeCardHighlight: {
    backgroundColor: candy.yellow,
  },
  storePopularBadge: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 999,
    minHeight: 24,
    paddingHorizontal: 12,
    position: "absolute",
    right: 18,
    top: -10,
    zIndex: 4,
  },
  storePopularText: {
    color: candy.yellow,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 22,
    textTransform: "uppercase",
  },
  storeUpgradeCopy: {
    flex: 1,
    minWidth: 0,
  },
  storeUpgradeTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 21,
  },
  storeUpgradeText: {
    color: candy.text,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 1,
  },
  storeUpgradePrice: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 42,
    minWidth: 75,
    paddingHorizontal: 13,
  },
  storeUpgradePriceDark: {
    backgroundColor: candy.black,
  },
  storeUpgradePriceText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
  },
  storeUpgradePriceTextDark: {
    color: candy.white,
  },
  storePacksHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "flex-start",
    marginTop: 12,
  },
  storePackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    width: "100%",
  },
  storePackCard: {
    borderRadius: 24,
    justifyContent: "flex-end",
    overflow: "hidden",
    padding: 16,
    position: "relative",
  },
  storePackCardFill: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  storePackCardCopy: {
    position: "relative",
    zIndex: 2,
  },
  storePackTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 22,
  },
  storePackTitleLight: {
    color: candy.cream,
  },
  storePackTitleDark: {
    color: candy.ink,
  },
  storePackPrice: {
    color: candy.ink,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 1,
  },
  storePackPriceLight: {
    color: candy.yellow,
  },
  storePackPriceDark: {
    color: candy.ink,
  },
  storeFooter: {
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    paddingTop: 4,
  },
  storeRestoreButton: {
    minHeight: 28,
    justifyContent: "center",
  },
  storeRestoreText: {
    color: candy.cream,
    fontSize: 13,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  storeLegalText: {
    color: "rgba(255,249,240,0.72)",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 14,
    textAlign: "center",
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
    minHeight: 40,
    paddingHorizontal: 14,
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
    gap: 12,
    paddingTop: 20,
  },
  homeFrame: {
    flex: 1,
    position: "relative",
  },
  homeFloatingHeader: {
    position: "absolute",
    zIndex: 30,
  },
  homeHero: {
    gap: 20,
    overflow: "hidden",
    paddingBottom: 6,
    position: "relative",
  },
  homeHeroTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeBrandPill: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 36,
    paddingHorizontal: 18,
  },
  homeBrandText: {
    color: candy.red,
    fontSize: 14,
    fontWeight: "900",
  },
  homeProfileButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  homeProfileBubble: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.cream,
    borderRadius: 999,
    borderWidth: 2,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  homeProfileIcon: {
    color: candy.white,
    fontFamily: emojiFont,
    fontSize: 18,
    lineHeight: 22,
  },
  homeHeroTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 43,
    fontWeight: "900",
    lineHeight: 45,
    maxWidth: 280,
  },
  homeHeroQuestion: {
    color: candy.yellow,
  },
  homeMoodRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  homeMoodChip: {
    alignItems: "center",
    borderColor: "rgba(255,249,240,0.72)",
    borderRadius: 999,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 0,
    paddingHorizontal: 15,
  },
  homeMoodChipSelected: {
    backgroundColor: candy.cream,
    borderColor: candy.cream,
  },
  homeMoodChipPressed: {
    opacity: 0.82,
  },
  homeMoodChipText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
  },
  homeMoodChipTextSelected: {
    color: candy.red,
  },
  homeMoodSettingsChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderColor: "rgba(255,249,240,0.72)",
    borderRadius: 999,
    borderWidth: 1.5,
    flexShrink: 0,
    justifyContent: "center",
  },
  homeMoodSheetOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(38,18,46,0.48)",
    flex: 1,
    justifyContent: "flex-end",
  },
  homeMoodSheetBackdrop: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  homeMoodSheet: {
    backgroundColor: candy.cream,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    gap: 14,
    maxWidth: 430,
    minHeight: "78%",
    paddingHorizontal: 18,
    paddingTop: 0,
    shadowColor: "rgba(32,16,31,0.24)",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 1,
    shadowRadius: 24,
    width: "100%",
  },
  homeMoodSheetHandleHitArea: {
    alignItems: "center",
    alignSelf: "stretch",
    height: 52,
    justifyContent: "center",
    marginBottom: -8,
    marginHorizontal: -18,
    paddingTop: 4,
  },
  homeMoodSheetHandle: {
    alignSelf: "center",
    backgroundColor: "rgba(169,126,96,0.42)",
    borderRadius: 999,
    height: 4,
    width: 44,
  },
  homeMoodSheetHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  homeMoodSheetTitleBlock: {
    flex: 1,
    minWidth: 0,
  },
  homeMoodSheetTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 32,
  },
  homeMoodSheetTitleDot: {
    color: candy.red,
  },
  homeMoodSheetSubtitle: {
    color: candy.muted,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 17,
    marginTop: 8,
  },
  homeMoodSheetClose: {
    alignItems: "center",
    backgroundColor: "rgba(32,16,31,0.06)",
    borderRadius: 17,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  homeMoodSignalList: {
    gap: 10,
  },
  homeMoodSignalRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.32)",
    borderColor: "rgba(169,126,96,0.24)",
    borderRadius: 22,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  homeMoodSignalRowSelected: {
    backgroundColor: candy.red,
    borderColor: candy.red,
    shadowColor: "rgba(255,36,95,0.24)",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 1,
    shadowRadius: 20,
  },
  homeMoodSignalDot: {
    borderColor: "rgba(32,16,31,0.05)",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    width: 34,
  },
  homeMoodSignalCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeMoodSignalTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 20,
  },
  homeMoodSignalTitleSelected: {
    color: candy.white,
  },
  homeMoodSignalText: {
    color: candy.muted,
    fontSize: 11.5,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 2,
  },
  homeMoodSignalTextSelected: {
    color: "rgba(255,249,240,0.9)",
  },
  homeMoodNotificationPanel: {
    gap: 8,
  },
  homeMoodNotificationTitle: {
    color: candy.ink,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 4,
    textTransform: "uppercase",
  },
  homeMoodSendButton: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 22,
    justifyContent: "center",
    minHeight: 54,
  },
  homeMoodSendText: {
    color: candy.white,
    fontSize: 16,
    fontWeight: "900",
  },
  homeMoodSheetFootnote: {
    color: candy.muted,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    paddingHorizontal: 10,
    textAlign: "center",
  },
  dailyAdviceCard: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 22,
    flexDirection: "row",
    gap: 12,
    minHeight: 78,
    padding: 14,
  },
  dailyAdviceIcon: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  dailyAdviceCopy: {
    flex: 1,
    minWidth: 0,
  },
  dailyAdvicePillText: {
    color: candy.yellow,
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  dailyAdviceText: {
    color: candy.white,
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 4,
  },
  homeNextPanel: {
    borderColor: candy.white,
    borderRadius: 28,
    borderWidth: 2,
    minHeight: 142,
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
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 2,
  },
  homeNextEmoji: {
    fontFamily: emojiFont,
    fontSize: 48,
    lineHeight: 54,
    opacity: 0.96,
    transform: [{ rotate: "9deg" }],
  },
  homeNextCopy: {
    flex: 1,
    minWidth: 0,
  },
  homeNextQuestLabel: {
    alignSelf: "flex-start",
    backgroundColor: candy.white,
    borderRadius: 999,
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    marginBottom: 8,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  homeNextTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 33,
  },
  homeNextActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 9,
    marginTop: 14,
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
  coupleScreen: {
    alignSelf: "center",
    flexGrow: 1,
    justifyContent: "flex-start",
    width: "100%",
  },
  coupleTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  coupleScreenTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
  },
  coupleScreenSubtitle: {
    color: "rgba(255,249,240,0.68)",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    marginTop: 1,
    maxWidth: 210,
  },
  coupleSettingsButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.18)",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 16,
  },
  coupleSettingsText: {
    color: candy.cream,
    fontSize: 12,
    fontWeight: "900",
  },
  coupleProfileGrid: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  coupleProfileCard: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 18,
    flex: 1,
    minHeight: 150,
    paddingHorizontal: 10,
    paddingVertical: 13,
  },
  coupleProfileCardHighlight: {
    backgroundColor: candy.yellow,
  },
  coupleProfileAvatar: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 999,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  coupleProfileEmoji: {
    fontFamily: emojiFont,
    fontSize: 25,
    lineHeight: 31,
  },
  coupleProfileName: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 9,
  },
  coupleProfileVibe: {
    color: candy.red,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 12,
    marginTop: 1,
    textTransform: "uppercase",
  },
  coupleProfileMoodRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    marginTop: 7,
  },
  coupleProfileMoodDot: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  coupleProfileMoodDotHot: {
    backgroundColor: candy.pink,
  },
  coupleProfileMoodText: {
    color: candy.text,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
  coupleProfilePackRow: {
    alignItems: "center",
    backgroundColor: "rgba(245,40,110,0.08)",
    borderRadius: 999,
    justifyContent: "center",
    marginTop: 8,
    minHeight: 24,
    paddingHorizontal: 10,
    width: "100%",
  },
  coupleProfilePackText: {
    color: candy.ink,
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
  coupleCodePill: {
    alignItems: "center",
    backgroundColor: "rgba(255,102,158,0.62)",
    borderRadius: 20,
    flexDirection: "row",
    gap: 8,
    minHeight: 46,
    paddingHorizontal: 15,
    width: "100%",
  },
  coupleCodeText: {
    color: candy.cream,
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  coupleCodeStrong: {
    color: candy.cream,
    fontWeight: "900",
  },
  coupleCodeCopyButton: {
    minHeight: 30,
    justifyContent: "center",
  },
  coupleCodeCopyText: {
    color: candy.cream,
    fontSize: 11,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  coupleSoloScreen: {
    flexGrow: 1,
  },
  coupleSoloScreenTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
  },
  coupleSoloCenter: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 76,
    paddingHorizontal: 24,
  },
  coupleSoloAvatarStage: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 28,
  },
  coupleSoloAvatar: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.cream,
    borderRadius: 999,
    borderWidth: 4,
    height: 96,
    justifyContent: "center",
    width: 96,
    zIndex: 2,
  },
  coupleSoloAvatarInitial: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 39,
    fontWeight: "900",
    lineHeight: 44,
  },
  coupleSoloMissingAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(245,40,110,0.18)",
    borderColor: "rgba(255,249,240,0.72)",
    borderRadius: 999,
    borderStyle: "dashed",
    borderWidth: 3,
    height: 88,
    justifyContent: "center",
    marginLeft: -10,
    width: 88,
  },
  coupleSoloMissingText: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40,
  },
  coupleStats: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  coupleStatPill: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 15,
    flex: 1,
    minHeight: 74,
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 9,
  },
  coupleStatValue: {
    color: candy.yellow,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30,
  },
  coupleStatLabel: {
    color: candy.cream,
    fontSize: 10,
    fontWeight: "900",
    marginTop: 2,
    opacity: 0.88,
    textAlign: "center",
  },
  coupleReconnectCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.12)",
    borderColor: "rgba(255,249,240,0.22)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 11,
    width: "100%",
  },
  coupleReconnectCopy: {
    flex: 1,
    minWidth: 0,
  },
  coupleReconnectLabel: {
    color: "rgba(255,249,240,0.72)",
    fontSize: 10,
    fontWeight: "900",
    opacity: 0.74,
    textTransform: "uppercase",
  },
  coupleReconnectCode: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 23,
  },
  coupleReconnectText: {
    color: "rgba(255,249,240,0.66)",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 3,
  },
  coupleReconnectButton: {
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
  coupleSoloActions: {
    alignItems: "center",
    gap: 10,
    marginTop: 28,
    maxWidth: 300,
    width: "100%",
  },
  coupleSoloInviteButton: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 30,
    width: "100%",
  },
  coupleSoloInviteText: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  coupleSoloJoinButton: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 28,
    width: "100%",
  },
  coupleSoloJoinText: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  coupleSoloTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 32,
    textAlign: "center",
  },
  coupleSoloText: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 8,
    maxWidth: 330,
    textAlign: "center",
  },
  coupleSoloCode: {
    color: "rgba(255,255,255,0.84)",
    fontSize: 13,
    fontWeight: "900",
    marginTop: 12,
    textAlign: "center",
  },
  coupleSection: {
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 0,
    borderWidth: 0,
    gap: 9,
    paddingHorizontal: 0,
    paddingVertical: 0,
    width: "100%",
  },
  coupleSectionHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  coupleSectionTitle: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
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
    gap: 8,
    width: "100%",
  },
  coupleRecentMatch: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 16,
    flexDirection: "row",
    gap: 8,
    minHeight: 43,
    paddingHorizontal: 13,
    paddingVertical: 9,
    width: "100%",
  },
  coupleRecentEmojiBubble: {
    alignItems: "center",
    borderColor: "rgba(245,40,110,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    height: 28,
    justifyContent: "center",
    overflow: "hidden",
    width: 28,
  },
  coupleRecentEmoji: {
    fontFamily: emojiFont,
    fontSize: 17,
    lineHeight: 22,
    textAlign: "center",
  },
  coupleRecentCopy: {
    flex: 1,
    minWidth: 0,
  },
  coupleRecentTag: {
    alignSelf: "flex-start",
    backgroundColor: "transparent",
    borderRadius: 0,
    fontSize: 8,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 0,
    paddingVertical: 0,
    textTransform: "uppercase",
  },
  coupleRecentTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 0,
  },
  coupleRecentText: {
    color: candy.text,
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
  },
  coupleRecentOpenText: {
    color: candy.red,
    fontSize: 11,
    fontWeight: "900",
  },
  coupleEmptyMatches: {
    backgroundColor: "rgba(255,249,240,0.18)",
    borderColor: "rgba(255,249,240,0.38)",
    borderRadius: 18,
    borderStyle: "dashed",
    borderWidth: 1.5,
    minHeight: 82,
    justifyContent: "center",
    padding: 14,
    width: "100%",
  },
  coupleEmptyMatchesTitle: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 17,
    fontWeight: "900",
  },
  coupleEmptyMatchesText: {
    color: "rgba(255,249,240,0.72)",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
    marginTop: 3,
  },
  couplePackSummary: {
    alignItems: "center",
    backgroundColor: "rgba(255,102,158,0.62)",
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 15,
    paddingVertical: 12,
    width: "100%",
  },
  couplePackSummaryCopy: {
    flex: 1,
    minWidth: 0,
  },
  couplePackSummaryTitle: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 21,
  },
  couplePackSummaryText: {
    color: "rgba(255,249,240,0.78)",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
    marginTop: 1,
  },
  coupleBoutiqueButton: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 37,
    paddingHorizontal: 17,
  },
  coupleBoutiqueText: {
    color: candy.ink,
    fontSize: 12,
    fontWeight: "900",
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
  purchaseOverlay: {
    flex: 1,
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
  },
  purchaseBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.16)",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  purchaseContent: {
    alignItems: "center",
    alignSelf: "center",
    flex: 1,
    justifyContent: "center",
    maxWidth: 430,
    paddingBottom: 18,
    width: "100%",
  },
  purchaseHero: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 224,
  },
  purchasePackShadow: {
    backgroundColor: "rgba(87,8,58,0.28)",
    borderRadius: 34,
    height: 210,
    position: "absolute",
    transform: [{ rotate: "-4deg" }, { translateY: 8 }],
    width: 174,
  },
  purchasePackVisual: {
    borderColor: "rgba(255,249,240,0.34)",
    borderRadius: 34,
    borderWidth: 2,
    height: 210,
    justifyContent: "flex-end",
    overflow: "hidden",
    padding: 24,
    transform: [{ rotate: "-4deg" }],
    width: 174,
  },
  purchaseFeaturePatternLayer: {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
  },
  purchaseFeatureDot: {
    backgroundColor: "rgba(255,249,240,0.32)",
    borderRadius: 999,
    height: 10,
    position: "absolute",
    width: 10,
  },
  purchaseFeatureStripe: {
    backgroundColor: "rgba(255,249,240,0.18)",
    height: "160%",
    position: "absolute",
    top: "-30%",
    transform: [{ rotate: "42deg" }],
    width: 18,
  },
  purchaseFeatureEmoji: {
    fontFamily: emojiFont,
    fontSize: 58,
    left: 24,
    lineHeight: 68,
    position: "absolute",
    top: 24,
  },
  purchaseTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: 6,
    textAlign: "center",
  },
  purchaseText: {
    color: "rgba(255,249,240,0.88)",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 8,
    maxWidth: 392,
    textAlign: "center",
  },
  purchaseVisualCopy: {
    position: "relative",
    zIndex: 2,
  },
  purchaseVisualTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 24,
  },
  purchaseVisualMeta: {
    color: candy.ink,
    fontSize: 12,
    fontWeight: "900",
  },
  purchasePreviewRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 26,
  },
  purchasePreviewCard: {
    backgroundColor: candy.cream,
    borderRadius: 16,
    height: 106,
    overflow: "hidden",
    padding: 12,
    width: 82,
  },
  purchasePreviewCardLeft: {
    transform: [{ rotate: "-5deg" }],
  },
  purchasePreviewCardRight: {
    transform: [{ rotate: "5deg" }],
  },
  purchasePreviewTag: {
    color: candy.red,
    fontSize: 8,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  purchasePreviewLineWide: {
    backgroundColor: "rgba(38,18,46,0.24)",
    borderRadius: 999,
    height: 9,
    marginTop: 18,
    width: "86%",
  },
  purchasePreviewLine: {
    backgroundColor: "rgba(38,18,46,0.18)",
    borderRadius: 999,
    height: 9,
    marginTop: 7,
    width: "72%",
  },
  purchasePreviewLineShort: {
    backgroundColor: "rgba(38,18,46,0.14)",
    borderRadius: 999,
    height: 9,
    marginTop: 7,
    width: "58%",
  },
  purchaseFinePrint: {
    color: "rgba(255,249,240,0.82)",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 15,
    marginTop: 10,
    textAlign: "center",
  },
  purchaseBottomBar: {
    gap: 10,
  },
  purchasePrimary: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 62,
    paddingHorizontal: 18,
  },
  purchasePrimaryText: {
    color: candy.black,
    fontSize: 16,
    fontWeight: "900",
  },
  purchaseLegalText: {
    color: "rgba(255,249,240,0.82)",
    fontSize: 11,
    fontWeight: "900",
    textAlign: "center",
  },
  dailyLimitOverlay: {
    backgroundColor: candy.red,
    flex: 1,
    justifyContent: "space-between",
    overflow: "hidden",
    paddingHorizontal: 14,
  },
  dailyLimitGlow: {
    backgroundColor: "rgba(255,141,190,0.22)",
    borderRadius: 999,
    height: 340,
    left: "50%",
    marginLeft: -170,
    position: "absolute",
    top: 166,
    width: 340,
  },
  dailyLimitClose: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  dailyLimitContent: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 34,
  },
  dailyLimitBadge: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderRadius: 999,
    height: 152,
    justifyContent: "center",
    width: 152,
  },
  dailyLimitBadgeCount: {
    color: candy.black,
    fontFamily: displayFont,
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 45,
  },
  dailyLimitBadgeLabel: {
    color: candy.black,
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
    marginTop: 2,
    textTransform: "uppercase",
  },
  dailyLimitTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 35,
    fontWeight: "900",
    lineHeight: 38,
    marginTop: 38,
    textAlign: "center",
  },
  dailyLimitTitleDot: {
    color: candy.yellow,
  },
  dailyLimitText: {
    color: "rgba(255,249,240,0.92)",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 18,
    maxWidth: 310,
    textAlign: "center",
  },
  dailyLimitPartnerText: {
    color: "rgba(255,249,240,0.78)",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    marginTop: 18,
    maxWidth: 310,
    textAlign: "center",
  },
  dailyLimitActions: {
    gap: 12,
    paddingBottom: 2,
  },
  dailyLimitPrimary: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 58,
    paddingHorizontal: 18,
  },
  dailyLimitPrimaryText: {
    color: candy.black,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
    textAlign: "center",
  },
  dailyLimitSecondary: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
  },
  dailyLimitSecondaryText: {
    color: candy.cream,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
    textDecorationLine: "underline",
  },
  purchaseSuccessScreen: {
    alignItems: "center",
    flex: 1,
    justifyContent: "space-between",
    overflow: "hidden",
    paddingHorizontal: 28,
    paddingTop: 18,
  },
  purchaseSuccessGlow: {
    backgroundColor: "rgba(178,32,94,0.18)",
    borderRadius: 999,
    height: 260,
    position: "absolute",
    top: 76,
    width: 260,
  },
  purchaseSuccessConfettiDot: {
    backgroundColor: candy.yellow,
    borderRadius: 999,
    height: 10,
    position: "absolute",
    width: 10,
  },
  purchaseSuccessConfettiDash: {
    backgroundColor: candy.cream,
    borderRadius: 999,
    height: 20,
    position: "absolute",
    width: 7,
  },
  purchaseSuccessConfettiOne: {
    left: 72,
    top: 102,
  },
  purchaseSuccessConfettiTwo: {
    right: 54,
    top: 150,
  },
  purchaseSuccessConfettiThree: {
    right: 74,
    top: 338,
  },
  purchaseSuccessConfettiFour: {
    left: 52,
    top: 272,
  },
  purchaseSuccessClose: {
    alignItems: "center",
    alignSelf: "flex-end",
    backgroundColor: "rgba(255,249,240,0.16)",
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52,
    zIndex: 5,
  },
  purchaseSuccessCenter: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingBottom: 26,
    width: "100%",
  },
  purchaseSuccessHero: {
    alignItems: "center",
    height: 324,
    justifyContent: "center",
    width: "100%",
  },
  purchaseSuccessUnlockGlow: {
    backgroundColor: "rgba(255,211,64,0.72)",
    borderRadius: 999,
    height: 252,
    position: "absolute",
    width: 252,
  },
  purchaseSuccessUnlockStage: {
    overflow: "visible",
    position: "relative",
  },
  purchaseSuccessPackShadow: {
    backgroundColor: "rgba(178,32,94,0.62)",
    borderRadius: 35,
    height: 266,
    position: "absolute",
    transform: [{ rotate: "4deg" }, { translateY: 12 }],
    width: 226,
  },
  purchaseSuccessTitle: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 38,
    fontWeight: "900",
    lineHeight: 40,
    textAlign: "center",
  },
  purchaseSuccessText: {
    color: "rgba(255,249,240,0.9)",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 14,
    maxWidth: 336,
    textAlign: "center",
  },
  purchaseSuccessPackVisual: {
    borderRadius: 34,
    height: 266,
    justifyContent: "flex-end",
    overflow: "hidden",
    padding: 26,
    width: 226,
  },
  purchaseSuccessUnlockBadge: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderColor: candy.yellow,
    borderRadius: 999,
    borderWidth: 4,
    boxShadow: "0 12px 24px rgba(38,18,46,0.22)",
    height: 72,
    justifyContent: "center",
    position: "absolute",
    right: -24,
    top: -22,
    width: 72,
    zIndex: 4,
  },
  purchaseSuccessUnlockParticleLayer: {
    bottom: -48,
    left: -56,
    overflow: "visible",
    position: "absolute",
    right: -56,
    top: -48,
    zIndex: 5,
  },
  purchaseSuccessUnlockParticle: {
    position: "absolute",
  },
  purchaseSuccessVisualCopy: {
    position: "relative",
    zIndex: 2,
  },
  purchaseSuccessVisualTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 28,
  },
  purchaseSuccessVisualTitleLight: {
    color: candy.cream,
  },
  purchaseSuccessVisualMeta: {
    color: candy.ink,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
  },
  purchaseSuccessVisualMetaLight: {
    color: "rgba(255,249,240,0.86)",
  },
  purchaseSuccessCopy: {
    alignItems: "center",
    marginTop: -6,
  },
  purchaseSuccessCTA: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 999,
    flexDirection: "row",
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 18,
    width: "100%",
  },
  purchaseSuccessCTAText: {
    color: candy.black,
    fontFamily: displayFont,
    fontSize: 18,
    fontWeight: "900",
  },
  purchaseSuccessBottom: {
    alignItems: "center",
    gap: 12,
    paddingBottom: 10,
    width: "100%",
  },
  purchaseSuccessLegal: {
    color: "rgba(255,249,240,0.72)",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    textAlign: "center",
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
    backgroundColor: "rgba(245,40,110,0.5)",
    bottom: -64,
    height: 154,
    left: -38,
    width: 210,
  },
  moodEmberPoolRight: {
    backgroundColor: "rgba(255,210,63,0.28)",
    bottom: -72,
    height: 172,
    right: -54,
    width: 230,
  },
  moodHeatRim: {
    borderColor: "rgba(255,210,63,0.52)",
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
    alignItems: "center",
    alignSelf: "center",
    flexGrow: 1,
    gap: 10,
    width: "100%",
  },
  profileHeader: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 14,
    width: "100%",
  },
  profileBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.16)",
    borderRadius: 999,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
  profileHeaderTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 44,
    fontWeight: "900",
    lineHeight: 48,
  },
  profileMainArea: {
    alignSelf: "center",
    gap: 17,
    width: "100%",
  },
  statusEditorPanel: {
    backgroundColor: candy.cream,
    borderColor: "rgba(43,23,53,0.08)",
    borderRadius: 30,
    borderWidth: 1,
    gap: 16,
    padding: 20,
    shadowColor: "rgba(38,18,46,0.1)",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
  },
  statusEditorHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 16,
  },
  statusEditorPreview: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderColor: candy.yellow,
    borderRadius: 26,
    borderWidth: 2,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  statusEditorPreviewEmoji: {
    fontFamily: emojiFont,
    fontSize: 37,
    lineHeight: 44,
  },
  statusEditorCopy: {
    flex: 1,
    minWidth: 0,
  },
  statusEditorNameLabel: {
    color: candy.red,
    fontFamily: labelFont,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  statusNameInputBox: {
    backgroundColor: candy.white,
    borderColor: "rgba(43,23,53,0.12)",
    borderRadius: 18,
    borderWidth: 1.5,
    justifyContent: "center",
    marginTop: 5,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  statusNameInput: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 28,
    minHeight: 34,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  statusEditorText: {
    color: candy.muted,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 4,
  },
  statusPresetGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 8,
  },
  statusPresetButton: {
    alignItems: "center",
    backgroundColor: "rgba(245,40,110,0.08)",
    borderColor: "transparent",
    borderRadius: 18,
    borderWidth: 2,
    flex: 1,
    height: 54,
    justifyContent: "center",
    minWidth: 0,
  },
  statusPresetButtonActive: {
    backgroundColor: candy.yellow,
    borderColor: candy.red,
  },
  statusPresetEmoji: {
    fontFamily: emojiFont,
    fontSize: 29,
    lineHeight: 36,
  },
  statusCustomRow: {
    alignItems: "stretch",
  },
  statusCustomInputBox: {
    alignSelf: "stretch",
    backgroundColor: candy.white,
    borderColor: "rgba(43,23,53,0.12)",
    borderRadius: 22,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 64,
    paddingHorizontal: 18,
    paddingVertical: 5,
  },
  statusCustomInput: {
    color: candy.ink,
    fontFamily: emojiFont,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 40,
    minHeight: 42,
    paddingHorizontal: 0,
    paddingVertical: 0,
    textAlign: "center",
  },
  profileSettingsSection: {
    gap: 9,
  },
  profileSectionTitle: {
    color: "rgba(255,249,240,0.72)",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1.8,
    paddingHorizontal: 18,
    textTransform: "uppercase",
  },
  profileNotificationList: {
    backgroundColor: candy.cream,
    borderColor: "rgba(43,23,53,0.08)",
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileNotificationPanel: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderBottomColor: "rgba(43,23,53,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 13,
    minHeight: 68,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  profileNotificationIcon: {
    alignItems: "center",
    backgroundColor: "rgba(245,40,110,0.08)",
    borderRadius: 17,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  profileNotificationEmoji: {
    fontFamily: emojiFont,
    fontSize: 24,
    lineHeight: 30,
  },
  profileNotificationIconOn: {
    backgroundColor: candy.yellow,
  },
  profileNotificationCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileNotificationTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 23,
  },
  profileNotificationToggle: {
    alignItems: "center",
    backgroundColor: "rgba(43,23,53,0.08)",
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 0,
    justifyContent: "center",
    minHeight: 38,
    minWidth: 100,
    paddingHorizontal: 14,
  },
  profileNotificationToggleOn: {
    backgroundColor: candy.red,
  },
  profileNotificationToggleText: {
    color: candy.muted,
    fontSize: 12,
    fontWeight: "900",
  },
  profileNotificationToggleTextOn: {
    color: candy.white,
  },
  profileUtilityGrid: {
    backgroundColor: candy.cream,
    borderColor: "rgba(43,23,53,0.08)",
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
  },
  profileAction: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderBottomColor: "rgba(43,23,53,0.08)",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 13,
    justifyContent: "space-between",
    minHeight: 68,
    paddingHorizontal: 20,
  },
  profileActionText: {
    color: candy.ink,
    flex: 1,
    flexShrink: 1,
    fontSize: 17,
    fontWeight: "900",
  },
  profileActionDanger: {
    backgroundColor: candy.roseDeep,
    borderBottomColor: "rgba(255,249,240,0.14)",
  },
  profileActionDangerText: {
    color: candy.white,
  },
  profileActionDangerSolid: {
    backgroundColor: candy.red,
    borderBottomColor: "rgba(255,249,240,0.14)",
  },
  profileActionDangerSolidText: {
    color: candy.white,
  },
  profileActionDark: {
    backgroundColor: candy.darkColor,
    borderBottomColor: "rgba(255,249,240,0.14)",
  },
  profileActionDarkText: {
    color: candy.white,
  },
  aboutPanel: {
    backgroundColor: "rgba(173,13,78,0.62)",
    borderColor: "rgba(255,249,240,0.1)",
    borderRadius: 30,
    borderWidth: 1,
    padding: 20,
  },
  aboutEyebrow: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,249,240,0.18)",
    borderRadius: 999,
    color: candy.yellow,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 11,
    paddingVertical: 5,
    textTransform: "uppercase",
  },
  aboutTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 29,
    fontWeight: "900",
    marginTop: 8,
  },
  aboutText: {
    color: "rgba(255,249,240,0.76)",
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    marginTop: 8,
  },
  aboutMeta: {
    color: "rgba(255,249,240,0.78)",
    fontSize: 12,
    fontWeight: "900",
    marginTop: 12,
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
    paddingTop: APP_HEADER_TOP_SPACE,
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
    backgroundColor: "rgba(255,249,240,0.72)",
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
  debugPurchasePanel: {
    gap: 12,
  },
  debugPurchaseAll: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderColor: "rgba(255,255,255,0.78)",
    borderRadius: 24,
    borderWidth: 2,
    flexDirection: "row",
    gap: 12,
    minHeight: 78,
    padding: 13,
  },
  debugPurchaseAllDone: {
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  debugPurchaseAllIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  debugPurchaseAllTitle: {
    color: candy.black,
    fontFamily: displayFont,
    fontSize: 20,
    fontWeight: "900",
  },
  debugPurchaseAllText: {
    color: "rgba(35,18,36,0.78)",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
    marginTop: 2,
  },
  debugPurchaseAllCta: {
    backgroundColor: candy.black,
    borderRadius: 999,
    color: candy.white,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  debugPurchaseGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  debugPurchaseCard: {
    backgroundColor: "rgba(255,255,255,0.82)",
    borderColor: "rgba(255,255,255,0.88)",
    borderRadius: 20,
    borderWidth: 2,
    flexBasis: "47%",
    flexGrow: 1,
    gap: 8,
    minHeight: 116,
    padding: 12,
  },
  debugPurchaseCardDone: {
    backgroundColor: "rgba(255,225,241,0.72)",
    borderColor: "rgba(255,255,255,0.54)",
  },
  debugPurchaseDot: {
    borderColor: "rgba(255,255,255,0.84)",
    borderRadius: 999,
    borderWidth: 2,
    height: 24,
    width: 24,
  },
  debugPurchaseCopy: {
    flex: 1,
    gap: 2,
  },
  debugPurchaseTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
  },
  debugPurchaseText: {
    color: candy.text,
    fontSize: 11,
    fontWeight: "900",
  },
  debugPurchaseStatus: {
    alignSelf: "flex-start",
    backgroundColor: candy.black,
    borderRadius: 999,
    color: candy.white,
    fontSize: 10,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  debugPurchaseStatusDone: {
    backgroundColor: candy.cream,
    color: candy.red,
  },
  debugPurchaseFeatureList: {
    gap: 9,
  },
  debugPurchaseFeature: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 20,
    borderWidth: 2,
    flexDirection: "row",
    gap: 11,
    minHeight: 68,
    padding: 11,
  },
  debugPurchaseFeatureDone: {
    backgroundColor: "rgba(255,255,255,0.84)",
  },
  debugPurchaseFeatureIcon: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 15,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  debugPurchaseFeatureIconDone: {
    backgroundColor: candy.yellow,
  },
  debugPurchaseFeatureTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 16,
    fontWeight: "900",
  },
  debugPurchaseFeatureTitleDone: {
    color: candy.ink,
  },
  debugPurchaseFeatureText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
    marginTop: 1,
  },
  debugPurchaseFeatureTextDone: {
    color: candy.text,
  },
  debugPurchaseFeaturePrice: {
    backgroundColor: candy.yellow,
    borderRadius: 999,
    color: candy.black,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
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
    gap: 18,
    justifyContent: "space-between",
    minHeight: "100%",
    padding: 26,
    paddingBottom: 24,
    paddingTop: 30,
  },
  inviteHero: {
    flex: 1,
    minHeight: 626,
    overflow: "visible",
    paddingTop: 8,
  },
  inviteTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  inviteTopLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  inviteBrandPill: {
    alignSelf: "center",
  },
  inviteText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    marginTop: 16,
    maxWidth: "90%",
  },
  inviteTicket: {
    backgroundColor: candy.cream,
    borderColor: "rgba(255,249,240,0.92)",
    borderRadius: 28,
    borderWidth: 2,
    marginTop: 40,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 28,
  },
  inviteTicketLabel: {
    alignSelf: "center",
    color: candy.muted,
    fontFamily: displayFont,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 2,
    textAlign: "center",
    textTransform: "uppercase",
  },
  inviteTicketCode: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 42,
    fontWeight: "900",
    letterSpacing: 6,
    lineHeight: 54,
    marginTop: 8,
    textAlign: "center",
  },
  inviteTicketActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    marginTop: 18,
  },
  inviteTicketActionButton: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderColor: candy.ink,
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    minHeight: 44,
    minWidth: 98,
    paddingHorizontal: 14,
  },
  inviteTicketActionButtonHot: {
    backgroundColor: candy.red,
    borderColor: candy.red,
  },
  inviteTicketActionText: {
    color: candy.ink,
    fontSize: 14,
    fontWeight: "900",
  },
  inviteTicketActionTextHot: {
    color: candy.white,
    fontSize: 14,
    fontWeight: "900",
  },
  inviteWaitingCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.14)",
    borderRadius: 22,
    flexDirection: "row",
    gap: 8,
    marginTop: 26,
    minHeight: 68,
    paddingHorizontal: 18,
  },
  inviteWaitingAvatar: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  inviteWaitingAvatarText: {
    fontFamily: emojiFont,
    fontSize: 22,
    lineHeight: 28,
  },
  inviteWaitingGhost: {
    alignItems: "center",
    borderColor: "rgba(255,249,240,0.78)",
    borderRadius: 999,
    borderStyle: "dashed",
    borderWidth: 2,
    height: 38,
    justifyContent: "center",
    marginLeft: -16,
    width: 38,
  },
  inviteWaitingGhostText: {
    color: candy.white,
    fontSize: 18,
    fontWeight: "900",
  },
  inviteWaitingText: {
    color: candy.white,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  inviteBottomActions: {
    gap: 10,
  },
  invitePrimaryButton: {
    minHeight: 58,
  },
  inviteTertiaryButton: {
    backgroundColor: "rgba(255,249,240,0.16)",
    borderColor: "rgba(255,249,240,0.86)",
    borderWidth: 2,
  },
  inviteTertiaryButtonText: {
    color: candy.white,
  },
  joinScreen: {
    flexGrow: 1,
    justifyContent: "space-between",
    minHeight: "100%",
    overflow: "visible",
    paddingBottom: 13,
    paddingHorizontal: 21,
    paddingTop: 16,
  },
  joinContent: {
    gap: 26,
  },
  joinTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 44,
  },
  joinTopLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  joinCodePressable: {
    minHeight: 68,
  },
  joinCodeSlots: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  joinCodeCell: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderColor: candy.cream,
    borderRadius: 13,
    borderWidth: 2,
    height: 60,
    justifyContent: "center",
    width: 46,
  },
  joinCodeCellActive: {
    borderColor: candy.yellow,
  },
  joinCodeCellText: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 30,
  },
  joinHiddenInput: {
    height: 1,
    opacity: 0,
    position: "absolute",
    width: 1,
  },
  joinHelpText: {
    alignSelf: "center",
    color: "rgba(255,249,240,0.68)",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
    maxWidth: 286,
    textAlign: "center",
  },
  joinBottomArea: {
    gap: 18,
  },
  joinLockPill: {
    alignItems: "center",
    backgroundColor: "rgba(38,18,46,0.42)",
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  joinLockIcon: {
    alignItems: "center",
    backgroundColor: candy.yellow,
    borderRadius: 13,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  joinLockText: {
    color: candy.white,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  joinErrorText: {
    color: candy.cream,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  joinPrimaryButton: {
    minHeight: 58,
  },
  leaveScreen: {
    backgroundColor: candy.darkColor,
    flex: 1,
    overflow: "hidden",
  },
  leaveScrollContent: {
    alignItems: "center",
    flexGrow: 1,
  },
  leaveInner: {
    alignSelf: "center",
    flexGrow: 1,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  leaveTopBar: {
    alignSelf: "stretch",
    left: 0,
    position: "absolute",
    top: 0,
    zIndex: 2,
  },
  leaveBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,244,232,0.12)",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  leaveContentStage: {
    flexGrow: 1,
    justifyContent: "center",
    width: "100%",
  },
  leaveCopyBlock: {
    marginTop: 0,
  },
  leaveEmoji: {
    alignSelf: "center",
    fontFamily: emojiFont,
    fontSize: 58,
    lineHeight: 66,
    marginBottom: 18,
    textAlign: "center",
  },
  leaveTitle: {
    color: candy.cream,
    fontFamily: displayFont,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
    maxWidth: 340,
  },
  leaveText: {
    color: "rgba(255,244,232,0.73)",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 19,
    marginTop: 14,
    maxWidth: 350,
  },
  leaveChecklist: {
    gap: 9,
    marginTop: 18,
  },
  leaveChecklistRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,244,232,0.10)",
    borderRadius: 15,
    flexDirection: "row",
    gap: 12,
    minHeight: 40,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: "100%",
  },
  leaveChecklistDot: {
    backgroundColor: candy.red,
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  leaveChecklistText: {
    color: candy.cream,
    flex: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
  },
  leaveReassurance: {
    backgroundColor: "rgba(245,40,110,0.14)",
    borderColor: "rgba(245,40,110,0.26)",
    borderRadius: 15,
    borderWidth: 1.5,
    width: "100%",
  },
  leaveReassuranceText: {
    color: "rgba(255,244,232,0.82)",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
    textAlign: "center",
  },
  leaveConfirmBlock: {
    marginTop: 20,
  },
  leaveConfirmInput: {
    backgroundColor: "rgba(255,244,232,0.10)",
    borderColor: "rgba(255,244,232,0.22)",
    borderRadius: 17,
    borderWidth: 1.5,
    color: candy.cream,
    fontFamily: labelFont,
    fontSize: 14,
    fontWeight: "900",
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  leaveConfirmInputValid: {
    borderColor: candy.red,
    boxShadow: "0 0 0 1px rgba(245,40,110,0.22)",
  },
  leaveActions: {
    alignItems: "center",
    gap: 11,
    width: "100%",
  },
  leavePrimaryButton: {
    alignItems: "center",
    backgroundColor: candy.red,
    borderRadius: 20,
    justifyContent: "center",
    minHeight: 64,
    width: "100%",
  },
  leavePrimaryButtonDisabled: {
    opacity: 0.45,
  },
  leavePrimaryText: {
    color: candy.cream,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 20,
    textAlign: "center",
  },
  leaveCancelButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
  },
  leaveCancelText: {
    color: "rgba(255,244,232,0.62)",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  welcomeScreen: {
    alignItems: "center",
    flexGrow: 1,
    gap: 0,
    justifyContent: "flex-start",
    minHeight: "100%",
    overflow: "visible",
    paddingBottom: 13,
    paddingHorizontal: 21,
    paddingTop: 16,
  },
  welcomeScreenCompact: {
    paddingBottom: 12,
    paddingHorizontal: 18,
    paddingTop: 12,
  },
  welcomeFrame: {
    flex: 1,
  },
  welcomeScroll: {
    flex: 1,
    width: "100%",
  },
  welcomeBackdropCircleLarge: {
    backgroundColor: "rgba(255,249,240,0.08)",
    borderRadius: 999,
    height: 256,
    position: "absolute",
    right: -84,
    top: 45,
    width: 256,
  },
  welcomeBackdropCircleSmall: {
    backgroundColor: "rgba(255,249,240,0.07)",
    borderRadius: 999,
    bottom: 140,
    height: 180,
    left: -138,
    position: "absolute",
    width: 180,
  },
  welcomeTopBar: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 0,
    minHeight: 34,
    width: "100%",
  },
  welcomeTopBarCompact: {
    marginTop: 0,
    minHeight: 36,
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
  welcomeSlide: {
    alignSelf: "center",
    flexGrow: 1,
    justifyContent: "flex-start",
    marginTop: 28,
    minHeight: 0,
    width: "100%",
  },
  welcomeSlideCompact: {
    marginTop: 24,
  },
  welcomeSlideIntro: {
    marginTop: 53,
  },
  welcomeSlideCard: {
    alignItems: "stretch",
    alignSelf: "stretch",
    flex: 1,
    justifyContent: "flex-start",
    minHeight: 0,
    overflow: "visible",
    width: "100%",
  },
  welcomeEyebrow: {
    alignSelf: "flex-start",
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 10,
    textAlign: "left",
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
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 36,
    marginTop: 0,
    maxWidth: 340,
    textAlign: "left",
  },
  welcomeTitleCompact: {
    fontSize: 35,
    lineHeight: 39,
  },
  welcomeTitleIntro: {
    fontSize: 39,
    lineHeight: 45,
  },
  welcomeTitleBlock: {
    alignSelf: "flex-start",
    maxWidth: 340,
  },
  welcomeTitleBlockCompact: {
    maxWidth: 320,
  },
  welcomeTitleDot: {
    color: candy.yellow,
  },
  welcomeText: {
    color: candy.white,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 10,
    maxWidth: 340,
    textAlign: "left",
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
  welcomeDemoCenter: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 0,
    width: "100%",
  },
  welcomeDemoFrame: {
    alignSelf: "center",
    marginTop: 12,
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
    backgroundColor: "transparent",
    flex: 1,
    justifyContent: "center",
    overflow: "visible",
  },
  welcomeDemoCardHot: {
    shadowColor: "rgba(255, 30, 112, 0.36)",
    shadowRadius: 22,
  },
  welcomeDemoVotedPlaceholder: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.24)",
    borderColor: candy.white,
    borderRadius: 26,
    borderStyle: "dotted",
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
  welcomeVoteRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  welcomeVotePill: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderColor: candy.cream,
    borderRadius: 20,
    borderWidth: 2,
    flex: 1,
    height: 46,
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
  welcomeVotePillYellow: {
    backgroundColor: candy.yellow,
    borderColor: candy.yellow,
  },
  welcomeVotePillSelectedYellow: {
    backgroundColor: candy.yellow,
    borderColor: candy.cream,
  },
  welcomeVoteFire: {
    backgroundColor: candy.black,
    borderColor: candy.black,
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
  welcomeVoteTextDark: {
    color: candy.ink,
  },
  welcomeVoteTextSelectedDark: {
    color: candy.ink,
  },
  welcomeVoteFireText: {
    color: candy.white,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  welcomeDemoFeedback: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.16)",
    borderRadius: 16,
    flexDirection: "row",
    minHeight: 52,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingLeft: 46,
    paddingVertical: 9,
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
    color: candy.white,
    flex: 1,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 16,
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
  welcomeCTA: {
    alignSelf: "center",
    flex: 1,
    minHeight: 57,
    width: "100%",
  },
  welcomeCTACompact: {
    minHeight: 54,
  },
  welcomeNav: {
    alignSelf: "center",
    flexDirection: "row",
    gap: 12,
    marginTop: 0,
    width: "100%",
  },
  welcomeNavDemo: {
    marginTop: 14,
  },
  welcomeNavCompact: {
    gap: 10,
  },
  welcomeSecondaryCTA: {
    flex: 0.8,
    minHeight: 56,
  },
  welcomeSecondaryCTACompact: {
    minHeight: 54,
  },
  welcomeNavDisabled: {
    opacity: 0.42,
  },
  welcomeSkipButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: 6,
  },
  welcomeSkipText: {
    color: "rgba(255,249,240,0.78)",
    fontFamily: labelFont,
    fontSize: 13,
    fontWeight: "900",
  },
  welcomeSkipSpacer: {
    width: 58,
  },
  welcomeRuleList: {
    alignSelf: "center",
    gap: 12,
    marginTop: 32,
    width: "100%",
  },
  welcomeRuleListCompact: {
    marginTop: 26,
  },
  welcomeRuleRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.14)",
    borderRadius: 17,
    flexDirection: "row",
    gap: 14,
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  welcomeRuleNumber: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 999,
    height: 31,
    justifyContent: "center",
    width: 31,
  },
  welcomeRuleNumberYellow: {
    backgroundColor: candy.yellow,
  },
  welcomeRuleNumberDark: {
    backgroundColor: candy.black,
  },
  welcomeRuleNumberText: {
    color: candy.red,
    fontFamily: labelFont,
    fontSize: 14,
    fontWeight: "900",
  },
  welcomeRuleNumberTextDark: {
    color: candy.ink,
  },
  welcomeRuleNumberTextLight: {
    color: candy.white,
  },
  welcomeRuleText: {
    color: candy.white,
    flex: 1,
    fontFamily: labelFont,
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 17,
  },
  welcomeRuleTextCompact: {
    fontSize: 12,
    lineHeight: 15,
  },
  welcomeDotRow: {
    alignItems: "center",
    alignSelf: "center",
    flexDirection: "row",
    gap: 7,
    justifyContent: "center",
    marginBottom: 22,
    marginTop: 18,
  },
  welcomeDotRowIntro: {
    marginTop: "auto",
  },
  welcomeDotRowSimple: {
    marginTop: "auto",
  },
  welcomeDot: {
    backgroundColor: "rgba(255,249,240,0.35)",
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  welcomeDotActive: {
    backgroundColor: candy.cream,
    width: 22,
  },
  welcomeFooterText: {
    color: "rgba(255,249,240,0.62)",
    fontFamily: labelFont,
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    marginTop: 10,
    textAlign: "center",
  },
  mockBrandPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: candy.cream,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 18,
  },
  mockBrandText: {
    color: candy.red,
    fontFamily: displayFont,
    fontSize: 15,
    fontWeight: "900",
  },
  onboardingBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.14)",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  onboardingStepPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.16)",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 30,
    minWidth: 58,
    paddingHorizontal: 12,
  },
  onboardingStepPillText: {
    color: candy.white,
    fontFamily: labelFont,
    fontSize: 14,
    fontWeight: "900",
  },
});
