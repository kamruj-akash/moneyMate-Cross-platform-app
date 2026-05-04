import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../../constants/theme';
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../constants/icons';
import Sheet from '../ui/Sheet';
import SheetHeader from '../ui/SheetHeader';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { useToast } from '../ui/Toast';
import { hError, hSuccess, hSelection } from '../../utils/haptics';

const PROFILE_ICONS = [
  'person-circle-outline',
  'briefcase-outline',
  'home-outline',
  'people-outline',
  'business-outline',
  'school-outline',
  'heart-outline',
  'wallet-outline',
  'card-outline',
  'cash-outline',
  'star-outline',
  'sparkles-outline',
];

const ProfileEditor = ({ visible, onClose, initial, onSave, onDelete }) => {
  const { show } = useToast();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('person-circle-outline');
  const [color, setColor] = useState('#7F5AF0');
  const [budget, setBudget] = useState('');
  const [threshold, setThreshold] = useState('80');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setIcon(initial?.icon || 'person-circle-outline');
      setColor(initial?.color || '#7F5AF0');
      setBudget(initial?.monthly_budget ? String(initial.monthly_budget) : '');
      setThreshold(initial?.alert_threshold ? String(initial.alert_threshold) : '80');
    }
  }, [visible, initial]);

  const isEdit = !!initial?.id;

  const handleSave = async () => {
    if (!name.trim()) {
      hError();
      show('Name required', { variant: 'error' });
      return;
    }
    setSaving(true);
    try {
      await onSave?.({
        name: name.trim(),
        icon,
        color,
        monthly_budget: Number(budget) || 0,
        alert_threshold: Math.min(100, Math.max(50, Number(threshold) || 80)),
      });
      hSuccess();
      onClose?.();
    } catch (e) {
      hError();
      show('Could not save', { variant: 'error', description: e?.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (initial?.is_default) {
      show('Default profile cannot be deleted', { variant: 'warning' });
      return;
    }
    Alert.alert(
      'Delete profile?',
      `This will permanently remove "${initial?.name}" and ALL its transactions, custom categories, and recurring entries. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ok = await onDelete?.(initial.id);
            if (ok) {
              hSuccess();
              onClose?.();
            }
          },
        },
      ]
    );
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetHeader
        title={isEdit ? 'Edit profile' : 'New profile'}
        subtitle={isEdit ? 'Update name, icon, color, or budget' : 'Personal, Office, Family — anything you like'}
        onClose={onClose}
      />
      <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge }} keyboardShouldPersistTaps="handled">
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Office, Family"
          variant="surface"
          leftIcon="text-outline"
          autoCapitalize="words"
        />

        <Text style={[TEXT_STYLES.label, { marginTop: SPACING.sm, marginBottom: SPACING.md }]}>Icon</Text>
        <View style={styles.iconGrid}>
          {PROFILE_ICONS.map((ic) => (
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

        <View style={{ marginTop: SPACING.xl }}>
          <Input
            label="Monthly budget (optional)"
            value={budget}
            onChangeText={(v) => setBudget(v.replace(/[^0-9.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="0"
            variant="surface"
            leftIcon="cash-outline"
          />
          <Input
            label="Alert me at (%)"
            value={threshold}
            onChangeText={(v) => setThreshold(v.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="80"
            variant="surface"
            leftIcon="warning-outline"
            hint="Notify when this percent of budget is used (50–100)"
          />
        </View>

        <Button title={isEdit ? 'Save changes' : 'Create profile'} onPress={handleSave} loading={saving} disabled={saving} style={{ marginTop: SPACING.md }} />
        {isEdit && !initial?.is_default ? (
          <Button title="Delete profile" variant="danger" onPress={handleDelete} style={{ marginTop: SPACING.sm }} />
        ) : null}
      </ScrollView>
    </Sheet>
  );
};

const styles = StyleSheet.create({
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

export default ProfileEditor;
