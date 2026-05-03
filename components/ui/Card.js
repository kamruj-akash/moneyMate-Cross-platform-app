import React from 'react';
import { View } from 'react-native';
import { COLORS, RADIUS, SHADOWS, SPACING } from '../../constants/theme';

const Card = ({ children, style, padded = true, elevated = false, glow = false }) => {
  return (
    <View
      style={[
        {
          backgroundColor: elevated ? COLORS.surfaceElevated : COLORS.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: padded ? SPACING.lg : 0,
        },
        elevated && SHADOWS.card,
        glow && SHADOWS.glow,
        style,
      ]}
    >
      {children}
    </View>
  );
};

export default Card;
