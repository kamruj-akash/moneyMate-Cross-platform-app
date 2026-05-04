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
import { useData } from '../../context/DataContext';
import { fmtRelative, monthRange, subMonths, safeParse } from '../../utils/date';
import { formatAmount } from '../../utils/currency';
import { useToast } from '../../components/ui/Toast';
import { hError, hSuccess } from '../../utils/haptics';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
];

export default function History() {
  const router = useRouter();
  const { transactions, categories, settings, deleteTransaction, refresh } = useData();
  const { show } = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const filtered = useMemo(() => {
    let list = [...transactions];
    if (filter === 'income' || filter === 'expense') {
      list = list.filter((t) => t.type === filter);
    } else if (filter === 'this_month') {
      const { start, end } = monthRange(new Date());
      list = list.filter((t) => {
        const d = safeParse(t.date);
        return d >= start && d <= end;
      });
    } else if (filter === 'last_month') {
      const { start, end } = monthRange(subMonths(new Date(), 1));
      list = list.filter((t) => {
        const d = safeParse(t.date);
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
    list.sort((a, b) => new Date(b.date) - new Date(a.date));
    return list;
  }, [transactions, categories, filter, query]);

  // Group by date
  const sections = useMemo(() => {
    const map = new Map();
    for (const t of filtered) {
      const key = fmtRelative(t.date);
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
        <View style={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.sm }}>
          <Text style={[TEXT_STYLES.h1]}>History</Text>
          <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 14, marginTop: 4 }}>
            {filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'} · {formatAmount(totalIncome - totalExpense, settings.currency)}
          </Text>
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
            {FILTERS.map((f) => (
              <Chip
                key={f.value}
                label={f.label}
                selected={filter === f.value}
                onPress={() => setFilter(f.value)}
              />
            ))}
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
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
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
