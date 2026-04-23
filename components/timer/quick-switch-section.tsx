import { QuickSwitchCard } from "@/components/timer/quick-switch-card";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { CategoryWithActivities } from "@/db/models";
import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface QuickSwitchSectionProps {
  categories: CategoryWithActivities[];
  activeActivityId: string | null;
  onActivityPress: (activityId: string) => void;
}

export function QuickSwitchSection({
  categories,
  activeActivityId,
  onActivityPress,
}: QuickSwitchSectionProps): React.ReactElement {
  const router = useRouter();

  // Only show categories that have at least one activity
  const nonEmpty = categories.filter((c) => c.activities.length > 0);

  return (
    <View style={styles.container}>
      {/* Section header */}
      <View style={styles.headerRow}>
        <Text style={styles.heading}>Quick Switch</Text>
        <Pressable
          onPress={() => router.push("/manage-activities")}
          style={styles.manageButton}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Manage activities"
        >
          <Feather name="settings" size={16} color={COLORS.onSurfaceVariant} />
          <Text style={styles.label}>Manage Activites</Text>
        </Pressable>
      </View>

      {/* Horizontal carousel */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {nonEmpty.map((category) => (
          <QuickSwitchCard
            key={category.id}
            category={category}
            activeActivityId={activeActivityId}
            onActivityPress={onActivityPress}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING["3xl"],
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: SPACING.lg,
  },
  heading: {
    ...TYPOGRAPHY.heading,
    color: COLORS.onSurface,
  },
  label: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
  },
  manageButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.full,
  },
  scrollContent: {
    gap: SPACING.lg,
    paddingRight: SPACING.lg,
  },
});
