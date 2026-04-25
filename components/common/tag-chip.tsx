import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TYPOGRAPHY, RADIUS, SPACING } from '@/constants/theme';

interface TagChipProps {
  name: string;
  color: string;
  selected?: boolean;
  onPress?: () => void;
  onRemove?: () => void;
}

/**
 * Small tag pill. Mirrors CategoryChip but supports optional selection
 * styling, tap, and an inline remove (×) affordance.
 */
export function TagChip({
  name,
  color,
  selected,
  onPress,
  onRemove,
}: TagChipProps): React.ReactElement {
  const bg = selected ? color + '40' : color + '1a';

  const inner = (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {name}
      </Text>
      {onRemove && (
        <Pressable onPress={onRemove} hitSlop={6} style={styles.removeBtn}>
          <Feather name="x" size={12} color={color} />
        </Pressable>
      )}
    </View>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={4}>
        {inner}
      </Pressable>
    );
  }
  return inner;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  label: {
    ...TYPOGRAPHY.bodySmall,
    fontWeight: '600',
    maxWidth: 140,
  },
  removeBtn: {
    marginLeft: 2,
    padding: 2,
  },
});

/**
 * Default palette used when creating tags inline. Picked for visual
 * distinctness on the surface backgrounds.
 */
export const TAG_COLOR_PALETTE = [
  '#0050d4', // primary blue
  '#006948', // green
  '#8c4a00', // orange
  '#b31b25', // red
  '#6a3ea1', // purple
  '#0a7480', // teal
  '#7d5300', // amber
  '#3d4a5c', // slate
] as const;
