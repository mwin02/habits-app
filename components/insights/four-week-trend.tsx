import { COLORS, FONTS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import {
  useFourWeekTrend,
  type CategoryTrend,
} from "@/hooks/useFourWeekTrend";
import { formatDuration } from "@/lib/timezone";
import React, { useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, { Circle, Polyline } from "react-native-svg";

interface FourWeekTrendProps {
  monthDate: string;
}

const SPARK_HEIGHT = 44;
const SPARK_PADDING_Y = 4;
const COLUMN_GAP = SPACING.md;

export function FourWeekTrend({
  monthDate,
}: FourWeekTrendProps): React.ReactElement | null {
  const { buckets, categories, maxBucketSeconds, isLoading } =
    useFourWeekTrend(monthDate);
  const [gridWidth, setGridWidth] = useState(0);

  if (isLoading) return null;

  const hasData = categories.length > 0 && maxBucketSeconds > 0;
  const cardWidth =
    gridWidth > 0 ? Math.floor((gridWidth - COLUMN_GAP) / 2) : 0;

  const onGridLayout = (e: LayoutChangeEvent): void => {
    setGridWidth(e.nativeEvent.layout.width);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>WEEKLY TREND</Text>
      <Text style={styles.subtitle}>
        {hasData
          ? `Top categories across ${buckets.length} week${buckets.length === 1 ? "" : "s"}`
          : "No tracked time this month"}
      </Text>

      {hasData && (
        <View style={styles.grid} onLayout={onGridLayout}>
          {cardWidth > 0 &&
            categories.map((cat) => (
              <SparkCard
                key={cat.category.id}
                trend={cat}
                maxSeconds={maxBucketSeconds}
                bucketLabels={buckets.map((b) => b.label)}
                width={cardWidth}
              />
            ))}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────

interface SparkCardProps {
  trend: CategoryTrend;
  maxSeconds: number;
  bucketLabels: string[];
  width: number;
}

function SparkCard({
  trend,
  maxSeconds,
  bucketLabels,
  width,
}: SparkCardProps): React.ReactElement {
  const { values, category } = trend;
  const n = values.length;
  const stepX = n > 1 ? width / (n - 1) : 0;
  const innerHeight = SPARK_HEIGHT - SPARK_PADDING_Y * 2;

  const points: { x: number; y: number }[] = values.map((v, i) => {
    const frac = maxSeconds > 0 ? v / maxSeconds : 0;
    return {
      x: n > 1 ? i * stepX : width / 2,
      y: SPARK_PADDING_Y + innerHeight * (1 - frac),
    };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <View style={[styles.card, { width }]}>
      <View style={styles.cardHeader}>
        <View
          style={[styles.colorDot, { backgroundColor: category.color }]}
        />
        <Text style={styles.categoryName} numberOfLines={1}>
          {category.name}
        </Text>
      </View>
      <Text style={styles.totalLabel}>
        <Text style={styles.totalPrefix}>Month total </Text>
        {formatDuration(trend.totalSeconds)}
      </Text>

      <Svg
        width={width}
        height={SPARK_HEIGHT}
        accessibilityLabel={`${category.name} per week`}
      >
        {points.length > 1 && (
          <Polyline
            points={polylinePoints}
            fill="none"
            stroke={category.color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        {points.map((p, i) => (
          <Circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={2}
            fill={category.color}
          />
        ))}
      </Svg>

      <View style={[styles.axisRow, { width }]}>
        {bucketLabels.map((label, i) => (
          <Text
            key={label}
            style={[
              styles.axisLabel,
              i === 0
                ? styles.axisLabelStart
                : i === bucketLabels.length - 1
                  ? styles.axisLabelEnd
                  : styles.axisLabelMid,
            ]}
          >
            {label}
          </Text>
        ))}
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: COLUMN_GAP,
    rowGap: SPACING.lg,
  },
  card: {
    gap: SPACING.xs,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  categoryName: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurface,
    flex: 1,
  },
  totalLabel: {
    fontFamily: FONTS.jakartaSemiBold,
    fontSize: 12,
    lineHeight: 16,
    color: COLORS.onSurface,
  },
  totalPrefix: {
    fontFamily: FONTS.jakartaRegular,
    color: COLORS.onSurfaceVariant,
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  axisLabel: {
    fontFamily: FONTS.jakartaMedium,
    fontSize: 10,
    lineHeight: 14,
    color: COLORS.onSurfaceVariant,
  },
  axisLabelStart: {
    textAlign: "left",
  },
  axisLabelMid: {
    textAlign: "center",
  },
  axisLabelEnd: {
    textAlign: "right",
  },
});
