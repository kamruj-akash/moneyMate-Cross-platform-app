import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeIn } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING, TEXT_STYLES } from '../constants/theme';
import GradientBackground from '../components/GradientBackground';
import Button from '../components/ui/Button';
import Chip from '../components/ui/Chip';
import SegmentedControl from '../components/ui/SegmentedControl';
import Toggle from '../components/ui/Toggle';
import Input from '../components/ui/Input';
import { useData } from '../context/DataContext';
import { useToast } from '../components/ui/Toast';
import { hSuccess, hError, hSelection } from '../utils/haptics';
import { fmtRelative } from '../utils/date';
import { getCurrencySymbol } from '../utils/currency';

export default function AddTransaction() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const isEdit = !!id;
  const {
    categories,
    settings,
    addTransaction,
    updateTransaction,
    addRecurring,
    transactions,
  } = useData();
  const { show } = useToast();

  const existing = useMemo(() => transactions.find((t) => t.id === id), [transactions, id]);
  const [type, setType] = useState(existing?.type || 'expense');
  const [amount, setAmount] = useState(existing ? String(existing.amount) : '');
  const [title, setTitle] = useState(existing?.title || '');
  const [note, setNote] = useState(existing?.note || '');
  const [categoryId, setCategoryId] = useState(existing?.category_id || null);
  const [date, setDate] = useState(existing ? new Date(existing.created_at || existing.date) : new Date());
  const [showDate, setShowDate] = useState(false);
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState('monthly');

  const filteredCats = useMemo(
    () => categories.filter((c) => c.type === type),
    [categories, type]
  );

  useEffect(() => {
    if (filteredCats.length > 0 && !filteredCats.find((c) => c.id === categoryId)) {
      setCategoryId(filteredCats[0].id);
    }
  }, [filteredCats]);

  const close = () => router.back();

  const onSave = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      hError();
      show('Enter a valid amount', { variant: 'error' });
      return;
    }
    try {
      if (isEdit) {
        await updateTransaction(id, {
          type,
          amount: amt,
          title,
          note,
          category_id: categoryId,
          created_at: date.toISOString(),
        });
        hSuccess();
        show('Transaction updated', { variant: 'success' });
      } else {
        await addTransaction({
          type,
          amount: amt,
          title,
          note,
          category_id: categoryId,
          created_at: date.toISOString(),
        });
        if (recurring) {
          await addRecurring({
            type,
            amount: amt,
            title,
            note,
            category_id: categoryId,
            frequency,
            start_date: date.toISOString(),
            next_due_date: nextRecurringFrom(date, frequency).toISOString(),
            is_active: true,
          });
        }
        hSuccess();
        show(type === 'income' ? 'Income added' : 'Expense added', { variant: 'success' });
      }
      close();
    } catch (e) {
      hError();
      show('Could not save transaction', { variant: 'error' });
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.headerRow}>
            <Text style={[TEXT_STYLES.h2]}>{isEdit ? 'Edit transaction' : 'Add transaction'}</Text>
            <Pressable onPress={close} hitSlop={10} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={COLORS.textPrimary} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: SPACING.huge }}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.body}>
              <SegmentedControl
                options={[
                  { value: 'expense', label: 'Expense' },
                  { value: 'income', label: 'Income' },
                ]}
                value={type}
                onChange={(v) => { hSelection(); setType(v); }}
                accent={type === 'income' ? COLORS.income : COLORS.expense}
              />

              <View style={styles.amountWrap}>
                <Text style={styles.amountPrefix}>{getCurrencySymbol(settings.currency)}</Text>
                <TextInput
                  value={amount}
                  onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="decimal-pad"
                  style={styles.amountInput}
                  selectionColor={COLORS.primary}
                  maxLength={10}
                />
              </View>

              <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.sm }]}>Category</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: SPACING.sm, paddingRight: SPACING.lg }}
              >
                {filteredCats.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    icon={c.icon}
                    color={c.color}
                    selected={categoryId === c.id}
                    onPress={() => setCategoryId(c.id)}
                  />
                ))}
              </ScrollView>

              <View style={{ marginTop: SPACING.lg }}>
                <Input
                  label="Title"
                  value={title}
                  onChangeText={setTitle}
                  placeholder="What was this for?"
                  variant="underline"
                  autoCapitalize="sentences"
                />
                <Input
                  label="Note (optional)"
                  value={note}
                  onChangeText={setNote}
                  placeholder="Additional details"
                  variant="underline"
                  multiline
                  autoCapitalize="sentences"
                />
              </View>

              <Pressable style={styles.row} onPress={() => setShowDate(true)}>
                <View style={styles.rowLeft}>
                  <Ionicons name="calendar-outline" size={20} color={COLORS.textSecondary} />
                  <Text style={styles.rowLabel}>Date</Text>
                </View>
                <Text style={styles.rowValue}>{fmtRelative(date)}</Text>
              </Pressable>

              {!isEdit ? (
                <View style={styles.row}>
                  <View style={styles.rowLeft}>
                    <Ionicons name="repeat-outline" size={20} color={COLORS.textSecondary} />
                    <Text style={styles.rowLabel}>Make recurring</Text>
                  </View>
                  <Toggle value={recurring} onChange={setRecurring} />
                </View>
              ) : null}

              {recurring && !isEdit ? (
                <Animated.View entering={FadeIn} style={{ marginTop: SPACING.md }}>
                  <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.sm }]}>Frequency</Text>
                  <SegmentedControl
                    options={[
                      { value: 'daily', label: 'Daily' },
                      { value: 'weekly', label: 'Weekly' },
                      { value: 'monthly', label: 'Monthly' },
                    ]}
                    value={frequency}
                    onChange={setFrequency}
                  />
                </Animated.View>
              ) : null}

              <Button
                title={isEdit ? 'Save changes' : 'Save transaction'}
                onPress={onSave}
                style={{ marginTop: SPACING.xxl }}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {showDate ? (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="fade" visible onRequestClose={() => setShowDate(false)}>
            <Pressable style={modalStyles.backdrop} onPress={() => setShowDate(false)} />
            <View style={modalStyles.iosWrap}>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={(_, d) => d && setDate(mergeDateKeepTime(d, date))}
                themeVariant="dark"
                textColor={COLORS.textPrimary}
              />
              <Button title="Done" onPress={() => setShowDate(false)} style={{ margin: SPACING.lg }} />
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(event, d) => {
              setShowDate(false);
              if (event.type === 'set' && d) setDate(mergeDateKeepTime(d, date));
            }}
          />
        )
      ) : null}
    </GradientBackground>
  );
}

