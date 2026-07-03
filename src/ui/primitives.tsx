import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text as RNText,
  TextInput,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import {
  emojiFont,
  inputFont,
  labelFont,
  wsColors,
  wsRadius,
  wsShadows,
  wsType,
} from "./tokens";

const useNativeAnimations = Platform.OS !== "web";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const webTextInputFocusReset =
  Platform.OS === "web"
    ? ({
        caretColor: wsColors.red,
        outlineColor: "transparent",
        outlineStyle: "none",
        outlineWidth: 0,
      } as unknown as TextStyle)
    : null;

type WsButtonVariant = "primary" | "secondary" | "accent" | "hot" | "outline" | "ghost" | "danger";
type WsButtonSize = "sm" | "md" | "lg";

type WsPressableProps = Omit<PressableProps, "style"> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function WsPressable({
  accessibilityRole = "button",
  children,
  disabled,
  onPressIn,
  onPressOut,
  style,
  ...props
}: WsPressableProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      friction: 5,
      tension: 250,
      toValue,
      useNativeDriver: useNativeAnimations,
    }).start();
  };

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      disabled={disabled}
      onPressIn={(event) => {
        animate(0.96);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        onPressOut?.(event);
      }}
      style={[style, disabled && styles.disabled, { transform: [{ scale }] }]}
      {...props}
    >
      {children}
    </AnimatedPressable>
  );
}

export function WsText({ style, ...props }: TextProps) {
  return <RNText {...props} style={[wsType.app, style]} />;
}

export function WsButton({
  busy = false,
  disabled,
  label,
  left,
  onPress,
  right,
  size = "lg",
  style,
  textStyle,
  variant = "primary",
}: {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  left?: React.ReactNode;
  onPress?: () => void;
  right?: React.ReactNode;
  size?: WsButtonSize;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  variant?: WsButtonVariant;
}) {
  const blocked = disabled || busy;

  return (
    <WsPressable
      disabled={blocked}
      onPress={onPress}
      style={[styles.button, buttonSizes[size], buttonVariants[variant], style]}
    >
      {busy ? <ActivityIndicator color={buttonActivityColors[variant]} /> : left}
      <RNText adjustsFontSizeToFit numberOfLines={1} style={[styles.buttonText, buttonTextVariants[variant], textStyle]}>
        {label}
      </RNText>
      {right}
    </WsPressable>
  );
}

export function WsIconButton({
  accessibilityLabel,
  disabled,
  icon,
  onPress,
  size = 48,
  style,
  variant = "hot",
}: {
  accessibilityLabel: string;
  disabled?: boolean;
  icon: React.ReactNode;
  onPress?: () => void;
  size?: number;
  style?: StyleProp<ViewStyle>;
  variant?: WsButtonVariant;
}) {
  return (
    <WsPressable
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.iconButton,
        buttonVariants[variant],
        { borderRadius: size / 2, height: size, width: size },
        style,
      ]}
    >
      {icon}
    </WsPressable>
  );
}

export function WsTextField({
  containerStyle,
  inputStyle,
  label,
  labelStyle,
  onBlur,
  onFocus,
  placeholderTextColor = "rgba(22,16,24,0.38)",
  ...props
}: Omit<TextInputProps, "style"> & {
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
  label: string;
  labelStyle?: StyleProp<TextStyle>;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <Animated.View style={[styles.fieldBlock, containerStyle]}>
      <RNText style={[styles.fieldLabel, labelStyle]}>{label}</RNText>
      <TextInput
        cursorColor={wsColors.red}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        placeholderTextColor={placeholderTextColor}
        selectionColor={Platform.OS === "web" ? undefined : wsColors.red}
        style={[styles.textInput, webTextInputFocusReset, inputStyle, focused && styles.textInputFocused]}
        {...props}
      />
    </Animated.View>
  );
}

export function WsChoicePill({
  label,
  onPress,
  selected,
  style,
}: {
  label: string;
  onPress: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <WsPressable onPress={onPress} style={[styles.choicePill, selected && styles.choicePillSelected, style]}>
      <RNText style={[styles.choicePillText, selected && styles.choicePillTextSelected]}>{label}</RNText>
    </WsPressable>
  );
}

