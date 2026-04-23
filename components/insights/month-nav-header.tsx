import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { getCurrentTimezone, getTodayDate } from '@/lib/timezone';

interface MonthNavHeaderProps {
  selectedDate: string; // YYYY-MM-DD — any day in the target month
  onDateChange: (date: string) => void;
}

function getFirstOfMonth(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  const mm = String(m).padStart(2, '0');
  return `${y}-${mm}-01`;
}

function addMonths(dateStr: string, delta: number): string {
  const [y, m] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1 + delta, 1, 12);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${yy}-${mm}-01`;
}

function formatMonthLabel(dateStr: string): string {
  const [y, m] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, 1, 12).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

export function MonthNavHeader({
  selectedDate,
  onDateChange,
}: MonthNavHeaderProps): React.ReactElement {
  const firstOfSelected = getFirstOfMonth(selectedDate);
  const firstOfToday = getFirstOfMonth(getTodayDate(getCurrentTimezone()));
  const isCurrentMonth = firstOfSelected >= firstOfToday;

  const goBack = useCallback(() => {
    onDateChange(addMonths(selectedDate, -1));
  }, [selectedDate, onDateChange]);

  const goForward = useCallback(() => {
    if (!isCurrentMonth) onDateChange(addMonths(selectedDate, 1));
  }, [selectedDate, onDateChange, isCurrentMonth]);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.label}>Month</Text>
        <Text style={styles.monthLabel}>{formatMonthLabel(firstOfSelected)}</Text>
      </View>
      <View style={styles.arrowPill}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [styles.arrowButton, pressed && styles.arrowPressed]}
        >
          <Feather name="chevron-left" size={20} color={COLORS.primary} />
        </Pressable>
        <Pressable
          onPress={goForward}
          disabled={isCurrentMonth}
          style={({ pressed }) => [
            styles.arrowButton,
            isCurrentMonth && styles.arrowDisabled,
            pressed && !isCurrentMonth && styles.arrowPressed,
          ]}
        >
          <Feather
            name="chevron-right"
            size={20}
            color={isCurrentMonth ? COLORS.outlineVariant : COLORS.primary}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  label: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.xs,
  },
  monthLabel: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  arrowPill: {
    flexDirection: 'row',
    gap: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    padding: 4,
    borderRadius: RADIUS.full,
  },
  arrowButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowPressed: {
    backgroundColor: COLORS.surfaceContainer,
  },
  arrowDisabled: {
    opacity: 0.4,
  },
});
