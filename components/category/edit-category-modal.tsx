import {
  AVAILABLE_ICON_KEYS,
  CategoryIcon,
} from "@/components/common/category-icon";
import { GradientButton } from "@/components/common/gradient-button";
import {
  CATEGORY_PALETTE,
  COLORS,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from "@/constants/theme";
import type { CategoryWithActivities } from "@/db/models";
import { updateCategory } from "@/db/queries";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface EditCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  category: CategoryWithActivities | null;
}

export function EditCategoryModal({
  visible,
  onClose,
  category,
}: EditCategoryModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const [color, setColor] = useState<string>(
    category?.color ?? CATEGORY_PALETTE[0],
  );
  const [icon, setIcon] = useState<string | null>(category?.icon ?? null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible && category) {
      setColor(category.color);
      setIcon(category.icon);
      setSubmitting(false);
    }
  }, [visible, category]);

  const handleClose = useCallback((): void => {
    onClose();
  }, [onClose]);

  const canSubmit = !submitting && category !== null;

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!canSubmit || !category) return;
    setSubmitting(true);
    try {
      await updateCategory(category.id, { color, icon });
      onClose();
    } catch (err) {
      setSubmitting(false);
      console.error("Failed to save category", err);
    }
  }, [canSubmit, category, color, icon, onClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
        >
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <View style={styles.headerTextWrap}>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {category?.name ?? "Edit Category"}
              </Text>
              <Text style={styles.headerSubtitle}>
                Recolor or pick an icon
              </Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={22} color={COLORS.onSurface} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Appearance</Text>

          <View style={styles.previewRow}>
            <View
              style={[styles.previewBadge, { backgroundColor: color + "22" }]}
            >
              <CategoryIcon icon={icon ?? "circle"} size={20} color={color} />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatchRow}
            style={styles.appearanceScroll}
            keyboardShouldPersistTaps="handled"
          >
            {CATEGORY_PALETTE.map((swatch) => {
              const isSelected = color === swatch;
              return (
                <Pressable
                  key={swatch}
                  onPress={() => setColor(swatch)}
                  style={[
                    styles.swatch,
                    { backgroundColor: swatch },
                    isSelected && styles.swatchSelected,
                  ]}
                >
                  {isSelected && (
                    <Feather name="check" size={16} color={COLORS.onPrimary} />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.iconRow}
            style={styles.appearanceScroll}
            keyboardShouldPersistTaps="handled"
          >
            {AVAILABLE_ICON_KEYS.map((iconKey) => {
              const isSelected = icon === iconKey;
              return (
                <Pressable
                  key={iconKey}
                  onPress={() => setIcon(isSelected ? null : iconKey)}
                  style={[
                    styles.iconTile,
                    isSelected && {
                      backgroundColor: color + "26",
                      borderColor: color,
                    },
                  ]}
                >
                  <CategoryIcon
                    icon={iconKey}
                    size={20}
                    color={isSelected ? color : COLORS.onSurfaceVariant}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          <GradientButton
            shape="pill"
            label={submitting ? "Saving..." : "Save Changes"}
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Feather name="check" size={18} color={COLORS.onPrimary} />
          </GradientButton>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING["2xl"],
  },
  headerTextWrap: {
    flex: 1,
    marginRight: SPACING.md,
  },
  headerTitle: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  headerSubtitle: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginTop: SPACING.xs,
  },
  closeButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  sectionLabel: {
    ...TYPOGRAPHY.labelUppercase,
    color: COLORS.onSurfaceVariant,
    marginBottom: SPACING.md,
  },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  previewBadge: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  appearanceScroll: {
    flexGrow: 0,
    marginBottom: SPACING.md,
  },
  swatchRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: COLORS.onSurface,
  },
  iconRow: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surfaceContainerLow,
    borderWidth: 1,
    borderColor: "transparent",
  },
});
