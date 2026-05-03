import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import Button from '../../components/ui/Button';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { fmt, fmtTime } from '../../utils/date';
import { formatSigned } from '../../utils/currency';
import { hError, hSuccess } from '../../utils/haptics';

export default function TransactionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { transactions, categories, settings, deleteTransaction } = useData();
  const { show } = useToast();

  const tx = useMemo(() => transactions.find((t) => t.id === id), [transactions, id]);
  if (!tx) {
    return (
      <GradientBackground>
        <SafeAreaView style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 14 }}>
              Transaction not found
            </Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: SPACING.md }} hitSlop={10}>
              <Text style={{ color: COLORS.primary, fontFamily: FONT.semibold, fontSize: 15 }}>Go back</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const cat = categories.find((c) => c.id === tx.category_id);
  const color = cat?.color || (tx.type === 'income' ? COLORS.income : COLORS.expense);

  const onDelete = () => {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(tx.id);
            hSuccess();
            show('Deleted', { variant: 'success' });
            router.back();
          } catch {
            hError();
            show('Could not delete', { variant: 'error' });
          }
        },
      },
    ]);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.back}>
            <Ionicons name="chevron-back" size={22} color={COLORS.textPrimary} />
          </Pressable>
          <Text style={[TEXT_STYLES.h2, { flex: 1, marginLeft: SPACING.md }]}>Transaction</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <View style={styles.heroWrap}>
            <View style={[styles.hero, { borderColor: `${color}40`, backgroundColor: `${color}15` }, SHADOWS.card]}>
              <View style={[styles.iconCircle, { backgroundColor: color }]}>
                <Ionicons name={cat?.icon || (tx.type === 'income' ? 'arrow-up' : 'arrow-down')} size={28} color={COLORS.white} />
              </View>
              <Text style={[TEXT_STYLES.label, { color, marginTop: SPACING.lg }]}>
                {tx.type === 'income' ? 'Income' : 'Expense'}
              </Text>
              <Text
                style={{
                  color: tx.type === 'income' ? COLORS.income : COLORS.expense,
                  fontFamily: FONT.semibold,
                  fontSize: 40,
                  letterSpacing: -1.5,
                  marginTop: 4,
                }}
              >
                {formatSigned(tx.amount, tx.type, settings.currency)}
              </Text>
              <Text style={{ color: COLORS.textPrimary, fontFamily: FONT.medium, fontSize: 18, marginTop: 4 }}>
                {tx.title || '—'}
              </Text>
            </View>
          </View>

          <View style={{ paddingHorizontal: SPACING.xl, marginTop: SPACING.xl }}>
            <View style={styles.detailCard}>
              <DetailRow icon="pricetag-outline" label="Category" value={cat?.name || 'Uncategorized'} />
              <DetailRow icon="calendar-outline" label="Date" value={fmt(tx.date, 'EEEE, MMM d, yyyy')} />
              <DetailRow icon="time-outline" label="Time" value={fmtTime(tx.date)} />
              {tx.note ? <DetailRow icon="document-text-outline" label="Note" value={tx.note} /> : null}
              {tx.recurring_id ? <DetailRow icon="repeat-outline" label="Source" value="Recurring" /> : null}
            </View>

            <Button
              title="Edit"
              variant="outline"
              onPress={() => router.push({ pathname: '/add-transaction', params: { id: tx.id } })}
              style={{ marginTop: SPACING.xl }}
              icon={<Ionicons name="create-outline" size={18} color={COLORS.textPrimary} />}
            />
            <Button
              title="Delete transaction"
              variant="danger"
              onPress={onDelete}
              style={{ marginTop: SPACING.md }}
              icon={<Ionicons name="trash-outline" size={18} color={COLORS.danger} />}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.detailRow}>
    <View style={styles.detailIcon}>
      <Ionicons name={icon} size={16} color={COLORS.textSecondary} />
    </View>
    <Text style={{ flex: 1, color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 13 }}>{label}</Text>
    <Text style={{ color: COLORS.textPrimary, fontFamily: FONT.medium, fontSize: 14, maxWidth: '60%', textAlign: 'right' }}>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  back: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  heroWrap: { paddingHorizontal: SPACING.xl, marginTop: SPACING.sm },
  hero: {
    alignItems: 'center',
    padding: SPACING.xxl,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  detailCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  detailIcon: {
    width: 24, height: 24, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.sm,
  },
});
