import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CategoryWithActivities } from '@/db/models';
import { CategoryIcon } from '@/components/common/category-icon';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';

interface QuickSwitchCardProps {
  category: CategoryWithActivities;
  activeActivityId: string | null;
  onActivityPress: (activityId: string) => void;
}

/** Max activities shown per card in the carousel */
const MAX_ACTIVITIES = 2;

export function QuickSwitchCard({
  category,
  activeActivityId,
  onActivityPress,
}: QuickSwitchCardProps): React.ReactElement {
  const visibleActivities = category.activities.slice(0, MAX_ACTIVITIES);

  return (
    <View style={styles.card}>
      {/* Category header */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: category.color + '20' }]}>
          <CategoryIcon icon={category.icon ?? 'circle'} size={16} color={category.color} />
        </View>
        <Text style={[styles.categoryLabel, { color: category.color }]}>
          {category.name}
        </Text>
      </View>

      {/* Activity buttons */}
      {visibleActivities.map((activity) => {
        const isActive = activity.id === activeActivityId;
        return (
          <Pressable
            key={activity.id}
            style={[styles.activityButton, isActive && styles.activityButtonActive]}
            onPress={() => onActivityPress(activity.id)}
          >
            <View style={styles.activityInfo}>
              <Text style={styles.activityName}>{activity.name}</Text>
            </View>
            <Feather
              name="play-circle"
              size={20}
              color={isActive ? COLORS.primary : COLORS.onSurfaceVariant}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 260,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xxl,
    padding: SPACING['2xl'],
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    ...TYPOGRAPHY.labelSm,
  },
  activityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceContainerLowest,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
  },
  activityButtonActive: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
});
