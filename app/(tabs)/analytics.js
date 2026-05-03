import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import EmptyState from '../../components/ui/EmptyState';
import PieRing from '../../components/charts/PieRing';
import BarsChart from '../../components/charts/BarsChart';
import LineChart from '../../components/charts/LineChart';
import { useData } from '../../context/DataContext';
import { addMonths, subMonths, fmtMonth, monthRange, safeParse } from '../../utils/date';
import { formatAmount } from '../../utils/currency';
import { hSelection } from '../../utils/haptics';

export default function Analytics() {
  const { width } = useWindowDimensions();
  const { transactions, settings, getMonthlyStats, getMultiMonthStats } = useData();
  const [month, setMonth] = useState(new Date());

  const stats = useMemo(() => getMonthlyStats(month), [getMonthlyStats, month]);
  const multi = useMemo(() => getMultiMonthStats(6, new Date()), [getMultiMonthStats]);

  const daysCount = monthRange(month).end.getDate();
  const avgDaily = stats.expense > 0 ? stats.expense / daysCount : 0;
  const highestDay = useMemo(() => {
    let max = 0;
    for (const d of stats.dailyTrend) if (d.value > max) max = d.value;
    return max;
  }, [stats.dailyTrend]);

  const chartW = width - SPACING.xl * 2;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 140 }}
        >
          <View style={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.md }}>
            <Text style={TEXT_STYLES.h1}>Analytics</Text>
          </View>

          {/* Month selector */}
          <View style={styles.monthSelector}>
            <Pressable
              hitSlop={10}
              onPress={() => { hSelection(); setMonth((m) => subMonths(m, 1)); }}
              style={styles.monthArrow}
            >
              <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
            </Pressable>
            <Text style={[TEXT_STYLES.h2, { marginHorizontal: SPACING.lg }]}>{fmtMonth(month)}</Text>
            <Pressable
              hitSlop={10}
              onPress={() => { hSelection(); setMonth((m) => addMonths(m, 1)); }}
              style={styles.monthArrow}
            >
              <Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} />
            </Pressable>
          </View>

          {/* Stat grid */}
          <View style={styles.statGrid}>
            <Stat icon="trending-down-outline" label="Avg daily spend" value={formatAmount(avgDaily, settings.currency)} color={COLORS.primary} />
            <Stat icon="alert-circle-outline" label="Highest day" value={formatAmount(highestDay, settings.currency)} color={COLORS.warning} />
            <Stat icon="ribbon-outline" label="Top category" value={stats.byCategory[0]?.name || '—'} color={COLORS.accent} small />
          </View>

          {/* Pie */}
          {stats.byCategory.length > 0 ? (
            <View style={styles.section}>
              <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.md }]}>Expense by category</Text>
              <View style={styles.card}>
                <PieRing data={stats.byCategory} currency={settings.currency} total={stats.expense} />
                <View style={{ marginTop: SPACING.lg }}>
                  {stats.byCategory.slice(0, 6).map((c) => {
                    const pct = stats.expense > 0 ? (c.amount / stats.expense) * 100 : 0;
                    return (
                      <View key={c.category_id} style={styles.legendRow}>
                        <View style={[styles.dot, { backgroundColor: c.color }]} />
                        <Text style={{ flex: 1, color: COLORS.textPrimary, fontFamily: FONT.medium, fontSize: 14 }}>
                          {c.name}
                        </Text>
                        <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 13, marginRight: SPACING.md }}>
                          {pct.toFixed(0)}%
                        </Text>
                        <Text style={{ color: COLORS.textPrimary, fontFamily: FONT.semibold, fontSize: 14 }}>
                          {formatAmount(c.amount, settings.currency)}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : (
            <View style={{ marginTop: SPACING.xl }}>
              <EmptyState
                icon="bar-chart-outline"
                title="No data for this month"
                subtitle="Add some transactions to see beautiful charts"
              />
            </View>
          )}

          {/* Bar chart */}
          <View style={styles.section}>
            <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.md }]}>Last 6 months</Text>
            <View style={styles.card}>
              <BarsChart data={multi} width={chartW - SPACING.lg * 2} height={200} />
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.sm }}>
                <Legend color={COLORS.income} label="Income" />
                <View style={{ width: SPACING.lg }} />
                <Legend color={COLORS.expense} label="Expense" />
              </View>
            </View>
          </View>

          {/* Line trend */}
          {stats.dailyTrend.length > 0 ? (
            <View style={styles.section}>
              <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.md }]}>Daily spending trend</Text>
              <View style={styles.card}>
                <LineChart data={stats.dailyTrend} width={chartW - SPACING.lg * 2} height={180} />
              </View>
            </View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

const Stat = ({ icon, label, value, color, small }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.md,
    }}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm }}>
      <View
        style={{
          width: 28, height: 28, borderRadius: 14,
          backgroundColor: `${color}25`,
          alignItems: 'center', justifyContent: 'center',
          marginRight: SPACING.sm,
        }}
      >
        <Ionicons name={icon} size={14} color={color} />
      </View>
    </View>
    <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.medium, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' }}>
      {label}
    </Text>
    <Text
      numberOfLines={1}
      style={{ color: COLORS.textPrimary, fontFamily: FONT.semibold, fontSize: small ? 14 : 16, marginTop: 4 }}
    >
      {value}
    </Text>
  </View>
);

const Legend = ({ color, label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
    <View style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: color, marginRight: 6 }} />
    <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.medium, fontSize: 12 }}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.md,
  },
  monthArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  statGrid: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  section: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dot: {
    width: 10, height: 10, borderRadius: 5, marginRight: SPACING.sm,
  },
});
