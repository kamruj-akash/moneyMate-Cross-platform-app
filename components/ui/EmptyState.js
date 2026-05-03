import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT, SPACING, TEXT_STYLES } from '../../constants/theme';

const EmptyState = ({ icon = 'wallet-outline', title = 'Nothing here yet', subtitle, action }) => (
  <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: SPACING.xl }}>
    <View
      style={{
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.lg,
      }}
    >
      <Ionicons name={icon} size={44} color={COLORS.textMuted} />
    </View>
    <Text style={[TEXT_STYLES.h2, { textAlign: 'center', marginBottom: SPACING.sm }]}>{title}</Text>
    {subtitle ? (
      <Text style={{ color: COLORS.textSecondary, fontFamily: FONT.regular, fontSize: 14, textAlign: 'center', lineHeight: 20 }}>
        {subtitle}
      </Text>
    ) : null}
    {action ? <View style={{ marginTop: SPACING.xl }}>{action}</View> : null}
  </View>
);

export default EmptyState;
