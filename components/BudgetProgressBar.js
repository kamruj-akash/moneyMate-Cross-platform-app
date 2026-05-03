import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING, TEXT_STYLES } from '../constants/theme';
import { formatAmount } from '../utils/currency';

const BudgetProgressBar = ({ used = 0, budget = 0, currency = 'BDT', onSet }) => {
  const pct = budget > 0 ? Math.min((used / budget) * 100, 200) : 0;
  const w = useSharedValue(0);

  useEffect(() => {
    w.value = withTiming(Math.min(pct, 100), { duration: 800 });
  }, [pct]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${w.value}%` }));

  const color = pct >= 90 ? COLORS.danger : pct >= 60 ? COLORS.warning : COLORS.success;

  if (!budget || budget <= 0) {
    return (
      <Pressable
        onPress={onSet}
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: SPACING.lg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(127, 90, 240, 0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: SPACING.md,
            }}
          >
            <Ionicons name="wallet-outline" size={20} color={COLORS.primary} />
          </View>
          <View>
            <Text style={[TEXT_STYLES.h3]}>Set monthly budget</Text>
            <Text style={[TEXT_STYLES.bodySmall]}>Track your spending limits</Text>
          </View>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
      </Pressable>
    );
  }

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: SPACING.lg,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md }}>
        <Text style={TEXT_STYLES.h3}>Monthly Budget</Text>
        <Text style={{ color, fontFamily: FONT.semibold, fontSize: 16 }}>{Math.round(pct)}%</Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: RADIUS.full,
          backgroundColor: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: RADIUS.full,
              backgroundColor: color,
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.7,
              shadowRadius: 6,
              elevation: 4,
            },
            fillStyle,
          ]}
        />
      </View>
      <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 13, marginTop: SPACING.sm }}>
        {formatAmount(used, currency)} of {formatAmount(budget, currency)} used
      </Text>
    </View>
  );
};

export default BudgetProgressBar;
