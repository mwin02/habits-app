import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '@/constants/theme';
import { getCurrentTimezone, getTodayDate } from '@/lib/timezone';

interface WeekStripProps {
  selectedDate: string; // YYYY-MM-DD
  onDateChange: (date: string) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayInfo {
  dateStr: string; // YYYY-MM-DD
  dayOfMonth: number;
  dayLabel: string;
  isSelected: boolean;
  isToday: boolean;
  isFuture: boolean;
}

/** Get Monday of the week containing the given date */
function getMondayOfWeek(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day, 12);
  const dow = date.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  date.setDate(date.getDate() + mondayOffset);
  return date;
}

/** Format a Date as YYYY-MM-DD */
function toDateStr(date: Date): string {
  return date.toLocaleDateString('en-CA'); // en-CA → YYYY-MM-DD
}

export function WeekStrip({ selectedDate, onDateChange }: WeekStripProps): React.ReactElement {
  const timezone = getCurrentTimezone();
  const today = getTodayDate(timezone);

  const days: DayInfo[] = useMemo(() => {
    const monday = getMondayOfWeek(selectedDate);
    return DAY_LABELS.map((label, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = toDateStr(d);
      return {
        dateStr,
        dayOfMonth: d.getDate(),
        dayLabel: label,
        isSelected: dateStr === selectedDate,
        isToday: dateStr === today,
        isFuture: dateStr > today,
      };
    });
  }, [selectedDate, today]);

  return (
    <View style={styles.container}>
      {days.map((day) => (
        <Pressable
          key={day.dateStr}
          onPress={() => !day.isFuture && onDateChange(day.dateStr)}
          disabled={day.isFuture}
          style={styles.dayCell}
        >
          <Text
            style={[
              styles.dayLabel,
              day.isSelected && styles.dayLabelSelected,
              day.isFuture && styles.dayLabelFuture,
            ]}
          >
            {day.dayLabel}
          </Text>

          {day.isSelected ? (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.selectedCircle}
            >
              <Text style={styles.dayNumberSelected}>{day.dayOfMonth}</Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.dayNumberContainer,
                day.isToday && styles.todayRing,
                day.isFuture && styles.dayFuture,
              ]}
            >
              <Text
                style={[
                  styles.dayNumber,
                  day.isFuture && styles.dayNumberFuture,
                ]}
              >
                {day.dayOfMonth}
              </Text>
            </View>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const CELL_SIZE = 44;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING['2xl'],
  },
  dayCell: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dayLabel: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    textTransform: 'uppercase',
    color: COLORS.onSurfaceVariant + '99', // 60% opacity
    letterSpacing: 1,
  },
  dayLabelSelected: {
    color: COLORS.primary,
  },
  dayLabelFuture: {
    opacity: 0.4,
  },
  selectedCircle: {
    width: CELL_SIZE + 4,
    height: CELL_SIZE + 4,
    borderRadius: (CELL_SIZE + 4) / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dayNumberSelected: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: '#ffffff',
  },
  dayNumberContainer: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayRing: {
    borderWidth: 2,
    borderColor: COLORS.primaryContainer,
    borderRadius: CELL_SIZE / 2,
  },
  dayNumber: {
    fontFamily: 'Manrope_700Bold',
    fontSize: 16,
    color: COLORS.onSurface,
  },
  dayFuture: {
    opacity: 0.4,
  },
  dayNumberFuture: {
    color: COLORS.onSurfaceVariant,
  },
});
