import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../../constants/theme';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../constants/icons';
import Sheet from '../ui/Sheet';
import Input from '../ui/Input';
import Button from '../ui/Button';
import SegmentedControl from '../ui/SegmentedControl';
import { useToast } from '../ui/Toast';
import { hError, hSuccess, hSelection } from '../../utils/haptics';

const CategoryEditor = ({ visible, onClose, initial, onSave, onDelete }) => {
  const { show } = useToast();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState(CATEGORY_ICONS[0]);
  const [color, setColor] = useState(CATEGORY_COLORS[0]);
  const [type, setType] = useState('expense');

  useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setIcon(initial?.icon || CATEGORY_ICONS[0]);
      setColor(initial?.color || CATEGORY_COLORS[0]);
      setType(initial?.type || 'expense');
    }
  }, [visible, initial]);

  const isEdit = !!initial?.id;

  const handleSave = async () => {
    if (!name.trim()) {
      hError();
      show('Enter a name', { variant: 'error' });
      return;
    }
    await onSave?.({ name: name.trim(), icon, color, type });
    hSuccess();
    onClose?.();
  };

  const handleDelete = () => {
    if (initial?.is_default) {
      show('Default categories cannot be deleted', { variant: 'warning' });
      return;
    }
    Alert.alert('Delete category?', 'Transactions in this category will keep their record but lose the link.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await onDelete?.(initial.id);
          hSuccess();
          onClose?.();
        },
      },
    ]);
  };

  return (
    <Sheet visible={visible} onClose={onClose} height="90%">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: SPACING.huge }}>
        <View style={styles.headerRow}>
          <Text style={[TEXT_STYLES.h2]}>{isEdit ? 'Edit category' : 'New category'}</Text>
          <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={COLORS.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          {!isEdit ? (
            <SegmentedControl
              options={[
                { value: 'expense', label: 'Expense' },
                { value: 'income', label: 'Income' },
              ]}
              value={type}
              onChange={setType}
              accent={type === 'income' ? COLORS.income : COLORS.expense}
            />
          ) : null}

          <Input
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Groceries"
            variant="surface"
            style={{ marginTop: isEdit ? 0 : SPACING.xl }}
            autoCapitalize="sentences"
            editable={!initial?.is_default}
          />

          <Text style={[TEXT_STYLES.label, { marginTop: SPACING.md, marginBottom: SPACING.md }]}>Icon</Text>
          <View style={styles.iconGrid}>
            {CATEGORY_ICONS.map((ic) => (
              <Pressable
                key={ic}
                onPress={() => { hSelection(); setIcon(ic); }}
                style={[
                  styles.iconCell,
                  { borderColor: ic === icon ? color : COLORS.border, backgroundColor: ic === icon ? `${color}25` : COLORS.surface },
                ]}
              >
                <Ionicons name={ic} size={20} color={ic === icon ? color : COLORS.textSecondary} />
              </Pressable>
            ))}
          </View>

          <Text style={[TEXT_STYLES.label, { marginTop: SPACING.lg, marginBottom: SPACING.md }]}>Color</Text>
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((c) => (
              <Pressable
                key={c}
                onPress={() => { hSelection(); setColor(c); }}
                style={[
                  styles.colorDot,
                  { backgroundColor: c, borderWidth: c === color ? 3 : 0, borderColor: COLORS.white },
                  c === color && { shadowColor: c, shadowOpacity: 0.6, shadowRadius: 8, elevation: 4 },
                ]}
              />
            ))}
          </View>

          <Button title={isEdit ? 'Save changes' : 'Create category'} onPress={handleSave} style={{ marginTop: SPACING.xxl }} />
          {isEdit && !initial?.is_default ? (
            <Button title="Delete category" variant="danger" onPress={handleDelete} style={{ marginTop: SPACING.md }} />
          ) : null}
        </View>
      </ScrollView>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  body: { paddingHorizontal: SPACING.xl, paddingTop: SPACING.md },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconCell: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorDot: {
    width: 36, height: 36, borderRadius: 18,
  },
});

export default CategoryEditor;
