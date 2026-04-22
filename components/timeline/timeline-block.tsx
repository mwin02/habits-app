import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ActiveDot } from '@/components/common/active-dot';
import { CategoryIcon } from '@/components/common/category-icon';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '@/constants/theme';
import { formatDuration } from '@/lib/timezone';
import { Feather } from '@expo/vector-icons';

interface TimelineBlockProps {
  activityName: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string | null;
  durationSeconds: number | null;
  note: string | null;
  isRunning: boolean;
  continuesBefore?: boolean;
  continuesAfter?: boolean;
  height: number;
  variant?: 'bar' | 'normal';
  onPress: () => void;
}

export function TimelineBlock({
  activityName,
  categoryName,
  categoryColor,
  categoryIcon,
  durationSeconds,
  note,
  isRunning,
  continuesBefore = false,
  continuesAfter = false,
  height,
  variant = 'normal',
  onPress,
}: TimelineBlockProps): React.ReactElement {
  const isCompact = height < 64;

  if (variant === 'bar') {
    return (
      <Pressable
        onPress={onPress}
        hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
        style={({ pressed }) => [
          styles.barContainer,
          {
            height,
            backgroundColor: categoryColor + '26', // 15% opacity
          },
          pressed && styles.pressed,
        ]}
      >
        <View style={[styles.barDot, { backgroundColor: categoryColor }]} />
        <CategoryIcon icon={categoryIcon} size={12} color={categoryColor} />
        <Text style={[styles.barName, { color: categoryColor }]} numberOfLines={1}>
          {activityName}
        </Text>
        <Text style={styles.barDuration}>
          {durationSeconds != null ? formatDuration(durationSeconds) : '—'}
        </Text>
        {isRunning && <ActiveDot />}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        {
          height,
          backgroundColor: categoryColor + '1A', // 10% opacity
          borderLeftColor: categoryColor,
        },
        pressed && styles.pressed,
      ]}
    >
      {continuesBefore && (
        <View style={styles.continuesTop} pointerEvents="none">
          <Feather name="chevron-up" size={14} color={categoryColor} />
        </View>
      )}
      {continuesAfter && (
        <View style={styles.continuesBottom} pointerEvents="none">
          <Feather name="chevron-down" size={14} color={categoryColor} />
        </View>
      )}
      {isCompact ? (
        // Compact: single row with icon, name, duration
        <View style={styles.compactRow}>
          <CategoryIcon icon={categoryIcon} size={14} color={categoryColor} />
          <Text style={[styles.compactName, { color: categoryColor }]} numberOfLines={1}>
            {activityName}
          </Text>
          <Text style={styles.compactDuration}>
            {durationSeconds != null ? formatDuration(durationSeconds) : '—'}
          </Text>
          {isRunning && <ActiveDot />}
        </View>
      ) : (
        // Full: icon + name on top, duration + note indicator on bottom
        <>
          <View style={styles.topRow}>
            <View style={styles.nameRow}>
              <CategoryIcon icon={categoryIcon} size={16} color={categoryColor} />
              <Text style={styles.activityName} numberOfLines={1}>
                {activityName}
              </Text>
            </View>
            <Text style={[styles.categoryBadge, { color: categoryColor, backgroundColor: categoryColor + '1A' }]}>
              {categoryName}
            </Text>
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.durationRow}>
              <Text style={styles.duration}>
                {durationSeconds != null ? formatDuration(durationSeconds) : '—'}
              </Text>
              {isRunning && <ActiveDot />}
            </View>
            {note ? (
              <Feather name="file-text" size={12} color={COLORS.onSurfaceVariant} />
            ) : null}
          </View>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 3,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  // Compact layout (short blocks)
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
  },
  compactName: {
    ...TYPOGRAPHY.labelSm,
    flex: 1,
  },
  compactDuration: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  // Full layout
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    marginRight: SPACING.sm,
  },
  activityName: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
    flex: 1,
  },
  categoryBadge: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  duration: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  continuesTop: {
    position: 'absolute',
    top: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  continuesBottom: {
    position: 'absolute',
    bottom: 2,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  // Bar variant (very short blocks)
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  barDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  barName: {
    ...TYPOGRAPHY.labelSm,
    flex: 1,
  },
  barDuration: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
});
