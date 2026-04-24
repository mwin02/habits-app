import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { CategoryInsight } from "@/db/models";
import { formatDuration } from "@/lib/timezone";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

interface ActualVsIdealProps {
  categoryInsights: CategoryInsight[];
}

export function ActualVsIdeal({
  categoryInsights,
}: ActualVsIdealProps): React.ReactElement {
  const router = useRouter();
  // Only show categories that have an ideal allocation set
  const withTargets = categoryInsights.filter((c) => c.targetMinutes != null);

  const openSettings = useCallback(() => {
    router.push("/ideal-allocations");
  }, [router]);

  const Header = (
    <View style={styles.headerRow}>
      <Text style={styles.sectionLabel}>ACTUAL VS IDEAL</Text>
      <Pressable
        onPress={openSettings}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Set ideal allocations"
        style={({ pressed }) => [
          styles.gearButton,
          pressed && styles.gearButtonPressed,
        ]}
      >
        <Feather name="settings" size={16} color={COLORS.onSurfaceVariant} />
      </Pressable>
    </View>
  );

  if (withTargets.length === 0) {
    return (
      <View style={styles.container}>
        {Header}
        <Text style={styles.emptyText}>
          Set daily goals for your categories to see how you compare.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {Header}

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendActual]} />
          <Text style={styles.legendText}>Actual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendIdeal]} />
          <Text style={styles.legendText}>Goal</Text>
        </View>
      </View>

      <View style={styles.rowsContainer}>
        {withTargets.map((insight) => (
          <ComparisonRow key={insight.categoryId} insight={insight} />
        ))}
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────

interface ComparisonRowProps {
  insight: CategoryInsight;
}

function ComparisonRow({ insight }: ComparisonRowProps): React.ReactElement {
  const actual = insight.actualMinutes;
  const target = insight.targetMinutes ?? 0;
  const diff = insight.differenceMinutes ?? 0;

  // Scale bars relative to the larger of actual or target
  const maxVal = Math.max(actual, target, 1);
  const actualPercent = (actual / maxVal) * 100;
  const targetPercent = (target / maxVal) * 100;

  const animatedActual = useRef(new Animated.Value(0)).current;
  const animatedTarget = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(animatedActual, {
        toValue: actualPercent,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(animatedTarget, {
        toValue: targetPercent,
        duration: 600,
        useNativeDriver: false,
      }),
    ]).start();
  }, [actualPercent, targetPercent, animatedActual, animatedTarget]);

  // Color depends on the goal's direction.
  //   at_least → green when actual ≥ target − 10% (floor, overshoot is fine)
  //   at_most  → green when actual ≤ target + 10% (cap, undershoot is fine)
  //   around   → green when |actual − target| ≤ 10% of target (symmetric)
  // Target of 0 only counts as on-goal when actual is also exactly 0.
  const tolerance = target > 0 ? target * 0.1 : 0;
  const direction = insight.goalDirection ?? "around";
  let onGoal: boolean;
  if (direction === "at_least") {
    onGoal = actual >= target - tolerance;
  } else if (direction === "at_most") {
    onGoal = actual <= target + tolerance;
  } else {
    onGoal = Math.abs(diff) <= tolerance;
  }
  const diffColor = onGoal ? COLORS.secondary : COLORS.error;
  const diffPrefix = diff > 0 ? "+" : "-";

  return (
    <View style={styles.comparisonRow}>
      {/* Category name + difference badge */}
      <View style={styles.comparisonHeader}>
        <View style={styles.categoryLabelRow}>
          <View
            style={[
              styles.colorDot,
              { backgroundColor: insight.categoryColor },
            ]}
          />
          <Text style={styles.categoryName} numberOfLines={1}>
            {insight.categoryName}
          </Text>
        </View>
        <View style={[styles.diffBadge, { backgroundColor: diffColor + "1A" }]}>
          <Text style={[styles.diffText, { color: diffColor }]}>
            {diffPrefix}
            {formatDuration(Math.abs(diff) * 60)}
          </Text>
        </View>
      </View>

      {/* Actual bar */}
      <View style={styles.barPair}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              {
                backgroundColor: insight.categoryColor,
                width: animatedActual.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.barValue}>{formatDuration(actual * 60)}</Text>
      </View>

      {/* Target bar */}
      <View style={styles.barPair}>
        <View style={styles.barTrack}>
          <Animated.View
            style={[
              styles.barFill,
              styles.targetBar,
              {
                width: animatedTarget.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.barValue}>{formatDuration(target * 60)}</Text>
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
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  gearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  gearButtonPressed: {
    backgroundColor: COLORS.surfaceContainer,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  // Legend
  legendRow: {
    flexDirection: "row",
    gap: SPACING.lg,
    marginBottom: SPACING.xl,
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
  legendActual: {
    backgroundColor: COLORS.primary,
  },
  legendIdeal: {
    backgroundColor: COLORS.outlineVariant,
  },
  legendText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
  rowsContainer: {
    gap: SPACING.xl,
  },
  // Comparison row
  comparisonRow: {
    gap: SPACING.sm,
  },
  comparisonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  categoryLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
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
  diffBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  diffText: {
    fontFamily: FONTS.jakartaSemiBold,
    fontSize: 11,
    lineHeight: 16,
  },
  // Bars
  barPair: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.surfaceContainer,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
  targetBar: {
    backgroundColor: COLORS.outlineVariant,
  },
  barValue: {
    fontFamily: FONTS.jakartaMedium,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.onSurfaceVariant,
    minWidth: 40,
    textAlign: "right",
  },
});
