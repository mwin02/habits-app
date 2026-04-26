import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import React, { useCallback, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeleteDataModal } from "@/components/manage/delete-data-modal";
import { SettingRow } from "@/components/settings/setting-row";
import { COLORS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import {
  deleteAllTimeEntries,
  deleteAllUserData,
} from "@/db/queries/data-management";
import { exportTimeEntriesAsCsv } from "@/lib/export-csv";
import { exportDataAsJson } from "@/lib/export-json";

type DeleteScope = "entries" | "all";

const DELETE_COPY: Record<
  DeleteScope,
  { title: string; description: string; bullets: string[] }
> = {
  entries: {
    title: "Delete time entries",
    description:
      "Permanently removes every tracked entry from this device. Your categories, activities, tags, and preferences are kept so you can keep tracking right away.",
    bullets: ["All time entries", "All entry-tag links", "Daily summaries"],
  },
  all: {
    title: "Delete all data",
    description:
      "Wipes everything on this device and resets the app to a fresh state. Preset categories and default preferences are restored on the next screen.",
    bullets: [
      "Time entries, categories, activities, tags",
      "Goals and notification preferences",
      "Anything you've customized",
    ],
  },
};

export default function ManageDataScreen(): React.ReactElement {
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [deleteScope, setDeleteScope] = useState<DeleteScope | null>(null);

  const runJsonExport = useCallback(async () => {
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

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteScope) return;
    try {
      if (deleteScope === "entries") {
        await deleteAllTimeEntries();
      } else {
        await deleteAllUserData();
      }
      setDeleteScope(null);
      Alert.alert(
        "Deleted",
        deleteScope === "entries"
          ? "All time entries were removed."
          : "All data was wiped and presets were restored.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      Alert.alert("Delete failed", message);
      throw error;
    }
  }, [deleteScope]);

  const copy = deleteScope ? DELETE_COPY[deleteScope] : null;

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
            onPress={runJsonExport}
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

        <Text style={styles.sectionLabel}>Danger zone</Text>
        <View style={styles.group}>
          <SettingRow
            title="Delete time entries"
            description="Wipe all tracked entries; keep categories, activities, tags"
            onPress={() => setDeleteScope("entries")}
            iconBackground={COLORS.surfaceContainer}
            iconChildren={
              <Feather name="trash-2" size={20} color={COLORS.error} />
            }
          />
          <SettingRow
            title="Delete all data"
            description="Reset everything on this device and restore presets"
            onPress={() => setDeleteScope("all")}
            iconBackground={COLORS.surfaceContainer}
            iconChildren={
              <Feather name="alert-triangle" size={20} color={COLORS.error} />
            }
          />
        </View>
      </ScrollView>

      <DeleteDataModal
        visible={deleteScope !== null}
        title={copy?.title ?? ""}
        description={copy?.description ?? ""}
        bullets={copy?.bullets ?? []}
        exporting={isExportingJson}
        onExportFirst={runJsonExport}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleteScope(null)}
      />
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
