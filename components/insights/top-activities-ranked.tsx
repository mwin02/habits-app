import { CategoryChip } from "@/components/common/category-chip";
import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { useTopActivities, type TopActivity } from "@/hooks/useTopActivities";
import { formatDuration } from "@/lib/timezone";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface TopActivitiesRankedProps {
  monthDate: string;
}

export function TopActivitiesRanked({
  monthDate,
}: TopActivitiesRankedProps): React.ReactElement | null {
  const { activities, topSeconds, isLoading } = useTopActivities(monthDate);

  if (isLoading) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>TOP ACTIVITIES</Text>
      <Text style={styles.subtitle}>
        {activities.length > 0
          ? `Most tracked this month (top ${activities.length})`
          : "No tracked time this month"}
      </Text>

      {activities.length > 0 && (
        <View style={styles.list}>
          {activities.map((activity, index) => (
            <ActivityRow
              key={activity.activityId}
              activity={activity}
              rank={index + 1}
              topSeconds={topSeconds}
            />
          ))}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────

interface ActivityRowProps {
  activity: TopActivity;
  rank: number;
  topSeconds: number;
}

function ActivityRow({
  activity,
  rank,
  topSeconds,
}: ActivityRowProps): React.ReactElement {
  const fillFraction =
    topSeconds > 0 ? Math.max(0.02, activity.totalSeconds / topSeconds) : 0;

  return (
    <View style={styles.row}>
      <View style={styles.rankCol}>
        <Text style={styles.rank}>{rank}</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text style={styles.activityName} numberOfLines={1}>
            {activity.activityName}
          </Text>
          <Text style={styles.duration}>
            {formatDuration(activity.totalSeconds)}
          </Text>
        </View>

        <View style={styles.barTrack}>
          <View
            style={[
              styles.barFill,
              {
                width: `${fillFraction * 100}%`,
                backgroundColor: activity.categoryColor,
              },
            ]}
          />
        </View>

        <View style={styles.chipRow}>
          <CategoryChip
            name={activity.categoryName}
            color={activity.categoryColor}
          />
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
    gap: SPACING.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  rankCol: {
    width: 24,
    alignItems: "center",
    paddingTop: 2,
  },
  rank: {
    fontFamily: FONTS.manropeBold,
    fontSize: 16,
    lineHeight: 22,
    color: COLORS.onSurfaceVariant,
    fontVariant: ["tabular-nums"],
  },
  content: {
    flex: 1,
    gap: SPACING.xs,
    minWidth: 0,
  },
  topLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  activityName: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    flex: 1,
  },
  duration: {
    fontFamily: FONTS.jakartaSemiBold,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.onSurface,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceContainer,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  chipRow: {
    flexDirection: "row",
    marginTop: SPACING.xs,
  },
});
