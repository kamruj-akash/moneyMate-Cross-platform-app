import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import Sheet from '../ui/Sheet';
import SheetHeader from '../ui/SheetHeader';
import { useToast } from '../ui/Toast';
import { useData } from '../../context/DataContext';
import { formatAmount } from '../../utils/currency';
import { hSuccess } from '../../utils/haptics';
import ProfileEditor from './ProfileEditor';

// Single source of truth for the profile switcher UI. Used by both the
// Home dashboard chip and the Settings → Profiles row so the experience is
// identical from either entry point: tap any profile to switch, tap "⋯"
// (or long-press) to edit, tap "Add new profile" to create one.
const ProfileSwitcherSheet = ({ visible, onClose }) => {
  const {
    profiles,
    activeProfileId,
    activeProfile,
    switchProfile,
    addProfile,
    updateProfile,
    deleteProfile,
    settings,
  } = useData();
  const { show } = useToast();

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const onPick = async (p) => {
    if (p.id === activeProfileId) {
      onClose?.();
      return;
    }
    await switchProfile(p.id);
    hSuccess();
    show(`Switched to "${p.name}"`, { variant: 'success' });
    onClose?.();
  };

  const onEdit = (p) => {
    setEditing(p);
    setEditorOpen(true);
  };

  const onCreate = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const onSaveProfile = async (data) => {
    if (editing) {
      await updateProfile(editing.id, data);
    } else {
      const created = await addProfile(data);
      // Auto-switch to the newly-created profile so the user lands on it.
      if (created?.id) await switchProfile(created.id);
    }
  };

  const onDeleteProfile = async (id) => deleteProfile(id);

  return (
    <>
      <Sheet visible={visible} onClose={onClose}>
        <SheetHeader
          title="Profiles"
          subtitle="Tap to switch · Tap ⋯ to edit · Tap + to create"
          onClose={onClose}
        />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge }}
          showsVerticalScrollIndicator={false}
        >
          {profiles.map((p) => {
            const isActive = p.id === activeProfileId;
            const modeLabel = p.mode === 'expense_only' ? 'Expense tracking' : 'Salary mode';
            const sub =
              p.monthly_budget > 0
                ? `${modeLabel} · Budget ${formatAmount(p.monthly_budget, settings?.currency || 'BDT')}`
                : modeLabel;
            return (
              <Pressable
                key={p.id}
                onPress={() => onPick(p)}
                onLongPress={() => onEdit(p)}
                style={[
                  styles.item,
                  isActive && {
                    borderColor: p.color,
                    backgroundColor: `${p.color}18`,
                  },
                ]}
              >
                <View
                  style={[
                    styles.icon,
                    { backgroundColor: `${p.color}33`, borderColor: `${p.color}55` },
                  ]}
                >
                  <Ionicons name={p.icon} size={20} color={p.color} />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.name} numberOfLines={1}>{p.name}</Text>
                    {p.is_default ? (
                      <Text style={styles.defaultBadge}>Default</Text>
                    ) : null}
                  </View>
                  <Text style={styles.sub} numberOfLines={1}>{sub}</Text>
                </View>
                {isActive ? (
                  <Ionicons name="checkmark-circle" size={22} color={p.color} />
                ) : (
                  <Pressable onPress={() => onEdit(p)} hitSlop={10} style={{ padding: 4 }}>
                    <Ionicons name="ellipsis-horizontal" size={18} color={COLORS.textMuted} />
                  </Pressable>
                )}
              </Pressable>
            );
          })}

          <Pressable
            onPress={onCreate}
            style={[styles.item, { borderStyle: 'dashed', borderColor: COLORS.borderStrong, backgroundColor: 'transparent' }]}
          >
            <View
              style={[
                styles.icon,
                { backgroundColor: COLORS.surface, borderColor: COLORS.borderStrong, borderStyle: 'dashed' },
              ]}
            >
              <Ionicons name="add" size={22} color={COLORS.textSecondary} />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.md }}>
              <Text style={styles.name}>Add new profile</Text>
              <Text style={styles.sub}>Personal, Office, Family — separate ledgers</Text>
            </View>
          </Pressable>
        </ScrollView>
      </Sheet>

      <ProfileEditor
        visible={editorOpen}
        onClose={() => setEditorOpen(false)}
        initial={editing}
        onSave={onSaveProfile}
        onDelete={onDeleteProfile}
      />
    </>
  );
};

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  icon: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  name: {
    color: COLORS.textPrimary,
    fontFamily: FONT.semibold,
    fontSize: 15,
    flexShrink: 1,
  },
  defaultBadge: {
    color: COLORS.textMuted,
    fontFamily: FONT.medium,
    fontSize: 11,
    letterSpacing: 1,
    marginLeft: SPACING.sm,
    textTransform: 'uppercase',
  },
  sub: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 12,
    marginTop: 2,
  },
});

export default ProfileSwitcherSheet;
