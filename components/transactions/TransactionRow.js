import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import { fmtTime } from '../../utils/date';
import { formatSigned } from '../../utils/currency';
import { hLight } from '../../utils/haptics';

const TransactionRow = ({ tx, category, currency = 'BDT', onPress, style }) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const color = category?.color || (tx.type === 'income' ? COLORS.income : COLORS.expense);
  const icon = category?.icon || (tx.type === 'income' ? 'arrow-up' : 'arrow-down');

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.98, { damping: 14, stiffness: 240 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 240 }); }}
        onPress={() => { hLight(); onPress?.(tx); }}
        style={[styles.row, style]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${color}25` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.middle}>
          <Text style={styles.title} numberOfLines={1}>
            {tx.title || (tx.type === 'income' ? 'Income' : 'Expense')}
          </Text>
          <Text style={styles.sub} numberOfLines={1}>
            {(category?.name || (tx.type === 'income' ? 'Income' : 'Expense'))} · {fmtTime(tx.date)}
          </Text>
        </View>
        <Text
          style={[
            styles.amount,
            { color: tx.type === 'income' ? COLORS.income : COLORS.expense },
          ]}
        >
          {formatSigned(tx.amount, tx.type, currency)}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    minHeight: 64,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  middle: { flex: 1 },
  title: {
    color: COLORS.textPrimary,
    fontFamily: FONT.medium,
    fontSize: 15,
  },
  sub: {
    color: COLORS.textSecondary,
    fontFamily: FONT.regular,
    fontSize: 12,
    marginTop: 2,
  },
  amount: {
    fontFamily: FONT.semibold,
    fontSize: 15,
    letterSpacing: -0.2,
  },
});

export default TransactionRow;
