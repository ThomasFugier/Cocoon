import { wsColors } from "./ui/tokens";

export const palette = {
  ink: wsColors.ink,
  inkMuted: wsColors.muted,
  paper: wsColors.cream,
  veil: wsColors.veil,
  line: wsColors.line,
  rose: wsColors.rose,
  coral: wsColors.pink,
  apricot: wsColors.yellow,
  lavender: wsColors.violet,
  mint: wsColors.mint,
  sky: wsColors.blue,
  plum: wsColors.black,
  good: wsColors.green,
  danger: wsColors.danger,
};

export const partnerColors = [
  { key: "rose", label: "Rose velvet", value: palette.rose },
  { key: "coral", label: "Corail nude", value: palette.coral },
  { key: "apricot", label: "Abricot", value: palette.apricot },
  { key: "lavender", label: "Lavande", value: palette.lavender },
  { key: "mint", label: "Menthe", value: palette.mint },
  { key: "sky", label: "Bleu doux", value: palette.sky },
];

export function colorValue(key: string) {
  return partnerColors.find((color) => color.key === key)?.value ?? palette.rose;
}
