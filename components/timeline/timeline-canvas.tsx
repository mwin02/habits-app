import { COLORS, SPACING } from "@/constants/theme";
import {
  type TimelineItem,
  minutesSinceMidnight,
} from "@/hooks/useTimelineData";
import { getCurrentTimezone, getTodayDate } from "@/lib/timezone";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ClusterBlock } from "./cluster-block";
import { CurrentTimeIndicator } from "./current-time-indicator";
import { GapBlock } from "./gap-block";
import { TimelineBlock } from "./timeline-block";

// ──────────────────────────────────────────────
// Layout constants
// ──────────────────────────────────────────────

const PIXELS_PER_MINUTE = 1.33;
const MIN_BLOCK_HEIGHT = 40;
const BLOCK_GAP = 4;
const TIME_AXIS_WIDTH = 52;
const TRACK_LINE_LEFT = TIME_AXIS_WIDTH;
const BLOCK_LEFT = TIME_AXIS_WIDTH + 16;

interface TimelineCanvasProps {
  items: TimelineItem[];
  rangeStartMinutes: number;
  rangeEndMinutes: number;
  timezone: string;
  selectedDate: string;
  onEntryPress: (entryId: string) => void;
  onGapPress: (startedAt: Date, endedAt: Date) => void;
}

/** Format hour number to label: 0 → "12 AM", 8 → "8 AM", 13 → "1 PM" */
function formatHourLabel(hour: number): string {
  if (hour === 0 || hour === 24) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function TimelineCanvas({
  items,
  rangeStartMinutes,
  rangeEndMinutes,
  timezone,
  selectedDate,
  onEntryPress,
  onGapPress,
}: TimelineCanvasProps): React.ReactElement {
  const isToday = selectedDate === getTodayDate(getCurrentTimezone());

  // Only one cluster can be expanded at a time
  const [expandedClusterIndex, setExpandedClusterIndex] = useState<number | null>(null);

  // Current time position (re-renders every 30s for today)
  const [nowMinutes, setNowMinutes] = useState(() =>
    minutesSinceMidnight(new Date(), timezone),
  );

  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      setNowMinutes(minutesSinceMidnight(new Date(), timezone));
    }, 30_000);
    return () => clearInterval(interval);
  }, [isToday, timezone]);

  const canvasHeight =
    (rangeEndMinutes - rangeStartMinutes) * PIXELS_PER_MINUTE;

  // Generate hour labels
  const hourLabels = useMemo(() => {
    const labels: { hour: number; top: number }[] = [];
    const startHour = Math.ceil(rangeStartMinutes / 60);
    const endHour = Math.floor(rangeEndMinutes / 60);
    for (let h = startHour; h <= endHour; h++) {
      labels.push({
        hour: h,
        top: (h * 60 - rangeStartMinutes) * PIXELS_PER_MINUTE,
      });
    }
    return labels;
  }, [rangeStartMinutes, rangeEndMinutes]);

  // Position helper
  const getTop = useCallback(
    (date: Date): number => {
      const mins = minutesSinceMidnight(date, timezone);
      return (mins - rangeStartMinutes) * PIXELS_PER_MINUTE;
    },
    [rangeStartMinutes, timezone],
  );

  const getHeight = useCallback(
    (startDate: Date, endDate: Date): number => {
      const startMins = minutesSinceMidnight(startDate, timezone);
      const endMins = minutesSinceMidnight(endDate, timezone);
      const durationMins = endMins - startMins;
      return Math.max(MIN_BLOCK_HEIGHT, durationMins * PIXELS_PER_MINUTE);
    },
    [timezone],
  );

  // Resolve block positions with collision push-down
  const resolvedPositions = useMemo(() => {
    const positions: { top: number; height: number }[] = [];
    let prevBottom = -Infinity;

    for (const item of items) {
      let startDate: Date;
      let endDate: Date;

      if (item.type === "entry") {
        startDate = item.data.startedAt;
        endDate = item.data.endedAt ?? new Date();
      } else if (item.type === "cluster") {
        startDate = item.data.startedAt;
        endDate = item.data.endedAt;
      } else {
        startDate = item.data.startedAt;
        endDate = item.data.endedAt;
      }

      const naturalTop = getTop(startDate);
      const height = getHeight(startDate, endDate);
      const resolvedTop = Math.max(naturalTop, prevBottom + BLOCK_GAP);
      prevBottom = resolvedTop + height;

      positions.push({ top: resolvedTop, height });
    }

    return positions;
  }, [items, getTop, getHeight]);

  // Canvas height: max of time-based height and last block bottom
  const lastBottom =
    resolvedPositions.length > 0
      ? resolvedPositions[resolvedPositions.length - 1].top +
        resolvedPositions[resolvedPositions.length - 1].height
      : 0;
  const resolvedCanvasHeight = Math.max(canvasHeight, lastBottom);

  // Current time indicator position
  const nowTop = isToday
    ? (nowMinutes - rangeStartMinutes) * PIXELS_PER_MINUTE
    : -1;
  const showNowIndicator =
    isToday && nowTop >= 0 && nowTop <= resolvedCanvasHeight;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scrollContent,
        { height: resolvedCanvasHeight + SPACING["5xl"] },
      ]}
      showsVerticalScrollIndicator={false}
    >
      {/* Time axis labels */}
      {hourLabels.map(({ hour, top }) => (
        <View key={`hour-${hour}`} style={[styles.hourLabel, { top: top - 7 }]}>
          <Text style={styles.hourText}>{formatHourLabel(hour)}</Text>
        </View>
      ))}

      {/* Vertical track line */}
      <View
        style={[
          styles.trackLine,
          { left: TRACK_LINE_LEFT, height: resolvedCanvasHeight },
        ]}
      />

      {/* Entry, gap, and cluster blocks */}
      {items.map((item, index) => {
        const { top, height } = resolvedPositions[index];

        if (item.type === "entry") {
          const e = item.data;
          return (
            <View
              key={e.id}
              style={[
                styles.blockWrapper,
                { top, height, left: BLOCK_LEFT, right: SPACING.lg },
              ]}
            >
              <TimelineBlock
                activityName={e.activityName}
                categoryName={e.categoryName}
                categoryColor={e.categoryColor}
                categoryIcon={e.categoryIcon}
                durationSeconds={e.durationSeconds}
                note={e.note}
                isRunning={e.endedAt === null}
                height={height}
                onPress={() => onEntryPress(e.id)}
              />
            </View>
          );
        }

        if (item.type === "cluster") {
          const c = item.data;
          const isExpanded = expandedClusterIndex === index;
          return (
            <View
              key={`cluster-${index}`}
              style={[
                styles.blockWrapper,
                {
                  top,
                  minHeight: height,
                  left: BLOCK_LEFT,
                  right: SPACING.lg,
                  zIndex: isExpanded ? 20 : 5,
                },
              ]}
            >
              <ClusterBlock
                cluster={c}
                height={height}
                expanded={isExpanded}
                onToggle={() =>
                  setExpandedClusterIndex(isExpanded ? null : index)
                }
                onEntryPress={onEntryPress}
              />
            </View>
          );
        }

        // Gap
        const g = item.data;
        return (
          <View
            key={`gap-${index}`}
            style={[
              styles.blockWrapper,
              { top, height, left: BLOCK_LEFT, right: SPACING.lg },
            ]}
          >
            <GapBlock
              durationSeconds={g.durationSeconds}
              height={height}
              onPress={() => onGapPress(g.startedAt, g.endedAt)}
            />
          </View>
        );
      })}

      {/* Current time indicator */}
      {showNowIndicator && (
        <View style={[styles.nowIndicatorWrapper, { top: nowTop - 10 }]}>
          <CurrentTimeIndicator timezone={timezone} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    position: "relative",
  },
  hourLabel: {
    position: "absolute",
    left: 0,
    width: TIME_AXIS_WIDTH - 8,
    alignItems: "flex-end",
  },
  hourText: {
    fontFamily: "PlusJakartaSans_700Bold",
    fontSize: 11,
    color: COLORS.onSurfaceVariant + "80", // 50% opacity
  },
  trackLine: {
    position: "absolute",
    top: 0,
    width: 2,
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: 1,
  },
  blockWrapper: {
    position: "absolute",
  },
  nowIndicatorWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 10,
  },
});
