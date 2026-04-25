import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TagFilterRow } from '@/components/common/tag-filter-row';
import { DateHeader } from '@/components/timeline/date-header';
import { EntryDetailModal } from '@/components/timeline/entry-detail-modal';
import { GapFillModal } from '@/components/timeline/gap-fill-modal';
import { WeekStrip } from '@/components/timeline/week-strip';
import { TimelineCanvas } from '@/components/timeline/timeline-canvas';
import type { TimelineEntryData } from '@/hooks/useTimelineData';
import { useTimelineData } from '@/hooks/useTimelineData';
import { useUIStore } from '@/store/uiStore';
import { COLORS, SPACING } from '@/constants/theme';

export default function TimelineScreen(): React.ReactElement {
  const selectedDate = useUIStore((s) => s.selectedDate);
  const setSelectedDate = useUIStore((s) => s.setSelectedDate);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const { items, isLoading, rangeStartMinutes, rangeEndMinutes, timezone } =
    useTimelineData(selectedDate, selectedTagIds);

  // Modal state
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [selectedGap, setSelectedGap] = useState<{ startedAt: Date; endedAt: Date } | null>(null);

  // Find the full entry data for the selected entry
  const selectedEntry = useMemo((): TimelineEntryData | null => {
    if (!selectedEntryId) return null;
    for (const item of items) {
      if (item.type === 'entry' && item.data.id === selectedEntryId) {
        return item.data;
      }
      if (item.type === 'cluster') {
        const found = item.data.entries.find((e) => e.id === selectedEntryId);
        if (found) return found;
      }
    }
    return null;
  }, [selectedEntryId, items]);

  const handleEntryPress = useCallback((entryId: string) => {
    setSelectedEntryId(entryId);
  }, []);

  const handleGapPress = useCallback((startedAt: Date, endedAt: Date) => {
    setSelectedGap({ startedAt, endedAt });
  }, []);

  const handleCloseEntry = useCallback(() => {
    setSelectedEntryId(null);
  }, []);

  const handleCloseGap = useCallback(() => {
    setSelectedGap(null);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <DateHeader selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <WeekStrip selectedDate={selectedDate} onDateChange={setSelectedDate} />
      <TagFilterRow
        selectedTagIds={selectedTagIds}
        onChange={setSelectedTagIds}
      />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : (
        <TimelineCanvas
          items={items}
          rangeStartMinutes={rangeStartMinutes}
          rangeEndMinutes={rangeEndMinutes}
          timezone={timezone}
          selectedDate={selectedDate}
          onEntryPress={handleEntryPress}
          onGapPress={handleGapPress}
        />
      )}

      <EntryDetailModal entry={selectedEntry} onClose={handleCloseEntry} />
      <GapFillModal gap={selectedGap} onClose={handleCloseGap} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  loader: {
    marginTop: SPACING['3xl'],
  },
});
