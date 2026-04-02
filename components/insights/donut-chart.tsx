import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONTS, TYPOGRAPHY } from '@/constants/theme';

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface DonutSlice {
  value: number;
  color: string;
}

interface DonutChartProps {
  /** Data slices — values don't need to sum to 100, will be normalized */
  slices: DonutSlice[];
  /** Outer diameter of the chart */
  size?: number;
  /** Width of the donut ring */
  strokeWidth?: number;
  /** Text to show in the center (e.g., total time) */
  centerLabel?: string;
  /** Smaller text below the center label */
  centerSubLabel?: string;
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/** Minimum angular gap between slices (in degrees) for visual separation */
const SLICE_GAP_DEGREES = 2;

/**
 * Convert polar coordinates to cartesian SVG point.
 */
function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleDegrees: number,
): { x: number; y: number } {
  const angleRad = ((angleDegrees - 90) * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

/**
 * Generate an SVG arc path for a donut slice.
 */
function describeArc(
  cx: number,
  cy: number,
  outerRadius: number,
  innerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  const outerStart = polarToCartesian(cx, cy, outerRadius, endAngle);
  const outerEnd = polarToCartesian(cx, cy, outerRadius, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerRadius, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerRadius, startAngle);

  const arcSweep = endAngle - startAngle <= 180 ? 0 : 1;

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${arcSweep} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${arcSweep} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export function DonutChart({
  slices,
  size = 180,
  strokeWidth = 28,
  centerLabel,
  centerSubLabel,
}: DonutChartProps): React.ReactElement {
  const cx = size / 2;
  const cy = size / 2;
  const outerRadius = (size - 4) / 2; // small padding for anti-aliasing
  const innerRadius = outerRadius - strokeWidth;

  const total = slices.reduce((sum, s) => sum + s.value, 0);

  // Build arc paths
  const paths: { d: string; color: string }[] = [];

  if (total > 0 && slices.length > 0) {
    // Total gap in degrees
    const totalGap = slices.length > 1 ? SLICE_GAP_DEGREES * slices.length : 0;
    const availableDegrees = 360 - totalGap;

    let currentAngle = 0;

    for (const slice of slices) {
      const sliceDegrees = (slice.value / total) * availableDegrees;

      // Skip negligible slices
      if (sliceDegrees < 0.5) {
        currentAngle += sliceDegrees + (slices.length > 1 ? SLICE_GAP_DEGREES : 0);
        continue;
      }

      const startAngle = currentAngle;
      // Cap at 359.99 to avoid the arc collapsing when start === end
      const endAngle = currentAngle + Math.min(sliceDegrees, 359.99);

      paths.push({
        d: describeArc(cx, cy, outerRadius, innerRadius, startAngle, endAngle),
        color: slice.color,
      });

      currentAngle = endAngle + (slices.length > 1 ? SLICE_GAP_DEGREES : 0);
    }
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background ring (visible when no data or for visual base) */}
        {total === 0 && (
          <Path
            d={describeArc(cx, cy, outerRadius, innerRadius, 0, 359.99)}
            fill={COLORS.surfaceContainer}
          />
        )}
        {/* Data slices */}
        {paths.map((path, i) => (
          <Path key={i} d={path.d} fill={path.color} />
        ))}
      </Svg>

      {/* Center text overlay */}
      {(centerLabel != null || centerSubLabel != null) && (
        <View style={styles.centerOverlay}>
          {centerLabel != null && (
            <Text style={styles.centerLabel}>{centerLabel}</Text>
          )}
          {centerSubLabel != null && (
            <Text style={styles.centerSubLabel}>{centerSubLabel}</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontFamily: FONTS.manropeBold,
    fontSize: 18,
    lineHeight: 22,
    color: COLORS.onSurface,
  },
  centerSubLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
    marginTop: 2,
  },
});
