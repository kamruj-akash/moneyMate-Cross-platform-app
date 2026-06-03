import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SPACING, TEXT_STYLES } from '../constants/theme';
import Sheet from './ui/Sheet';
import SheetHeader from './ui/SheetHeader';
import Button from './ui/Button';
import EmptyState from './ui/EmptyState';
import { useData } from '../context/DataContext';
import { useToast } from './ui/Toast';
import { monthRange, fmt, safeParse } from '../utils/date';
import { generateTransactionsPdf, savePdfToDevice, sharePdf } from '../lib/export';
import { hError, hSuccess } from '../utils/haptics';

const DownloadPdfSheet = ({ visible, onClose }) => {
  const { transactions, categories, settings } = useData();
  const { show } = useToast();
  const [selectedKey, setSelectedKey] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Derive the month list from actual transaction data — only show months
  // that have at least one transaction, so the user never picks an empty
  // month and gets a "no data" toast. Each entry also carries its tx count
  // so the cell can show a quick "12 transactions" subtitle.
  const months = useMemo(() => {
    const byKey = new Map();
    for (const t of transactions || []) {
      const d = safeParse(t.created_at || t.date);
      if (!d || isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const existing = byKey.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        byKey.set(key, {
          key,
          date: new Date(d.getFullYear(), d.getMonth(), 1),
          count: 1,
        });
      }
    }
    const now = new Date();
    const currentKey = `${now.getFullYear()}-${now.getMonth() + 1}`;
    return Array.from(byKey.values())
      .map((m) => ({
        ...m,
        label: fmt(m.date, 'MMMM yyyy'),
        isCurrent: m.key === currentKey,
      }))
      // Most-recent month first.
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [transactions]);

  // Default to the most recent month when the sheet opens.
  React.useEffect(() => {
    if (visible && !selectedKey && months.length > 0) {
      setSelectedKey(months[0].key);
    }
    if (!visible) {
      setSelectedKey(null);
    }
  }, [visible, months, selectedKey]);

  const selectedMonth = months.find((m) => m.key === selectedKey);

  // Slice transactions for the picked month — same logic the Dashboard +
  // History use, just centralised here.
  const monthTransactions = useMemo(() => {
    if (!selectedMonth) return [];
    const { start, end } = monthRange(selectedMonth.date);
    return transactions.filter((t) => {
      const d = safeParse(t.created_at || t.date);
      return d >= start && d <= end;
    });
  }, [transactions, selectedMonth]);

  // Generate the PDF once, hand the resulting URI to either save-to-device
  // or share. mode = 'save' | 'share'.
  const generate = async () => {
    if (!selectedMonth) return null;
    if (monthTransactions.length === 0) {
      hError();
      show('No transactions in this month', {
        variant: 'warning',
        description: 'Pick a month with activity to export.',
      });
      return null;
    }
    const r = await generateTransactionsPdf({
      transactions: monthTransactions,
      categories,
      currency: settings.currency,
      monthLabel: selectedMonth.label,
    });
    if (!r.ok) {
      hError();
      show('Could not create PDF', { variant: 'error', description: r.error });
      return null;
    }
    return r; // { uri, fileName }
  };

  const onSave = async () => {
    setExporting(true);
    try {
      const pdf = await generate();
      if (!pdf) return;
      const saved = await savePdfToDevice(pdf.uri, pdf.fileName);
      if (saved.ok) {
        hSuccess();
        show('PDF saved to device', {
          variant: 'success',
          description: saved.fileName,
        });
        onClose?.();
        return;
      }
      if (saved.reason === 'cancelled') return; // user dismissed picker
      hError();
      show('Could not save PDF', { variant: 'error', description: saved.error });
    } finally {
      setExporting(false);
    }
  };

  const onShare = async () => {
    setExporting(true);
    try {
      const pdf = await generate();
      if (!pdf) return;
      const shared = await sharePdf(pdf.uri);
      if (shared.ok) {
        hSuccess();
        onClose?.();
        return;
      }
      hError();
      show('Could not share PDF', { variant: 'error', description: shared.error });
    } finally {
      setExporting(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetHeader
        title="Download monthly PDF"
        subtitle="Pick a month — we'll bundle every transaction in it into a single PDF."
        onClose={onClose}
      />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: SPACING.xl, paddingBottom: SPACING.huge }}
        showsVerticalScrollIndicator={false}
      >
        {months.length === 0 ? (
          <View style={{ paddingVertical: SPACING.xxl }}>
            <EmptyState
              icon="document-outline"
              title="No transactions yet"
              subtitle="Add some transactions first, then come back here to download a monthly PDF."
            />
          </View>
        ) : (
          <>
            <Text style={[TEXT_STYLES.label, { marginBottom: SPACING.md }]}>
              Month ({months.length} {months.length === 1 ? 'available' : 'available'})
            </Text>
            <View style={styles.grid}>
              {months.map((m) => {
                const active = m.key === selectedKey;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => setSelectedKey(m.key)}
                    style={[
                      styles.monthCell,
                      active && {
                        borderColor: COLORS.primary,
                        backgroundColor: `${COLORS.primary}18`,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.monthLabel,
                        active && { color: COLORS.primary, fontFamily: FONT.semibold },
                      ]}
                      numberOfLines={1}
                    >
                      {m.label}
                    </Text>
                    <Text
                      style={[
                        styles.monthCount,
                        active && { color: COLORS.primary },
                      ]}
                    >
                      {m.count} {m.count === 1 ? 'tx' : 'txs'}
                    </Text>
                    {m.isCurrent ? (
                      <Text style={styles.currentBadge}>NOW</Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Button
              title={exporting ? 'Saving…' : 'Save to device'}
              icon={<Ionicons name="save-outline" size={18} color="#FFF" />}
              onPress={onSave}
              loading={exporting}
              disabled={!selectedKey || exporting}
              style={{ marginTop: SPACING.xl }}
            />

            <Pressable
              onPress={onShare}
              disabled={!selectedKey || exporting}
              hitSlop={8}
              style={({ pressed }) => [
                styles.shareRow,
                pressed && !exporting && { backgroundColor: COLORS.surfacePressed },
              ]}
            >
              <Ionicons name="share-outline" size={16} color={!selectedKey || exporting ? COLORS.textMuted : COLORS.primary} />
              <Text
                style={[
                  styles.shareText,
                  (!selectedKey || exporting) && { color: COLORS.textMuted },
                ]}
              >
                Share instead
              </Text>
            </Pressable>

            {exporting ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md }}>
                <ActivityIndicator color={COLORS.textMuted} size="small" />
                <Text style={{ color: COLORS.textMuted, fontFamily: FONT.regular, fontSize: 12, marginLeft: SPACING.sm }}>
                  Rendering PDF…
                </Text>
              </View>
            ) : null}
          </>
        )}
      </ScrollView>
    </Sheet>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  monthCell: {
    width: '31%',
    minHeight: 56,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    color: COLORS.textPrimary,
    fontFamily: FONT.medium,
    fontSize: 12,
    textAlign: 'center',
  },
  monthCount: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 11,
    marginTop: 2,
  },
  currentBadge: {
    color: COLORS.primary,
    fontFamily: FONT.semibold,
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  shareRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.lg,
  },
  shareText: {
    color: COLORS.primary,
    fontFamily: FONT.medium,
    fontSize: 14,
    marginLeft: 6,
  },
});

export default DownloadPdfSheet;
