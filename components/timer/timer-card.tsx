import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { RunningTimer } from '@/db/models';
import { formatTimerDisplay } from '@/lib/timezone';
import { COLORS, TYPOGRAPHY, SPACING } from '@/constants/theme';
import { GlassCard } from '@/components/common/glass-card';
import { CategoryChip } from '@/components/common/category-chip';
import { PulsingDots } from '@/components/common/pulsing-dots';
import { GradientButton } from '@/components/common/gradient-button';
import { StopButton } from '@/components/timer/stop-button';

interface TimerCardProps {
  runningEntry: RunningTimer | null;
  onStop: () => void;
  onStartPress: () => void;
}

export function TimerCard({ runningEntry, onStop, onStartPress }: TimerCardProps): React.ReactElement {
  const isActive = runningEntry !== null;

  return (
    <GlassCard>
      <View style={styles.wrapper}>
        {/* Active state — always in flow to define the card height */}
        <View
          style={{ opacity: isActive ? 1 : 0 }}
          pointerEvents={isActive ? 'auto' : 'none'}
        >
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.sessionLabel}>Current Session</Text>
              <Text style={styles.activityName}>
                {runningEntry?.activityName ?? ' '}
              </Text>
            </View>
            <CategoryChip
              name={runningEntry?.categoryName ?? ' '}
              color={runningEntry?.categoryColor ?? COLORS.onSurfaceVariant}
            />
          </View>

          <View style={styles.timerSection}>
            <Text style={styles.timerDisplay}>
              {formatTimerDisplay(runningEntry?.elapsedSeconds ?? 0)}
            </Text>
            <PulsingDots />
          </View>

          <View style={styles.stopRow}>
            <StopButton onPress={onStop} />
          </View>
        </View>

        {/* Idle state — absolute overlay, centered on top of active layout */}
        {!isActive && (
          <View style={styles.idleOverlay} pointerEvents="auto">
            <Feather name="clock" size={40} color={COLORS.onSurfaceVariant} />
            <Text style={styles.idleTitle}>Ready to focus?</Text>
            <Text style={styles.idleSubtitle}>Start tracking your time</Text>
            <GradientButton
              shape="pill"
              label="Start Activity"
              onPress={onStartPress}
              style={styles.startButton}
            >
              <Feather name="play" size={18} color={COLORS.onPrimary} />
            </GradientButton>
          </View>
        )}
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING['3xl'],
  },
  headerLeft: {
    flex: 1,
    marginRight: SPACING.md,
  },
  sessionLabel: {
    ...TYPOGRAPHY.labelSm,
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  activityName: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  timerSection: {
    alignItems: 'center',
    marginBottom: SPACING['3xl'],
  },
  timerDisplay: {
    ...TYPOGRAPHY.timerDisplay,
    color: COLORS.onSurface,
  },
  stopRow: {
    alignItems: 'center',
  },
  idleOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  idleTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurface,
    marginTop: SPACING.sm,
  },
  idleSubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  startButton: {
    marginTop: SPACING.lg,
  },
});
