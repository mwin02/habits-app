import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

export const ACTIVE_GREEN = '#22C55E';

interface ActiveDotProps {
  size?: number;
  color?: string;
}

/**
 * A small pulsing dot used to indicate an active/running state.
 * Fades between 100% and 30% opacity on an 800ms ease cycle.
 */
export function ActiveDot({
  size = 8,
  color = ACTIVE_GREEN,
}: ActiveDotProps): React.ReactElement {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.dot,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        { opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
