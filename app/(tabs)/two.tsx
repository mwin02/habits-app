import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useUIStore } from '@/store/uiStore';
import { COLORS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { formatDuration, formatTimeInTimezone } from '@/lib/timezone';

export default function TabTwoScreen(): React.ReactElement {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const { items, isLoading, rangeStartMinutes, rangeEndMinutes, timezone } =
    useTimelineData(selectedDate);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Timeline Debug</Text>
        <Text style={styles.subtitle}>
          Date: {selectedDate} | TZ: {timezone}
        </Text>
        <Text style={styles.subtitle}>
          Range: {Math.floor(rangeStartMinutes / 60)}:00 – {Math.floor(rangeEndMinutes / 60)}:00 | Items: {items.length}
        </Text>

        {isLoading && <ActivityIndicator style={styles.loader} color={COLORS.primary} />}

        {!isLoading && items.length === 0 && (
          <Text style={styles.empty}>No entries for this day.</Text>
        )}

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

          // Gap
          const g = item.data;
          return (
            <View key={`gap-${index}`} style={styles.gapRow}>
              <Text style={styles.gapLabel}>GAP</Text>
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
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.sm,
  },
  loader: {
    marginTop: SPACING['3xl'],
  },
  empty: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING['3xl'],
    textAlign: 'center',
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
