import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, FlatList, RefreshControl, Pressable, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import Input from '../../components/ui/Input';
import Chip from '../../components/ui/Chip';
import EmptyState from '../../components/ui/EmptyState';
import TransactionRow from '../../components/transactions/TransactionRow';
import DownloadPdfSheet from '../../components/DownloadPdfSheet';
import DateRangeSheet from '../../components/DateRangeSheet';
import { useData } from '../../context/DataContext';
import { fmtRelative, monthRange, subMonths, safeParse, fmt, startOfDay, endOfDay } from '../../utils/date';
import { formatAmount } from '../../utils/currency';
import { useToast } from '../../components/ui/Toast';
import { hError, hSuccess } from '../../utils/haptics';

const FILTERS = [
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'custom', label: 'Custom range' },
];

export default function History() {
  const router = useRouter();
  const { transactions, categories, settings, deleteTransaction, refresh, activeProfile } = useData();
  const { show } = useToast();
  const [query, setQuery] = useState('');
  // Default to "This month" — opening History now lands on the current
  // month's spending, which is what most users want to see first.
  const [filter, setFilter] = useState('this_month');
  const [customRange, setCustomRange] = useState({ from: null, to: null });
  const [rangeSheetOpen, setRangeSheetOpen] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);

  // Hide the Income / Expense type chips entirely in expense-only mode —
  // they'd just be confusing (income chip would always be empty, expense
  // chip is the same as "all").
  const visibleFilters = useMemo(
    () => (activeProfile?.mode === 'expense_only'
      ? FILTERS.filter((f) => f.value !== 'income' && f.value !== 'expense')
      : FILTERS),
    [activeProfile?.mode]
  );
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filter === 'income' || filter === 'expense') {
      list = list.filter((t) => t.type === filter);
    } else if (filter === 'this_month') {
      const { start, end } = monthRange(new Date());
      list = list.filter((t) => {
        const d = safeParse(t.created_at || t.date);
        return d >= start && d <= end;
      });
    } else if (filter === 'last_month') {
      const { start, end } = monthRange(subMonths(new Date(), 1));
      list = list.filter((t) => {
        const d = safeParse(t.created_at || t.date);
        return d >= start && d <= end;
      });
    } else if (filter === 'custom' && customRange.from && customRange.to) {
      const start = startOfDay(customRange.from);
      const end = endOfDay(customRange.to);
      list = list.filter((t) => {
        const d = safeParse(t.created_at || t.date);
        return d >= start && d <= end;
      });
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((t) => {
        const cat = categories.find((c) => c.id === t.category_id);
        return (
          (t.title || '').toLowerCase().includes(q) ||
          (t.note || '').toLowerCase().includes(q) ||
          (cat?.name || '').toLowerCase().includes(q)
        );
      });
    }
    list.sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date));
    return list;
  }, [transactions, categories, filter, query, customRange.from, customRange.to]);

  // Group by date
  const sections = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      const key = fmtRelative(t.created_at || t.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    const result = [];
    for (const [title, items] of map) {
      result.push({ type: 'header', title, key: `h-${title}` });
      for (const it of items) result.push({ type: 'item', tx: it, key: `t-${it.id}` });
    }
    return result;
  }, [filtered]);

  const totalIncome = filtered.filter((t) => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = filtered.filter((t) => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  const onDelete = (tx) => {
    Alert.alert('Delete transaction?', tx.title || 'This transaction will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteTransaction(tx.id);
            hSuccess();
            show('Deleted', { variant: 'success' });
          } catch {
            hError();
            show('Could not delete', { variant: 'error' });
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dateHeader}>
          <Text style={TEXT_STYLES.label}>{item.title}</Text>
        </View>
      );
    }
    const cat = categories.find((c) => c.id === item.tx.category_id);
    return (
      <Pressable
        onLongPress={() => onDelete(item.tx)}
        style={styles.itemCard}
      >
        <TransactionRow
          tx={item.tx}
          category={cat}
          currency={settings.currency}
          onPress={() => router.push(`/transaction/${item.tx.id}`)}
        />
      </Pressable>
    );
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={[TEXT_STYLES.h1]}>History</Text>
            <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 14, marginTop: 4 }}>
              {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'} · {formatAmount(totalIncome - totalExpense, settings.currency)}
            </Text>
          </View>
          <Pressable
            onPress={() => setDownloadOpen(true)}
            hitSlop={8}
            style={({ pressed }) => [
              styles.downloadBtn,
              pressed && { backgroundColor: COLORS.surfacePressed },
            ]}
          >
            <Ionicons name="download-outline" size={18} color={COLORS.primary} />
            <Text style={styles.downloadBtnText}>Download</Text>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: SPACING.xl }}>
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search transactions"
            leftIcon="search"
            variant="surface"
            style={{ marginBottom: SPACING.md }}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.xl, gap: SPACING.sm }}
          >
            {visibleFilters.map((f) => {
              // Custom-range chip behaves a bit differently: tapping it
              // opens the date picker. When a range is set, its label
              // shows the actual span (e.g. "May 1 – May 12").
              const isCustom = f.value === 'custom';
              const customLabel =
                isCustom && customRange.from && customRange.to
                  ? `${fmt(customRange.from, 'MMM d')} – ${fmt(customRange.to, 'MMM d')}`
                  : f.label;
              return (
                <Chip
                  key={f.value}
                  label={customLabel}
                  selected={filter === f.value}
                  onPress={() => {
                    if (isCustom) {
                      setRangeSheetOpen(true);
                    } else {
                      setFilter(f.value);
                    }
                  }}
                />
              );
            })}
          </ScrollView>
        </View>

        {sections.length === 0 ? (
          <View style={styles.emptyWrap}>
            <EmptyState
              icon="search-outline"
              title="No transactions found"
              subtitle={query ? 'Try a different search term' : 'Add some transactions to see them here'}
            />
          </View>
        ) : (
          <FlatList
            data={sections}
            keyExtractor={(item) => item.key}
            renderItem={renderItem}
            contentContainerStyle={{ paddingTop: SPACING.sm, paddingBottom: 140, paddingHorizontal: SPACING.xl }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} colors={[COLORS.primary]} />
            }
          />
        )}

        <DownloadPdfSheet
          visible={downloadOpen}
          onClose={() => setDownloadOpen(false)}
        />
        <DateRangeSheet
          visible={rangeSheetOpen}
          initialFrom={customRange.from}
          initialTo={customRange.to}
          onClose={() => setRangeSheetOpen(false)}
          onApply={(from, to) => {
            setCustomRange({ from, to });
            setFilter('custom');
            setRangeSheetOpen(false);
          }}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  downloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: `${COLORS.primary}55`,
    backgroundColor: `${COLORS.primary}18`,
    marginTop: 6,
  },
  downloadBtnText: {
    color: COLORS.primary,
    fontFamily: FONT.semibold,
    fontSize: 13,
    marginLeft: 6,
  },
  filterBar: {
    paddingBottom: SPACING.md,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 120,
  },
  dateHeader: {
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
    overflow: 'hidden',
  },
});
