import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../constants/theme';
import Sheet from './ui/Sheet';
import SheetHeader from './ui/SheetHeader';
import Button from './ui/Button';
import { fmt } from '../utils/date';

// Pick an arbitrary date range to filter History by. Two date fields,
// quick-pick presets, an Apply button. Sent up via `onApply(from, to)`.
const DateRangeSheet = ({ visible, initialFrom, initialTo, onClose, onApply }) => {
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [picking, setPicking] = useState(null); // 'from' | 'to' | null

  useEffect(() => {
    if (visible) {
      setFrom(initialFrom || null);
      setTo(initialTo || null);
      setPicking(null);
    }
  }, [visible, initialFrom, initialTo]);

  // Built-in presets so common ranges don't require fiddling with the
  // picker. Tap one → both dates fill in instantly.
  const presets = [
    {
      label: 'Last 7 days',
      apply: () => {
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 6);
        setFrom(start);
        setTo(now);
      },
    },
    {
      label: 'Last 30 days',
      apply: () => {
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 29);
        setFrom(start);
        setTo(now);
      },
    },
    {
      label: 'Last 90 days',
      apply: () => {
        const now = new Date();
        const start = new Date();
        start.setDate(now.getDate() - 89);
        setFrom(start);
        setTo(now);
      },
    },
    {
      label: 'This year',
      apply: () => {
        const now = new Date();
        setFrom(new Date(now.getFullYear(), 0, 1));
        setTo(now);
      },
    },
  ];

  const canApply = from && to && from <= to;

  const onConfirm = () => {
    if (!canApply) return;
    onApply?.(from, to);
  };

  const onPickerChange = (event, picked) => {
    // Android fires once per pick; iOS may fire continuously while the
    // spinner moves. Either way, we close the picker once a value lands.
    if (Platform.OS !== 'ios') setPicking(null);
    if (event?.type === 'dismissed') {
      setPicking(null);
      return;
    }
    if (!picked) return;
    if (picking === 'from') setFrom(picked);
    else if (picking === 'to') setTo(picked);
  };

  return (
    <>
      <Sheet visible={visible} onClose={onClose}>
        <SheetHeader
          title="Pick a date range"
          subtitle="Filter History by any from–to span. Tap a preset or set dates manually."
          onClose={onClose}
        />
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge }}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.md }]}>Quick picks</Text>
          <View style={styles.presetRow}>
            {presets.map((p) => (
              <Pressable key={p.label} onPress={p.apply} style={styles.preset}>
                <Text style={styles.presetText}>{p.label}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={[TEXT_STYLES.label, { marginTop: SPACING.xl, marginBottom: SPACING.md }]}>From – To</Text>
          <View style={{ gap: SPACING.sm }}>
            <Pressable onPress={() => setPicking('from')} style={styles.field}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.fieldLabel}>From</Text>
                <Text style={[styles.fieldValue, !from && { color: COLORS.textMuted }]}>
                  {from ? fmt(from, 'EEE, MMM d, yyyy') : 'Tap to pick'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </Pressable>
            <Pressable onPress={() => setPicking('to')} style={styles.field}>
              <Ionicons name="calendar-outline" size={18} color={COLORS.textSecondary} />
              <View style={{ flex: 1, marginLeft: SPACING.md }}>
                <Text style={styles.fieldLabel}>To</Text>
                <Text style={[styles.fieldValue, !to && { color: COLORS.textMuted }]}>
                  {to ? fmt(to, 'EEE, MMM d, yyyy') : 'Tap to pick'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </Pressable>
          </View>

          {from && to && from > to ? (
            <Text style={styles.warning}>
              "From" date is after "To" date — flip them to apply.
            </Text>
          ) : null}

          <Button
            title="Apply range"
            onPress={onConfirm}
            disabled={!canApply}
            style={{ marginTop: SPACING.xl }}
          />
        </ScrollView>

        {picking && Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible onRequestClose={() => setPicking(null)}>
            <Pressable style={styles.dpBackdrop} onPress={() => setPicking(null)} />
            <View style={styles.dpIosWrap}>
              <DateTimePicker
                value={(picking === 'from' ? from : to) || new Date()}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                onChange={onPickerChange}
                themeVariant="dark"
                textColor={COLORS.textPrimary}
              />
              <Button title="Done" onPress={() => setPicking(null)} style={{ margin: SPACING.lg }} />
            </View>
          </Modal>
        ) : null}
      </Sheet>

      {picking && Platform.OS !== 'ios' ? (
        <DateTimePicker
          value={(picking === 'from' ? from : to) || new Date()}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={onPickerChange}
        />
      ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  preset: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  presetText: {
    color: COLORS.textPrimary,
    fontFamily: FONT.medium,
    fontSize: 13,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
  },
  fieldLabel: {
    color: COLORS.textMuted,
    fontFamily: FONT.medium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  fieldValue: {
    color: COLORS.textPrimary,
    fontFamily: FONT.semibold,
    fontSize: 14,
    marginTop: 2,
  },
  warning: {
    color: COLORS.danger,
    fontFamily: FONT.medium,
    fontSize: 12,
    marginTop: SPACING.md,
  },
  dpBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  dpIosWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.surfaceElevated,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingTop: SPACING.lg,
  },
});

export default DateRangeSheet;
