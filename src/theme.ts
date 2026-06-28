export const palette = {
  ink: "#332D3A",
  inkMuted: "#74697B",
  paper: "#FFF8F1",
  veil: "rgba(255,255,255,0.76)",
  line: "rgba(75,61,88,0.12)",
  rose: "#F2749A",
  coral: "#EF8E82",
  apricot: "#F3A06F",
  lavender: "#9B83E6",
  mint: "#74C9B8",
  sky: "#8ACDE3",
  plum: "#874A83",
  good: "#3D9A78",
  danger: "#C75D77",
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
