import AsyncStorage from "@react-native-async-storage/async-storage";

import { CoupleState, DailyResponseUsage, NotificationSettings, PartnerId, PartnerProfile } from "../types";

const STORAGE_KEY = "cocoon-couple-state-v1";
const GUEST_KEY = "cocoon-guest-mode-v1";
const DEBUG_BACKUP_KEY = "cocoon-debug-backup-v1";
const INTRO_SEEN_KEY = "cocoon-intro-seen-v1";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function partnerFlags(value = false): Record<PartnerId, boolean> {
  return {
    me: value,
    partner: value,
  };
}

function createDailyResponses(
  overrides?: Partial<Record<PartnerId, DailyResponseUsage>>,
): Record<PartnerId, DailyResponseUsage> {
  return {
    me: {
      count: overrides?.me?.count ?? 0,
      dateKey: overrides?.me?.dateKey ?? "",
    },
    partner: {
      count: overrides?.partner?.count ?? 0,
      dateKey: overrides?.partner?.dateKey ?? "",
    },
  };
}

function createNotificationSettings(
  overrides?: Partial<NotificationSettings>,
): NotificationSettings {
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

function withProfileDefaults(profile: PartnerProfile, fallbackEmoji = "\u{1F496}"): PartnerProfile {
  return {
    ...profile,
    statusEmoji: profile.statusEmoji || fallbackEmoji,
    statusUpdatedAt: profile.statusUpdatedAt,
  };
}

function withCoupleDefaults(state: CoupleState): CoupleState {
  return {
    ...state,
    profiles: {
      me: withProfileDefaults(state.profiles.me),
      partner: withProfileDefaults(state.profiles.partner, "\u{1F48C}"),
    },
    mood: state.mood ?? {
      me: 0,
      partner: 0,
    },
    dailyResponses: createDailyResponses(state.dailyResponses),
    customDesires: state.customDesires ?? [],
    unlockedCategories: Array.from(new Set(["Vanille", "Perso", ...(state.unlockedCategories ?? [])])),
    unlockedFeatures: state.unlockedFeatures ?? [],
    notificationSettings: createNotificationSettings(state.notificationSettings),
    chat: state.chat ?? {
      messages: [],
    },
  };
}

function randomCode(length = 6) {
  let code = "";
  for (let index = 0; index < length; index += 1) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function createInitialCouple(profile: Omit<PartnerProfile, "id">): CoupleState {
  return {
    id: `local-${Date.now()}`,
    inviteCode: randomCode(),
    createdAt: new Date().toISOString(),
    activePartnerId: "me",
    profiles: {
      me: { id: "me", ...profile },
      partner: {
        id: "partner",
        displayName: "Partenaire",
        color: "mint",
        statusEmoji: "\u{1F48C}",
        vibe: "Invitation en attente",
      },
    },
    votes: {
      me: {},
      partner: {},
    },
    dailyResponses: createDailyResponses(),
    customDesires: [],
    unlockedCategories: ["Vanille", "Perso"],
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
}

export function createJoinedCouple(profile: Omit<PartnerProfile, "id">, inviteCode: string): CoupleState {
  return {
    id: `joined-${inviteCode.toUpperCase()}`,
    inviteCode: inviteCode.toUpperCase(),
    createdAt: new Date().toISOString(),
    activePartnerId: "partner",
    profiles: {
      me: {
        id: "me",
        displayName: "Partenaire déjà inscrit",
        color: "rose",
        statusEmoji: "\u{1F496}",
        vibe: "A cree l'espace",
      },
      partner: { id: "partner", ...profile },
    },
    votes: {
      me: {},
      partner: {},
    },
    dailyResponses: createDailyResponses(),
    customDesires: [],
    unlockedCategories: ["Vanille", "Perso"],
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
}

export async function loadCoupleState() {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  return raw ? withCoupleDefaults(JSON.parse(raw) as CoupleState) : null;
}

export async function saveCoupleState(state: CoupleState) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export async function clearCoupleState() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export async function loadDebugBackupState() {
  const raw = await AsyncStorage.getItem(DEBUG_BACKUP_KEY);
  return raw ? withCoupleDefaults(JSON.parse(raw) as CoupleState) : null;
}

export async function saveDebugBackupState(state: CoupleState) {
  await AsyncStorage.setItem(DEBUG_BACKUP_KEY, JSON.stringify(state));
}

export async function clearDebugBackupState() {
  await AsyncStorage.removeItem(DEBUG_BACKUP_KEY);
}

export async function loadGuestMode() {
  return (await AsyncStorage.getItem(GUEST_KEY)) === "true";
}

export async function saveGuestMode(enabled: boolean) {
  if (enabled) {
    await AsyncStorage.setItem(GUEST_KEY, "true");
    return;
  }

  await AsyncStorage.removeItem(GUEST_KEY);
}

export async function loadIntroSeen() {
  return (await AsyncStorage.getItem(INTRO_SEEN_KEY)) === "true";
}

export async function saveIntroSeen(seen: boolean) {
  if (seen) {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, "true");
    return;
  }

  await AsyncStorage.removeItem(INTRO_SEEN_KEY);
}