export function WsEmojiChoice({
  emoji,
  onPress,
  selected,
  style,
}: {
  emoji: string;
  onPress: () => void;
  selected?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <WsPressable onPress={onPress} style={[styles.emojiChoice, selected && styles.emojiChoiceSelected, style]}>
      <RNText style={styles.emojiChoiceText}>{emoji}</RNText>
    </WsPressable>
  );
}

const buttonSizes = StyleSheet.create({
  sm: {
    minHeight: 42,
    paddingHorizontal: 15,
  },
  md: {
    minHeight: 52,
    paddingHorizontal: 18,
  },
  lg: {
    minHeight: 58,
    paddingHorizontal: 20,
  },
});

const buttonVariants = StyleSheet.create({
  primary: {
    backgroundColor: wsColors.darkColor,
    borderColor: wsColors.darkColor,
  },
  secondary: {
    backgroundColor: wsColors.cream,
    borderColor: wsColors.cream,
  },
  accent: {
    backgroundColor: wsColors.yellow,
    borderColor: wsColors.yellow,
  },
  hot: {
    backgroundColor: wsColors.red,
    borderColor: wsColors.red,
  },
  outline: {
    backgroundColor: "transparent",
    borderColor: "rgba(255,249,240,0.72)",
  },
  ghost: {
    backgroundColor: "rgba(255,249,240,0.14)",
    borderColor: "rgba(255,249,240,0.14)",
  },
  danger: {
    backgroundColor: wsColors.danger,
    borderColor: wsColors.danger,
  },
});

const buttonTextVariants = StyleSheet.create({
  primary: {
    color: wsColors.white,
  },
  secondary: {
    color: wsColors.ink,
  },
  accent: {
    color: wsColors.ink,
  },
  hot: {
    color: wsColors.white,
  },
  outline: {
    color: wsColors.white,
  },
  ghost: {
    color: wsColors.white,
  },
  danger: {
    color: wsColors.white,
  },
});

const buttonActivityColors: Record<WsButtonVariant, string> = {
  accent: wsColors.ink,
  danger: wsColors.white,
  ghost: wsColors.white,
  hot: wsColors.white,
  outline: wsColors.white,
  primary: wsColors.white,
  secondary: wsColors.ink,
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.6,
  },
  button: {
    alignItems: "center",
    borderRadius: wsRadius.lg,
    borderWidth: 2,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    ...wsShadows.button,
  },
  buttonText: {
    ...wsType.button,
    textAlign: "center",
  },
  iconButton: {
    alignItems: "center",
    borderWidth: 2,
    justifyContent: "center",
    ...wsShadows.button,
  },
  fieldBlock: {
    gap: 9,
  },
  fieldLabel: {
    ...wsType.label,
    fontSize: 12,
    lineHeight: 15,
  },
  textInput: {
    backgroundColor: wsColors.cream,
    borderColor: wsColors.cream,
    borderRadius: 22,
    borderWidth: 2,
    color: wsColors.ink,
    fontFamily: inputFont,
    fontSize: 18,
    fontWeight: "900",
    minHeight: 60,
    paddingHorizontal: 20,
  },
  textInputFocused: {
    borderColor: wsColors.yellow,
    color: wsColors.ink,
    fontWeight: "900",
  },
  choicePill: {
    alignItems: "center",
    borderColor: "rgba(255,249,240,0.72)",
    borderRadius: wsRadius.pill,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 17,
  },
  choicePillSelected: {
    backgroundColor: wsColors.cream,
    borderColor: wsColors.cream,
  },
  choicePillText: {
    color: wsColors.white,
    fontFamily: labelFont,
    fontSize: 13,
    fontWeight: "900",
  },
  choicePillTextSelected: {
    color: wsColors.red,
  },
  emojiChoice: {
    alignItems: "center",
    backgroundColor: "rgba(255,249,240,0.14)",
    borderColor: "transparent",
    borderRadius: wsRadius.pill,
    borderWidth: 2,
    height: 44,
    justifyContent: "center",
    width: 48,
  },
  emojiChoiceSelected: {
    backgroundColor: wsColors.yellow,
    borderColor: wsColors.cream,
  },
  emojiChoiceText: {
    fontFamily: emojiFont,
    fontSize: 24,
    lineHeight: 30,
  },
});
