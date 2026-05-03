import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SHADOWS, SPACING } from '../../constants/theme';
import { hSelection } from '../../utils/haptics';

const Chip = ({ label, icon, color, selected, onPress, size = 'md' }) => {
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const heights = { sm: 32, md: 40, lg: 44 };

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPressIn={() => { scale.value = withSpring(0.96, { damping: 14, stiffness: 240 }); }}
        onPressOut={() => { scale.value = withSpring(1, { damping: 14, stiffness: 240 }); }}
        onPress={() => { hSelection(); onPress?.(); }}
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: SPACING.md,
            paddingVertical: 0,
            height: heights[size],
            borderRadius: RADIUS.full,
            backgroundColor: selected ? `${color || COLORS.primary}22` : COLORS.surface,
            borderWidth: selected ? 2 : 1,
            borderColor: selected ? (color || COLORS.primary) : COLORS.border,
          },
          selected && {
            shadowColor: color || COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 10,
            elevation: 6,
          },
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={size === 'sm' ? 14 : 16}
            color={selected ? (color || COLORS.primary) : COLORS.textSecondary}
            style={{ marginRight: SPACING.sm - 2 }}
          />
        ) : null}
        <Text
          style={{
            color: selected ? COLORS.textPrimary : COLORS.textSecondary,
            fontFamily: selected ? FONT.semibold : FONT.medium,
            fontSize: size === 'sm' ? 13 : 14,
          }}
        >
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
};

export default Chip;
