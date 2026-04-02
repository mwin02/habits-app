import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { DayCoverage } from '@/db/models';
import { formatDuration } from '@/lib/timezone';
import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';

interface TrackingCoverageProps {
  coverage: DayCoverage;
  period: 'daily' | 'weekly';
}

export function TrackingCoverage({
  coverage,
  period,
}: TrackingCoverageProps): React.ReactElement {
  const { trackedMinutes, wakingMinutes, coveragePercent } = coverage;

  const trackedHours = formatDuration(trackedMinutes * 60);
  const wakingHours = formatDuration(wakingMinutes * 60);

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    animatedWidth.setValue(0);
    Animated.timing(animatedWidth, {
      toValue: coveragePercent,
      duration: 800,
      useNativeDriver: false,
    }).start();
  }, [coveragePercent, animatedWidth]);

  // Pick an encouraging message based on coverage level
  const message = getCoverageMessage(coveragePercent, period);

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>TRACKING COVERAGE</Text>

      {/* Big percentage */}
      <View style={styles.percentRow}>
        <Text style={styles.percentValue}>{coveragePercent}</Text>
        <Text style={styles.percentSign}>%</Text>
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {trackedHours} of {wakingHours} waking hours
      </Text>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>

      {/* Encouragement message */}
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────

function getCoverageMessage(percent: number, period: 'daily' | 'weekly'): string {
  const periodLabel = period === 'daily' ? 'today' : 'this week';

  if (percent >= 90) return `Amazing! You've tracked almost all of ${periodLabel}.`;
  if (percent >= 70) return `Great job! Most of ${periodLabel} is accounted for.`;
  if (percent >= 40) return `You're building the habit. Keep tracking ${periodLabel}!`;
  if (percent > 0) return `Fill in the gaps on the Timeline to improve coverage.`;
  return `Start tracking to see your coverage ${periodLabel}.`;
}

// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    padding: SPACING['2xl'],
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  percentValue: {
    fontFamily: FONTS.manropeExtraBold,
    fontSize: 48,
    lineHeight: 48,
    letterSpacing: -2,
    color: COLORS.primary,
    fontVariant: ['tabular-nums'],
  },
  percentSign: {
    fontFamily: FONTS.manropeBold,
    fontSize: 24,
    lineHeight: 28,
    color: COLORS.primary,
    marginLeft: 2,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.surfaceContainer,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  message: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
});