// Date-only pickers return midnight for the picked day, which then renders as
// "12:00 AM" in transaction rows. Keep the time-of-day from the previous value.
const mergeDateKeepTime = (picked, previous) => {
  const merged = new Date(picked);
  const src = previous instanceof Date ? previous : new Date();
  merged.setHours(src.getHours(), src.getMinutes(), src.getSeconds(), src.getMilliseconds());
  return merged;
};

const nextRecurringFrom = (start, frequency) => {
  const d = new Date(start);
  if (frequency === 'daily') d.setDate(d.getDate() + 1);
  else if (frequency === 'weekly') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return d;
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  body: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
  },
  amountWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    marginVertical: SPACING.xxxl,
  },
  amountPrefix: {
    color: COLORS.textMuted,
    fontFamily: FONT.regular,
    fontSize: 30,
    marginRight: SPACING.sm,
  },
  amountInput: {
    color: COLORS.textPrimary,
    fontFamily: FONT.semibold,
    fontSize: 56,
    letterSpacing: -2,
    minWidth: 100,
    textAlign: 'left',
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SPACING.sm,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: {
    color: COLORS.textPrimary,
    fontFamily: FONT.medium,
    fontSize: 15,
    marginLeft: SPACING.md,
  },
  rowValue: {
    color: COLORS.textSecondary,
    fontFamily: FONT.medium,
    fontSize: 14,
  },
});

const modalStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: COLORS.overlay },
  iosWrap: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    backgroundColor: COLORS.surfaceElevated,
    borderTopLeftRadius: RADIUS.xxl,
    borderTopRightRadius: RADIUS.xxl,
    paddingTop: SPACING.lg,
  },
});
