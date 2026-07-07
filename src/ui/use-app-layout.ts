import { useMemo } from "react";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const DEFAULT_TAB_DOCK_HEIGHT = 76;
export const DEFAULT_BOTTOM_INTERACTIVE_GAP = 12;

export type UseAppLayoutOptions = {
  bottomInteractiveGap?: number;
  compactHeight?: number;
  compactWidth?: number;
  maxContentWidth?: number;
  sideInset?: number;
  tabDockHeight?: number;
};

export type AppLayoutMetrics = {
  bottomInteractiveInset: number;
  contentWidth: number;
  fontScale: number;
  frameHeight: number;
  isCompact: boolean;
  safeBottom: number;
  safeTop: number;
  sideInset: number;
  tabDockHeight: number;
  viewportHeight: number;
  viewportWidth: number;
};

function defaultSideInset(width: number) {
  if (width >= 900) {
    return 24;
  }

  if (width >= 700) {
    return 18;
  }

  if (width >= 520) {
    return 14;
  }

  return 12;
}

export function useAppLayout({
  bottomInteractiveGap = DEFAULT_BOTTOM_INTERACTIVE_GAP,
  compactHeight = 700,
  compactWidth = 380,
  maxContentWidth,
  sideInset,
  tabDockHeight = DEFAULT_TAB_DOCK_HEIGHT,
}: UseAppLayoutOptions = {}): AppLayoutMetrics {
  const { fontScale, height: viewportHeight, width: viewportWidth } = useWindowDimensions();
  const safeAreaInsets = useSafeAreaInsets();

  return useMemo(() => {
    const safeTop = safeAreaInsets.top;
    const safeBottom = safeAreaInsets.bottom;
    const resolvedSideInset = sideInset ?? defaultSideInset(viewportWidth);
    const availableWidth = Math.max(0, viewportWidth - resolvedSideInset * 2);
    const contentWidth = maxContentWidth === undefined
      ? availableWidth
      : Math.min(maxContentWidth, availableWidth);
    const frameHeight = Math.max(0, viewportHeight - safeTop - safeBottom);
    const bottomInteractiveInset = safeBottom + tabDockHeight + bottomInteractiveGap;
    const isCompact = viewportWidth < compactWidth || frameHeight < compactHeight || fontScale > 1.08;

    return {
      bottomInteractiveInset,
      contentWidth,
      fontScale,
      frameHeight,
      isCompact,
      safeBottom,
      safeTop,
      sideInset: resolvedSideInset,
      tabDockHeight,
      viewportHeight,
      viewportWidth,
    };
  }, [
    bottomInteractiveGap,
    compactHeight,
    compactWidth,
    fontScale,
    maxContentWidth,
    safeAreaInsets.bottom,
    safeAreaInsets.top,
    sideInset,
    tabDockHeight,
    viewportHeight,
    viewportWidth,
  ]);
}
