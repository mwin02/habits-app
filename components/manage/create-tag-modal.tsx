import { GradientButton } from "@/components/common/gradient-button";
import { TAG_COLOR_PALETTE } from "@/components/common/tag-chip";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/constants/theme";
import type { TagItem } from "@/db/models";
import { createTag, updateTag } from "@/db/queries";
import { Feather } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface CreateTagModalProps {
  visible: boolean;
  onClose: () => void;
  /** When provided, the modal operates in edit mode */
  initialTag?: TagItem | null;
}

export function CreateTagModal({
  visible,
  onClose,
  initialTag,
}: CreateTagModalProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const isEdit = !!initialTag;
  const [name, setName] = useState(initialTag?.name ?? "");
  const [color, setColor] = useState<string>(
    initialTag?.color ?? TAG_COLOR_PALETTE[0],
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initialTag?.name ?? "");
      setColor(initialTag?.color ?? TAG_COLOR_PALETTE[0]);
      setSubmitting(false);
    }
  }, [visible, initialTag]);

  const handleClose = useCallback((): void => {
    onClose();
  }, [onClose]);

  const trimmedName = name.trim();
  const canSubmit = trimmedName.length > 0 && !submitting;

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      if (isEdit && initialTag) {
        await updateTag(initialTag.id, { name: trimmedName, color });
      } else {
        await createTag({ name: trimmedName, color });
      }
      onClose();
    } catch (err) {
      setSubmitting(false);
      console.error("Failed to save tag", err);
    }
  }, [canSubmit, trimmedName, color, onClose, isEdit, initialTag]);

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
                {isEdit ? "Edit Tag" : "New Tag"}
              </Text>
              <Text style={styles.headerSubtitle}>
                {isEdit ? "Rename or recolor" : "Add a custom tag"}
              </Text>
            </View>
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <Feather name="x" size={22} color={COLORS.onSurface} />
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>Tag Name</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="e.g. Client Work"
              placeholderTextColor={COLORS.onSurfaceVariant}
              value={name}
              onChangeText={setName}
              autoFocus
              autoCorrect={false}
              maxLength={40}
              returnKeyType="done"
            />
          </View>

          <Text style={styles.sectionLabel}>Color</Text>
          <View style={styles.colorRow}>
            {TAG_COLOR_PALETTE.map((c) => {
              const selected = c === color;
              return (
                <Pressable
                  key={c}
                  onPress={() => setColor(c)}
                  style={[
                    styles.swatch,
                    { backgroundColor: c },
                    selected && styles.swatchSelected,
                  ]}
                  accessibilityLabel={`Color ${c}`}
                >
                  {selected && (
                    <Feather name="check" size={16} color={COLORS.onPrimary} />
                  )}
                </Pressable>
              );
            })}
          </View>

          <GradientButton
            shape="pill"
            label={
              submitting
                ? isEdit
                  ? "Saving..."
                  : "Creating..."
                : isEdit
                  ? "Save Changes"
                  : "Create Tag"
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
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.md,
    marginBottom: SPACING["2xl"],
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: COLORS.onSurface,
  },
});
