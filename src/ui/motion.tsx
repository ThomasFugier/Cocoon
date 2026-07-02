import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";

const useNativeAnimations = Platform.OS !== "web";
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function useEntrance(delay = 0) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(value, {
      delay,
      duration: 560,
      easing: Easing.out(Easing.back(1.1)),
      toValue: 1,
      useNativeDriver: useNativeAnimations,
    }).start();
  }, [delay, value]);

  return value;
}

export function Entrance({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useEntrance(delay);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [
            { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

export function SpringPressable({
  children,
  disabled,
  onPress,
  style,
  testID,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  onPress?: () => void;
  style: StyleProp<ViewStyle>;
  testID?: string;
}) {
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
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => animate(0.96)}
      onPressOut={() => animate(1)}
      style={[style, { transform: [{ scale }] }]}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
}
