import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import {
  useWeekOverWeekDelta,
  type WeekOverWeekRow,
} from "@/hooks/useWeekOverWeekDelta";
import { formatDuration } from "@/lib/timezone";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface WeekOverWeekDeltaProps {
  weekDate: string;
}

export function WeekOverWeekDelta({
  weekDate,
}: WeekOverWeekDeltaProps): React.ReactElement | null {
  const { rows, isLoading } = useWeekOverWeekDelta(weekDate);

  if (isLoading) return null;

  const hasData = rows.some(
    (r) => r.thisWeekSeconds > 0 || r.lastWeekSeconds > 0,
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>WEEK-OVER-WEEK</Text>
      <Text style={styles.subtitle}>
        {hasData ? "This week vs last week" : "No tracked time this week or last"}
      </Text>

      {hasData && (
        <View style={styles.list}>
          {rows.map((row) => (
            <DeltaRow key={row.categoryId} row={row} />
          ))}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────

interface DeltaPillStyle {
  bg: string;
  fg: string;
  symbol: string;
}

/** Threshold below which we treat the delta as "no change" (1 minute). */
const NO_CHANGE_THRESHOLD_SECONDS = 60;

function getDeltaStyle(deltaSeconds: number): DeltaPillStyle {
  if (Math.abs(deltaSeconds) < NO_CHANGE_THRESHOLD_SECONDS) {
    return {
      bg: COLORS.surfaceContainer,
      fg: COLORS.onSurfaceVariant,
      symbol: "—",
    };
  }
  if (deltaSeconds > 0) {
    return {
      bg: COLORS.secondaryContainer,
      fg: COLORS.onSecondaryContainer,
      symbol: "▲",
    };
  }
  return {
    bg: COLORS.tertiaryContainer,
    fg: COLORS.onTertiaryContainer,
    symbol: "▼",
  };
}

function DeltaRow({ row }: { row: WeekOverWeekRow }): React.ReactElement {
  const isNewThisWeek =
    row.lastWeekSeconds < NO_CHANGE_THRESHOLD_SECONDS &&
    row.thisWeekSeconds >= NO_CHANGE_THRESHOLD_SECONDS;
  const isDroppedThisWeek =
    row.thisWeekSeconds < NO_CHANGE_THRESHOLD_SECONDS &&
    row.lastWeekSeconds >= NO_CHANGE_THRESHOLD_SECONDS;

  let pill: DeltaPillStyle;
  let deltaLabel: string;
  if (isNewThisWeek) {
    pill = {
      bg: COLORS.secondaryContainer,
      fg: COLORS.onSecondaryContainer,
      symbol: "✦",
    };
    deltaLabel = "new";
  } else if (isDroppedThisWeek) {
    pill = {
      bg: COLORS.tertiaryContainer,
      fg: COLORS.onTertiaryContainer,
      symbol: "○",
    };
    deltaLabel = "none this week";
  } else {
    pill = getDeltaStyle(row.deltaSeconds);
    const absSeconds = Math.abs(row.deltaSeconds);
    deltaLabel =
      pill.symbol === "—"
        ? "no change"
        : `${pill.symbol} ${formatDuration(absSeconds)}`;
  }

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <View
          style={[styles.colorDot, { backgroundColor: row.categoryColor }]}
        />
        <Text style={styles.categoryName} numberOfLines={1}>
          {row.categoryName}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.thisWeek}>
          {formatDuration(row.thisWeekSeconds)}
        </Text>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}>
          <Text style={[styles.pillText, { color: pill.fg }]}>
            {deltaLabel}
          </Text>
        </View>
      </View>
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
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.lg,
  },
  list: {
    gap: SPACING.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.md,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
    minWidth: 0,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  categoryName: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  thisWeek: {
    fontFamily: FONTS.jakartaMedium,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.onSurfaceVariant,
  },
  pill: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    minWidth: 72,
    alignItems: "center",
  },
  pillText: {
    fontFamily: FONTS.jakartaSemiBold,
    fontSize: 12,
    lineHeight: 16,
  },
});
