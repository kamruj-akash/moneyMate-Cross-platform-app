import React, { useEffect } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import { COLORS, FONT, RADIUS, SPACING } from '../../constants/theme';
import { hSelection } from '../../utils/haptics';

const SegmentedControl = ({ options, value, onChange, fullWidth = true, accent }) => {
  const idx = Math.max(0, options.findIndex((o) => o.value === value));
  const t = useSharedValue(idx);

  useEffect(() => {
    t.value = withTiming(idx, { duration: 180, easing: Easing.out(Easing.cubic) });
  }, [idx]);

  return (
    <View
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        // store via shared value if needed — using percentage instead
      }}
      style={{
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: RADIUS.full,
        padding: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
        position: 'relative',
        alignSelf: fullWidth ? 'stretch' : 'flex-start',
      }}
    >
      <Indicator t={t} count={options.length} accent={accent} />
      {options.map((opt, i) => {
        const selected = i === idx;
        return (
          <Pressable
            key={opt.value}
            onPress={() => { hSelection(); onChange?.(opt.value); }}
            style={{
              flex: fullWidth ? 1 : 0,
              paddingHorizontal: fullWidth ? 0 : SPACING.lg,
              paddingVertical: 10,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
          >
            <Text
              style={{
                color: selected ? COLORS.textPrimary : COLORS.textSecondary,
                fontFamily: selected ? FONT.semibold : FONT.medium,
                fontSize: 14,
              }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const Indicator = ({ t, count, accent }) => {
  const animStyle = useAnimatedStyle(() => ({
    left: `${(t.value / count) * 100}%`,
    width: `${100 / count}%`,
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 4,
          bottom: 4,
          borderRadius: RADIUS.full,
          backgroundColor: accent || COLORS.primary,
          shadowColor: accent || COLORS.primary,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 10,
          elevation: 4,
          zIndex: 1,
        },
        animStyle,
      ]}
    />
  );
};

export default SegmentedControl;
