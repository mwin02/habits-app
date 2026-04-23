import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import {
  useDayOfWeekBreakdown,
  type DayOfWeekBucket,
} from "@/hooks/useDayOfWeekBreakdown";
import { formatDuration } from "@/lib/timezone";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

interface DayOfWeekBarsProps {
  weekDate: string; // YYYY-MM-DD — any day in the target week
}

type Mode = "bars" | "timeline";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const BAR_HEIGHT = 140;

export function DayOfWeekBars({
  weekDate,
}: DayOfWeekBarsProps): React.ReactElement | null {
  const { days, maxSeconds, legend, isLoading } =
    useDayOfWeekBreakdown(weekDate);
  const [mode, setMode] = useState<Mode>("bars");

  if (isLoading) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.sectionLabel}>DAY-OF-WEEK PATTERN</Text>
          <Text style={styles.subtitle}>
            {maxSeconds > 0
              ? mode === "bars"
                ? `Busiest day: ${formatDuration(maxSeconds)}`
                : "Week Recap"
              : "No tracked time"}
          </Text>
        </View>

        <ModeToggle mode={mode} onChange={setMode} />
      </View>

      <View style={styles.barsRow}>
        {days.map((day) =>
          mode === "bars" ? (
            <BarsColumn key={day.dayIndex} day={day} maxSeconds={maxSeconds} />
          ) : (
            <TimelineColumn key={day.dayIndex} day={day} />
          ),
        )}
      </View>

      {legend.length > 0 && (
        <View style={styles.legend}>
          {legend.map((cat) => (
            <View key={cat.id} style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: cat.color }]}
              />
              <Text style={styles.legendText}>{cat.name}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}): React.ReactElement {
  return (
    <View style={styles.modeToggle}>
      {(["bars", "timeline"] as Mode[]).map((m) => {
        const isActive = m === mode;
        return (
          <Pressable
            key={m}
            onPress={() => onChange(m)}
            style={({ pressed }) => [
              styles.modePill,
              isActive && styles.modePillActive,
              pressed && !isActive && styles.modePillPressed,
            ]}
          >
            <Text
              style={[
                styles.modePillText,
                isActive && styles.modePillTextActive,
              ]}
            >
              {m === "bars" ? "Bars" : "Timeline"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// ──────────────────────────────────────────────

function BarsColumn({
  day,
  maxSeconds,
}: {
  day: DayOfWeekBucket;
  maxSeconds: number;
}): React.ReactElement {
  const heightFraction = maxSeconds > 0 ? day.totalSeconds / maxSeconds : 0;
  const barHeight = heightFraction * BAR_HEIGHT;

  return (
    <View style={styles.barColumn}>
      <View style={styles.barTrack}>
        <View style={[styles.bar, { height: barHeight }]}>
          {day.segments.map((seg, idx) => {
            const segFraction =
              day.totalSeconds > 0 ? seg.seconds / day.totalSeconds : 0;
            return (
              <View
                key={`${seg.category.id}-${idx}`}
                style={{
                  height: `${segFraction * 100}%`,
                  backgroundColor: seg.category.color,
                }}
              />
            );
          })}
        </View>
      </View>
      <Text style={styles.dayLabel}>{DAY_LABELS[day.dayIndex]}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────

function TimelineColumn({ day }: { day: DayOfWeekBucket }): React.ReactElement {
  return (
    <View style={styles.barColumn}>
      <View style={styles.timelineTrack}>
        {day.hours.map((h) => {
          const color = h.dominant?.color ?? "transparent";
          const opacity =
            h.dominant == null
              ? 0
              : Math.max(0.35, Math.min(1, h.coveredFraction));
          return (
            <View
              key={h.hour}
              style={{ flex: 1, backgroundColor: color, opacity }}
            />
          );
        })}
      </View>
      <Text style={styles.dayLabel}>{DAY_LABELS[day.dayIndex]}</Text>
    </View>
  );
}

// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    padding: SPACING["2xl"],
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.lg,
    gap: SPACING.md,
  },
  titleBlock: {
    flex: 1,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.full,
    padding: 3,
  },
  modePill: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  modePillActive: {
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  modePillPressed: {
    opacity: 0.6,
  },
  modePillText: {
    fontFamily: FONTS.jakartaSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.onSurfaceVariant,
  },
  modePillTextActive: {
    color: COLORS.primary,
  },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: SPACING.xs,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
  },
  barTrack: {
    width: "100%",
    height: BAR_HEIGHT,
    justifyContent: "flex-end",
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
  },
  bar: {
    width: "100%",
    flexDirection: "column-reverse",
    overflow: "hidden",
  },
  timelineTrack: {
    width: "100%",
    height: BAR_HEIGHT,
    flexDirection: "column",
    backgroundColor: COLORS.surfaceContainer,
    borderRadius: RADIUS.sm,
    overflow: "hidden",
  },
  dayLabel: {
    fontFamily: FONTS.jakartaMedium,
    fontSize: 11,
    lineHeight: 14,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurface,
  },
});
