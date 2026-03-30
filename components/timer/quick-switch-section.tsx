import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { CategoryWithActivities } from '@/db/models';
import { QuickSwitchCard } from '@/components/timer/quick-switch-card';
import { COLORS, TYPOGRAPHY, SPACING } from '@/constants/theme';

interface QuickSwitchSectionProps {
  categories: CategoryWithActivities[];
  activeActivityId: string | null;
  onActivityPress: (activityId: string) => void;
}

export function QuickSwitchSection({
  categories,
  activeActivityId,
  onActivityPress,
}: QuickSwitchSectionProps): React.ReactElement {
  // Only show categories that have at least one activity
  const nonEmpty = categories.filter((c) => c.activities.length > 0);

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Quick Switch</Text>
        <Text style={styles.label}>Presets</Text>
      </View>

      {/* Horizontal carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {nonEmpty.map((category) => (
          <QuickSwitchCard
            key={category.id}
            category={category}
            activeActivityId={activeActivityId}
            onActivityPress={onActivityPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING['3xl'],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.lg,
  },
  heading: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurface,
  },
  label: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
  },
  scrollContent: {
    gap: SPACING.lg,
    paddingRight: SPACING.lg,
  },
});
