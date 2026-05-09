import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, GRADIENTS, RADIUS, SHADOWS, SPACING, TEXT_STYLES } from '../constants/theme';
import { fmtMonth } from '../utils/date';
import { formatAmount } from '../utils/currency';
import AnimatedNumber from './AnimatedNumber';

const HeroBalanceCard = ({
  income = 0,
  expense = 0,
  currency = 'BDT',
  month = new Date(),
  mode = 'salary',
  count = 0,
}) => {
  const net = income - expense;
  const expenseOnly = mode === 'expense_only';
  return (
    <View style={[styles.shadowWrap, SHADOWS.glow]}>
      <LinearGradient
        colors={GRADIENTS.hero}
        start={GRADIENTS.heroAngles.start}
        end={GRADIENTS.heroAngles.end}
        style={styles.card}
      >
        <View style={styles.topRow}>
          <Text style={styles.label}>{expenseOnly ? 'Spent this month' : 'Net Balance'}</Text>
          <View style={styles.monthPill}>
            <Text style={styles.monthText}>{fmtMonth(month)}</Text>
          </View>
        </View>

        <AnimatedNumber
          value={expenseOnly ? expense : net}
          currency={currency}
          style={[styles.balance]}
        />
        <Text style={styles.subtitle}>
          {expenseOnly
            ? `${count} ${count === 1 ? 'transaction' : 'transactions'} this month`
            : "This month's overview"}
        </Text>

        {expenseOnly ? null : (
          <>
            <View style={styles.divider} />
            <View style={styles.statsRow}>
              <Stat icon="arrow-up" label="Income" value={income} currency={currency} positive />
              <View style={styles.vDivider} />
              <Stat icon="arrow-down" label="Expense" value={expense} currency={currency} />
            </View>
          </>
        )}
      </LinearGradient>
    </View>
  );
};

const Stat = ({ icon, label, value, currency, positive }) => (
  <View style={{ flex: 1, paddingHorizontal: SPACING.sm }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: positive ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <Ionicons name={icon} size={12} color={COLORS.white} />
      </View>
      <Text
        style={{
          color: 'rgba(255,255,255,0.75)',
          fontFamily: FONT.medium,
          fontSize: 11,
          letterSpacing: 1.1,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
    <Text style={{ color: COLORS.white, fontFamily: FONT.semibold, fontSize: 18, letterSpacing: -0.3 }}>
      {formatAmount(value, currency)}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  shadowWrap: {
    borderRadius: 24,
  },
  card: {
    borderRadius: 24,
    padding: SPACING.xxl,
    overflow: 'hidden',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  label: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: FONT.medium,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  monthPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  monthText: {
    color: COLORS.white,
    fontFamily: FONT.medium,
    fontSize: 11,
  },
  balance: {
    fontSize: 44,
    fontFamily: FONT.semibold,
    color: COLORS.white,
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: FONT.regular,
    fontSize: 13,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  vDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginHorizontal: SPACING.sm,
  },
});

export default HeroBalanceCard;
