export type PartnerId = "me" | "partner";

export type DesireCategory =
  | "Vanille"
  | "Sensuel"
  | "Séduction"
  | "Hot"
  | "Jeux & Défis"
  | "Scénarios"
  | "Kinky Soft"
  | "BDSM"
  | "Plaisirs explicites"
  | "Tabous"
  | "Perso";

export type DesireKind = "practice" | "discussion";

export type DesireMood = "calme" | "sensuel" | "aventureux";

export type VoteLevel = 0 | 1 | 2 | 3;

export type CoupleMoodLevel = 0 | 1 | 2 | 3;

export type UnlockedFeature = "custom_cards_unlimited" | "no_ads" | "unlimited_responses";

export type DailyResponseUsage = {
  count: number;
  dateKey: string;
};

export type NotificationSettings = {
  chatMessageEnabled: Record<PartnerId, boolean>;
  dailyReminderEnabled: Record<PartnerId, boolean>;
  matchRevealEnabled: Record<PartnerId, boolean>;
  moodSignalEnabled: Record<PartnerId, boolean>;
  moodSignalPromptSeen: Record<PartnerId, boolean>;
  promotionEnabled: Record<PartnerId, boolean>;
};

export type ChatAttachment = {
  id: string;
  type: "image";
  uri: string;
  name?: string;
  storagePath?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  sizeBytes?: number;
};

export type ChatMessage = {
  id: string;
  authorId: PartnerId;
  body: string;
  createdAt: string;
  expiresAt: string;
  attachments: ChatAttachment[];
  linkedCardId?: string;
};

export type DesireCard = {
  id: string;
  title: string;
  emoji?: string;
  category: DesireCategory;
  kind: DesireKind;
  mood: DesireMood;
  blurb: string;
  safety?: string;
};

export type CustomDesireCard = DesireCard & {
  custom: true;
  createdAt: string;
  createdBy: PartnerId;
};

export type PartnerProfile = {
  id: PartnerId;
  displayName: string;
  color: string;
  statusEmoji: string;
  statusUpdatedAt?: string;
  vibe: string;
};

export type CoupleState = {
  id: string;
  inviteCode: string;
  createdAt: string;
  profiles: Record<PartnerId, PartnerProfile>;
  votes: Record<PartnerId, Record<string, VoteLevel>>;
  dailyResponses: Record<PartnerId, DailyResponseUsage>;
  customDesires: CustomDesireCard[];
  unlockedCategories: DesireCategory[];
  unlockedFeatures: UnlockedFeature[];
  mood: Record<PartnerId, CoupleMoodLevel>;
  notificationSettings: NotificationSettings;
  chat: {
    messages: ChatMessage[];
    lastPurgedAt?: string;
  };
  activePartnerId: PartnerId;
};

export type OnboardingMode = "create" | "join";
