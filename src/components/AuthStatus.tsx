import { Apple, LockKeyhole, Search, User } from "lucide-react-native";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { AuthProvider } from "../lib/auth";
import { WsButton } from "../ui/primitives";
import { displayFont, labelFont, wsColors as candy } from "../ui/tokens";

export type AuthAccountInfo = {
  connected: boolean;
  displayName: string;
  email: string;
  providerLabel: string;
};

export function authAccountInfo(session: unknown): AuthAccountInfo {
  const authSession = session as {
    user?: {
      app_metadata?: Record<string, unknown>;
      email?: string | null;
      identities?: Array<{ provider?: unknown }> | null;
      user_metadata?: Record<string, unknown>;
    };
  } | null;
  const user = authSession?.user;
  const appMetadata = user?.app_metadata;
  const identities = user?.identities ?? undefined;
  const appProvider = appMetadata?.provider;
  const identityProvider = identities?.[0]?.provider;
  const provider = typeof appProvider === "string" && appProvider.trim()
    ? appProvider
    : typeof identityProvider === "string"
      ? identityProvider
      : "";
  const providerKey = provider.toLowerCase();
  const email = user?.email ?? "";
  const metadata = user?.user_metadata;
  const candidates = [metadata?.full_name, metadata?.name, email.split("@")[0]];
  const name = candidates.find((value) => typeof value === "string" && value.trim());
  const displayName = typeof name === "string" ? name.trim() : "Compte connecté";
  let providerLabel = authSession ? "Compte" : "Mode test";

  if (providerKey.includes("google")) {
    providerLabel = "Google";
  }

  if (providerKey.includes("apple")) {
    providerLabel = "Apple";
  }

  return {
    connected: Boolean(authSession),
    displayName,
    email,
    providerLabel,
  };
}

export function SessionStatusPill({
  account,
  guestMode,
}: {
  account: AuthAccountInfo;
  guestMode: boolean;
}) {
  if (!account.connected && !guestMode) {
    return null;
  }

  const title = account.connected ? `Connecté avec ${account.providerLabel}` : "Mode test local";
  const subtitle = account.connected
    ? account.email || account.displayName
    : "Données uniquement sur cet appareil";

  return (
    <View style={[styles.sessionStatusPill, account.connected && styles.sessionStatusPillConnected]}>
      <View style={[styles.sessionStatusIcon, account.connected && styles.sessionStatusIconConnected]}>
        {account.connected ? <User size={15} color={candy.white} /> : <LockKeyhole size={15} color={candy.red} />}
      </View>
      <View style={styles.sessionStatusCopy}>
        <Text numberOfLines={1} style={styles.sessionStatusTitle}>{title}</Text>
        <Text numberOfLines={1} selectable style={styles.sessionStatusSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

export function ProfileAccountPanel({
  account,
  authError,
  providerLoading,
  onProvider,
}: {
  account: AuthAccountInfo;
  authError: string;
  providerLoading: AuthProvider | null;
  onProvider: (provider: AuthProvider) => void;
}) {
  return (
    <View style={styles.accountPanel}>
      <View style={styles.accountHeader}>
        <View style={[styles.accountIcon, account.connected && styles.accountIconConnected]}>
          {account.connected ? <User size={22} color={candy.white} /> : <LockKeyhole size={22} color={candy.red} />}
        </View>
        <View style={styles.accountCopy}>
          <Text style={styles.accountTitle}>
            {account.connected ? `Connecté avec ${account.providerLabel}` : "Pas connecté"}
          </Text>
          <Text numberOfLines={2} style={styles.accountText}>
            {account.connected
              ? "Ce compte sert à retrouver ton espace et sécuriser les achats."
              : "Le mode test reste sur cet appareil. Connecte-toi pour retrouver ton espace plus tard."}
          </Text>
        </View>
      </View>

      {account.connected ? (
        <>
          <View style={styles.accountDetailGrid}>
            <AccountDetail label="Nom" value={account.displayName} />
            <AccountDetail label="Email" selectable value={account.email || "Non fourni"} />
          </View>
        </>
      ) : (
        <View style={styles.accountProviderActions}>
          <ProviderButton
            disabled={providerLoading !== null}
            icon={<Search size={18} color={candy.white} />}
            label={providerLoading === "google" ? "Connexion..." : "Se connecter avec Google"}
            onPress={() => onProvider("google")}
          />
          <ProviderButton
            disabled={providerLoading !== null}
            icon={<Apple size={18} color={candy.white} />}
            label={providerLoading === "apple" ? "Connexion..." : "Se connecter avec Apple"}
            onPress={() => onProvider("apple")}
          />
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
        </View>
      )}
    </View>
  );
}

function AccountDetail({
  label,
  selectable = false,
  value,
}: {
  label: string;
  selectable?: boolean;
  value: string;
}) {
  return (
    <View style={styles.accountDetailCell}>
      <Text style={styles.accountLabel}>{label}</Text>
      <Text numberOfLines={1} selectable={selectable} style={styles.accountValue}>{value}</Text>
    </View>
  );
}

function ProviderButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <WsButton disabled={disabled} label={label} left={icon} onPress={onPress} size="md" variant="hot" />
  );
}

const styles = StyleSheet.create({
  accountPanel: {
    backgroundColor: candy.cream,
    borderColor: "rgba(43,23,53,0.08)",
    borderRadius: 30,
    borderWidth: 1,
    gap: 14,
    padding: 20,
    width: "100%",
  },
  accountHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  accountIcon: {
    alignItems: "center",
    backgroundColor: "rgba(245,40,110,0.08)",
    borderColor: "transparent",
    borderRadius: 22,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  accountIconConnected: {
    backgroundColor: candy.darkColor,
  },
  accountCopy: {
    flex: 1,
    minWidth: 0,
  },
  accountTitle: {
    color: candy.ink,
    fontFamily: displayFont,
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 27,
  },
  accountText: {
    color: candy.text,
    fontFamily: labelFont,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
    marginTop: 4,
  },
  accountDetailGrid: {
    borderTopColor: "rgba(43,23,53,0.08)",
    borderTopWidth: 1,
    marginTop: 4,
  },
  accountDetailCell: {
    borderBottomColor: "rgba(43,23,53,0.08)",
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  accountLabel: {
    color: candy.red,
    fontFamily: labelFont,
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  accountValue: {
    color: candy.ink,
    fontFamily: labelFont,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 4,
  },
  accountProviderActions: {
    gap: 12,
  },
  errorText: {
    color: candy.red,
    fontFamily: labelFont,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  sessionStatusPill: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "rgba(255,249,240,0.82)",
    borderColor: candy.white,
    borderRadius: 999,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    maxWidth: 420,
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 7,
    width: "100%",
  },
  sessionStatusPillConnected: {
    backgroundColor: "rgba(255,249,240,0.9)",
  },
  sessionStatusIcon: {
    alignItems: "center",
    backgroundColor: candy.white,
    borderColor: "rgba(245,40,110,0.2)",
    borderRadius: 999,
    borderWidth: 1.5,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  sessionStatusIconConnected: {
    backgroundColor: candy.red,
    borderColor: candy.white,
  },
  sessionStatusCopy: {
    flex: 1,
    minWidth: 0,
  },
  sessionStatusTitle: {
    color: candy.ink,
    fontFamily: labelFont,
    fontSize: 12,
    fontWeight: "900",
  },
  sessionStatusSubtitle: {
    color: candy.text,
    fontFamily: labelFont,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 1,
  },
});
