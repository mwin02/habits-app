import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SettingRow } from "@/components/settings/setting-row";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();

  const goToIdealAllocations = useCallback(() => {
    router.push("/ideal-allocations");
  }, [router]);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          Shape how the app nudges you and what you&apos;re aiming for.
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <SettingRow
          title="Goals"
          description="Ideal hours per day for each category"
          onPress={goToIdealAllocations}
          iconBackground={COLORS.surfaceContainer}
          iconChildren={
            <Feather name="target" size={20} color={COLORS.primary} />
          }
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING["4xl"],
    gap: SPACING.sm,
  },
});
