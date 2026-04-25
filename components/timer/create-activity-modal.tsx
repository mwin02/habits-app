import {
  AVAILABLE_ICON_KEYS,
  CategoryIcon,
} from "@/components/common/category-icon";
import { GradientButton } from "@/components/common/gradient-button";
import {
  CATEGORY_PALETTE,
  COLORS,
  FONTS,
  RADIUS,
  SPACING,
  TYPOGRAPHY,
} from "@/constants/theme";
import type { ActivityItem, CategoryWithActivities } from "@/db/models";
import { createActivity, updateActivity } from "@/db/queries";
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
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CreateActivityModalProps {
  visible: boolean;
  onClose: () => void;
  categories: CategoryWithActivities[];
  /** When provided, the modal operates in edit mode for this activity */
  initialActivity?: ActivityItem | null;
  /** Pre-select this category when opening in create mode */
  initialCategoryId?: string | null;
}

export function CreateActivityModal({
  visible,
  onClose,
  categories,
  initialActivity,
  initialCategoryId,
}: CreateActivityModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const isEdit = !!initialActivity;
  const [name, setName] = useState(initialActivity?.name ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    initialActivity?.categoryId ?? initialCategoryId ?? null,
  );
  // null = "use category default" (writes NULL to DB)
  const [colorOverride, setColorOverride] = useState<string | null>(
    initialActivity?.colorOverride ?? null,
  );
  const [iconOverride, setIconOverride] = useState<string | null>(
    initialActivity?.iconOverride ?? null,
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialActivity?.name ?? "");
      setSelectedCategoryId(
        initialActivity?.categoryId ?? initialCategoryId ?? null,
      );
      setColorOverride(initialActivity?.colorOverride ?? null);
      setIconOverride(initialActivity?.iconOverride ?? null);
      setSubmitting(false);
    }
  }, [visible, initialActivity, initialCategoryId]);

  const reset = useCallback((): void => {
    setName("");
    setSelectedCategoryId(null);
    setColorOverride(null);
    setIconOverride(null);
    setSubmitting(false);
  }, []);

  const handleClose = useCallback((): void => {
    reset();
    onClose();
  }, [reset, onClose]);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && selectedCategoryId !== null && !submitting;

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!canSubmit || !selectedCategoryId) return;
    setSubmitting(true);
    try {
      if (isEdit && initialActivity) {
        await updateActivity(initialActivity.id, {
          name: trimmedName,
          categoryId: selectedCategoryId,
          color: colorOverride,
          icon: iconOverride,
        });
      } else {
        await createActivity({
          categoryId: selectedCategoryId,
          name: trimmedName,
          color: colorOverride,
          icon: iconOverride,
        });
      }
      reset();
      onClose();
    } catch (err) {
      setSubmitting(false);
      console.error("Failed to save activity", err);
    }
  }, [
    canSubmit,
    selectedCategoryId,
    trimmedName,
    reset,
    onClose,
    isEdit,
    initialActivity,
    colorOverride,
    iconOverride,
  ]);

  const categoryRows: CategoryWithActivities[][] = [];
  for (let i = 0; i < categories.length; i += 2) {
    categoryRows.push(categories.slice(i, i + 2));
  }

  // Resolve preview color/icon — override if set, else parent category, else
  // a neutral fallback when no category is selected yet.
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) ?? null;
  const previewColor =
    colorOverride ?? selectedCategory?.color ?? COLORS.onSurfaceVariant;
  const previewIcon = iconOverride ?? selectedCategory?.icon ?? null;

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
            <View>
              <Text style={styles.headerTitle}>
                {isEdit ? "Edit Activity" : "New Activity"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEdit ? "Rename or reassign" : "Add a custom activity"}
              </Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={22} color={COLORS.onSurface} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Activity Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning Run"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={name}
              onChangeText={setName}
              autoFocus
              autoCorrect={false}
              maxLength={50}
              returnKeyType="done"
            />
          </View>

          <Text style={styles.sectionLabel}>Assign to Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
            style={styles.categoryScroll}
            keyboardShouldPersistTaps="handled"
          >
            {categoryRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.categoryColumn}>
                {row.map((category) => {
                  const isSelected = category.id === selectedCategoryId;
                  return (
                    <Pressable
                      key={category.id}
                      style={[
                        styles.categoryCard,
                        {
                          backgroundColor: isSelected
                            ? category.color + "26"
                            : category.color + "12",
                        },
                      ]}
                      onPress={() => setSelectedCategoryId(category.id)}
                    >
                      <CategoryIcon
                        icon={category.icon ?? "circle"}
                        size={22}
                        color={category.color}
                      />
                      <Text
                        style={[
                          styles.categoryCardName,
                          { color: category.color },
                        ]}
                        numberOfLines={1}
                      >
                        {category.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <View style={styles.appearanceHeader}>
            <Text style={styles.sectionLabel}>Appearance</Text>
            {(colorOverride !== null || iconOverride !== null) && (
              <Pressable
                onPress={() => {
                  setColorOverride(null);
                  setIconOverride(null);
                }}
                hitSlop={8}
              >
                <Text style={styles.resetLabel}>Use category default</Text>
              </Pressable>
            )}
          </View>

          <View style={styles.previewRow}>
            <View
              style={[
                styles.previewBadge,
                { backgroundColor: previewColor + "22" },
              ]}
            >
              <CategoryIcon
                icon={previewIcon ?? "circle"}
                size={20}
                color={previewColor}
              />
            </View>
            <Text style={styles.previewHint}>
              {colorOverride === null && iconOverride === null
                ? "Inheriting from category"
                : "Custom appearance"}
            </Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.swatchRow}
            style={styles.appearanceScroll}
            keyboardShouldPersistTaps="handled"
          >
            {CATEGORY_PALETTE.map((swatch) => {
              const isSelected = colorOverride === swatch;
              return (
                <Pressable
                  key={swatch}
                  onPress={() =>
                    setColorOverride(isSelected ? null : swatch)
                  }
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
              const isSelected = iconOverride === iconKey;
              return (
                <Pressable
                  key={iconKey}
                  onPress={() =>
                    setIconOverride(isSelected ? null : iconKey)
                  }
                  style={[
                    styles.iconTile,
                    isSelected && {
                      backgroundColor: previewColor + "26",
                      borderColor: previewColor,
                    },
                  ]}
                >
                  <CategoryIcon
                    icon={iconKey}
                    size={20}
                    color={isSelected ? previewColor : COLORS.onSurfaceVariant}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          <GradientButton
            shape="pill"
            label={
              submitting
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Activity"
            }
            onPress={handleSubmit}
            disabled={!canSubmit}
          >
            <Feather
              name={isEdit ? "check" : "plus"}
              size={18}
              color={COLORS.onPrimary}
            />
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
  inputContainer: {
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING["2xl"],
  },
  input: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    padding: 0,
  },
  categoryScroll: {
    flexGrow: 0,
    marginBottom: SPACING["2xl"],
  },
  categoryScrollContent: {
    gap: SPACING.md,
  },
  categoryColumn: {
    gap: SPACING.md,
  },
  categoryCard: {
    width: 160,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  categoryCardSelected: {
    backgroundColor: COLORS.surfaceContainerHigh,
  },
  categoryCardName: {
    ...TYPOGRAPHY.titleMd,
    color: COLORS.onSurface,
    flexShrink: 1,
  },
  categoryCardNameSelected: {
    color: COLORS.primary,
  },
  appearanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  resetLabel: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.primary,
    fontFamily: FONTS.jakartaSemiBold,
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
  previewHint: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.onSurfaceVariant,
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
