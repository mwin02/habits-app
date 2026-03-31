import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '@/constants/theme';
import { getCurrentTimezone, getTodayDate } from '@/lib/timezone';

interface DateHeaderProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

/** Format YYYY-MM-DD into a display string like "March 31" */
function formatDisplayDate(dateStr: string): string {
  // Parse as local date (avoid timezone shift by using noon)
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

/** Get the label above the date ("TODAY", or weekday name for past dates) */
function getDateLabel(dateStr: string): string {
  const timezone = getCurrentTimezone();
  const today = getTodayDate(timezone);
  if (dateStr === today) return 'Today';

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/** Add days to a YYYY-MM-DD string */
function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  date.setDate(date.getDate() + days);
  return date.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD
}

export function DateHeader({ selectedDate, onDateChange }: DateHeaderProps): React.ReactElement {
  const timezone = getCurrentTimezone();
  const today = getTodayDate(timezone);
  const isFuture = selectedDate >= today;

  const goBack = useCallback(() => {
    onDateChange(addDays(selectedDate, -1));
  }, [selectedDate, onDateChange]);

  const goForward = useCallback(() => {
    if (!isFuture) {
      onDateChange(addDays(selectedDate, 1));
    }
  }, [selectedDate, onDateChange, isFuture]);

  return (
    <View style={styles.container}>
      <View>
        <Text style={styles.label}>{getDateLabel(selectedDate)}</Text>
        <Text style={styles.date}>{formatDisplayDate(selectedDate)}</Text>
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
          disabled={isFuture}
          style={({ pressed }) => [
            styles.arrowButton,
            isFuture && styles.arrowDisabled,
            pressed && !isFuture && styles.arrowPressed,
          ]}
        >
          <Feather name="chevron-right" size={20} color={isFuture ? COLORS.outlineVariant : COLORS.primary} />
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
  date: {
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
