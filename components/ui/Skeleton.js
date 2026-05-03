import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { COLORS } from '../../constants/theme';

const Skeleton = ({ width = '100%', height = 16, radius = 8, style }) => {
  const o = useSharedValue(0.5);
  useEffect(() => {
    o.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }), -1, true);
  }, []);
  const animStyle = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: COLORS.shimmer,
          borderWidth: 1,
          borderColor: COLORS.border,
        },
        animStyle,
        style,
      ]}
    />
  );
};

export default Skeleton;
