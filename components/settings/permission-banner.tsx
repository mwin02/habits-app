import { Feather } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";

export interface PermissionBannerProps {
  onOpenSettings: () => void;
}

export function PermissionBanner({
  onOpenSettings,
}: PermissionBannerProps): React.ReactElement {
  return (
    <View style={styles.container}>
      <View style={styles.iconBubble}>
        <Feather name="bell-off" size={18} color={COLORS.error} />
      </View>
      <View style={styles.textBlock}>
        <Text style={styles.title}>Notifications are off</Text>
        <Text style={styles.body}>
          Turn them on in iOS Settings so reminders can reach you.
        </Text>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onOpenSettings}
        >
          <Text style={styles.buttonLabel}>Open Settings</Text>
          <Feather
            name="external-link"
            size={14}
            color={COLORS.onErrorContainer}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: SPACING.md,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.onError,
  },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  textBlock: {
    flex: 1,
    gap: SPACING.xs,
  },
  title: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.error,
  },
  body: {
    ...TYPOGRAPHY.body,
    color: COLORS.onErrorContainer,
  },
  button: {
    marginTop: SPACING.xs,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLowest,
  },
  buttonPressed: {
    backgroundColor: COLORS.surfaceContainer,
  },
  buttonLabel: {
    ...TYPOGRAPHY.body,
    color: COLORS.onErrorContainer,
  },
});
