import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING, TEXT_STYLES } from '../../constants/theme';
import GradientBackground from '../../components/GradientBackground';
import SyncIndicator from '../../components/SyncIndicator';
import Sheet from '../../components/ui/Sheet';
import SheetHeader from '../../components/ui/SheetHeader';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Toggle from '../../components/ui/Toggle';
import Chip from '../../components/ui/Chip';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/ui/Toast';
import { fullSync } from '../../lib/syncManager';
import { CURRENCY_OPTIONS, formatAmount } from '../../utils/currency';
import { exportBackupJSON, exportTransactionsPDF } from '../../lib/export';
import { fmt } from '../../utils/date';
import { hSuccess, hError } from '../../utils/haptics';

export default function Settings() {
  const router = useRouter();
  const { user, isOfflineMode, signOut, exitOfflineMode } = useAuth();
  const {
    transactions, categories, recurring, settings, syncStatus,
    updateBudget, updateSettings, deleteRecurring, updateRecurring, replaceAllData,
  } = useData();
  const { show } = useToast();

  const [budgetSheet, setBudgetSheet] = useState(false);
  const [budgetInput, setBudgetInput] = useState(String(settings.monthly_budget || ''));
  const [thresholdInput, setThresholdInput] = useState(String(settings.alert_threshold || 80));

  const [recurringSheet, setRecurringSheet] = useState(false);
  const [currencySheet, setCurrencySheet] = useState(false);

  const [syncing, setSyncing] = useState(false);

  const onForceSync = async () => {
    if (isOfflineMode || !user) {
      show('Login to enable sync', { variant: 'info' });
      return;
    }
    setSyncing(true);
    try {
      await fullSync();
      hSuccess();
      show('Synced successfully', { variant: 'success' });
    } catch {
      hError();
      show('Sync failed', { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const onLogout = () => {
    Alert.alert('Logout?', 'You can log in again anytime. Local data stays on this device.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/(auth)/welcome');
        },
      },
    ]);
  };

  const onClearAllData = () => {
    Alert.alert('Clear all local data?', 'Everything stored on this device will be removed. Cloud data is unaffected.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Are you absolutely sure?', 'This cannot be undone.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Yes, clear it',
              style: 'destructive',
              onPress: async () => {
                await replaceAllData({ transactions: [], categories: [], recurring: [], settings: { ...settings, monthly_budget: 0 } });
                hSuccess();
                show('All local data cleared', { variant: 'success' });
              },
            },
          ]);
        },
      },
    ]);
  };

  const saveBudget = async () => {
    const limit = Number(budgetInput) || 0;
    const thr = Math.min(100, Math.max(50, Number(thresholdInput) || 80));
    await updateBudget(limit, thr);
    hSuccess();
    show('Budget updated', { variant: 'success' });
    setBudgetSheet(false);
  };

  const exportPDF = async () => {
    try {
      const r = await exportTransactionsPDF({
        transactions, categories, currency: settings.currency,
        monthLabel: fmt(new Date(), 'MMMM yyyy'),
      });
      if (!r) show('PDF export not available', { variant: 'warning' });
      else hSuccess();
    } catch {
      hError();
      show('Could not export', { variant: 'error' });
    }
  };
  const backupJSON = async () => {
    try {
      await exportBackupJSON({ transactions, categories, recurring, settings });
      hSuccess();
    } catch {
      hError();
      show('Could not back up', { variant: 'error' });
    }
  };

  const restoreJSON = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
      if (res.canceled) return;
      const file = res.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const data = JSON.parse(content);
      Alert.alert(
        'Restore from backup?',
        `Found ${data?.transactions?.length || 0} transactions, ${data?.categories?.length || 0} categories. This will replace your current local data.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Restore',
            onPress: async () => {
              await replaceAllData({
                transactions: data.transactions || [],
                categories: data.categories || [],
                recurring: data.recurring || [],
                settings: data.settings || settings,
              });
              hSuccess();
              show('Restored', { variant: 'success' });
            },
          },
        ]
      );
    } catch {
      hError();
      show('Invalid backup file', { variant: 'error' });
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView contentContainerStyle={{ paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          <View style={{ paddingHorizontal: SPACING.xl, paddingTop: SPACING.md, paddingBottom: SPACING.lg }}>
            <Text style={TEXT_STYLES.h1}>Settings</Text>
          </View>

          {/* Account */}
          <Section>
            <View style={[styles.accountCard, SHADOWS.card]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.lg }}>
                <View style={styles.avatar}>
                  <Ionicons name={user ? 'person' : 'cloud-offline'} size={20} color={COLORS.white} />
                </View>
                <View style={{ flex: 1, marginLeft: SPACING.md }}>
                  <Text style={[TEXT_STYLES.h3]} numberOfLines={1}>
                    {user?.email || 'Offline mode'}
                  </Text>
                  <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 12, marginTop: 2 }}>
                    {syncStatus.lastSync ? `Last synced ${fmt(syncStatus.lastSync, "h:mm a 'on' MMM d")}` : 'Never synced'}
                  </Text>
                </View>
                <SyncIndicator compact />
              </View>

              <Button title={syncing ? 'Syncing…' : 'Force sync now'} variant="outline" onPress={onForceSync} loading={syncing} />

              {user ? (
                <Pressable onPress={onLogout} style={{ marginTop: SPACING.md, alignSelf: 'flex-start' }} hitSlop={10}>
                  <Text style={{ color: COLORS.danger, fontFamily: FONT.medium, fontSize: 14 }}>Logout</Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={async () => {
                    await exitOfflineMode();
                    router.replace('/(auth)/welcome');
                  }}
                  style={{ marginTop: SPACING.md, alignSelf: 'flex-start' }}
                  hitSlop={10}
                >
                  <Text style={{ color: COLORS.primary, fontFamily: FONT.medium, fontSize: 14 }}>
                    Create an account →
                  </Text>
                </Pressable>
              )}
            </View>
          </Section>

          {/* Budget */}
          <Section title="Budget">
            <Row
              icon="wallet-outline"
              label="Monthly budget"
              value={settings.monthly_budget > 0 ? formatAmount(settings.monthly_budget, settings.currency) : 'Not set'}
              onPress={() => { setBudgetInput(String(settings.monthly_budget || '')); setThresholdInput(String(settings.alert_threshold || 80)); setBudgetSheet(true); }}
            />
            <Row
              icon="notifications-outline"
              label="Alert threshold"
              value={`${settings.alert_threshold || 80}%`}
              onPress={() => { setBudgetInput(String(settings.monthly_budget || '')); setThresholdInput(String(settings.alert_threshold || 80)); setBudgetSheet(true); }}
            />
            <RowToggle
              icon="alert-outline"
              label="Budget notifications"
              value={settings.notifications_enabled !== false}
              onChange={(v) => updateSettings({ notifications_enabled: v })}
            />
          </Section>

          {/* Recurring */}
          <Section title="Recurring transactions">
            <Row
              icon="repeat-outline"
              label="Manage recurring"
              value={`${recurring.filter((r) => r.is_active).length} active`}
              onPress={() => setRecurringSheet(true)}
            />
          </Section>

          {/* Data */}
          <Section title="Data">
            <Row icon="document-outline" label="Export to PDF" onPress={exportPDF} />
            <Row icon="cloud-download-outline" label="Backup" onPress={backupJSON} />
            <Row icon="cloud-upload-outline" label="Restore" onPress={restoreJSON} />
            <Row icon="grid-outline" label="Manage categories" onPress={() => router.push('/(tabs)/categories')} />
          </Section>

          {/* Preferences */}
          <Section title="Preferences">
            <Row
              icon="cash-outline"
              label="Currency"
              value={settings.currency || 'BDT'}
              onPress={() => setCurrencySheet(true)}
            />
            <Row icon="information-circle-outline" label="App version" value="1.0.0" />
          </Section>

          {/* Danger */}
          <Section title="Danger zone">
            <Row
              icon="trash-outline"
              label="Clear all local data"
              danger
              onPress={onClearAllData}
            />
          </Section>
        </ScrollView>

        {/* Budget Sheet */}
        <Sheet visible={budgetSheet} onClose={() => setBudgetSheet(false)}>
          <SheetHeader
            title="Monthly budget"
            subtitle="Set how much you want to spend each month"
            onClose={() => setBudgetSheet(false)}
          />
          <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge }} keyboardShouldPersistTaps="handled">
            <Input
              label="Budget amount"
              value={budgetInput}
              onChangeText={(v) => setBudgetInput(v.replace(/[^0-9.]/g, ''))}
              keyboardType="decimal-pad"
              placeholder="0"
              variant="surface"
              leftIcon="cash-outline"
            />
            <Input
              label="Alert me at (%)"
              value={thresholdInput}
              onChangeText={(v) => setThresholdInput(v.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="80"
              variant="surface"
              leftIcon="warning-outline"
              hint="Get notified when this percent of budget is used (50–100)"
            />
            <Button title="Save" onPress={saveBudget} style={{ marginTop: SPACING.md }} />
          </ScrollView>
        </Sheet>

        {/* Recurring Sheet */}
        <Sheet visible={recurringSheet} onClose={() => setRecurringSheet(false)}>
          <SheetHeader title="Recurring" onClose={() => setRecurringSheet(false)} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge }}>
            {recurring.length === 0 ? (
              <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 14 }}>
                No recurring transactions yet. Create one when adding a transaction.
              </Text>
            ) : (
              recurring.map((r) => {
                const cat = categories.find((c) => c.id === r.category_id);
                return (
                  <View key={r.id} style={styles.recItem}>
                    <View style={[styles.recIcon, { backgroundColor: `${cat?.color || COLORS.primary}25` }]}>
                      <Ionicons name={cat?.icon || 'repeat-outline'} size={18} color={cat?.color || COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: SPACING.md }}>
                      <Text style={{ color: COLORS.textPrimary, fontFamily: FONT.medium, fontSize: 15 }} numberOfLines={1}>
                        {r.title || (r.type === 'income' ? 'Income' : 'Expense')}
                      </Text>
                      <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 12, marginTop: 2 }}>
                        {formatAmount(r.amount, settings.currency)} · {r.frequency} · {r.is_active ? 'Active' : 'Paused'}
                      </Text>
                    </View>
                    <Toggle value={r.is_active} onChange={(v) => updateRecurring(r.id, { is_active: v })} />
                    <Pressable
                      onPress={() => {
                        Alert.alert('Delete recurring?', 'Existing transactions are not removed.', [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Delete', style: 'destructive', onPress: () => deleteRecurring(r.id) },
                        ]);
                      }}
                      hitSlop={10}
                      style={{ marginLeft: SPACING.md }}
                    >
                      <Ionicons name="trash-outline" size={18} color={COLORS.textMuted} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </ScrollView>
        </Sheet>

        {/* Currency Sheet */}
        <Sheet visible={currencySheet} onClose={() => setCurrencySheet(false)}>
          <SheetHeader title="Currency" onClose={() => setCurrencySheet(false)} />
          <ScrollView contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }}>
              {CURRENCY_OPTIONS.map((c) => (
                <Chip
                  key={c.code}
                  label={`${c.code} ${c.symbol}`}
                  selected={settings.currency === c.code}
                  onPress={async () => { await updateSettings({ currency: c.code }); setCurrencySheet(false); }}
                />
              ))}
            </View>
          </ScrollView>
        </Sheet>
      </SafeAreaView>
    </GradientBackground>
  );
}

const Section = ({ title, children }) => (
  <View style={{ marginTop: SPACING.lg, paddingHorizontal: SPACING.xl }}>
    {title ? <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.sm }]}>{title}</Text> : null}
    <View style={{
      backgroundColor: COLORS.surface,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: 'hidden',
    }}>
      {children}
    </View>
  </View>
);

const Row = ({ icon, label, value, onPress, danger }) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.row,
      pressed && { backgroundColor: COLORS.surfacePressed },
    ]}
  >
    <View style={[styles.rowIcon, { backgroundColor: danger ? COLORS.expenseBg : 'rgba(127, 90, 240, 0.15)' }]}>
      <Ionicons name={icon} size={18} color={danger ? COLORS.danger : COLORS.primary} />
    </View>
    <Text style={[{ flex: 1, color: danger ? COLORS.danger : COLORS.textPrimary, fontFamily: FONT.medium, fontSize: 15 }]}>
      {label}
    </Text>
    {value ? (
      <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 13, marginRight: SPACING.sm }}>
        {value}
      </Text>
    ) : null}
    {onPress ? <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} /> : null}
  </Pressable>
);

const RowToggle = ({ icon, label, value, onChange }) => (
  <View style={styles.row}>
    <View style={[styles.rowIcon, { backgroundColor: 'rgba(127, 90, 240, 0.15)' }]}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
    </View>
    <Text style={[{ flex: 1, color: COLORS.textPrimary, fontFamily: FONT.medium, fontSize: 15 }]}>{label}</Text>
    <Toggle value={value} onChange={onChange} />
  </View>
);

const styles = StyleSheet.create({
  accountCard: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginRight: SPACING.md,
  },
  recItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  recIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
});
