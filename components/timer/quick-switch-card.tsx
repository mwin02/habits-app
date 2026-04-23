import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { CategoryWithActivities } from '@/db/models';
import { CategoryIcon } from '@/components/common/category-icon';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '@/constants/theme';

interface QuickSwitchCardProps {
  category: CategoryWithActivities;
  activeActivityId: string | null;
  onActivityPress: (activityId: string) => void;
}

/** Max height for the activities list — shows ~2 activities, rest scroll */
const ACTIVITIES_MAX_HEIGHT = 140;

export function QuickSwitchCard({
  category,
  activeActivityId,
  onActivityPress,
}: QuickSwitchCardProps): React.ReactElement {
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

      {/* Vertically scrollable activity buttons */}
      <ScrollView
        style={styles.activitiesScroll}
        contentContainerStyle={styles.activitiesContent}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
      >
        {category.activities.map((activity) => {
          const isActive = activity.id === activeActivityId;
          return (
            <Pressable
              key={activity.id}
              style={[styles.activityButton, isActive && styles.activityButtonActive]}
              onPress={() => onActivityPress(activity.id)}
            >
              <View style={styles.activityInfo}>
                <Text style={styles.activityName} numberOfLines={1}>
                  {activity.name}
                </Text>
              </View>
              <Feather
                name="play-circle"
                size={20}
                color={isActive ? COLORS.primary : COLORS.onSurfaceVariant}
              />
            </Pressable>
          );
        })}
      </ScrollView>
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
  activitiesScroll: {
    maxHeight: ACTIVITIES_MAX_HEIGHT,
  },
  activitiesContent: {
    gap: SPACING.md,
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
