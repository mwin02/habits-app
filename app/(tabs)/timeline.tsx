import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DateHeader } from '@/components/timeline/date-header';
import { WeekStrip } from '@/components/timeline/week-strip';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useUIStore } from '@/store/uiStore';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { formatDuration, formatTimeInTimezone } from '@/lib/timezone';

export default function TimelineScreen(): React.ReactElement {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const { items, isLoading, timezone } = useTimelineData(selectedDate);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DateHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <WeekStrip selectedDate={selectedDate} onDateChange={setSelectedDate} />

      <ScrollView contentContainerStyle={styles.scroll}>
        {isLoading && <ActivityIndicator style={styles.loader} color={COLORS.primary} />}

        {!isLoading && items.length === 0 && (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No activity</Text>
            <Text style={styles.emptySubtitle}>
              Start a timer on the Focus tab to see entries here.
            </Text>
          </View>
        )}

        {/* Temporary debug list — will be replaced by TimelineCanvas */}
        {items.map((item, index) => {
          if (item.type === 'entry') {
            const e = item.data;
            return (
              <View key={e.id} style={[styles.row, { borderLeftColor: e.categoryColor }]}>
                <View style={styles.rowHeader}>
                  <Text style={styles.activityName}>{e.activityName}</Text>
                  <Text style={[styles.categoryBadge, { color: e.categoryColor }]}>
                    {e.categoryName}
                  </Text>
                </View>
                <Text style={styles.timeRange}>
                  {formatTimeInTimezone(e.startedAt.toISOString(), timezone)}
                  {' → '}
                  {e.endedAt ? formatTimeInTimezone(e.endedAt.toISOString(), timezone) : 'running'}
                </Text>
                <Text style={styles.duration}>
                  {e.durationSeconds != null ? formatDuration(e.durationSeconds) : '—'} | {e.source}
                </Text>
                {e.note ? <Text style={styles.note}>Note: {e.note}</Text> : null}
              </View>
            );
          }

          const g = item.data;
          return (
            <View key={`gap-${index}`} style={styles.gapRow}>
              <Text style={styles.gapLabel}>Untracked</Text>
              <Text style={styles.timeRange}>
                {formatTimeInTimezone(g.startedAt.toISOString(), timezone)}
                {' → '}
                {formatTimeInTimezone(g.endedAt.toISOString(), timezone)}
              </Text>
              <Text style={styles.duration}>{formatDuration(g.durationSeconds)}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scroll: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
  },
  loader: {
    marginTop: SPACING['3xl'],
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: SPACING['5xl'],
  },
  emptyTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  emptySubtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.outlineVariant,
    textAlign: 'center',
    paddingHorizontal: SPACING['3xl'],
  },
  row: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: 12,
    borderLeftWidth: 4,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  rowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  activityName: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
    flex: 1,
  },
  categoryBadge: {
    ...TYPOGRAPHY.labelSm,
  },
  timeRange: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
  },
  duration: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
  note: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: SPACING.xs,
  },
  gapRow: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.outlineVariant,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  gapLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
});
