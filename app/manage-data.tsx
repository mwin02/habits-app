import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SettingRow } from "@/components/settings/setting-row";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import { exportTimeEntriesAsCsv } from "@/lib/export-csv";
import { exportDataAsJson } from "@/lib/export-json";

export default function ManageDataScreen(): React.ReactElement {
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);

  const handleExportJson = useCallback(async () => {
    if (isExportingJson) return;
    setIsExportingJson(true);
    try {
      await exportDataAsJson();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Export failed", message);
    } finally {
      setIsExportingJson(false);
    }
  }, [isExportingJson]);

  const handleExportCsv = useCallback(async () => {
    if (isExportingCsv) return;
    setIsExportingCsv(true);
    try {
      await exportTimeEntriesAsCsv();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Export failed", message);
    } finally {
      setIsExportingCsv(false);
    }
  }, [isExportingCsv]);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <Stack.Screen options={{ title: "Manage data" }} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Manage data</Text>
          <Text style={styles.subtitle}>
            Export a copy of what you&apos;ve tracked, or wipe local data to
            start over.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Export</Text>
        <View style={styles.group}>
          <SettingRow
            title="Export data (JSON)"
            description={
              isExportingJson
                ? "Preparing export…"
                : "Full snapshot of every table"
            }
            onPress={handleExportJson}
            disabled={isExportingJson}
            iconBackground={COLORS.surfaceContainer}
            iconChildren={
              <Feather name="download" size={20} color={COLORS.primary} />
            }
          />
          <SettingRow
            title="Export time entries (CSV)"
            description={
              isExportingCsv
                ? "Preparing export…"
                : "Spreadsheet-friendly: one row per tracked entry"
            }
            onPress={handleExportCsv}
            disabled={isExportingCsv}
            iconBackground={COLORS.surfaceContainer}
            iconChildren={
              <Feather name="file-text" size={20} color={COLORS.primary} />
            }
          />
        </View>
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
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING["4xl"],
    gap: SPACING.md,
  },
  header: {
    paddingHorizontal: SPACING.xs,
    paddingTop: SPACING.md,
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
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  group: {
    gap: SPACING.sm,
  },
});
