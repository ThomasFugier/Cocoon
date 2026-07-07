import * as Haptics from "expo-haptics";
import { ArrowLeft } from "lucide-react-native";
import React, { useState } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

import type { OnboardingMode, PartnerProfile } from "../../types";
import { Entrance, SpringPressable, useEntrance } from "../../ui/motion";
import { WsButton, WsChoicePill, WsEmojiChoice, WsTextField } from "../../ui/primitives";
import { displayFont, labelFont, wsColors as candy } from "../../ui/tokens";

const avatarOptions = ["🍒", "🫧", "🔥", "😇", "🪩", "🖤"];
const vibeOptions = [
  { label: "Flirt", value: "Flirt" },
  { label: "Doux", value: "Doux" },
  { label: "Chaud", value: "Chaud" },
  { label: "Sage", value: "Sage mais curieux" },
  { label: "Théâtral", value: "Théâtral" },
  { label: "Mystère", value: "Mystère" },
];

export function OnboardingScreen({
  onBack,
  onComplete,
}: {
  onBack?: () => void;
  onComplete: (
    mode: OnboardingMode,
    profile: Omit<PartnerProfile, "id">,
    inviteCode: string,
  ) => Promise<void>;
}) {
  const [mode, setMode] = useState<OnboardingMode>("create");
  const [displayName, setDisplayName] = useState("");
  const [avatarEmoji, setAvatarEmoji] = useState(avatarOptions[0]);
  const [vibe, setVibe] = useState(vibeOptions[0].value);
  const [inviteCode, setInviteCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const screenEntrance = useEntrance(60);
  const { height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const onboardingScale = Math.min(1.22, Math.max(0.82, Math.min(viewportWidth / 390, viewportHeight / 844)));
  const tutorialScale = Math.min(1.45, Math.max(0.9, Math.min(viewportWidth / 390, viewportHeight / 844)));
  const horizontalPadding = 21 * tutorialScale;
  const contentWidth = Math.max(0, viewportWidth - horizontalPadding * 2);
  const headerHeight = 48 * onboardingScale;
  const backButtonSize = Math.max(44, 44 * onboardingScale);
  const layout = {
    backButton: {
      height: backButtonSize,
      width: backButtonSize,
    },
    brandPill: {
      minHeight: 34 * tutorialScale,
      paddingHorizontal: 18 * tutorialScale,
    },
    brandText: {
      fontSize: 15 * tutorialScale,
      lineHeight: 18 * tutorialScale,
    },
    bottomActions: {
      gap: 11 * onboardingScale,
      paddingTop: 0,
      width: contentWidth,
    },
    content: {
      maxWidth: contentWidth,
      width: contentWidth,
    },
    cta: {
      borderRadius: 22 * tutorialScale,
      minHeight: 57 * tutorialScale,
      width: contentWidth,
    },
    ctaText: {
      fontSize: 15 * tutorialScale,
      lineHeight: 18 * tutorialScale,
    },
    emojiChoice: {
      height: 44 * onboardingScale,
      width: 48 * onboardingScale,
    },
    form: {
      gap: 17 * onboardingScale,
      marginTop: 25 * onboardingScale,
      maxWidth: contentWidth,
      width: contentWidth,
    },
    input: {
      borderRadius: 19 * onboardingScale,
      fontSize: 17 * onboardingScale,
      minHeight: 54 * onboardingScale,
      paddingHorizontal: 18 * onboardingScale,
    },
    label: {
      fontSize: 11 * onboardingScale,
      lineHeight: 14 * onboardingScale,
    },
    screen: {
      paddingBottom: 13 * tutorialScale,
      paddingHorizontal: horizontalPadding,
      paddingTop: 16 * tutorialScale,
    },
    stepPill: {
      height: Math.max(40, 40 * onboardingScale),
      minWidth: Math.max(74, 74 * onboardingScale),
      paddingHorizontal: 16 * onboardingScale,
    },
    stepText: {
      fontSize: 16 * onboardingScale,
      lineHeight: 19 * onboardingScale,
    },
    title: {
      fontSize: 32 * onboardingScale,
      lineHeight: 36 * onboardingScale,
      maxWidth: contentWidth,
    },
    topLeft: {
      gap: 10 * tutorialScale,
      height: headerHeight,
    },
    topRow: {
      height: headerHeight,
      marginBottom: 53 * tutorialScale,
    },
    vibeChoice: {
      minHeight: 40 * onboardingScale,
      paddingHorizontal: 17 * onboardingScale,
    },
  };

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
          color: "rose",
          displayName: displayName.trim(),
          statusEmoji: avatarEmoji,
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

  function goBack() {
    void Haptics.selectionAsync();

    if (mode === "join") {
      setMode("create");
      return;
    }

    onBack?.();
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
      <Animated.ScrollView
        contentContainerStyle={[styles.onboardingScreen, layout.screen]}
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
        <View pointerEvents="none" style={styles.onboardingBackdropCircle} />
        <Entrance style={[styles.onboardingHero, layout.content]}>
          <View style={[styles.onboardingTopRow, layout.topRow]}>
            <View style={[styles.onboardingTopLeft, layout.topLeft]}>
              <View style={[styles.onboardingBrandPill, layout.brandPill]}>
                <Text style={[styles.onboardingBrandText, layout.brandText]}>WeSpice</Text>
              </View>
              <SpringPressable onPress={goBack} style={[styles.onboardingBackButton, layout.backButton]}>
                <ArrowLeft size={Math.max(20, 20 * onboardingScale)} color={candy.white} strokeWidth={3} />
              </SpringPressable>
            </View>
            <View style={[styles.onboardingStepPill, layout.stepPill]}>
              <Text style={[styles.onboardingStepPillText, layout.stepText]}>{mode === "create" ? "1 / 2" : "Code"}</Text>
            </View>
          </View>
          <Text style={[styles.onboardingTitle, layout.title]}>
            {mode === "create" ? (
              <>
                Qui es-tu, ce soir <Text style={styles.onboardingTitleQuestionMark}>?</Text>
              </>
            ) : (
              "Entre le code de ta/ton partenaire."
            )}
          </Text>
        </Entrance>
        <Entrance delay={90} style={[styles.onboardingForm, layout.form]}>
          <WsTextField
            inputStyle={layout.input}
            label="Prénom ou pseudo"
            labelStyle={layout.label}
            onChangeText={setDisplayName}
            placeholder="Max"
            value={displayName}
          />
          {mode === "join" ? (
            <WsTextField
              inputStyle={layout.input}
              label="Code d'invitation"
              labelStyle={layout.label}
              onChangeText={(text) => setInviteCode(text.toUpperCase())}
              placeholder="WSP-4F7K"
              value={inviteCode}
            />
          ) : null}
          <View style={styles.vibePicker}>
            <Text style={[styles.inputLabel, layout.label]}>Ton avatar</Text>
            <View style={styles.avatarChoiceRow}>
              {avatarOptions.map((emoji) => {
                const active = avatarEmoji === emoji;

                return (
                  <WsEmojiChoice
                    key={emoji}
                    emoji={emoji}
                    onPress={() => {
                      setAvatarEmoji(emoji);
                      void Haptics.selectionAsync();
                    }}
                    selected={active}
                    style={[styles.onboardingEmojiChoice, layout.emojiChoice]}
                  />
                );
              })}
            </View>
          </View>
          <View style={styles.vibePicker}>
            <Text style={[styles.inputLabel, layout.label]}>Ta vibe</Text>
            <View style={styles.vibeChipRow}>
              {vibeOptions.map((option) => {
                const active = vibe === option.value;

                return (
                  <WsChoicePill
                    key={option.value}
                    label={option.label}
                    onPress={() => {
                      setVibe(option.value);
                      void Haptics.selectionAsync();
                    }}
                    selected={active}
                    style={[styles.onboardingVibeChoice, layout.vibeChoice]}
                  />
                );
              })}
            </View>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          <View style={[styles.onboardingBottomActions, layout.bottomActions]}>
            <WsButton
              busy={busy}
              disabled={busy}
              label={mode === "create" ? "Créer mon profil" : "Rejoindre notre espace"}
              onPress={submit}
              style={layout.cta}
              textStyle={layout.ctaText}
              variant="primary"
            />
            {mode === "join" ? (
              <SpringPressable onPress={() => setMode("create")} style={styles.onboardingJoinLink}>
                <Text style={styles.onboardingJoinLinkText}>Créer un nouvel espace</Text>
              </SpringPressable>
            ) : null}
          </View>
        </Entrance>
      </Animated.ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  onboardingScreen: {
    alignItems: "stretch",
    flexGrow: 1,
    justifyContent: "flex-start",
    minHeight: "100%",
    overflow: "visible",
    paddingBottom: 13,
    paddingHorizontal: 21,
    paddingTop: 46,
  },
  onboardingHero: {
    alignSelf: "center",
    maxWidth: 342,
    width: "100%",
  },
  onboardingBackdropCircle: {
    backgroundColor: "rgba(255,249,240,0.08)",
    borderRadius: 999,
    height: 220,
    position: "absolute",
    right: -118,
    top: 76,
    width: 220,
  },
  onboardingTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 28,
    minHeight: 44,
  },
  onboardingTopLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  onboardingBackButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.14)",
    borderRadius: 999,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  onboardingBrandPill: {
    alignItems: "center",
    backgroundColor: candy.cream,
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 34,
    paddingHorizontal: 18,
  },
  onboardingBrandText: {
    color: candy.red,
    fontFamily: displayFont,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 18,
  },
  onboardingStepPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.16)",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 74,
    paddingHorizontal: 16,
  },
  onboardingStepPillText: {
    color: candy.white,
    fontFamily: labelFont,
    fontSize: 15,
    fontWeight: "900",
  },
  onboardingTitle: {
    color: candy.white,
    fontFamily: displayFont,
    fontSize: 39,
    fontWeight: "900",
    lineHeight: 45,
    maxWidth: 344,
    textAlign: "left",
  },
  onboardingTitleQuestionMark: {
    color: candy.yellow,
  },
  onboardingForm: {
    alignSelf: "center",
    flexGrow: 1,
    gap: 20,
    marginTop: 34,
    maxWidth: 342,
    paddingBottom: 0,
    width: "100%",
  },
  vibePicker: {
    gap: 11,
  },
  inputLabel: {
    color: "rgba(255,249,240,0.74)",
    fontFamily: labelFont,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    lineHeight: 15,
    textTransform: "uppercase",
  },
  avatarChoiceRow: {
    flexDirection: "row",
    gap: 9,
  },
  vibeChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  onboardingEmojiChoice: {
    height: 50,
    width: 54,
  },
  onboardingVibeChoice: {
    minHeight: 44,
    paddingHorizontal: 19,
  },
  errorText: {
    color: candy.red,
    fontFamily: labelFont,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center",
  },
  onboardingBottomActions: {
    gap: 11,
    marginTop: "auto",
    paddingTop: 18,
  },
  onboardingJoinLink: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 28,
  },
  onboardingJoinLinkText: {
    color: candy.white,
    fontFamily: labelFont,
    fontSize: 13,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
});
