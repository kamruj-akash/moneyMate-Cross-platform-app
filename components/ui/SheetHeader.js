import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, TEXT_STYLES } from '../../constants/theme';

const SheetHeader = ({ title, subtitle, onClose }) => (
  <View>
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.xl,
        paddingTop: SPACING.sm,
        paddingBottom: subtitle ? SPACING.xs : SPACING.md,
      }}
    >
      <Text style={TEXT_STYLES.h2} numberOfLines={1}>{title}</Text>
      <Pressable
        onPress={onClose}
        hitSlop={10}
        style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: COLORS.surface,
          borderWidth: 1, borderColor: COLORS.border,
          alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={20} color={COLORS.textPrimary} />
      </Pressable>
    </View>
    {subtitle ? (
      <Text style={{ paddingHorizontal: SPACING.xl, color: COLORS.textSecondary, fontSize: 14, marginBottom: SPACING.md }}>
        {subtitle}
      </Text>
    ) : null}
  </View>
);

export default SheetHeader;
