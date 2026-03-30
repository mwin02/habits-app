import { CategoryIcon } from "@/components/common/category-icon";
import { TimerCard } from "@/components/timer/timer-card";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { useTimer } from "@/hooks/useTimer";
import { useQuery } from "@powersync/react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface ActivityRow {
  id: string;
  name: string;
  category_name: string;
  category_color: string;
  category_icon: string;
}

const ACTIVITIES_QUERY = `
  SELECT
    a.id,
    a.name,
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon
  FROM activities a
  JOIN categories c ON c.id = a.category_id
  WHERE a.is_archived = 0 AND a.deleted_at IS NULL
    AND c.is_archived = 0 AND c.deleted_at IS NULL
  ORDER BY c.sort_order, a.sort_order, a.name
`;

export default function HomeScreen(): React.ReactElement {
  const {
    runningEntry,
    isLoading,
    startActivity,
    stopActivity,
    switchActivity,
  } = useTimer();
  const { data: activities } = useQuery<ActivityRow>(ACTIVITIES_QUERY);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Chronometer</Text>

        {/* Timer Card */}
        <View style={styles.timerCardWrapper}>
          <TimerCard
            runningEntry={runningEntry}
            onStop={stopActivity}
            onStartPress={() => {
              // Will open New Session modal in a future step
            }}
          />
        </View>

        {/* Activity List (functional — tap to start/switch timer) */}
        <Text style={styles.sectionTitle}>Activities</Text>
        {activities.map((activity) => (
          <Pressable
            key={activity.id}
            style={[
              styles.activityRow,
              runningEntry?.activityId === activity.id &&
                styles.activityRowActive,
            ]}
            onPress={() => {
              if (runningEntry) {
                if (runningEntry.activityId !== activity.id) {
                  switchActivity(activity.id);
                }
              } else {
                startActivity(activity.id);
              }
            }}
          >
            <CategoryIcon
              icon={activity.category_icon}
              size={18}
              color={activity.category_color}
            />
            <View style={styles.activityText}>
              <Text style={styles.activityRowName}>{activity.name}</Text>
              <Text
                style={[
                  styles.activityCategoryName,
                  { color: activity.category_color },
                ]}
              >
                {activity.category_name}
              </Text>
            </View>
          </Pressable>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 100,
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
    marginBottom: SPACING["2xl"],
  },
  timerCardWrapper: {
    marginBottom: SPACING["3xl"],
  },
  sectionTitle: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurface,
    marginBottom: SPACING.md,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.lg,
  },
  activityRowActive: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  activityText: {
    flex: 1,
  },
  activityRowName: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  activityCategoryName: {
    ...TYPOGRAPHY.bodySmall,
    marginTop: 2,
  },
});
