import { Apple } from "lucide-react-native";
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";

import type { AuthProvider } from "../../lib/auth";
import { WsButton } from "../../ui/primitives";
import { displayFont, labelFont, wsColors as candy } from "../../ui/tokens";

export function AuthGate({
  authError,
  providerLoading,
  onProvider,
}: {
  authError: string;
  providerLoading: AuthProvider | null;
  onProvider: (provider: AuthProvider) => void;
}) {
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const authScale = Math.min(1.45, Math.max(0.9, Math.min(viewportWidth / 390, viewportHeight / 844)));
  const horizontalPadding = 21 * authScale;
  const contentWidth = Math.max(0, viewportWidth - horizontalPadding * 2);
  const layout = {
    body: {
      fontSize: 15 * authScale,
      lineHeight: 21 * authScale,
      marginTop: 12 * authScale,
      maxWidth: Math.min(340 * authScale, contentWidth),
    },
    brandPill: {
      minHeight: 34 * authScale,
      paddingHorizontal: 18 * authScale,
    },
    brandText: {
      fontSize: 15 * authScale,
      lineHeight: 18 * authScale,
    },
    cta: {
      borderRadius: 22 * authScale,
      minHeight: 57 * authScale,
    },
    ctaText: {
      fontSize: 15 * authScale,
      lineHeight: 18 * authScale,
    },
    footer: {
      fontSize: 11 * authScale,
      lineHeight: 14 * authScale,
      marginTop: 10 * authScale,
    },
    halo: {
      height: 256 * authScale,
      right: -84 * authScale,
      top: 45 * authScale,
      width: 256 * authScale,
    },
    screen: {
      paddingBottom: 13 * authScale,
      paddingHorizontal: horizontalPadding,
      paddingTop: 16 * authScale,
    },
    smallHalo: {
      bottom: 140 * authScale,
      height: 180 * authScale,
      left: -138 * authScale,
      width: 180 * authScale,
    },
    title: {
      fontSize: 39 * authScale,
      lineHeight: 45 * authScale,
      marginTop: 53 * authScale,
      maxWidth: Math.min(340 * authScale, contentWidth),
    },
    topBar: {
      minHeight: 34 * authScale,
    },
  };

  return (
    <ScrollView contentContainerStyle={[styles.authScreen, layout.screen]} showsVerticalScrollIndicator={false}>
      <View pointerEvents="none" style={[styles.authBackdropCircleLarge, layout.halo]} />
      <View pointerEvents="none" style={[styles.authBackdropCircleSmall, layout.smallHalo]} />
      <View style={[styles.authTopBar, layout.topBar]}>
        <View style={[styles.mockBrandPill, layout.brandPill]}>
          <Text style={[styles.mockBrandText, layout.brandText]}>WeSpice</Text>
        </View>
      </View>

      <View style={styles.authHeroCopy}>
        <Text style={[styles.authTitle, layout.title]}>
          Connecte-toi pour garder ça entre vous deux<Text style={styles.authTitleDot}>.</Text>
        </Text>
        <Text style={[styles.authText, layout.body]}>
          Ton compte sécurise votre espace couple et synchronise vos envies, vos matchs et vos achats.
        </Text>
      </View>

      <View style={styles.authActions}>
        <WsButton
          busy={providerLoading === "apple"}
          disabled={providerLoading !== null}
          label={providerLoading === "apple" ? "Connexion..." : "Continuer avec Apple"}
          left={<Apple size={20} color={candy.white} />}
          onPress={() => onProvider("apple")}
          style={layout.cta}
          textStyle={layout.ctaText}
          variant="primary"
        />
        <WsButton
          busy={providerLoading === "google"}
          disabled={providerLoading !== null}
          label={providerLoading === "google" ? "Connexion..." : "Continuer avec Google"}
          left={(
            <View style={styles.authGoogleMark}>
              <Text style={styles.authGoogleMarkText}>G</Text>
            </View>
          )}
          onPress={() => onProvider("google")}
          style={layout.cta}
          textStyle={layout.ctaText}
          variant="secondary"
        />
        {providerLoading ? (
          <View style={styles.authSyncPill}>
            <ActivityIndicator color={candy.yellow} />
            <Text style={styles.authSyncPillText}>Connexion à {providerLoading === "google" ? "Google" : "Apple"} en cours...</Text>
          </View>
        ) : null}
        {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
      </View>

      <Text style={[styles.authLegal, layout.footer]}>18+ · Confidentialité · Conditions d'utilisation</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  authScreen: {
    flexGrow: 1,
    gap: 0,
    justifyContent: "space-between",
    minHeight: "100%",
    overflow: "visible",
    paddingBottom: 13,
    paddingHorizontal: 21,
    paddingTop: 16,
  },
  authBackdropCircleLarge: {
    backgroundColor: "rgba(255,249,240,0.08)",
    borderRadius: 999,
    height: 256,
    position: "absolute",
    right: -84,
    top: 45,
    width: 256,
  },
  authBackdropCircleSmall: {
    backgroundColor: "rgba(255,249,240,0.07)",
    borderRadius: 999,
    bottom: 140,
    height: 180,
    left: -138,
    position: "absolute",
    width: 180,
  },
  authTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 34,
    width: "100%",
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
  authHeroCopy: {
    width: "100%",
  },
  authTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 39,
    fontWeight: "900",
    lineHeight: 45,
    maxWidth: 340,
  },
  authTitleDot: {
    color: candy.yellow,
  },
  authText: {
    color: candy.white,
    fontFamily: labelFont,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 21,
    marginTop: 12,
    maxWidth: 340,
  },
  authActions: {
    gap: 12,
    marginTop: "auto",
    width: "100%",
  },
  authGoogleMark: {
    alignItems: "center",
    backgroundColor: candy.black,
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    width: 24,
  },
  authGoogleMarkText: {
    color: candy.yellow,
    fontFamily: labelFont,
    fontSize: 13,
    fontWeight: "900",
  },
  authSyncPill: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "rgba(38,18,46,0.42)",
    borderRadius: 18,
    flexDirection: "row",
    gap: 9,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  authSyncPillText: {
    color: candy.white,
    flex: 1,
    fontFamily: labelFont,
    fontSize: 13,
    fontWeight: "900",
  },
  authLegal: {
    color: "rgba(255,249,240,0.66)",
    fontFamily: labelFont,
    fontSize: 11,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center",
  },
  errorText: {
    color: candy.cream,
    fontFamily: labelFont,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
});
