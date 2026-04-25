import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '@/constants/theme';
import { createTag } from '@/db/queries';
import { useTags } from '@/hooks/useTags';
import { TagChip, TAG_COLOR_PALETTE } from './tag-chip';

interface TagPickerProps {
  visible: boolean;
  initialSelectedIds: string[];
  onClose: () => void;
  onConfirm: (selectedIds: string[]) => void;
}

/**
 * Bottom-sheet picker for selecting a set of tags. Shows all active tags as
 * toggleable chips, plus an inline "create new tag" input that adds to the
 * tags table immediately and auto-selects the new tag.
 */
export function TagPicker({
  visible,
  initialSelectedIds,
  onClose,
  onConfirm,
}: TagPickerProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { tags } = useTags();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // Reset selection from props each time the modal opens
  useEffect(() => {
    if (visible) {
      setSelected(new Set(initialSelectedIds));
      setNewName('');
    }
  }, [visible, initialSelectedIds]);

  const toggle = useCallback((id: string): void => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const nextColor = useMemo(() => {
    return TAG_COLOR_PALETTE[tags.length % TAG_COLOR_PALETTE.length];
  }, [tags.length]);

  const handleCreate = useCallback(async (): Promise<void> => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const id = await createTag({
        name,
        color: nextColor,
        sortOrder: tags.length,
      });
      setSelected((prev) => {
        const next = new Set(prev);
        next.add(id);
        return next;
      });
      setNewName('');
    } finally {
      setCreating(false);
    }
  }, [newName, creating, nextColor, tags.length]);

  const handleConfirm = useCallback((): void => {
    onConfirm(Array.from(selected));
    onClose();
  }, [selected, onConfirm, onClose]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View
          style={[styles.sheet, { paddingBottom: insets.bottom + SPACING.lg }]}
        >
          <View style={styles.handleBar} />
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Tags</Text>
            <Pressable onPress={onClose} style={styles.closeButton} hitSlop={8}>
              <Feather name="x" size={20} color={COLORS.onSurfaceVariant} />
            </Pressable>
          </View>

          {/* Inline create */}
          <View style={styles.createRow}>
            <View style={[styles.colorDot, { backgroundColor: nextColor }]} />
            <TextInput
              style={styles.createInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Create new tag…"
              placeholderTextColor={COLORS.onSurfaceVariant}
              onSubmitEditing={handleCreate}
              returnKeyType="done"
              autoCorrect={false}
            />
            {newName.trim().length > 0 && (
              <Pressable onPress={handleCreate} hitSlop={8} style={styles.addBtn}>
                <Feather name="plus" size={16} color={COLORS.primary} />
              </Pressable>
            )}
          </View>

          <ScrollView
            style={styles.tagList}
            contentContainerStyle={styles.tagListContent}
            showsVerticalScrollIndicator={false}
          >
            {tags.length === 0 ? (
              <Text style={styles.emptyText}>
                No tags yet. Type above to create one.
              </Text>
            ) : (
              tags.map((tag) => (
                <TagChip
                  key={tag.id}
                  name={tag.name}
                  color={tag.color}
                  selected={selected.has(tag.id)}
                  onPress={() => toggle(tag.id)}
                />
              ))
            )}
          </ScrollView>

          <Pressable style={styles.confirmBtn} onPress={handleConfirm}>
            <Text style={styles.confirmText}>
              {selected.size === 0
                ? 'Apply (no tags)'
                : `Apply ${selected.size} tag${selected.size === 1 ? '' : 's'}`}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.surfaceContainerLowest,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingHorizontal: SPACING['2xl'],
    paddingTop: SPACING.md,
    maxHeight: '75%',
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.outlineVariant,
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  headerTitle: {
    ...TYPOGRAPHY.headingXl,
    color: COLORS.onSurface,
  },
  closeButton: {
    padding: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceContainerLow,
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    backgroundColor: COLORS.surfaceContainerLow,
    borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  createInput: {
    flex: 1,
    ...TYPOGRAPHY.body,
    color: COLORS.onSurface,
    padding: 0,
  },
  addBtn: {
    padding: 4,
  },
  tagList: {
    maxHeight: 300,
    marginBottom: SPACING.lg,
  },
  tagListContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    paddingBottom: SPACING.sm,
  },
  emptyText: {
    ...TYPOGRAPHY.body,
    color: COLORS.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: SPACING.xl,
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  confirmText: {
    ...TYPOGRAPHY.button,
    color: COLORS.onPrimary,
  },
});
