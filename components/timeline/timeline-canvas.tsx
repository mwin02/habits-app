import { COLORS, SPACING } from "@/constants/theme";
import {
  type TimelineItem,
  minutesSinceMidnight,
} from "@/hooks/useTimelineData";
import { getCurrentTimezone, getTodayDate } from "@/lib/timezone";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StyleSheet, Text, View } from "react-native";
import { ACTIVE_CHIP_HEIGHT, ActiveSessionChip } from "./active-session-chip";
import { ClusterBlock } from "./cluster-block";
import { CurrentTimeIndicator } from "./current-time-indicator";
import { GapBlock } from "./gap-block";
import { TimelineBlock } from "./timeline-block";

// ──────────────────────────────────────────────
// Layout constants
// ──────────────────────────────────────────────

const PIXELS_PER_MINUTE = 1.33;
const MIN_BLOCK_HEIGHT = 40;
const BAR_THRESHOLD = 24;
const BAR_HEIGHT = 22;
/**
 * Extra px forced between visually-colliding blocks during push-down.
 * Kept at 0 so adjacent entries (no natural time gap) stay glued to their
 * real time positions — otherwise the gap accumulates across a run of
 * consecutive blocks and hour labels drift out of alignment. Block visual
 * separation comes from borderRadius + category color, not a spacer.
 */
const BLOCK_GAP = 0;
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

const COLUMN_GAP = 4;

