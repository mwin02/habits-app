import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { InsightsPeriod } from '@/hooks/useInsightsData';
import { COLORS, FONTS, RADIUS, SPACING } from '@/constants/theme';

interface PeriodToggleProps {
  period: InsightsPeriod;
  onPeriodChange: (period: InsightsPeriod) => void;
}

const PERIODS: { key: InsightsPeriod; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
];

export function PeriodToggle({
  period,
  onPeriodChange,
}: PeriodToggleProps): React.ReactElement {
  return (
    <View style={styles.container}>
      {PERIODS.map(({ key, label }) => {
        const isActive = period === key;
        return (
          <PeriodPill
            key={key}
            label={label}
            isActive={isActive}
            onPress={() => onPeriodChange(key)}
          />
        );
      })}
    </View>
  );
}

function PeriodPill({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}): React.ReactElement {
  const handlePress = useCallback(() => {
    onPress();
  }, [onPress]);

  if (isActive) {
    return (
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.pill}
      >
        <Text style={styles.pillTextActive}>{label}</Text>
      </LinearGradient>
    );
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.pill,
        styles.pillInactive,
        pressed && styles.pillPressed,
      ]}
    >
      <Text style={styles.pillTextInactive}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
  },
  pill: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  pillInactive: {
    backgroundColor: COLORS.surfaceContainerLow,
  },
  pillPressed: {
    opacity: 0.7,
  },
  pillTextActive: {
    fontFamily: FONTS.jakartaSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.onPrimary,
  },
  pillTextInactive: {
    fontFamily: FONTS.jakartaSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.onSurfaceVariant,
  },
});
