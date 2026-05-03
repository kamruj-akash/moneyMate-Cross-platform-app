import React, { useEffect } from 'react';
import { Pressable } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import { COLORS } from '../../constants/theme';
import { hSelection } from '../../utils/haptics';

const Toggle = ({ value, onChange, disabled }) => {
  const x = useSharedValue(value ? 24 : 4);
  const bg = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    x.value = withSpring(value ? 24 : 4, { damping: 18, stiffness: 240 });
    bg.value = withTiming(value ? 1 : 0, { duration: 180 });
  }, [value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: bg.value
      ? `rgba(127, 90, 240, ${0.6 + bg.value * 0.3})`
      : 'rgba(255,255,255,0.08)',
  }));
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        hSelection();
        onChange?.(!value);
      }}
      hitSlop={8}
    >
      <Animated.View
        style={[
          {
            width: 50,
            height: 28,
            borderRadius: 14,
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: COLORS.border,
            opacity: disabled ? 0.6 : 1,
          },
          trackStyle,
        ]}
      >
        <Animated.View
          style={[
            {
              width: 20,
              height: 20,
              borderRadius: 10,
              backgroundColor: COLORS.white,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
};

export default Toggle;