/** Compute left/width style for a column in a multi-column overlap group */
function getColumnStyle(
  totalColumns: number,
  columnIndex: number,
): { left: number; width: number } {
  const screenWidth = Dimensions.get("window").width;
  const availableWidth = screenWidth - BLOCK_LEFT - SPACING.lg;
  const totalGaps = (totalColumns - 1) * COLUMN_GAP;
  const colWidth = (availableWidth - totalGaps) / totalColumns;
  const left = BLOCK_LEFT + columnIndex * (colWidth + COLUMN_GAP);
  return { left, width: colWidth };
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
  const [expandedClusterIndex, setExpandedClusterIndex] = useState<
    number | null
  >(null);

  // Live-ticking "now" — single source of truth for both the current-time
  // indicator and the running entry's end position. Ticks every 1s on today.
  const [liveNow, setLiveNow] = useState(() => new Date());
  const filteredItems = useMemo(
    () => items.filter((item) => item.data.endedAt !== null),
    [items],
  );
  useEffect(() => {
    if (!isToday) return;
    const interval = setInterval(() => {
      setLiveNow(new Date());
    }, 1_000);
    return () => clearInterval(interval);
  }, [isToday]);

  const nowMinutes = useMemo(
    () => minutesSinceMidnight(liveNow, timezone),
    [liveNow, timezone],
  );

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

  const getNaturalHeight = useCallback(
    (startDate: Date, endDate: Date): number => {
      const startMins = minutesSinceMidnight(startDate, timezone);
      const endMins = minutesSinceMidnight(endDate, timezone);
      const durationMins = Math.max(0, endMins - startMins);
      return durationMins * PIXELS_PER_MINUTE;
    },
    [timezone],
  );

  // Resolve block positions with overlap detection for side-by-side layout
  const resolvedPositions = useMemo(() => {
    // Step 1: Compute natural (unclamped, time-based) positions + visual
    // heights. Layout math (overlap, push-down, canvas height) uses
    // `naturalHeight`; rendering uses `visualHeight`.
    const natural: {
      top: number;
      naturalHeight: number;
      visualHeight: number;
      bottom: number;
      variant: "bar" | "normal";
    }[] = [];
    for (const item of filteredItems) {
      let startDate: Date;
      let endDate: Date;
      let isRunning = false;

      if (item.type === "entry") {
        startDate = item.data.startedAt;
        isRunning = item.data.isRunning;
        // For running entries, use the live-ticking `liveNow` so the block's
        // bottom edge stays glued to the current-time indicator.
        endDate = isRunning ? liveNow : (item.data.endedAt as Date);
      } else if (item.type === "cluster") {
        startDate = item.data.startedAt;
        endDate = item.data.endedAt;
      } else {
        startDate = item.data.startedAt;
        endDate = item.data.endedAt;
      }

      const top = getTop(startDate);
      const naturalHeight = getNaturalHeight(startDate, endDate);

      // Only regular entries (non-running, non-gap, non-cluster) qualify for
      // the bar-variant: clusters already summarize short entries, gaps have
      // their own MIN_GAP threshold, running entries live-grow.
      const isEntry = item.type === "entry";
      const isBar =
        isEntry && !isRunning && naturalHeight < BAR_THRESHOLD;

      let visualHeight: number;
      if (isBar) {
        visualHeight = BAR_HEIGHT;
      } else if (isRunning) {
        // Running entries skip the min-height clamp so their bottom edge stays
        // exactly at the "now" indicator line.
        visualHeight = naturalHeight;
      } else {
        visualHeight = Math.max(MIN_BLOCK_HEIGHT, naturalHeight);
      }

      natural.push({
        top,
        naturalHeight,
        visualHeight,
        bottom: top + naturalHeight,
        variant: isBar ? "bar" : "normal",
      });
    }
    // natural.forEach((pos, idx) => {
    //   console.log(
    //     `Item ${idx} (${items[idx].type}) natural position: top=${pos.top}, height=${pos.height}, bottom=${pos.bottom}`,
    //   );
    // });
    // Step 2: Find overlap groups among non-gap items only
    // Gaps are excluded — they represent untracked time and never overlap with entries
    const groupIndex = new Array<number>(filteredItems.length).fill(-1);
    let currentGroup = 0;

    for (let i = 0; i < filteredItems.length; i++) {
      // Skip gaps — they don't participate in overlap detection
      if (filteredItems[i].type === "gap") continue;

      if (groupIndex[i] === -1) {
        groupIndex[i] = currentGroup;
        let groupBottom = natural[i].bottom;

        for (let j = i + 1; j < filteredItems.length; j++) {
          if (filteredItems[j].type === "gap") continue;
          // if a block starts at the same time another block ends, consider that non-overlapping (hence the -1px tolerance)
          if (natural[j].top < groupBottom - 1) {
            groupIndex[j] = currentGroup;
            groupBottom = Math.max(groupBottom, natural[j].bottom);
          } else {
            break;
          }
        }
        currentGroup++;
      }
    }

    // Step 3: Within each group, assign columns using a greedy algorithm
    const columnAssignment = new Array<number>(filteredItems.length).fill(0);
    const totalColumnsPerGroup = new Map<number, number>();

    const groups = new Map<number, number[]>();
    for (let i = 0; i < filteredItems.length; i++) {
      if (groupIndex[i] === -1) continue; // gaps
      const g = groupIndex[i];
      if (!groups.has(g)) groups.set(g, []);
      groups.get(g)!.push(i);
    }

    for (const [g, members] of groups) {
      if (members.length === 1) {
        columnAssignment[members[0]] = 0;
        totalColumnsPerGroup.set(g, 1);
        continue;
      }

      const columnBottoms: number[] = [];
      for (const idx of members) {
        let placed = false;
        for (let col = 0; col < columnBottoms.length; col++) {
          if (natural[idx].top >= columnBottoms[col]) {
            columnAssignment[idx] = col;
            columnBottoms[col] = natural[idx].bottom;
            placed = true;
            break;
          }
        }
        if (!placed) {
          columnAssignment[idx] = columnBottoms.length;
          columnBottoms.push(natural[idx].bottom);
        }
      }

      totalColumnsPerGroup.set(g, columnBottoms.length);
    }

    // Step 4: Build final positions
    const positions: {
      top: number;
      height: number;
      columnIndex: number;
      totalColumns: number;
      variant: "bar" | "normal";
    }[] = [];

    let prevBottom = -Infinity;

    for (let i = 0; i < filteredItems.length; i++) {
      const { naturalHeight, visualHeight, variant } = natural[i];
      let top: number;
      let colIndex = 0;
      let totalCols = 1;

      if (filteredItems[i].type === "gap") {
        // Gaps always get full-width push-down layout
        top = Math.max(natural[i].top, prevBottom + BLOCK_GAP);
      } else {
        const g = groupIndex[i];
        totalCols = totalColumnsPerGroup.get(g) ?? 1;
        const isOverlapping = totalCols > 1;

        if (isOverlapping) {
          top = natural[i].top;
          colIndex = columnAssignment[i];
        } else {
          top = Math.max(natural[i].top, prevBottom + BLOCK_GAP);
        }
      }

      // Push-down always uses VISUAL bottom so a later block never visually
      // collides with a clamped predecessor. Overlap/column detection is a
      // separate pass (uses natural bounds) so this doesn't reintroduce the
      // false-columns bug.
      prevBottom = Math.max(prevBottom, top + visualHeight);

      positions.push({
        top,
        height: visualHeight,
        columnIndex: colIndex,
        totalColumns: totalCols,
        variant,
      });
    }

    return positions;
  }, [filteredItems, getTop, getNaturalHeight, liveNow]);

  // Canvas height: max of time-based height and last block's visual bottom.
  // We max across all items (not just the last) because a bar-variant item
  // may be the last-positioned but have a smaller visual bottom than a
  // naturally taller earlier block.
  const lastBottom = resolvedPositions.reduce(
    (acc, p) => Math.max(acc, p.top + p.height),
    0,
  );
  const resolvedCanvasHeight = Math.max(canvasHeight, lastBottom);

  // Current time indicator position
  const nowTop = isToday
    ? (nowMinutes - rangeStartMinutes) * PIXELS_PER_MINUTE
    : -1;
  const showNowIndicator =
    isToday && nowTop >= 0 && nowTop <= resolvedCanvasHeight;

  // Find the running entry (if any) — surfaced as an ActiveSessionChip pinned
  // to the now-indicator instead of as a regular timeline block.
  const runningEntry = useMemo(() => {
    if (!isToday) return null;
    for (const item of items) {
      if (item.type === "entry" && item.data.isRunning) {
        return item.data;
      }
    }
    return null;
  }, [items, isToday]);

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
      {filteredItems.map((item, index) => {
        const { top, height, columnIndex, totalColumns, variant } =
          resolvedPositions[index];

        if (item.type === "entry") {
          const e = item.data;
          // Running entries are surfaced as an ActiveSessionChip pinned to the
          // now-indicator below — skip rendering them as a regular block.
          if (e.isRunning) return null;
          const entryStyle =
            totalColumns > 1
              ? getColumnStyle(totalColumns, columnIndex)
              : { left: BLOCK_LEFT, right: SPACING.lg };
          // Bar variant renders under normal blocks so any visual overflow
          // from the min tap-target height is covered by the following block.
          const zIndex = variant === "bar" ? 1 : 5;
          return (
            <View
              key={e.id}
              style={[styles.blockWrapper, { top, height, zIndex }, entryStyle]}
            >
              <TimelineBlock
                activityName={e.activityName}
                categoryName={e.categoryName}
                categoryColor={e.categoryColor}
                categoryIcon={e.categoryIcon}
                durationSeconds={e.durationSeconds}
                note={e.note}
                isRunning={e.isRunning}
                continuesBefore={e.continuesBefore}
                continuesAfter={e.continuesAfter}
                height={height}
                variant={variant}
                onPress={() => onEntryPress(e.id)}
              />
            </View>
          );
        }

        if (item.type === "cluster") {
          const c = item.data;
          const isExpanded = expandedClusterIndex === index;
          const clusterPosStyle =
            totalColumns > 1
              ? getColumnStyle(totalColumns, columnIndex)
              : { left: BLOCK_LEFT, right: SPACING.lg };
          return (
            <View
              key={`cluster-${index}`}
              style={[
                styles.blockWrapper,
                {
                  top,
                  minHeight: height,
                  zIndex: isExpanded ? 20 : 5,
                },
                clusterPosStyle,
              ]}
            >
              <ClusterBlock
                cluster={c}
                height={height}
                expanded={isExpanded}
                compact={totalColumns > 1}
                onToggle={() =>
                  setExpandedClusterIndex(isExpanded ? null : index)
                }
                onEntryPress={onEntryPress}
              />
            </View>
          );
        }

        // Gap — always full width
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

      {/* Active session chip — attached to the now-indicator line. Starts
          below the line, and flips above once the running session has
          accumulated enough elapsed pixels to fit without overlap. */}
      {showNowIndicator &&
        runningEntry &&
        (() => {
          const elapsedPixels =
            ((liveNow.getTime() - runningEntry.startedAt.getTime()) / 60_000) *
            PIXELS_PER_MINUTE;
          const fitsAbove = elapsedPixels >= ACTIVE_CHIP_HEIGHT;
          const chipTop = fitsAbove ? nowTop - elapsedPixels : nowTop;
          return (
            <View style={[styles.activeChipWrapper, { top: chipTop }]}>
              <ActiveSessionChip
                activityName={runningEntry.activityName}
                categoryName={runningEntry.categoryName}
                categoryColor={runningEntry.categoryColor}
                categoryIcon={runningEntry.categoryIcon}
                startedAt={runningEntry.startedAt}
                elapsedPixels={elapsedPixels}
                liveNow={liveNow}
                attachment={fitsAbove ? "bottom" : "top"}
                onPress={() => onEntryPress(runningEntry.id)}
              />
            </View>
          );
        })()}
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
    // Must render above every block variant, including clamped/bar blocks
    // whose visual extends past the block's real end time.
    zIndex: 30,
  },
  activeChipWrapper: {
    position: "absolute",
    left: BLOCK_LEFT,
    right: SPACING.lg,
    // Render below the now-indicator so the indicator line visually becomes
    // the chip's attached-edge border where they meet.
    zIndex: 9,
  },
});
