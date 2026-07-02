import { Platform, type TextStyle, type ViewStyle } from "react-native";

export const wsColors = {
  ink: "#2B1735",
  text: "#3A2541",
  muted: "#9B8275",
  pink: "#FB5A92",
  pinkHot: "#F5286E",
  pinkSoft: "#FCE0EA",
  rose: "#F5286E",
  roseDeep: "#AD0D4E",
  roseMist: "#FFF4E8",
  roseSoft: "#F7E8D7",
  roseWarm: "#F94D86",
  red: "#F5286E",
  yellow: "#FFD23F",
  yellowSoft: "#FFEAA6",
  blue: "#64C7E7",
  blueDeep: "#236C92",
  violet: "#8B4C9D",
  violetSoft: "#E9D7EC",
  cream: "#FFF4E8",
  white: "#FFF9F0",
  mint: "#82D7BE",
  green: "#2B9B78",
  black: "#26122E",
  shadow: "rgba(38, 18, 46, 0.22)",
  line: "rgba(43,23,53,0.14)",
  veil: "rgba(255,249,240,0.78)",
  danger: "#C91E57",
};

export const wsFonts = {
  regular: "BricolageGrotesque_400Regular",
  label: "BricolageGrotesque_600SemiBold",
  input: "BricolageGrotesque_700Bold",
  display: "BricolageGrotesque_800ExtraBold",
  emoji: Platform.select({
    ios: "Apple Color Emoji",
    android: "sans-serif",
    default: "Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif",
  })!,
};

export const displayFont = wsFonts.display;
export const labelFont = wsFonts.label;
export const inputFont = wsFonts.input;
export const emojiFont = wsFonts.emoji;

export const wsRadius = {
  sm: 14,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
};

export const wsSpacing = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
};

export const wsType = {
  app: {
    fontFamily: labelFont,
  },
  display: {
    color: wsColors.white,
    fontFamily: displayFont,
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 44,
  },
  title: {
    color: wsColors.ink,
    fontFamily: displayFont,
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 32,
  },
  body: {
    color: wsColors.text,
    fontFamily: labelFont,
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 21,
  },
  label: {
    color: "rgba(255,249,240,0.74)",
    fontFamily: labelFont,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2,
    lineHeight: 14,
    textTransform: "uppercase",
  },
  button: {
    fontFamily: labelFont,
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0,
  },
} satisfies Record<string, TextStyle>;

export const wsShadows = {
  button: {
    boxShadow: "0 10px 18px rgba(38,18,46,0.24)",
  } as ViewStyle,
  card: {
    boxShadow: "0 18px 30px rgba(38,18,46,0.22)",
  } as ViewStyle,
};
