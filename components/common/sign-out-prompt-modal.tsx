import { Feather } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";

interface SignOutPromptModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSignOut: (wipeLocal: boolean) => Promise<void> | void;
}

export function SignOutPromptModal({
  visible,
  onDismiss,
  onSignOut,
}: SignOutPromptModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState<"keep" | "wipe" | null>(null);

  const handle = useCallback(
    async (wipe: boolean) => {
      if (submitting) return;
      setSubmitting(wipe ? "wipe" : "keep");
      try {
        await onSignOut(wipe);
      } finally {
        setSubmitting(null);
      }
    },
    [onSignOut, submitting],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onDismiss} />

        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
        >
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Sign out</Text>
              <Text style={styles.subtitle}>
                Keep this device&apos;s data, or wipe it after signing out?
              </Text>
            </View>
            <Pressable
              style={styles.closeButton}
              onPress={onDismiss}
              hitSlop={8}
              disabled={submitting !== null}
            >
              <Feather name="x" size={20} color={COLORS.onSurfaceVariant} />
            </Pressable>
          </View>

          <View style={styles.options}>
            <Pressable
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.optionPressed,
              ]}
              onPress={() => handle(false)}
              disabled={submitting !== null}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: COLORS.surfaceContainer },
                ]}
              >
                <Feather name="archive" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>
                  {submitting === "keep" ? "Signing out…" : "Keep on device"}
                </Text>
                <Text style={styles.optionDescription}>
                  Your local entries stay. Sign in again to merge them.
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={COLORS.onSurfaceVariant}
              />
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.optionRow,
                pressed && styles.optionPressed,
              ]}
              onPress={() => handle(true)}
              disabled={submitting !== null}
            >
              <View
                style={[
                  styles.iconBubble,
                  { backgroundColor: COLORS.errorContainer },
                ]}
              >
                <Feather name="trash-2" size={20} color={COLORS.onError} />
              </View>
              <View style={styles.optionText}>
                <Text style={styles.optionTitle}>
                  {submitting === "wipe" ? "Signing out…" : "Wipe this device"}
                </Text>
                <Text style={styles.optionDescription}>
                  Removes all local entries. Cloud copies stay safe.
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={20}
                color={COLORS.onSurfaceVariant}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
  },
  sheet: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING["2xl"],
    paddingTop: SPACING.md,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
    alignSelf: "center",
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
    marginBottom: SPACING["2xl"],
  },
  title: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  subtitle: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  options: {
    gap: SPACING.sm,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  optionPressed: {
    backgroundColor: COLORS.surfaceContainer,
  },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
  },
  optionDescription: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
  },
});
