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
import Sheet from '../../components/ui/Sheet';
import SheetHeader from '../../components/ui/SheetHeader';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { greeting } from '../../utils/date';
import { hSuccess } from '../../utils/haptics';

export default function Dashboard() {
  const router = useRouter();
  const { user, isOfflineMode } = useAuth();
  const { transactions, categories, settings, getMonthlyStats, refresh, syncStatus, hydrated, profiles, activeProfile, activeProfileId, switchProfile } = useData();
  const { show } = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [profileSwitcher, setProfileSwitcher] = useState(false);

  const onPickProfile = async (id, name) => {
    if (id === activeProfileId) {
      setProfileSwitcher(false);
      return;
    }
    await switchProfile(id);
    hSuccess();
    show(`Switched to "${name}"`, { variant: 'success' });
    setProfileSwitcher(false);
  };

  const stats = useMemo(() => getMonthlyStats(new Date()), [getMonthlyStats]);
  const recent = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
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
                onPress={() => {
                  if (profiles.length > 1) setProfileSwitcher(true);
                  else router.push('/(tabs)/settings');
                }}
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

        <Sheet visible={profileSwitcher} onClose={() => setProfileSwitcher(false)}>
          <SheetHeader
            title="Switch profile"
            subtitle="Tap a profile to switch ledgers"
            onClose={() => setProfileSwitcher(false)}
          />
          <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge }}>
            {profiles.map((p) => {
              const isActive = p.id === activeProfileId;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => onPickProfile(p.id, p.name)}
                  style={[
                    styles.switcherItem,
                    isActive && {
                      borderColor: p.color,
                      backgroundColor: `${p.color}18`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.switcherIcon,
                      { backgroundColor: `${p.color}33`, borderColor: `${p.color}55` },
                    ]}
                  >
                    <Ionicons name={p.icon} size={20} color={p.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: SPACING.md }}>
                    <Text style={{ color: COLORS.textPrimary, fontFamily: FONT.semibold, fontSize: 15 }} numberOfLines={1}>
                      {p.name}
                    </Text>
                    {p.is_default ? (
                      <Text style={{ color: COLORS.textMuted, fontFamily: FONT.regular, fontSize: 11, marginTop: 2, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                        Default
                      </Text>
                    ) : null}
                  </View>
                  {isActive ? <Ionicons name="checkmark-circle" size={20} color={p.color} /> : null}
                </Pressable>
              );
            })}

            <Pressable
              onPress={() => {
                setProfileSwitcher(false);
                router.push('/(tabs)/settings');
              }}
              style={styles.manageRow}
            >
              <Ionicons name="settings-outline" size={16} color={COLORS.textSecondary} />
              <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.medium, fontSize: 13, marginLeft: SPACING.sm }}>
                Manage profiles in Settings
              </Text>
            </Pressable>
          </ScrollView>
        </Sheet>
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
  switcherItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  switcherIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
  },
});
