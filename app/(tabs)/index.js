import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import HeroBalanceCard from '../../components/HeroBalanceCard';
import BudgetProgressBar from '../../components/BudgetProgressBar';
import SyncIndicator from '../../components/SyncIndicator';
import TransactionRow from '../../components/transactions/TransactionRow';
import EmptyState from '../../components/ui/EmptyState';
import ProfileSwitcherSheet from '../../components/profiles/ProfileSwitcherSheet';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { greeting } from '../../utils/date';

export default function Dashboard() {
  const router = useRouter();
  const { user, isOfflineMode } = useAuth();
  const { transactions, categories, settings, getMonthlyStats, refresh, syncStatus, hydrated, profiles, activeProfile } = useData();
  const [refreshing, setRefreshing] = useState(false);
  const [profileSwitcher, setProfileSwitcher] = useState(false);

  const stats = useMemo(() => getMonthlyStats(new Date()), [getMonthlyStats]);
  const recent = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.created_at || b.date) - new Date(a.created_at || a.date))
      .slice(0, 5);
  }, [transactions]);

  const profileName = settings.name?.trim();
  const userName = profileName || user?.email?.split('@')?.[0] || (isOfflineMode ? 'Offline' : 'You');

  const onRefresh = async () => {
    setRefreshing(true);
    try { await refresh(); } finally { setRefreshing(false); }
  };

  const overBudget = settings.monthly_budget > 0 && stats.expense >= settings.monthly_budget;

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
              colors={[COLORS.primary]}
            />
          }
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 13 }}>
                {greeting()}
              </Text>
              <Text style={[TEXT_STYLES.h2, { textTransform: 'capitalize' }]}>{userName}</Text>
            </View>
            <SyncIndicator />
          </View>

          {/* Active profile chip — tap to quick-switch between profiles */}
          {profiles && profiles.length > 0 && activeProfile ? (
            <View style={{ paddingHorizontal: SPACING.xl, marginBottom: SPACING.sm }}>
              <Pressable
                onPress={() => setProfileSwitcher(true)}
                style={[
                  styles.profileChip,
                  { borderColor: `${activeProfile.color}55`, backgroundColor: `${activeProfile.color}18` },
                ]}
              >
                <Ionicons name={activeProfile.icon} size={14} color={activeProfile.color} />
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontFamily: FONT.medium,
                    fontSize: 12,
                    marginLeft: 6,
                    letterSpacing: 0.2,
                  }}
                >
                  {activeProfile.name}
                </Text>
                {profiles.length > 1 ? (
                  <Ionicons name="swap-horizontal" size={12} color={COLORS.textSecondary} style={{ marginLeft: 6 }} />
                ) : null}
              </Pressable>
            </View>
          ) : null}

          {/* Hero balance */}
          <View style={{ paddingHorizontal: SPACING.xl, marginTop: SPACING.md }}>
            <HeroBalanceCard
              income={stats.income}
              expense={stats.expense}
              currency={settings.currency}
              mode={activeProfile?.mode || 'salary'}
              count={stats.count}
            />
          </View>

          {/* Over-budget banner */}
          {overBudget ? (
            <View style={styles.overBudget}>
              <Ionicons name="alert-circle" size={20} color={COLORS.danger} style={{ marginRight: SPACING.sm }} />
              <Text style={{ color: COLORS.textPrimary, fontFamily: FONT.medium, fontSize: 13, flex: 1 }}>
                You've exceeded your monthly budget. Time to reassess.
              </Text>
            </View>
          ) : null}

          {/* Budget */}
          <View style={{ paddingHorizontal: SPACING.xl, marginTop: SPACING.lg }}>
            <BudgetProgressBar
              used={stats.expense}
              budget={settings.monthly_budget}
              currency={settings.currency}
              onSet={() => router.push('/(tabs)/settings')}
            />
          </View>

          {/* Recent */}
          <View style={{ paddingHorizontal: SPACING.xl, marginTop: SPACING.xl }}>
            <View style={styles.sectionHeader}>
              <Text style={TEXT_STYLES.label}>Recent</Text>
              <Pressable onPress={() => router.push('/(tabs)/history')} hitSlop={8}>
                <Text style={{ color: COLORS.primary, fontFamily: FONT.medium, fontSize: 13 }}>See all →</Text>
              </Pressable>
            </View>

            {recent.length === 0 ? (
              <EmptyState
                icon="add-circle-outline"
                title="Add your first transaction"
                subtitle="Tap the + button to start tracking"
              />
            ) : (
              <View style={styles.recentCard}>
                {recent.map((tx, i) => (
                  <View key={tx.id}>
                    <TransactionRow
                      tx={tx}
                      category={categories.find((c) => c.id === tx.category_id)}
                      currency={settings.currency}
                      onPress={() => router.push(`/transaction/${tx.id}`)}
                    />
                    {i < recent.length - 1 ? <View style={styles.separator} /> : null}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Quick stat row */}
          {recent.length > 0 ? (
            <View style={{ paddingHorizontal: SPACING.xl, marginTop: SPACING.xl }}>
              <View style={styles.quickRow}>
                <QuickStat
                  label="Transactions"
                  value={stats.count}
                  icon="receipt-outline"
                  color={COLORS.primary}
                />
                <QuickStat
                  label="Top category"
                  value={stats.byCategory[0]?.name || '—'}
                  icon="trending-up-outline"
                  color={COLORS.accent}
                  small
                />
              </View>
            </View>
          ) : null}
        </ScrollView>

        <ProfileSwitcherSheet
          visible={profileSwitcher}
          onClose={() => setProfileSwitcher(false)}
        />
      </SafeAreaView>
    </GradientBackground>
  );
}

const QuickStat = ({ label, value, icon, color, small }) => (
  <View
    style={{
      flex: 1,
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      padding: SPACING.lg,
    }}
  >
    <View
      style={{
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: `${color}20`, alignItems: 'center', justifyContent: 'center',
        marginBottom: SPACING.md,
      }}
    >
      <Ionicons name={icon} size={18} color={color} />
    </View>
    <Text style={[TEXT_STYLES.label, { marginBottom: 6 }]}>{label}</Text>
    <Text style={small ? TEXT_STYLES.amountSmall : TEXT_STYLES.amountMedium} numberOfLines={1}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  overBudget: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.xl,
    marginTop: SPACING.md,
    backgroundColor: COLORS.expenseBg,
    borderWidth: 1,
    borderColor: COLORS.expenseBorder,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  recentCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.lg,
  },
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
